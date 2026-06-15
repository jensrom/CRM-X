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

export type LocaleSlug = "da" | "en" | "sv" | "no" | "de";

export const LOCALES: { slug: LocaleSlug; label: string; flag: string }[] = [
  { slug: "da", label: "Dansk",    flag: "🇩🇰" },
  { slug: "en", label: "English",  flag: "🇬🇧" },
  { slug: "sv", label: "Svenska",  flag: "🇸🇪" },
  { slug: "no", label: "Norsk",    flag: "🇳🇴" },
  { slug: "de", label: "Deutsch",  flag: "🇩🇪" },
];

export const DEFAULT_LOCALE: LocaleSlug = "da";

/** Type-sikker oversaettelses-dict — alle keys skal have alle locales */
type TranslationDict = Record<string, Record<LocaleSlug, string>>;

export const TRANSLATIONS: TranslationDict = {
  // ─── Sidebar sektioner ────────────────────────────────
  "nav.section.overview":     { da: "Overblik", en: "Overview", sv: "Översikt", no: "Oversikt", de: "Übersicht" },
  "nav.section.customers":    { da: "Kunder", en: "Customers", sv: "Kunder", no: "Kunder", de: "Kunden" },
  "nav.section.sales":        { da: "Salg", en: "Sales", sv: "Försäljning", no: "Salg", de: "Vertrieb" },
  "nav.section.marketing":    { da: "Marketing", en: "Marketing", sv: "Marknadsföring", no: "Markedsføring", de: "Marketing" },
  "nav.section.tech":         { da: "Teknik", en: "Tech", sv: "Teknik", no: "Teknikk", de: "Technik" },
  "nav.section.products":     { da: "Produkt & Licens", en: "Product & License", sv: "Produkt & Licens", no: "Produkt & Lisens", de: "Produkt & Lizenz" },
  "nav.section.analytics":    { da: "Analyse", en: "Analytics", sv: "Analys", no: "Analyse", de: "Analyse" },

  // ─── Sidebar items ────────────────────────────────────
  "nav.dashboard":         { da: "Dashboard", en: "Dashboard", sv: "Dashboard", no: "Dashboard", de: "Dashboard" },
  "nav.customers":         { da: "Kunder", en: "Customers", sv: "Kunder", no: "Kunder", de: "Kunden" },
  "nav.contacts":          { da: "Kontakter", en: "Contacts", sv: "Kontakter", no: "Kontakter", de: "Kontakte" },
  "nav.pipeline":          { da: "Pipeline", en: "Pipeline", sv: "Pipeline", no: "Pipeline", de: "Pipeline" },
  "nav.quotes":            { da: "Tilbud", en: "Quotes", sv: "Offerter", no: "Tilbud", de: "Angebote" },
  "nav.invoices":          { da: "Fakturaer", en: "Invoices", sv: "Fakturor", no: "Fakturaer", de: "Rechnungen" },
  "nav.pricing":           { da: "Priser", en: "Pricing", sv: "Priser", no: "Priser", de: "Preise" },
  "nav.campaigns":         { da: "Kampagner", en: "Campaigns", sv: "Kampanjer", no: "Kampanjer", de: "Kampagnen" },
  "nav.leads":             { da: "Leads", en: "Leads", sv: "Leads", no: "Leads", de: "Leads" },
  "nav.tickets":           { da: "Support Tickets", en: "Support Tickets", sv: "Support-ärenden", no: "Support-saker", de: "Support-Tickets" },
  "nav.projects":          { da: "Projekter", en: "Projects", sv: "Projekt", no: "Prosjekter", de: "Projekte" },
  "nav.klippekort":        { da: "Klippekort", en: "Hour Bundles", sv: "Timpaket", no: "Klippekort", de: "Stundenpakete" },
  "nav.time":              { da: "Tidsregistrering", en: "Time Tracking", sv: "Tidsregistrering", no: "Timeregistrering", de: "Zeiterfassung" },
  "nav.products":          { da: "Produkter", en: "Products", sv: "Produkter", no: "Produkter", de: "Produkte" },
  "nav.licenses":          { da: "Licenser", en: "Licenses", sv: "Licenser", no: "Lisenser", de: "Lizenzen" },
  "nav.reports":           { da: "Rapporter", en: "Reports", sv: "Rapporter", no: "Rapporter", de: "Berichte" },
  "nav.settings":          { da: "Indstillinger", en: "Settings", sv: "Inställningar", no: "Innstillinger", de: "Einstellungen" },
  "nav.logout":            { da: "Log ud", en: "Log out", sv: "Logga ut", no: "Logg ut", de: "Abmelden" },

  // ─── Dashboard ────────────────────────────────────────
  "dashboard.greeting.morning":   { da: "God morgen", en: "Good morning", sv: "God morgon", no: "God morgen", de: "Guten Morgen" },
  "dashboard.greeting.afternoon": { da: "God eftermiddag", en: "Good afternoon", sv: "God eftermiddag", no: "God ettermiddag", de: "Guten Tag" },
  "dashboard.greeting.evening":   { da: "God aften", en: "Good evening", sv: "God kväll", no: "God kveld", de: "Guten Abend" },
  "dashboard.subtitle":           { da: "Her er et overblik over din dag", en: "Here's an overview of your day", sv: "Här är en översikt över din dag", no: "Her er en oversikt over dagen din", de: "Hier ist ein Überblick über deinen Tag" },

  // ─── Settings — sprog-vælger ──────────────────────────
  "settings.profile.language":         { da: "Sprog", en: "Language", sv: "Språk", no: "Språk", de: "Sprache" },
  "settings.profile.language.help":    { da: "UI-sprog kun for din bruger.", en: "UI language for your user only.", sv: "UI-språk endast för din användare.", no: "UI-språk kun for din bruker.", de: "UI-Sprache nur für deinen Benutzer." },
  "settings.profile.language.saved":   { da: "Sprog gemt", en: "Language saved", sv: "Språk sparat", no: "Språk lagret", de: "Sprache gespeichert" },

  // ─── Generelt ─────────────────────────────────────────
  "common.save":   { da: "Gem", en: "Save", sv: "Spara", no: "Lagre", de: "Speichern" },
  "common.cancel": { da: "Annullér", en: "Cancel", sv: "Avbryt", no: "Avbryt", de: "Abbrechen" },
  "common.delete": { da: "Slet", en: "Delete", sv: "Radera", no: "Slett", de: "Löschen" },
  "common.edit":   { da: "Rediger", en: "Edit", sv: "Redigera", no: "Rediger", de: "Bearbeiten" },
  "common.create": { da: "Opret", en: "Create", sv: "Skapa", no: "Opprett", de: "Erstellen" },
  "common.search": { da: "Søg", en: "Search", sv: "Sök", no: "Søk", de: "Suchen" },
  "common.back":   { da: "Tilbage", en: "Back", sv: "Tillbaka", no: "Tilbake", de: "Zurück" },
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
