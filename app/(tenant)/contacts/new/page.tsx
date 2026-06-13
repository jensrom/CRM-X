import { AppTopbar } from "@/components/layout/AppTopbar";
import { PageHeader } from "@/components/shared/PageHeader";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { createContact } from "@/app/actions/contacts";
import { getCompanies } from "@/app/actions/companies";
import { ArrowLeft } from "lucide-react";
import Link from "next/link";

const DECISION_ROLES = [
  { value: "",               label: "Ikke angivet" },
  { value: "none",           label: "Ingen beslutningsmandat" },
  { value: "influencer",     label: "Influencer" },
  { value: "decision_maker", label: "Beslutningstager" },
  { value: "budget_holder",  label: "Budgetansvarlig" },
  { value: "champion",       label: "Intern fortaler / Champion" },
];

export default async function NewContactPage({
  searchParams,
}: {
  searchParams: Promise<{ companyId?: string }>;
}) {
  const sp = await searchParams;
  const companies = await getCompanies();

  return (
    <>
      <AppTopbar pageTitle="Opret kontakt" />
      <div className="max-w-2xl">
        <PageHeader
          title="Opret kontakt"
          actions={
            <Link href="/contacts">
              <Button variant="ghost" size="sm">
                <ArrowLeft className="h-4 w-4" />
                Tilbage
              </Button>
            </Link>
          }
        />
        <form action={createContact} className="space-y-5">

          {/* PRIMAER - obligatorisk */}
          <div className="bg-card border border-border rounded-xl p-5 space-y-4">
            <div className="flex items-center gap-2">
              <h3 className="text-sm font-semibold">Primære oplysninger</h3>
              <span className="text-xs text-destructive font-medium">* påkrævet</span>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <Input name="firstName" label="Fornavn *" placeholder="Lars" required />
              <Input name="lastName" label="Efternavn *" placeholder="Larsen" required />
              <Input name="email" label="Email *" type="email" placeholder="lars@kunde.dk" required />
              <Input name="phone" label="Telefon *" placeholder="+45 12 34 56 78" required />
              <div className="col-span-2 space-y-1.5">
                <label className="block text-sm font-medium text-foreground">
                  Stilling / Titel <span className="text-destructive">*</span>
                </label>
                <input
                  name="title"
                  required
                  placeholder="IT-chef, Indkoebsansvarlig..."
                  className="w-full px-3 py-2 rounded-lg border border-input bg-background text-sm
                             placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                />
              </div>
            </div>
          </div>

          {/* SEKUNDAER - valgfri */}
          <div className="bg-card border border-border rounded-xl p-5 space-y-4">
            <h3 className="text-sm font-semibold text-muted-foreground">
              Sekundære oplysninger <span className="font-normal">(valgfri)</span>
            </h3>
            <div className="grid grid-cols-2 gap-4">
              <Input name="mobile" label="Mobilnummer" placeholder="+45 87 65 43 21" />
              <Input name="linkedInUrl" label="LinkedIn URL" placeholder="https://linkedin.com/in/..." />
              <div className="col-span-2 space-y-1.5">
                <label className="block text-sm font-medium text-foreground">Beslutningsmandat</label>
                <select
                  name="decisionRole"
                  className="w-full px-3 py-2 rounded-lg border border-input bg-background text-sm
                             focus:outline-none focus:ring-2 focus:ring-ring"
                >
                  {DECISION_ROLES.map((r) => (
                    <option key={r.value} value={r.value}>{r.label}</option>
                  ))}
                </select>
                <p className="text-xs text-muted-foreground pl-0.5">
                  Personens rolle i beslutningsprocessen ift. salg.
                </p>
              </div>
            </div>
          </div>

          {/* Tilknytning */}
          <div className="bg-card border border-border rounded-xl p-5 space-y-4">
            <h3 className="text-sm font-semibold">Tilknytning</h3>
            <div className="space-y-1.5">
              <label className="block text-sm font-medium text-foreground">Kunde</label>
              <select
                name="companyId"
                defaultValue={sp.companyId || ""}
                className="w-full px-3 py-2 rounded-lg border border-input bg-background text-sm
                           focus:outline-none focus:ring-2 focus:ring-ring"
              >
                <option value="">Vaelg kunde (valgfrit)</option>
                {companies.map((c) => (
                  <option key={c.id} value={c.id}>{c.name}</option>
                ))}
              </select>
            </div>
          </div>

          {/* Noter */}
          <div className="bg-card border border-border rounded-xl p-5 space-y-2">
            <label className="block text-sm font-medium text-foreground">Interne noter</label>
            <textarea
              name="notes"
              rows={3}
              placeholder="Interne noter om kontakten..."
              className="w-full px-3 py-2 rounded-lg border border-input bg-background text-sm
                         placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring resize-none"
            />
          </div>

          <div className="flex items-center gap-3 pt-2">
            <Button type="submit" size="lg">Opret kontakt</Button>
            <Link href="/contacts">
              <Button type="button" variant="ghost" size="lg">Annuller</Button>
            </Link>
          </div>
        </form>
      </div>
    </>
  );
}
