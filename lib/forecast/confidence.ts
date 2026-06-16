/**
 * Confidence intervals & fejlmargin
 * ─────────────────────────────────
 * Hvor sikre er vi paa vores tal?
 *
 * Naar vi viser en forecast (eks. "Q1 omsaetning: 2.4M kr"), maa vi
 * vaere aerlige omkring usikkerheden. Det afhaenger af:
 *   1) Hvor meget historisk data har vi? (lille n = bredere CI)
 *   2) Hvor stor variation er der i de historiske datapunkter? (hoej σ = bredere CI)
 *   3) Hvor langt frem forecaster vi? (laengere horisont = bredere CI)
 *
 * Vi bruger en simpel t-fordeling-baseret tilgang. For sma datasaet
 * giver det bredere intervaller end normalfordeling, hvilket er korrekt.
 *
 * For brugeren oversaetter vi til en intuitiv label:
 *   • "Hoej sikkerhed"   — CI ±15%   (n ≥ 30, lav variation)
 *   • "Mellem sikkerhed" — CI ±15-35%
 *   • "Lav sikkerhed"    — CI > ±35%, eller n < 10
 *   • "Utilstraekkelig data" — n < 3
 */

export interface ConfidenceLevel {
  label: "Høj" | "Mellem" | "Lav" | "Utilstrækkelig data";
  /** Pct under/over estimat — undefined hvis n < 3 */
  marginPct?: number;
  /** Antal datapunkter brugt i beregningen */
  n: number;
  /** Standardafvigelse i de underliggende data */
  stdDev?: number;
  /** Kort forklaring til brugeren */
  explanation: string;
}

/**
 * Beregn standardafvigelse for en serie af tal (sample, ikke population).
 */
export function stdDev(values: number[]): number {
  if (values.length < 2) return 0;
  const mean = values.reduce((s, v) => s + v, 0) / values.length;
  const sqDiffs = values.map((v) => (v - mean) ** 2);
  return Math.sqrt(sqDiffs.reduce((s, v) => s + v, 0) / (values.length - 1));
}

export function mean(values: number[]): number {
  if (values.length === 0) return 0;
  return values.reduce((s, v) => s + v, 0) / values.length;
}

/**
 * t-værdi for 95% CI (to-sidet). Approksimeret tabel for sma n.
 * For n > 30 nærmer vi os 1.96 (normalfordeling).
 */
function tValue95(n: number): number {
  // df = n - 1
  const table: Record<number, number> = {
    1: 12.71, 2: 4.30, 3: 3.18, 4: 2.78, 5: 2.57,
    6: 2.45,  7: 2.36, 8: 2.31, 9: 2.26, 10: 2.23,
    15: 2.13, 20: 2.09, 25: 2.06, 30: 2.04,
  };
  if (n <= 1) return 12.71;
  if (n >= 30) return 1.96;
  // Find nærmeste tabel-værdi
  const keys = Object.keys(table).map(Number).sort((a, b) => a - b);
  for (let i = keys.length - 1; i >= 0; i--) {
    if (n - 1 >= keys[i]) return table[keys[i]];
  }
  return table[1];
}

/**
 * Beregn 95% CI for et gennemsnit baseret paa historiske observationer.
 * Returnerer marginPct = (CI-halv-bredde / mean) × 100.
 */
export function calculateConfidence(values: number[], horizonMonths = 1): ConfidenceLevel {
  const n = values.length;

  if (n < 3) {
    return {
      label: "Utilstrækkelig data",
      n,
      explanation: `Vi har kun ${n} historisk(e) datapunkter. Forecasten er retningsgivende og bør tolkes med stor forsigtighed.`,
    };
  }

  const m = mean(values);
  const sd = stdDev(values);
  if (m === 0) {
    return {
      label: "Lav",
      n, stdDev: sd,
      explanation: "Gennemsnittet er nul — kan ikke beregne meningsfuld fejlmargin.",
    };
  }

  // Standard error of the mean × t-værdi = CI-halv-bredde
  const stderr = sd / Math.sqrt(n);
  const t = tValue95(n);
  let halfWidth = t * stderr;

  // Horisont-justering: jo længere ud, jo bredere CI (lineær skalering)
  if (horizonMonths > 1) {
    halfWidth *= Math.sqrt(horizonMonths);
  }

  const marginPct = (halfWidth / Math.abs(m)) * 100;

  let label: ConfidenceLevel["label"];
  let explanation: string;
  if (n < 10) {
    label = "Lav";
    explanation = `Kun ${n} datapunkter — fejlmarginen er bred. Tilfoej flere afsluttede deals for at faa skarpere tal.`;
  } else if (marginPct <= 15) {
    label = "Høj";
    explanation = `${n} datapunkter med lav variation. Forecasten er paalidelig.`;
  } else if (marginPct <= 35) {
    label = "Mellem";
    explanation = `${n} datapunkter med moderat variation. Forecasten er retningsgivende.`;
  } else {
    label = "Lav";
    explanation = `${n} datapunkter med hoej variation (σ=${sd.toFixed(1)}). Forecasten boer tolkes med forsigtighed.`;
  }

  return { label, marginPct: Math.round(marginPct * 10) / 10, n, stdDev: sd, explanation };
}

/**
 * Oversat confidence-label til en farve-tone (til badge-render).
 */
export function confidenceTone(label: ConfidenceLevel["label"]): "success" | "info" | "warning" | "muted" {
  switch (label) {
    case "Høj":    return "success";
    case "Mellem": return "info";
    case "Lav":    return "warning";
    default:       return "muted";
  }
}
