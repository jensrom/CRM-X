"use client";

/**
 * DealProductsPanel
 * ─────────────────
 * Viser tilbudte produkter på et deal + dynamisk form til at tilføje nye.
 *
 * Forretningslogik:
 *   • SaaS-produkter (per_user_per_period) viser "pladser" + 2 intervaller
 *   • Standardprodukter viser "antal stk" + ét interval
 *   • Sælger kan override prisen pr. linje hvis der forhandles specialpris
 *   • Sælger kan sætte linje-rabat i %
 *
 * Når der ændres på linjer, regnes deal.value automatisk om server-side.
 */

import { useState, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { Package, Plus, Trash2, X, Users, Receipt } from "lucide-react";
import { formatCurrency } from "@/lib/utils";
import {
  BILLING_INTERVALS,
  BILLING_INTERVAL_LIST,
  lineTotal,
  type BillingIntervalSlug,
} from "@/lib/billing-intervals";
import { getProductType } from "@/lib/product-types";
import { addDealProduct, removeDealProduct } from "@/app/actions/deal-products";

interface ProductOption {
  id: string;
  name: string;
  type: string;
  pricingMode: "per_unit" | "per_user_per_period";
  pricing: { interval: string; price: number }[];
}

interface DealProductLine {
  id: string;
  productId: string;
  product: ProductOption;
  seats: number;
  pricingInterval: string;
  billingInterval: string;
  unitPriceOverride: number | null;
  discountPct: number;
}

interface Props {
  dealId: string;
  lines: DealProductLine[];
  availableProducts: ProductOption[];
  isClosed: boolean;
}

export function DealProductsPanel({ dealId, lines, availableProducts, isClosed }: Props) {
  const [addOpen, setAddOpen] = useState(false);

  // Beregn total for visning
  const totalAll = useMemo(() => {
    return lines.reduce((sum, line) => {
      const matched = line.product.pricing.find((p) => p.interval === line.pricingInterval) ?? line.product.pricing[0];
      const unitPrice = line.unitPriceOverride ?? (matched ? matched.price : 0);
      const subtotal = lineTotal({
        pricingMode: line.product.pricingMode,
        unitPrice,
        seats: line.seats,
        pricingInterval: line.pricingInterval as BillingIntervalSlug,
        billingInterval: line.billingInterval as BillingIntervalSlug,
      });
      return sum + subtotal * (1 - line.discountPct / 100);
    }, 0);
  }, [lines]);

  return (
    <div className="bg-card border border-border rounded-xl overflow-hidden">
      <div className="px-5 py-3.5 border-b border-border flex items-center justify-between">
        <h3 className="text-sm font-semibold flex items-center gap-2">
          <Package className="h-4 w-4 text-muted-foreground" />
          Produkter på tilbud
          <span className="text-xs font-normal text-muted-foreground ml-1">({lines.length})</span>
        </h3>
        {!isClosed && availableProducts.length > 0 && (
          <Button size="sm" variant="ghost" onClick={() => setAddOpen((v) => !v)}>
            {addOpen ? <><X className="h-3 w-3" /> Annullér</> : <><Plus className="h-3 w-3" /> Tilføj</>}
          </Button>
        )}
      </div>

      {addOpen && !isClosed && (
        <AddDealProductForm
          dealId={dealId}
          products={availableProducts}
          onDone={() => setAddOpen(false)}
        />
      )}

      {lines.length === 0 && !addOpen ? (
        <div className="px-5 py-8 text-center">
          <Package className="h-8 w-8 text-muted-foreground/40 mx-auto mb-2" />
          <p className="text-sm text-muted-foreground">Ingen produkter på dette tilbud endnu.</p>
          <p className="text-xs text-muted-foreground/80 mt-1">
            Tilføj produkter før dealen kan markeres som Vundet.
          </p>
        </div>
      ) : (
        <>
          <ul className="divide-y divide-border">
            {lines.map((line) => (
              <DealProductRow key={line.id} line={line} dealId={dealId} canRemove={!isClosed} />
            ))}
          </ul>
          {lines.length > 0 && (
            <div className="px-5 py-3 border-t border-border bg-secondary/30 flex items-center justify-between">
              <span className="text-xs text-muted-foreground uppercase tracking-wide">Samlet total</span>
              <span className="text-base font-bold tabular-nums">{formatCurrency(totalAll)}</span>
            </div>
          )}
        </>
      )}
    </div>
  );
}

function DealProductRow({
  line, dealId, canRemove,
}: { line: DealProductLine; dealId: string; canRemove: boolean }) {
  const pt = getProductType(line.product.type);
  const matched = line.product.pricing.find((p) => p.interval === line.pricingInterval) ?? line.product.pricing[0];
  const baseUnitPrice = line.unitPriceOverride ?? (matched ? matched.price : 0);
  const total = lineTotal({
    pricingMode: line.product.pricingMode,
    unitPrice: baseUnitPrice,
    seats: line.seats,
    pricingInterval: line.pricingInterval as BillingIntervalSlug,
    billingInterval: line.billingInterval as BillingIntervalSlug,
  });
  const discounted = total * (1 - line.discountPct / 100);
  const isSaaS = line.product.pricingMode === "per_user_per_period";
  const billLabel = BILLING_INTERVALS[line.billingInterval as BillingIntervalSlug]?.shortLabel ?? line.billingInterval;

  return (
    <li className="px-5 py-3 hover:bg-secondary/30 transition-colors">
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <p className="text-sm font-medium">{line.product.name}</p>
            {pt && (
              <span className={`text-[10px] px-1.5 py-0.5 rounded border ${pt.badgeClass}`}>{pt.label}</span>
            )}
          </div>
          <p className="text-xs text-muted-foreground">
            {isSaaS ? `${line.seats} pladser × ${formatCurrency(baseUnitPrice)} / ${BILLING_INTERVALS[line.pricingInterval as BillingIntervalSlug]?.shortLabel ?? line.pricingInterval}` : `${line.seats} × ${formatCurrency(baseUnitPrice)}`}
            {line.discountPct > 0 && <span className="text-emerald-700 ml-2">−{line.discountPct}%</span>}
            {line.unitPriceOverride !== null && <span className="text-amber-700 ml-2">special-pris</span>}
          </p>
        </div>
        <div className="text-right shrink-0">
          <p className="text-sm font-semibold tabular-nums">{formatCurrency(discounted)}</p>
          <p className="text-[10px] text-muted-foreground">/ {billLabel}</p>
        </div>
        {canRemove && (
          <form action={removeDealProduct.bind(null, line.id, dealId)}>
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

function AddDealProductForm({
  dealId, products, onDone,
}: {
  dealId: string;
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

  function handleProductChange(id: string) {
    setProductId(id);
    const p = products.find((x) => x.id === id);
    if (p?.pricingMode === "per_user_per_period") {
      setPricingInterval("monthly");
      setBillingInterval("annual");
      setSeats(5);
    } else {
      const first = (p?.pricing[0]?.interval as BillingIntervalSlug) ?? "onetime";
      setPricingInterval(first);
      setBillingInterval(first);
      setSeats(1);
    }
  }

  return (
    <form
      action={async (formData) => {
        await addDealProduct(formData);
        onDone();
      }}
      className="px-5 py-4 border-b border-border bg-secondary/20 space-y-3"
    >
      <input type="hidden" name="dealId" value={dealId} />
      <input type="hidden" name="seats" value={seats} />
      <input type="hidden" name="pricingInterval" value={pricingInterval} />
      <input type="hidden" name="billingInterval" value={billingInterval} />
      <input type="hidden" name="discountPct" value={discount} />

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
                {p.name}{p.pricingMode === "per_user_per_period" && " (SaaS / pr. bruger)"}
              </option>
            ))}
          </select>
        </div>

        <div className="space-y-1">
          <label className="text-xs font-medium text-foreground flex items-center gap-1.5">
            <Users className="h-3 w-3" /> {isSaaS ? "Antal pladser" : "Antal stk"}
          </label>
          <input
            type="number"
            min="1"
            step="1"
            value={seats}
            onChange={(e) => setSeats(Math.max(1, parseInt(e.target.value) || 1))}
            className="w-full px-3 py-2 rounded-lg border border-input bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring"
          />
        </div>

        {isSaaS && (
          <div className="space-y-1">
            <label className="text-xs font-medium text-foreground">Prisinterval (pr. bruger)</label>
            <select
              value={pricingInterval}
              onChange={(e) => setPricingInterval(e.target.value as BillingIntervalSlug)}
              className="w-full px-3 py-2 rounded-lg border border-input bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring"
            >
              {BILLING_INTERVAL_LIST.map((iv) => (
                <option key={iv.slug} value={iv.slug}>{iv.label}</option>
              ))}
            </select>
          </div>
        )}

        <div className="space-y-1">
          <label className="text-xs font-medium text-foreground flex items-center gap-1.5">
            <Receipt className="h-3 w-3" /> Faktureringsinterval
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
        </div>

        <div className="space-y-1">
          <label className="text-xs font-medium text-foreground">Special-pris (DKK, valgfri)</label>
          <input
            type="number"
            step="0.01"
            min="0"
            name="unitPriceOverride"
            value={override}
            onChange={(e) => setOverride(e.target.value)}
            placeholder={`fx ${product?.pricing[0]?.price ?? "0"}`}
            className="w-full px-3 py-2 rounded-lg border border-input bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring"
          />
        </div>

        <div className="space-y-1">
          <label className="text-xs font-medium text-foreground">Rabat %</label>
          <input
            type="number"
            min="0"
            max="100"
            step="1"
            value={discount}
            onChange={(e) => setDiscount(Math.max(0, Math.min(100, parseInt(e.target.value) || 0)))}
            className="w-full px-3 py-2 rounded-lg border border-input bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring"
          />
        </div>
      </div>

      <div className="flex justify-end gap-2 pt-2">
        <Button type="button" variant="ghost" size="sm" onClick={onDone}>Annullér</Button>
        <Button type="submit" size="sm"><Plus className="h-3 w-3" /> Tilføj linje</Button>
      </div>
    </form>
  );
}
