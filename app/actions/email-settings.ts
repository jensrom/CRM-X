"use server";

/**
 * Email-settings actions: tenant system-mail config + bruger-disconnect.
 */

import { db } from "@/lib/db";
import { auth } from "@/lib/auth";
import { encrypt } from "@/lib/email/crypto";
import { revalidatePath } from "next/cache";

async function requireTenant() {
  const session = await auth();
  if (!session?.user?.tenantId) throw new Error("Ikke autoriseret");
  return session;
}

/**
 * Admin gemmer system-mail-konfiguration + (krypteret) Resend-API-key.
 */
export async function updateSystemEmailConfig(formData: FormData) {
  const session = await requireTenant();
  const role = session.user.role ?? "";
  // Kun admin kan røre system-mail
  if (!["admin", "administrator", "super_admin"].includes(role.toLowerCase())) {
    throw new Error("Kun administrator kan konfigurere system-mail");
  }

  const tenantId = session.user.tenantId!;
  const domain      = String(formData.get("systemEmailDomain") ?? "") || null;
  const fromName    = String(formData.get("systemEmailFromName") ?? "") || null;
  const fromAddress = String(formData.get("systemEmailFromAddress") ?? "") || null;
  const replyTo     = String(formData.get("systemEmailReplyTo") ?? "") || null;
  const apiKeyRaw   = String(formData.get("resendApiKey") ?? "");

  // Hvis API-key ikke aendres (tom string) lader vi den vaere
  const data: any = {
    systemEmailDomain:      domain,
    systemEmailFromName:    fromName,
    systemEmailFromAddress: fromAddress,
    systemEmailReplyTo:     replyTo,
  };
  if (apiKeyRaw && !apiKeyRaw.startsWith("•")) {
    data.resendApiKey = encrypt(apiKeyRaw);
  }

  await db.tenant.update({
    where: { id: tenantId },
    data,
  });

  revalidatePath("/settings/email");
}

/**
 * Marker tenant som verificeret (admin-handling).
 * Normalt vil dette koeres efter at man har bekrefftet DNS-records hos
 * Resend via deres dashboard, men vi lader admin sætte det manuelt.
 */
export async function markSystemEmailVerified(formData: FormData) {
  const session = await requireTenant();
  const role = session.user.role ?? "";
  if (!["admin", "administrator", "super_admin"].includes(role.toLowerCase())) {
    throw new Error("Kun administrator");
  }
  const verified = String(formData.get("verified")) === "true";
  await db.tenant.update({
    where: { id: session.user.tenantId! },
    data: {
      systemEmailVerified: verified,
      systemEmailVerifiedAt: verified ? new Date() : null,
    },
  });
  revalidatePath("/settings/email");
}

/**
 * Bruger afkobler sin egen mailbox. Vi sletter access/refresh-tokens.
 */
export async function disconnectMyMailbox() {
  const session = await requireTenant();
  const userId = session.user.id;
  if (!userId) throw new Error("Mangler bruger-id");

  await db.user.update({
    where: { id: userId },
    data: {
      emailProvider:         null,
      emailAccessToken:      null,
      emailRefreshToken:     null,
      emailTokenExpiresAt:   null,
      emailScope:            null,
      connectedEmailAddress: null,
      emailConnectedAt:      null,
    },
  });
  revalidatePath("/settings/email");
}
