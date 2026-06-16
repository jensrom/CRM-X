/**
 * Effektiv mail-konfiguration — tjekker BAADE tenant-DB OG env-fallback.
 *
 * Bruges af UI for at afgoere om "System-mail"-knappen skal vaere aktiv.
 * Resend-senderen har sin egen fallback-logik (env hvis tenant ikke har sat
 * det), saa vi spejler den her.
 */

import { db } from "@/lib/db";

export interface EffectiveSystemMail {
  fromAddress: string;
  fromName?:   string;
  /** Hvor stammer konfigurationen fra — bruges til hjaelpetekst */
  source:      "tenant" | "env";
}

export async function getEffectiveSystemMail(tenantId: string): Promise<EffectiveSystemMail | null> {
  // Tjek tenant-DB
  const tenant = await db.tenant.findFirst({
    where: { id: tenantId },
    select: {
      resendApiKey: true,
      systemEmailFromAddress: true,
      systemEmailFromName: true,
    },
  });
  if (tenant?.resendApiKey && tenant.systemEmailFromAddress) {
    return {
      fromAddress: tenant.systemEmailFromAddress,
      fromName:    tenant.systemEmailFromName ?? undefined,
      source:      "tenant",
    };
  }

  // Fallback til env (samme som Resend-senderen accepterer)
  const envKey = process.env.RESEND_API_KEY;
  const envFrom = process.env.RESEND_FROM_ADDRESS ?? process.env.RESEND_FROM_EMAIL;
  if (envKey && envFrom) {
    return {
      fromAddress: envFrom,
      source:      "env",
    };
  }

  return null;
}
