/**
 * Tenant-livscyklus
 *
 * Status-flow:
 *   trial → active            (betaling bekræftet)
 *   trial → suspended         (trial udløbet uden betaling, manuel)
 *   active → suspended        (manuel — fx ved manglende betaling)
 *   suspended → active        (genaktivér)
 *   suspended → scheduled_deletion  (planlæg sletning efter 30 dage)
 *   scheduled_deletion → suspended  (fortryd sletning)
 *   scheduled_deletion → deleted    (cron efter 60 dage = 90 dage i alt)
 *
 * Dataeksport er tilgængelig hele cooldown-perioden (suspended + scheduled_deletion).
 */

export const TENANT_STATUSES = [
  "trial",
  "active",
  "suspended",
  "scheduled_deletion",
  "deleted",
] as const;

export type TenantStatus = (typeof TENANT_STATUSES)[number];

export interface StatusDefinition {
  slug: TenantStatus;
  label: string;
  description: string;
  /** Tailwind class-set til badge */
  badgeClass: string;
  /** Tailwind class-set til dot-indikator */
  dotClass: string;
  /** Beskrivelse af hvad data-tilgang er i denne status */
  dataAccess:
    | "full"      // alt fungerer
    | "read_only" // tenant kan kun læse
    | "export_only" // kun super-admin kan eksportere
    | "purged";   // data slettet
}

export const STATUS_DEFINITIONS: Record<TenantStatus, StatusDefinition> = {
  trial: {
    slug: "trial",
    label: "Trial",
    description: "Gratis prøveperiode aktiv",
    badgeClass: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300",
    dotClass: "bg-blue-500",
    dataAccess: "full",
  },
  active: {
    slug: "active",
    label: "Aktiv",
    description: "Betalt kunde, fuld funktionalitet",
    badgeClass: "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300",
    dotClass: "bg-emerald-500",
    dataAccess: "full",
  },
  suspended: {
    slug: "suspended",
    label: "Suspenderet",
    description: "Adgang midlertidigt sat på pause. Data bevaret",
    badgeClass: "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300",
    dotClass: "bg-amber-500",
    dataAccess: "export_only",
  },
  scheduled_deletion: {
    slug: "scheduled_deletion",
    label: "Til sletning",
    description: "Planlagt slettet — kan stadig fortrydes",
    badgeClass: "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300",
    dotClass: "bg-red-500",
    dataAccess: "export_only",
  },
  deleted: {
    slug: "deleted",
    label: "Slettet",
    description: "Data slettet endeligt",
    badgeClass: "bg-slate-200 text-slate-700 dark:bg-slate-700/40 dark:text-slate-300",
    dotClass: "bg-slate-500",
    dataAccess: "purged",
  },
};

export function getStatusDefinition(status: string | null | undefined): StatusDefinition {
  if (!status) return STATUS_DEFINITIONS.trial;
  return STATUS_DEFINITIONS[status as TenantStatus] ?? STATUS_DEFINITIONS.trial;
}

/**
 * Cool-down-perioder for tilstandsskift.
 */
export const LIFECYCLE_TIMING = {
  /** Hvor lang tid en suspenderet tenant venter før den må planlægges slettet (dage). */
  suspendedBeforeDeletionScheduling: 0, // 0 = må gøres med det samme; ændres til 30 hvis vi vil håndhæve
  /** Cool-down efter scheduledDeletion før hard-purge (dage). */
  scheduledDeletionCooldown: 60,
  /** Trial-længde (dage) — bruges hvis trialEndsAt ikke er sat. */
  trialDefaultDays: 14,
} as const;

/**
 * Beregn antal dage tilbage til en deadline. Negativ værdi = overskredet.
 */
export function daysUntil(date: Date | string | null | undefined): number | null {
  if (!date) return null;
  const target = new Date(date).getTime();
  if (Number.isNaN(target)) return null;
  const diff = target - Date.now();
  return Math.ceil(diff / (24 * 60 * 60 * 1000));
}

/**
 * Hvilke handlinger der er gyldige fra den aktuelle status.
 */
export function getAllowedTransitions(status: TenantStatus): TenantStatus[] {
  switch (status) {
    case "trial":
      return ["active", "suspended"];
    case "active":
      return ["suspended"];
    case "suspended":
      return ["active", "scheduled_deletion"];
    case "scheduled_deletion":
      return ["suspended"]; // fortryd sletning; hard-purge sker via cron
    case "deleted":
      return [];
    default:
      return [];
  }
}
