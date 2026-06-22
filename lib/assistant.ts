/**
 * lib/assistant.ts — AI-assistent core.
 *
 * To-lags arkitektur:
 *   1. Pattern-parser (altid tilgaengelig) — forstaar simple commands paa dansk
 *   2. Claude API (hvis ANTHROPIC_API_KEY findes) — natural language + complex queries
 *
 * Output er enten:
 *   - "text" type: bare svar med tekst
 *   - "action" type: udfoer en konkret operation (skift status, slet, etc.)
 *   - "lookup" type: hent + vis data
 */

export type AssistantIntent =
  | { type: "text"; message: string }
  | { type: "action"; action: AssistantAction; preview: string }
  | { type: "lookup"; lookup: AssistantLookup; preview: string }
  | { type: "error"; message: string }
  | { type: "help"; message: string };

export type AssistantAction =
  | { kind: "lead.setStatus"; leadName: string; newStatus: string }
  | { kind: "lead.nextStep"; leadName: string }
  | { kind: "deal.setStage"; dealTitle: string; newStage: string }
  | { kind: "ticket.setStatus"; ticketRef: string; newStatus: string }
  | { kind: "company.recalcHealth"; companyName: string }
  | { kind: "timelog.add"; minutes: number; date: string; bundleRef?: string; ticketRef?: string; description?: string }
  | { kind: "quote.send"; quoteRef: string; recipientHint?: string };

export type AssistantLookup =
  | { kind: "lead.byName"; name: string }
  | { kind: "deal.byTitle"; title: string }
  | { kind: "ticket.byRef"; ref: string }
  | { kind: "company.byName"; name: string }
  | { kind: "stats.leadFunnel" }
  | { kind: "stats.pipeline" }
  | { kind: "stats.openTickets" }
  | { kind: "lookup.bestLeads"; count?: number }
  | { kind: "lookup.dashboardSummary" }
  | { kind: "lookup.atRiskCustomers" }
  | { kind: "lookup.myWeek" };

/**
 * Lead-status mapping. Brugeren kan skrive "kontaktet", "qualified", "konverteret" etc.
 * Vi normaliserer til DB-værdier.
 */
const LEAD_STATUS_MAP: Record<string, string> = {
  ny: "new", "ny lead": "new", new: "new",
  kontaktet: "contacted", contacted: "contacted",
  kvalificeret: "qualified", qualified: "qualified",
  konverteret: "converted", converted: "converted",
  tabt: "lost", lost: "lost",
};

const DEAL_STAGE_MAP: Record<string, string> = {
  ny: "new", new: "new",
  kvalificeret: "qualified", qualified: "qualified",
  "tilbud sendt": "proposal", proposal: "proposal",
  forhandling: "negotiation", negotiation: "negotiation",
  vundet: "won", won: "won",
  tabt: "lost", lost: "lost",
};

const TICKET_STATUS_MAP: Record<string, string> = {
  åben: "open", aaben: "open", open: "open",
  "afventer kunde": "pending_customer",
  "afventer leverandør": "pending_supplier", "afventer leverandoer": "pending_supplier",
  løst: "resolved", loest: "resolved", resolved: "resolved",
  lukket: "closed", closed: "closed",
};

/**
 * Hovedparser: tager ren tekst, returnerer intent.
 * Forstaar mønstre som:
 *   - "skift lead X til kvalificeret"
 *   - "flyt deal Y til vundet"
 *   - "hvad er status på ticket T-0011"
 *   - "vis leads"
 *   - "hjælp"
 */
