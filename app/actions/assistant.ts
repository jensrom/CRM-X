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
  isDestructiveAction,
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
    // Destruktive actions returneres som preview uden at eksekvere — UI viser
    // [Godkend][Annuller] og confirmThreadAction kalder executeConfirmedAction.
    if (isDestructiveAction(intent.action)) {
      return {
        ok: true,
        intent: {
          type: "action",
          action: intent.action,
          preview: buildConfirmationPreview(intent.action),
        },
        // appliedChange BEVIDST udeladt — signalerer at action ikke er kort
      };
    }
    return executeAction(intent.action);
  }

  if (intent.type === "lookup") {
    return executeLookup(intent.lookup);
  }

  return { ok: false, intent: { type: "error", message: "Ukendt intent" }, error: "Ukendt intent" };
}

// ─────────────────────────────────────────────────────────────────────────────
// CONFIRMATION-PREVIEW — vises i chat med [Godkend][Annullér]
// ─────────────────────────────────────────────────────────────────────────────

function buildConfirmationPreview(action: AssistantAction): string {
  switch (action.kind) {
    case "timelog.add": {
      const t = (action.minutes / 60).toFixed(1).replace(/\.0$/, "");
      const where = action.bundleRef ? `klippekort ${action.bundleRef}` : action.ticketRef ? `ticket ${action.ticketRef}` : "ukendt placering";
      return `⚠️ Vil registrere ${action.minutes} min (${t}t) på ${where} dato ${action.date}. Bekraeft for at gemme.`;
    }
    case "quote.send":
      return `⚠️ Vil markere tilbud ${action.quoteRef} som sendt. Bekraeft — handlingen kan ikke trivielt fortrydes.`;
    case "deal.setStage":
      if (action.newStage === "won") return `⚠️ Vil markere deal "${action.dealTitle}" som VUNDET — det trigger auto-faktura. Bekraeft.`;
      if (action.newStage === "lost") return `⚠️ Vil markere deal "${action.dealTitle}" som TABT. Bekraeft.`;
      return `Vil skifte deal "${action.dealTitle}" til ${action.newStage}.`;
    case "ticket.setStatus":
      return `⚠️ Vil saette ${action.ticketRef} til ${action.newStatus} — SLA stopper og ticket lukkes for nye kommentarer. Bekraeft.`;
    default:
      return `Vil udfoere handlingen. Bekraeft.`;
  }
}

/**
 * Public entry for confirmed destruktive actions — kaldes fra
 * confirmThreadAction efter brugerens [Godkend].
 */
export async function executeConfirmedAction(action: AssistantAction): Promise<AssistantReply> {
  return executeAction(action);
}

// ─────────────────────────────────────────────────────────────────────────────
// ACTIONS — udfører ændringer i DB
// ─────────────────────────────────────────────────────────────────────────────

const LEAD_NEXT_STEP: Record<string, string> = {
  new: "contacted",
  contacted: "qualified",
  qualified: "converted",
};

