"use server";

/**
 * CRM-X — Invite accept-flow
 *
 * Bruges af /accept-invite-siden:
 *   1. validateInviteToken — slå token op + tjek om gyldig
 *   2. acceptInvite — sæt password, opret User, valgfri MFA-trigger, marker invite som accepted
 */

import { db } from "@/lib/db";
import { audit } from "@/lib/audit";
import { checkPassword, PASSWORD_POLICY } from "@/lib/password-policy";
import bcrypt from "bcryptjs";
import crypto from "node:crypto";

interface InviteInfo {
  ok: boolean;
  email?: string;
  name?: string;
  tenantName?: string;
  tenantSlug?: string;
  inviteId?: string;
  error?: string;
}

function hashToken(token: string): string {
  return crypto.createHash("sha256").update(token).digest("hex");
}

export async function validateInviteToken(token: string): Promise<InviteInfo> {
  if (!token || token.length < 16) {
    return { ok: false, error: "Ugyldigt invite-link" };
  }
  const hash = hashToken(token);
  const invite = await db.userInvite.findUnique({
    where: { tokenHash: hash },
    include: {
      tenant: { select: { name: true, slug: true, isActive: true } },
    },
  });

  if (!invite) {
    return { ok: false, error: "Invite-link findes ikke eller er allerede brugt" };
  }
  if (invite.status !== "pending") {
    return { ok: false, error: "Dette invite-link er allerede brugt eller tilbagekaldt" };
  }
  if (invite.expiresAt < new Date()) {
    // Auto-marker som expired
    await db.userInvite.update({
      where: { id: invite.id },
      data: { status: "expired" },
    });
    return { ok: false, error: "Invite-linket er udløbet. Bed admin sende et nyt." };
  }
  if (!invite.tenant.isActive) {
    return { ok: false, error: "Denne CRM-tenant er ikke aktiv" };
  }

  return {
    ok: true,
    email: invite.email,
    name: invite.name ?? undefined,
    tenantName: invite.tenant.name,
    tenantSlug: invite.tenant.slug,
    inviteId: invite.id,
  };
}

interface AcceptResult {
  ok: boolean;
  tenantSlug?: string;
  error?: string;
}

export async function acceptInvite(
  token: string,
  password: string,
  fullName: string
): Promise<AcceptResult> {
  // 1. Validér token igen (re-entry-sikkerhed)
  const info = await validateInviteToken(token);
  if (!info.ok || !info.inviteId) {
    return { ok: false, error: info.error ?? "Ugyldigt invite" };
  }

  // 2. Tjek password-policy
  const pwCheck = checkPassword(password, {
    email: info.email,
    name: fullName,
  });
  if (!pwCheck.ok) {
    return { ok: false, error: pwCheck.errors.join(", ") };
  }

  // 3. Hent invite + tenant + rolle
  const invite = await db.userInvite.findUnique({
    where: { id: info.inviteId },
    include: { tenant: true },
  });
  if (!invite) return { ok: false, error: "Invite ikke fundet" };

  // 4. Tjek for eksisterende bruger på samme email i tenanten
  const existing = await db.user.findUnique({
    where: { tenantId_email: { tenantId: invite.tenantId, email: invite.email } },
  });

  try {
    const hashed = await bcrypt.hash(password, PASSWORD_POLICY.bcryptCost);

    const result = await db.$transaction(async (tx) => {
      let userId: string;
      if (existing) {
        // Genopfrisk eksisterende bruger med nyt password
        const updated = await tx.user.update({
          where: { id: existing.id },
          data: {
            password: hashed,
            name: fullName,
            isActive: true,
            roleId: invite.roleId ?? existing.roleId,
            passwordChangedAt: new Date(),
          } as any,
        });
        userId = updated.id;
      } else {
        // Opret ny bruger
        const created = await tx.user.create({
          data: {
            tenantId: invite.tenantId,
            email: invite.email,
            name: fullName,
            password: hashed,
            roleId: invite.roleId,
            isActive: true,
            passwordChangedAt: new Date(),
          } as any,
        });
        userId = created.id;
      }

      // 5. Marker invite som accepted
      await tx.userInvite.update({
        where: { id: invite.id },
        data: {
          status: "accepted",
          acceptedAt: new Date(),
          acceptedByUserId: userId,
        },
      });

      return { userId, tenantSlug: invite.tenant.slug };
    });

    // 6. Audit-event
    await audit({
      action: existing ? "password_change" : "create",
      resourceType: "user",
      resourceId: result.userId,
      tenantIdOverride: invite.tenantId,
      actorIdOverride: result.userId,
      actorEmailOverride: invite.email,
      message: existing
        ? "User re-activated via invite-link"
        : `User created via invite-link (${invite.inviteTone} tone)`,
    });

    return { ok: true, tenantSlug: result.tenantSlug };
  } catch (e: any) {
    console.error("[invite.accept] Failed:", e);
    return { ok: false, error: "Kunne ikke aktivere kontoen. Prøv igen eller kontakt admin." };
  }
}
