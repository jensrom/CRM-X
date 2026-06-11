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
 * Add-on pris pr. ekstra modul ud over plan-bundle.
 * Bevidst USD-baseret som plan-priser; DKK regnes via samme USD→DKK kurs.
 */
export const ADDON_PRICE_PER_USER: Record<Currency, number> = {
  USD: 4,
  DKK: usdToDkk(4),
};

export type ModuleSlug = PlanDefinition["modules"][number];

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
  pricePerUserTotal: number;
  monthlyTotal: number;
  promoted: boolean; // true hvis moduler trak en højere plan
}

/**
 * Beregn fuld månedspris med add-on logik:
 *   1. Hvis valgte moduler ⊇ en højere plans bundle → opgrader automatisk
 *   2. Ellers læg $4/seat (DKK-ækvivalent) pr. ekstra modul
 */
export function calculatePlanPrice(
  baseSlug: PlanSlug,
  selectedModules: readonly string[],
  seats: number,
  currency: Currency = "USD",
): PriceBreakdown {
  const effectiveSlug = effectivePlanForModules(baseSlug, selectedModules);
  const effective = PLANS[effectiveSlug];
  const promoted = effectiveSlug !== baseSlug;

  const basePricePerUser = effective.pricePerUserMonth[currency];
  const addonModules = getAddonModules(effectiveSlug, selectedModules);
  const addonPricePerUser = addonModules.length * ADDON_PRICE_PER_USER[currency];
  const pricePerUserTotal = basePricePerUser + addonPricePerUser;
  const monthlyTotal = pricePerUserTotal * Math.max(1, seats);

  return {
    effectivePlan: effectiveSlug,
    basePricePerUser,
    addonModules,
    addonPricePerUser,
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
