/**
 * Funnel-metrics: konvertering & drop-off mellem stadier
 * ──────────────────────────────────────────────────────
 * En sales funnel viser hvor mange opportunities der overlever fra
 * stadie til stadie. Et "sundt" b2b-konsulent-funnel ser typisk saadan ud:
 *
 *   Leads        ────────────────────────  100%
 *   Qualified    ──────────────────         60%
 *   Proposal     ──────────                 30%
 *   Negotiation  ──────                     20%
 *   Won          ────                       12%
 *
 * Hver "afsmalning" er en drop-off. Hvor falder folk fra?
 *
 * Vi udregner conversion rate pa to maader:
 *   • Cohort-baseret: Af de deals der ENTRERED et stadie i periode P,
 *                     hvor mange naaede til naeste stadie?
 *   • Snapshot:       Af de deals der i dag er paa eller forbi stadie X,
 *                     hvor mange er ogsaa paa stadie Y+?
 *
 * Cohort-baseret er mere praecis men kraever stage-historie. Snapshot er
 * den vi falder tilbage til hvis ingen historie findes.
 */

import { db } from "@/lib/db";
import { DEAL_STAGES } from "@/lib/utils";

export interface FunnelStage {
  stage: string;
  label: string;
  order: number;
  count: number;
  /** Pct af forrige stadie der naaede hertil */
  conversionFromPrevious: number;
  /** Pct af top-of-funnel (foerste stadie) der naaede hertil */
  conversionFromTop: number;
  /** Total kr-vaerdi af deals i dette stadie (sum af deal.value) */
  totalValue: number;
  /** Vaegtet vaerdi: value × probability */
  weightedValue: number;
}

export interface FunnelAnalysis {
  periodLabel: string;
  stages: FunnelStage[];
  /** Lead → Won konverteringsrate */
  topToWinRate: number;
  /** Gennemsnitlig deal-vaerdi for won deals */
  averageWonValue: number;
  /** Total lukket omsaetning i perioden */
  totalWonValue: number;
  /** Antal deals i hele datasaettet */
  totalDealCount: number;
}

const ACTIVE_STAGES = ["new", "qualified", "proposal", "negotiation"];
const TERMINAL_STAGES = ["won", "lost"];

/**
 * Beregn snapshot-funnel: hvad ser pipelinen ud LIGE NU?
 * Inkluderer deals med createdAt i [from, to] hvis givet.
 */
export async function getSnapshotFunnel(
  tenantId: string,
  from?: Date,
  to?: Date,
): Promise<FunnelAnalysis> {
  const dateWhere = from || to
    ? { createdAt: { ...(from && { gte: from }), ...(to && { lte: to }) } }
    : {};

  const deals = await db.deal.findMany({
    where: { tenantId, ...dateWhere },
    select: { stage: true, value: true, probability: true },
  });

  // Tæl per stage
  const counts: Record<string, { count: number; value: number; weightedValue: number }> = {};
  for (const s of [...ACTIVE_STAGES, ...TERMINAL_STAGES]) {
    counts[s] = { count: 0, value: 0, weightedValue: 0 };
  }
  for (const d of deals) {
    const v = Number(d.value ?? 0);
    counts[d.stage] = counts[d.stage] ?? { count: 0, value: 0, weightedValue: 0 };
    counts[d.stage].count++;
    counts[d.stage].value += v;
    counts[d.stage].weightedValue += v * (d.probability / 100);
  }

  // Top af funnel: alle deals der nogensinde har levet (active + closed)
  const topCount = deals.length;
  const topValue = deals.reduce((s, d) => s + Number(d.value ?? 0), 0);

  // For funnel-visualization: aktive stadier kumulativt
  // (et deal i 'proposal' har OGSAA passeret 'qualified' og 'new')
  // Saa cumulativeCount(qualified) = qualified + proposal + negotiation + won + lost
  const cumulative: Record<string, number> = {};
  const cumValue: Record<string, number> = {};
  const cumWeighted: Record<string, number> = {};
  const stageOrder = [...ACTIVE_STAGES, "won"]; // lost springes over i funnel-visning
  for (let i = 0; i < stageOrder.length; i++) {
    const stagesAtOrBeyond = stageOrder.slice(i).concat(i === stageOrder.length - 1 ? [] : ["won"]);
    const unique = Array.from(new Set([...stageOrder.slice(i)]));
    cumulative[stageOrder[i]]  = unique.reduce((s, st) => s + (counts[st]?.count ?? 0), 0);
    cumValue[stageOrder[i]]    = unique.reduce((s, st) => s + (counts[st]?.value ?? 0), 0);
    cumWeighted[stageOrder[i]] = unique.reduce((s, st) => s + (counts[st]?.weightedValue ?? 0), 0);
  }

  const stages: FunnelStage[] = stageOrder.map((s, i) => {
    const stageMeta = (DEAL_STAGES as any)[s];
    const c = cumulative[s];
    const v = cumValue[s];
    const wv = cumWeighted[s];
    const prevC = i === 0 ? topCount : cumulative[stageOrder[i - 1]];
    return {
      stage: s,
      label: stageMeta?.label ?? s,
      order: stageMeta?.order ?? i,
      count: c,
      conversionFromPrevious: prevC > 0 ? (c / prevC) * 100 : 0,
      conversionFromTop: topCount > 0 ? (c / topCount) * 100 : 0,
      totalValue: v,
      weightedValue: wv,
    };
  });

  const wonStage = stages[stages.length - 1];
  const wonCount = counts.won?.count ?? 0;
  const wonValue = counts.won?.value ?? 0;

  return {
    periodLabel: formatPeriod(from, to),
    stages,
    topToWinRate: topCount > 0 ? (wonCount / topCount) * 100 : 0,
    averageWonValue: wonCount > 0 ? wonValue / wonCount : 0,
    totalWonValue: wonValue,
    totalDealCount: topCount,
  };
}

