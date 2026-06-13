import { getCompany } from "@/app/actions/companies";
import { getProducts } from "@/app/actions/products";
import { AppTopbar } from "@/components/layout/AppTopbar";
import { notFound } from "next/navigation";
import Link from "next/link";
import { ChevronRight, Building2 } from "lucide-react";
import { BackButton } from "@/components/shared/BackButton";
import { AssignProductForm } from "@/components/companies/AssignProductForm";

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

  // Serialiser produkter til klient (Decimal → number, kun nødvendige felter)
  const plainProducts = products.map((p: any) => ({
    id: p.id,
    name: p.name,
    description: p.description,
    category: p.category,
    type: p.type,
    pricingMode: (p.pricingMode ?? "per_unit") as "per_unit" | "per_user_per_period",
    pricing: (p.pricing ?? []).map((pp: any) => ({
      interval: pp.interval,
      price: Number(pp.price),
      currency: pp.currency,
    })),
  }));

  return (
    <>
      <AppTopbar pageTitle={`Tilknyt produkt — ${company.name}`} />
      <BackButton href={`/companies/${id}`} label={company.name} />

      <div className="flex items-center gap-2 text-sm text-muted-foreground mb-5">
        <Link href="/companies" className="hover:text-foreground transition-colors">Kunder</Link>
        <ChevronRight className="h-3.5 w-3.5" />
        <Link href={`/companies/${id}`} className="hover:text-foreground transition-colors">{company.name}</Link>
        <ChevronRight className="h-3.5 w-3.5" />
        <span className="text-foreground font-medium">Tilknyt produkt</span>
      </div>

      <div className="max-w-2xl space-y-4">
        {/* Kunde-info */}
        <div className="bg-card border border-border rounded-xl p-4 flex items-center gap-3">
          <div className="w-9 h-9 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
            <Building2 className="h-4 w-4 text-primary" />
          </div>
          <div>
            <p className="text-sm font-semibold">{company.name}</p>
            {company.orgNumber && (
              <p className="text-xs text-muted-foreground">CVR: {company.orgNumber}</p>
            )}
          </div>
        </div>

        {plainProducts.length === 0 ? (
          <div className="bg-card border border-border rounded-xl p-10 text-center">
            <p className="font-medium mb-1">Ingen aktive produkter</p>
            <p className="text-sm text-muted-foreground mb-4">Opret produkter i produktkataloget først.</p>
            <Link href="/products" className="text-primary text-sm hover:underline">Gå til produkter →</Link>
          </div>
        ) : (
          <AssignProductForm
            companyId={id}
            companyName={company.name}
            products={plainProducts}
          />
        )}
      </div>
    </>
  );
}
