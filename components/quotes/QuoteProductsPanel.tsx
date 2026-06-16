"use client";

/**
 * QuoteProductsPanel — tilfoej produkter direkte paa et tilbud
 * ─────────────────────────────────────────────────────────────
 * Samme principper som DealProductsPanel:
 *   • Vaelg produkt fra dropdown
 *   • SaaS (per_user_per_period) → pladser + 2 intervaller (pris-pr & faktura-pr)
 *   • Standard → antal stk × pris
 *   • Special-pris override + linje-rabat
 *
 * Forskellen er at vi gemmer i QuoteLine i stedet for DealProduct.
 * Linje-pris beregnes server-side fra (unitPrice × seats × periodMultiplier).
 */

import { useState, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { Package, Plus, Trash2, X, Users, Receipt, Tag, Scissors, Clock } from "lucide-react";
import { formatCurrency } from "@/lib/utils";
import {
  BILLING_INTERVALS,
  BILLING_INTERVAL_LIST,
  lineTotal,
  type BillingIntervalSlug,
} from "@/lib/billing-intervals";
import { getProductType } from "@/lib/product-types";
import { addQuoteProduct, removeQuoteProduct } from "@/app/actions/quotes";

interface ProductOption {
  id: string;
  name: string;
  type: string;
  pricingMode: "per_unit" | "per_user_per_period" | "per_hour_bundle";
  pricing: { interval: string; price: number }[];
}

interface QuoteProductLine {
  id: string;
  description: string;
  quantity: number;
  unitPrice: number;
  discountPct: number;
  productId: string | null;
  product?: ProductOption | null;
  seats: number | null;
  pricingInterval: string | null;
  billingInterval: string | null;
  unitPriceOverride: number | null;
}

interface Props {
  quoteId: string;
  productLines: QuoteProductLine[];
  availableProducts: ProductOption[];
  editable: boolean;
}

export function QuoteProductsPanel({ quoteId, productLines, availableProducts, editable }: Props) {
  const [addOpen, setAddOpen] = useState(false);

  return (
    <div className="bg-card border border-border rounded-xl overflow-hidden">
      <div className="px-5 py-3.5 border-b border-border flex items-center justify-between">
        <h3 className="text-sm font-semibold flex items-center gap-2">
          <Tag className="h-4 w-4 text-muted-foreground" />
          Produkter på tilbud
          <span className="text-xs font-normal text-muted-foreground ml-1">({productLines.length})</span>
        </h3>
        {editable && availableProducts.length > 0 && (
          <Button size="sm" variant="ghost" onClick={() => setAddOpen((v) => !v)}>
            {addOpen ? <><X className="h-3 w-3" /> Annullér</> : <><Plus className="h-3 w-3" /> Tilføj produkt</>}
          </Button>
        )}
      </div>

      {addOpen && editable && (
        <AddQuoteProductForm
          quoteId={quoteId}
          products={availableProducts}
          onDone={() => setAddOpen(false)}
        />
      )}

      {productLines.length === 0 && !addOpen ? (
        <div className="px-5 py-8 text-center">
          <Package className="h-8 w-8 text-muted-foreground/40 mx-auto mb-2" />
          <p className="text-sm text-muted-foreground">Ingen produkter på dette tilbud endnu.</p>
          {availableProducts.length === 0 ? (
            <p className="text-xs text-muted-foreground/80 mt-1">
              Opret først nogle produkter under Produkter-modulet.
            </p>
          ) : editable && (
            <p className="text-xs text-muted-foreground/80 mt-1">
              Tilføj produkter for at få korrekt SaaS-prisning og auto-konverter til faktura.
            </p>
          )}
        </div>
      ) : (
        <ul className="divide-y divide-border">
          {productLines.map((line) => (
            <QuoteProductRow key={line.id} line={line} quoteId={quoteId} canRemove={editable} />
          ))}
        </ul>
      )}
    </div>
  );
}

function QuoteProductRow({
  line, quoteId, canRemove,
}: { line: QuoteProductLine; quoteId: string; canRemove: boolean }) {
  const pt = line.product ? getProductType(line.product.type) : null;
  const mode = (line.product?.pricingMode ?? "per_unit") as "per_unit" | "per_user_per_period" | "per_hour_bundle";
  const isSaaS = mode === "per_user_per_period";
  const isBundle = mode === "per_hour_bundle";
  const qty = line.seats ?? Number(line.quantity);
  const pricingInterval = (line.pricingInterval ?? "onetime") as BillingIntervalSlug;
  const billingInterval = (line.billingInterval ?? pricingInterval) as BillingIntervalSlug;
  const baseUnitPrice = Number(line.unitPrice);

  const total = lineTotal({
    pricingMode: mode,
    unitPrice: baseUnitPrice,
    seats: qty,
    pricingInterval,
    billingInterval,
  });
  const discounted = total * (1 - Number(line.discountPct) / 100);
  const billLabel = BILLING_INTERVALS[billingInterval]?.shortLabel ?? billingInterval;
  const priceLabel = BILLING_INTERVALS[pricingInterval]?.shortLabel ?? pricingInterval;

  return (
    <li className="px-5 py-3 hover:bg-secondary/30 transition-colors">
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <p className="text-sm font-medium">{line.product?.name ?? line.description}</p>
            {pt && (
              <span className={`text-[10px] px-1.5 py-0.5 rounded border ${pt.badgeClass}`}>{pt.label}</span>
            )}
          </div>
          <p className="text-xs text-muted-foreground">
            {isSaaS && `${qty} pladser × ${formatCurrency(baseUnitPrice)} / ${priceLabel}`}
            {isBundle && `${qty} timer × ${formatCurrency(baseUnitPrice)}/time`}
            {!isSaaS && !isBundle && `${qty} × ${formatCurrency(baseUnitPrice)}`}
            {Number(line.discountPct) > 0 && <span className="text-emerald-700 ml-2">−{Number(line.discountPct)}%</span>}
            {line.unitPriceOverride !== null && <span className="text-amber-700 ml-2">special-pris</span>}
          </p>
        </div>
        <div className="text-right shrink-0">
          <p className="text-sm font-semibold tabular-nums">{formatCurrency(discounted)}</p>
          <p className="text-[10px] text-muted-foreground">
            {isBundle ? "klippekort" : `/ ${billLabel}`}
          </p>
        </div>
        {canRemove && (
          <form action={removeQuoteProduct.bind(null, line.id, quoteId)}>
            <button
              type="submit"
              className="text-muted-foreground hover:text-destructive p-1 rounded transition-colors"
              title="Fjern linje"
            >
              <Trash2 className="h-3.5 w-3.5" />
            </button>
          </form>
        )}
      </div>
    </li>
  );
}

function AddQuoteProductForm({
  quoteId, products, onDone,
}: {
  quoteId: string;
  products: ProductOption[];
  onDone: () => void;
}) {
  const [productId, setProductId] = useState<string>(products[0]?.id ?? "");
  const [seats, setSeats] = useState<number>(1);
  const [pricingInterval, setPricingInterval] = useState<BillingIntervalSlug>("monthly");
  const [billingInterval, setBillingInterval] = useState<BillingIntervalSlug>("monthly");
  const [override, setOverride] = useState<string>("");
  const [discount, setDiscount] = useState<number>(0);

  const product = useMemo(() => products.find((p) => p.id === productId), [productId, products]);
  const isSaaS = product?.pricingMode === "per_user_per_period";
  const isBundle = product?.pricingMode === "per_hour_bundle";

  // Find listepris for valgt interval
  const listPrice = useMemo(() => {
    if (!product) return 0;
    // Klippekort har typisk en pris pa "onetime"-intervallet (timepris)
    if (isBundle) {
      const onetime = product.pricing.find((p) => p.interval === "onetime");
      if (onetime) return onetime.price;
      return product.pricing[0]?.price ?? 0;
    }
    const matched = product.pricing.find((p) => p.interval === pricingInterval) ?? product.pricing[0];
    return matched ? matched.price : 0;
  }, [product, pricingInterval, isBundle]);

  const effectivePrice = override ? Number(override) : listPrice;

  const computedTotal = useMemo(() => {
    if (!product) return 0;
    const t = lineTotal({
      pricingMode: product.pricingMode,
      unitPrice: effectivePrice,
      seats,
      pricingInterval,
      billingInterval,
    });
    return t * (1 - discount / 100);
  }, [product, effectivePrice, seats, pricingInterval, billingInterval, discount]);

  function handleProductChange(id: string) {
    setProductId(id);
    const p = products.find((x) => x.id === id);
    if (p?.pricingMode === "per_user_per_period") {
      setPricingInterval("monthly");
      setBillingInterval("annual"); // typisk SaaS-default: pris pr. md, faktureret aarligt
      setSeats(5);
    } else if (p?.pricingMode === "per_hour_bundle") {
      // Klippekort: pris pr. time, "onetime" som interval, default 10 timer
      setPricingInterval("onetime");
      setBillingInterval("onetime");
      setSeats(10);
    } else {
      const firstInterval = (p?.pricing[0]?.interval as BillingIntervalSlug) ?? "onetime";
      setPricingInterval(firstInterval);
      setBillingInterval(firstInterval);
      setSeats(1);
    }
    setOverride("");
    setDiscount(0);
  }

  return (
    <form
      action={async (formData) => {
        await addQuoteProduct(formData);
        onDone();
      }}
      className="px-5 py-4 border-b border-border bg-secondary/20 space-y-3"
    >
      <input type="hidden" name="quoteId" value={quoteId} />
      <input type="hidden" name="seats" value={seats} />
      <input type="hidden" name="pricingInterval" value={pricingInterval} />
      <input type="hidden" name="billingInterval" value={billingInterval} />
      <input type="hidden" name="discountPct" value={discount} />
      <input type="hidden" name="unitPriceOverride" value={override} />

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div className="space-y-1">
          <label className="text-xs font-medium text-foreground flex items-center gap-1.5">
            <Package className="h-3 w-3" /> Produkt
          </label>
          <select
            name="productId"
            value={productId}
            onChange={(e) => handleProductChange(e.target.value)}
            required
            className="w-full px-3 py-2 rounded-lg border border-input bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring"
          >
            {products.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name}
                {p.pricingMode === "per_user_per_period" && " (SaaS / pr. bruger)"}
                {p.pricingMode === "per_hour_bundle" && " (Klippekort / pr. time)"}
              </option>
            ))}
          </select>
        </div>

        <div className="space-y-1">
          <label className="text-xs font-medium text-foreground flex items-center gap-1.5">
            {isBundle
              ? <><Clock className="h-3 w-3" /> Antal timer</>
              : isSaaS
                ? <><Users className="h-3 w-3" /> Antal pladser</>
                : <><Users className="h-3 w-3" /> Antal stk</>}
          </label>
          <input
            type="number"
            min={1}
            value={seats}
            onChange={(e) => setSeats(Math.max(1, Number(e.target.value)))}
            className="w-full px-3 py-2 rounded-lg border border-input bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring"
          />
          {isBundle && (
            <p className="text-[10px] text-muted-foreground">
              Definér timetallet — det er det klippekort kunden køber.
            </p>
          )}
        </div>

        {!isBundle && (
          <div className="space-y-1">
            <label className="text-xs font-medium text-foreground">
              {isSaaS ? "Pris pr. periode" : "Pris-interval"}
            </label>
            <select
              value={pricingInterval}
              onChange={(e) => setPricingInterval(e.target.value as BillingIntervalSlug)}
              className="w-full px-3 py-2 rounded-lg border border-input bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring"
            >
              {BILLING_INTERVAL_LIST.filter((i) =>
                isSaaS ? i.slug !== "onetime" : true
              ).map((i) => (
                <option key={i.slug} value={i.slug}>{i.label}</option>
              ))}
            </select>
            <p className="text-[10px] text-muted-foreground">
              Listepris: {formatCurrency(listPrice)} / {BILLING_INTERVALS[pricingInterval].shortLabel}
            </p>
          </div>
        )}

        {isBundle && (
          <div className="space-y-1">
            <label className="text-xs font-medium text-foreground flex items-center gap-1.5">
              <Scissors className="h-3 w-3" /> Listepris
            </label>
            <div className="w-full px-3 py-2 rounded-lg border border-input bg-secondary/30 text-sm">
              {formatCurrency(listPrice)} <span className="text-muted-foreground">/ time</span>
            </div>
            <p className="text-[10px] text-muted-foreground">
              Klippekort er engangskøb — total = timer × timepris.
            </p>
          </div>
        )}

        {isSaaS && (
          <div className="space-y-1">
            <label className="text-xs font-medium text-foreground flex items-center gap-1.5">
              <Receipt className="h-3 w-3" /> Faktureres
            </label>
            <select
              value={billingInterval}
              onChange={(e) => setBillingInterval(e.target.value as BillingIntervalSlug)}
              className="w-full px-3 py-2 rounded-lg border border-input bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring"
            >
              {BILLING_INTERVAL_LIST.filter((i) => i.slug !== "onetime").map((i) => (
                <option key={i.slug} value={i.slug}>{i.label}</option>
              ))}
            </select>
          </div>
        )}

        <div className="space-y-1">
          <label className="text-xs font-medium text-foreground">Special-pris (override)</label>
          <input
            type="number"
            min={0}
            step="0.01"
            placeholder={`Listepris ${listPrice}`}
            value={override}
            onChange={(e) => setOverride(e.target.value)}
            className="w-full px-3 py-2 rounded-lg border border-input bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring"
          />
        </div>

        <div className="space-y-1">
          <label className="text-xs font-medium text-foreground">Rabat (%)</label>
          <input
            type="number"
            min={0}
            max={100}
            step="0.5"
            value={discount}
            onChange={(e) => setDiscount(Math.max(0, Math.min(100, Number(e.target.value))))}
            className="w-full px-3 py-2 rounded-lg border border-input bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring"
          />
        </div>
      </div>

      {/* Live total preview */}
      <div className="bg-card border border-border rounded-lg px-3 py-2.5 flex items-center justify-between">
        <div className="text-xs text-muted-foreground">
          {isSaaS && `${seats} pladser × ${formatCurrency(effectivePrice)} / ${BILLING_INTERVALS[pricingInterval].shortLabel}`}
          {isBundle && `${seats} timer × ${formatCurrency(effectivePrice)}/time`}
          {!isSaaS && !isBundle && `${seats} × ${formatCurrency(effectivePrice)}`}
          {discount > 0 && <span className="text-emerald-700 ml-2">−{discount}%</span>}
        </div>
        <div className="text-right">
          <p className="text-sm font-bold tabular-nums">{formatCurrency(computedTotal)}</p>
          <p className="text-[10px] text-muted-foreground">
            {isBundle ? "klippekort" : `/ ${BILLING_INTERVALS[billingInterval].shortLabel}`}
          </p>
        </div>
      </div>

      <div className="flex justify-end gap-2 pt-1">
        <Button type="button" size="sm" variant="ghost" onClick={onDone}>Annullér</Button>
        <Button type="submit" size="sm">Tilføj til tilbud</Button>
      </div>
    </form>
  );
}
