/**
 * i18n — bruger-individuelle sprog
 * ────────────────────────────────
 * Per-user UI-sprog gemt på User.language (ISO 639-1).
 *
 * Arkitektur (bevidst simpel — undgaar tunge i18n-libs):
 *   • Translations-dict mapper key → { da, en } osv.
 *   • t(key, locale) returnerer rette streng eller falder tilbage til "da"
 *   • Server-komponenter henter locale fra session.user.language eller default
 *   • Client-komponenter får locale som prop
 *
 * Tilfoej nye sprog ved at udvide LOCALES og hver entry i TRANSLATIONS.
 * Tilfoej nye keys i TRANSLATIONS — TypeScript checker giver kompile-fejl
 * hvis en oversaettelse mangler.
 */

export type LocaleSlug = "da" | "en";

export const LOCALES: { slug: LocaleSlug; label: string; flag: string }[] = [
  { slug: "da", label: "Dansk",   flag: "🇩🇰" },
  { slug: "en", label: "English", flag: "🇬🇧" },
];

export const DEFAULT_LOCALE: LocaleSlug = "da";

/** Type-sikker oversaettelses-dict — alle keys skal have alle locales */
type TranslationDict = Record<string, Record<LocaleSlug, string>>;

export const TRANSLATIONS: TranslationDict = {
  // ─── Sidebar sektioner ────────────────────────────────
  "nav.section.overview":     { da: "Overblik",         en: "Overview" },
  "nav.section.customers":    { da: "Kunder",           en: "Customers" },
  "nav.section.sales":        { da: "Salg",             en: "Sales" },
  "nav.section.marketing":    { da: "Marketing",        en: "Marketing" },
  "nav.section.tech":         { da: "Teknik",           en: "Tech" },
  "nav.section.products":     { da: "Produkt & Licens", en: "Product & License" },
  "nav.section.analytics":    { da: "Analyse",          en: "Analytics" },

  // ─── Sidebar items ────────────────────────────────────
  "nav.dashboard":         { da: "Dashboard",        en: "Dashboard" },
  "nav.customers":         { da: "Kunder",           en: "Customers" },
  "nav.contacts":          { da: "Kontakter",        en: "Contacts" },
  "nav.pipeline":          { da: "Pipeline",         en: "Pipeline" },
  "nav.quotes":            { da: "Tilbud",           en: "Quotes" },
  "nav.invoices":          { da: "Fakturaer",        en: "Invoices" },
  "nav.pricing":           { da: "Priser",           en: "Pricing" },
  "nav.campaigns":         { da: "Kampagner",        en: "Campaigns" },
  "nav.leads":             { da: "Leads",            en: "Leads" },
  "nav.tickets":           { da: "Support Tickets",  en: "Support Tickets" },
  "nav.projects":          { da: "Projekter",        en: "Projects" },
  "nav.klippekort":        { da: "Klippekort",       en: "Hour Bundles" },
  "nav.time":              { da: "Tidsregistrering", en: "Time Tracking" },
  "nav.products":          { da: "Produkter",        en: "Products" },
  "nav.licenses":          { da: "Licenser",         en: "Licenses" },
  "nav.reports":           { da: "Rapporter",        en: "Reports" },
  "nav.settings":          { da: "Indstillinger",    en: "Settings" },
  "nav.logout":            { da: "Log ud",           en: "Log out" },

  // ─── Dashboard ────────────────────────────────────────
  "dashboard.greeting.morning":   { da: "God morgen",   en: "Good morning" },
  "dashboard.greeting.afternoon": { da: "God eftermiddag", en: "Good afternoon" },
  "dashboard.greeting.evening":   { da: "God aften",    en: "Good evening" },
  "dashboard.subtitle":           { da: "Her er et overblik over din dag", en: "Here's an overview of your day" },

  // ─── Settings — sprog-vælger ──────────────────────────
  "settings.profile.language":         { da: "Sprog",                       en: "Language" },
  "settings.profile.language.help":    { da: "UI-sprog kun for din bruger.", en: "UI language for your user only." },
  "settings.profile.language.saved":   { da: "Sprog gemt",                  en: "Language saved" },

  // ─── Generelt ─────────────────────────────────────────
  "common.save":   { da: "Gem",       en: "Save" },
  "common.cancel": { da: "Annullér",  en: "Cancel" },
  "common.delete": { da: "Slet",      en: "Delete" },
  "common.edit":   { da: "Rediger",   en: "Edit" },
  "common.create": { da: "Opret",     en: "Create" },
  "common.search": { da: "Søg",       en: "Search" },
  "common.back":   { da: "Tilbage",   en: "Back" },
};

/**
 * Oversaet en key til den givne locale.
 * Fallback-rækkefoelge: locale → da → key (saa man tydeligt kan se hvad mangler)
 */
export function t(key: string, locale: LocaleSlug = DEFAULT_LOCALE): string {
  const entry = TRANSLATIONS[key];
  if (!entry) return key; // Mangler oversaettelse — vis key direkte saa det springer i oejnene
  return entry[locale] ?? entry[DEFAULT_LOCALE] ?? key;
}

/**
 * Normalisér en sprog-string fra DB til en gyldig LocaleSlug.
 * Bruges naar vi haenter user.language og skal vaere robuste overfor
 * gamle eller forkerte vaerdier.
 */
export function normalizeLocale(raw: string | null | undefined): LocaleSlug {
  if (!raw) return DEFAULT_LOCALE;
  const lower = raw.toLowerCase().slice(0, 2);
  return (LOCALES.some((l) => l.slug === lower) ? lower : DEFAULT_LOCALE) as LocaleSlug;
}
