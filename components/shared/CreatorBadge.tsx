/**
 * CreatorBadge
 * ────────────
 * Server-komponent der viser hvem der oprettede en ressource.
 *
 * Variation:
 *   • Normal:        "Oprettet af Erik · 15.06.2026"
 *   • Impersonation: "Oprettet af Erik (admintenant-Jens) · 15.06.2026"
 *
 * Når createdByImpersonatorId er sat, vises super-admin'en eksplicit med
 * præfiks "admintenant-" som brugeren bad om. Det giver ALTID synligt
 * traceback paa hvem der reelt udfoerte handlingen.
 *
 * Hvis intet createdById er sat (legacy data) viser badge'n bare datoen.
 */

import { User, Shield } from "lucide-react";
import { formatDate } from "@/lib/utils";
import { resolveCreatorLabels } from "@/lib/creator-context";

interface Props {
  createdById?: string | null;
  createdByImpersonatorId?: string | null;
  createdAt?: Date | string | null;
  /** Kompakt visning (kun ikon + navn, ingen "Oprettet af"-prefiks) */
  compact?: boolean;
  /** Ekstra className */
  className?: string;
}

export async function CreatorBadge({
  createdById,
  createdByImpersonatorId,
  createdAt,
  compact = false,
  className = "",
}: Props) {
  // Legacy data uden gemt opretter — vis tydeligt at navnet ikke er kendt
  // saa brugeren forstaar at badge'n ER der, men informationen mangler.
  // Nye oprettelser efter creator-traceback-migration vil have createdById sat.
  if (!createdById && !createdByImpersonatorId) {
    if (!createdAt) return null;
    return (
      <span className={`inline-flex items-center gap-1.5 text-xs text-muted-foreground ${className}`}>
        <User className="h-3 w-3 shrink-0 opacity-50" />
        <span>
          {compact ? "" : "Oprettet af "}
          <span className="italic opacity-70">ukendt</span>
          {" · "}{formatDate(createdAt)}
        </span>
      </span>
    );
  }

  const { primaryName, impersonatorName } = await resolveCreatorLabels(
    createdById,
    createdByImpersonatorId,
  );

  const dateStr = createdAt ? formatDate(createdAt) : null;
  const isImpersonated = !!impersonatorName;

  return (
    <span
      className={`inline-flex items-center gap-1.5 text-xs ${
        isImpersonated ? "text-amber-700" : "text-muted-foreground"
      } ${className}`}
      title={
        isImpersonated
          ? `Oprettet af ${primaryName ?? "?"} mens super-admin ${impersonatorName} var aktiv som impersonator`
          : undefined
      }
    >
      {isImpersonated ? (
        <Shield className="h-3 w-3 shrink-0" />
      ) : (
        <User className="h-3 w-3 shrink-0" />
      )}
      <span>
        {compact ? "" : "Oprettet af "}
        <span className="font-medium text-foreground">{primaryName ?? "ukendt"}</span>
        {isImpersonated && (
          <>
            {" "}
            <span className="text-amber-700">
              (admintenant-<span className="font-medium">{impersonatorName}</span>)
            </span>
          </>
        )}
        {dateStr && (
          <>
            {" · "}
            <span>{dateStr}</span>
          </>
        )}
      </span>
    </span>
  );
}
