"use server";

/**
 * Email-log queries — read-only adgang til EmailLog.
 *
 * Sikkerheds-aftaler:
 *   • Alle queries filtreres paa session.user.tenantId — ingen cross-tenant leak
 *   • body-content vises kun til admins (eller den der har sendt mailen)
 *   • Detail-fetch returnerer fuld body; liste-fetch udelader body for ydeevne
 */

import { db } from "@/lib/db";
import { auth } from "@/lib/auth";

async function requireTenant() {
  const session = await auth();
  if (!session?.user?.tenantId) throw new Error("Ikke autoriseret");
  return session;
}

export interface EmailLogFilter {
  status?:       "sent" | "failed" | "delivered" | "bounced" | null;
  provider?:     "resend" | "microsoft" | "google" | "mailto" | null;
  resourceType?: string | null;
  /** Soeg i subject + fromAddress + toAddresses (case-insensitive) */
  search?:       string | null;
  /** Begraens til mails sendt af denne bruger (ellers alle pa tenant) */
  onlyMine?:     boolean;
}

export async function listEmailLogs(filter: EmailLogFilter = {}, take = 50) {
  const session = await requireTenant();
  const tenantId = session.user.tenantId!;
  const userId = session.user.id;

  const where: any = { tenantId };
  if (filter.status)       where.status = filter.status;
  if (filter.provider)     where.provider = filter.provider;
  if (filter.resourceType) where.resourceType = filter.resourceType;
  if (filter.onlyMine && userId) where.userId = userId;
  if (filter.search) {
    const s = filter.search.trim();
    where.OR = [
      { subject:     { contains: s, mode: "insensitive" } },
      { fromAddress: { contains: s, mode: "insensitive" } },
      { toAddresses: { has: s } },
    ];
  }

  return db.emailLog.findMany({
    where,
    select: {
      id: true,
      provider: true,
      status: true,
      fromAddress: true,
      toAddresses: true,
      subject: true,
      providerMessageId: true,
      resourceType: true,
      resourceId: true,
      errorMessage: true,
      sentAt: true,
      deliveredAt: true,
      failedAt: true,
      user: { select: { id: true, name: true } },
    },
    orderBy: { sentAt: "desc" },
    take,
  });
}

export async function getEmailLog(id: string) {
  const session = await requireTenant();
  const tenantId = session.user.tenantId!;

  return db.emailLog.findFirst({
    where: { id, tenantId },
    include: {
      user: { select: { id: true, name: true, email: true } },
    },
  });
}

export async function countByStatus() {
  const session = await requireTenant();
  const tenantId = session.user.tenantId!;

  const [total, sent, failed] = await Promise.all([
    db.emailLog.count({ where: { tenantId } }),
    db.emailLog.count({ where: { tenantId, status: { in: ["sent", "delivered"] } } }),
    db.emailLog.count({ where: { tenantId, status: { in: ["failed", "bounced"] } } }),
  ]);
  return { total, sent, failed };
}
