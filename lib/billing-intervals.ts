/**
 * Pris- og faktureringsintervaller
 * ────────────────────────────────
 * Single source of truth for hvordan produkter prissættes og faktureres.
 *
 * To akser:
 *   • pricingInterval — hvad prisen er sat pr. (fx pr. md for SaaS)
 *   • billingInterval — hvor ofte fakturaen genereres (kan adskille sig)
 *
 * Eksempel:
 *   SaaS-produkt: 50 kr. pr. bruger pr. måned, faktureres årligt.
 *     pricingInterval = "monthly"
 *     billingInterval = "annual"
 *     seats           = 10
 *     → faktura-total = 50 × 10 × 12 = 6.000 kr/år
 *
 *   Klassisk service: 80.000 kr. én gang, faktureres engangs.
 *     pricingInterval = "onetime"
 *     billingInterval = "onetime"
 *     → faktura-total = 80.000 kr.
 */

export type BillingIntervalSlug =
  | "monthly"
  | "quarterly"
  | "biannual"
  | "annual"
  | "onetime";

export interface BillingIntervalDefinition {
  slug: BillingIntervalSlug;
  /** Vist label i UI */
  label: string;
  /** Kort label til badges/tabeller */
  shortLabel: string;
  /** Antal måneder dette interval dækker (onetime = 0) */
  monthsPerPeriod: number;
}

export const BILLING_INTERVALS: Record<BillingIntervalSlug, BillingIntervalDefinition> = {
  monthly:   { slug: "monthly",   label: "Månedligt",    shortLabel: "mdr",   monthsPerPeriod: 1  },
  quarterly: { slug: "quarterly", label: "Kvartalsvis",  shortLabel: "kvt",   monthsPerPeriod: 3  },
  biannual:  { slug: "biannual",  label: "Halvårligt",   shortLabel: "halvår",monthsPerPeriod: 6  },
  annual:    { slug: "annual",    label: "Årligt",       shortLabel: "år",    monthsPerPeriod: 12 },
  onetime:   { slug: "onetime",   label: "Engangsbetaling", shortLabel: "engang", monthsPerPeriod: 0 },
};

export const BILLING_INTERVAL_LIST: BillingIntervalDefinition[] = [
  BILLING_INTERVALS.monthly,
  BILLING_INTERVALS.quarterly,
  BILLING_INTERVALS.biannual,
  BILLING_INTERVALS.annual,
  BILLING_INTERVALS.onetime,
];

/**
 * Beregn periode-multiplikator når man konverterer fra pricingInterval
 * til billingInterval. Hvor mange "prisInterval-perioder" rummer ét
 * "billingInterval"?
 *
 *   pris pr. md, faktureres år   → 12 (12 måneder pr. årlig faktura)
 *   pris pr. md, faktureres kvt  →  3
 *   pris pr. år, faktureres år   →  1
 *   pris pr. md, faktureres md   →  1
 *   onetime, *                   →  1 (én gang er én gang)
 */
export function periodMultiplier(
  pricingInterval: BillingIntervalSlug,
  billingInterval: BillingIntervalSlug,
): number {
  // Onetime er altid 1× — uafhængigt af det andet
  if (pricingInterval === "onetime" || billingInterval === "onetime") return 1;
  const priceMonths = BILLING_INTERVALS[pricingInterval].monthsPerPeriod;
  const billMonths  = BILLING_INTERVALS[billingInterval].monthsPerPeriod;
  if (priceMonths === 0) return 1;
  return billMonths / priceMonths;
}

/**
 * Beregn linje-total for et CustomerProduct.
 *
 *   per_unit:             total = pris × seats
 *   per_user_per_period:  total = pris × seats × periodMultiplier(price, billing)
 */
export function lineTotal(opts: {
  pricingMode: "per_unit" | "per_user_per_period";
  unitPrice: number;
  seats: number;
  pricingInterval: BillingIntervalSlug;
  billingInterval: BillingIntervalSlug;
}): number {
  const { pricingMode, unitPrice, seats, pricingInterval, billingInterval } = opts;
  const safeSeats = Math.max(1, seats || 1);

  if (pricingMode === "per_unit") {
    return unitPrice * safeSeats;
  }

  const mult = periodMultiplier(pricingInterval, billingInterval);
  return unitPrice * safeSeats * mult;
}

/**
 * Menneske-læsbar beskrivelse — fx
 *   "1.250 kr × 10 pladser × 12 mdr/år = 150.000 kr/år"
 */
export function priceBreakdown(opts: {
  pricingMode: "per_unit" | "per_user_per_period";
  unitPrice: number;
  seats: number;
  pricingInterval: BillingIntervalSlug;
  billingInterval: BillingIntervalSlug;
}): string {
  const { pricingMode, unitPrice, seats, pricingInterval, billingInterval } = opts;
  const total = lineTotal(opts);
  const fmtKr = (n: number) => `${Math.round(n).toLocaleString("da-DK")} kr`;

  if (pricingMode === "per_unit" || pricingInterval === "onetime") {
    if (seats === 1) return `${fmtKr(total)}`;
    return `${fmtKr(unitPrice)} × ${seats} = ${fmtKr(total)}`;
  }

  const mult = periodMultiplier(pricingInterval, billingInterval);
  const billLabel = BILLING_INTERVALS[billingInterval].shortLabel;
  if (mult === 1) {
    return `${fmtKr(unitPrice)} × ${seats} pladser = ${fmtKr(total)}/${billLabel}`;
  }
  return `${fmtKr(unitPrice)} × ${seats} pladser × ${mult} mdr = ${fmtKr(total)}/${billLabel}`;
}
