/**
 * CRM-X — Plan-katalog
 *
 * Single source of truth for hvilke plan-pakker vi sælger.
 * Refereres fra:
 *   - Onboarding-wizard (super-admin opretter tenant)
 *   - Tenant-settings (vis nuværende plan)
 *   - Billing-flows
 *   - Public pricing-page (når den bygges)
 *
 * Når Fase 3 (billing) implementeres flyttes dette til DB-tabellen `Plan`.
 * Indtil da fungerer denne fil som "config-as-code".
 */

export type PlanSlug = "small" | "medium" | "large";
export type Currency = "USD" | "DKK";

export interface PlanDefinition {
  slug: PlanSlug;
  name: string;
  tagline: string;
  pricePerUserMonth: {
    USD: number;
    DKK: number;
  };
  // Hvilke moduler er inkluderet i denne plan
  modules: readonly (
    | "sales"
    | "marketing"
    | "support"
    | "projects"
    | "products"
    | "licenses"
  )[];
  // Default antal user-licenser ved oprettelse
  defaultUserSeats: number;
  // Synlige fordele i UI (pricing-page, wizard)
  highlights: readonly string[];
  // Tone-variant for invite-mails: "warm" eller "professional"
  inviteTone: "warm" | "professional";
  // Sortering i UI
  order: number;
}

/**
 * USD→DKK kurs er bevidst holdt som en konstant.
 * Ved produktion bør den hentes fra en ECB-feed eller låses
 * for kontrakt-perioden. Vi bruger 1 USD = 6.80 DKK som baseline.
 */
const USD_TO_DKK = 6.8;

function usdToDkk(usd: number): number {
  return Math.round(usd * USD_TO_DKK);
}

export const PLANS: Record<PlanSlug, PlanDefinition> = {
  small: {
    slug: "small",
    name: "Small",
    tagline: "Basic kunde-administration",
    pricePerUserMonth: { USD: 10, DKK: usdToDkk(10) },
    modules: ["sales", "support"],
    defaultUserSeats: 5,
    highlights: [
      "Firmaer & kontakter",
      "Aktiviteter & noter",
      "Support tickets",
      "Tidsregistrering",
      "E-mail-support",
    ],
    inviteTone: "warm",
    order: 1,
  },
  medium: {
    slug: "medium",
    name: "Medium",
    tagline: "Small + Marketing + Produkter & Priser",
    pricePerUserMonth: { USD: 16, DKK: usdToDkk(16) },
    modules: ["sales", "support", "marketing", "products"],
    defaultUserSeats: 10,
    highlights: [
      "Alt i Small",
      "Kampagner & leads",
      "Produktkatalog & priser",
      "Pipeline & tilbud",
      "Prioriteret support",
    ],
    inviteTone: "warm",
    order: 2,
  },
  large: {
    slug: "large",
    name: "Large",
    tagline: "Alt + API-adgang (på sigt)",
    pricePerUserMonth: { USD: 25, DKK: usdToDkk(25) },
    modules: ["sales", "support", "marketing", "products", "projects", "licenses"],
    defaultUserSeats: 25,
    highlights: [
      "Alt i Medium",
      "Projekter & klippekort",
      "Licens-håndtering",
      "Custom branding",
      "API-adgang (kommer snart)",
      "Dedikeret onboarding",
    ],
    inviteTone: "professional",
    order: 3,
  },
} as const;

export const PLAN_LIST: PlanDefinition[] = Object.values(PLANS).sort(
  (a, b) => a.order - b.order
);

/**
 * Legacy plan-slugs vi har set i naturen (seed-data, tidlige iterationer).
 * Mappes til vores kanoniske 3-plan model så MRR/UI ikke siger "ukendt plan".
 */
const LEGACY_PLAN_MAP: Record<string, PlanSlug> = {
  enterprise: "large",
  professional: "large",
  business: "medium",
  starter: "small",
};

export function getPlan(slug: string): PlanDefinition | null {
  if (slug in PLANS) return PLANS[slug as PlanSlug];
  const mapped = LEGACY_PLAN_MAP[slug];
  if (mapped) return PLANS[mapped];
  return null;
}

/**
 * Normalisér en plan-slug til en af de kanoniske small|medium|large.
 * Bruges når vi vil regne MRR korrekt selvom DB har legacy-værdier.
 */
export function normalizePlanSlug(slug: string | null | undefined): PlanSlug {
  if (!slug) return "small";
  if (slug in PLANS) return slug as PlanSlug;
  return LEGACY_PLAN_MAP[slug] ?? "small";
}

