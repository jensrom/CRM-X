import { AppTopbar } from "@/components/layout/AppTopbar";
import { PageHeader } from "@/components/shared/PageHeader";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { createLicense } from "@/app/actions/licenses";
import { getCompanies } from "@/app/actions/companies";
import { getProducts } from "@/app/actions/products";
import { ArrowLeft } from "lucide-react";
import Link from "next/link";

export default async function NewLicensePage({
  searchParams,
}: {
  searchParams: Promise<{ companyId?: string }>;
}) {
  const sp = await searchParams;
  const [companies, products] = await Promise.all([
    getCompanies(),
    getProducts({ isActive: true }),
  ]);

  return (
    <>
      <AppTopbar pageTitle="Ny licens" />

      <div className="max-w-xl">
        <PageHeader
          title="Ny licens"
          actions={
            <Link href="/licenses">
              <Button variant="ghost" size="sm">
                <ArrowLeft className="h-4 w-4" />
                Tilbage
              </Button>
            </Link>
          }
        />

        <form action={createLicense} className="space-y-5">
          <div className="bg-card border border-border rounded-xl p-5 space-y-4">
            <h3 className="text-sm font-semibold">Licens-detaljer</h3>

            <Input
              name="name"
              label="Navn på licens"
              required
              placeholder="Microsoft 365 Business — Acme A/S"
              autoFocus
            />

            <div className="space-y-1.5">
              <label className="block text-sm font-medium text-foreground">
                Kunde <span className="text-destructive">*</span>
              </label>
              <select
                name="companyId"
                required
                defaultValue={sp.companyId ?? ""}
                className="w-full px-3 py-2 rounded-lg border border-input bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring"
              >
                <option value="">Vælg kunde</option>
                {companies.map((c) => (
                  <option key={c.id} value={c.id}>{c.name}</option>
                ))}
              </select>
            </div>

            <div className="space-y-1.5">
              <label className="block text-sm font-medium text-foreground">Produkt (valgfrit)</label>
              <select
                name="productId"
                className="w-full px-3 py-2 rounded-lg border border-input bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring"
              >
                <option value="">Intet produkt tilknyttet</option>
                {products.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name}{p.sku ? ` (${p.sku})` : ""}
                  </option>
                ))}
              </select>
            </div>

            <Input
              name="licenseKey"
              label="Licens-noegel (valgfrit)"
              placeholder="XXXXX-XXXXX-XXXXX-XXXXX"
            />
          </div>

          <div className="bg-card border border-border rounded-xl p-5 space-y-4">
            <h3 className="text-sm font-semibold">Gyldighed og notifikationer</h3>

            <div className="grid grid-cols-2 gap-4">
              <Input
                name="expiresAt"
                label="Udløbsdato (valgfrit)"
                type="date"
              />
              <div className="space-y-1.5">
                <label className="block text-sm font-medium text-foreground">
                  Notificer X dage før udløb
                </label>
                <select
                  name="notifyDaysBefore"
                  defaultValue="30"
                  className="w-full px-3 py-2 rounded-lg border border-input bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                >
                  <option value="7">7 dage</option>
                  <option value="14">14 dage</option>
                  <option value="30">30 dage</option>
                  <option value="60">60 dage</option>
                  <option value="90">90 dage</option>
                </select>
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="block text-sm font-medium text-foreground">Noter</label>
              <textarea
                name="notes"
                rows={3}
                placeholder="Interne noter om licensen, fornyelsesvilkaar, kontaktperson..."
                className="w-full px-3 py-2 rounded-lg border border-input bg-background text-sm
                           placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring resize-none"
              />
            </div>
          </div>

          <div className="flex items-center gap-3 pt-2">
            <Button type="submit" size="lg">Opret licens</Button>
            <Link href="/licenses">
              <Button type="button" variant="ghost" size="lg">Annuller</Button>
            </Link>
          </div>
        </form>
      </div>
    </>
  );
}
