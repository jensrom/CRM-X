"use server";

/**
 * Personal Dashboard — data-fetchers til brugerens egne ejerskaber.
 *
 * Bruges af /dashboard naar view=mit (default). Returnerer alt brugeren ejer
 * eller skal handle paa, struktureret efter persona.
 */

import { db } from "@/lib/db";
import { auth } from "@/lib/auth";

async function getCtx() {
  const session = await auth();
  if (!session?.user?.tenantId || !session.user.id) throw new Error("Ikke autoriseret");
  return { userId: session.user.id, tenantId: session.user.tenantId };
}

/**
 * SALES-PERSONA — alt salgs-relateret som brugeren ejer.
 */
export async function getMySalesDashboard() {
  const { userId, tenantId } = await getCtx();
  const now = new Date();
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
  const monthEnd   = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59);

  const [
    myOpenDeals,
    myPipelineValue,
    myLeads,
    myDraftQuotes,
    mySentQuotes,
    myWonThisMonth,
    unclaimedLeads,
  ] = await Promise.all([
    db.deal.findMany({
      where: {
        tenantId,
        assignedToId: userId,
        stage: { notIn: ["won", "lost"] },
      },
      orderBy: { updatedAt: "desc" },
      take: 8,
      select: {
        id: true, title: true, stage: true, value: true, probability: true,
        expectedCloseDate: true,
        company: { select: { name: true } },
      },
    }),
    db.deal.aggregate({
      where: { tenantId, assignedToId: userId, stage: { notIn: ["won", "lost"] } },
      _sum: { value: true },
      _count: { id: true },
    }),
    db.lead.findMany({
      where: { tenantId, assignedToId: userId, status: { notIn: ["converted", "lost"] } },
      orderBy: { updatedAt: "desc" },
      take: 5,
      select: { id: true, firstName: true, lastName: true, company: true, status: true, source: true },
    }),
    db.quote.count({
      where: { tenantId, assignedToId: userId, status: "draft" },
    }),
    db.quote.findMany({
      where: { tenantId, assignedToId: userId, status: "sent" },
      orderBy: { sentAt: "desc" },
      take: 5,
      select: {
        id: true, number: true, title: true, sentAt: true, validUntil: true,
        company: { select: { name: true } },
      },
    }),
    db.deal.aggregate({
      where: {
        tenantId, assignedToId: userId, stage: "won",
        closedAt: { gte: monthStart, lte: monthEnd },
      },
      _sum: { value: true },
      _count: { id: true },
    }),
    db.lead.count({
      where: { tenantId, assignedToId: null, status: { notIn: ["lost"] } },
    }),
  ]);

  return {
    openDealsCount:  myPipelineValue._count.id,
    pipelineValue:   Number(myPipelineValue._sum.value ?? 0),
    wonThisMonth:    Number(myWonThisMonth._sum.value ?? 0),
    wonCountMonth:   myWonThisMonth._count.id,
    draftQuotesCount: myDraftQuotes,
    leadsCount:      myLeads.length,
    unclaimedLeads,
    topDeals:        myOpenDeals,
    activeLeads:     myLeads,
    sentQuotes:      mySentQuotes,
  };
}

/**
 * TECH-PERSONA — alt teknik-relateret brugeren skal handle paa.
 */
