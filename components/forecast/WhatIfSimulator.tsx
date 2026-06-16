"use client";

/**
 * What-If Simulator — interaktiv klient-komponent
 * ────────────────────────────────────────────────
 * Brugeren skubber paa sliderne, og resultatet omberegnes live.
 * Baselinen kommer fra serveren (historiske data fra de seneste 12 mdr).
 */

import { useState, useMemo } from "react";
import type { WhatIfBaseline, WhatIfAdjustments } from "@/lib/forecast/what-if";
import { runWhatIf, ZERO_ADJUSTMENTS } from "@/lib/forecast/what-if";
import { formatCurrency } from "@/lib/utils";
import { RotateCcw, TrendingUp, TrendingDown, Sparkles } from "lucide-react";

export function WhatIfSimulator({ baseline }: { baseline: WhatIfBaseline }) {
  const [adj, setAdj] = useState<WhatIfAdjustments>(ZERO_ADJUSTMENTS);
  const result = useMemo(() => runWhatIf(baseline, adj), [baseline, adj]);

  const set = <K extends keyof WhatIfAdjustments>(k: K) => (v: number) =>
    setAdj((a) => ({ ...a, [k]: v }));
  const reset = () => setAdj(ZERO_ADJUSTMENTS);

  const isAnyAdjustment = Object.values(adj).some((v) => v !== 0);

  return (
    <div className="grid grid-cols-1 lg:grid-cols-5 gap-5">
      {/* VENSTRE: sliders */}
      <div className="lg:col-span-3 space-y-5">
        <div className="bg-card border border-border rounded-xl p-5">
          <header className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-sm font-semibold">Skru på parametre</h3>
              <p className="text-xs text-muted-foreground">Baseline er sidste 12 mdr · ændringer er rel. eller pct-point</p>
            </div>
            {isAnyAdjustment && (
              <button
                onClick={reset}
                className="text-xs text-muted-foreground hover:text-foreground flex items-center gap-1.5"
              >
                <RotateCcw className="h-3 w-3" />
                Nulstil
              </button>
            )}
          </header>

          <div className="space-y-5">
            <Slider
              label="Antal leads pr. måned"
              suffix="% justering"
              value={adj.leadsPerMonthDelta}
              baselineValue={`baseline: ${baseline.leadsPerMonth.toFixed(1)}/mdr`}
              min={-50} max={100} step={5}
              onChange={set("leadsPerMonthDelta")}
              isPercent
            />
            <Slider
              label="Lead → Deal konvertering"
              suffix="pct-point"
              value={adj.leadToDealDelta}
              baselineValue={`baseline: ${baseline.leadToDeal.toFixed(1)}%`}
              min={-20} max={30} step={1}
              onChange={set("leadToDealDelta")}
            />

            <div className="pt-4 border-t border-border">
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-3">
                Stadie-konvertering (pct-point)
              </p>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-x-5 gap-y-4">
                <Slider
                  label="Ny → Kvalificeret"
                  value={adj.newToQualifiedDelta}
                  baselineValue={`baseline: ${baseline.newToQualified.toFixed(1)}%`}
                  min={-20} max={30} step={1}
                  onChange={set("newToQualifiedDelta")}
                  compact
                />
                <Slider
                  label="Kvalificeret → Tilbud"
                  value={adj.qualifiedToProposalDelta}
                  baselineValue={`baseline: ${baseline.qualifiedToProposal.toFixed(1)}%`}
                  min={-20} max={30} step={1}
                  onChange={set("qualifiedToProposalDelta")}
                  compact
                />
                <Slider
                  label="Tilbud → Forhandling"
                  value={adj.proposalToNegotiationDelta}
                  baselineValue={`baseline: ${baseline.proposalToNegotiation.toFixed(1)}%`}
                  min={-20} max={30} step={1}
                  onChange={set("proposalToNegotiationDelta")}
                  compact
                />
                <Slider
                  label="Forhandling → Vundet"
                  value={adj.negotiationToWonDelta}
                  baselineValue={`baseline: ${baseline.negotiationToWon.toFixed(1)}%`}
                  min={-20} max={30} step={1}
                  onChange={set("negotiationToWonDelta")}
                  compact
                />
              </div>
            </div>

            <div className="pt-4 border-t border-border grid grid-cols-1 md:grid-cols-2 gap-5">
              <Slider
                label="Gennemsnitlig deal-værdi"
                suffix="% justering"
                value={adj.avgDealValueDelta}
                baselineValue={`baseline: ${formatCurrency(baseline.avgDealValue)}`}
                min={-50} max={100} step={5}
                onChange={set("avgDealValueDelta")}
                isPercent
              />
              <Slider
                label="Sales cycle længde"
                suffix="% justering"
                value={adj.avgCycleDaysDelta}
                baselineValue={`baseline: ${baseline.avgCycleDays.toFixed(0)} dage`}
                min={-50} max={100} step={5}
                onChange={set("avgCycleDaysDelta")}
                isPercent
                reverseColors
              />
            </div>
          </div>
        </div>
      </div>

      {/* HØJRE: live result */}
      <div className="lg:col-span-2">
        <div className="bg-gradient-to-br from-violet-50 to-emerald-50 border border-violet-200 rounded-xl p-5 sticky top-4">
          <div className="flex items-center gap-2 mb-1">
            <Sparkles className="h-4 w-4 text-violet-700" />
            <h3 className="text-sm font-semibold">Live projektion</h3>
          </div>
          <p className="text-xs text-muted-foreground mb-4">
            Annualiseret effekt af dine justeringer
          </p>

          <div className="space-y-4">
            <ResultRow
              label="Vundne deals/måned"
              before={result.monthlyWonDealsBaseline.toFixed(2)}
              after={result.monthlyWonDealsAdjusted.toFixed(2)}
            />
            <ResultRow
              label="Omsætning/måned"
              before={formatCurrency(result.monthlyRevenueBaseline)}
              after={formatCurrency(result.monthlyRevenueAdjusted)}
            />
          </div>

          <div className="mt-5 pt-4 border-t border-violet-200">
            <p className="text-xs text-muted-foreground mb-1">Årlig effekt</p>
            <div className="flex items-baseline gap-2">
              <p className={`text-3xl font-bold tabular-nums ${
                result.annualImpact >= 0 ? "text-emerald-700" : "text-red-700"
              }`}>
                {result.annualImpact >= 0 ? "+" : ""}{formatCurrency(result.annualImpact)}
              </p>
            </div>
            <div className="flex items-center gap-1 mt-1 text-sm">
              {result.annualImpactPct >= 0 ? (
                <TrendingUp className="h-3.5 w-3.5 text-emerald-600" />
              ) : (
                <TrendingDown className="h-3.5 w-3.5 text-red-600" />
              )}
              <span className={result.annualImpactPct >= 0 ? "text-emerald-700" : "text-red-700"}>
                {result.annualImpactPct >= 0 ? "+" : ""}{result.annualImpactPct.toFixed(1)}% vs. baseline
              </span>
            </div>
          </div>

          <p className="text-[11px] text-muted-foreground mt-4 leading-relaxed">
            Modellen antager lineær effekt af hver parameter. I praksis interagerer
            parametrene (flere leads + bedre konvertering = exponentiel vækst).
            Resultatet er bevidst konservativt.
          </p>
        </div>
      </div>
    </div>
  );
}

