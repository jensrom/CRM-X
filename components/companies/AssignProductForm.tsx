"use client";

/**
 * Tilkobl-produkt-til-kunde-form
 * ──────────────────────────────
 * Dynamisk form der tilpasser sig produkt-typen:
 *   • per_unit produkter (hardware, konsulent, engang):
 *       — Antal stk (seats)
 *       — Ét interval (engangs eller løbende)
 *   • per_user_per_period (SaaS pr. bruger):
 *       — Antal pladser (seats = brugere)
 *       — Prisinterval (hvad prisen er sat pr. — typisk månedligt)
 *       — Faktureringsinterval (faktureres månedligt, kvartalsvis, årligt…)
 *
 * Real-time total udregnes så sælgeren ser præcis hvad kunden faktureres.
 */

import { useState, useMemo } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Package, Tag, Users, Calendar, Receipt } from "lucide-react";
import { formatCurrency } from "@/lib/utils";
import {
  BILLING_INTERVAL_LIST,
  BILLING_INTERVALS,
  lineTotal,
  priceBreakdown,
  type BillingIntervalSlug,
} from "@/lib/billing-intervals";
import { getProductType } from "@/lib/product-types";
import { assignProductToCompany } from "@/app/actions/products";

interface ProductOption {
  id: string;
  name: string;
  description: string | null;
  category: string | null;
  type: string;
  pricingMode: "per_unit" | "per_user_per_period";
  pricing: { interval: string; price: number; currency: string }[];
}

interface Props {
  companyId: string;
  companyName: string;
  products: ProductOption[];
}