async function executeAction(action: AssistantAction): Promise<AssistantReply> {
  const session = await getSession();
  const tenantId = session.user.tenantId!;
  const userId = session.user.id!;

  try {
    switch (action.kind) {
      case "lead.nextStep": {
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
        const nextStatus = LEAD_NEXT_STEP[lead.status];
        if (!nextStatus) {
          return {
            ok: false,
            intent: {
              type: "error",
              message: `Lead "${lead.firstName} ${lead.lastName}" er allerede ${lead.status === "converted" ? "konverteret" : lead.status === "lost" ? "tabt" : lead.status} — ingen næste step.`,
            },
            error: "Ingen næste step",
          };
        }
        await db.lead.update({
          where: { id: lead.id },
          data: {
            status: nextStatus,
          },
        });
        revalidatePath("/leads");
        return {
          ok: true,
          intent: {
            type: "action",
            action,
            preview: `Lead "${lead.firstName} ${lead.lastName}" rykket fra ${lead.status} → ${nextStatus}`,
          },
          appliedChange: `${lead.firstName} ${lead.lastName}: ${lead.status} → ${nextStatus}`,
        };
      }

      case "timelog.add": {
        // Find klippekort via reference (KB-XXXX)
        let bundleId: string | null = null;
        let companyId: string | null = null;
        let bundleName = "";
        if (action.bundleRef) {
          // KB-0001 → number = 1
          const m = action.bundleRef.match(/^KB-?(\d+)$/i);
          const num = m ? parseInt(m[1], 10) : NaN;
          const bundle = !isNaN(num)
            ? await db.hourBundle.findFirst({
                where: { tenantId, number: num, isActive: true },
                select: { id: true, name: true, companyId: true, totalHours: true, usedMinutes: true },
              })
            : null;
          if (!bundle) {
            return {
              ok: false,
              intent: { type: "error", message: `Klippekort ${action.bundleRef} findes ikke eller er inaktivt` },
              error: "Bundle ikke fundet",
            };
          }
          bundleId = bundle.id;
          companyId = bundle.companyId;
          bundleName = bundle.name ?? `KB-${(bundle as any).number ?? ""}`;
          // Tjek at der er nok timer tilbage
          const remainingMin = Number(bundle.totalHours) * 60 - Number(bundle.usedMinutes);
          if (action.minutes > remainingMin) {
            return {
              ok: false,
              intent: {
                type: "error",
                message: `Ikke nok timer på ${action.bundleRef}: ${Math.round(remainingMin)} min tilbage, du forsøgte ${action.minutes} min`,
              },
              error: "For lidt saldo",
            };
          }
        }

        await db.timeLog.create({
          data: {
            tenantId,
            userId,
            bundleId,
            date: new Date(action.date),
            durationMin: action.minutes,
            description: action.description ?? `Logget via AI-assistent`,
            isBillable: true,
            deductedFromBundle: !!bundleId,
          } as any,
        });

        // Opdater bundle's usedMinutes hvis vi trækker fra et
        if (bundleId) {
          await db.hourBundle.update({
            where: { id: bundleId },
            data: { usedMinutes: { increment: action.minutes } },
          });
        }

        revalidatePath("/time");
        revalidatePath("/klippekort");
        return {
          ok: true,
          intent: {
            type: "action",
            action,
            preview:
              `${action.minutes} min (${(action.minutes / 60).toFixed(1)}t) er logget på ${action.bundleRef ?? "uden klippekort"}` +
              (bundleName ? ` (${bundleName})` : ""),
          },
          appliedChange: `+${action.minutes} min på ${action.bundleRef}`,
        };
      }

      case "quote.send": {
        const m = action.quoteRef.match(/^Q-?(\d+)$/i);
        const num = m ? parseInt(m[1], 10) : NaN;
        if (isNaN(num)) {
          return {
            ok: false,
            intent: { type: "error", message: "Ugyldig tilbuds-reference" },
            error: "Bad ref",
          };
        }
        const quote = await db.quote.findFirst({
          where: { tenantId, number: num },
          select: { id: true, status: true, company: { select: { name: true, email: true } } },
        });
        if (!quote) {
          return {
            ok: false,
            intent: { type: "error", message: `Tilbud ${action.quoteRef} findes ikke` },
            error: "Quote ikke fundet",
          };
        }
        if (quote.status === "accepted") {
          return {
            ok: false,
            intent: {
              type: "error",
              message: `Tilbud ${action.quoteRef} er allerede accepteret — kan ikke gen-sende.`,
            },
            error: "Allerede accepteret",
          };
        }
        // Vi opdaterer status til "sent" og logger via audit-trail.
        // Selve email-afsendelsen kan udløses gennem den eksisterende mail-flow
        // ved næste UI-besøg, eller via tenant's foretrukne kanal.
        await db.quote.update({
          where: { id: quote.id },
          data: { status: "sent", sentAt: new Date() } as any,
        }).catch(() => {});
        revalidatePath("/quotes");
        return {
          ok: true,
          intent: {
            type: "action",
            action,
            preview:
              `Tilbud ${action.quoteRef} er markeret som sendt til ${quote.company.name}` +
              (quote.company.email ? ` (${quote.company.email})` : "") +
              `. Du kan stadig fysisk-afsende mail fra tilbuds-siden hvis du vil have HTML-template-versionen.`,
          },
          appliedChange: `${action.quoteRef} → sent`,
        };
      }

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
          data: { status: action.newStatus },
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
    // Log fuld fejl server-side, men skjul Prisma-detaljer for brugeren
    console.error("[assistant.executeAction] failed:", e);
    const safeMsg = "Kunne ikke gennemføre handlingen. Prøv igen eller kontakt support hvis problemet fortsætter.";
    return {
      ok: false,
      intent: { type: "error", message: safeMsg },
      error: safeMsg,
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
      case "lookup.bestLeads": {
        const count = lookup.count ?? 3;
        // Score: status (qualified > contacted > new), kilde-kvalitet, alder
        const allOpen = await db.lead.findMany({
          where: { tenantId, status: { in: ["new", "contacted", "qualified"] } },
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
            company: true,
            status: true,
            source: true,
            createdAt: true,
            notes: true,
          },
          orderBy: { createdAt: "desc" },
        });
        const STATUS_WEIGHT: Record<string, number> = {
          qualified: 100,
          contacted: 60,
          new: 30,
        };
        const SOURCE_BOOST: Record<string, number> = {
          "Anbefaling": 20,
          "Cold call": 10,
          "Event": 15,
          "Web": 5,
        };
        const scored = allOpen
          .map((l) => {
            const ageDays = Math.floor((Date.now() - l.createdAt.getTime()) / (24 * 60 * 60 * 1000));
            // Friske leads vurderes højere (max 30 dage)
            const freshness = Math.max(0, 30 - ageDays);
            const score =
              (STATUS_WEIGHT[l.status] ?? 0) +
              (SOURCE_BOOST[l.source ?? ""] ?? 0) +
              freshness;
            // Næste-skridt-anbefaling
            const nextStep =
              l.status === "new"
                ? "Kontakt dem indenfor 24 timer (kald eller mail)"
                : l.status === "contacted"
                ? "Følg op + book kvalificeringsmøde"
                : "Send tilbud — de er klar til konvertering";
            return { lead: l, score, ageDays, nextStep };
          })
          .sort((a, b) => b.score - a.score)
          .slice(0, count);

        if (scored.length === 0) {
          return {
            ok: true,
            intent: {
              type: "lookup",
              lookup,
              preview: "Ingen aktive leads at vurdere. Tilføj nye leads under /leads.",
            },
            data: { scored: [] },
          };
        }

        const lines = scored
          .map((s, i) => {
            const name = `${s.lead.firstName} ${s.lead.lastName}`.trim();
            const comp = s.lead.company ? ` (${s.lead.company})` : "";
            return (
              `${i + 1}. ${name}${comp} — status: ${s.lead.status}\n` +
              `   📅 ${s.ageDays} dage siden oprettelse · kilde: ${s.lead.source ?? "—"}\n` +
              `   👉 Næste: ${s.nextStep}`
            );
          })
          .join("\n\n");

        return {
          ok: true,
          intent: {
            type: "lookup",
            lookup,
            preview: `Dine top ${scored.length} leads — prioriteret efter status, kilde og alder:\n\n${lines}`,
          },
          data: scored,
        };
      }

      case "lookup.dashboardSummary": {
        const [
          openTickets,
          criticalTickets,
          activeDeals,
          pipelineValue,
          newLeads,
          overdueInvoices,
          lowBundles,
        ] = await Promise.all([
          db.ticket.count({
            where: { tenantId, status: { in: ["open", "pending_customer", "pending_supplier"] } },
          }),
          db.ticket.count({
            where: { tenantId, priority: "critical", status: { in: ["open", "pending_customer", "pending_supplier"] } },
          }),
          db.deal.count({
            where: { tenantId, stage: { notIn: ["won", "lost"] } },
          }),
          db.deal.aggregate({
            where: { tenantId, stage: { notIn: ["won", "lost"] } },
            _sum: { value: true },
          }),
          db.lead.count({
            where: { tenantId, status: "new" },
          }),
          db.invoice.count({
            where: { tenantId, status: "overdue" } as any,
          }).catch(() => 0),
          db.hourBundle.findMany({
            where: { tenantId, isActive: true },
            select: { name: true, totalHours: true, usedMinutes: true, company: { select: { name: true } } },
          }),
        ]);
        const lowBundlesAtRisk = lowBundles.filter((b) => {
          const total = Number(b.totalHours);
          const used = Number(b.usedMinutes) / 60;
          return total > 0 && used / total >= 0.8;
        }).length;
        const pipeline = Number(pipelineValue._sum.value ?? 0);

        const lines = [
          `🎫 Tickets: ${openTickets} åbne` + (criticalTickets > 0 ? ` (${criticalTickets} kritisk!)` : ""),
          `💼 Pipeline: ${activeDeals} deals · ${pipeline.toLocaleString("da-DK")} kr`,
          `🎯 Nye leads: ${newLeads}`,
          `💰 Forfaldne fakturaer: ${overdueInvoices}`,
          `✂️ Klippekort under 20% saldo: ${lowBundlesAtRisk}`,
        ];

        // Prioriterede actions
        const actions: string[] = [];
        if (criticalTickets > 0) actions.push(`Tag fat i de ${criticalTickets} kritiske tickets nu`);
        if (overdueInvoices > 0) actions.push(`Følg op på ${overdueInvoices} forfaldne fakturaer`);
        if (lowBundlesAtRisk > 0) actions.push(`${lowBundlesAtRisk} klippekort er ved at løbe ud — kontakt kunderne om fornyelse`);
        if (newLeads > 0) actions.push(`Behandl ${newLeads} nye leads — gerne indenfor 24 timer`);

        return {
          ok: true,
          intent: {
            type: "lookup",
            lookup,
            preview:
              `📊 Dagens overblik:\n\n${lines.join("\n")}\n\n` +
              (actions.length > 0
                ? `🎯 Prioriteret to-do:\n${actions.map((a) => `  • ${a}`).join("\n")}`
                : "✨ Ingen kritiske ting — fortsæt det gode arbejde!"),
          },
          data: { openTickets, criticalTickets, activeDeals, pipeline, newLeads, overdueInvoices, lowBundlesAtRisk },
        };
      }

      case "lookup.atRiskCustomers": {
        const companies = await db.company.findMany({
          where: {
            tenantId,
            isActive: true,
            healthScore: { not: null, lte: 59 },
          } as any,
          orderBy: { healthScore: "asc" } as any,
          take: 5,
          select: { name: true, healthScore: true, healthSignals: true } as any,
        });
        if (companies.length === 0) {
          return {
            ok: true,
            intent: {
              type: "lookup",
              lookup,
              preview: "Ingen kunder i risiko-zone (alle har health-score over 60). Du kan genberegne scores fra /kunder.",
            },
            data: { companies: [] },
          };
        }
        const lines = companies
          .map((c: any) => {
            const reasons = (c.healthSignals?.reasons ?? []) as string[];
            return `${c.name} (${c.healthScore}/100)${reasons[0] ? `\n  ⚠️ ${reasons[0]}` : ""}`;
          })
          .join("\n\n");
        return {
          ok: true,
          intent: {
            type: "lookup",
            lookup,
            preview: `Kunder med lav health-score:\n\n${lines}`,
          },
          data: companies,
        };
      }

      case "lookup.myWeek": {
        const now = new Date();
        const weekFromNow = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
        const userId = session.user.id!;

        const [myTickets, myDeals, myProjects] = await Promise.all([
          db.ticket.findMany({
            where: {
              tenantId,
              assignedToId: userId,
              status: { in: ["open", "pending_customer", "pending_supplier"] },
            },
            select: { number: true, title: true, priority: true, company: { select: { name: true } } },
            orderBy: [{ priority: "desc" }],
            take: 10,
          }),
          db.deal.findMany({
            where: {
              tenantId,
              assignedToId: userId,
              stage: { notIn: ["won", "lost"] },
              expectedCloseDate: { lte: weekFromNow },
            },
            select: { title: true, value: true, expectedCloseDate: true, stage: true },
            orderBy: { expectedCloseDate: "asc" },
            take: 10,
          }),
          db.project.findMany({
            where: {
              tenantId,
              assignedToId: userId,
              status: { in: ["active", "planning"] },
              endDate: { lte: weekFromNow, gte: now },
            },
            select: { number: true, title: true, endDate: true, company: { select: { name: true } } },
            take: 10,
          }),
        ]);

        const sections: string[] = [];
        if (myTickets.length > 0) {
          sections.push(
            `🎫 Dine åbne tickets:\n` +
              myTickets.map((t) => `  • T-${String(t.number).padStart(4, "0")} [${t.priority}] ${t.title} (${t.company.name})`).join("\n"),
          );
        }
        if (myDeals.length > 0) {
          sections.push(
            `💼 Dine deals der lukkes denne uge:\n` +
              myDeals
                .map((d) => `  • ${d.title} — ${d.stage} · ${Number(d.value ?? 0).toLocaleString("da-DK")} kr · ${d.expectedCloseDate?.toLocaleDateString("da-DK") ?? "—"}`)
                .join("\n"),
          );
        }
        if (myProjects.length > 0) {
          sections.push(
            `📁 Dine projekter med deadline:\n` +
              myProjects.map((p) => `  • P-${String(p.number).padStart(4, "0")} ${p.title} (${p.company.name}) — ${p.endDate?.toLocaleDateString("da-DK")}`).join("\n"),
          );
        }

        return {
          ok: true,
          intent: {
            type: "lookup",
            lookup,
            preview:
              sections.length > 0
                ? `Din uge:\n\n${sections.join("\n\n")}`
                : "Ingen åbne opgaver tildelt dig denne uge — nyd roen ☕",
          },
          data: { myTickets, myDeals, myProjects },
        };
      }

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
              `  Health: ${_c.healthScore != null ? `${_c.healthScore}/100` : "Ikke beregnet endnu"}\n` +
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
    console.error("[assistant.executeLookup] failed:", e);
    const safeMsg = "Kunne ikke hente data. Prøv igen eller kontakt support hvis problemet fortsætter.";
    return {
      ok: false,
      intent: { type: "error", message: safeMsg },
      error: safeMsg,
    };
  }
<<<<<<< Updated upstream
}
=======
}

>>>>>>> Stashed changes
