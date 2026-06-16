/**
 * Revenue-projection: hvad lukker vi, og hvornaar?
 * ─────────────────────────────────────────────────
 * Vi laver tre forskellige projektioner saa lederen kan navigere
 * i usikkerheden:
 *
 *  1) **Conservative (worst case)**  — kun deals med >=70% probability
 *  2) **Expected (most likely)**     — vægtet pipeline (value × probability)
 *  3) **Best case**                  — hele pipeline-vaerdien hvis ALT lukker
 *
 * Til hver maaned tilfoejer vi:
 *  • Recurring (MRR fra eksisterende CustomerProducts)
 *  • Forventet ny pipeline-omsætning baseret paa historisk velocity
 *  • Confidence interval
 *
 * For at undgaa "garbage in, garbage out": hvis brugeren ikke vedligeholder
 * probability/expectedCloseDate paa sine deals, falder kvaliteten af forecast.
 * Vi viser en "data quality"-score saa de ved det.
 */

import { db } from "@/lib/db";
import { calculateConfidence, mean, stdDev, type ConfidenceLevel } from "./confidence";

export interface MonthlyProjection {
  /** ISO YYYY-MM */
  yearMonth: string;
  monthLabel: string;
  recurringRevenue: number;
  newPipelineWeighted: number;
  newPipelineConservative: number;
  newPipelineBest: number;
  /** expected = recurring + weighted; conservative/best inkluderer ogsaa recurring */
  expectedTotal: number;
  conservativeTotal: number;
  bestTotal: number;
  /** Hvilke deals er allerede commit (won med invoice) */
  committedRevenue: number;
}

export interface RevenueForecast {
  months: MonthlyProjection[];
  currentMRR: number;
  totalCommitted: number;
  totalExpected: number;
  totalConservative: number;
  totalBest: number;
  confidence: ConfidenceLevel;
  dataQuality: DataQuality;
}

export interface DataQuality {
  /** Pct af aabne deals der har en expectedCloseDate */
  dealsWithCloseDate: number;
  /** Pct af aabne deals der har probability > 0 */
  dealsWithProbability: number;
  /** Pct af aabne deals der har value */
  dealsWithValue: number;
  /** Samlet kvalitets-score 0-100 */
  overallScore: number;
  warnings: string[];
}

/**
 * Beregn current recurring MRR fra aktive CustomerProducts.
 * Konverterer alle intervaller til maanedlig basis.
 */
async function calculateCurrentMRR(tenantId: string): Promise<number> {
  const products = await db.customerProduct.findMany({
    where: { tenantId, isActive: true },
    include: { product: { include: { pricing: true } } },
  });

  let mrr = 0;
  for (const cp of products) {
    const seats = (cp as any).seats ?? 1;
    const pricingInterval = (cp as any).pricingInterval ?? "monthly";
    const pricing = cp.product.pricing.find((p: any) => p.interval === pricingInterval);
    const unitPrice = (cp as any).unitPriceOverride
      ? Number((cp as any).unitPriceOverride)
      : Number(pricing?.price ?? 0);

    // Konverter til maanedlig
    const periodToMonthlyDivisor: Record<string, number> = {
      monthly: 1, quarterly: 3, biannual: 6, annual: 12, onetime: 0,
    };
    const div = periodToMonthlyDivisor[pricingInterval] ?? 1;
    if (div === 0) continue; // onetime tæller ikke i MRR

    const monthlyPerUnit = unitPrice / div;
    mrr += monthlyPerUnit * seats;
  }
  return mrr;
}

function monthKey(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}

function monthLabel(d: Date): string {
  return d.toLocaleDateString("da-DK", { month: "short", year: "numeric" });
}

