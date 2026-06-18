/**
 * lib/health-score.ts — Customer Health Score (0-100).
 *
 * Ren beregningsfunktion. Tager raa signaler ind, returnerer score + breakdown.
 * Vægtning:
 *   Engagement (25%) — dage siden sidste interaktion (ticket/mail/aktivitet)
 *   Support    (25%) — aabne kritiske tickets + tickets-ratio
 *   Klippekort (20%) — restende timer + brugsrate
 *   Licenser   (15%) — aktive vs udloebne licenser
 *   Betaling   (15%) — forfaldne fakturaer
 *
 * Hver delscore er 0-100 hvor 100 = perfekt. Score = vægtet snit.
 *
 * Klassificering (bruges af UI):
 *   80-100 = sund (groen)
 *   60-79  = ok (gul)
 *   40-59  = opmaerksomhed (orange)
 *    0-39  = risiko (roed)
 */

export interface HealthSignals {
  /** Dage siden sidste kontakt (mail/ticket/aktivitet). 0 = i dag. */
  daysSinceContact: number;
  /** Aabne tickets totalt. */
  openTicketCount: number;
  /** Aabne kritiske tickets. */
  criticalTicketCount: number;
  /** Lukket tickets sidste 90 dage — bruges til at vurdere total volumen. */
  resolvedLast90Days: number;
  /** Resterende timer paa aktive klippekort. */
  bundleHoursRemaining: number;
  /** Total purchased hours paa aktive klippekort (til %-beregning). */
  bundleHoursTotal: number;
  /** Aktive licenser. */
  activeLicenses: number;
  /** Udloebne licenser indenfor sidste 30 dage. */
  recentlyExpiredLicenses: number;
  /** Forfaldne fakturaer (status=overdue). */
  overdueInvoiceCount: number;
  /** Forfaldne fakturaer i beloebsmaessig sum (DKK). */
  overdueInvoiceAmount: number;
  /** Total faktura-beloebsmaessig sum (sidste 12 mdr) — til ratio. */
  invoiceAmountLast12Months: number;
}

export interface HealthBreakdown {
  score: number;          // 0-100, samlet vægtet score
  level: "healthy" | "ok" | "attention" | "risk";
  signals: {
    engagement: number;   // 0-100
    support: number;
    bundles: number;
    licenses: number;
    payment: number;
  };
  reasons: string[];      // Korte, menneskelaesbare forklaringer for laveste sub-scores
}

/** Score-funktioner pr. signal. Alle returnerer 0-100. */

function scoreEngagement(daysSinceContact: number): number {
  // 0 dage = 100, 7 dage = 90, 30 dage = 60, 90 dage = 20, >180 = 0
  if (daysSinceContact <= 7) return 100 - Math.round(daysSinceContact * (10 / 7));
  if (daysSinceContact <= 30) return Math.max(60, 90 - Math.round((daysSinceContact - 7) * (30 / 23)));
  if (daysSinceContact <= 90) return Math.max(20, 60 - Math.round((daysSinceContact - 30) * (40 / 60)));
  if (daysSinceContact <= 180) return Math.max(0, 20 - Math.round((daysSinceContact - 90) * (20 / 90)));
  return 0;
}

function scoreSupport(open: number, critical: number, resolved90: number): number {
  // Critical tickets straffer haardt. Open tickets blødt.
  // resolved90 over 0 betyder vi har aktivitet (godt tegn).
  let score = 100;
  score -= Math.min(60, critical * 25);  // hver kritiske trækker 25, max 60
  score -= Math.min(20, open * 3);       // hver aaben trækker 3, max 20
  // Hvis ingen aktivitet over 90 dage og ingen aabne — det er ok (60+)
  if (resolved90 === 0 && open === 0) score = Math.max(score, 75);
  return Math.max(0, Math.min(100, score));
}

function scoreBundles(remaining: number, total: number): number {
  if (total === 0) return 80; // Ingen klippekort = neutralt (lidt under perfekt)
  const ratio = remaining / total;
  if (ratio >= 0.5) return 100;
  if (ratio >= 0.25) return 80;
  if (ratio >= 0.1) return 55;
  if (ratio > 0) return 30;
  return 10; // alt opbrugt — risiko for at de skal købe nyt eller forsvinde
}

