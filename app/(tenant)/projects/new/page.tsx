import { AppTopbar } from "@/components/layout/AppTopbar";
import { PageHeader } from "@/components/shared/PageHeader";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { createProject } from "@/app/actions/projects";
import { getCompanies } from "@/app/actions/companies";
import { getHourBundles } from "@/app/actions/hour-bundles";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { ArrowLeft } from "lucide-react";
import Link from "next/link";

export default async function NewProjectPage({
  searchParams,
}: {
  searchParams: Promise<{ companyId?: string }>;
}) {
  const sp = await searchParams;
  const [companies, session] = await Promise.all([getCompanies(), auth()]);
  const tenantId = session?.user?.tenantId;

  const [users, bundles] = await Promise.all([
    tenantId
      ? db.user.findMany({
          where: { tenantId, isActive: true },
          select: { id: true, name: true },
          orderBy: { name: "asc" },
        })
      : Promise.resolve([]),
    sp.companyId
      ? getHourBundles({ companyId: sp.companyId })
      : Promise.resolve([]),
  ]);

  const today = new Date().toISOString().split("T")[0];

  return (
    <>
      <AppTopbar pageTitle="Nyt projekt" />

      <div className="max-w-2xl">
        <PageHeader
          title="Nyt projekt"
          actions={
            <Link href="/projects">
              <Button variant="ghost" size="sm">
                <ArrowLeft className="h-4 w-4" />Tilbage
              </Button>
            </Link>
          }
        />

        <form action={createProject} className="space-y-5">
          {/* Projekt-detaljer */}
          <div className="bg-card border border-border rounded-xl p-5 space-y-4">
            <h3 className="text-sm font-semibold">Projekt-detaljer</h3>

            <Input name="title" label="Titel" placeholder="Projektets navn" required />

            <div className="space-y-1.5">
              <label className="block text-sm font-medium text-foreground">Beskrivelse</label>
              <textarea
                name="description"
                rows={3}
                placeholder="Kort beskrivelse af projektet..."
                className="w-full px-3 py-2 rounded-lg border border-input bg-background text-sm
                           placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring resize-none"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label className="block text-sm font-medium text-foreground">Status</label>
                <select
                  name="status"
                  defaultValue="planning"
                  className="w-full px-3 py-2 rounded-lg border border-input bg-background text-sm
                             focus:outline-none focus:ring-2 focus:ring-ring"
                >
                  <option value="planning">Planlægning</option>
                  <option value="active">Aktiv</option>
                  <option value="on_hold">På hold</option>
                </select>
              </div>
              {users.length > 0 && (
                <div className="space-y-1.5">
                  <label className="block text-sm font-medium text-foreground">Projektleder</label>
                  <select
                    name="assignedToId"
                    className="w-full px-3 py-2 rounded-lg border border-input bg-background text-sm
                               focus:outline-none focus:ring-2 focus:ring-ring"
                  >
                    <option value="">— Ingen —</option>
                    {users.map((u) => (
                      <option key={u.id} value={u.id}>{u.name}</option>
                    ))}
                  </select>
                </div>
              )}
            </div>

            <div className="grid grid-cols-2 gap-4">
              <Input name="startDate" label="Startdato" type="date" defaultValue={today} />
              <Input name="endDate" label="Deadline" type="date" />
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
                defaultValue={sp.companyId ?? ""}
                className="w-full px-3 py-2 rounded-lg border border-input bg-background text-sm
                           focus:outline-none focus:ring-2 focus:ring-ring"
              >
                <option value="">— Vælg firma —</option>
                {companies.map((c) => (
                  <option key={c.id} value={c.id}>{c.name}</option>
                ))}
              </select>
            </div>

            {/* Klippekort tilknyttes efter oprettelse via projektets detaljeside */}
          </div>

          <div className="flex items-center gap-3 pt-2">
            <Button type="submit" size="lg">Opret projekt</Button>
            <Link href="/projects">
              <Button type="button" variant="ghost" size="lg">Annuller</Button>
            </Link>
          </div>
        </form>
      </div>
    </>
  );
}
