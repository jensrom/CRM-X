import { getProducts, getProductCategories } from "@/app/actions/products";
import { AppTopbar } from "@/components/layout/AppTopbar";
import { PageHeader } from "@/components/shared/PageHeader";
import { EmptyState } from "@/components/shared/EmptyState";
import { Button } from "@/components/ui/button";
import {
  Package, Plus, Tag, Users, Key, Ticket, CheckCircle2, XCircle
} from "lucide-react";
import Link from "next/link";
import { formatCurrency } from "@/lib/utils";
import { PRODUCT_TYPE_LIST, getProductType } from "@/lib/product-types";

const INTERVAL_LABELS: Record<string, string> = {
  monthly: "md.",
  quarterly: "kvt.",
  biannual: "halvår",
  annual: "år",
  onetime: "engangspris",
};

export default async function ProductsPage({
  searchParams,
}: {
  searchParams: Promise<{ category?: string; type?: string; q?: string }>;
}) {
  const sp = await searchParams;
  const [products, categories] = await Promise.all([
    getProducts({
      search: sp.q,
      category: sp.category,
      type: sp.type,
    }),
    getProductCategories(),
  ]);

  const active = products.filter((p) => p.isActive);
  const inactive = products.filter((p) => !p.isActive);

  return (
    <>
      <AppTopbar pageTitle="Produkter" />

      <PageHeader
        title="Produkter"
        description={`${active.length} aktive produkter`}
        actions={
          <div className="flex items-center gap-2">
            <Link href="/products/pricing">
              <Button variant="outline" size="sm">
                <Tag className="h-4 w-4" />
                Prisoversigt
              </Button>
            </Link>
            <a href="/products/new">
              <Button size="md">
                <Plus className="h-4 w-4" />
                Nyt produkt
              </Button>
            </a>
          </div>
        }
      />

      {/* Type-filter */}
      <div className="flex flex-wrap gap-2 mb-3">
        <Link
          href="/products"
          className={`px-3 py-1 rounded-full text-xs font-medium transition-colors ${
            !sp.type
              ? "bg-primary text-white"
              : "bg-secondary text-muted-foreground hover:text-foreground"
          }`}
        >
          Alle typer
        </Link>
        {PRODUCT_TYPE_LIST.map((t) => (
          <Link
            key={t.slug}
            href={`/products?type=${t.slug}`}
            className={`px-3 py-1 rounded-full text-xs font-medium transition-colors ${
              sp.type === t.slug
                ? "bg-primary text-white"
                : "bg-secondary text-muted-foreground hover:text-foreground"
            }`}
          >
            {t.label}
          </Link>
        ))}
      </div>

      {/* Kategori-filter */}
      {categories.length > 0 && (
        <div className="flex flex-wrap gap-2 mb-5">
          <Link
            href="/products"
            className={`px-3 py-1 rounded-full text-xs font-medium transition-colors ${
              !sp.category
                ? "bg-primary text-white"
                : "bg-secondary text-muted-foreground hover:text-foreground"
            }`}
          >
            Alle kategorier
          </Link>
          {categories.map((cat) => (
            <Link
              key={cat}
              href={`/products?category=${encodeURIComponent(cat)}`}
              className={`px-3 py-1 rounded-full text-xs font-medium transition-colors ${
                sp.category === cat
                  ? "bg-primary text-white"
                  : "bg-secondary text-muted-foreground hover:text-foreground"
              }`}
            >
              {cat}
            </Link>
          ))}
        </div>
      )}

      {products.length === 0 ? (
        <EmptyState
          icon={Package}
          title="Ingen produkter"
          description="Tilføj dit første produkt til kataloget."
          action={
            <a href="/products/new">
              <Button size="sm">
                <Plus className="h-3.5 w-3.5" />
                Nyt produkt
              </Button>
            </a>
          }
        />
      ) : (
        <div className="space-y-6">
          {active.length > 0 && (
            <div>
              {inactive.length > 0 && (
                <h2 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-3">
                  Aktive ({active.length})
                </h2>
              )}
              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                {active.map((product) => (
                  <ProductCard key={product.id} product={product} />
                ))}
              </div>
            </div>
          )}

          {inactive.length > 0 && (
            <div>
              <h2 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-3">
                Inaktive ({inactive.length})
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4 opacity-60">
                {inactive.map((product) => (
                  <ProductCard key={product.id} product={product} />
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </>
  );
}

function ProductCard({ product }: { product: Awaited<ReturnType<typeof getProducts>>[0] }) {
  const lowestPrice = product.pricing.length
    ? product.pricing.reduce((min, p) => (Number(p.price) < Number(min.price) ? p : min))
    : null;

  return (
    <Link
      href={`/products/${product.id}`}
      className="bg-card border border-border rounded-xl p-5 hover:border-primary/40
                 hover:shadow-sm transition-all group block"
    >
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
            <Package className="h-4.5 w-4.5 text-primary" />
          </div>
          <div className="min-w-0">
            <p className="text-sm font-semibold group-hover:text-primary transition-colors truncate">
              {product.name}
            </p>
            {product.sku && (
              <p className="text-xs text-muted-foreground">{product.sku}</p>
            )}
          </div>
        </div>
        <div className="flex items-center gap-1.5 shrink-0 flex-wrap justify-end">
          {(() => {
            const t = getProductType((product as any).type);
            return t ? (
              <span className={`text-xs px-2 py-0.5 rounded-full border ${t.badgeClass}`}>
                {t.label}
              </span>
            ) : null;
          })()}
          {product.category && (
            <span className="text-xs bg-secondary px-2 py-0.5 rounded-full text-muted-foreground">
              {product.category}
            </span>
          )}
        </div>
      </div>

      {product.description && (
        <p className="text-xs text-muted-foreground mb-3 line-clamp-2">
          {product.description}
        </p>
      )}

      {/* Priser */}
      {lowestPrice && (
        <div className="mb-3">
          <p className="text-sm font-semibold text-foreground">
            {formatCurrency(Number(lowestPrice.price))}
            <span className="text-xs font-normal text-muted-foreground ml-1">
              / {INTERVAL_LABELS[lowestPrice.interval] ?? lowestPrice.interval}
            </span>
          </p>
          {product.pricing.length > 1 && (
            <p className="text-xs text-muted-foreground">
              +{product.pricing.length - 1} prisniveauer
            </p>
          )}
        </div>
      )}

      {/* Stats */}
      <div className="flex items-center gap-4 text-xs text-muted-foreground pt-3 border-t border-border">
        <span className="flex items-center gap-1">
          <Users className="h-3 w-3" />
          {product._count.customerProducts} kunder
        </span>
        <span className="flex items-center gap-1">
          <Key className="h-3 w-3" />
          {product._count.licenses} licenser
        </span>
        <span className="flex items-center gap-1">
          <Ticket className="h-3 w-3" />
          {product._count.tickets} tickets
        </span>
      </div>
    </Link>
  );
}
