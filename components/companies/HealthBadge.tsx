/**
 * HealthBadge — kompakt visning af kunde-health-score (0-100).
 *
 * 3 sizes:
 *  - "sm" (chip i lister)
 *  - "md" (standard)
 *  - "lg" (full kort med signaler + reasons)
 */

import { Heart, AlertTriangle, ShieldCheck, Activity } from "lucide-react";
import { HEALTH_COLORS, type HealthBreakdown } from "@/lib/health-score";

interface Props {
  score: number | null | undefined;
  signals?: any; // HealthBreakdown (gemt som Json i Company.healthSignals)
  size?: "sm" | "md" | "lg";
}

function levelFor(score: number): HealthBreakdown["level"] {
  if (score >= 80) return "healthy";
  if (score >= 60) return "ok";
  if (score >= 40) return "attention";
  return "risk";
}

function iconFor(level: HealthBreakdown["level"]) {
  if (level === "healthy") return ShieldCheck;
  if (level === "ok") return Heart;
  if (level === "attention") return Activity;
  return AlertTriangle;
}

export function HealthBadge({ score, signals, size = "md" }: Props) {
  if (score == null) {
    return (
      <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-xs font-medium bg-secondary/40 text-muted-foreground">
        — Ikke beregnet
      </span>
    );
  }

  const level = levelFor(score);
  const colors = HEALTH_COLORS[level];
  const Icon = iconFor(level);

  if (size === "sm") {
    return (
      <span
        title={`Helbreds-score ${score}/100 — ${colors.label}`}
        className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium tabular-nums ${colors.bg} ${colors.text}`}
      >
        <Icon className="h-3 w-3" />
        {score}
      </span>
    );
  }

  if (size === "lg") {
    const breakdown = (signals?.signals ?? {}) as HealthBreakdown["signals"];
    const reasons = (signals?.reasons ?? []) as string[];

    return (
      <div className={`rounded-xl border p-4 ${colors.bg} ${colors.border}`}>
        <div className="flex items-start justify-between mb-3">
          <div>
            <div className={`inline-flex items-center gap-1.5 text-xs font-medium ${colors.text} mb-1`}>
              <Icon className="h-3.5 w-3.5" />
              {colors.label}
            </div>
            <div className={`text-3xl font-bold tabular-nums ${colors.text}`}>
              {score}
              <span className="text-base font-normal opacity-60">/100</span>
            </div>
          </div>
        </div>

        {breakdown && Object.keys(breakdown).length > 0 && (
          <div className="space-y-1.5 mb-3">
            <SubBar label="Engagement" value={breakdown.engagement ?? 0} tone={level} />
            <SubBar label="Support"    value={breakdown.support ?? 0}    tone={level} />
            <SubBar label="Klippekort" value={breakdown.bundles ?? 0}    tone={level} />
            <SubBar label="Licenser"   value={breakdown.licenses ?? 0}   tone={level} />
            <SubBar label="Betaling"   value={breakdown.payment ?? 0}    tone={level} />
          </div>
        )}

        {reasons.length > 0 && (
          <div className={`text-xs ${colors.text} space-y-0.5 mt-2 pt-2 border-t ${colors.border}`}>
            {reasons.map((r, i) => (
              <div key={i} className="flex items-start gap-1.5">
                <span>•</span>
                <span>{r}</span>
              </div>
            ))}
          </div>
        )}
      </div>
    );
  }

  // md (default)
  return (
    <span
      className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium ${colors.bg} ${colors.text}`}
    >
      <Icon className="h-3.5 w-3.5" />
      <span className="tabular-nums">{score}</span>
      <span className="opacity-70">{colors.label}</span>
    </span>
  );
}

function SubBar({ label, value, tone }: { label: string; value: number; tone: HealthBreakdown["level"] }) {
  const barColor =
    value >= 80 ? "bg-emerald-500" :
    value >= 60 ? "bg-blue-500" :
    value >= 40 ? "bg-amber-500" : "bg-rose-500";
  const colors = HEALTH_COLORS[tone];
  return (
    <div className="flex items-center gap-2 text-xs">
      <span className={`w-20 ${colors.text} opacity-80`}>{label}</span>
      <div className="flex-1 h-1.5 bg-white/40 dark:bg-black/20 rounded-full overflow-hidden">
        <div className={`h-full rounded-full ${barColor}`} style={{ width: `${Math.min(100, value)}%` }} />
      </div>
      <span className={`tabular-nums w-7 text-right ${colors.text}`}>{value}</span>
    </div>
  );
}
