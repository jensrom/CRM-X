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
 * top-of-funnel data — hvor mange le