export async function getRevenueForecast(
  tenantId: string,
  horizonMonths = 6,
): Promise<RevenueForecast> {
  const now = new Date();

  // Hent aabne deals med expected close date
  const openDeals = await db.deal.findMany({
    where: {
      tenantId,
      stage: { notIn: ["won", "lost"] },
    },
    select: {
      id: true, value: true, probability: true, expectedCloseDate: true,
    },
  });

  // Hent won deals fra de seneste 12 maaneder til at beregne velocity / volume baseline
  const twelveMonthsAgo = new Date(now);
  twelveMonthsAgo.setMonth(twelveMonthsAgo.getMonth() - 12);
  const recentWon = await db.deal.findMany({
    where: { tenantId, stage: "won", closedAt: { gte: twelveMonthsAgo } },
    select: { value: true, closedAt: true },
  });

  // MRR baseline
  const currentMRR = await calculateCurrentMRR(tenantId);

  // Aggreger pipeline per maaned baseret paa expectedCloseDate
  const months: MonthlyProjection[] = [];
  for (let i = 0; i < horizonMonths; i++) {
    const monthStart = new Date(now.getFullYear(), now.getMonth() + i, 1);
    const monthEnd   = new Date(now.getFullYear(), now.getMonth() + i + 1, 0, 23, 59, 59);

    const dealsThisMonth = openDeals.filter((d) =>
      d.expectedCloseDate &&
      d.expectedCloseDate >= monthStart &&
      d.expectedCloseDate <= monthEnd
    );

    const weighted     = dealsThisMonth.reduce((s, d) => s + Number(d.value ?? 0) * (d.probability / 100), 0);
    const conservative = dealsThisMonth.filter((d) => d.probability >= 70).reduce((s, d) => s + Number(d.value ?? 0) * (d.probability / 100), 0);
    const best         = dealsThisMonth.reduce((s, d) => s + Number(d.value ?? 0), 0);

    months.push({
      yearMonth: monthKey(monthStart),
      monthLabel: monthLabel(monthStart),
      recurringRevenue: currentMRR,
      newPipelineWeighted: weighted,
      newPipelineConservative: conservative,
      newPipelineBest: best,
      expectedTotal: currentMRR + weighted,
      conservativeTotal: currentMRR + conservative,
      bestTotal: currentMRR + best,
      committedRevenue: 0, // udfyldes nedenfor hvis nogle deals allerede er won med faktura
    });
  }

  // Totaler
  const totalExpected     = months.reduce((s, m) => s + m.newPipelineWeighted,     currentMRR * horizonMonths);
  const totalConservative = months.reduce((s, m) => s + m.newPipelineConservative, currentMRR * horizonMonths);
  const totalBest         = months.reduce((s, m) => s + m.newPipelineBest,         currentMRR * horizonMonths);

  // Already-committed (won deals der lukker indenfor horisonten)
  const committedDeals = await db.deal.findMany({
    where: {
      tenantId,
      stage: "won",
      closedAt: { gte: now, lte: new Date(now.getFullYear(), now.getMonth() + horizonMonths, 0) },
    },
    select: { value: true, closedAt: true },
  });
  for (const cd of committedDeals) {
    if (!cd.closedAt) continue;
    const key = monthKey(cd.closedAt);
    const m = months.find((mm) => mm.yearMonth === key);
    if (m) m.committedRevenue += Number(cd.value ?? 0);
  }
  const totalCommitted = committedDeals.reduce((s, d) => s + Number(d.value ?? 0), 0);

  // Confidence baseret paa historiske won-dael-vaerdier
  const wonValues = recentWon.map((d) => Number(d.value ?? 0));
  const confidence = calculateConfidence(wonValues, Math.min(horizonMonths, 6));

  // Data quality
  const total = openDeals.length;
  const wCloseDate    = total > 0 ? (openDeals.filter((d) => d.expectedCloseDate).length / total) * 100 : 0;
  const wProbability  = total > 0 ? (openDeals.filter((d) => d.probability > 0).length / total) * 100 : 0;
  const wValue        = total > 0 ? (openDeals.filter((d) => d.value).length / total) * 100 : 0;
  const overallScore  = total > 0 ? (wCloseDate + wProbability + wValue) / 3 : 0;
  const warnings: string[] = [];
  if (wCloseDate    < 70) warnings.push(`${Math.round(100 - wCloseDate)}% af dine aabne deals mangler 'forventet lukkedato' — det svaekker tids-forecasten.`);
  if (wProbability  < 70) warnings.push(`${Math.round(100 - wProbability)}% af dine aabne deals har sandsynlighed 0% — vaegtningen bliver konservativ.`);
  if (wValue        < 80) warnings.push(`${Math.round(100 - wValue)}% af dine aabne deals mangler kr-vaerdi — de tæller som 0 i forecasten.`);

  return {
    months,
    currentMRR,
    totalCommitted,
    totalExpected,
    totalConservative,
    totalBest,
    confidence,
    dataQuality: {
      dealsWithCloseDate: Math.round(wCloseDate),
      dealsWithProbability: Math.round(wProbability),
      dealsWithValue: Math.round(wValue),
      overallScore: Math.round(overallScore),
      warnings,
    },
  };
}