/**
 * Beregn månedlig pris givet plan + antal brugere + valuta.
 */
export function calculateMonthlyPrice(
  plan: PlanDefinition,
  seats: number,
  currency: Currency = "USD"
): number {
  return plan.pricePerUserMonth[currency] * Math.max(1, seats);
}

/**
 * Add-on pris pr. ekstra modul ud over plan-bundle (legacy — beholdt for bagudkompat).
 * For Forecast og andre named-addons brug ADDONS-katalog i stedet.
 */
export const ADDON_PRICE_PER_USER: Record<Currency, number> = {
  USD: 4,
  DKK: usdToDkk(4),
};

export type ModuleSlug = PlanDefinition["modules"][number];

// ─────────────────────────────────────────────────────────────
// NAMED ADD-ONS (Forecast, etc.) — saelges separat pr plan
// ─────────────────────────────────────────────────────────────
// Nogle features er for tunge/avancerede til at indgaa i plan-
// bundler. De saelges som named add-ons med plan-afhaengig pris.
// Pris skalerer omvendt med plan-stoerrelse: Large kunder faar
// volume-rabat, Medium betaler en premium. Small har null = ikke
// tilgaengelig — Forecast giver ingen vaerdi paa et tomt datasaet.

export type AddOnSlug = "forecast";

export interface AddOnDefinition {
  slug: AddOnSlug;
  name: string;
  tagline: string;
  /** Pris pr. seat pr. md. null = ikke tilgaengelig paa den plan */
  pricePerUserMonth: Record<PlanSlug, { USD: number; DKK: number } | null>;
  /** Modul-slug der aktiveres naar add-on er tilkoebt (bruges af sidebar/gating) */
  module: string;
  /** Highlights vist i UI naar add-on saelges */
  highlights: readonly string[];
  order: number;
}

export const ADDONS: Record<AddOnSlug, AddOnDefinition> = {
  forecast: {
    slug: "forecast",
    name: "Forecast & Sales Intelligence",
    tagline: "Predictive analytics paa pipeline, leads og omsaetning",
    pricePerUserMonth: {
      small:  null,                                  // ikke tilgaengelig
      medium: { USD: 12, DKK: usdToDkk(12) },        // premium-pris paa Medium
      large:  { USD: 8,  DKK: usdToDkk(8)  },        // volume-rabat paa Large
    },
    module: "forecast",
    highlights: [
      "Sales funnel — drop-off pr stadie",
      "Velocity-analyse — tid pr deal-stadie",
      "Omsaetnings-projektion 3-12 mdr",
      "Hvad-hvis simulator",
      "Lead → Vundet end-to-end funnel",
    ],
    order: 1,
  },
} as const;

export const ADDON_LIST: AddOnDefinition[] = Object.values(ADDONS).sort(
  (a, b) => a.order - b.order
);

/** Kan en given add-on tilkoebes paa en given plan? */
export function isAddOnAvailable(addonSlug: AddOnSlug, planSlug: PlanSlug): boolean {
  const addon = ADDONS[addonSlug];
  if (!addon) return false;
  return addon.pricePerUserMonth[planSlug] !== null;
}

/** Returnerer prisen pr seat for en add-on paa en given plan + valuta. 0 hvis ikke tilgaengelig. */
export function getAddOnPricePerUser(addonSlug: AddOnSlug, planSlug: PlanSlug, currency: Currency = "DKK"): number {
  const price = ADDONS[addonSlug]?.pricePerUserMonth[planSlug];
  return price ? price[currency] : 0;
}

/**
 * Returnerer hvilke moduler der er add-ons ud over plan-bundlet.
 */
export function getAddonModules(
  baseSlug: PlanSlug,
  selectedModules: readonly string[],
): ModuleSlug[] {
  const base = PLANS[baseSlug];
  if (!base) return [];
  const included = new Set<string>(base.modules);
  return selectedModules.filter((m) => !included.has(m)) as ModuleSlug[];
}

/**
 * Hvis valgte moduler dækker en højere plans bundle, returneres den højere plan.
 * Ellers returneres base-slug uændret.
 *
 * Eksempel:
 *   selectedModules = [sales, support, marketing, products]
 *   → "medium" (Medium's bundle er præcis disse 4)
 */
export function effectivePlanForModules(
  baseSlug: PlanSlug,
  selectedModules: readonly string[],
): PlanSlug {
  const set = new Set(selectedModules);
  let best: PlanSlug = baseSlug;
  let bestOrder = PLANS[baseSlug]?.order ?? 0;
  for (const plan of PLAN_LIST) {
    const covers = plan.modules.every((m) => set.has(m));
    if (covers && plan.order >= bestOrder) {
      best = plan.slug;
      bestOrder = plan.order;
    }
  }
  return best;
}

