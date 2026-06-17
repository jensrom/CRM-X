import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { redirect } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ProgressStrip } from "@/components/onboarding/ProgressStrip";
import { saveCompanyStep } from "@/app/actions/onboarding";
import { Building2, ArrowRight, ArrowLeft } from "lucide-react";
import Link from "next/link";

export default async function CompanyStepPage() {
  const session = await auth();
  if (!session?.user?.tenantId) redirect("/login");

  const tenant = await db.tenant.findFirst({
    where: { id: session.user.tenantId },
    select: {
      cvr: true, industry: true, address: true, zipCode: true, city: true,
      website: true, employeeCount: true,
    },
  });

  return (
    <div>
      <ProgressStrip current="company" />

      <header className="mb-6">
        <div className="flex items-center gap-3 mb-2">
          <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
            <Building2 className="h-5 w-5 text-primary" />
          </div>
          <div>
            <h1 className="text-xl font-bold">Firma-stamdata</h1>
            <p className="text-sm text-muted-foreground">
              Bruges på fakturaer, tilbud og rapporter. Du kan ændre alt senere.
            </p>
          </div>
        </div>
      </header>

      <form action={saveCompanyStep} className="bg-card border border-border rounded-xl p-6 space-y-5">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-medium mb-1.5">CVR-nummer</label>
            <Input name="cvr" placeholder="12345678" defaultValue={tenant?.cvr ?? ""} />
          </div>
          <div>
            <label className="block text-xs font-medium mb-1.5">Branche</label>
            <select
              name="industry"
              defaultValue={tenant?.industry ?? ""}
              className="w-full h-10 px-3 rounded-lg border border-border bg-background text-sm"
            >
              <option value="">Vælg branche…</option>
              <option value="it_consulting">IT-konsulent</option>
              <option value="advisory">Rådgivning</option>
              <option value="engineering">Engineering</option>
              <option value="creative">Kreativt</option>
              <option value="legal">Jura</option>
              <option value="finance">Finans</option>
              <option value="other">Andet</option>
            </select>
          </div>
        </div>

        <div>
          <label className="block text-xs font-medium mb-1.5">Adresse</label>
          <Input name="address" placeholder="Vesterbrogade 1" defaultValue={tenant?.address ?? ""} />
        </div>

        <div className="grid grid-cols-3 gap-4">
          <div className="col-span-1">
            <label className="block text-xs font-medium mb-1.5">Postnr</label>
            <Input name="zipCode" placeholder="1620" defaultValue={tenant?.zipCode ?? ""} />
          </div>
          <div className="col-span-2">
            <label className="block text-xs font-medium mb-1.5">By</label>
            <Input name="city" placeholder="København V" defaultValue={tenant?.city ?? ""} />
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-medium mb-1.5">Website</label>
            <Input name="website" placeholder="https://..." defaultValue={tenant?.website ?? ""} />
          </div>
          <div>
            <label className="block text-xs font-medium mb-1.5">Antal medarbejdere</label>
            <select
              name="employeeCount"
              defaultValue={tenant?.employeeCount ?? ""}
              className="w-full h-10 px-3 rounded-lg border border-border bg-background text-sm"
            >
              <option value="">Vælg…</option>
              <option value="1-5">1–5</option>
              <option value="6-20">6–20</option>
              <option value="21-50">21–50</option>
              <option value="51-200">51–200</option>
              <option value="200+">200+</option>
            </select>
          </div>
        </div>

        <div className="flex items-center justify-between pt-4 border-t border-border">
          <Link href="/onboarding">
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
