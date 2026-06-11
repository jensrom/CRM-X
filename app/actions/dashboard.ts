"use server";

import { db } from "@/lib/db";
import { auth } from "@/lib/auth";

export async function getDashboardData() {
  const session = await auth();
  if (!session?.user?.tenantId) return null;

  const tenantId = session.user.tenantId;
  const userId = session.user.id!;

  const now = new Date();
  const todayStart = new Date(now); todayStart.setHours(0, 0, 0, 0);
  const weekStart = new Date(now);
  weekStart.setDate(now.getDate() - now.getDay() + (now.getDay() === 0 ? -6 : 1));
  weekStart.setHours(0, 0, 0, 0);
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);

  const [
    companiesCount,
    // Support
    ticketsByStatus,
    criticalTickets,
    // Sales
    dealsByStage,
    dealsWonMonth,
    dealsLostMonth,
    // Projects
    projectsByStatus,
    hourBundlesLow,
    // Time
    myTimeToday,
    myTimeWeek,
    teamTimeWeek,
    // Licenser
    licensesExpiringSoon,
    licensesExpired,
    // Seneste aktivitet
    recentTickets,
    recentProjects,
    recentTimeLogs,
  ] = await Promise.all([
    // Firmaer
    db.company.count({ where: { tenantId, isActive: true } }),

    // Tickets pr. status
    db.ticket.groupBy({
      by: ["status"],
      where: { tenantId },
      _count: true,
    }),

    // Kritiske tickets
    db.ticket.count({
      where: { tenantId, priority: "critical", status: { notIn: ["resolved", "closed"] } },
    }),

    // Deals pr. stage
    db.deal.groupBy({
      by: ["stage"],
      where: { tenantId },
      _count: true,
      _sum: { value: true },
    }),

    // Deals vundet denne måned
    db.deal.aggregate({
      where: { tenantId, stage: "won", closedAt: { gte: monthStart } },
      _count: true,
      _sum: { value: true },
    }),

    // Deals tabt denne måned
    db.deal.count({
      where: { tenantId, stage: "lost", closedAt: { gte: monthStart } },
    }),

    // Projekter pr. status
    db.project.groupBy({
      by: ["status"],
      where: { tenantId },
      _count: true,
    }),

    // Klippekort som er lave (< 20% tilbage)
    db.hourBundle.findMany({
      where: { tenantId, isActive: true },
      select: { id: true, totalHours: true, usedMinutes: true, company: { select: { name: true } } },
    }),

    // Mine timer i dag
    db.timeLog.aggregate({
      where: { userId, date: { gte: todayStart } },
      _sum: { durationMin: true },
    }),

    // Mine timer denne uge
    db.timeLog.aggregate({
      where: { userId, date: { gte: weekStart } },
      _sum: { durationMin: true },
    }),

    // Team-timer denne uge
    db.timeLog.aggregate({
      where: { user: { tenantId }, date: { gte: weekStart } },
      _sum: { durationMin: true },
    }),

    // Licenser der udløber inden 30 dage
    db.license.count({
      where: {
        tenantId,
        status: "active",
        expiresAt: { gte: now, lte: new Date(now.getTime() + 30 * 86400000) },
      },
    }),

    // Udløbne licenser
    db.license.count({
      where: { tenantId, status: { in: ["expired", "active"] }, expiresAt: { lt: now } },
    }),

    // Seneste tickets
    db.ticket.findMany({
      where: { tenantId },
      orderBy: { createdAt: "desc" },
      take: 5,
      select: {
        id: true, number: true, title: true, status: true, priority: true, createdAt: true,
        company: { select: { name: true } },
        tenant: { select: { ticketPrefix: true } },
      },
    }),

    // Seneste projekter
    db.project.findMany({
      where: { tenantId },
      orderBy: { createdAt: "desc" },
      take: 3,
      select: {
        id: true, number: true, title: true, status: true, createdAt: true,
        company: { select: { name: true } },
        tenant: { select: { projectPrefix: true } },
      },
    }),

    // Seneste tidregistreringer (mit team)
    db.timeLog.findMany({
      where: { user: { tenantId } },
      orderBy: { createdAt: "desc" },
      take: 5,
      select: {
        id: true, durationMin: true, description: true, createdAt: true,
        user: { select: { name: true } },
        project: { select: { title: true, id: true } },
        ticket: { select: { title: true, id: true } },
      },
    }),
  ]);

  // Pipeline-værdi (ekskl. won/lost)
  const activeStages = ["new", "qualified", "proposal", "negotiation"];
  const pipelineValue = dealsByStage
    .filter((d) => activeStages.includes(d.stage))
    .reduce((s, d) => s + Number(d._sum.value ?? 0), 0);
  const activeDealCount = dealsByStage
    .filter((d) => activeStages.includes(d.stage))
    .reduce((s, d) => s + d._count, 0);

  // Win rate denne måned
  const totalClosed = (dealsWonMonth._count ?? 0) + dealsLostMonth;
  const winRate = totalClosed > 0 ? Math.round(((dealsWonMonth._count ?? 0) / totalClosed) * 100) : null;

  // Klippekort-advarsler
  const lowBundles = hourBundlesLow.filter((b) => {
    const used = b.usedMinutes / 60;
    const remaining = b.totalHours - used;
    return remaining / b.totalHours < 0.2 && remaining > 0;
  });

  // Ticket KPIs
  const ticketMap: Record<string, number> = {};
  for (const t of ticketsByStatus) ticketMap[t.status] = t._count;

  // Tæller alle aktive tickets — inkluderer både nuværende og legacy-værdier
  const openTickets =
    (ticketMap["open"] ?? 0) +
    (ticketMap["pending_customer"] ?? 0) +
    (ticketMap["pending_supplier"] ?? 0) +
    // Legacy fallback hvis gamle rows endnu ikke er migreret
    (ticketMap["new"] ?? 0) +
    (ticketMap["pending_reply"] ?? 0);

  return {
    companiesCount,
    openTickets,
    criticalTickets,
    ticketMap,
    pipelineValue,
    activeDealCount,
    dealsWonMonth: dealsWonMonth._count ?? 0,
    dealsWonValueMonth: Number(dealsWonMonth._sum?.value ?? 0),
    winRate,
    projectsByStatus: Object.fromEntries(projectsByStatus.map((p) => [p.status, p._count])),
    lowBundles,
    myTimeToday: myTimeToday._sum.durationMin ?? 0,
    myTimeWeek: myTimeWeek._sum.durationMin ?? 0,
    teamTimeWeek: teamTimeWeek._sum.durationMin ?? 0,
    licensesExpiringSoon,
    licensesExpired,
    recentTickets,
    recentProjects,
    recentTimeLogs,
  };
}
