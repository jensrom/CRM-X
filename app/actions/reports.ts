"use server";

import { db } from "@/lib/db";
import { auth } from "@/lib/auth";

export async function getReportsData(opts?: { year?: number; month?: number }) {
  const session = await auth();
  if (!session?.user?.tenantId) return null;
  const tenantId = session.user.tenantId;

  const now = new Date();
  const year = opts?.year ?? now.getFullYear();
  const month = opts?.month ?? now.getMonth(); // 0-indexed

  // Månedsspand
  const monthStart = new Date(year, month, 1);
  const monthEnd = new Date(year, month + 1, 0, 23, 59, 59);

  // Årsstart
  const yearStart = new Date(year, 0, 1);

  // Sidste 12 måneder — månedlig omsætning (vundne deals)
  const last12Months: { label: string; won: number; count: number }[] = [];
  for (let i = 11; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const start = new Date(d.getFullYear(), d.getMonth(), 1);
    const end = new Date(d.getFullYear(), d.getMonth() + 1, 0, 23, 59, 59);
    const agg = await db.deal.aggregate({
      where: { tenantId, stage: "won", closedAt: { gte: start, lte: end } },
      _sum: { value: true },
      _count: true,
    });
    last12Months.push({
      label: d.toLocaleDateString("da-DK", { month: "short", year: "2-digit" }),
      won: Number(agg._sum.value ?? 0),
      count: agg._count,
    });
  }

  const [
    // Deals denne måned
    dealsThisMonth,
    // Pipeline
    pipeline,
    // Projekter
    projectsByStatus,
    // Timer denne måned (team)
    teamTimeMonth,
    // Timer dette år (team)
    teamTimeYear,
    // Timer per bruger denne måned
    timePerUser,
    // Fakturaer
    invoicesByStatus,
    // Fakturaer denne måned
    invoicesThisMonth,
    // Tickets denne måned
    ticketsThisMonth,
    ticketsClosedThisMonth,
    // Klippekort aktive
    activeBundles,
    // Top firmaer efter timer
    topCompaniesTime,
  ] = await Promise.all([
    db.deal.aggregate({
      where: { tenantId, stage: "won", closedAt: { gte: monthStart, lte: monthEnd } },
      _sum: { value: true },
      _count: true,
    }),
    db.deal.aggregate({
      where: { tenantId, stage: { notIn: ["won", "lost"] } },
      _sum: { value: true },
      _count: true,
    }),
    db.project.groupBy({
      by: ["status"],
      where: { tenantId },
      _count: true,
    }),
    db.timeLog.aggregate({
      where: { user: { tenantId }, date: { gte: monthStart, lte: monthEnd } },
      _sum: { durationMin: true },
    }),
    db.timeLog.aggregate({
      where: { user: { tenantId }, date: { gte: yearStart } },
      _sum: { durationMin: true },
    }),
    db.timeLog.groupBy({
      by: ["userId"],
      where: { user: { tenantId }, date: { gte: monthStart, lte: monthEnd } },
      _sum: { durationMin: true },
      orderBy: { _sum: { durationMin: "desc" } },
      take: 8,
    }),
    db.invoice.groupBy({
      by: ["status"],
      where: { tenantId },
      _count: true,
    }),
    db.invoice.aggregate({
      where: { tenantId, issueDate: { gte: monthStart, lte: monthEnd } },
      _count: true,
    }),
    db.ticket.count({
      where: { tenantId, createdAt: { gte: monthStart, lte: monthEnd } },
    }),
    db.ticket.count({
      where: {
        tenantId,
        status: { in: ["resolved", "closed"] },
        updatedAt: { gte: monthStart, lte: monthEnd },
      },
    }),
    db.hourBundle.findMany({
      where: { tenantId, isActive: true },
      select: { totalHours: true, usedMinutes: true },
    }),
    db.timeLog.groupBy({
      by: ["projectId"],
      where: {
        user: { tenantId },
        date: { gte: monthStart, lte: monthEnd },
        projectId: { not: null },
      },
      _sum: { durationMin: true },
      orderBy: { _sum: { durationMin: "desc" } },
      take: 5,
    }),
  ]);

  // Opslag: userId → navn
  const userIds = timePerUser.map((t) => t.userId);
  const users = await db.user.findMany({
    where: { id: { in: userIds } },
    select: { id: true, name: true },
  });
  const userMap = Object.fromEntries(users.map((u) => [u.id, u.name ?? u.id]));

  // Opslag: projectId → titel + firma
  const projectIds = topCompaniesTime.map((t) => t.projectId).filter(Boolean) as string[];
  const projectsInfo = await db.project.findMany({
    where: { id: { in: projectIds } },
    select: { id: true, title: true, company: { select: { name: true } } },
  });
  const projectMap = Object.fromEntries(projectsInfo.map((p) => [p.id, p]));

  // Klippekort-totaler
  const bundleTotalHours = activeBundles.reduce((s, b) => s + b.totalHours, 0);
  const bundleUsedHours = Math.round(activeBundles.reduce((s, b) => s + b.usedMinutes, 0) / 60 * 10) / 10;

  return {
    year,
    month,
    monthLabel: monthStart.toLocaleDateString("da-DK", { month: "long", year: "numeric" }),
    // Salg
    dealsWonThisMonth: dealsThisMonth._count,
    dealsWonValueThisMonth: Number(dealsThisMonth._sum.value ?? 0),
    pipelineCount: pipeline._count,
    pipelineValue: Number(pipeline._sum.value ?? 0),
    last12Months,
    // Projekter
    projectsByStatus: Object.fromEntries(projectsByStatus.map((p) => [p.status, p._count])),
    // Timer
    teamTimeMonth: teamTimeMonth._sum.durationMin ?? 0,
    teamTimeYear: teamTimeYear._sum.durationMin ?? 0,
    timePerUser: timePerUser.map((t) => ({
      name: userMap[t.userId] ?? "Ukendt",
      minutes: t._sum.durationMin ?? 0,
    })),
    topProjects: topCompaniesTime.map((t) => ({
      project: projectMap[t.projectId ?? ""]?.title ?? "—",
      company: projectMap[t.projectId ?? ""]?.company?.name ?? "—",
      minutes: t._sum.durationMin ?? 0,
    })),
    // Fakturaer
    invoicesByStatus: Object.fromEntries(invoicesByStatus.map((i) => [i.status, i._count])),
    invoicesThisMonth: invoicesThisMonth._count,
    // Support
    ticketsThisMonth,
    ticketsClosedThisMonth,
    // Klippekort
    activeBundlesCount: activeBundles.length,
    bundleTotalHours,
    bundleUsedHours,
  };
}
