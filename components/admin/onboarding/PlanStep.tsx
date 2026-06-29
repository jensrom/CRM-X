"use client";

import { useEffect } from "react";
import { Sparkles, ArrowRight, ArrowLeft, Check, Info, TrendingUp, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  PLAN_LIST,
  PLANS,
  calculatePlanPrice,
  formatPrice,
  ADDON_PRICE_PER_USER,
  ADDON_LIST,
  isAddOnAvailable,
  getAddOnPricePerUser,
  type Currency,
  type PlanSlug,
  type AddOnSlug,
} from "@/lib/plans";
import { cn } from "@/lib/utils";
import type { WizardState } from "./OnboardingWizard";

const MODULE_LABELS: Record<string, string> = {
  sales: "Salg",
  marketing: "Marketing",
  support: "Support",
  projects: "Projekter",
  products: "Produkter",
  licenses: "Licenser",
};

interface Props {
  state: WizardState;
  update: <K extends keyof WizardState>(key: K, value: WizardState[K]) => void;
  currency: Currency;
  onNext: () => void;
  onPrev: () => void;
}

export function PlanStep({ state, update, currency, onNext, onPrev }: Props) {
  function selectPlan(slug: PlanSlug) {
    const plan = PLAN_LIST.find((p) => p.slug === slug);
    if (!plan) return;
    update("plan", slug);
    update("modules", [...plan.modules]);
    update("maxUsers", plan.defaultUserSeats);
  }

  const selectedPlan = PLAN_LIST.find((p) => p.slug === state.plan)!;
  const breakdown = calculatePlanPrice(
    state.plan as PlanSlug,
    state.modules,
    state.maxUsers,
    currency,
    (state.addOns ?? []) as AddOnSlug[],
  );

  function toggleAddOn(addOnSlug: AddOnSlug) {
    const current = state.addOns ?? [];
    const next = current.includes(addOnSlug)
      ? current.filter((a) => a !== addOnSlug)
      : [...current, addOnSlug];
    update("addOns", next);
  }

  // Når moduler trigger en plan-promote, hold state.plan i sync med effective plan
  useEffect(() => {
    if (breakdown.promoted && state.plan !== breakdown.effectivePlan) {
      update("plan", breakdown.effectivePlan);
    }
  }, [breakdown.promoted, breakdown.effectivePlan, state.plan, update]);

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl bg-amber-500/10 flex items-center justify-center">
          <Sparkles className="h-5 w-5 text-amber-600" />
        </div>
        <div>
          <h2 className="font-semibold">Vælg plan</h2>
          <p className="text-xs text-muted-foreground">
            Moduler følger planen — du kan tilpasse efter behov nedenfor.
          </p>
        </div>
      </div>

      {/* Plan-kort */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        {PLAN_LIST.map((plan) => {
          const isSelected = state.plan === plan.slug;
          return (
            <button
              key={plan.slug}
              type="button"
              onClick={() => selectPlan(plan.slug)}
              className={cn(
                "text-left p-5 rounded-xl border-2 transition-all relative",
                isSelected
                  ? "border-primary bg-primary/5 shadow-sm"
                  : "border-border hover:border-primary/40 bg-card"
              )}
            >
              {isSelected && (
                <div className="absolute top-3 right-3 w-6 h-6 rounded-full bg-primary text-primary-foreground flex items-center justify-center">
                  <Check className="h-3.5 w-3.5" />
                </div>
              )}
              <p className="font-semibold text-lg">{plan.name}</p>
              <p className="text-xs text-muted-foreground mb-3">{plan.tagline}</p>
              <p className="text-xl font-bold tabular-nums">
                {formatPrice(plan.pricePerUserMonth[currency], currency)}
                <span className="text-xs font-normal text-muted-foreground"> / bruger / md</span>
              </p>
              <ul className="mt-4 space-y-1.5 text-xs">
                {plan.highlights.map((h) => (
                  <li key={h} className="flex items-start gap-1.5">
                    <Check className="h-3 w-3 text-emerald-600 shrink-0 mt-0.5" />
                    <span className="text-muted-foreground">{h}</span>
                  </li>
                ))}
              </ul>
            </button>
          );
        })}
      </div>

      {/* Detaljer for valgt plan */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-foreground mb-1.5">
            Antal bruger-licenser
          </label>
          <input
            type="number"
            min="1"
            max="500"
            value={state.maxUsers}
            onChange={(e) => update("maxUsers", parseInt(e.target.value) || 1)}
            className="w-full px-3 py-2 rounded-lg border border-input bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring"
          />
          <p className="text-[11px] text-muted-foreground mt-1">
            Tenant-admin kan ikke oprette flere end dette antal aktive brugere.
          </p>
        </div>

        <div className="bg-secondary/30 border border-border rounded-lg p-4">
          <p className="text-[11px] text-muted-foreground uppercase tracking-wide font-semibold mb-1">
            Beregnet pris
          </p>
          <p className="text-2xl font-bold tabular-nums">
            {formatPrice(breakdown.monthlyTotal, currency)}
            <span className="text-xs font-normal text-muted-foreground"> / md</span>
          </p>
          <p className="text-[11px] text-muted-foreground mt-1 tabular-nums">
            {state.maxUsers} brugere × {formatPrice(breakdown.pricePerUserTotal, currency)}
            {breakdown.addonModules.length > 0 && (
              <> — heraf {formatPrice(breakdown.addonPricePerUser, currency)} add-ons</>
            )}
          </p>
        </div>
      </div>

      {/* Auto-promote-notification */}
      {breakdown.promoted && (
        <div className="flex items-start gap-3 p-3 bg-blue-50 dark:bg-blue-950/20 border border-blue-200 dark:border-blue-800 rounded-xl">
          <TrendingUp className="h-4 w-4 text-blue-600 shrink-0 mt-0.5" />
          <div className="text-sm">
            <p className="font-medium text-blue-900 dark:text-blue-200">
              Auto-opgraderet til {PLANS[breakdown.effectivePlan].name}
            </p>
            <p className="text-xs text-blue-800/80 dark:text-blue-300 mt-0.5">
              De valgte moduler dækker hele {PLANS[breakdown.effectivePlan].name}-pakken,
              som er billigere end {PLANS[state.plan as PlanSlug]?.name ?? "tidligere plan"} med add-ons.
            </p>
          </div>
        </div>
      )}

      {/* Trial-toggle */}
      <label className="flex items-start gap-3 p-4 rounded-lg border border-border cursor-pointer hover:bg-secondary/40 transition-colors">
        <input
          type="checkbox"
          checked={state.startWithTrial}
          onChange={(e) => update("startWithTrial", e.target.checked)}
          className="mt-0.5 accent-primary"
        />
        <div className="text-sm">
          <p className="font-medium">Start med 14 dages gratis prøveperiode</p>
          <p className="text-xs text-muted-foreground">
            Aktiverer fuld funktionalitet uden betaling. Tenanten suspenderes
            automatisk ved trial-udløb hvis ikke betalt.
          </p>
        </div>
      </label>

      {/* Named add-ons (Forecast etc.) */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <p className="text-sm font-medium">Tilkøbsmoduler (add-ons)</p>
          <p className="text-[11px] text-muted-foreground">Plan-afhængig pris pr. bruger</p>
        </div>
        <div className="space-y-2">
          {ADDON_LIST.map((addon) => {
            const planSlug = state.plan as PlanSlug;
            const available = isAddOnAvailable(addon.slug, planSlug);
            const price = getAddOnPricePerUser(addon.slug, planSlug, currency);
            const checked = (state.addOns ?? []).includes(addon.slug);
            return (
              <label
                key={addon.slug}
                className={cn(
                  "flex items-start gap-3 p-3 rounded-lg border transition-colors",
                  available
                    ? checked
                      ? "bg-amber-50 dark:bg-amber-950/30 border-amber-300 dark:border-amber-700 cursor-pointer"
                      : "bg-card border-border hover:bg-secondary/40 cursor-pointer"
                    : "bg-secondary/30 border-dashed border-border opacity-60 cursor-not-allowed",
                )}
              >
                <input
                  type="checkbox"
                  checked={checked}
                  disabled={!available}
                  onChange={() => available && toggleAddOn(addon.slug)}
                  className="mt-0.5 accent-primary disabled:opacity-50"
                />
                <div className="flex-1 min-w-0">
                  <div className="flex items-baseline justify-between gap-2">
                    <p className="text-sm font-medium">{addon.name}</p>
                    {available ? (
                      <span className="text-xs tabular-nums text-primary font-semibold whitespace-nowrap">
                        +{formatPrice(price, currency)} / bruger / md
                      </span>
                    ) : (
                      <span className="text-[10px] uppercase tracking-wider text-amber-600 dark:text-amber-400 font-semibold whitespace-nowrap">
                        Kræver Medium+
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-muted-foreground mt-0.5">{addon.tagline}</p>
                </div>
              </label>
            );
          })}
        </div>
      </div>

      {/* Moduler — altid synlige med add-on pricing */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <p className="text-sm font-medium">Aktive moduler</p>
          <p className="text-[11px] text-muted-foreground">
            Ekstra moduler ud over planen: {formatPrice(ADDON_PRICE_PER_USER[currency], currency)} / bruger / md
          </p>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
          {(["sales", "support", "marketing", "products", "projects", "licenses"] as const).map((mod) => {
            const checked = state.modules.includes(mod);
            const inEffective = PLANS[breakdown.effectivePlan].modules.includes(mod as any);
            const isAddon = checked && !inEffective;
            return (
              <label
                key={mod}
                className={cn(
                  "flex items-center gap-2 p-2.5 rounded-lg cursor-pointer text-sm border transition-colors",
                  checked
                    ? isAddon
                      ? "bg-amber-50 border-amber-200 hover:bg-amber-100/60"
                      : "bg-primary/5 border-primary/30 hover:bg-primary/10"
                    : "bg-card border-border hover:bg-secondary/40",
                )}
              >
                <input
                  type="checkbox"
                  checked={checked}
                  onChange={(e) => {
                    const next = e.target.checked
                      ? [...state.modules, mod]
                      : state.modules.filter((m) => m !== mod);
                    update("modules", next);
                  }}
                  className="accent-primary"
                />
                <span className="flex-1">{MODULE_LABELS[mod] ?? mod}</span>
                {isAddon && (
                  <span className="text-[10px] font-mono text-amber-700 bg-white px-1.5 py-0.5 rounded">
                    +{formatPrice(ADDON_PRICE_PER_USER[currency], currency)}
                  </span>
                )}
                {checked && !isAddon && (
                  <Check className="h-3 w-3 text-primary" />
                )}
              </label>
            );
          })}
        </div>
        {breakdown.addonModules.length > 0 && !breakdown.promoted && (
          <p className="text-[11px] text-muted-foreground flex items-center gap-1 pl-0.5">
            <Plus className="h-3 w-3" />
            {breakdown.addonModules.length} add-on{breakdown.addonModules.length > 1 ? "s" : ""} —{" "}
            {formatPrice(breakdown.addonPricePerUser, currency)} pr. bruger/md
          </p>
        )}
      </div>

      <div className="flex justify-between pt-2 border-t border-border">
        <Button variant="ghost" onClick={onPrev}>
          <ArrowLeft className="h-4 w-4" />
          Tilbage
        </Button>
        <Button onClick={onNext} size="lg">
          Næste — branding
          <ArrowRight className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}
