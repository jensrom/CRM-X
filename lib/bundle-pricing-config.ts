/**
 * Bundle-pricing constants — kan importeres fra server, client og config.
 *
 * Holder konstanter i en ren modul-fil (ikke "use server") så vi undgår
 * Next.js' regel om kun async-eksporter i Server Action-filer.
 */

/**
 * Default-timepris der bruges hvis en tenant ikke har defineret egne pris-trin.
 * Plesner Techs standard sats er 1300 kr/time.
 */
export const DEFAULT_BUNDLE_HOURLY_RATE = 1300;

/** Visnings-etikette når default-prisen bruges. */
export const DEFAULT_BUNDLE_LABEL = "Standardpris";
