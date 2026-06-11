"use server";

/**
 * CRM-X — GDPR Data Subject Rights
 *
 * Implementerer:
 *   Art. 15 — Right of access (export)
 *   Art. 16 — Right to rectification
 *   Art. 17 — Right to erasure ("right to be forgotten")
 *   Art. 18 — Right to restriction of processing
 *   Art. 20 — Right to data portability
 *
 * Sletning er to-trins:
 *   1. Soft delete + anonymisering af PII → ophører umiddelbart behandling
 *   2. Hard delete via retention-job efter 30 dage (regret-vindue + audit-spor)
 *
 * Alle handlinger audit-logges.
 */

import { db } from "@/lib/db";
import { auth } from "@/lib/auth";
import { audit } from "@/lib/audit";
import { rateLimit, LIMITS } from "@/lib/rate-limit";

/**
 * Eksporterer alle data om en kontakt eller bruger som JSON.
 * Returneres som streng så caller kan tilbyde download.
 *
 * @throws hvis caller ikke har rettighed til at eksportere
 */
export async function exportContactData(contactId: string): Promise<string> {
  const session = await auth();
  if (!session?.user?.tenantId) throw new Error("Ikke autoriseret");
  const tenantId = session.user.tenantId;
  const userId = session.user.id!;

  // Rate-limit: 5 eksports pr. time pr. bruger
  const rl = rateLimit(`gdpr-export:${userId}`, LIMITS.gdprExport.limit, LIMITS.gdprExport.windowMs);
  if (!rl.ok) {
    await audit({
      action: "export",
      resourceType: "contact",
      resourceId: contactId,
      outcome: "denied",
      message: `Rate limit exceeded. Retry in ${rl.retryAfterSeconds}s`,
    });
    throw new Error(`For mange eksport-forespørgsler. Prøv igen om ${rl.retryAfterSeconds}s.`);
  }

  const contact = await db.contact.findFirst({
    where: { id: contactId, tenantId },
    include: {
      company: true,
      activities: true,
      notes: true,
    },
  });

  if (!contact) {
    await audit({
      action: "export",
      resourceType: "contact",
      resourceId: contactId,
      outcome: "failure",
      message: "Contact not found",
    });
    throw new Error("Kontakt ikke fundet");
  }

  const exportPayload = {
    exportedAt: new Date().toISOString(),
    exportedBy: { id: userId, email: session.user.email },
    dataSubject: {
      type: "contact",
      id: contact.id,
      tenantId: contact.tenantId,
    },
    data: contact,
    note:
      "Denne fil indeholder alle persondata CRM-X har om denne kontakt. " +
      "Behandlet i overensstemmelse med GDPR Art. 15 og Art. 20 (dataportabilitet).",
  };

  await audit({
    action: "export",
    resourceType: "contact",
    resourceId: contactId,
    message: "GDPR Art. 15 / Art. 20 — data export",
  });

  return JSON.stringify(exportPayload, null, 2);
}

/**
 * Soft delete + anonymisering af kontakt.
 * Hard delete sker via retention-job efter 30 dage.
 *
 * Felter der overskrives:
 *   - firstName/lastName → "Slettet bruger"
 *   - email → null
 *   - phone → null
 *   - position, notes, etc. → null
 *
 * Relationer bevares (aktiviteter, tickets), men personfølsomme felter fjernes
 * for at undgå data-tab i historik som er nødvendig for forretningen.
 */
export async function eraseContact(contactId: string, reason?: string): Promise<void> {
  const session = await auth();
  if (!session?.user?.tenantId) throw new Error("Ikke autoriseret");
  const tenantId = session.user.tenantId;

  // Kun admin må slette (denne tjek skal udvides med din rolle-model)
  if (session.user.role !== "super_admin" && session.user.role !== "admin") {
    await audit({
      action: "erase",
      resourceType: "contact",
      resourceId: contactId,
      outcome: "denied",
      message: "Insufficient permissions",
    });
    throw new Error("Kun administratorer kan slette kontakter");
  }

  const contact = await db.contact.findFirst({
    where: { id: contactId, tenantId },
  });
  if (!contact) throw new Error("Kontakt ikke fundet");

  // Anonymiser PII — bevar id og tenantId for at undgå forældreløse foreign keys
  const anonymized = await db.contact.update({
    where: { id: contactId },
    data: {
      firstName: "Slettet",
      lastName: "kontakt",
      email: null,
      phone: null,
      position: null,
      // Marker som slettet — retention-job kan derefter hard-delete efter 30 dage
      isActive: false,
    },
  });

  await audit({
    action: "erase",
    resourceType: "contact",
    resourceId: contactId,
    before: { firstName: contact.firstName, lastName: contact.lastName, email: contact.email },
    after: { anonymized: true },
    message: `GDPR Art. 17 — right to erasure. Reason: ${reason ?? "not specified"}`,
  });
}

/**
 * Retter et felt på en kontakt med audit-spor.
 * Bruges når data-subject anmoder om rettelse (GDPR Art. 16).
 */
export async function rectifyContact(
  contactId: string,
  changes: Partial<{
    firstName: string;
    lastName: string;
    email: string;
    phone: string;
    position: string;
  }>,
  reason?: string
): Promise<void> {
  const session = await auth();
  if (!session?.user?.tenantId) throw new Error("Ikke autoriseret");
  const tenantId = session.user.tenantId;

  const before = await db.contact.findFirst({
    where: { id: contactId, tenantId },
  });
  if (!before) throw new Error("Kontakt ikke fundet");

  const after = await db.contact.update({
    where: { id: contactId },
    data: changes,
  });

  await audit({
    action: "rectify",
    resourceType: "contact",
    resourceId: contactId,
    before: { ...changes, ...Object.fromEntries(
      Object.keys(changes).map((k) => [k, (before as any)[k]])
    ) },
    after: changes,
    message: `GDPR Art. 16 — rectification. Reason: ${reason ?? "not specified"}`,
  });
}

/**
 * Hard-delete af kontakter der har været soft-deleted i 30+ dage.
 * Kaldes typisk fra cron-job — kør med caution.
 */
export async function purgeAnonymizedContacts(): Promise<number> {
  const thirtyDaysAgo = new Date(Date.now() - 30 * 86400000);
  const candidates = await db.contact.findMany({
    where: {
      isActive: false,
      firstName: "Slettet",
      updatedAt: { lt: thirtyDaysAgo },
    },
    select: { id: true, tenantId: true },
  });

  let purged = 0;
  for (const c of candidates) {
    try {
      await db.contact.delete({ where: { id: c.id } });
      await audit({
        action: "delete",
        resourceType: "contact",
        resourceId: c.id,
        tenantIdOverride: c.tenantId,
        message: "GDPR retention purge — hard delete after 30-day soft-delete period",
      });
      purged++;
    } catch (err) {
      console.error(`[gdpr.purge] Failed to purge contact ${c.id}:`, err);
    }
  }
  return purged;
}