export async function getMyTechDashboard() {
  const { userId, tenantId } = await getCtx();
  const today    = new Date();
  const dayStart = new Date(today.getFullYear(), today.getMonth(), today.getDate());
  const weekEnd  = new Date(dayStart);
  weekEnd.setDate(weekEnd.getDate() + 7);

  const [
    myOpenTickets,
    criticalTickets,
    myProjects,
    myBundles,
    myTimeToday,
    unclaimedTickets,
  ] = await Promise.all([
    db.ticket.findMany({
      where: { tenantId, assignedToId: userId, status: { notIn: ["resolved", "closed"] } },
      orderBy: [{ priority: "desc" }, { updatedAt: "desc" }],
      take: 10,
      select: {
        id: true, number: true, title: true, status: true, priority: true,
        slaResolveDueAt: true, slaResolveBreached: true,
        company: { select: { name: true } },
      },
    }),
    db.ticket.count({
      where: { tenantId, assignedToId: userId, priority: "critical", status: { notIn: ["resolved", "closed"] } },
    }),
    db.project.findMany({
      where: {
        tenantId, assignedToId: userId,
        status: { in: ["planning", "active"] },
      },
      orderBy: { endDate: "asc" },
      take: 6,
      select: {
        id: true, number: true, title: true, status: true, endDate: true,
        company: { select: { name: true } },
      },
    }),
    db.hourBundle.findMany({
      where: { tenantId, assignedToId: userId, isActive: true },
      orderBy: { createdAt: "desc" },
      take: 6,
      select: {
        id: true, number: true, name: true, totalHours: true, usedMinutes: true,
        company: { select: { name: true } },
      },
    }),
    db.timeLog.aggregate({
      where: { userId, createdAt: { gte: dayStart } },
      _sum: { durationMin: true },
    }),
    db.ticket.count({
      where: { tenantId, assignedToId: null, status: { notIn: ["resolved", "closed"] } },
    }),
  ]);

  return {
    openTicketsCount:    myOpenTickets.length,
    criticalCount:       criticalTickets,
    activeProjectsCount: myProjects.length,
    activeBundlesCount:  myBundles.length,
    minutesToday:        myTimeToday._sum.durationMin ?? 0,
    unclaimedTickets,
    topTickets:          myOpenTickets,
    activeProjects:      myProjects,
    activeBundles:       myBundles.map((b) => ({
      ...b,
      totalMinutes: b.totalHours * 60,
      remainingMinutes: b.totalHours * 60 - b.usedMinutes,
      usedPct: b.totalHours > 0 ? Math.round((b.usedMinutes / (b.totalHours * 60)) * 100) : 0,
    })),
  };
}

/**
 * LEADER-PERSONA — team-niveau overblik for admin/leder.
 *
 * Lederen ser ikke "mine deals" — han ser hele teamets pipeline, hvem der
 * traekker laesset, hvem der haenger bagud, og hvor brandene faldes (SLA + at-risk).
 *
 * Returnerer:
 *   - team-pipeline + vundet-i-mdr
 *   - top 5 sælgere efter vundet-vaerdi
 *   - bottom-3 sælgere uden won-deal de sidste 30 dage (flagge dem)
 *   - aktive targets pr bruger med progress
 *   - kritiske SLA tickets (paa tværs af team)
 *   - kritiske at-risk customers
 *   - recent team-wins (de sidste 5 vundne deals)
 */
