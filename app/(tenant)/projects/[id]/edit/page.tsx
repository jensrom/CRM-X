import { getProject, updateProject, deleteProject } from "@/app/actions/projects";
import { getCompanies } from "@/app/actions/companies";
import { getHourBundles } from "@/app/actions/hour-bundles";
import { AppTopbar } from "@/components/layout/AppTopbar";
import { PageHeader } from "@/components/shared/PageHeader";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { notFound } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Trash2 } from "lucide-react";
import { BackButton } from "@/components/shared/BackButton";

export default async function EditProjectPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const [project, companies, session] = await Promise.all([
    getProject(id),
    getCompanies(),
    auth(),
  ]);
  if (!project) notFound();

  const tenantId = session?.user?.tenantId;
  const [users, bundles] = await Promise.all([
    tenantId
      ? db.user.findMany({
          where: { tenantId, isActive: true },
          select: { id: true, name: true },
          orderBy: { name: "asc" },
        })
      : Promise.resolve([]),
    project.company ? getHourBundles({ companyId: project.company.id }) : Promise.resolve([]),
  ]);

  const startVal = project.startDate
    ? new Date(project.startDate).toISOString().split("T")[0]
    : "";
  const endVal = project.endDate
    ? new Date(project.endDate).toISOString().split("T")[0]
    : "";

  async function handleDelete() {
    "use server";
    await deleteProject(id);
  }

  return (
    <>
      <AppTopbar pageTitle="Rediger projekt" />


      <BackButton href="/projects" label="Projekter" />
      <div className="max-w-2xl">
        <PageHeader
          title="Rediger projekt"
          actions={
            <Link href={`/projects/${project.id}`}>
              <Button variant="ghost" size="sm">
                <ArrowLeft className="h-4 w-4" />Tilbage
              </Button>
            </Link>
          }
        />

        <form action={updateProject} className="space-y-5">
          <input type="hidden" name="id" value={project.id} />

          <div className="bg-card border border-border rounded-xl p-5 space-y-4">
            <h3 className="text-sm font-semibold">Projekt-detaljer</h3>

            <Input name="title" label="Titel" defaultValue={project.title} required />

            <div className="space-y-1.5">
              <label className="block text-sm font-medium text-foreground">Beskrivelse</label>
              <textarea
                name="description"
                rows={3}
                defaultValue={project.description ?? ""}
                className="w-full px-3 py-2 rounded-lg border border-input bg-background text-sm
                           focus:outline-none focus:ring-2 focus:ring-ring resize-none"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label className="block text-sm font-medium text-foreground">Status</label>
                <select
                  name="status"
                  defaultValue={project.status}
                  className="w-full px-3 py-2 rounded-lg border border-input bg-background text-sm
                             focus:outline-none focus:ring-2 focus:ring-ring"
                >
                  <option value="active">Aktiv</option>
                  <option value="waiting">Afventer</option>
                  <option value="closed" disabled>Lukket (brug "Luk projekt")</option>
                </select>
              </div>
              {users.length > 0 && (
                <div className="space-y-1.5">
                  <label className="block text-sm font-medium text-foreground">Projektleder</label>
                  <select
                    name="assignedToId"
                    defaultValue={project.assignedTo?.id ?? ""}
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
              <Input name="startDate" label="Startdato" type="date" defaultValue={startVal} />
              <Input name="endDate" label="Deadline" type="date" defaultValue={endVal} />
            </div>
          </div>

          <div className="bg-card border border-border rounded-xl p-5 space-y-4">
            <h3 className="text-sm font-semibold">Tilknytning</h3>

            <div className="space-y-1.5">
              <label className="block text-sm font-medium text-foreground">
                Firma <span className="text-destructive">*</span>
              </label>
              <select
                name="companyId"
                required
                defaultValue={project.company.id}
                className="w-full px-3 py-2 rounded-lg border border-input bg-background text-sm
                           focus:outline-none focus:ring-2 focus:ring-ring"
              >
                {companies.map((c) => (
                  <option key={c.id} value={c.id}>{c.name}</option>
                ))}
              </select>
            </div>

            {/* Klippekort administreres via projektets detaljeside */}
          </div>

          <div className="flex items-center justify-between pt-2">
            <div className="flex items-center gap-3">
              <Button type="submit" size="lg">Gem ændringer</Button>
              <Link href={`/projects/${project.id}`}>
                <Button type="button" variant="ghost" size="lg">Annuller</Button>
              </Link>
            </div>
                          <Button type="submit" formAction={handleDelete}
                variant="ghost"
                size="sm"
                className="text-destructive hover:text-destructive hover:bg-destructive/10"
              >
                <Trash2 className="h-3.5 w-3.5" />
                Slet projekt
              </Button>
          </div>
        </form>
      </div>
    </>
  );
}