/**
 * Lead → Deal konverteringsrate (separat fra deal-funnel'en).
 * Maaler hvor mange leads der blev konverteret til pipeline deals.
 */
export async function getLeadConversionRate(
  tenantId: string,
  from?: Date,
  to?: Date,
): Promise<{ totalLeads: number; convertedLeads: number; conversionRate: number }> {
  const dateWhere = from || to
    ? { createdAt: { ...(from && { gte: from }), ...(to && { lte: to }) } }
    : {};

  const [total, converted] = await Promise.all([
    db.lead.count({ where: { tenantId, ...dateWhere } }),
    db.lead.count({ where: { tenantId, status: "converted", ...dateWhere } }),
  ]);

  return {
    totalLeads: total,
    convertedLeads: converted,
    conversionRate: total > 0 ? (converted / total) * 100 : 0,
  };
}

/**
 * Komplet end-to-end funnel: Lead → Deal → Won
 *
 * Trækker både Lead-stadier (new/contacted/qualified/converted/lost) og
 * Deal-stadier (new/qualified/proposal/negotiation/won) sammen til én
 * sammenhængende konverterings-tragt.
 *
 * Den her er stærkere end den rene deal-funnel, fordi den medtager
 * top-of-funnel data — hvor mange leads bliver til pipeline overhovedet.
 */
export interface EndToEndFunnelStage {
  key: string;
  label: string;
  count: number;
  /** % af top (= total leads) */
  pctOfTop: number;
  /** % af forrige stadie */
  pctOfPrevious: number;
  /** Hvilken model: "lead" eller "deal" */
  kind: "lead" | "deal";
}

export interface EndToEndFunnelResult {
  periodLabel: string;
  stages: EndToEndFunnelStage[];
  totalLeads: number;
  convertedToDeals: number;
  wonDeals: number;
  leadToWinRate: number;       // % af leads der bliver til vundne deals
  leadToDealRate: number;       // % af leads der konverteres til pipeline
  dealToWinRate: number;        // % af deals der vindes
  estimatedRevenueFromLeads: number; // baseret på avg won value
}

const LEAD_STAGE_ORDER = ["new", "contacted", "qualified", "converted"] as const;
const DEAL_STAGE_ORDER = ["new", "qualified", "proposal", "negotiation", "won"] as const;

