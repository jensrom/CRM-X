import { getStatusDefinition, daysUntil, type TenantStatus } from "@/lib/tenant-status";
import { cn } from "@/lib/utils";

interface Props {
  status: TenantStatus | string | null | undefined;
  trialEndsAt?: Date | string | null;
  scheduledDeletionAt?: Date | string | null;
  /** Vis kun farve-prik + label (kompakt) */
  compact?: boolean;
  className?: string;
}

/**
 * Visuel status-indikator for en tenant. Viser farve, label og
 * en relevant deadline (trial udløber / sletning om X dage) hvor det giver mening.
 */
export function TenantStatusBadge({
  status,
  trialEndsAt,
  scheduledDeletionAt,
  compact = false,
  className,
}: Props) {
  const def = getStatusDefinition(status);

  let countdown: string | null = null;
  if (def.slug === "trial" && trialEndsAt) {
    const days = daysUntil(trialEndsAt);
    if (days !== null) {
      countdown = days < 0
        ? `udløbet for ${Math.abs(days)} d.`
        : days === 0
        ? "udløber i dag"
        : `${days} d. tilbage`;
    }
  } else if (def.slug === "scheduled_deletion" && scheduledDeletionAt) {
    const days = daysUntil(scheduledDeletionAt);
    if (days !== null) {
      countdown = days <= 0 ? "slettes nu" : `slettes om ${days} d.`;
    }
  }

  if (compact) {
    return (
      <span className={cn("inline-flex items-center gap-1.5 text-xs", className)}>
        <span className={cn("w-1.5 h-1.5 rounded-full", def.dotClass)} aria-hidden />
        <span className="font-medium text-foreground">{def.label}</span>
        {countdown && <span className="text-muted-foreground">· {countdown}</span>}
      </span>
    );
  }

  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 text-[11px] font-medium px-2 py-0.5 rounded-full",
        def.badgeClass,
        className
      )}
    >
      <span className={cn("w-1.5 h-1.5 rounded-full", def.dotClass)} aria-hidden />
      {def.label}
      {countdown && <span className="opacity-80">· {countdown}</span>}
    </span>
  );
}
