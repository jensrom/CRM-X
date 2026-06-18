"use server";

/**
 * Health Score actions — recalculate, list at-risk, snapshot.
 */

import { db } from "@/lib/db";
import { auth } from "@/lib/auth";
import { revalidatePath } from "next/cache";
import {
  calculateHealthScore,
  HealthSignals,
  HealthBreakdown,
} from "@/lib/health-score";

async function getSession() {
  const session = await auth();
  if (!session?.user?.tenantId) throw new Error("Ikke autoriseret");
  return session;
}

const DAY = 24 * 60 * 60 * 1000;

/** Hent raa signaler for én kunde. */
async function gatherSignals(
  tenantId: string,
  companyId: string,
): Promise<HealthSignals> {
  const now = new Date();
  const ninetyDaysAgo = new Date(now.getTime() - 90 * DAY);
  const twelveMonthsAgo = new Date(now.getTime() - 365 * DAY);
  const thirtyDaysAgo = new Date(now.getTime() - 30 * DAY);

  const [
    lastTicket,
    lastActivity,
    lastEmail,
    openTickets,
    criticalTickets,
    resolvedRecent,
    activeBundles,
    activeLicenses,
    recentlyExpiredLicenses,
    overdueInvoices,
    invoicesLast12,
  ] = await Promise.all([
    db.ticket.findFirst({
      where: { tenantId, companyId },
      orderBy: { updatedAt: "desc" },
      select: { updatedAt: true },
    }),
    db.activity.findFirst({
      where: { tenantId, companyId },
      orderBy: { createdAt: "desc" },
      select: { createdAt: true },
    }),
    db.emailLog.findFirst({
      where: { tenantId, companyId },
      orderBy: { createdAt: "desc" },
      select: { createdAt: true },
    }).catch(() => null),
    db.ticket.count({
      where: { tenantId, companyId, status: { in: ["open", "pending_customer", "pending_supplier"] } },
    }),
    db.ticket.count({
      where: { tenantId, companyId, status: { in: ["open", "pending_customer", "pending_supplier"] }, priority: "critical" },
    }),
    db.ticket.count({
      where: { tenantId, companyId, resolvedAt: { gte: ninetyDaysAgo } },
    }),
    db.hourBundle.findMany({
      where: { tenantId, companyId, isActive: true },
      select: { totalHours: true, usedMinutes: true },
    }),
    db.license.count({
      where: { tenantId, companyId, validTo: { gte: now } },
    }).catch(() => 0),
    db.license.count({
      where: { tenantId, companyId, validTo: { gte: thirtyDaysAgo, lt: now } },
    }).catch(() => 0),
    db.invoice.findMany({
      where: { tenantId, companyId, status: "overdue" },
      select: { total: true },
    }).catch(() => []),
    db.invoice.findMany({
      where: { tenantId, companyId, createdAt: { gte: twelveMonthsAgo } },
      select: { total: true },
    }).catch(() => []),
  ]);

  // Sidste kontakt = nyeste af ticket/aktivitet/email
  const lastContactCandidates = [
    lastTicket?.updatedAt,
    lastActivity?.createdAt,
    lastEmail?.createdAt,
  ].filter((d): d is Date => d instanceof Date);
  const lastContact = lastContactCandidates.length > 0
    ? new Date(Math.max(...lastContactCandidates.map((d) => d.getTime())))
    : null;
  const daysSinceContact = lastContact
    ? Math.floor((now.getTime() - lastContact.getTime()) / DAY)
    : 999;

  // Klippekort: konverter usedMinutes -> hours, beregn total + restende
  let bundleHoursTotal = 0;
  let bundleHoursRemaining = 0;
  for (const b of activeBundles) {
    const total = Number(b.totalHours);
    const usedH = Number(b.usedMinutes) / 60;
    bundleHoursTotal += total;
    bundleHoursRemaining += Math.max(0, total - usedH);
  }

  const overdueInvoiceAmount = overdueInvoices.reduce(
    (s, i) => s + Number(i.total ?? 0),
    0,
  );
  const invoiceAmountLast12Months = invoicesLast12.reduce(
    (s, i) => s + Number(i.total ?? 0),
    0,
  );

  return {
    daysSinceContact,
    openTicketCount: openTickets,
    criticalTicketCount: criticalTickets,
    resolvedLast90Days: resolvedRecent,
    bundleHoursRemaining: Math.round(bundleHoursRemaining * 10) / 10,
    bundleHoursTotal: Math.round(bundleHoursTotal * 10) / 10,
    activeLicenses,
    recentlyExpiredLicenses,
    overdueInvoiceCount: overdueInvoices.length,
    overdueInvoiceAmount,
    invoiceAmountLast12Months,
  };
}

/** Genberegn én kunde + skriv snapshot. */
export async function recalcCompanyHealth(companyId: string): Promise<HealthBreakdown> {
  const session = await getSession();
  const tenantId = session.user.tenantId!;

  // Verificer tenant-isolation
  const c = await db.company.findFirst({
    where: { id: companyId, tenantId },
    select: { id: true },
  });
  if (!c) throw new Error("Kunde ikke fundet");

  const signals = await gatherSignals(tenantId, companyId);
  const result = calculateHealthScore(signals);

  await db.company.update({
    where: { id: companyId },
    data: {
      healthScore: result.score,
      healthSignals: result as any,
      healthScoreUpdatedAt: new Date(),
    } as any,
  });

  // Snapshot for trend
  await db.companyHealthSnapshot.create({
    data: {
      tenantId,
      companyId,
      score: result.score,
      signals: result as any,
    },
  });

  revalidatePath(`/kunder/${companyId}`);
  revalidatePath("/kunder");
  return result;
}

/** Genberegn alle aktive kunder i tenanten. */
export async function recalcAllCompanyHealth(): Promise<{
  count: number;
  healthy: number;
  ok: number;
  attention: number;
  risk: number;
}> {
  const session = await getSession();
  const tenantId = session.user.tenantId!;

  const companies = await db.company.findMany({
    where: { tenantId, isActive: true },
    select: { id: true },
  });

  const counts = { healthy: 0, ok: 0, attention: 0, risk: 0 };

  for (const c of companies) {
    try {
      const result = await recalcCompanyHealth(c.id);
      counts[result.level]++;
    } catch (e) {
      console.error(`[health] recalc fejlede for ${c.id}`, e);
    }
  }

  revalidatePath("/kunder");
  revalidatePath("/dashboard");

  return {
    count: companies.length,
    ...counts,
  };
}

/** Top-N kunder i risiko (laveste score). */
export async function getAtRiskCompanies(limit = 5) {
  const session = await getSession();
  const tenantId = session.user.tenantId!;
  return db.company.findMany({
    where: {
      tenantId,
      isActive: true,
      healthScore: { not: null, lte: 59 },
    } as any,
    orderBy: { healthScore: "asc" } as any,
    take: limit,
    select: {
      id: true,
      name: true,
      healthScore: true,
      healthSignals: true,
    } as any,
  });
}
