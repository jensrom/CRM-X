/**
 * Microsoft 365 / Outlook sender via Microsoft Graph API.
 *
 * Brugeren har OAuth'et med "Mail.Send"-scope; vi sender via deres mailbox.
 * Mailen lander i deres "Sendt"-mappe og kommer fra deres rigtige adresse.
 *
 * Graph endpoint: POST /v1.0/me/sendMail
 * Docs: https://learn.microsoft.com/en-us/graph/api/user-sendmail
 *
 * Token-refresh: hvis accessToken er udloebet (5 min buffer), bytter vi
 * refreshToken til en ny access via /token endpoint.
 */

import { db } from "@/lib/db";
import { decrypt, encrypt } from "./crypto";
import type { SendMailOpts, SendMailResult } from "./types";

const TOKEN_URL = "https://login.microsoftonline.com/common/oauth2/v2.0/token";
const GRAPH_SEND_URL = "https://graph.microsoft.com/v1.0/me/sendMail";

/**
 * Henter en gyldig access-token for brugeren. Refresher hvis udloebet.
 */
async function getAccessToken(userId: string): Promise<{ token: string; emailAddress: string } | null> {
  const user = await db.user.findFirst({
    where: { id: userId },
    select: {
      emailProvider: true, emailAccessToken: true, emailRefreshToken: true,
      emailTokenExpiresAt: true, connectedEmailAddress: true,
    },
  });
  if (!user || user.emailProvider !== "microsoft") return null;
  if (!user.emailAccessToken || !user.emailRefreshToken || !user.connectedEmailAddress) return null;

  const now = Date.now();
  const expiresAt = user.emailTokenExpiresAt ? user.emailTokenExpiresAt.getTime() : 0;
  // 5 min buffer
  if (expiresAt > now + 5 * 60 * 1000) {
    return { token: decrypt(user.emailAccessToken), emailAddress: user.connectedEmailAddress };
  }

  // Refresh
  const clientId = process.env.MS_OAUTH_CLIENT_ID;
  const clientSecret = process.env.MS_OAUTH_CLIENT_SECRET;
  if (!clientId || !clientSecret) {
    throw new Error("MS_OAUTH_CLIENT_ID / MS_OAUTH_CLIENT_SECRET ikke sat");
  }

  const params = new URLSearchParams({
    client_id:     clientId,
    client_secret: clientSecret,
    grant_type:    "refresh_token",
    refresh_token: decrypt(user.emailRefreshToken),
    scope:         "offline_access Mail.Send User.Read",
  });

  const res = await fetch(TOKEN_URL, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: params.toString(),
  });
  if (!res.ok) {
    const err = await res.text().catch(() => res.statusText);
    throw new Error(`MS token-refresh fejlede: ${res.status} ${err}`);
  }
  const data = await res.json() as {
    access_token: string;
    refresh_token?: string;
    expires_in: number;
  };

  await db.user.update({
    where: { id: userId },
    data: {
      emailAccessToken:    encrypt(data.access_token),
      emailRefreshToken:   data.refresh_token ? encrypt(data.refresh_token) : undefined,
      emailTokenExpiresAt: new Date(Date.now() + data.expires_in * 1000),
    },
  });

  return { token: data.access_token, emailAddress: user.connectedEmailAddress };
}

export async function sendMailViaMicrosoft(
  userId: string,
  opts: SendMailOpts,
): Promise<SendMailResult> {
  let credentials: { token: string; emailAddress: string } | null;
  try {
    credentials = await getAccessToken(userId);
  } catch (err: any) {
    return {
      success: false,
      provider: "microsoft",
      fromAddress: "",
      error: err?.message ?? "Kunne ikke hente Microsoft access-token",
    };
  }
  if (!credentials) {
    return {
      success: false,
      provider: "microsoft",
      fromAddress: "",
      error: "Microsoft-mailbox ikke koblet for denne bruger",
    };
  }

  const to  = Array.isArray(opts.to)  ? opts.to  : [opts.to];
  const cc  = opts.cc  ? (Array.isArray(opts.cc)  ? opts.cc  : [opts.cc])  : [];
  const bcc = opts.bcc ? (Array.isArray(opts.bcc) ? opts.bcc : [opts.bcc]) : [];

  const message = {
    subject: opts.subject,
    body: { contentType: "HTML", content: opts.html },
    toRecipients:  to.map((addr)  => ({ emailAddress: { address: addr } })),
    ccRecipients:  cc.map((addr)  => ({ emailAddress: { address: addr } })),
    bccRecipients: bcc.map((addr) => ({ emailAddress: { address: addr } })),
    ...(opts.replyTo && {
      replyTo: [{ emailAddress: { address: opts.replyTo } }],
    }),
  };

  const res = await fetch(GRAPH_SEND_URL, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${credentials.token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ message, saveToSentItems: true }),
  });

  if (!res.ok && res.status !== 202) {
    const err = await res.text().catch(() => res.statusText);
    return {
      success: false,
      provider: "microsoft",
      fromAddress: credentials.emailAddress,
      error: `Microsoft Graph ${res.status}: ${err}`,
    };
  }

  // Graph sendMail returnerer 202 Accepted uden body — ingen message-id
  return {
    success: true,
    provider: "microsoft",
    fromAddress: credentials.emailAddress,
    messageId: undefined,
  };
}
