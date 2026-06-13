import { getProjects } from "@/app/actions/projects";
import { AppTopbar } from "@/components/layout/AppTopbar";
import { PageHeader } from "@/components/shared/PageHeader";
import { EmptyState } from "@/components/shared/EmptyState";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { FolderKanban, Plus, Building2, User, Clock, ListTodo } from "lucide-react";
import Link from "next/link";
import { formatDate, formatRef } from "@/lib/utils";
import { ClickableRow } from "@/components/shared/ClickableRow";

const PROJECT_STATUS: Record<string, { label: string; color: string }> = {
  active:    { label: "Aktiv",      color: "success"     },
  waiting:   { label: "Afventer",   color: "warning"     },
  closed:    { label: "Lukket",     color: "muted"       },
  // Legacy-værdier
  planning:  { label: "Planlægning", color: "secondary"  },
  on_hold:   { label: "På hold",    color: "warning"     },
  completed: { label: "Afsluttet",  color: "default"     },
  cancelled: { label: "Annulleret", color: "destructive" },
};

const STATUS_TABS = [
  { label: "Alle",      value: "" },
  { label: "Aktive",    value: "active" },
  { label: "Afventer",  value: "waiting" },
  { label: "Lukkede",   value: "closed" },
];

export default async function ProjectsPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string; search?: string }>;
}) {
  const sp = await searchParams;
  const projects = await getProjects({
    status: sp.status,
    search: sp.search,
  });

  const activeCount = projects.filter((p) => p.status === "active").length;

  return (
    <>
      <AppTopbar pageTitle="Projekter" />

      <PageHeader
        title="Projekter"
        description={`${activeCount} aktive projekter`}
        actions={
          <a href="/projects/new">
            <Button size="md"><Plus className="h-4 w-4" />Nyt projekt</Button>
          </a>
        }
      />

      {/* Filtre */}
      <div className="flex items-center gap-3 mb-4 flex-wrap">
        <form className="flex-1 min-w-0">
          <input
            name="search"
            defaultValue={sp.search}
            placeholder="Søg i projekter..."
            className="w-full max-w-sm px-3 py-2 rounded-lg border border-input bg-background text-sm
                       placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
          />
          {sp.status && (
            <input type="hidden" name="status" value={sp.status} />
          )}
        </form>

        <div className="flex items-center gap-2 flex-wrap">
          {STATUS_TABS.map(({ label, value }) => (
            <Link
              key={value}
              href={value ? `/projects?status=${value}` : "/projects"}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors border
                ${(sp.status ?? "") === value
                  ? "bg-primary text-white border-primary"
                  : "bg-background border-border text-muted-foreground hover:text-foreground"
                }`}
            >
              {label}
            </Link>
          ))}
        </div>
      </div>

      {projects.length === 0 ? (
        <EmptyState
          icon={FolderKanban}
          title="Ingen projekter"
          description="Opret dit første projekt."
          action={
            <a href="/projects/new">
              <Button size="sm"><Plus className="h-3.5 w-3.5" />Nyt projekt</Button>
            </a>
          }
        />
      ) : (
        <div className="bg-card border border-border rounded-xl overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border bg-secondary/30 text-xs uppercase tracking-wide text-muted-foreground">
                  <th className="text-left px-4 py-3 font-semibold w-20">Ref</th>
                  <th className="text-left px-4 py-3 font-semibold">Projekt</th>
                  <th className="text-left px-4 py-3 font-semibold">Kunde</th>
                  <th className="text-left px-4 py-3 font-semibold hidden md:table-cell">Projektleder</th>
                  <th className="text-left px-4 py-3 font-semibold w-28 hidden lg:table-cell">Deadline</th>
                  <th className="text-left px-4 py-3 font-semibold w-44 hidden xl:table-cell">Klippekort</th>
                  <th className="text-right px-4 py-3 font-semibold w-20 hidden sm:table-cell">Opgaver</th>
                  <th className="text-right px-4 py-3 font-semibold w-20 hidden sm:table-cell">Tidslog</th>
                  <th className="text-left px-4 py-3 font-semibold w-32">Status</th>
                </tr>
              </thead>
              <tbody>
                {projects.map((project) => {
                  const st = PROJECT_STATUS[project.status] ?? PROJECT_STATUS.planning;
                  const totalHours = project.projectBundles.reduce((s, pb) => s + pb.bundle.totalHours, 0);
                  const usedHours = Math.round(project.projectBundles.reduce((s, pb) => s + pb.bundle.usedMinutes, 0) / 60 * 10) / 10;
                  const bundlePct = totalHours > 0 ? Math.min((usedHours / totalHours) * 100, 100) : 0;

                  return (
                    <ClickableRow key={project.id} href={`/projects/${project.id}`}>
                      <td className="px-4 py-3 font-mono text-xs text-muted-foreground tabular-nums">
                        {formatRef(project.tenant.projectPrefix, project.number)}
                      </td>
                      <td className="px-4 py-3">
                        <p className="font-medium text-foreground group-hover:text-primary transition-colors truncate max-w-xs">
                          {project.title}
                        </p>
                      </td>
                      <td className="px-4 py-3 text-muted-foreground">
                        <div className="flex items-center gap-1.5 truncate">
                          <Building2 className="h-3 w-3 shrink-0" />
                          <span className="truncate">{project.company?.name ?? "—"}</span>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-muted-foreground hidden md:table-cell">
                        {project.assignedTo ? (
                          <div className="flex items-center gap-1.5 truncate">
                            <User className="h-3 w-3 shrink-0" />
                            <span className="truncate">{project.assignedTo.name}</span>
                          </div>
                        ) : (
                          <span className="text-muted-foreground/60">—</span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-muted-foreground tabular-nums whitespace-nowrap hidden lg:table-cell">
                        {project.endDate ? formatDate(project.endDate) : "—"}
                      </td>
                      <td className="px-4 py-3 hidden xl:table-cell">
                        {totalHours > 0 ? (
                          <div>
                            <div className="flex justify-between text-[11px] text-muted-foreground mb-1 tabular-nums">
                              <span>{usedHours}t / {totalHours}t</span>
                              <span>{Math.round(bundlePct)}%</span>
                            </div>
                            <div className="h-1.5 bg-secondary rounded-full overflow-hidden">
                              <div
                                className={`h-full rounded-full transition-all ${
                                  bundlePct > 90 ? "bg-destructive" :
                                  bundlePct > 70 ? "bg-amber-500" : "bg-primary"
                                }`}
                                style={{ width: `${bundlePct}%` }}
                              />
                            </div>
                          </div>
                        ) : (
                          <span className="text-xs text-muted-foreground/60">—</span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-right text-muted-foreground tabular-nums hidden sm:table-cell">
                        <span className="inline-flex items-center gap-1 justify-end">
                          <ListTodo className="h-3 w-3" />
                          {project._count.backlog}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-right text-muted-foreground tabular-nums hidden sm:table-cell">
                        <span className="inline-flex items-center gap-1 justify-end">
                          <Clock className="h-3 w-3" />
                          {project._count.timeLogs}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <Badge variant={st.color as any}>{st.label}</Badge>
                      </td>
                    </ClickableRow>
                  );
                })}
              </tbody>
            </table>
          </div>
          <div className="px-4 py-2.5 border-t border-border bg-secondary/20 text-xs text-muted-foreground">
            {projects.length} projekter
          </div>
        </div>
      )}
    </>
  );
}
