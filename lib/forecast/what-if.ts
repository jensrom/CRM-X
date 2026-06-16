/**
 * What-If simulator
 * ──────────────────
 * Hvad sker der hvis vi:
 *   • løfter conversion rate i 'qualified → proposal' med 10 pct-point?
 *   • forkorter sales cycle med 20%?
 *   • haever average deal size med 15%?
 *   • genererer 30% flere leads pr. maaned?
 *
 * Vi tager baseline-metrics og lader brugeren skrue paa parametre.
 * Resultatet er en projiceret aendring i omsaetning over horisonten.
 *
 * Det er en SIMPEL model — vi antager linearitet og uafhaengighed mellem
 * parametre. I praksis interagerer de (foretrukne conversion + flere leads
 * giver eksponentiel vaekst). Modellen er bevidst konservativ.
 */

export interface WhatIfBaseline {
  /** Leads pr. maaned i snit */
  leadsPerMonth: number;
  /** Lead → Deal conversion (pct) */
  leadToDeal: number;
  /** Deal-stadier conversion rates */
  newToQualified: number;
  qualifiedToProposal: number;
  proposalToNegotiation: number;
  negotiationToWon: number;
  /** Gennemsnitlig won deal-vaerdi (kr) */
  avgDealValue: number;
  /** Gennemsnitlig sales cycle (dage) */
  avgCycleDays: number;
}

export interface WhatIfAdjustments {
  leadsPerMonthDelta: number;          // +/- pct
  leadToDealDelta: number;              // +/- pct-point
  newToQualifiedDelta: number;          // +/- pct-point
  qualifiedToProposalDelta: number;     // +/- pct-point
  proposalToNegotiationDelta: number;   // +/- pct-point
  negotiationToWonDelta: number;        // +/- pct-point
  avgDealValueDelta: number;            // +/- pct
  avgCycleDaysDelta: number;            // +/- pct
}

export const ZERO_ADJUSTMENTS: WhatIfAdjustments = {
  leadsPerMonthDelta: 0,
  leadToDealDelta: 0,
  newToQualifiedDelta: 0,
  qualifiedToProposalDelta: 0,
  proposalToNegotiationDelta: 0,
  negotiationToWonDelta: 0,
  avgDealValueDelta: 0,
  avgCycleDaysDelta: 0,
};

export interface WhatIfResult {
  baseline: WhatIfBaseline;
  adjusted: WhatIfBaseline;
  /** Forventede won deals pr. maaned, baseline vs adjusted */
  monthlyWonDealsBaseline: number;
  monthlyWonDealsAdjusted: number;
  /** Forventet maanedsomsaetning */
  monthlyRevenueBaseline: number;
  monthlyRevenueAdjusted: number;
  /** 12-maaneders forskel */
  annualImpact: number;
  /** Procentvis ændring i annual revenue */
  annualImpactPct: number;
}

export function runWhatIf(
  baseline: WhatIfBaseline,
  adjustments: WhatIfAdjustments,
): WhatIfResult {
  // Anvend justeringer
  const adjusted: WhatIfBaseline = {
    leadsPerMonth:        baseline.leadsPerMonth * (1 + adjustments.leadsPerMonthDelta / 100),
    leadToDeal:           clamp(baseline.leadToDeal + adjustments.leadToDealDelta),
    newToQualified:       clamp(baseline.newToQualified + adjustments.newToQualifiedDelta),
    qualifiedToProposal:  clamp(baseline.qualifiedToProposal + adjustments.qualifiedToProposalDelta),
    proposalToNegotiation:clamp(baseline.proposalToNegotiation + adjustments.proposalToNegotiationDelta),
    negotiationToWon:     clamp(baseline.negotiationToWon + adjustments.negotiationToWonDelta),
    avgDealValue:         baseline.avgDealValue * (1 + adjustments.avgDealValueDelta / 100),
    avgCycleDays:         baseline.avgCycleDays * (1 + adjustments.avgCycleDaysDelta / 100),
  };

  // Saml conversion-pipeline: lead → won
  const fullPipelineBase = (
    baseline.leadToDeal / 100 *
    baseline.newToQualified / 100 *
    baseline.qualifiedToProposal / 100 *
    baseline.proposalToNegotiation / 100 *
    baseline.negotiationToWon / 100
  );
  const fullPipelineAdj = (
    adjusted.leadToDeal / 100 *
    adjusted.newToQualified / 100 *
    adjusted.qualifiedToProposal / 100 *
    adjusted.proposalToNegotiation / 100 *
    adjusted.negotiationToWon / 100
  );

  // Maanedsproduktion
  const monthlyWonBase = baseline.leadsPerMonth * fullPipelineBase;
  const monthlyWonAdj  = adjusted.leadsPerMonth * fullPipelineAdj;

  const monthlyRevBase = monthlyWonBase * baseline.avgDealValue;
  const monthlyRevAdj  = monthlyWonAdj  * adjusted.avgDealValue;

  const annualImpact = (monthlyRevAdj - monthlyRevBase) * 12;
  const annualImpactPct = monthlyRevBase > 0
    ? ((monthlyRevAdj - monthlyRevBase) / monthlyRevBase) * 100
    : 0;

  return {
    baseline, adjusted,
    monthlyWonDealsBaseline: monthlyWonBase,
    monthlyWonDealsAdjusted: monthlyWonAdj,
    monthlyRevenueBaseline: monthlyRevBase,
    monthlyRevenueAdjusted: monthlyRevAdj,
    annualImpact,
    annualImpactPct,
  };
}

function clamp(pct: number, min = 0, max = 100): number {
  return Math.max(min, Math.min(max, pct));
}