function scoreLicenses(active: number, recentlyExpired: number): number {
  // Hvis vi aldrig har haft licenser, ingen straf
  if (active === 0 && recentlyExpired === 0) return 80;
  // Hvis flere udloebne end aktive => alarm
  const total = active + recentlyExpired;
  const activeRatio = total > 0 ? active / total : 1;
  if (activeRatio >= 0.9) return 100;
  if (activeRatio >= 0.7) return 80;
  if (activeRatio >= 0.5) return 55;
  if (activeRatio >= 0.25) return 30;
  return 10;
}

function scorePayment(overdueCount: number, overdueAmount: number, totalLast12: number): number {
  if (overdueCount === 0) return 100;
  // Beloebsforhold straffer staerkest
  const ratio = totalLast12 > 0 ? overdueAmount / totalLast12 : (overdueCount > 0 ? 1 : 0);
  let score = 100;
  score -= Math.min(60, overdueCount * 15);  // hver forfalden trækker 15, max 60
  score -= Math.min(40, ratio * 100);        // beløbs-andel straffer op til 40
  return Math.max(0, Math.min(100, Math.round(score)));
}

/**
 * Beregn samlet health score + breakdown for en kunde.
 * Ren funktion — ingen DB-adgang. Kald fra server-action med signaler hentet.
 */
export function calculateHealthScore(signals: HealthSignals): HealthBreakdown {
  const engagement = scoreEngagement(signals.daysSinceContact);
  const support = scoreSupport(
    signals.openTicketCount,
    signals.criticalTicketCount,
    signals.resolvedLast90Days,
  );
  const bundles = scoreBundles(
    signals.bundleHoursRemaining,
    signals.bundleHoursTotal,
  );
  const licenses = scoreLicenses(
    signals.activeLicenses,
    signals.recentlyExpiredLicenses,
  );
  const payment = scorePayment(
    signals.overdueInvoiceCount,
    signals.overdueInvoiceAmount,
    signals.invoiceAmountLast12Months,
  );

  const score = Math.round(
    engagement * 0.25 +
    support    * 0.25 +
    bundles    * 0.20 +
    licenses   * 0.15 +
    payment    * 0.15,
  );

  const level: HealthBreakdown["level"] =
    score >= 80 ? "healthy" :
    score >= 60 ? "ok" :
    score >= 40 ? "attention" : "risk";

  // Genérér årsager: vis sub-scores under 60 sorteret laveste først
  const reasons: string[] = [];
  const items: [string, number, string][] = [
    ["engagement", engagement, `Ingen kontakt i ${signals.daysSinceContact} dage`],
    ["support",    support,    `${signals.criticalTicketCount} kritisk${signals.criticalTicketCount === 1 ? "" : "e"} ticket${signals.criticalTicketCount === 1 ? "" : "s"}, ${signals.openTicketCount} aabne`],
    ["bundles",    bundles,    `Klippekort: ${signals.bundleHoursRemaining}/${signals.bundleHoursTotal} timer tilbage`],
    ["licenser",   licenses,   `${signals.recentlyExpiredLicenses} udloebet licens${signals.recentlyExpiredLicenses === 1 ? "" : "er"} (${signals.activeLicenses} aktive)`],
    ["betaling",   payment,    `${signals.overdueInvoiceCount} forfalden${signals.overdueInvoiceCount === 1 ? "" : "e"} faktura${signals.overdueInvoiceCount === 1 ? "" : "er"}`],
  ];
  items
    .filter(([_, v]) => v < 60)
    .sort((a, b) => a[1] - b[1])
    .slice(0, 3)
    .forEach(([_, _v, msg]) => reasons.push(msg));

  return {
    score,
    level,
    signals: { engagement, support, bundles, licenses, payment },
    reasons,
  };
}

/** Klassificering -> hex farve (til brug i UI). */
export const HEALTH_COLORS: Record<HealthBreakdown["level"], { bg: string; text: string; border: string; label: string }> = {
  healthy:   { bg: "bg-emerald-100 dark:bg-emerald-900/30", text: "text-emerald-700 dark:text-emerald-300", border: "border-emerald-300 dark:border-emerald-800", label: "Sund" },
  ok:        { bg: "bg-blue-100 dark:bg-blue-900/30",       text: "text-blue-700 dark:text-blue-300",       border: "border-blue-300 dark:border-blue-800",       label: "OK" },
  attention: { bg: "bg-amber-100 dark:bg-amber-900/30",     text: "text-amber-800 dark:text-amber-300",     border: "border-amber-300 dark:border-amber-800",     label: "Opmærksomhed" },
  risk:      { bg: "bg-rose-100 dark:bg-rose-900/30",       text: "text-rose-700 dark:text-rose-300",       border: "border-rose-300 dark:border-rose-800",       label: "Risiko" },
};
