"use server";

/**
 * Assistant server actions — eksekverer intents fra parseAssistantInput.
 *
 * Sikkerhed: Hver action verificerer tenant-isolation. Bruges af både tenant-app
 * og admin-portal (men admin skal vælge tenant først).
 */

import { db } from "@/lib/db";
import { auth } from "@/lib/auth";
import { revalidatePath } from "next/cache";
import {
  parseAssistantInput,
  type AssistantIntent,
  type AssistantAction,
  type AssistantLookup,
} from "@/lib/assistant";

async function getSession() {
  const session = await auth();
  if (!session?.user?.tenantId) throw new Error("Ikke autoriseret");
  return session;
}

export interface AssistantReply {
  ok: boolean;
  intent: AssistantIntent;
  data?: any;
  error?: string;
  appliedChange?: string;
}

/**
 * Hovedfunktion: parse + execute.
 * Hvis intent er "action" eksekverer vi straks.
 * Hvis intent er "lookup" henter vi data.
 */
export async function askAssistant(input: string): Promise<AssistantReply> {
  const intent = parseAssistantInput(input);

  if (intent.type === "text" || intent.type === "help" || intent.type === "error") {
    return { ok: intent.type !== "error", intent };
  }

  if (intent.type === "action") {
    return executeAction(intent.action);
  }

  if (intent.type === "lookup") {
    return executeLookup(intent.lookup);
  }

  return { ok: false, intent: { type: "error", message: "Ukendt intent" }, error: "Ukendt intent" };
}

// ─────────────────────────────────────────────────────────────────────────────
// ACTIONS — udfører ændringer i DB
// ─────────────────────────────────────────────────────────────────────────────