export function parseAssistantInput(input: string): AssistantIntent {
  const text = input.trim();
  if (!text) return { type: "error", message: "Skriv en kommando eller spørgsmål" };
  const lower = text.toLowerCase();

  // HJÆLP
  if (
    lower === "hjælp" || lower === "hjaelp" || lower === "help" ||
    lower === "?" || lower === "hvad kan du" || lower === "kommandoer"
  ) {
    return { type: "help", message: HELP_TEXT };
  }

  // STATS / OPSLAG
  if (/(vis|list).*?(leads?|alle leads)/i.test(text)) {
    return { type: "lookup", lookup: { kind: "stats.leadFunnel" }, preview: "Henter lead-statistik..." };
  }
  if (/(vis|list|hvordan ser).*?(pipeline|deals?)/i.test(text)) {
    return { type: "lookup", lookup: { kind: "stats.pipeline" }, preview: "Henter pipeline-overblik..." };
  }
  if (/(vis|hvor mange|antal).*?(åbne|aabne|aktive).*?(tickets?|sager)/i.test(text)) {
    return { type: "lookup", lookup: { kind: "stats.openTickets" }, preview: "Henter åbne tickets..." };
  }

  // SEMANTISK: "hvad er status på mine 3 bedste leads"
  const bestLeadsMatch = text.match(
    /(?:status\s+(?:på|paa)\s+)?(?:mine\s+|de\s+)?(\d+)?\s*(?:bedste|hotte|vigtigste|top|prioriterede)\s+leads?/i,
  );
  if (bestLeadsMatch) {
    const count = bestLeadsMatch[1] ? parseInt(bestLeadsMatch[1], 10) : 3;
    return {
      type: "lookup",
      lookup: { kind: "lookup.bestLeads", count: Math.min(10, Math.max(1, count)) },
      preview: `Finder dine top ${count} leads...`,
    };
  }

  // OPSUMMERING af site / dashboard
  if (/(opsumm|status|overblik|hvordan ser det ud|hvordan staar det til)/i.test(text) && !/(lead|deal|ticket|kunde)/i.test(text)) {
    return {
      type: "lookup",
      lookup: { kind: "lookup.dashboardSummary" },
      preview: "Henter overordnet status...",
    };
  }

  // RISIKO-kunder
  if (/(risiko|i\s+fare|skal\s+vi\s+passe\s+på|churn)/i.test(text)) {
    return {
      type: "lookup",
      lookup: { kind: "lookup.atRiskCustomers" },
      preview: "Henter kunder i risiko...",
    };
  }

  // "Min uge" / "Hvad skal jeg lave"
  if (/(min uge|denne uge|hvad skal jeg|hvad har jeg)/i.test(text)) {
    return {
      type: "lookup",
      lookup: { kind: "lookup.myWeek" },
      preview: "Henter dine opgaver denne uge...",
    };
  }

  // ACTION: notér tid på klippekort
  // "Notér 2 timers arbejde fra idag på klippekort KB-0001"
  // "Log 90 min på KB-0001"
  // "Skriv 1.5t på klippekort KB-0001 idag"
  const timeMatch = text.match(
    /(?:not[eé]r|log|skriv|registr[eé]r)\s+(\d+(?:[.,]\d+)?)\s*(time?r?|t|min(?:utter)?)?\s+(?:arbejde\s+)?(?:fra\s+)?(idag|i\s*dag|igår|i\s*gaar|i\s*går)?\s*(?:på|paa)?\s*(?:klippekort\s+)?(kb[-\s]?\d+)/i,
  );
  if (timeMatch) {
    const numRaw = timeMatch[1].replace(",", ".");
    const num = parseFloat(numRaw);
    const unit = (timeMatch[2] ?? "t").toLowerCase();
    const isMinutes = /^min/.test(unit);
    const minutes = isMinutes ? Math.round(num) : Math.round(num * 60);
    const dateRaw = (timeMatch[3] ?? "idag").toLowerCase().replace(/\s+/g, "");
    const isYesterday = /^i?g[åa]ar?$/.test(dateRaw);
    const date = isYesterday
      ? new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString().slice(0, 10)
      : new Date().toISOString().slice(0, 10);
    const bundleRef = timeMatch[4].toUpperCase().replace(/\s+/g, "-");
    return {
      type: "action",
      action: { kind: "timelog.add", minutes, date, bundleRef },
      preview: `Vil notere ${minutes} min (${(minutes / 60).toFixed(1)}t) ${isYesterday ? "i går" : "i dag"} på ${bundleRef}`,
    };
  }

  // ACTION: send tilbud
  // "Send tilbud Q-0001 til Aalborg Tagdækning"
  // "Afsend tilbud Q-0001"
  const sendQuoteMatch = text.match(
    /(?:afsend|send)\s+(?:tilbud\s+)?(q-\d+)(?:\s+til\s+(.+))?$/i,
  );
  if (sendQuoteMatch) {
    const quoteRef = sendQuoteMatch[1].toUpperCase();
    const recipientHint = sendQuoteMatch[2]?.trim();
    return {
      type: "action",
      action: { kind: "quote.send", quoteRef, recipientHint },
      preview: recipientHint
        ? `Vil sende tilbud ${quoteRef} til "${recipientHint}"`
        : `Vil sende tilbud ${quoteRef}`,
    };
  }

  // ACTION: lead-next-step (uden specifik status)
  // "Skift lead Pia til næste step"
  // "Flyt Pia til næste"
  const nextStepMatch = text.match(
    /(?:skift|flyt|ryk|videre\s+med)\s+(?:lead\s+)?(.+?)\s+(?:til\s+)?(?:næste\s+step|naeste\s+step|næste|naeste|videre)$/i,
  );
  if (nextStepMatch) {
    const name = nextStepMatch[1].trim();
    return {
      type: "action",
      action: { kind: "lead.nextStep", leadName: name },
      preview: `Vil rykke lead "${name}" til næste step`,
    };
  }

  // ACTION: skift lead-status
  // Mønster: "skift/flyt/sæt lead [navn] til [status]"
  const leadStatusMatch = text.match(
    /^(?:skift|flyt|sæt|saet|set)\s+lead\s+(.+?)\s+(?:til|to)\s+(.+)$/i,
  );
  if (leadStatusMatch) {
    const name = leadStatusMatch[1].trim();
    const statusRaw = leadStatusMatch[2].trim().toLowerCase();
    const newStatus = LEAD_STATUS_MAP[statusRaw];
    if (!newStatus) {
      return {
        type: "error",
        message: `Ukendt lead-status "${statusRaw}". Mulige: ${Object.keys(LEAD_STATUS_MAP).filter((k) => /^[a-zæøå ]+$/.test(k)).join(", ")}`,
      };
    }
    return {
      type: "action",
      action: { kind: "lead.setStatus", leadName: name, newStatus },
      preview: `Vil skifte lead "${name}" til status "${statusRaw}"`,
    };
  }

  // ACTION: skift deal-stage
  const dealStageMatch = text.match(
    /^(?:skift|flyt|sæt|saet)\s+deal\s+(.+?)\s+til\s+(.+)$/i,
  );
  if (dealStageMatch) {
    const title = dealStageMatch[1].trim();
    const stageRaw = dealStageMatch[2].trim().toLowerCase();
    const newStage = DEAL_STAGE_MAP[stageRaw];
    if (!newStage) {
      return {
        type: "error",
        message: `Ukendt deal-stage "${stageRaw}". Mulige: ny, kvalificeret, tilbud sendt, forhandling, vundet, tabt`,
      };
    }
    return {
      type: "action",
      action: { kind: "deal.setStage", dealTitle: title, newStage },
      preview: `Vil skifte deal "${title}" til stage "${stageRaw}"`,
    };
  }

  // ACTION: skift ticket-status
  const ticketStatusMatch = text.match(
    /^(?:skift|sæt|luk|løs|loes)\s+(?:ticket\s+)?(t-\d+)\s+til\s+(.+)$/i,
  );
  if (ticketStatusMatch) {
    const ref = ticketStatusMatch[1].toUpperCase();
    const statusRaw = ticketStatusMatch[2].trim().toLowerCase();
    const newStatus = TICKET_STATUS_MAP[statusRaw];
    if (!newStatus) {
      return {
        type: "error",
        message: `Ukendt ticket-status. Mulige: åben, afventer kunde, afventer leverandør, løst, lukket`,
      };
    }
    return {
      type: "action",
      action: { kind: "ticket.setStatus", ticketRef: ref, newStatus },
      preview: `Vil skifte ticket ${ref} til "${statusRaw}"`,
    };
  }

  // LOOKUP: ticket T-XXXX
  const ticketRefMatch = text.match(/\b(t-\d+)\b/i);
  if (ticketRefMatch && /status|vis|find|hvad/i.test(lower)) {
    return {
      type: "lookup",
      lookup: { kind: "ticket.byRef", ref: ticketRefMatch[1].toUpperCase() },
      preview: `Henter ticket ${ticketRefMatch[1].toUpperCase()}...`,
    };
  }

  // LOOKUP: lead [navn] / vis lead
  const findLeadMatch = text.match(/(?:vis|find|hvad ved du om)\s+lead\s+(.+)$/i);
  if (findLeadMatch) {
    return {
      type: "lookup",
      lookup: { kind: "lead.byName", name: findLeadMatch[1].trim() },
      preview: `Henter lead "${findLeadMatch[1].trim()}"...`,
    };
  }

  // LOOKUP: kunde [navn]
  const findCompanyMatch = text.match(/(?:vis|find|hvad ved du om)\s+(?:kunde|firma)\s+(.+)$/i);
  if (findCompanyMatch) {
    return {
      type: "lookup",
      lookup: { kind: "company.byName", name: findCompanyMatch[1].trim() },
      preview: `Henter kunde "${findCompanyMatch[1].trim()}"...`,
    };
  }

  // ACTION: recalc health
  const recalcMatch = text.match(/(?:genberegn|opdater)\s+(?:health|score|helbred)\s+(?:for\s+)?(.+)$/i);
  if (recalcMatch) {
    return {
      type: "action",
      action: { kind: "company.recalcHealth", companyName: recalcMatch[1].trim() },
      preview: `Vil genberegne health-score for "${recalcMatch[1].trim()}"`,
    };
  }

  // Fallback
  return {
    type: "text",
    message:
      `Jeg forstår ikke "${text}" helt. Prøv fx:\n` +
      `  • "skift lead Pia til kvalificeret"\n` +
      `  • "vis pipeline"\n` +
      `  • "hvad er status på ticket T-0011"\n` +
      `  • Skriv "hjælp" for fuld liste`,
  };
}

const HELP_TEXT = `Jeg er din CRM-X assistent. Jeg kan:

📊 OPSLAG (læs data):
  • "vis leads" — lead-funnel
  • "vis pipeline" — alle aktive deals
  • "vis åbne tickets" — support-overblik
  • "vis lead [navn]" / "vis kunde [navn]"
  • "hvad er status på T-0011" — ticket-detaljer

🧠 SEMANTIK (intelligente opsummeringer):
  • "Hvad er status på mine 3 bedste leads?" — top-leads + næste-skridt
  • "Opsummer dagens status" — dashboard-overblik
  • "Kunder i risiko" — health-score under 60
  • "Hvad skal jeg lave denne uge?" — dine opgaver

⚡ ACTIONS (skift data):
  • "Notér 2t arbejde på klippekort KB-0001 idag"
  • "Skift lead Pia til kvalificeret"
  • "Flyt lead Pia til næste step"
  • "Send tilbud Q-0001 til Aalborg Tagdækning"
  • "Skift deal [titel] til vundet"
  • "Luk T-0011 til løst"
  • "Genberegn health for [kunde]"

Skriv på dansk eller engelsk. Actions kræver din bekræftelse før udførelse.`;
