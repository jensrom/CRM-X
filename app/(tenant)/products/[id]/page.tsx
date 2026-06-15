import { getProduct, upsertPricing, updateProduct, deleteProduct, assignProductToCompany, removeCustomerProduct } from "@/app/actions/products";
import { getCompanies } from "@/app/actions/companies";
import { AppTopbar } from "@/components/layout/AppTopbar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { notFound } from "next/navigation";
import Link from "next/link";
import {
  Package, ChevronRight, Tag, Users, Key, Ticket,
  Pencil, Trash2, Plus, Building2, CheckCircle2, XCircle,
  CalendarDays, ExternalLink
} from "lucide-react";
import { formatDate, formatCurrency } from "@/lib/utils";
import { BackButton } from "@/components/shared/BackButton";
import { PRODUCT_TYPE_LIST, getProductType, normalizeProductType } from "@/lib/product-types";

const INTERVAL_LABELS: Record<string, { label: string; short: string }> = {
  monthly:   { label: "Månedlig",    short: "md." },
  quarterly: { label: "Kvartalsvis", short: "kvt." },
  biannual:  { label: "Halvårlig",   short: "halvår" },
  annual:    { label: "Årlig",       short: "år" },
  onetime:   { label: "Engangspris", short: "engangspris" },
};

const INTERVALS = ["monthly", "quarterly", "biannual", "annual", "onetime"] as const;

