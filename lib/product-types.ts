/**
 * CRM-X — Produkt-typer
 *
 * Single source of truth for hvilke produkt-typer der findes.
 * Bruges som tag på Product-kort + dropdown i form + filter i liste.
 *
 * Skemafelt: Product.type (string). Default = "other".
 *
 * Bevidst valgt som config-as-code (ikke DB-tabel) — settet er stabilt
 * og ville give unødigt JOIN-overhead på et felt der primært vises som tag.
 */

export type ProductTypeSlug =
  | "saas"
  | "subscription"
  | "onetime"
  | "consulting"
  | "bundle"
  | "hardware"
  | "other"
  // Legacy-slugs bevaret for backward-compat
  | "software_license"
  | "accessory";

export interface ProductTypeDefinition {
  slug: ProductTypeSlug;
  label: string;
  // Tailwind-klasser til badge — bløde nordiske toner
  badgeClass: string;
  legacy?: true; // Skjules i dropdown, vises stadig på eksisterende data
}

export const PRODUCT_TYPES: Record<ProductTypeSlug, ProductTypeDefinition> = {
  saas: {
    slug: "saas",
    label: "SaaS",
    badgeClass: "bg-blue-50 text-blue-700 border-blue-200",
  },
  subscription: {
    slug: "subscription",
    label: "Abonnement",
    badgeClass: "bg-violet-50 text-violet-700 border-violet-200",
  },
  onetime: {
    slug: "onetime",
    label: "Éngangskøb",
    badgeClass: "bg-cyan-50 text-cyan-700 border-cyan-200",
  },
  consulting: {
    slug: "consulting",
    label: "Konsulentydelse",
    badgeClass: "bg-emerald-50 text-emerald-700 border-emerald-200",
  },
  bundle: {
    slug: "bundle",
    label: "Klippekort",
    badgeClass: "bg-rose-50 text-rose-700 border-rose-200",
  },
  hardware: {
    slug: "hardware",
    label: "Hardware",
    badgeClass: "bg-amber-50 text-amber-700 border-amber-200",
  },
  other: {
    slug: "other",
    label: "Andet",
    badgeClass: "bg-secondary text-muted-foreground border-border",
  },
  // Legacy — vises ikke i ny dropdown
  software_license: {
    slug: "software_license",
    label: "Software-licens",
    badgeClass: "bg-violet-50 text-violet-700 border-violet-200",
    legacy: true,
  },
  accessory: {
    slug: "accessory",
    label: "Tilbehør",
    badgeClass: "bg-slate-50 text-slate-700 border-slate-200",
    legacy: true,
  },
};

// Kun aktive (ikke legacy) typer til dropdown
export const PRODUCT_TYPE_LIST: ProductTypeDefinition[] = Object.values(PRODUCT_TYPES).filter((t) => !t.legacy);

export function getProductType(slug: string | null | undefined): ProductTypeDefinition | null {
  if (!slug) return null;
  return PRODUCT_TYPES[slug as ProductTypeSlug] ?? null;
}

/**
 * Sikker fallback til "other" hvis værdien ikke kendes (fx legacy "onetime" eller "subscription"
 * fra tidlige skema-iterationer).
 */
export function normalizeProductType(slug: string | null | undefined): ProductTypeSlug {
  if (slug && slug in PRODUCT_TYPES) return slug as ProductTypeSlug;
  return "other";
}