async function executeAction(action: AssistantAction): Promise<AssistantReply> {
  const session = await getSession();
  const tenantId = session.user.tenantId!;

  try {
    switch (action.kind) {
      case "lead.setStatus": {
        // Fuzzy match på lead-navn
        const lead = await db.lead.findFirst({
          where: {
            tenantId,
            OR: [
              { firstName: { contains: action.leadName, mode: "insensitive" } },
              { lastName:  { contains: action.leadName, mode: "insensitive" } },
              { company:   { contains: action.leadName, mode: "insensitive" } },
              { email:     { contains: action.leadName, mode: "insensitive" } },
            ],
          },
          select: { id: true, firstName: true, lastName: true, status: true },
        });
        if (!lead) {
          return {
            ok: false,
            intent: { type: "error", message: `Kunne ikke finde lead "${action.leadName}"` },
            error: "Lead ikke fundet",
          };
        }
        const oldStatus = lead.status;
        await db.lead.update({
          where: { id: lead.id },
          data: { status: action.newStatus, ...(action.newStatus === "converted" && { convertedAt: new Date() }) },
        });
        revalidatePath("/leads");
        return {
          ok: true,
          intent: {
            type: "action",
            action,
            preview: `Lead "${lead.firstName} ${lead.lastName}" er skiftet fra ${oldStatus} → ${action.newStatus}`,
          },
          appliedChange: `${lead.firstName} ${lead.lastName}: ${oldStatus} → ${action.newStatus}`,
        };
      }

      case "deal.setStage": {
        const deal = await db.deal.findFirst({
          where: {
            tenantId,
            title: { contains: action.dealTitle, mode: "insensitive" },
          },
          select: { id: true, title: true, stage: true },
        });
        if (!deal) {
          return {
            ok: false,
            intent: { type: "error", message: `Kunne ikke finde deal "${action.dealTitle}"` },
            error: "Deal ikke fundet",
          };
        }
        const oldStage = deal.stage;
        await db.deal.update({
          where: { id: deal.id },
          data: {
            stage: action.newStage,
            ...((action.newStage === "won" || action.newStage === "lost") && { closedAt: new Date() }),
          },
        });
        revalidatePath("/pipeline");
        return {
          ok: true,
          intent: {
            type: "action",
            action,
            preview: `Deal "${deal.title}" skiftet fra ${oldStage} → ${action.newStage}`,
          },
          appliedChange: `${deal.title}: ${oldStage} → ${action.newStage}`,
        };
      }

      case "ticket.setStatus": {
        // T-XXXX → number
        const numMatch = action.ticketRef.match(/^T-(\d+)$/i);
        if (!numMatch) {
          return {
            ok: false,
            intent: { type: "error", message: "Ugyldig ticket-reference" },
            error: "Bad ref",
          };
        }
        const number = parseInt(numMatch[1], 10);
        const ticket = await db.ticket.findFirst({
          where: { tenantId, number },
          select: { id: true, title: true, status: true },
        });
        if (!ticket) {
          return {
            ok: false,
            intent: { type: "error", message: `Ticket ${action.ticketRef} findes ikke` },
            error: "Ticket ikke fundet",
          };
        }
        const oldStatus = ticket.status;
        await db.ticket.update({
          where: { id: ticket.id },
          data: {
            status: action.newStatus,
            ...(action.newStatus === "resolved" && { resolvedAt: new Date() }),
            ...(action.newStatus === "closed" && { closedAt: new Date() }),
          },
        });
        revalidatePath("/support/tickets");
        return {
          ok: true,
          intent: {
            type: "action",
            action,
            preview: `Ticket ${action.ticketRef} (${ticket.title}) skiftet fra ${oldStatus} → ${action.newStatus}`,
          },
          appliedChange: `${action.ticketRef}: ${oldStatus} → ${action.newStatus}`,
        };
      }

      case "company.recalcHealth": {
        const company = await db.company.findFirst({
          where: {
            tenantId,
            name: { contains: action.companyName, mode: "insensitive" },
          },
          select: { id: true, name: true },
        });
        if (!company) {
          return {
            ok: false,
            intent: { type: "error", message: `Kunde "${action.companyName}" ikke fundet` },
            error: "Kunde ikke fundet",
          };
        }
        // Kald health-recalc dynamisk for at undgå circular import
        const { recalcCompanyHealth } = await import("./health-score");
        const result = await recalcCompanyHealth(company.id);
        revalidatePath("/kunder");
        return {
          ok: true,
          intent: {
            type: "action",
            action,
            preview: `Health-score for "${company.name}": ${result.score}/100 (${result.level})`,
          },
          appliedChange: `${company.name} health = ${result.score} (${result.level})`,
        };
      }
    }
  } catch (e: any) {
    return {
      ok: false,
      intent: { type: "error", message: e?.message ?? "Ukendt fejl" },
      error: e?.message ?? "Ukendt fejl",
    };
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// LOOKUPS — læser data
// ─────────────────────────────────────────────────────────────────────────────

async function executeLookup(lookup: AssistantLookup): Promise<AssistantReply> {
  const session = await getSession();
  const tenantId = session.user.tenantId!;

  try {
    switch (lookup.kind) {
      case "stats.leadFunnel": {
        const stages = await db.lead.groupBy({
          by: ["status"],
          where: { tenantId },
          _count: true,
        });
        const total = stages.reduce((s, x) => s + x._count, 0);
        const lines = stages
          .map((s) => `  ${s.status}: ${s._count}`)
          .join("\n");
        return {
          ok: true,
          intent: {
            type: "lookup",
            lookup,
            preview: `Leads total: ${total}\n${lines}`,
          },
          data: { stages, total },
        };
      }

      case "stats.pipeline": {
        const stages = await db.deal.groupBy({
          by: ["stage"],
          where: { tenantId, stage: { notIn: ["won", "lost"] } },
          _count: true,
          _sum: { value: true },
        });
        const total = stages.reduce((s, x) => s + x._count, 0);
        const totalValue = stages.reduce((s, x) => s + Number(x._sum.value ?? 0), 0);
        const lines = stages
          .map(
            (s) =>
              `  ${s.stage}: ${s._count} · ${Number(s._sum.value ?? 0).toLocaleString("da-DK")} kr`,
          )
          .join("\n");
        return {
          ok: true,
          intent: {
            type: "lookup",
            lookup,
            preview: `Aktiv pipeline: ${total} deals · ${totalValue.toLocaleString("da-DK")} kr\n${lines}`,
          },
          data: { stages, total, totalValue },
        };
      }

      case "stats.openTickets": {
        const tickets = await db.ticket.findMany({
          where: {
            tenantId,
            status: { in: ["open", "pending_customer", "pending_supplier"] },
          },
          orderBy: [{ priority: "desc" }, { createdAt: "desc" }],
          take: 10,
          select: {
            number: true,
            title: true,
            priority: true,
            status: true,
            company: { select: { name: true } },
          },
        });
        const lines = tickets
          .map(
            (t) =>
              `  T-${String(t.number).padStart(4, "0")} [${t.priority}] ${t.title} (${t.company.name})`,
          )
          .join("\n");
        const total = await db.ticket.count({
          where: {
            tenantId,
            status: { in: ["open", "pending_customer", "pending_supplier"] },
          },
        });
        return {
          ok: true,
          intent: {
            type: "lookup",
            lookup,
            preview: `${total} åbne tickets — top 10:\n${lines}`,
          },
          data: { tickets, total },
        };
      }

      case "lead.byName": {
        const lead = await db.lead.findFirst({
          where: {
            tenantId,
            OR: [
              { firstName: { contains: lookup.name, mode: "insensitive" } },
              { lastName:  { contains: lookup.name, mode: "insensitive" } },
              { email:     { contains: lookup.name, mode: "insensitive" } },
            ],
          },
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
            company: true,
            status: true,
            source: true,
            createdAt: true,
          },
        });
        if (!lead) {
          return {
            ok: false,
            intent: { type: "error", message: `Lead "${lookup.name}" ikke fundet` },
            error: "Lead ikke fundet",
          };
        }
        return {
          ok: true,
          intent: {
            type: "lookup",
            lookup,
            preview:
              `${lead.firstName} ${lead.lastName} (${lead.company ?? "uden firma"})\n` +
              `  Email: ${lead.email}\n` +
              `  Status: ${lead.status}\n` +
              `  Kilde: ${lead.source ?? "—"}\n` +
              `  Oprettet: ${lead.createdAt.toLocaleDateString("da-DK")}`,
          },
          data: lead,
        };
      }

      case "company.byName": {
        const c = await db.company.findFirst({
          where: { tenantId, name: { contains: lookup.name, mode: "insensitive" } },
          select: {
            id: true,
            name: true,
            orgNumber: true,
            phone: true,
            email: true,
            healthScore: true,
            _count: { select: { tickets: true, projects: true, hourBundles: true } },
          } as any,
        });
        if (!c) {
          return {
            ok: false,
            intent: { type: "error", message: `Kunde "${lookup.name}" ikke fundet` },
            error: "Kunde ikke fundet",
          };
        }
        const _c: any = c;
        return {
          ok: true,
          intent: {
            type: "lookup",
            lookup,
            preview:
              `${_c.name} (CVR ${_c.orgNumber ?? "—"})\n` +
              `  ${_c.phone ?? ""} · ${_c.email ?? ""}\n` +
              `  Health: ${_c.healthScore ?? "—"}/100\n` +
              `  ${_c._count.tickets} tickets · ${_c._count.projects} projekter · ${_c._count.hourBundles} klippekort`,
          },
          data: c,
        };
      }

      case "ticket.byRef": {
        const numMatch = lookup.ref.match(/^T-(\d+)$/i);
        if (!numMatch) {
          return {
            ok: false,
            intent: { type: "error", message: "Ugyldig ticket-reference" },
            error: "Bad ref",
          };
        }
        const number = parseInt(numMatch[1], 10);
        const ticket = await db.ticket.findFirst({
          where: { tenantId, number },
          select: {
            number: true,
            title: true,
            status: true,
            priority: true,
            company: { select: { name: true } },
            assignedTo: { select: { name: true } },
            createdAt: true,
          },
        });
        if (!ticket) {
          return {
            ok: false,
            intent: { type: "error", message: `Ticket ${lookup.ref} ikke fundet` },
            error: "Ticket ikke fundet",
          };
        }
        return {
          ok: true,
          intent: {
            type: "lookup",
            lookup,
            preview:
              `T-${String(ticket.number).padStart(4, "0")}: ${ticket.title}\n` +
              `  Kunde: ${ticket.company.name}\n` +
              `  Status: ${ticket.status} · Prioritet: ${ticket.priority}\n` +
              `  Tildelt: ${ticket.assignedTo?.name ?? "Ingen"}\n` +
              `  Oprettet: ${ticket.createdAt.toLocaleDateString("da-DK")}`,
          },
          data: ticket,
        };
      }

      case "deal.byTitle": {
        const deal = await db.deal.findFirst({
          where: { tenantId, title: { contains: lookup.title, mode: "insensitive" } },
          select: {
            title: true,
            stage: true,
            value: true,
            probability: true,
            company: { select: { name: true } },
            expectedCloseDate: true,
          },
        });
        if (!deal) {
          return {
            ok: false,
            intent: { type: "error", message: `Deal "${lookup.title}" ikke fundet` },
            error: "Deal ikke fundet",
          };
        }
        return {
          ok: true,
          intent: {
            type: "lookup",
            lookup,
            preview:
              `${deal.title} (${deal.company.name})\n` +
              `  Stage: ${deal.stage} · ${deal.probability}% sandsynlighed\n` +
              `  Værdi: ${Number(deal.value ?? 0).toLocaleString("da-DK")} kr\n` +
              `  Forventet lukket: ${deal.expectedCloseDate?.toLocaleDateString("da-DK") ?? "—"}`,
          },
          data: deal,
        };
      }
    }
  } catch (e: any) {
    return {
      ok: false,
      intent: { type: "error", message: e?.message ?? "Lookup fejlede" },
      error: e?.message ?? "Lookup fejlede",
    };
  }
}
