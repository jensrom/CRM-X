import { AppTopbar } from "@/components/layout/AppTopbar";
import { BackButton } from "@/components/shared/BackButton";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { PageHeader } from "@/components/shared/PageHeader";
import { updateInvoiceConfig } from "@/app/actions/settings";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { FileText, Building2, Hash, Mail, Phone } from "lucide-react";

export default async function InvoiceConfigPage() {
  const session = await auth();
  const tenantId = session?.user?.tenantId;
  if (!tenantId) return null;

  const tenant = await (db.tenant as any).findUnique({
    where: { id: tenantId },
    select: {
      name: true,
      invoiceCompanyName: true,
      invoiceAddress: true,
      invoiceZipCity: true,
      invoiceCvr: true,
      invoiceEan: true,
      invoicePhone: true,
      invoiceEmail: true,
      invoiceFooter: true,
    },
  });

  // Fallback til tenant.name
  const t = tenant ?? {};

  return (
    <>
      <AppTopbar pageTitle="Faktura konfiguration" />
      <BackButton href="/settings" label="Indstillinger" />

      <div className="max-w-2xl">
        <PageHeader
          title="Faktura konfiguration"
          description="Konfigurer afsenderoplysninger der vises på alle fakturaer"
        />

        <form action={updateInvoiceConfig} className="space-y-6">

          {/* Virksomhedsoplysninger */}
          <div className="bg-card border border-border rounded-xl p-5 space-y-4">
            <h3 className="text-sm font-semibold flex items-center gap-2">
              <Building2 className="h-4 w-4 text-muted-foreground" />
              Virksomhedsoplysninger
            </h3>
            <Input
              name="invoiceCompanyName"
              label="Firmanavn på faktura"
              placeholder={t.name ?? "Dit firma A/S"}
              defaultValue={t.invoiceCompanyName ?? ""}
            />
            <Input
              name="invoiceAddress"
              label="Adresse"
              placeholder="Eksempelvej 42"
              defaultValue={t.invoiceAddress ?? ""}
            />
            <Input
              name="invoiceZipCity"
              label="Postnummer og by"
              placeholder="8000 Aarhus"
              defaultValue={t.invoiceZipCity ?? ""}
            />
          </div>

          {/* CVR + EAN */}
          <div className="bg-card border border-border rounded-xl p-5 space-y-4">
            <h3 className="text-sm font-semibold flex items-center gap-2">
              <Hash className="h-4 w-4 text-muted-foreground" />
              Registreringsnumre
            </h3>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Input
                  name="invoiceCvr"
                  label="CVR-nummer"
                  placeholder="12345678"
                  defaultValue={t.invoiceCvr ?? ""}
                />
                <p className="text-xs text-muted-foreground mt-1 pl-0.5">Vises på faktura til B2B-kunder</p>
              </div>
              <div>
                <Input
                  name="invoiceEan"
                  label="EAN-lokationsnummer"
                  placeholder="5790001234567"
                  defaultValue={t.invoiceEan ?? ""}
                />
                <p className="text-xs text-muted-foreground mt-1 pl-0.5">Krævet af offentlige kunder</p>
              </div>
            </div>
          </div>

          {/* Kontaktinfo på faktura */}
          <div className="bg-card border border-border rounded-xl p-5 space-y-4">
            <h3 className="text-sm font-semibold flex items-center gap-2">
              <Mail className="h-4 w-4 text-muted-foreground" />
              Kontaktinformation
            </h3>
            <div className="grid grid-cols-2 gap-4">
              <Input
                name="invoicePhone"
                label="Telefon"
                placeholder="+45 12 34 56 78"
                defaultValue={t.invoicePhone ?? ""}
              />
              <Input
                name="invoiceEmail"
                label="Email / Fakturaafsender"
                type="email"
                placeholder="faktura@ditfirma.dk"
                defaultValue={t.invoiceEmail ?? ""}
              />
            </div>
          </div>

          {/* Footer-tekst */}
          <div className="bg-card border border-border rounded-xl p-5 space-y-3">
            <h3 className="text-sm font-semibold flex items-center gap-2">
              <FileText className="h-4 w-4 text-muted-foreground" />
              Footer-tekst
            </h3>
            <div className="space-y-1.5">
              <label className="block text-sm font-medium text-foreground">
                Vises i bunden af fakturaen
              </label>
              <textarea
                name="invoiceFooter"
                rows={3}
                placeholder="Betalingsbetingelser: Netto 30 dage. Ved for sen betaling tillægges renter iht. renteloven..."
                defaultValue={t.invoiceFooter ?? ""}
                className="w-full px-3 py-2 rounded-lg border border-input bg-background text-sm
                           placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring resize-none"
              />
            </div>
          </div>

          {/* Logo-sektion — placeholder (kræver filupload-håndtering) */}
          <div className="bg-card border border-border rounded-xl p-5">
            <h3 className="text-sm font-semibold mb-2">Logo</h3>
            <p className="text-sm text-muted-foreground mb-3">
              Upload et logo der vises øverst på dine fakturaer.
              Anbefalet format: PNG med transparent baggrund, min. 400px bred.
            </p>
            <div className="border-2 border-dashed border-border rounded-xl p-6 flex flex-col items-center justify-center gap-2 text-center">
              <FileText className="h-8 w-8 text-muted-foreground/40" />
              <p className="text-sm text-muted-foreground">
                Filupload kommer i næste version
              </p>
              <p className="text-xs text-muted-foreground/60">PNG, JPG eller SVG · Max 2 MB</p>
            </div>
          </div>

          <Button type="submit" size="lg">Gem konfiguration</Button>
        </form>
      </div>
    </>
  );
}
