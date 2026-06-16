/**
 * Forecast engine — samlet entry point
 * ─────────────────────────────────────
 * Convenience-funktion der henter ALT pa én gang. Bruges af Dashboard.
 */

import { db } from "@/lib/db";
import { getSnapshotFunnel, getLeadConversionRate } from "./funnel";
import { getVelocityAnalysis } from "./velocity";
import { getRevenueForecast } from "./revenue";
import type { WhatIfBaseline } from "./what-if";

export * from "./funnel";
export * from "./velocity";
export * from "./revenue";
export * from "./what-if";
export * from "./confidence";

/**
 * Bygger en What-If-baseline ud fra historiske data.
 */
export async function buildWhatIfBaseline(tenantId: string): Promise<WhatIfBaseline> {
  const now = new Date();
  const twelveMonthsAgo = new Date(now);
  twelveMonthsAgo.setMonth(twelveMonthsAgo.getMonth() - 12);

  const [funnel, leads, velocity, recentWon] = await Promise.all([
    getSnapshotFunnel(tenantId, twelveMonthsAgo, now),
    getLeadConversionRate(tenantId, twelveMonthsAgo, now),
    getVelocityAnalysis(tenantId),
    db.deal.findMany({
      where: { tenantId, stage: "won", closedAt: { gte: twelveMonthsAgo } },
      select: { value: true },
    }),
  ]);

  const wonValues = recentWon.map((d) => Number(d.value ?? 0));
  const avgDealValue = wonValues.length > 0
    ? wonValues.reduce((s, v) => s + v, 0) / wonValues.length
    : 0;

  // Find conversion-rates fra funnel
  const stage = (name: string) => funnel.stages.find((s) => s.stage === name);
  const qualifiedConv  = stage("qualified")?.conversionFromPrevious ?? 0;
  const proposalConv   = stage("proposal")?.conversionFromPrevious ?? 0;
  const negotiationConv= stage("negotiation")?.conversionFromPrevious ?? 0;
  const wonConv        = stage("won")?.conversionFromPrevious ?? 0;

  // Lead-volume: antal leads sidste 12 mdr / 12
  const leadsPerMonth = leads.totalLeads / 12;

  return {
    leadsPerMonth,
    leadToDeal: leads.conversionRate,
    newToQualified: qualifiedConv,
    qualifiedToProposal: proposalConv,
    proposalToNegotiation: negotiationConv,
    negotiationToWon: wonConv,
    avgDealValue,
    avgCycleDays: velocity.averageSalesCycleDays,
  };
}