// ─── Slider primitive ──────────────────────────────────────────────────────

function Slider({
  label, suffix, value, baselineValue, min, max, step, onChange, isPercent = false, compact = false, reverseColors = false,
}: {
  label: string;
  suffix?: string;
  value: number;
  baselineValue: string;
  min: number; max: number; step: number;
  onChange: (v: number) => void;
  isPercent?: boolean;
  compact?: boolean;
  reverseColors?: boolean;
}) {
  const isPositive = value > 0;
  const isNegative = value < 0;
  // For 'reverseColors' (eks. sales cycle) er "kortere" godt - så negativ delta = grønt
  const goodColor = reverseColors ? (isNegative ? "text-emerald-700" : isPositive ? "text-red-700" : "text-muted-foreground")
                                  : (isPositive ? "text-emerald-700" : isNegative ? "text-red-700" : "text-muted-foreground");

  return (
    <div>
      <div className="flex items-center justify-between mb-1.5">
        <label className={`${compact ? "text-xs" : "text-sm"} font-medium`}>{label}</label>
        <span className={`text-xs font-semibold tabular-nums ${goodColor}`}>
          {value > 0 ? "+" : ""}{value}{isPercent ? "%" : suffix ? "" : ""}
          {suffix && <span className="text-muted-foreground ml-0.5">{suffix}</span>}
        </span>
      </div>
      <input
        type="range"
        min={min} max={max} step={step}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        className="w-full h-1.5 bg-secondary rounded-lg appearance-none cursor-pointer accent-primary"
      />
      <p className="text-[10px] text-muted-foreground mt-0.5">{baselineValue}</p>
    </div>
  );
}

function ResultRow({ label, before, after }: { label: string; before: string; after: string }) {
  return (
    <div>
      <p className="text-xs text-muted-foreground">{label}</p>
      <div className="flex items-center gap-2 mt-0.5">
        <span className="text-sm text-muted-foreground tabular-nums line-through">{before}</span>
        <span className="text-sm">→</span>
        <span className="text-base font-semibold tabular-nums">{after}</span>
      </div>
    </div>
  );
}
