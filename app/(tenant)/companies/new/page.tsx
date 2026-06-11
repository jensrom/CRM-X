import { AppTopbar } from "@/components/layout/AppTopbar";
import { PageHeader } from "@/components/shared/PageHeader";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { createCompany } from "@/app/actions/companies";
import { ArrowLeft } from "lucide-react";
import Link from "next/link";

export default function NewCompanyPage() {
  return (
    <>
      <AppTopbar pageTitle="Opret firma" />

      <div className="max-w-2xl">
        <PageHeader
          title="Opret firma"
          description="Udfyld stamoplysninger for det nye firma"
          actions={
            <Link href="/companies">
              <Button variant="ghost" size="sm">
                <ArrowLeft className="h-4 w-4" />
                Tilbage
              </Button>
            </Link>
          }
        />

        <form action={createCompany} className="space-y-6">
          {/* Stamdata */}
          <div className="bg-card border border-border rounded-xl p-5 space-y-4">
            <h3 className="text-sm font-semibold text-foreground">Stamoplysninger</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="sm:col-span-2">
                <Input name="name" label="Firmanavn" placeholder="Acme A/S" required />
              </div>
              <Input name="orgNumber" label="CVR-nummer" placeholder="12345678" />
              <Input name="industry" label="Branche" placeholder="IT, Produktion..." />
            </div>
          </div>

          {/* Kontaktinfo */}
          <div className="bg-card border border-border rounded-xl p-5 space-y-4">
            <h3 className="text-sm font-semibold text-foreground">Kontaktinformation</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Input name="phone" label="Telefon" placeholder="+45 12 34 56 78" />
              <Input name="email" label="Email" type="email" placeholder="info@firma.dk" />
              <div className="sm:col-span-2">
                <Input
                  name="invoiceEmail"
                  label="Fakturamail"
                  type="email"
                  placeholder="faktura@firma.dk"
                />
                <p className="text-xs text-muted-foreground mt-1 pl-0.5">
                  Bruges som modtager når fakturaer sendes. Lades feltet tomt bruges den primære email.
                </p>
              </div>
              <div className="sm:col-span-2">
                <Input name="website" label="Hjemmeside" placeholder="https://firma.dk" />
              </div>
            </div>
          </div>

          {/* Adresse */}
          <div className="bg-card border border-border rounded-xl p-5 space-y-4">
            <h3 className="text-sm font-semibold text-foreground">Adresse</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="sm:col-span-2">
                <Input name="address" label="Gade & husnummer" placeholder="Eksempelvej 42" />
              </div>
              <Input name="zipCode" label="Postnummer" placeholder="8000" />
              <Input name="city" label="By" placeholder="Aarhus" />
              <Input name="country" label="Land" placeholder="Danmark" defaultValue="Danmark" />
            </div>
          </div>

          {/* Noter */}
          <div className="bg-card border border-border rounded-xl p-5 space-y-2">
            <label className="block text-sm font-medium text-foreground">Noter</label>
            <textarea
              name="notes"
              rows={3}
              placeholder="Interne noter om firmaet..."
              className="w-full px-3 py-2 rounded-lg border border-input bg-background text-sm
                         placehol