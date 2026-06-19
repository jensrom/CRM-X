/**
 * lib/sla.ts — SLA status-beregning for support-tickets.
 *
 * Ren funktion. Tager ticket-tider + policy ind, returnerer status.
 *
 * Status pr. delmaal (response / resolve):
 *   "met"     — under tiden er overholdt (firstResponseAt eller resolvedAt sat fortid)
 *   "ok"      — under 80% af tiden er gaaet, ingen breach
 *   "warning" — over warningPct af tiden gaaet, men ikke breached
 *   "breach"  — tiden overskredet
 *   "n/a"     — ingen policy eller ikke relevant (lukket ticket)
 */

export interface SlaPolicy {
  priority: string;
  responseTimeMin: number;
  resolveTimeMin: number;
  warningPct: number;        // 0-100, fx 80
  isActive: boolean;
}

export interface SlaInput {
  createdAt: Date;
  firstResponseAt?: Date | null;
  resolvedAt?: Date | null;
  status: string;
  priority: string;
}

export type SlaStatus = "met" | "ok" | "warning" | "breach" | "n/a";

export interface SlaResult {
  response: {
    status: SlaStatus;
    dueAt: Date | null;
    minutesRemaining: number | null;  // negativ = overskredet
    percentElapsed: number;            // 0-100+
  };
  resolve: {
    status: SlaStatus;
    dueAt: Date | null;
    minutesRemaining: number | null;
    percentElapsed: number;
  };
  /** Den mest kritiske af de to — bruges som "samlet ticket-status" i UI. */
  worst: SlaStatus;
}

const MIN_MS = 60 * 1000;
const STATUS_RANK: Record<SlaStatus, number> = {
  "met": 0, "ok": 1, "n/a": 2, "warning": 3, "breach": 4,
};

function worstStatus(a: SlaStatus, b: SlaStatus): SlaStatus {
  return STATUS_RANK[a] >= STATUS_RANK[b] ? a : b;
}

export function getSlaStatus(
  input: SlaInput,
  policy: SlaPolicy | null,
  now: Date = new Date(),
): SlaResult {
  // Hvis policy mangler eller deaktiveret → n/a paa begge
  if (!policy || !policy.isActive) {
    return {
      response: { status: "n/a", dueAt: null, minutesRemaining: null, percentElapsed: 0 },
      resolve:  { status: "n/a", dueAt: null, minutesRemaining: null, percentElapsed: 0 },
      worst: "n/a",
    };
  }

  // RESPONSE
  const responseDue = new Date(input.createdAt.getTime() + policy.responseTimeMin * MIN_MS);
  let responseStatus: SlaStatus;
  let responseRem: number;
  let responsePct: number;

  if (input.firstResponseAt) {
    responseStatus = input.firstResponseAt <= responseDue ? "met" : "breach";
    responseRem = (responseDue.getTime() - input.firstResponseAt.getTime()) / MIN_MS;
    responsePct = ((input.firstResponseAt.getTime() - input.createdAt.getTime()) / (policy.responseTimeMin * MIN_MS)) * 100;
  } else {
    const elapsed = now.getTime() - input.createdAt.getTime();
    responsePct = (elapsed / (policy.responseTimeMin * MIN_MS)) * 100;
    responseRem = (responseDue.getTime() - now.getTime()) / MIN_MS;
    if (responseRem < 0) responseStatus = "breach";
    else if (responsePct >= policy.warningPct) responseStatus = "warning";
    else responseStatus = "ok";
  }

  // RESOLVE
  const resolveDue = new Date(input.createdAt.getTime() + policy.resolveTimeMin * MIN_MS);
  let resolveStatus: SlaStatus;
  let resolveRem: number;
  let resolvePct: number;

  // Hvis lukket -> baseret paa resolvedAt
  if (input.resolvedAt) {
    resolveStatus = input.resolvedAt <= resolveDue ? "met" : "breach";
    resolveRem = (resolveDue.getTime() - input.resolvedAt.getTime()) / MIN_MS;
    resolvePct = ((input.resolvedAt.getTime() - input.createdAt.getTime()) / (policy.resolveTimeMin * MIN_MS)) * 100;
  } else if (input.status === "closed" || input.status === "resolved") {
    // Hvis status er resolved men resolvedAt mangler → tag det som "met" forsigtigt
    resolveStatus = "met";
    resolveRem = 0;
    resolvePct = 100;
  } else {
    const elapsed = now.getTime() - input.createdAt.getTime();
    resolvePct = (elapsed / (policy.resolveTimeMin * MIN_MS)) * 100;
    resolveRem = (resolveDue.getTime() - now.getTime()) / MIN_MS;
    if (resolveRem < 0) resolveStatus = "breach";
    else if (resolvePct >= policy.warningPct) resolveStatus = "warning";
    else resolveStatus = "ok";
  }

  return {
    response: { status: responseStatus, dueAt: responseDue, minutesRemaining: responseRem, percentElapsed: Math.round(responsePct) },
    resolve:  { status: resolveStatus,  dueAt: resolveDue,  minutesRemaining: resolveRem,  percentElapsed: Math.round(resolvePct) },
    worst: worstStatus(responseStatus, resolveStatus),
  };
}

/** UI-helper: farver pr. status. */
export const SLA_COLORS: Record<SlaStatus, { bg: string; text: string; border: string; label: string }> = {
  "met":     { bg: "bg-emerald-100 dark:bg-emerald-900/30", text: "text-emerald-700 dark:text-emerald-300", border: "border-emerald-300 dark:border-emerald-800", label: "Overholdt" },
  "ok":      { bg: "bg-emerald-50 dark:bg-emerald-900/20",  text: "text-emerald-700 dark:text-emerald-300", border: "border-emerald-200 dark:border-emerald-900", label: "OK" },
  "warning": { bg: "bg-amber-100 dark:bg-amber-900/30",     text: "text-amber-800 dark:text-amber-300",     border: "border-amber-300 dark:border-amber-800",     label: "Advarsel" },
  "breach":  { bg: "bg-rose-100 dark:bg-rose-900/30",       text: "text-rose-700 dark:text-rose-300",       border: "border-rose-300 dark:border-rose-800",       label: "Brudt" },
  "n/a":     { bg: "bg-secondary/40",                       text: "text-muted-foreground",                  border: "border-border",                              label: "—" },
};

/** Format minutter til "2t 15m". Negative → "-1t 30m" (overskredet). */
export function formatMinutes(min: number): string {
  const abs = Math.abs(min);
  const h = Math.floor(abs / 60);
  const m = Math.round(abs % 60);
  const sign = min < 0 ? "-" : "";
  if (h === 0) return `${sign}${m}m`;
  if (m === 0) return `${sign}${h}t`;
  return `${sign}${h}t ${m}m`;
}
