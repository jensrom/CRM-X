/**
 * /api/calendar/[token].ics — personlig iCal-feed pr. bruger.
 *
 * Authentication via token i URL'en (ingen session — kalender-klienter
 * understoetter ikke cookies). Token gemmes paa User.calendarToken.
 *
 * Returnerer text/calendar med alle deadlines for tenanten brugeren tilhoerer:
 *   - Aabne tickets med resolvedAt forventning (de mest kritiske)
 *   - Aktive projekter med endDate
 *   - Ubetalte fakturaer med dueDate
 *   - Aktiviteter med dueDate
 *   - Klippekort der er ved at lobe ud (resterende < 20%)
 *
 * Klient-side polling: hver 1-24 timer. Vi cacher ikke selv — Prisma-queries
 * gaar direkte mod DB.
 */

import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { generateICal, type ICalEvent } from "@/lib/ical";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Token kommer fra route segment: /api/calendar/[token]
// .ics-extension haandteres ved at strippe den foer lookup.
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ token: string }> },
) {
  const { token: rawToken } = await params;
  // Tillad foo.ics i URLen for kalender-klienter
  const token = rawToken.replace(/\.ics$/i, "");

  if (!token || token.length < 16) {
    return new NextResponse("Invalid token", { status: 401 });
  }

  const user = await db.user.findFirst({
    where: { calendarToken: token } as any,
    select: { id: true, name: true, tenantId: true } as any,
  });
  if (!user) {
    return new NextResponse("Invalid token", { status: 401 });
  }

  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || "https://crm-x.app";
  const tenantId = (user as any).tenantId as string;
  const userId = user.id;

  const now = new Date();
  const horizon = new Date(now.getTime() + 365 * 24 * 60 * 60 * 1000); // 1 år frem
  const past = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000); // 30 dage tilbage

  // Hent events parallelt — kun det der er relevant for brugeren.
  const [openTickets, activeProjects, unpaidInvoices, activeBundles] = await Promise.all([
    db.ticket.findMany({
      where: {
        tenantId,
        status: { in: ["open", "pending_customer", "pending_supplier"] },
        OR: [{ assignedToId: userId }, { assignedToId: null }],
      },
      include: { company: { select: { name: true } } },
      take: 200,
    }),
    db.project.findMany({
      where: {
        tenantId,
        status: { in: ["active", "planning"] },
        endDate: { gte: past, lte: horizon },
      },
      include: { company: { select: { name: true } } },
      take: 200,
    }),
    db.invoice.findMany({
      where: {
        tenantId,
        status: { in: ["sent", "overdue"] },
        dueDate: { not: null, gte: past, lte: horizon },
      } as any,
      include: { company: { select: { name: true } } },
      take: 200,
    }),
    db.hourBundle.findMany({
      where: { tenantId, isActive: true },
      include: { company: { select: { name: true } } },
      take: 200,
    }),
  ]);

  const events: ICalEvent[] = [];

  // Tickets — sat som all-day på updatedAt + 7 dage (rough deadline-proxy)
  for (const t of openTickets) {
    // Vi bruger updatedAt + 7 dage hvis ingen due-date — som soft reminder
    const reminderDate = new Date(t.updatedAt.getTime() + 7 * 24 * 60 * 60 * 1000);
    if (reminderDate < past) continue;
    events.push({
      uid: `ticket-${t.id}@crm-x`,
      start: reminderDate,
      isAllDay: true,
      summary: `🎫 ${t.title}`,
      description: `Status: ${t.status}\nPrioritet: ${t.priority}\nKunde: ${t.company.name}`,
      location: t.company.name,
      url: `${baseUrl}/support/tickets/${t.id}`,
      busy: false,
    });
  }

  // Projekter — endDate er hard deadline
  for (const p of activeProjects) {
    if (!p.endDate) continue;
    events.push({
      uid: `project-${p.id}@crm-x`,
      start: p.endDate,
      isAllDay: true,
      summary: `📁 ${p.title} — deadline`,
      description: `Projekt-nr: P-${String(p.number).padStart(4, "0")}\nKunde: ${p.company.name}\nStatus: ${p.status}`,
      location: p.company.name,
      url: `${baseUrl}/projects/${p.id}`,
      busy: true,
    });
  }

  // Fakturaer — dueDate
  for (const inv of unpaidInvoices) {
    if (!inv.dueDate) continue;
    events.push({
      uid: `invoice-${inv.id}@crm-x`,
      start: inv.dueDate,
      isAllDay: true,
      summary: `💰 F-${String(inv.number).padStart(4, "0")} forfalder — ${inv.company.name}`,
      description: `Faktura forfald\nKunde: ${inv.company.name}\nStatus: ${inv.status}`,
      location: inv.company.name,
      url: `${baseUrl}/invoices/${inv.id}`,
      busy: false,
    });
  }

  // Klippekort — advarsel hvis < 20% tilbage
  for (const b of activeBundles) {
    const totalH = Number(b.totalHours);
    const usedH = Number(b.usedMinutes) / 60;
    const remaining = totalH - usedH;
    const pct = totalH > 0 ? remaining / totalH : 0;
    if (pct >= 0.2) continue;
    // Sæt event 7 dage fra nu som påmindelse om fornyelse
    const reminderDate = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
    events.push({
      uid: `bundle-${b.id}@crm-x`,
      start: reminderDate,
      isAllDay: true,
      summary: `✂️ Klippekort ved at løbe ud — ${b.company.name}`,
      description: `Klippekort: ${b.name}\nRest: ${remaining.toFixed(1)} af ${totalH} timer (${Math.round(pct * 100)}%)\nKontakt kunden om fornyelse.`,
      location: b.company.name,
      url: `${baseUrl}/klippekort/${b.id}`,
      busy: false,
    });
  }

  const ical = generateICal({
    events,
    calendarName: `CRM-X — ${user.name || "Min"}`,
    calendarDescription: "Deadlines, faktura-forfald og klippekort-advarsler fra CRM-X",
    refreshHours: 4,
  });

  return new NextResponse(ical, {
    status: 200,
    headers: {
      "Content-Type": "text/calendar; charset=utf-8",
      "Content-Disposition": `inline; filename="crm-x-${userId.slice(0, 8)}.ics"`,
      "Cache-Control": "private, max-age=300", // 5 min cache
    },
  });
}