export function AssignProductForm({ companyId, companyName, products }: Props) {
  const [selectedId, setSelectedId] = useState<string>("");
  const [seats, setSeats] = useState<number>(1);
  const [pricingInterval, setPricingInterval] = useState<BillingIntervalSlug>("monthly");
  const [billingInterval, setBillingInterval] = useState<BillingIntervalSlug>("monthly");

  const selected = useMemo(
    () => products.find((p) => p.id === selectedId) ?? null,
    [selectedId, products],
  );

  const isSaaS = selected?.pricingMode === "per_user_per_period";

  // Pris for valgt interval — fallback til første tilgængelige
  const matchedPrice = useMemo(() => {
    if (!selected) return 0;
    const exact = selected.pricing.find((p) => p.interval === pricingInterval);
    if (exact) return Number(exact.price);
    return selected.pricing.length > 0 ? Number(selected.pricing[0].price) : 0;
  }, [selected, pricingInterval]);

  const total = useMemo(() => {
    if (!selected || matchedPrice <= 0) return 0;
    return lineTotal({
      pricingMode: selected.pricingMode,
      unitPrice: matchedPrice,
      seats,
      pricingInterval,
      billingInterval,
    });
  }, [selected, matchedPrice, seats, pricingInterval, billingInterval]);

  const breakdown = useMemo(() => {
    if (!selected || matchedPrice <= 0) return "";
    return priceBreakdown({
      pricingMode: selected.pricingMode,
      unitPrice: matchedPrice,
      seats,
      pricingInterval,
      billingInterval,
    });
  }, [selected, matchedPrice, seats, pricingInterval, billingInterval]);

  // Pris-intervaller produktet faktisk har defineret
  const availablePriceIntervals = useMemo(
    () => (selected ? selected.pricing.map((p) => p.interval) : []),
    [selected],
  );

  function handleSelectProduct(p: ProductOption) {
    setSelectedId(p.id);
    // Sæt fornuftige defaults baseret på produktet
    if (p.pricingMode === "per_user_per_period") {
      // SaaS: typisk pris pr. md, faktureres årligt
      setPricingInterval("monthly");
      setBillingInterval("annual");
      setSeats(5);
    } else {
      // Engangsprodukt eller fastpris
      const firstInterval = (p.pricing[0]?.interval as BillingIntervalSlug) ?? "onetime";
      setPricingInterval(firstInterval);
      setBillingInterval(firstInterval);
      setSeats(1);
    }
  }

  return (
    <form action={assignProductToCompany} className="space-y-4">
      <input type="hidden" name="companyId" value={companyId} />
      <input type="hidden" name="seats" value={seats} />
      <input type="hidden" name="pricingInterval" value={pricingInterval} />
      <input type="hidden" name="billingInterval" value={billingInterval} />

      {/* Produkt-vælger */}
      <div className="bg-card border border-border rounded-xl overflow-hidden">
        <div className="px-4 py-3 border-b border-border">
          <p className="text-sm font-semibold">Vælg produkt</p>
          <p className="text-xs text-muted-foreground">{products.length} produkter tilgængelige</p>
        </div>
        <div className="divide-y divide-border max-h-96 overflow-y-auto">
          {products.map((p) => {
            const mainPrice = p.pricing[0];
            const pt = getProductType(p.type);
            const isSelected = selectedId === p.id;
            return (
              <label
                key={p.id}
                className={`flex items-center gap-3 px-4 py-3 cursor-pointer transition-colors ${
                  isSelected
                    ? "bg-primary/5 border-l-2 border-primary"
                    : "hover:bg-secondary/40 border-l-2 border-transparent"
                }`}
              >
                <input
                  type="radio"
                  name="productId"
                  value={p.id}
                  required
                  checked={isSelected}
                  onChange={() => handleSelectProduct(p)}
                  className="accent-primary shrink-0"
                />
                <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                  <Package className="h-4 w-4 text-primary" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">{p.name}</p>
                  <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                    {pt && (
                      <span className={`text-[10px] px-1.5 py-0.5 rounded border ${pt.badgeClass}`}>
                        {pt.label}
                      </span>
                    )}
                    {p.pricingMode === "per_user_per_period" && (
                      <span className="text-[10px] text-violet-700 bg-violet-50 px-1.5 py-0.5 rounded border border-violet-200">
                        Pr. bruger
                      </span>
                    )}
                    {p.category && (
                      <span className="inline-flex items-center gap-1 text-[10px] text-muted-foreground bg-secondary px-1.5 py-0.5 rounded">
                        <Tag className="h-2.5 w-2.5" />
                        {p.category}
                      </span>
                    )}
                  </div>
                </div>
                {mainPrice && (
                  <div className="text-right shrink-0">
                    <p className="text-sm font-semibold tabular-nums">
                      {formatCurrency(Number(mainPrice.price))}
                    </p>
                    <p className="text-[10px] text-muted-foreground">
                      / {BILLING_INTERVALS[mainPrice.interval as BillingIntervalSlug]?.shortLabel ?? mainPrice.interval}
                      {p.pricingMode === "per_user_per_period" && " / bruger"}
                    </p>
                  </div>
                )}
              </label>
            );
          })}
        </div>
      </div>

      {/* Dynamiske felter — vises kun når et produkt er valgt */}
      {selected && (
        <div className="bg-card border border-border rounded-xl p-4 space-y-4">
          <div>
            <p className="text-sm font-semibold">Tilkoblingsdetaljer</p>
            <p className="text-xs text-muted-foreground mt-0.5">
              {isSaaS
                ? "SaaS-produkt — pris er pr. bruger pr. periode"
                : "Standard-produkt — pris er pr. enhed"}
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* Antal pladser/stk */}
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-foreground flex items-center gap-1.5">
                <Users className="h-3 w-3" />
                {isSaaS ? "Antal pladser / brugere" : "Antal stk"}
              </label>
              <input
                type="number"
                min="1"
                step="1"
                value={seats}
                onChange={(e) => setSeats(Math.max(1, parseInt(e.target.value) || 1))}
                className="w-full px-3 py-2 rounded-lg border border-input bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring"
              />
              {isSaaS && (
                <p className="text-[11px] text-muted-foreground">
                  Antal brugere/licenser. Total = pris × pladser × periode.
                </p>
              )}
            </div>

            {/* Startdato */}
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-foreground flex items-center gap-1.5">
                <Calendar className="h-3 w-3" />
                Startdato
              </label>
              <input
                type="date"
                name="startDate"
                defaultValue={new Date().toISOString().split("T")[0]}
                className="w-full px-3 py-2 rounded-lg border border-input bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring"
              />
            </div>

            {/* Prisinterval — kun synligt hvis produktet har flere */}
            {availablePriceIntervals.length > 1 && (
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-foreground">
                  Prisinterval {isSaaS && "(pr. bruger)"}
                </label>
                <select
                  value={pricingInterval}
                  onChange={(e) => setPricingInterval(e.target.value as BillingIntervalSlug)}
                  className="w-full px-3 py-2 rounded-lg border border-input bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                >
                  {availablePriceIntervals.map((iv) => (
                    <option key={iv} value={iv}>
                      {BILLING_INTERVALS[iv as BillingIntervalSlug]?.label ?? iv}
                    </option>
                  ))}
                </select>
              </div>
            )}

            {/* Faktureringsinterval — særligt vigtigt for SaaS */}
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-foreground flex items-center gap-1.5">
                <Receipt className="h-3 w-3" />
                Faktureringsinterval
              </label>
              <select
                value={billingInterval}
                onChange={(e) => setBillingInterval(e.target.value as BillingIntervalSlug)}
                className="w-full px-3 py-2 rounded-lg border border-input bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring"
              >
                {BILLING_INTERVAL_LIST.map((iv) => (
                  <option key={iv.slug} value={iv.slug}>{iv.label}</option>
                ))}
              </select>
              {isSaaS && billingInterval !== pricingInterval && (
                <p className="text-[11px] text-emerald-700">
                  Pris pr. {BILLING_INTERVALS[pricingInterval].shortLabel}, faktureres {BILLING_INTERVALS[billingInterval].label.toLowerCase()}.
                </p>
              )}
            </div>
          </div>

          {/* Real-time pris-total */}
          {total > 0 && (
            <div className="rounded-lg bg-emerald-50/50 border border-emerald-200 px-4 py-3">
              <p className="text-[11px] uppercase tracking-wide text-emerald-700/80 font-medium">
                Beregnet total
              </p>
              <p className="text-2xl font-bold text-emerald-900 tabular-nums">
                {formatCurrency(total)}
                <span className="text-sm font-normal text-emerald-700 ml-1">
                  / {BILLING_INTERVALS[billingInterval].shortLabel}
                </span>
              </p>
              <p className="text-[11px] text-emerald-700/80 mt-0.5">{breakdown}</p>
            </div>
          )}

          {/* Notater */}
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-foreground">Notater</label>
            <textarea
              name="notes"
              rows={2}
              placeholder="Aftaler, vilkår osv."
              className="w-full px-3 py-2 rounded-lg border border-input bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring resize-none"
            />
          </div>
        </div>
      )}

      <div className="flex items-center gap-3">
        <Button type="submit" size="md" disabled={!selected}>
          <Package className="h-4 w-4" />
          Tilknyt produkt
        </Button>
        <Link href={`/companies/${companyId}`}>
          <Button type="button" variant="ghost" size="md">Annuller</Button>
        </Link>
      </div>
    </form>
  );
}
