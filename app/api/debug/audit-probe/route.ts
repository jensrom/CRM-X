/**
 * MIDLERTIDIG debug-route — slettes når audit-flow er valideret.
 * Returnerer diagnostik om audit-skrivningen så vi kan se hvor det fejler.
 */
import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { auth } from "@/lib/auth";
import { audit } from "@/lib/audit";

export async function GET() {
  // Test 1: audit() helper med overrides (samme parametre som login)
  let helperError: string | null = null;
  let beforeHelper = -1;
  let afterHelper = -1;
  try {
    beforeHelper = await db.auditLog.count();
    await audit({
      action: "login_success",
      resourceType: "session",
      actorIdOverride: "probe-fake-user",
      actorEmailOverride: "probe@example.com",
      tenantIdOverride: "probe-fake-tenant",
      message: "helper probe",
    });
    afterHelper = await db.auditLog.count();
  } catch (e) {
    helperError = e instanceof Error ? `${e.name}: ${e.message}` : String(e);
  }

  const session = await auth().catch((e) => ({ error: String(e) }));

  let auditLogModelExists = false;
  let writeResult: unknown = null;
  let writeError: string | null = null;

  try {
    // Tjek om Prisma-klienten kender modellen
    auditLogModelExists = typeof (db as any).auditLog?.create === "function";
  } catch {}

  try {
    const row = await db.auditLog.create({
      data: {
        action: "config_change",
        resourceType: "debug",
        outcome: "success",
        message: "audit-probe test write",
        tenantId: (session as any)?.user?.tenantId ?? null,
        actorId: (session as any)?.user?.id ?? null,
        actorEmail: (session as any)?.user?.email ?? null,
      },
    });
    writeResult = { id: row.id, createdAt: row.createdAt };
  } catch (e) {
    writeError = e instanceof Error ? `${e.name}: ${e.message}` : String(e);
  }

  const totalCount = await db.auditLog
    .count({ where: { tenantId: (session as any)?.user?.tenantId ?? undefined } })
    .catch(() => -1);

  return NextResponse.json({
    auditLogModelExists,
    sessionUser: (session as any)?.user
      ? {
          id: (session as any).user.id,
          email: (session as any).user.email,
          tenantId: (session as any).user.tenantId,
          role: (session as any).user.role,
        }
      : null,
    helperBeforeAfter: { before: beforeHelper, after: afterHelper, delta: afterHelper - beforeHelper },
    helperError,
    writeResult,
    writeError,
    totalCountForThisTenant: totalCount,
  });
}
