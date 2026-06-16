/**
 * Velocity-metrics: hvor lang tid bruger deals i hvert stadie?
 * ────────────────────────────────────────────────────────────
 * Det her er guld. Hvis "negotiation" tager 90 dage i snit, ved du
 * hvor flaskehalsen er. Hvis "qualified → proposal" tager 2 dage,
 * er det maaske for hurtigt (uden ordentlig opdagelse).
 *
 * Vi bruger DealStageHistory som primær kilde. For hvert stadie:
 *   • Henter alle (enteredAt, exitedAt)-par hvor dealet ER passeret videre
 *   • Beregner duration i dage
 *   • Returnerer mean, median, p25, p75
 *
 * Vi inkluderer KUN deals der HAR forladt et stadie (exitedAt != null).
 * "Stuck"-deals (lang tid i samme stadie) registreres separat saa de
 * kan vises som "potentielt stalled" warning.
 */

import { db } from "@/lib/db";
import { DEAL_STAGES } from "@/lib/utils";
import { mean, stdDev, calculateConfidence, type ConfidenceLevel } from "./confidence";

export interface StageVelocity {
  stage: string;
  label: string;
  /** Antal observationer (afsluttede stadie-besoeg) */
  n: number;
  /** Gennemsnitlig dage i stadiet */
  meanDays: number;
  /** Median dage (mindre paavirket af outliers) */
  medianDays: number;
  /** 25% percentil */
  p25Days: number;
  /** 75% percentil */
  p75Days: number;
  /** Standardafvigelse i dage */
  stdDevDays: number;
  /** Confidence-vurdering paa middelvaerdi */
  confidence: ConfidenceLevel;
}

export interface VelocityAnalysis {
  /** Per-stadie metrics */
  stages: StageVelocity[];
  /** Total sales cycle: createdAt → won (kun won deals) */
  averageSalesCycleDays: number;
  medianSalesCycleDays: number;
  salesCycleN: number;
  /** Aktuelle deals der har vaeret laenge i samme stadie (flaskehalse) */
  stalledDeals: StalledDeal[];
}

export interface StalledDeal {
  dealId: string;
  title: string;
  stage: string;
  stageLabel: string;
  daysInStage: number;
  /** Hvor mange standardafvigelser over gennemsnit for stadiet */
  zScore: number;
  value: number;
}

const ACTIVE_STAGES = ["new", "qualified", "proposal", "negotiation"];

function percentile(sorted: number[], p: number): number {
  if (sorted.length === 0) return 0;
  const idx = (sorted.length - 1) * p;
  const lo = Math.floor(idx);
  const hi = Math.ceil(idx);
  if (lo === hi) return sorted[lo];
  return sorted[lo] + (sorted[hi] - sorted[lo]) * (idx - lo);
}

function daysBetween(a: Date, b: Date): number {
  return (b.getTime() - a.getTime()) / (1000 * 60 * 60 * 24);
}

export async function getVelocityAnalysis(tenantId: string): Promise<VelocityAnalysis> {
  // Hent al stage-historie + tilhoerende deal-info
  const history = await db.dealStageHistory.findMany({
    where: { tenantId },
    include: { deal: { select: { id: true, title: true, value: true, stage: true } } },
    orderBy: { enteredAt: "asc" },
  });

  // Group by stage
  const byStage: Record<string, number[]> = {};
  for (const h of history) {
    if (!h.exitedAt) continue; // skip ongoing
    const days = daysBetween(h.enteredAt, h.exitedAt);
    if (days < 0) continue;
    byStage[h.stage] = byStage[h.stage] ?? [];
    byStage[h.stage].push(days);
  }

  const stageMetrics: StageVelocity[] = ACTIVE_STAGES.map((s) => {
    const obs = (byStage[s] ?? []).sort((a, b) => a - b);
    return {
      stage: s,
      label: (DEAL_STAGES as any)[s]?.label ?? s,
      n: obs.length,
      meanDays: mean(obs),
      medianDays: percentile(obs, 0.5),
      p25Days: percentile(obs, 0.25),
      p75Days: percentile(obs, 0.75),
      stdDevDays: stdDev(obs),
      confidence: calculateConfidence(obs),
    };
  });

  // Total sales cycle: createdAt → closedAt for won deals
  const wonDeals = await db.deal.findMany({
    where: { tenantId, stage: "won", closedAt: { not: null } },
    select: { createdAt: true, closedAt: true },
  });
  const cycleDays = wonDeals
    .map((d) => daysBetween(d.createdAt, d.closedAt!))
    .filter((d) => d >= 0)
    .sort((a, b) => a - b);

  // Stalled deals: stadig i aabent stadie, ABNORM lang tid
  const stalledDeals: StalledDeal[] = [];
  const now = new Date();
  const openHistory = history.filter((h) => !h.exitedAt && ACTIVE_STAGES.includes(h.stage));

  for (const h of openHistory) {
    const days = daysBetween(h.enteredAt, now);
    const stageMeta = stageMetrics.find((s) => s.stage === h.stage);
    if (!stageMeta || stageMeta.n < 5) continue; // ikke nok data til at definere "abnorm"
    const z = stageMeta.stdDevDays > 0
      ? (days - stageMeta.meanDays) / stageMeta.stdDevDays
      : 0;
    if (z >= 1.5) {
      stalledDeals.push({
        dealId: h.deal.id,
        title: h.deal.title,
        stage: h.stage,
        stageLabel: stageMeta.label,
        daysInStage: Math.round(days),
        zScore: Math.round(z * 10) / 10,
        value: Number(h.deal.value ?? 0),
      });
    }
  }
  stalledDeals.sort((a, b) => b.zScore - a.zScore);

  return {
    stages: stageMetrics,
    averageSalesCycleDays: mean(cycleDays),
    medianSalesCycleDays: percentile(cycleDays, 0.5),
    salesCycleN: cycleDays.length,
    stalledDeals: stalledDeals.slice(0, 20),
  };
}
