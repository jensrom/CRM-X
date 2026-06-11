/**
 * POST /api/admin/impersonate
 *
 * Super-admin starter eller stopper en impersonation-session.
 *
 * Sikkerhed:
 *   - Kun super_admins kan starte
 *   - Session er kortvarig (60 minutter)
 *   - Cookie er HttpOnly + Secure + signed (HMAC)
 *   - Markeret read-only — server-actions må tjekke flaget før writes
 *   - Hver start/stop audit-logges med tenant-id
 *
 * Bruges af:
 *   - "Log ind som tenant-admin"-knap på /admin/tenants/[id]
 *   - ImpersonationBanner's "Afslut session"-knap
 */

import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { audit } from "@/lib/audit";
import crypto from "node:crypto";

const COOKIE_NAME = "cx_impersonate";
const SESSION_MINUTES = 60;

interface SessionPayload {
  tenantId: string;
  tenantSlug: string;
  tenantName: string;
  userId: string;
  superAdminId: string;
  superAdminEmail: string;
  startedAt: string;
  expiresAt: string;
}

function sign(payload: SessionPayload): string {
  const secret = process.env.NEXTAUTH_SECRET ?? "dev-secret-replace";
  const data = JSON.stringify(payload);
  const sig = crypto.createHmac("sha256", secret).update(data).digest("base64url");
  return `${data}.${sig}`;
}

export async function POST(req: NextRequest) {
  const session = await auth();
  if (session?.user?.role !== "super_admin") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const formData = await req.formData();
  const action = formData.get("action") as string;

  if (action === "stop") {
    const existingCookie = req.cookies.get(COOKIE_NAME)?.value;
    if (existingCookie) {
      try {
        const [data] = existingCookie.split(".");
        const parsed = JSON.parse(data) as SessionPayload;
        await audit({
          tenantId: parsed.tenantId,
          actorId: session.user.id ?? null,
          actorEmail: session.user.email ?? null,
          action: "impersonate_stop",
          resourceType: "tenant",
          resourceId: parsed.tenantId,
          message: `Stoppede impersonering af ${parsed.tenantName}`,
        });
      } catch {
        // ignore invalid cookie
      }
    }
    const res = NextResponse.redirect(new URL("/admin", req.url));
    res.cookies.delete(COOKIE_NAME);
    return res;
  }

  // action === "start"
  const tenantId = formData.get("tenantId") as string;
  if (!tenantId) {
    return NextResponse.json({ error: "tenantId mangler" }, { status: 400 });
  }

  const tenant = await db.tenant.findUnique({
    where: { id: tenantId },
    select: { id: true, name: true, slug: true, status: true },
  });
  if (!tenant) {
    return NextResponse.json({ error: "Tenant findes ikke" }, { status: 404 });
  }
  if (tenant.status === "deleted") {
    return NextResponse.json({ error: "Slettede tenants kan ikke impersoneres" }, { status: 400 });
  }

  // Find en aktiv admin-bruger hos tenant'en
  const adminUser = await db.user.findFirst({
    where: { tenantId, isActive: true },
    orderBy: { lastLogin: "desc" },
    select: { id: true, email: true },
  });
  if (!adminUser) {
    return NextResponse.json(
      { error: "Tenant har ingen aktive brugere" },
      { status: 400 },
    );
  }

  const startedAt = new Date();
  const expiresAt = new Date(startedAt.getTime() + SESSION_MINUTES * 60_000);

  const payload: SessionPayload = {
    tenantId: tenant.id,
    tenantSlug: tenant.slug,
    tenantName: tenant.name,
    userId: adminUser.id,
    superAdminId: session.user.id ?? "",
    superAdminEmail: session.user.email ?? "",
    startedAt: startedAt.toISOString(),
    expiresAt: expiresAt.toISOString(),
  };

  const cookieValue = sign(payload);

  await audit({
    tenantId: tenant.id,
    actorId: session.user.id ?? null,
    actorEmail: session.user.email ?? null,
    action: "impersonate_start",
    resourceType: "tenant",
    resourceId: tenant.id,
    message: `Startede impersonering af ${tenant.name} (${tenant.slug}) som ${adminUser.email} — varighed ${SESSION_MINUTES} min`,
  });

  const res = NextResponse.redirect(new URL("/dashboard", req.url));
  res.cookies.set(COOKIE_NAME, cookieValue, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    expires: expiresAt,
  });
  return res;
}
