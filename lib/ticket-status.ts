/**
 * CRM-X — Ticket-status helpers
 *
 * UI bruger 5 statuses: open | pending_customer | pending_supplier | resolved | closed
 * (defineret i lib/utils.ts → TICKET_STATUS).
 *
 * Tidligere skema brugte: new | open | pending_reply | resolved | closed.
 * For at undgå en risikabel data-migration mapper vi legacy-værdier on-read.
 */

export type TicketStatusSlug =
  | "open"
  | "pending_customer"
  | "pending_supplier"
  | "resolved"
  | "closed";

export const TICKET_STATUS_LIST: { value: TicketStatusSlug; label: string }[] = [
  { value: "open", label: "Åben" },
  { value: "pending_customer", label: "Afventer kunde" },
  { value: "pending_supplier", label: "Afventer leverandør" },
  { value: "resolved", label: "Løst" },
  { value: "closed", label: "Lukket" },
];

/**
 * Mapping fra legacy-værdier til nuværende UI-værdier.
 * - "new" og fraværende status → "open"  (tilsvarer "ny åben ticket")
 * - "pending_reply" → "pending_customer" (standard antagelse: ventede svar fra kunden)
 */
const LEGACY_MAP: Record<string, TicketStatusSlug> = {
  new: "open",
  pending_reply: "pending_customer",
};

export function normalizeTicketStatus(raw: string | null | undefined): TicketStatusSlug {
  if (!raw) return "open";
  if (raw in LEGACY_MAP) return LEGACY_MAP[raw];
  // Hvis værdien allerede er en gyldig status, returnér den
  const isCurrent = TICKET_STATUS_LIST.some((s) => s.value === raw);
  return isCurrent ? (raw as TicketStatusSlug) : "open";
}

/**
 * Liste af statuses som tæller som "åben/aktiv" i KPI-beregninger.
 */
export const ACTIVE_TICKET_STATUSES: TicketStatusSlug[] = [
  "open",
  "pending_customer",
  "pending_supplier",
];

/**
 * Inkluderer legacy-værdier — bruges når man bygger Prisma where-filter
 * og vil finde alle aktive tickets, også gamle "new"/"pending_reply" rows.
 */
export const ACTIVE_TICKET_STATUSES_WITH_LEGACY: string[] = [
  ...ACTIVE_TICKET_STATUSES,
  "new",
  "pending_reply",
];