export default async function ProductDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const [product, companies] = await Promise.all([
    getProduct(id),
    getCompanies(),
  ]);
  if (!product) notFound();

  async function handleDelete() {
    "use server";
    await deleteProduct(id);
  }

  return (
    <>
      <AppTopbar pageTitle={product.name} />


      <BackButton href="/products" label="Produkter" />
      {/* Breadcrumb */}
      <div className="flex items-center gap-2 text-sm text-muted-foreground mb-5">
        <Link href="/products" className="hover:text-foreground transition-colors">Produkter</Link>
        <ChevronRight className="h-3.5 w-3.5" />
        <span className="text-foreground font-medium">{product.name}</span>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">

        {/* ── VENSTRE ─────────────────────────────────────────────────── */}
        <div className="xl:col-span-1 space-y-4">

          {/* Info-kort */}
          <div className="bg-card border border-border rounded-xl p-5">
            <div className="flex items-start justify-between mb-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
                  <Package className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <h2 className="font-semibold">{product.name}</h2>
                  {product.sku && (
                    <p className="text-xs text-muted-foreground">{product.sku}</p>
                  )}
                </div>
              </div>
              <div className="flex items-center gap-1.5 flex-wrap justify-end">
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
                {!product.isActive && (
                  <span className="text-xs bg-secondary px-2 py-0.5 rounded-full text-muted-foreground">
                    Inaktiv
                  </span>
                )}
              </div>
            </div>

            {product.description && (
              <p className="text-sm text-muted-foreground mb-4 leading-relaxed">
                {product.description}
              </p>
            )}

            {/* Stats */}
            <div className="grid grid-cols-3 gap-2 text-center p-3 bg-secondary/50 rounded-lg">
              <div>
                <p className="text-lg font-bold">{product._count.customerProducts}</p>
                <p className="text-xs text-muted-foreground">Kunder</p>
              </div>
              <div>
                <p className="text-lg font-bold">{product._count.licenses}</p>
                <p className="text-xs text-muted-foreground">Licenser</p>
              </div>
              <div>
                <p className="text-lg font-bold">{product._count.tickets}</p>
                <p className="text-xs text-muted-foreground">Tickets</p>
              </div>
            </div>
          </div>

          {/* Priser (læs) */}
          {product.pricing.length > 0 && (
            <div className="bg-card border border-border rounded-xl p-4">
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-3 flex items-center gap-1.5">
                <Tag className="h-3.5 w-3.5" /> Priser
              </p>
              <div className="space-y-2">
                {product.pricing.map((p) => (
                  <div key={p.id} className="flex items-center justify-between">
                    <span className="text-sm text-muted-foreground">
                      {INTERVAL_LABELS[p.interval]?.label ?? p.interval}
                    </span>
                    <span className="text-sm font-medium">
                      {formatCurrency(Number(p.price))}
                      <span className="text-xs text-muted-foreground font-normal ml-1">
                        / {INTERVAL_LABELS[p.interval]?.short ?? p.interval}
                      </span>
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Kunder med produktet */}
          {product.customerProducts.length > 0 && (
            <div className="bg-card border border-border rounded-xl p-4">
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-3 flex items-center gap-1.5">
                <Users className="h-3.5 w-3.5" /> Aktive kunder ({product.customerProducts.length})
              </p>
              <div className="space-y-1.5">
                {product.customerProducts.map((cp) => (
                  <div key={cp.id} className="flex items-center justify-between">
                    <Link
                      href={`/kunder/${cp.company.id}`}
                      className="flex items-center gap-1.5 text-sm hover:text-primary transition-colors"
                    >
                      <Building2 className="h-3 w-3 text-muted-foreground" />
                      {cp.company.name}
                    </Link>
                    <form
                      action={async () => {
                        "use server";
                        await removeCustomerProduct(cp.id, id);
                      }}
                    >
                      <button
                        type="submit"
                        className="text-muted-foreground hover:text-destructive transition-colors p-1 rounded"
                        title="Fjern"
                      >
                        <XCircle className="h-3.5 w-3.5" />
                      </button>
                    </form>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* ── HØJRE ───────────────────────────────────────────────────── */}
        <div className="xl:col-span-2 space-y-5">

          {/* Rediger produkt */}
          <div className="bg-card border border-border rounded-xl p-5">
            <h3 className="text-sm font-semibold flex items-center gap-2 mb-4">
              <Pencil className="h-4 w-4 text-muted-foreground" /> Rediger produkt
            </h3>

            <form action={updateProduct} className="space-y-4">
              <input type="hidden" name="id" value={product.id} />

              <Input name="name" label="Produktnavn" defaultValue={product.name} required />

              <div className="grid grid-cols-2 gap-4">
                <Input name="sku" label="SKU / Varenummer" defaultValue={product.sku ?? ""} />
                <Input name="category" label="Kategori" defaultValue={product.category ?? ""} />
              </div>

              <div className="space-y-1.5">
                <label className="block text-sm font-medium text-foreground">Produkt-type</label>
                <select
                  name="type"
                  defaultValue={normalizeProductType((product as any).type)}
                  className="w-full px-3 py-2 rounded-lg border border-input bg-background text-sm
                             focus:outline-none focus:ring-2 focus:ring-ring"
                >
                  {PRODUCT_TYPE_LIST.map((t) => (
                    <option key={t.slug} value={t.slug}>{t.label}</option>
                  ))}
                </select>
              </div>

              <div className="space-y-1.5">
                <label className="block text-sm font-medium text-foreground">Beskrivelse</label>
                <textarea
                  name="description"
                  rows={3}
                  defaultValue={product.description ?? ""}
                  className="w-full px-3 py-2 rounded-lg border border-input bg-background text-sm
                             focus:outline-none focus:ring-2 focus:ring-ring resize-none"
                />
              </div>

              <div className="space-y-1.5">
                <label className="block text-sm font-medium text-foreground">Status</label>
                <select
                  name="isActive"
                  defaultValue={product.isActive ? "true" : "false"}
                  className="w-full px-3 py-2 rounded-lg border border-input bg-background text-sm
                             focus:outline-none focus:ring-2 focus:ring-ring"
                >
                  <option value="true">Aktiv</option>
                  <option value="false">Inaktiv</option>
                </select>
              </div>

              <div className="flex items-center justify-between pt-2">
                <Button type="submit" size="md">Gem ændringer</Button>
                                  <Button type="submit" formAction={handleDelete}
                    variant="ghost"
                    size="sm"
                    className="text-destructive hover:text-destructive hover:bg-destructive/10"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                    Slet produkt
                  </Button>
              </div>
            </form>
          </div>

          {/* Priser (rediger) */}
          <div className="bg-card border border-border rounded-xl p-5">
            <h3 className="text-sm font-semibold flex items-center gap-2 mb-4">
              <Tag className="h-4 w-4 text-muted-foreground" /> Priser
            </h3>
            <p className="text-xs text-muted-foreground mb-4">
              Lad felter stå tomme for at fjerne den pågældende prismodel.
            </p>

            <form action={upsertPricing} className="space-y-3">
              <input type="hidden" name="productId" value={product.id} />

              {INTERVALS.map((interval) => {
                const existing = product.pricing.find((p) => p.interval === interval);
                return (
                  <div key={interval} className="flex items-center gap-4">
                    <label className="w-32 text-sm text-muted-foreground shrink-0">
                      {INTERVAL_LABELS[interval].label}
                    </label>
                    <div className="flex items-center gap-2 flex-1">
                      <input
                        name={`price_${interval}`}
                        type="number"
                        min="0"
                        step="0.01"
                        defaultValue={existing ? String(existing.price) : ""}
                        placeholder="—"
                        className="flex-1 px-3 py-2 rounded-lg border border-input bg-background text-sm
                                   focus:outline-none focus:ring-2 focus:ring-ring"
                      />
                      <span className="text-xs text-muted-foreground w-16">DKK / {INTERVAL_LABELS[interval].short}</span>
                    </div>
                  </div>
                );
              })}

              <div className="pt-2">
                <Button type="submit" size="md">Gem priser</Button>
              </div>
            </form>
          </div>

          {/* Tilknyt til kunde */}
          <div className="bg-card border border-border rounded-xl p-5">
            <h3 className="text-sm font-semibold flex items-center gap-2 mb-4">
              <Plus className="h-4 w-4 text-muted-foreground" /> Tilknyt til kunde
            </h3>

            <form action={assignProductToCompany} className="space-y-3">
              <input type="hidden" name="productId" value={product.id} />

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="block text-sm font-medium text-foreground">Kunde</label>
                  <select
                    name="companyId"
                    required
                    className="w-full px-3 py-2 rounded-lg border border-input bg-background text-sm
                               focus:outline-none focus:ring-2 focus:ring-ring"
                  >
                    <option value="">— Vælg kunde —</option>
                    {companies.map((c) => (
                      <option key={c.id} value={c.id}>{c.name}</option>
                    ))}
                  </select>
                </div>

                <div className="space-y-1.5">
                  <label className="block text-sm font-medium text-foreground">Prismodel</label>
                  <select
                    name="pricingId"
                    className="w-full px-3 py-2 rounded-lg border border-input bg-background text-sm
                               focus:outline-none focus:ring-2 focus:ring-ring"
                  >
                    <option value="">— Ingen specifik —</option>
                    {product.pricing.map((p) => (
                      <option key={p.id} value={p.id}>
                        {INTERVAL_LABELS[p.interval]?.label} — {formatCurrency(Number(p.price))}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <Input name="startDate" label="Startdato" type="date" />

              <div className="pt-1">
                <Button type="submit" size="sm">
                  <Plus className="h-3.5 w-3.5" />
                  Tilknyt produkt til kunde
                </Button>
              </div>
            </form>
          </div>
        </div>
      </div>
    </>
  );
}
