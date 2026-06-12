"use client";

import { createHourBundle } from "@/app/actions/hour-bundles";
import { AppTopbar } from "@/components/layout/AppTopbar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { CompanySearchSelect } from "@/components/shared/CompanySearchSelect";
import { ChevronRight, Scissors } from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import { useSearchParams } from "next/navigation";

const EXPIRY_SHORTCUTS = [
  { label: "1 ar",  years: 1 },
  { label: "2 ar",  years: 2 },
  { label: "3 ar",  years: 3 },
  { label: "4 ar",  years: 4 },
];

// Hurtige time-pakker — 10 til 100 i spring af 10
const HOUR_PRESETS = [10, 20, 30, 40, 50, 60, 70, 80, 90, 100];

function defaultBundleName(hours: number): string {
  return `${hours} timers klippekort`;
}

function addYears(date: Date, years: number): string {
  const d = new Date(date);
  d.setFullYear(d.getFullYear() + years);
  return d.toISOString().split("T")[0];
}

interface Company {
  id: string;
  name: string;
  orgNumber?: string | null;
  industry?: string | null;
  city?: string | null;
}

interface PricingTier {
  minHours: number;
  hourlyRate: number;
  label: string | null;
}

const DISCOUNT_PRESETS = [10, 20, 30] as const;

function pickTier(tiers: PricingTier[], hours: number): PricingTier | null {
  if (!hours || tiers.length === 0) return null;
  // Find højeste tier hvis minHours <= hours
  const eligible = tiers.filter((t) => t.minHours <= hours);
  if (eligible.length === 0) return null;
  return eligible.reduce((best, t) => (t.minHours > best.minHours ? t : best));
}

