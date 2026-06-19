/**
 * SlaBadge — kompakt SLA-status visning til ticket-liste + detalje.
 *
 * Sizes:
 *   sm — chip i tabelrækker
 *   md — chip med label
 *   lg — fuld breakdown med to progress-bars (response + resolve)
 */

import { Clock, AlertTriangle, ShieldCheck, AlertCircle } from "lucide-react";
import { SLA_COLORS, formatMinutes, type SlaResult, type SlaStatus } from "@/lib/sla";

interface Props {
  result: SlaResult | null;
  size?: "sm" | "md" | "lg";
}

function iconFor(status: SlaStatus) {
  if (status === "met") return ShieldCheck;
  if (status === "ok") return ShieldCheck;
  if (status === "warning") return AlertCircle;
  if (status === "breach") return AlertTriangle;
  return Clock;
}

export function SlaBadge({ result, size = "md" }: Props) {
  if (!result || result.worst === "n/a") {
    if (size === "lg") return null;
    return (
      <span className="inline-flex items-center text-xs text-muted-foreground">
        — SLA
      </span>
    );
  }

  const colors = SLA_COLORS[result.worst];
  const Icon = iconFor(result.worst);

  if (size === "sm") {
    const remainingMin = Math.min(
      result.response.minutesRemaining ?? Infinity,
      result.resolve.minutesRemaining ?? Infinity,
    );
    return (
      <span
        title={`SLA ${colors.label} · ${remainingMin < Infinity ? formatMinutes(remainingMin) : "—"} resterer`}
        className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium ${colors.bg} ${colors.text}`}
      >
        <Icon className="h-2.5 w-2.5" />
        {remainingMin < Infinity ? formatMinutes(remainingMin) : colors.label}
      </span>
    );
  }

  if (size === "lg") {
    return (
      <div className={`rounded-xl border p-4 ${colors.bg} ${colors.border}`}>
        <div className="flex items-center gap-2 mb-3">
          <Icon className={`h-4 w-4 ${colors.text}`} />
          <span className={`text-sm font-semibold ${colors.text}`}>SLA · {colors.label}</span>
        </div>

        <SlaBar
          label="Første svar"
          status={result.response.status}
          percentElapsed={result.response.percentElapsed}
          minutesRemaining={result.response.minutesRemaining}
        />
        <div className="h-2" />
        <SlaBar
          label="Løsning"
          status={result.resolve.status}
          percentElapsed={result.resolve.percentElapsed}
          minutesRemaining={result.resolve.minutesRemaining}
        />
      </div>
    );
  }

  // md
  return (
    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium ${colors.bg} ${colors.text}`}>
      <Icon className="h-3 w-3" />
      SLA: {colors.label}
    </span>
  );
}

function SlaBar({
  label, status, percentElapsed, minutesRemaining,
}: {
  label: string; status: SlaStatus; percentElapsed: number; minutesRemaining: number | null;
}) {
  const barColor =
    status === "breach"  ? "bg-rose-500" :
    status === "warning" ? "bg-amber-500" :
    status === "met"     ? "bg-emerald-500" :
                           "bg-blue-500";
  const colors = SLA_COLORS[status];
  const remainingText =
    minutesRemaining == null ? "—" :
    status === "met"          ? `Overholdt` :
    status === "breach"       ? `Brudt for ${formatMinutes(-minutesRemaining)} siden` :
    `${formatMinutes(minutesRemaining)} tilbage`;

  return (
    <div>
      <div className="flex items-center justify-between text-xs mb-1">
        <span className={colors.text}>{label}</span>
        <span className={`tabular-nums ${colors.text}`}>{remainingText}</span>
      </div>
      <div className="h-1.5 bg-white/40 dark:bg-black/20 rounded-full overflow-hidden">
        <div
          className={`h-full rounded-full transition-all ${barColor}`}
          style={{ width: `${Math.min(100, percentElapsed)}%` }}
        />
      </div>
    </div>
  );
}
