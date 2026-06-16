/**
 * Microsoft 365 OAuth flow til at koble en brugers mailbox.
 *
 *   GET  /api/auth/email/microsoft            — initierer flow (redirect til MS)
 *   GET  /api/auth/email/microsoft?code=xxx   — callback (gemmer tokens)
 *
 * Vi bruger common-endpoint saa baade personlige Microsoft-konti og
 * organisationskonti (M365) kan logge ind. CSRF-state gemmes i cookie.
 */

import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import crypto from "node:crypto";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { encrypt } from "@/lib/email/crypto";

const SCOPES = ["offline_access", "Mail.Send", "User.Read"].join(" ");
const STATE_COOKIE = "ms_oauth_state";

function getRedirectUri(req: NextRequest): string {
  const url = new URL(req.url);
  return `${url.origin}/api/auth/email/microsoft`;
}

export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.redirect(new URL("/login", req.url));
  }

  const clientId = process.env.MS_OAUTH_CLIENT_ID;
  if (!clientId) {
    return NextResponse.json({ error: "MS_OAUTH_CLIENT_ID ikke sat" }, { status: 500 });
  }

  const url = new URL(req.url);
  const code = url.searchParams.get("code");
  const stateFromMs = url.searchParams.get("state");

  // ─── Initier flow ────────────────────────────────────────────
  if (!code) {
    const state = crypto.randomBytes(16).toString("hex");
    const cookieStore = await cookies();
    cookieStore.set(STATE_COOKIE, state, {
      httpOnly: true, secure: true, sameSite: "lax", maxAge: 600,
    });

    const params = new URLSearchParams({
      client_id:     clientId,
      response_type: "code",
      redirect_uri:  getRedirectUri(req),
      response_mode: "query",
      scope:         SCOPES,
      state,
      prompt:        "consent", // tvinger refresh-token
    });
    return NextResponse.redirect(
      `https://login.microsoftonline.com/common/oauth2/v2.0/authorize?${params}`,
    );
  }

  // ─── Callback: tjek state + byt code til tokens ──────────────
  const cookieStore = await cookies();
  const expectedState = cookieStore.get(STATE_COOKIE)?.value;
  if (!expectedState || expectedState !== stateFromMs) {
    return NextResponse.json({ error: "Ugyldig state — mulig CSRF" }, { status: 400 });
  }
  cookieStore.delete(STATE_COOKIE);

  const clientSecret = process.env.MS_OAUTH_CLIENT_SECRET;
  if (!clientSecret) {
    return NextResponse.json({ error: "MS_OAUTH_CLIENT_SECRET ikke sat" }, { status: 500 });
  }

  const tokenRes = await fetch("https://login.microsoftonline.com/common/oauth2/v2.0/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      client_id:     clientId,
      client_secret: clientSecret,
      grant_type:    "authorization_code",
      code,
      redirect_uri:  getRedirectUri(req),
      scope:         SCOPES,
    }).toString(),
  });
  if (!tokenRes.ok) {
    const err = await tokenRes.text().catch(() => tokenRes.statusText);
    return NextResponse.redirect(new URL(`/settings/email?error=${encodeURIComponent(err)}`, req.url));
  }
  const tokens = await tokenRes.json() as {
    access_token: string; refresh_token: string;
    expires_in: number; scope: string;
  };

  // Hent brugerens mail-adresse via Graph
  const meRes = await fetch("https://graph.microsoft.com/v1.0/me", {
    headers: { Authorization: `Bearer ${tokens.access_token}` },
  });
  if (!meRes.ok) {
    return NextResponse.redirect(new URL(`/settings/email?error=ms_me_fejlede`, req.url));
  }
  const me = await meRes.json() as { mail?: string; userPrincipalName?: string };
  const emailAddress = me.mail ?? me.userPrincipalName ?? "";
  if (!emailAddress) {
    return NextResponse.redirect(new URL(`/settings/email?error=ms_ingen_mail`, req.url));
  }

  await db.user.update({
    where: { id: session.user.id },
    data: {
      emailProvider:         "microsoft",
      emailAccessToken:      encrypt(tokens.access_token),
      emailRefreshToken:     encrypt(tokens.refresh_token),
      emailTokenExpiresAt:   new Date(Date.now() + tokens.expires_in * 1000),
      emailScope:            tokens.scope,
      connectedEmailAddress: emailAddress,
      emailConnectedAt:      new Date(),
    },
  });

  return NextResponse.redirect(new URL("/settings/email?connected=microsoft", req.url));
}