export function NewBundleForm({
  companies,
  pricingTiers = [],
  defaultHourlyRate = 1300,
  defaultLabel = "Standardpris",
}: {
  companies: Company[];
  pricingTiers?: PricingTier[];
  defaultHourlyRate?: number;
  defaultLabel?: string;
}) {
  const searchParams        = useSearchParams();
  const preselectedId       = searchParams.get("companyId") ?? "";
  const preselectedProject  = searchParams.get("projectId") ?? "";
  const preselectedCompany  = companies.find((c) => c.id === preselectedId) ?? null;

  const [expiresAt, setExpiresAt] = useState("");
  const [hours, setHours] = useState<string>("");
  const [name, setName] = useState<string>("");
  const [price, setPrice] = useState<string>("");
  const [priceAuto, setPriceAuto] = useState(true);
  const [discount, setDiscount] = useState<number>(0);
  // Holder styr på om navnet er auto-genereret
  const [nameAuto, setNameAuto] = useState(true);

  const hasPricingTable = pricingTiers.length > 0;

  function effectiveRate(parsedHours: number): { rate: number; label: string; isDefault: boolean } {
    const tier = pickTier(pricingTiers, parsedHours);
    if (tier) return { rate: tier.hourlyRate, label: tier.label ?? "Pris-trin", isDefault: false };
    return { rate: defaultHourlyRate, label: defaultLabel, isDefault: true };
  }

  function recomputePrice(parsedHours: number, discountPct: number) {
    if (!parsedHours || parsedHours <= 0) return "";
    const { rate } = effectiveRate(parsedHours);
    const base = rate * parsedHours;
    const final = base * (1 - discountPct / 100);
    return String(Math.round(final * 100) / 100);
  }

  function applyPreset(presetHours: number) {
    setHours(String(presetHours));
    if (nameAuto) setName(defaultBundleName(presetHours));
    if (priceAuto) setPrice(recomputePrice(presetHours, discount));
  }

  function handleHoursChange(value: string) {
    setHours(value);
    const parsed = parseInt(value);
    if (!Number.isNaN(parsed) && parsed > 0) {
      if (nameAuto) setName(defaultBundleName(parsed));
      if (priceAuto) setPrice(recomputePrice(parsed, discount));
    }
  }

  function handleNameChange(value: string) {
    setName(value);
    setNameAuto(false);
  }

  function handlePriceChange(value: string) {
    setPrice(value);
    setPriceAuto(false);
  }

  function applyDiscount(pct: number) {
    setDiscount(pct);
    const parsed = parseInt(hours);
    if (!Number.isNaN(parsed) && parsed > 0) {
      // Aktivér auto igen så rabat påvirker prisen
      setPriceAuto(true);
      setPrice(recomputePrice(parsed, pct));
    }
  }

  function clearDiscount() {
    setDiscount(0);
    const parsed = parseInt(hours);
    if (!Number.isNaN(parsed) && parsed > 0) {
      setPriceAuto(true);
      setPrice(recomputePrice(parsed, 0));
    }
  }

  const parsedHoursValue = parseInt(hours) || 0;
  const currentRateInfo = parsedHoursValue > 0 ? effectiveRate(parsedHoursValue) : null;

  return (
    <>
      <AppTopbar pageTitle="Nyt klippekort" />
      <div className="flex items-center gap-2 text-sm text-muted-foreground mb-5">
        <Link href="/klippekort" className="hover:text-foreground transition-colors">Klippekort</Link>
        <ChevronRight className="h-3.5 w-3.5" />
        <span className="text-foreground font-medium">Nyt klippekort</span>
      </div>

      <div className="max-w-lg">
        <div className="bg-card border border-border rounded-xl p-6">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-10 h-10 rounded-xl bg-emerald-500/10 flex items-center justify-center">
              <Scissors className="h-5 w-5 text-emerald-600" />
            </div>
            <div>
              <h2 className="font-semibold">Nyt klippekort</h2>
              <p className="text-xs text-muted-foreground">Oprettes med unikt reference-nummer</p>
            </div>
          </div>

          <form action={createHourBundle} className="space-y-4">
            {/* Hvis vi kommer fra et projekt, sendes projectId med så klippekortet
                automatisk tilknyttes projektet ved oprettelse. */}
            {preselectedProject && (
              <input type="hidden" name="projectId" value={preselectedProject} />
            )}

            {preselectedProject && (
              <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-emerald-50/70 border border-emerald-200 text-xs text-emerald-800">
                <span className="font-medium">Tilknyttes projekt</span>
                <span className="text-emerald-700/80">— klippekortet linkes automatisk efter oprettelse.</span>
              </div>
            )}

            {/* Firma — søgbar select */}
            <div className="space-y-1.5">
              <label className="block text-sm font-medium text-foreground">
                Firma <span className="text-destructive">*</span>
              </label>
              <CompanySearchSelect
                companies={companies}
                name="companyId"
                required
                defaultValue={preselectedId}
                placeholder="Søg og vælg firma…"
              />
            </div>

            {/* Hurtige time-pakker */}
            <div className="space-y-2">
              <label className="block text-sm font-medium text-foreground">
                Antal timer <span className="text-destructive">*</span>
              </label>
              <div className="grid grid-cols-5 gap-1.5">
                {HOUR_PRESETS.map((h) => (
                  <button
                    key={h}
                    type="button"
                    onClick={() => applyPreset(h)}
                    className={`px-2 py-1.5 text-xs rounded-lg border transition-colors tabular-nums ${
                      hours === String(h)
                        ? "bg-primary text-primary-foreground border-primary"
                        : "bg-secondary border-border hover:border-primary/40"
                    }`}
                  >
                    {h}t
                  </button>
                ))}
              </div>
              <input
                name="totalHours"
                type="number"
                min="1"
                step="1"
                required
                value={hours}
                onChange={(e) => handleHoursChange(e.target.value)}
                placeholder="Eller skriv selv (fx 75)"
                className="w-full px-3 py-2 rounded-lg border border-input bg-background text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-foreground mb-1.5">
                Navn
                {nameAuto && hours && (
                  <span className="ml-2 text-[11px] text-muted-foreground font-normal">
                    auto-foreslået
                  </span>
                )}
              </label>
              <input
                name="name"
                value={name}
                onChange={(e) => handleNameChange(e.target.value)}
                placeholder="fx '40 timer til undervisning'"
                className="w-full px-3 py-2 rounded-lg border border-input bg-background text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
              />
              <p className="text-[11px] text-muted-foreground mt-1">
                Navnet sættes automatisk når du vælger et time-tal. Skriv selv hvis du vil overskrive.
              </p>
            </div>

            <div>
              <label className="block text-sm font-medium text-foreground mb-1.5">
                Pris (DKK)
                {priceAuto && currentRateInfo && (
                  <span className="ml-2 text-[11px] text-muted-foreground font-normal">
                    auto-beregnet · {currentRateInfo.label}
                  </span>
                )}
              </label>
              <input
                name="price"
                type="number"
                min="0"
                step="50"
                value={price}
                onChange={(e) => handlePriceChange(e.target.value)}
                placeholder="Auto-udfyldes når du vælger timer"
                className="w-full px-3 py-2 rounded-lg border border-input bg-background text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
              />

              {/* Rabat-knapper */}
              <div className="mt-2 space-y-1.5">
                <div className="flex items-center gap-1.5 flex-wrap">
                  <span className="text-[11px] text-muted-foreground">Rabat:</span>
                  {DISCOUNT_PRESETS.map((pct) => (
                    <button
                      key={pct}
                      type="button"
                      onClick={() => applyDiscount(pct)}
                      className={`px-2 py-0.5 text-[11px] rounded-md border transition-colors tabular-nums ${
                        discount === pct
                          ? "bg-emerald-500/10 text-emerald-700 border-emerald-500/40"
                          : "bg-secondary border-border hover:border-emerald-500/40"
                      }`}
                    >
                      -{pct}%
                    </button>
                  ))}
                  <button
                    type="button"
                    onClick={clearDiscount}
                    className={`px-2 py-0.5 text-[11px] rounded-md border transition-colors ${
                      discount === 0
                        ? "bg-secondary border-border"
                        : "bg-background border-border hover:bg-secondary"
                    }`}
                  >
                    Ingen
                  </button>
                </div>
                {currentRateInfo && (
                  <p className="text-[11px] text-muted-foreground">
                    {currentRateInfo.isDefault && (
                      <span className="text-emerald-700/80">Standard {defaultHourlyRate} kr/t</span>
                    )}
                    {!currentRateInfo.isDefault && (
                      <span>Pris-trin: {currentRateInfo.rate} kr/t</span>
                    )}
                    {" "}× {hours}t
                    {discount > 0 && ` − ${discount}% rabat`}
                    {currentRateInfo.isDefault && !hasPricingTable && (
                      <>
                        {" · "}
                        <Link href="/settings/pricing" className="underline hover:no-underline">
                          opsæt egne pris-trin
                        </Link>
                      </>
                    )}
                  </p>
                )}
              </div>
            </div>

            {/* Udlobsdato med genveje */}
            <div className="space-y-2">
              <label className="block text-sm font-medium text-foreground">Udlobsdato</label>
              <div className="flex gap-1.5 flex-wrap">
                {EXPIRY_SHORTCUTS.map((s) => {
                  const val = addYears(new Date(), s.years);
                  return (
                    <button
                      key={s.label}
                      type="button"
                      onClick={() => setExpiresAt(val)}
                      className={`px-3 py-1 text-xs rounded-lg border transition-colors ${
                        expiresAt === val
                          ? "bg-primary text-primary-foreground border-primary"
                          : "bg-secondary border-border hover:border-primary/40"
                      }`}
                    >
                      {s.label}
                    </button>
                  );
                })}
                <button
                  type="button"
                  onClick={() => setExpiresAt("")}
                  className="px-3 py-1 text-xs rounded-lg border border-border bg-secondary hover:border-primary/40 transition-colors"
                >
                  Ingen
                </button>
              </div>
              <input
                name="expiresAt"
                type="date"
                value={expiresAt}
                onChange={(e) => setExpiresAt(e.target.value)}
                className="w-full px-3 py-2 rounded-lg border border-input bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring"
              />
            </div>

            <div className="space-y-1.5">
              <label className="block text-sm font-medium text-foreground">Notater</label>
              <textarea
                name="notes"
                rows={2}
                placeholder="Aftaler, betingelser osv."
                className="w-full px-3 py-2 rounded-lg border border-input bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring resize-none"
              />
            </div>

            <div className="flex items-center gap-3 pt-2">
              <Button type="submit" size="md">Opret klippekort</Button>
              <Link href="/klippekort">
                <Button type="button" variant="ghost" size="md">Annuller</Button>
              </Link>
            </div>
          </form>
        </div>
      </div>
    </>
  );
}
