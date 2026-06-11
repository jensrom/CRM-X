import { getDeal } from "@/app/actions/deals";
import { updateDeal, deleteDeal } from "@/app/actions/deals";
import { AppTopbar } from "@/components/layout/AppTopbar";
import { PageHeader } from "@/components/shared/PageHeader";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { getCompanies } from "@/app/actions/companies";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { notFound } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Trash2 } from "lucide-react";
import { BackButton } from "@/components/shared/BackButton";

export default async function EditDealPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const [deal, companies, session] = await Promise.all([
    getDeal(id),
    getCompanies(),
    auth(),
  ]);

  if (!deal) notFound();

  const users = session?.user?.tenantId
    ? await db.user.findMany({
        where: { tenantId: session.user.tenantId, isActive: true },
        select: { id: true, name: true },
        orderBy: { name: "asc" },
      })
    : [];

  const closeDateValue = deal.expectedCloseDate
    ? new Date(deal.expectedCloseDate).toISOString().split("T")[0]
    : "";

  async function handleDelete() {
    "use server";
    await deleteDeal(id);
  }

  return (
    <>
      <AppTopbar pageTitle="Rediger deal" />


      <BackButton href="/pipeline" label="Pipeline" />
      <div className="max-w-2xl">
        <PageHeader
          title="Rediger deal"
          actions={
            <Link href={`/pipeline/${deal.id}`}>
              <Button variant="ghost" size="sm"><ArrowLeft className="h-4 w-4" />Tilbage</Button>
            </Link>
          }
        />

        <form action={updateDeal} className="space-y-5">
          <input type="hidden" name="id" value={deal.id} />

          {/* Basis */}
          <div className="bg-card border border-border rounded-xl p-5 space-y-4">
            <h3 className="text-sm font-semibold">Deal-oplysninger</h3>
            <Input name="title" label="Titel" defaultValue={deal.title} required />

            <div className="grid grid-cols-2 gap-4">
              <Input
                name="value"
                label="Værdi (DKK)"
                type="number"
                defaultValue={deal.value ? String(deal.value) : ""}
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
                  defaultValue={deal.probability}
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
                  defaultValue={deal.stage}
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
                defaultValue={closeDateValue}
              />
            </div>

            <div className="space-y-1.5">
              <label className="block text-sm font-medium text-foreground">Tabt-årsag</label>
              <input
                name="lostReason"
                defaultValue={deal.lostReason ?? ""}
                placeholder="Angiv årsag hvis deal er tabt..."
                className="w-full px-3 py-2 rounded-lg border border-input bg-background text-sm
                           placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
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
                defaultValue={deal.company?.id ?? ""}
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
                  defaultValue={deal.assignedTo?.id ?? ""}
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
              defaultValue={deal.notes ?? ""}
              placeholder="Interne noter om dealen..."
              className="w-full px-3 py-2 rounded-lg border border-input bg-background text-sm
                         placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring resize-none"
            />
          </div>

          <div className="flex items-center justify-between pt-2">
            <div className="flex items-center gap-3">
              <Button type="submit" size="lg">Gem ændringer</Button>
              <Link href={`/pipeline/${deal.id}`}>
                <Button type="button" variant="ghost" size="lg">Annuller</Button>
              </Link>
            </div>

                          <Button type="submit" formAction={handleDelete}
                variant="ghost"
                size="sm"
                className="text-destructive hover:text-destructive hover:bg-destructive/10"
              >
                <Trash2 className="h-3.5 w-3.5" />
                Slet deal
              </Button>
          </div>
        </form>
      </div>
    </>
  );
}
