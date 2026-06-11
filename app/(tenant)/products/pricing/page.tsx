import { getProducts } from "@/app/actions/products";
import { AppTopbar } from "@/components/layout/AppTopbar";
import { PageHeader } from "@/components/shared/PageHeader";
import { Button } from "@/components/ui/button";
import { Package, Tag, ArrowLeft, CheckCircle2, Minus } from "lucide-react";
import Link from "next/link";
import { formatCurrency } from "@/lib/utils";

const INTERVALS = ["monthly", "quarterly", "biannual", "annual", "onetime"] as const;

const INTERVAL_LABELS: Record<string, string> = {
  monthly:   "Månedlig",
  quarterly: "Kvartalsvis",
  biannual:  "Halvårlig",
  annual:    "Årlig",
  onetime:   "Engangspris",
};

export default async function PricingPage() {
  const products = await getProducts({ isActive: true });

  // Hvilke intervaller er faktisk i brug?
  const usedIntervals = INTERVALS.filter((interval) =>
    products.some((p) => p.pricing.some((pr) => pr.interval === interval))
  );

  return (
    <>
      <AppTopbar pageTitle="Prisoversigt" />

      <PageHeader
        title="Prisoversigt"
        description={`${products.length} aktive produkter`}
        actions={
          <Link href="/products">
            <Button variant="ghost" size="sm">
              <ArrowLeft className="h-4 w-4" />
              Produkter
            </Button>
          </Link>
        }
      />

      {products.length === 0 ? (
        <div className="bg-card border border-border rounded-xl p-10 text-center">
          <Tag className="h-8 w-8 text-muted-foreground mx-auto mb-3" />
          <p className="text-sm text-muted-foreground">Ingen aktive produkter med priser</p>
          <Link href="/products/new" className="mt-3 inline-block">
            <Button size="sm">Tilføj produkt</Button>
          </Link>
        </div>
      ) : (
        <div className="bg-card border border-border rounded-xl overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border">
                  <th className="text-left px-5 py-3 font-semibold text-foreground bg-secondary/30 w-56">
                    Produkt
                  </th>
                  {usedIntervals.map((interval) => (
                    <th
                      key={interval}
                      className="text-right px-5 py-3 font-semibold text-foreground bg-secondary/30 whitespace-nowrap"
                    >
                      {INTERVAL_LABELS[interval]}
                    </th>
                  ))}
                  <th className="text-right px-5 py-3 font-semibold text-foreground bg-secondary/30 w-24">
                    Kunder
                  </th>
                </tr>
              </thead>
              <tbody>
                {products.map((product, i) => (
                  <tr
                    key={product.id}
                    className={`border-b border-border last:border-0 hover:bg-secondary/20 transition-colors ${
                      i % 2 === 0 ? "" : "bg-secondary/5"
                    }`}
                  >
                    <td className="px-5 py-3">
                      <Link
                        href={`/products/${product.id}`}
                        className="flex items-center gap-2 group"
                      >
                        <div className="w-7 h-7 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                          <Package className="h-3.5 w-3.5 text-primary" />
                        </div>
                        <div>
                          <p className="font-medium group-hover:text-primary transition-colors">
                            {product.name}
                          </p>
                          {product.sku && (
                            <p className="text-xs text-muted-foreground">{product.sku}</p>
                          )}
                        </div>
                      </Link>
                    </td>
                    {usedIntervals.map((interval) => {
                      const pricing = product.pricing.find((p) => p.interval === interval);
                      return (
                        <td key={interval} className="px-5 py-3 text-right">
                          {pricing ? (
                            <span className="font-medium tabular-nums">
                              {formatCurrency(Number(pricing.price))}
                            </span>
                          ) : (
                            <Minus className="h-3.5 w-3.5 text-muted-foreground/40 ml-auto" />
                          )}
                        </td>
                      );
                    })}
                    <td className="px-5 py-3 text-right">
                      <span className="text-muted-foreground">
                        {product._count.customerProducts}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Kategorioversigt */}
      {products.some((p) => p.category) && (
        <div className="mt-6 grid grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-3">
          {Array.from(new Set(products.filter((p) => p.category).map((p) => p.category!))).map(
            (cat) => {
              const catProducts = products.filter((p) => p.category === cat);
              return (
                <div key={cat} className="bg-card border border-border rounded-xl p-4">
                  <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">
                    {cat}
                  </p>
                  <p className="text-2xl font-bold">{catProducts.length}</p>
                  <p className="text-xs text-muted-foreground">produkter</p>
                </div>
              );
            }
          )}
        </div>
      )}
    </>
  );
}
