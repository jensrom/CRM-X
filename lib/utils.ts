import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/**
 * Formater reference-ID — fx "T" + 42 → "T-0042"
 * Prefix kan være 1-4 bogstaver (A, SUP, TKT, …)
 * Nummeret zero-paddes til 4 cifre.
 */
export function formatRef(prefix: string, number: number): string {
  return `${prefix.toUpperCase()}-${String(number).padStart(4, "0")}`;
}

/**
 * Formater beløb i DKK
 */
export function formatCurrency(
  amount: number | null | undefined,
  currency = "DKK"
): string {
  if (amount == null) return "—";
  return new Intl.NumberFormat("da-DK", {
    style: "currency",
    currency,
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);
}

/**
 * Formater dato til dansk format
 */
export function formatDate(
  date: Date | string | null | undefined,
  options: Intl.DateTimeFormatOptions = {}
): string {
  if (!date) return "—";
  return new Intl.DateTimeFormat("da-DK", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    ...options,
  }).format(new Date(date));
}

/**
 * Formater minutter til læsbar tid (fx 90 → "1t 30m")
 */
export function formatDuration(minutes: number): string {
  if (minutes < 60) return `${minutes}m`;
  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;
  return mins > 0 ? `${hours}t ${mins}m` : `${hours}t`;
}

/**
 * Beregn resterende timer fra HourBundle.
 * Rundes til 1 decimal for at undgå float-aritmetik-fejl
 * (fx 40 - 38.3 = 1.7000000000000028 → vises som 1.7).
 */
export function bundleRemainingHours(
  totalHours: number,
  usedMinutes: number
): number {
  const remaining = totalHours - usedMinutes / 60;
  return Math.round(Math.max(0, remaining) * 10) / 10;
}

/**
 * Returnér initialer fra et navn
 */
export function getInitials(name: string): string {
  return name
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);
}

/**
 * Ticket status → dansk label + farve
 *
 * Nuværende statuses: open | pending_customer | pending_supplier | resolved | closed.
 * Legacy-aliasser (new, pending_reply) holdes som synonymer så gamle DB-rows
 * stadig renderes med en pæn label/badge i UI — de mappes også af
 * lib/ticket-status.ts.normalizeTicketStatus() ved filter-operationer.
 */
export const TICKET_STATUS = {
  open:              { label: "Åben",                color: "info" },
  pending_customer:  { label: "Afventer kunde",      color: "warning" },
  pending_supplier:  { label: "Afventer leverandør", color: "warning" },
  resolved:          { label: "Løst",                color: "success" },
  closed:            { label: "Lukket",              color: "muted" },
  // Legacy alias (uddødende — kun for at undgå "undefined" labels på gamle rows)
  new:               { label: "Åben",                color: "info" },
  pending_reply:     { label: "Afventer kunde",      color: "warning" },
} as const;

export const TICKET_PRIORITY = {
  low: { label: "Lav", color: "muted" },
  normal: { label: "Normal", color: "info" },
  high: { label: "Høj", color: "warning" },
  critical: { label: "Kritisk", color: "danger" },
} as const;

/**
 * Deal stage → dansk label
 */
export const DEAL_STAGES = {
  new: { label: "Ny", order: 0 },
  qualified: { label: "Kvalificeret", order: 1 },
  proposal: { label: "Tilbud sendt", order: 2 },
  negotiation: { label: "Forhandling", order: 3 },
  won: { label: "Vundet", order: 4 },
  lost: { label: "Tabt", order: 5 },
} as const;

/**
 * Prisinterval → dansk label
 */
export const PRICING_INTERVALS = {
  monthly: "Månedlig",
  quarterly: "Kvartalsvis",
  biannual: "Halvårlig",
  annual: "Årlig",
  onetime: "Engangsbeløb",
} as const;
