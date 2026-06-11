import { AppTopbar } from "@/components/layout/AppTopbar";
import { PageHeader } from "@/components/shared/PageHeader";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { createProduct } from "@/app/actions/products";
import { PRODUCT_TYPE_LIST } from "@/lib/product-types";
import { ArrowLeft } from "lucide-react";
import Link from "next/link";

export default function NewProductPage() {
  return (
    <>
      <AppTopbar pageTitle="Nyt produkt" />

      <div className="max-w-xl">
        <PageHeader
          title="Nyt produkt"
          actions={
            <Link href="/products">
              <Button variant="ghost" size="sm">
                <ArrowLeft className="h-4 w-4" />
                Tilbage
              </Button>
            </Link>
          }
        />

        <form action={createProduct} className="space-y-5">
          <div className="bg-card border border-border rounded-xl p-5 space-y-4">
            <h3 className="text-sm font-semibold">Produkt-detaljer</h3>

            <Input
              name="name"
              label="Produktnavn"
              required
              placeholder="Microsoft 365 Business Standard"
              autoFocus
            />

            <div className="grid grid-cols-2 gap-4">
              <Input
                name="sku"
                label="SKU / Varenummer"
                placeholder="M365-BS-01"
              />
              <Input
                name="category"
                label="Kategori"
                placeholder="Microsoft, Cloud, SaaS..."
              />
            </div>

            <div className="space-y-1.5">
              <label className="block text-sm font-medium text-foreground">Produkt-type</label>
              <select
                name="type"
                defaultValue="other"
                className="w-full px-3 py-2 rounded-lg border border-input bg-background text-sm
                           focus:outline-none focus:ring-2 focus:ring-ring"
              >
                {PRODUCT_TYPE_LIST.map((t) => (
                  <option key={t.slug} value={t.slug}>{t.label}</option>
                ))}
              </select>
              <p className="text-xs text-muted-foreground pl-0.5">Bruges som tag og filter i kataloget.</p>
            </div>

            <div className="space-y-1.5">
              <label className="block text-sm font-medium text-foreground">Beskrivelse</label>
              <textarea
                name="description"
                rows={3}
                placeholder="Kort beskrivelse af produktet og hvad det indeholder..."
                className="w-full px-3 py-2 rounded-lg border border-input bg-background text-sm
                           placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring resize-none"
              />
            </div>
          </div>

          <div className="flex items-center gap-3 pt-2">
            <Button type="submit" size="lg">Opret produkt</Button>
            <Link href="/products">
              <Button type="button" variant="ghost" size="lg">Annuller</Button>
            </Link>
          </div>
        </form>
      </div>
    </>
  );
}
