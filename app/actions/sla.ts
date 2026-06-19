"use server";

/**
 * SLA actions.
 *
 *  - upsertSlaPolicy: admin saetter SLA pr. priority
 *  - listSlaPolicies: alle policies for tenanten
 *  - recalcTicketSla: bumper due-times paa én ticket
 *  - markFirstResponse: saetter firstResponseAt hvis null
 *  - getAtRiskTickets: tickets med warning eller breach (dashboard)
 *
 * Default-policies hvis ingen findes:
 *   critical: 60min response, 240min resolve
 *   high:     120min, 480min (8 timer)
 *   normal:   480min (8 timer), 1440min (24 timer)
 *   low:      1440min (24t), 4320min (3 dage)
 */

import { db } from "@/lib/db";
import { auth } from "@/lib/auth";
import { revalidatePath } from "next/cache";
import { getSlaStatus, type SlaPolicy } from "@/lib/sla";

const DEFAULT_POLICIES: Omit<SlaPolicy, "priority"> & { priority: string }[] | any = [
  { priority: "critical", responseTimeMin: 60,   resolveTimeMin: 240,   warningPct: 80, isActive: true },
  { priority: "high",     responseTimeMin: 120,  resolveTimeMin: 480,   warningPct: 80, isActive: true },
  { priority: "normal",   responseTimeMin: 480,  resolveTimeMin: 1440,  warningPct: 80, isActive: true },
  { priority: "low",      responseTimeMin: 1440, resolveTimeMin: 4320,  warningPct: 80, isActive: true },
];

async function getSession() {
  const session = await auth();
  if (!session?.user?.tenantId) throw new Error("Ikke autoriseret");
  return session;
}

/** Liste over policies pr. tenant. Hvis ingen findes — seed defaults og returnér. */
export async function listSlaPolicies() {
  const session = await getSession();
  const tenantId = session.user.tenantId!;

  const existing = await db.slaPolicy.findMany({
    where: { tenantId },
    orderBy: [{ priority: "asc" }],
  });
  if (existing.length > 0) return existing;

  // Seed defaults — første gang nogen aabner siden
  await db.slaPolicy.createMany({
    data: DEFAULT_POLICIES.map((p: any) => ({ ...p, tenantId })),
    skipDuplicates: true,
  });
  return db.slaPolicy.findMany({
    where: { tenantId },
    orderBy: [{ priority: "asc" }],
  });
}

/** Admin saetter / opdaterer policy for én priority. */
export async function upsertSlaPolicy(formData: FormData) {
  const session = await getSession();
  const tenantId = session.user.tenantId!;

  const priority = (formData.get("priority") as string) || "";
  const responseTimeMin = Number(formData.get("responseTimeMin") ?? 0);
  const resolveTimeMin = Number(formData.get("resolveTimeMin") ?? 0);
  const warningPct = Math.min(100, Math.max(0, Number(formData.get("warningPct") ?? 80)));
  const isActive = formData.get("isActive") === "on";

  if (!["low", "normal", "high", "critical"].includes(priority)) {
    throw new Error("Ugyldig priority");
  }
  if (responseTimeMin <= 0 || resolveTimeMin <= 0) {
    throw new Error("Tider skal være positive");
  }
  if (resolveTimeMin < responseTimeMin) {
    throw new Error("Loesningstid skal være større end responstid");
  }

  await db.slaPolicy.upsert({
    where: { tenantId_priority: { tenantId, priority } } as any,
    create: { tenantId, priority, responseTimeMin, resolveTimeMin, warningPct, isActive },
    update: { responseTimeMin, resolveTimeMin, warningPct, isActive },
  });

  revalidatePath("/settings/sla");
}

/** Saet firstResponseAt hvis null. Bruges naar agent skriver komment paa ticket. */
export async function markFirstResponseIfNeeded(ticketId: string) {
  const session = await getSession();
  const tenantId = session.user.tenantId!;

  const ticket = await db.ticket.findFirst({
    where: { id: ticketId, tenantId },
    select: { id: true, firstResponseAt: true } as any,
  });
  if (!ticket || (ticket as any).firstResponseAt) return;

  await db.ticket.update({
    where: { id: ticketId },
    data: { firstResponseAt: new Date() } as any,
  });
}

/** Genberegn due-times for én ticket — kald efter create eller priority-skift. */
export async function recalcTicketSla(ticketId: string) {
  const session = await getSession();
  const tenantId = session.user.tenantId!;

  const ticket = await db.ticket.findFirst({
    where: { id: ticketId, tenantId },
    select: {
      id: true, priority: true, createdAt: true,
      firstResponseAt: true, resolvedAt: true, status: true,
    } as any,
  });
  if (!ticket) return;

  const policy = await db.slaPolicy.findFirst({
    where: { tenantId, priority: (ticket as any).priority, isActive: true },
  });
  if (!policy) return;

  const t: any = ticket;
  const result = getSlaStatus(
    {
      createdAt: t.createdAt,
      firstResponseAt: t.firstResponseAt,
      resolvedAt: t.resolvedAt,
      status: t.status,
      priority: t.priority,
    },
    policy as any,
  );

  await db.ticket.update({
    where: { id: ticketId },
    data: {
      slaResponseDueAt: result.response.dueAt,
      slaResolveDueAt:  result.resolve.dueAt,
      slaResponseBreached: result.response.status === "breach",
      slaResolveBreached:  result.resolve.status === "breach",
    } as any,
  });
}

/** Tickets med warning eller breach (til dashboard-widget). */
export async function getAtRiskTickets(limit = 5) {
  const session = await getSession();
  const tenantId = session.user.tenantId!;

  // For at undgaa N+1 paa policies: hent dem foerst og lav lokal-lookup
  const [tickets, policies] = await Promise.all([
    db.ticket.findMany({
      where: {
        tenantId,
        status: { in: ["open", "pending_customer", "pending_supplier"] },
      },
      orderBy: { createdAt: "desc" },
      take: 100,
      select: {
        id: true, title: true, priority: true, status: true,
        createdAt: true, firstResponseAt: true, resolvedAt: true,
        company: { select: { name: true } },
      } as any,
    }),
    db.slaPolicy.findMany({ where: { tenantId, isActive: true } }),
  ]);

  const policyByPriority = new Map(policies.map((p) => [p.priority, p]));
  const now = new Date();
  const rows = tickets
    .map((t: any) => {
      const result = getSlaStatus(
        {
          createdAt: t.createdAt,
          firstResponseAt: t.firstResponseAt,
          resolvedAt: t.resolvedAt,
          status: t.status,
          priority: t.priority,
        },
        (policyByPriority.get(t.priority) as any) ?? null,
        now,
      );
      return { ticket: t, result };
    })
    .filter((x) => x.result.worst === "warning" || x.result.worst === "breach")
    // Bryd-tickets foerst, sa de mest kritiske
    .sort((a, b) => {
      if (a.result.worst === "breach" && b.result.worst !== "breach") return -1;
      if (b.result.worst === "breach" && a.result.worst !== "breach") return 1;
      // Indenfor samme niveau: laveste minutesRemaining (mest haster)
      const aMin = Math.min(
        a.result.response.minutesRemaining ?? Infinity,
        a.result.resolve.minutesRemaining ?? Infinity,
      );
      const bMin = Math.min(
        b.result.response.minutesRemaining ?? Infinity,
        b.result.resolve.minutesRemaining ?? Infinity,
      );
      return aMin - bMin;
    })
    .slice(0, limit);

  return rows;
}