export async function getEndToEndFunnel(
  tenantId: string,
  from?: Date,
  to?: Date,
): Promise<EndToEndFunnelResult> {
  const dateWhere = from || to
    ? { createdAt: { ...(from && { gte: from }), ...(to && { lte: to }) } }
    : {};

  const [leadStages, dealStages, wonValueAgg] = await Promise.all([
    db.lead.groupBy({
      by: ["status"],
      where: { tenantId, ...dateWhere },
      _count: true,
    }),
    db.deal.groupBy({
      by: ["stage"],
      where: { tenantId, ...dateWhere },
      _count: true,
      _sum: { value: true },
    }),
    db.deal.aggregate({
      where: { tenantId, stage: "won", ...dateWhere },
      _sum: { value: true },
      _count: true,
    }),
  ]);

  const leadCountByStatus = Object.fromEntries(
    leadStages.map((s) => [s.status, s._count]),
  );
  const dealCountByStage = Object.fromEntries(
    dealStages.map((s) => [s.stage, s._count]),
  );

  // Lead-trin: cumulativ — fx "qualified" inkluderer alle der nåede til kvalificeret+
  // Vi simplificerer: tæl ALLE med matching status + alle senere stages
  const leadConverted = leadCountByStatus["converted"] ?? 0;
  const totalLeads = leadStages.reduce((sum, s) => sum + s._count, 0);

  // Deal-stages: cumulativ fra "won" tilbage
  const wonCount = dealCountByStage["won"] ?? 0;
  const totalDeals = dealStages.reduce((sum, s) => sum + s._count, 0);

  // Byg fælles stage-liste
  const stages: EndToEndFunnelStage[] = [];

  // 1. Total leads (top of funnel)
  stages.push({
    key: "leads_all",
    label: "Alle leads",
    count: totalLeads,
    pctOfTop: 100,
    pctOfPrevious: 100,
    kind: "lead",
  });

  // 2. Lead-stadier med cumulativ optælling
  let cumulativeLead = totalLeads;
  for (const ls of LEAD_STAGE_ORDER.slice(1)) {
    // For hvert lead-status: tæl dem der er i den status eller højere
    const idx = LEAD_STAGE_ORDER.indexOf(ls);
    const reachedThisStage = LEAD_STAGE_ORDER.slice(idx)
      .reduce((sum, s) => sum + (leadCountByStatus[s] ?? 0), 0);
    const prev = stages[stages.length - 1];
    stages.push({
      key: `lead_${ls}`,
      label: LEAD_LABELS[ls] ?? ls,
      count: reachedThisStage,
      pctOfTop: totalLeads > 0 ? (reachedThisStage / totalLeads) * 100 : 0,
      pctOfPrevious: prev.count > 0 ? (reachedThisStage / prev.count) * 100 : 0,
      kind: "lead",
    });
    cumulativeLead = reachedThisStage;
  }

  // 3. Konverteret = total deals (alle deals startede med en lead)
  stages.push({
    key: "deals_all",
    label: "Pipeline-deals",
    count: totalDeals,
    pctOfTop: totalLeads > 0 ? (totalDeals / totalLeads) * 100 : 0,
    pctOfPrevious: leadConverted > 0 ? (totalDeals / leadConverted) * 100 : 100,
    kind: "deal",
  });

  // 4. Deal-stadier cumulativt
  for (const ds of DEAL_STAGE_ORDER.slice(1)) {
    const idx = DEAL_STAGE_ORDER.indexOf(ds);
    const reachedThisStage = DEAL_STAGE_ORDER.slice(idx)
      .reduce((sum, s) => sum + (dealCountByStage[s] ?? 0), 0);
    const prev = stages[stages.length - 1];
    stages.push({
      key: `deal_${ds}`,
      label: DEAL_LABELS[ds] ?? ds,
      count: reachedThisStage,
      pctOfTop: totalLeads > 0 ? (reachedThisStage / totalLeads) * 100 : 0,
      pctOfPrevious: prev.count > 0 ? (reachedThisStage / prev.count) * 100 : 0,
      kind: "deal",
    });
  }

  const wonValue = Number(wonValueAgg._sum.value ?? 0);
  const avgWonValue = wonCount > 0 ? wonValue / wonCount : 0;

  return {
    periodLabel: formatPeriod(from, to),
    stages,
    totalLeads,
    convertedToDeals: leadConverted,
    wonDeals: wonCount,
    leadToWinRate: totalLeads > 0 ? (wonCount / totalLeads) * 100 : 0,
    leadToDealRate: totalLeads > 0 ? (leadConverted / totalLeads) * 100 : 0,
    dealToWinRate: totalDeals > 0 ? (wonCount / totalDeals) * 100 : 0,
    estimatedRevenueFromLeads: totalLeads > 0 ? totalLeads * (wonCount / totalLeads) * avgWonValue : 0,
  };
}

const LEAD_LABELS: Record<string, string> = {
  new: "Nye",
  contacted: "Kontaktet",
  qualified: "Kvalificerede",
  converted: "Konverteret til deal",
};

const DEAL_LABELS: Record<string, string> = {
  new: "Ny",
  qualified: "Kvalificeret",
  proposal: "Tilbud sendt",
  negotiation: "Forhandling",
  won: "Vundet",
};

function formatPeriod(from?: Date, to?: Date): string {
  if (!from && !to) return "Alle tider";
  const fmt = (d: Date) => d.toLocaleDateString("da-DK", { day: "numeric", month: "short", year: "numeric" });
  if (from && to)   return `${fmt(from)} – ${fmt(to)}`;
  if (from)         return `Fra ${fmt(from)}`;
  return            `Indtil ${fmt(to!)}`;
}
