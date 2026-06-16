/**
 * Google Workspace / Gmail OAuth-flow til at koble en brugers mailbox.
 *
 *   GET  /api/auth/email/google            — initierer flow
 *   GET  /api/auth/email/google?code=xxx   — callback
 *
 * Scopes: gmail.send (afsendelse) + userinfo.email (kende emailen).
 * access_type=offline + prompt=consent = vi faar refresh_token.
 */

import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import crypto from "node:crypto";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { encrypt } from "@/lib/email/crypto";

const SCOPES = [
  "https://www.googleapis.com/auth/gmail.send",
  "https://www.googleapis.com/auth/userinfo.email",
].join(" ");

const STATE_COOKIE = "g_oauth_state";

function getRedirectUri(req: NextRequest): string {
  const url = new URL(req.url);
  return `${url.origin}/api/auth/email/google`;
}

export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.redirect(new URL("/login", req.url));
  }

  const clientId = process.env.GOOGLE_OAUTH_CLIENT_ID;
  if (!clientId) {
    return NextResponse.json({ error: "GOOGLE_OAUTH_CLIENT_ID ikke sat" }, { status: 500 });
  }

  const url = new URL(req.url);
  const code = url.searchParams.get("code");
  const stateFromGoogle = url.searchParams.get("state");

  // ─── Initier ────────────────────────────────────────────────
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
      scope:         SCOPES,
      access_type:   "offline",   // refresh_token
      prompt:        "consent",   // tvinger nyt refresh_token
      state,
    });
    return NextResponse.redirect(
      `https://accounts.google.com/o/oauth2/v2/auth?${params}`,
    );
  }

  // ─── Callback ───────────────────────────────────────────────
  const cookieStore = await cookies();
  const expectedState = cookieStore.get(STATE_COOKIE)?.value;
  if (!expectedState || expectedState !== stateFromGoogle) {
    return NextResponse.json({ error: "Ugyldig state — mulig CSRF" }, { status: 400 });
  }
  cookieStore.delete(STATE_COOKIE);

  const clientSecret = process.env.GOOGLE_OAUTH_CLIENT_SECRET;
  if (!clientSecret) {
    return NextResponse.json({ error: "GOOGLE_OAUTH_CLIENT_SECRET ikke sat" }, { status: 500 });
  }

  const tokenRes = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      client_id:     clientId,
      client_secret: clientSecret,
      grant_type:    "authorization_code",
      code,
      redirect_uri:  getRedirectUri(req),
    }).toString(),
  });
  if (!tokenRes.ok) {
    const err = await tokenRes.text().catch(() => tokenRes.statusText);
    return NextResponse.redirect(new URL(`/settings/email?error=${encodeURIComponent(err)}`, req.url));
  }
  const tokens = await tokenRes.json() as {
    access_token: string; refresh_token?: string;
    expires_in: number; scope: string;
  };

  // Hent email
  const meRes = await fetch("https://www.googleapis.com/oauth2/v3/userinfo", {
    headers: { Authorization: `Bearer ${tokens.access_token}` },
  });
  if (!meRes.ok) {
    return NextResponse.redirect(new URL("/settings/email?error=google_userinfo_fejlede", req.url));
  }
  const me = await meRes.json() as { email?: string };
  const emailAddress = me.email ?? "";
  if (!emailAddress) {
    return NextResponse.redirect(new URL("/settings/email?error=google_ingen_mail", req.url));
  }

  await db.user.update({
    where: { id: session.user.id },
    data: {
      emailProvider:         "google",
      emailAccessToken:      encrypt(tokens.access_token),
      // Refresh-token kan vaere undefined hvis brugeren har tilladt foer (skifter ikke uden prompt=consent)
      ...(tokens.refresh_token && { emailRefreshToken: encrypt(tokens.refresh_token) }),
      emailTokenExpiresAt:   new Date(Date.now() + tokens.expires_in * 1000),
      emailScope:            tokens.scope,
      connectedEmailAddress: emailAddress,
      emailConnectedAt:      new Date(),
    },
  });

  return NextResponse.redirect(new URL("/settings/email?connected=google", req.url));
}
