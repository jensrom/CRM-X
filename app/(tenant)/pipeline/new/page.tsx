import { AppTopbar } from "@/components/layout/AppTopbar";
import { PageHeader } from "@/components/shared/PageHeader";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { createDeal } from "@/app/actions/deals";
import { getCompanies } from "@/app/actions/companies";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { ArrowLeft } from "lucide-react";
import Link from "next/link";

export default async function NewDealPage() {
  const [companies, session] = await Promise.all([
    getCompanies(),
    auth(),
  ]);

  const users = session?.user?.tenantId
    ? await db.user.findMany({
        where: { tenantId: session.user.tenantId, isActive: true },
        select: { id: true, name: true },
        orderBy: { name: "asc" },
      })
    : [];

  return (
    <>
      <AppTopbar pageTitle="Opret deal" />

      <div className="max-w-2xl">
        <PageHeader
          title="Opret deal"
          actions={
            <Link href="/pipeline">
              <Button variant="ghost" size="sm"><ArrowLeft className="h-4 w-4" />Tilbage</Button>
            </Link>
          }
        />

        <form action={createDeal} className="space-y-5">
          {/* Basis */}
          <div className="bg-card border border-border rounded-xl p-5 space-y-4">
            <h3 className="text-sm font-semibold">Deal-oplysninger</h3>
            <Input name="title" label="Titel" placeholder="Nyt CRM-projekt for Acme" required />

            <div className="grid grid-cols-2 gap-4">
              <Input
                name="value"
                label="Værdi (DKK)"
                type="number"
                placeholder="150000"
                min="0"
                step="1000"
              />
              <div className="space-y-1.5">
                <label className="block text-sm font-medium text-foreground">Sandsynlighed (%)</label>
                <input
                  name="probability"
                  type="number"
                  min="0"
                  max="100"
                  defaultValue="50"
                  className="w-full px-3 py-2 rounded-lg border border-input bg-background text-sm
                             focus:outline-none focus:ring-2 focus:ring-ring"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label className="block text-sm font-medium text-foreground">Stage</label>
                <select
                  name="stage"
                  defaultValue="new"
                  className="w-full px-3 py-2 rounded-lg border border-input bg-background text-sm
                             focus:outline-none focus:ring-2 focus:ring-ring"
                >
                  <option value="new">Ny</option>
                  <option value="qualified">Kvalificeret</option>
                  <option value="proposal">Tilbud sendt</option>
                  <option value="negotiation">Forhandling</option>
                  <option value="won">Vundet</option>
                  <option value="lost">Tabt</option>
                </select>
              </div>
              <Input
                name="expectedCloseDate"
                label="Forventet lukkedato"
                type="date"
              />
            </div>
          </div>

          {/* Tilknytning */}
          <div className="bg-card border border-border rounded-xl p-5 space-y-4">
            <h3 className="text-sm font-semibold">Tilknytning</h3>
            <div className="space-y-1.5">
              <label className="block text-sm font-medium text-foreground">
                Firma <span className="text-destructive">*</span>
              </label>
              <select
                name="companyId"
                required
                className="w-full px-3 py-2 rounded-lg border border-input bg-background text-sm
                           focus:outline-none focus:ring-2 focus:ring-ring"
              >
                <option value="">— Vælg firma —</option>
                {companies.map((c) => (
                  <option key={c.id} value={c.id}>{c.name}</option>
                ))}
              </select>
            </div>

            {users.length > 0 && (
              <div className="space-y-1.5">
                <label className="block text-sm font-medium text-foreground">Ansvarlig</label>
                <select
                  name="assignedToId"
                  className="w-full px-3 py-2 rounded-lg border border-input bg-background text-sm
                             focus:outline-none focus:ring-2 focus:ring-ring"
                >
                  <option value="">— Ingen ansvarlig —</option>
                  {users.map((u) => (
                    <option key={u.id} value={u.id}>{u.name}</option>
                  ))}
                </select>
              </div>
            )}
          </div>

          {/* Noter */}
          <div className="bg-card border border-border rounded-xl p-5 space-y-2">
            <label className="block text-sm font-medium text-foreground">Noter</label>
            <textarea
              name="notes"
              rows={3}
              placeholder="Interne noter om dealen..."
              className="w-full px-3 py-2 rounded-lg border border-input bg-background text-sm
                         placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring resize-none"
            />
          </div>

          <div className="flex items-center gap-3 pt-2">
            <Button type="submit" size="lg">Opret deal</Button>
            <Link href="/pipeline">
              <Button type="button" variant="ghost" size="lg">Annuller</Button>
            </Link>
          </div>
        </form>
      </div>
    </>
  );
}
