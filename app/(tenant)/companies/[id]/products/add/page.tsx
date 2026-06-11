import { getCompany } from "@/app/actions/companies";
import { getProducts } from "@/app/actions/products";
import { assignProductToCompany } from "@/app/actions/products";
import { AppTopbar } from "@/components/layout/AppTopbar";
import { Button } from "@/components/ui/button";
import { notFound } from "next/navigation";
import Link from "next/link";
import { ChevronRight, Package, Building2, Tag } from "lucide-react";
import { formatCurrency } from "@/lib/utils";
import { BackButton } from "@/components/shared/BackButton";

export default async function AddCompanyProductPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const [company, products] = await Promise.all([
    getCompany(id),
    getProducts({ isActive: true }),
  ]);
  if (!company) notFound();

  return (
    <>
      <AppTopbar pageTitle={`Tilknyt produkt — ${company.name}`} />
      <BackButton href={`/companies/${id}`} label={company.name} />

      <div className="flex items-center gap-2 text-sm text-muted-foreground mb-5">
        <Link href="/companies" className="hover:text-foreground transition-colors">Firmaer</Link>
        <ChevronRight className="h-3.5 w-3.5" />
        <Link href={`/companies/${id}`} className="hover:text-foreground transition-colors">{company.name}</Link>
        <ChevronRight className="h-3.5 w-3.5" />
        <span className="text-foreground font-medium">Tilknyt produkt</span>
      </div>

      <div className="max-w-2xl space-y-4">
        {/* Firma info */}
        <div className="bg-card border border-border rounded-xl p-4 flex items-center gap-3">
          <div className="w-9 h-9 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
            <Building2 className="h-4.5 w-4.5 text-primary" />
          </div>
          <div>
            <p className="text-sm font-semibold">{company.name}</p>
            {company.orgNumber && (
              <p className="text-xs text-muted-foreground">CVR: {company.orgNumber}</p>
            )}
          </div>
        </div>

        {products.length === 0 ? (
          <div className="bg-card border border-border rounded-xl p-10 text-center">
            <Package className="h-8 w-8 text-muted-foreground/40 mx-auto mb-3" />
            <p className="font-medium mb-1">Ingen aktive produkter</p>
            <p className="text-sm text-muted-foreground mb-4">Opret produkter i produktkataloget først.</p>
            <Link href="/products">
              <Button size="sm">Gaa til produkter</Button>
            </Link>
          </div>
        ) : (
          <form action={assignProductToCompany} className="space-y-3">
            <input type="hidden" name="companyId" value={id} />

            <div className="bg-card border border-border rounded-xl overflow-hidden">
              <div className="px-4 py-3 border-b border-border">
                <p className="text-sm font-semibold">Vælg produkt</p>
                <p className="text-xs text-muted-foreground">{products.length} produkter tilgaengelige</p>
              </div>
              <div className="divide-y divide-border max-h-96 overflow-y-auto">
                {products.map((p) => {
                  const mainPrice = p.pricing?.[0];
                  return (
                    <label
                      key={p.id}
                      className="flex items-center gap-3 px-4 py-3 hover:bg-secondary/40 cursor-pointer transition-colors has-[:checked]:bg-primary/5 has-[:checked]:border-l-2 has-[:checked]:border-primary"
                    >
                      <input
                        type="radio"
                        name="productId"
                        value={p.id}
                        required
                        className="accent-primary shrink-0"
                      />
                      <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                        <Package className="h-4 w-4 text-primary" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate">{p.name}</p>
                        <div className="flex items-center gap-2 mt-0.5">
                          {p.category && (
                            <span className="inline-flex items-center gap-1 text-[10px] text-muted-foreground bg-secondary px-1.5 py-0.5 rounded">
                              <Tag className="h-2.5 w-2.5" />
                              {p.category}
                            </span>
                          )}
                          {p.description && (
                            <span className="text-xs text-muted-foreground truncate">{p.description}</span>
                          )}
                        </div>
                      </div>
                      {mainPrice ? (
                        <div className="text-right shrink-0">
                          <p className="text-sm font-semibold tabular-nums">
                            {formatCurrency(Number(mainPrice.price))}
                          </p>
                          <p className="text-[10px] text-muted-foreground">
                            {mainPrice.interval === "monthly" ? "/ maned" :
                             mainPrice.interval === "yearly"  ? "/ ar"    :
                             mainPrice.interval === "once"    ? "engang"  :
                             mainPrice.interval === "hourly"  ? "/ time"  : mainPrice.interval}
                          </p>
                        </div>
                      ) : (
                        <span className="text-xs text-muted-foreground shrink-0">—</span>
                      )}
                    </label>
                  );
                })}
              </div>
            </div>

            {/* Ekstra detaljer */}
            <div className="bg-card border border-border rounded-xl p-4 space-y-3">
              <p className="text-sm font-semibold">Detaljer (valgfrit)</p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="block text-xs font-medium text-foreground">Startdato</label>
                  <input
                    type="date"
                    name="startDate"
                    defaultValue={new Date().toISOString().split("T")[0]}
                    className="w-full px-3 py-2 rounded-lg border border-input bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                  />
                </div>
              </div>
              <div className="space-y-1">
                <label className="block text-xs font-medium text-foreground">Notater</label>
                <textarea
                  name="notes"
                  rows={2}
                  placeholder="Aftaler, vilkaar osv."
                  className="w-full px-3 py-2 rounded-lg border border-input bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring resize-none"
                />
              </div>
            </div>

            <div className="flex items-center gap-3">
              <Button type="submit" size="md">
                <Package className="h-4 w-4" />
                Tilknyt produkt
              </Button>
              <Link href={`/companies/${id}`}>
                <Button type="button" variant="ghost" size="md">Annuller</Button>
              </Link>
            </div>
          </form>
        )}
      </div>
    </>
  );
}
