/**
 * Gmail / Google Workspace sender via Gmail API.
 *
 * Endpoint: POST /gmail/v1/users/me/messages/send
 * Docs: https://developers.google.com/gmail/api/reference/rest/v1/users.messages/send
 *
 * Vi bygger en RFC 5322-konform raw mail og base64url-encoder den.
 * Det er den eneste form Gmail API accepterer (ikke JSON-felter som Graph).
 *
 * Mailen lander i brugerens "Sent"-mappe og kommer fra deres egen mailadresse.
 */

import { db } from "@/lib/db";
import { decrypt, encrypt } from "./crypto";
import type { SendMailOpts, SendMailResult } from "./types";

const TOKEN_URL = "https://oauth2.googleapis.com/token";
const GMAIL_SEND_URL = "https://gmail.googleapis.com/gmail/v1/users/me/messages/send";

async function getAccessToken(userId: string): Promise<{ token: string; emailAddress: string } | null> {
  const user = await db.user.findFirst({
    where: { id: userId },
    select: {
      emailProvider: true, emailAccessToken: true, emailRefreshToken: true,
      emailTokenExpiresAt: true, connectedEmailAddress: true,
    },
  });
  if (!user || user.emailProvider !== "google") return null;
  if (!user.emailAccessToken || !user.emailRefreshToken || !user.connectedEmailAddress) return null;

  const now = Date.now();
  const expiresAt = user.emailTokenExpiresAt ? user.emailTokenExpiresAt.getTime() : 0;
  if (expiresAt > now + 5 * 60 * 1000) {
    return { token: decrypt(user.emailAccessToken), emailAddress: user.connectedEmailAddress };
  }

  const clientId = process.env.GOOGLE_OAUTH_CLIENT_ID;
  const clientSecret = process.env.GOOGLE_OAUTH_CLIENT_SECRET;
  if (!clientId || !clientSecret) {
    throw new Error("GOOGLE_OAUTH_CLIENT_ID / GOOGLE_OAUTH_CLIENT_SECRET ikke sat");
  }

  const params = new URLSearchParams({
    client_id:     clientId,
    client_secret: clientSecret,
    grant_type:    "refresh_token",
    refresh_token: decrypt(user.emailRefreshToken),
  });

  const res = await fetch(TOKEN_URL, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: params.toString(),
  });
  if (!res.ok) {
    const err = await res.text().catch(() => res.statusText);
    throw new Error(`Google token-refresh fejlede: ${res.status} ${err}`);
  }
  const data = await res.json() as { access_token: string; expires_in: number };

  await db.user.update({
    where: { id: userId },
    data: {
      emailAccessToken:    encrypt(data.access_token),
      emailTokenExpiresAt: new Date(Date.now() + data.expires_in * 1000),
    },
  });

  return { token: data.access_token, emailAddress: user.connectedEmailAddress };
}

function base64url(input: string | Buffer): string {
  const b = typeof input === "string" ? Buffer.from(input, "utf8") : input;
  return b.toString("base64").replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

/**
 * Bygger en raw RFC 5322 mail. Vi holder os til simple cases — multipart
 * tilfoejes hvis text+html begge er sat.
 */
function buildRawMail(opts: SendMailOpts, from: string): string {
  const to  = Array.isArray(opts.to)  ? opts.to.join(", ")  : opts.to;
  const cc  = opts.cc  ? (Array.isArray(opts.cc)  ? opts.cc.join(", ")  : opts.cc)  : null;
  const bcc = opts.bcc ? (Array.isArray(opts.bcc) ? opts.bcc.join(", ") : opts.bcc) : null;

  const headers: string[] = [
    `From: ${from}`,
    `To: ${to}`,
    cc  ? `Cc: ${cc}`   : null,
    bcc ? `Bcc: ${bcc}` : null,
    opts.replyTo ? `Reply-To: ${opts.replyTo}` : null,
    `Subject: ${opts.subject}`,
    "MIME-Version: 1.0",
  ].filter(Boolean) as string[];

  if (opts.text && opts.html) {
    const boundary = `b_${Date.now().toString(36)}`;
    headers.push(`Content-Type: multipart/alternative; boundary="${boundary}"`);
    const body =
      `\r\n--${boundary}\r\nContent-Type: text/plain; charset="UTF-8"\r\n\r\n${opts.text}\r\n` +
      `--${boundary}\r\nContent-Type: text/html; charset="UTF-8"\r\n\r\n${opts.html}\r\n` +
      `--${boundary}--\r\n`;
    return headers.join("\r\n") + "\r\n" + body;
  }

  headers.push(`Content-Type: text/html; charset="UTF-8"`);
  return headers.join("\r\n") + "\r\n\r\n" + opts.html;
}

export async function sendMailViaGoogle(
  userId: string,
  opts: SendMailOpts,
): Promise<SendMailResult> {
  let credentials: { token: string; emailAddress: string } | null;
  try {
    credentials = await getAccessToken(userId);
  } catch (err: any) {
    return {
      success: false,
      provider: "google",
      fromAddress: "",
      error: err?.message ?? "Kunne ikke hente Google access-token",
    };
  }
  if (!credentials) {
    return {
      success: false,
      provider: "google",
      fromAddress: "",
      error: "Google-mailbox ikke koblet for denne bruger",
    };
  }

  const raw = base64url(buildRawMail(opts, credentials.emailAddress));

  const res = await fetch(GMAIL_SEND_URL, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${credentials.token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ raw }),
  });

  if (!res.ok) {
    const err = await res.text().catch(() => res.statusText);
    return {
      success: false,
      provider: "google",
      fromAddress: credentials.emailAddress,
      error: `Gmail API ${res.status}: ${err}`,
    };
  }

  const data = await res.json() as { id?: string };
  return {
    success: true,
    provider: "google",
    fromAddress: credentials.emailAddress,
    messageId: data.id,
  };
}
