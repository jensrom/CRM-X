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
