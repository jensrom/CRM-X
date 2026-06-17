import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { redirect } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ProgressStrip } from "@/components/onboarding/ProgressStrip";
import { saveBrandingStep } from "@/app/actions/onboarding";
import { Palette, ArrowRight, ArrowLeft, Receipt } from "lucide-react";
import Link from "next/link";

export default async function BrandingStepPage() {
  const session = await auth();
  if (!session?.user?.tenantId) redirect("/login");

  const tenant = await db.tenant.findFirst({
    where: { id: session.user.tenantId },
    select: {
      logoUrl: true, accentColor: true, welcomeMessage: true,
      invoiceCompanyName: true, invoiceAddress: true, invoiceZipCity: true,
      invoiceCvr: true, invoicePhone: true, invoiceEmail: true,
      name: true, cvr: true, address: true, zipCode: true, city: true,
    },
  });

  // Pre-fyld faktura-felter fra firma-stamdata hvis ikke sat
  const prefillCompanyName = tenant?.invoiceCompanyName ?? tenant?.name ?? "";
  const prefillAddress     = tenant?.invoiceAddress     ?? tenant?.address ?? "";
  const prefillZipCity     = tenant?.invoiceZipCity     ?? [tenant?.zipCode, tenant?.city].filter(Boolean).join(" ");
  const prefillCvr         = tenant?.invoiceCvr         ?? tenant?.cvr ?? "";

  return (
    <div>
      <ProgressStrip current="branding" />

      <header className="mb-6">
        <div className="flex items-center gap-3 mb-2">
          <div className="w-10 h-10 rounded-xl bg-violet-500/10 flex items-center justify-center">
            <Palette className="h-5 w-5 text-violet-600" />
          </div>
          <div>
            <h1 className="text-xl font-bold">Branding & faktura-afsender</h1>
            <p className="text-sm text-muted-foreground">
              Giver dine fakturaer og tilbud et personligt udtryk. Alt er valgfrit.
            </p>
          </div>
        </div>
      </header>

      <form action={saveBrandingStep} className="space-y-5">
        {/* Branding */}
        <div className="bg-card border border-border rounded-xl p-6 space-y-4">
          <h2 className="text-sm font-semibold flex items-center gap-2">
            <Palette className="h-4 w-4 text-violet-600" />
            Visuel identitet
          </h2>

          <div>
            <label className="block text-xs font-medium mb-1.5">Logo URL</label>
            <Input
              name="logoUrl"
              type="url"
              placeholder="https://..."
              defaultValue={tenant?.logoUrl ?? ""}
            />
            <p className="text-[11px] text-muted-foreground mt-1">
              Indsæt direkte link til dit logo (PNG eller SVG). Filupload kommer senere.
            </p>
          </div>

          <div>
            <label className="block text-xs font-medium mb-1.5">Accent-farve</label>
            <div className="flex items-center gap-3">
              <Input
                name="accentColor"
                placeholder="#2563EB"
                defaultValue={tenant?.accentColor ?? "#2563EB"}
                className="font-mono"
              />
            </div>
            <p className="text-[11px] text-muted-foreground mt-1">
              Hex-farve der bruges på knapper, links og fakturaer.
            </p>
          </div>

          <div>
            <label className="block text-xs font-medium mb-1.5">Velkomst-besked (valgfri)</label>
            <textarea
              name="welcomeMessage"
              rows={2}
              placeholder="Vises på dashboardet for jeres team."
              defaultValue={tenant?.welcomeMessage ?? ""}
              className="w-full px-3 py-2 rounded-lg border border-border bg-background text-sm"
            />
          </div>
        </div>

        {/* Faktura-afsender */}
        <div className="bg-card border border-border rounded-xl p-6 space-y-4">
          <h2 className="text-sm font-semibold flex items-center gap-2">
            <Receipt className="h-4 w-4 text-primary" />
            Faktura-afsender
          </h2>
          <p className="text-xs text-muted-foreground -mt-2">
            Forudfyldt fra firma-stamdata. Brug et separat firma-navn på fakturaen hvis du fakturerer
            under et andet brand end CRM-X-tenanten.
          </p>

          <div>
            <label className="block text-xs font-medium mb-1.5">Firma-navn på faktura</label>
            <Input name="invoiceCompanyName" defaultValue={prefillCompanyName} />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium mb-1.5">Adresse</label>
              <Input name="invoiceAddress" defaultValue={prefillAddress} />
            </div>
            <div>
              <label className="block text-xs font-medium mb-1.5">Postnr + by</label>
              <Input name="invoiceZipCity" defaultValue={prefillZipCity} />
            </div>
          </div>

          <div className="grid grid-cols-3 gap-4">
            <div>
              <label className="block text-xs font-medium mb-1.5">CVR</label>
              <Input name="invoiceCvr" defaultValue={prefillCvr} />
            </div>
            <div>
              <label className="block text-xs font-medium mb-1.5">Telefon</label>
              <Input name="invoicePhone" defaultValue={tenant?.invoicePhone ?? ""} />
            </div>
            <div>
              <label className="block text-xs font-medium mb-1.5">Email</label>
              <Input name="invoiceEmail" type="email" defaultValue={tenant?.invoiceEmail ?? ""} />
            </div>
          </div>
        </div>

        <div className="flex items-center justify-between pt-2">
          <Link href="/onboarding/company">
            <Button type="button" size="sm" variant="ghost">
              <ArrowLeft className="h-3.5 w-3.5" />
              Tilbage
            </Button>
          </Link>
          <Button type="submit" size="md">
            Næste
            <ArrowRight className="h-4 w-4" />
          </Button>
        </div>
      </form>
    </div>
  );
}