export async function getMyLeaderDashboard() {
  const { tenantId } = await getCtx();
  const now = new Date();
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
  const monthEnd   = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59);
  const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

  const [
    teamPipeline,
    wonThisMonth,
    activeDealsCount,
    activeUsers,
    topPerformers,
    activeTargets,
    criticalTicketsCount,
    atRiskTicketsTop,
    recentWins,
    weekWonAgg,
  ] = await Promise.all([
    db.deal.aggregate({
      where: { tenantId, stage: { notIn: ["won", "lost"] } },
      _sum: { value: true },
      _count: { id: true },
    }),
    db.deal.aggregate({
      where: { tenantId, stage: "won", closedAt: { gte: monthStart, lte: monthEnd } },
      _sum: { value: true },
      _count: { id: true },
    }),
    db.deal.count({
      where: { tenantId, stage: { notIn: ["won", "lost"] } },
    }),
    db.user.findMany({
      where: { tenantId, isActive: true },
      select: { id: true, name: true, email: true },
      orderBy: { name: "asc" },
    }),
    db.deal.groupBy({
      by: ["assignedToId"],
      where: {
        tenantId,
        stage: "won",
        closedAt: { gte: monthStart, lte: monthEnd },
        assignedToId: { not: null },
      },
      _sum: { value: true },
      _count: { id: true },
      orderBy: { _sum: { value: "desc" } },
      take: 5,
    }),
    db.salesTarget.findMany({
      where: {
        tenantId,
        userId:      { not: null },         // skip tenant-niveau targets
        periodStart: { lte: now },
        periodEnd:   { gte: now },
      },
      select: {
        id: true, periodStart: true, periodEnd: true, targetAmount: true,
        user: { select: { id: true, name: true, email: true } },
      },
      orderBy: { targetAmount: "desc" },
      take: 10,
    }).catch(() => [] as any[]),
    db.ticket.count({
      where: { tenantId, priority: "critical", status: { notIn: ["resolved", "closed"] } },
    }),
    db.ticket.findMany({
      where: {
        tenantId,
        status: { notIn: ["resolved", "closed"] },
        OR: [
          { slaResolveBreached: true } as any,
          { slaResolveDueAt: { lte: new Date(now.getTime() + 24 * 60 * 60 * 1000) } } as any,
        ],
      },
      orderBy: [{ priority: "desc" }, { slaResolveDueAt: "asc" }],
      take: 5,
      select: {
        id: true, number: true, title: true, priority: true, status: true,
        slaResolveDueAt: true, slaResolveBreached: true,
        company: { select: { name: true } },
        assignedTo: { select: { name: true } },
      },
    }).catch(() => [] as any[]),
    db.deal.findMany({
      where: { tenantId, stage: "won", closedAt: { not: null } },
      orderBy: { closedAt: "desc" },
      take: 6,
      select: {
        id: true, title: true, value: true, closedAt: true,
        company: { select: { name: true } },
        assignedTo: { select: { id: true, name: true } },
      },
    }),
    db.deal.aggregate({
      where: {
        tenantId, stage: "won",
        closedAt: { gte: new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000) },
      },
      _sum: { value: true }, _count: { id: true },
    }),
  ]);

  // Beregn progress pr target ved at summere won-deals i perioden
  const targetsWithProgress = await Promise.all(
    activeTargets.map(async (t: any) => {
      const sumAgg = await db.deal.aggregate({
        where: {
          tenantId, stage: "won", assignedToId: t.user.id,
          closedAt: { gte: t.periodStart, lte: t.periodEnd },
        },
        _sum: { value: true }, _count: { id: true },
      });
      const won = Number(sumAgg._sum.value ?? 0);
      const target = Number(t.targetAmount ?? 0);
      const pct = target > 0 ? Math.round((won / target) * 100) : 0;
      return {
        userId: t.user.id, userName: t.user.name ?? t.user.email,
        targetAmount: target,
        wonAmount: won,
        progressPct: pct,
        wonCount: sumAgg._count.id,
      };
    })
  );

  // Find sælgere uden won-deal sidste 30 dage (cold-flag)
  const wonByUserLast30 = await db.deal.groupBy({
    by: ["assignedToId"],
    where: { tenantId, stage: "won", closedAt: { gte: thirtyDaysAgo } },
    _count: { id: true },
  });
  const activeUserIds = new Set(wonByUserLast30.map((r: any) => r.assignedToId).filter(Boolean));
  const coldReps = activeUsers
    .filter((u: any) => !activeUserIds.has(u.id))
    .slice(0, 5);

  // Enrich top-performers med bruger-navn
  const userMap = new Map(activeUsers.map((u: any) => [u.id, u.name ?? u.email]));
  const enrichedTop = topPerformers.map((p: any) => ({
    userId: p.assignedToId,
    userName: userMap.get(p.assignedToId) ?? "Ukendt",
    wonValue: Number(p._sum.value ?? 0),
    wonCount: p._count.id,
  }));

  return {
    teamSize: activeUsers.length,
    pipelineValue:  Number(teamPipeline._sum.value ?? 0),
    activeDealsCount,
    wonValueMonth:  Number(wonThisMonth._sum.value ?? 0),
    wonCountMonth:  wonThisMonth._count.id,
    wonValueWeek:   Number(weekWonAgg._sum.value ?? 0),
    wonCountWeek:   weekWonAgg._count.id,
    criticalTicketsCount,
    topPerformers:  enrichedTop,
    coldReps,
    activeTargets:  targetsWithProgress,
    atRiskTickets:  atRiskTicketsTop,
    recentWins,
  };
}

/**
 * Claim et lead — saetter assignedToId = nuvaerende bruger.
 */
export async function claimLead(leadId: string) {
  const { userId, tenantId } = await getCtx();
  await db.lead.update({
    where: { id: leadId, tenantId, assignedToId: null } as any,
    data: { assignedToId: userId },
  });
}

/**
 * Claim en ticket — saetter assignedToId = nuvaerende bruger.
 */
export async function claimTicket(ticketId: string) {
  const { userId, tenantId } = await getCtx();
  await db.ticket.update({
    where: { id: ticketId, tenantId, assignedToId: null } as any,
    data: { assignedToId: userId },
  });
}