export interface PriceBreakdown {
  effectivePlan: PlanSlug;
  basePricePerUser: number;
  addonModules: ModuleSlug[];
  addonPricePerUser: number;
  namedAddOns: AddOnSlug[];
  namedAddOnPricePerUser: number;
  pricePerUserTotal: number;
  monthlyTotal: number;
  promoted: boolean;
}

/**
 * Beregn fuld månedspris med add-on logik:
 *   1. Hvis valgte moduler ⊇ en højere plans bundle → opgrader automatisk
 *   2. Læg $4/seat (DKK-ækvivalent) pr. ekstra modul-tilkoeb (legacy)
 *   3. Læg named add-ons til (Forecast etc.) med plan-afhaengig pris
 */
export function calculatePlanPrice(
  baseSlug: PlanSlug,
  selectedModules: readonly string[],
  seats: number,
  currency: Currency = "USD",
  selectedAddOns: readonly AddOnSlug[] = [],
): PriceBreakdown {
  const effectiveSlug = effectivePlanForModules(baseSlug, selectedModules);
  const effective = PLANS[effectiveSlug];
  const promoted = effectiveSlug !== baseSlug;

  const basePricePerUser = effective.pricePerUserMonth[currency];
  const addonModules = getAddonModules(effectiveSlug, selectedModules);
  const addonPricePerUser = addonModules.length * ADDON_PRICE_PER_USER[currency];

  const namedAddOns = selectedAddOns.filter((a) => isAddOnAvailable(a, effectiveSlug));
  const namedAddOnPricePerUser = namedAddOns.reduce(
    (sum, a) => sum + getAddOnPricePerUser(a, effectiveSlug, currency),
    0,
  );

  const pricePerUserTotal = basePricePerUser + addonPricePerUser + namedAddOnPricePerUser;
  const monthlyTotal = pricePerUserTotal * Math.max(1, seats);

  return {
    effectivePlan: effectiveSlug,
    basePricePerUser,
    addonModules,
    addonPricePerUser,
    namedAddOns,
    namedAddOnPricePerUser,
    pricePerUserTotal,
    monthlyTotal,
    promoted,
  };
}

/**
 * Format pris med korrekt valuta-symbol.
 */
export function formatPrice(amount: number, currency: Currency = "USD"): string {
  if (currency === "DKK") {
    return new Intl.NumberFormat("da-DK", {
      style: "currency",
      currency: "DKK",
      maximumFractionDigits: 0,
    }).format(amount);
  }
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  }).format(amount);
}

/**
 * Detektér foretrukket valuta fra Accept-Language header.
 * Brugere fra DK eller med dansk locale → DKK. Resten → USD.
 */
export function detectCurrencyFromHeaders(acceptLanguage?: string | null): Currency {
  if (!acceptLanguage) return "USD";
  const lower = acceptLanguage.toLowerCase();
  if (lower.includes("da") || lower.includes("dk")) return "DKK";
  return "USD";
}

/**
 * Trial-længde i dage. Konfigurerbart hvis vi senere vil have
 * forskellige trial-perioder pr. plan.
 */
export const TRIAL_LENGTH_DAYS = 14;

export function calculateTrialEnd(from: Date = new Date()): Date {
  const end = new Date(from);
  end.setDate(end.getDate() + TRIAL_LENGTH_DAYS);
  return end;
}

/**
 * Liste af branche-options til onboarding.
 */
export const INDUSTRIES = [
  { value: "it_software", label: "IT & Software" },
  { value: "consulting", label: "Konsulent" },
  { value: "marketing", label: "Marketing & Reklame" },
  { value: "engineering", label: "Engineering" },
  { value: "finance", label: "Finans & Forsikring" },
  { value: "healthcare", label: "Sundhed" },
  { value: "manufacturing", label: "Produktion" },
  { value: "retail", label: "Detail & E-handel" },
  { value: "education", label: "Uddannelse" },
  { value: "real_estate", label: "Ejendomme" },
  { value: "other", label: "Andet" },
] as const;

export const EMPLOYEE_COUNT_OPTIONS = [
  { value: "1-5", label: "1-5 medarbejdere" },
  { value: "6-20", label: "6-20 medarbejdere" },
  { value: "21-50", label: "21-50 medarbejdere" },
  { value: "51-200", label: "51-200 medarbejdere" },
  { value: "200+", label: "200+ medarbejdere" },
] as const;
