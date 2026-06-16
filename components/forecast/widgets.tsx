/**
 * Forecast UI widgets — KPI-kort, confidence-badges, funnel-bars
 * Genbrugt paa tvaers af alle forecast-sider for konsistent look.
 */

import { type ReactNode } from "react";
import { TrendingUp, TrendingDown, Minus, Info } from "lucide-react";
import type { ConfidenceLevel } from "@/lib/forecast/confidence";
import { confidenceTone } from "@/lib/forecast/confidence";
import { formatCurrency } from "@/lib/utils";

// ─── KPI Card ──────────────────────────────────────────────────────────────

export function KpiCard({
  label, value, unit, sublabel, trend, icon: Icon, accentColor = "primary", confidence,
}: {
  label: string;
  value: string | number;
  unit?: string;
  sublabel?: string;
  trend?: { value: number; label?: string };
  icon?: any;
  accentColor?: "primary" | "emerald" | "amber" | "violet" | "blue" | "slate";
  confidence?: ConfidenceLevel;
}) {
  const colorMap: Record<string, { bg: string; text: string }> = {
    primary: { bg: "bg-primary/10",  text: "text-primary"  },
    emerald: { bg: "bg-emerald-500/10", text: "text-emerald-600" },
    amber:   { bg: "bg-amber-500/10",   text: "text-amber-600"   },
    violet:  { bg: "bg-violet-500/10",  text: "text-violet-600"  },
    blue:    { bg: "bg-blue-500/10",    text: "text-blue-600"    },
    slate:   { bg: "bg-slate-500/10",   text: "text-slate-600"   },
  };
  const c = colorMap[accentColor];

  return (
    <div className="bg-card border border-border rounded-xl p-4 hover:shadow-sm transition-shadow">
      <div className="flex items-start justify-between mb-3">
        <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">{label}</p>
        {Icon && (
          <div className={`w-7 h-7 rounded-lg ${c.bg} flex items-center justify-center`}>
            <Icon className={`h-3.5 w-3.5 ${c.text}`} />
          </div>
        )}
      </div>
      <div className="flex items-baseline gap-1.5">
        <p className="text-2xl font-bold tabular-nums">{value}</p>
        {unit && <span className="text-sm text-muted-foreground">{unit}</span>}
      </div>
      {sublabel && <p className="text-xs text-muted-foreground mt-1">{sublabel}</p>}
      {trend && (
        <div className="flex items-center gap-1 mt-2 text-xs">
          {trend.value > 0 ? (
            <TrendingUp className="h-3 w-3 text-emerald-600" />
          ) : trend.value < 0 ? (
            <TrendingDown className="h-3 w-3 text-red-600" />
          ) : (
            <Minus className="h-3 w-3 text-muted-foreground" />
          )}
          <span className={trend.value > 0 ? "text-emerald-600" : trend.value < 0 ? "text-red-600" : "text-muted-foreground"}>
            {trend.value > 0 ? "+" : ""}{trend.value.toFixed(1)}%
          </span>
          {trend.label && <span className="text-muted-foreground">· {trend.label}</span>}
        </div>
      )}
      {confidence && <ConfidenceBadge level={confidence} className="mt-2" />}
    </div>
  );
}

// ─── Confidence Badge ──────────────────────────────────────────────────────

export function ConfidenceBadge({
  level, className = "",
}: {
  level: ConfidenceLevel;
  className?: string;
}) {
  const tone = confidenceTone(level.label);
  const styles: Record<string, string> = {
    success: "bg-emerald-50 text-emerald-700 border-emerald-200",
    info:    "bg-blue-50 text-blue-700 border-blue-200",
    warning: "bg-amber-50 text-amber-700 border-amber-200",
    muted:   "bg-slate-50 text-slate-600 border-slate-200",
  };
  return (
    <div className={`inline-flex items-start gap-1.5 text-[11px] px-2 py-1 rounded-md border ${styles[tone]} ${className}`}>
      <Info className="h-3 w-3 mt-0.5 shrink-0" />
      <div className="flex flex-col gap-0.5">
        <span className="font-medium">
          {level.label}{level.marginPct !== undefined && ` · ±${level.marginPct}%`}
        </span>
        <span className="opacity-80">{level.explanation}</span>
      </div>
    </div>
  );
}

// ─── Funnel bar ────────────────────────────────────────────────────────────

export function FunnelBar({
  label, count, value, percentage, isLast = false,
}: {
  label: string;
  count: number;
  value: number;
  /** Width-pct (0-100) */
  percentage: number;
  isLast?: boolean;
}) {
  const width = Math.max(5, Math.min(100, percentage));
  return (
    <div>
      <div className="flex items-center justify-between text-sm mb-1">
        <span className="font-medium">{label}</span>
        <span className="text-xs text-muted-foreground tabular-nums">
          {count} deals · {formatCurrency(value)}
        </span>
      </div>
      <div className="h-9 bg-secondary/30 rounded-lg overflow-hidden relative">
        <div
          className={`h-full rounded-lg transition-all ${isLast ? "bg-emerald-500/70" : "bg-primary/70"}`}
          style={{ width: `${width}%` }}
        />
        <div className="absolute inset-0 flex items-center px-3">
          <span className="text-xs font-semibold tabular-nums text-foreground">
            {percentage.toFixed(1)}%
          </span>
        </div>
      </div>
    </div>
  );
}

// ─── Section card ──────────────────────────────────────────────────────────

export function ForecastSection({
  title, subtitle, icon: Icon, children, action,
}: {
  title: string;
  subtitle?: string;
  icon?: any;
  children: ReactNode;
  action?: ReactNode;
}) {
  return (
    <section className="bg-card border border-border rounded-xl overflow-hidden">
      <header className="flex items-start justify-between gap-3 px-5 py-4 border-b border-border bg-secondary/10">
        <div className="flex items-start gap-3">
          {Icon && (
            <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
              <Icon className="h-4 w-4 text-primary" />
            </div>
          )}
          <div>
            <h2 className="text-sm font-semibold">{title}</h2>
            {subtitle && <p className="text-xs text-muted-foreground mt-0.5">{subtitle}</p>}
          </div>
        </div>
        {action}
      </header>
      <div className="p-5">{children}</div>
    </section>
  );
}
