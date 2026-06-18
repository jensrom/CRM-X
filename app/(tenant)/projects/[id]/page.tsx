import {
  getProject,
  deleteProject,
  assignBundleToProject,
  removeBundleFromProject,
  updateTimeLogBundle,
  getMyCheckIn,
  reopenProject,
} from "@/app/actions/projects";
import { getHourBundles } from "@/app/actions/hour-bundles";
import { AppTopbar } from "@/components/layout/AppTopbar";
import { Button } from "@/components/ui/button";
import { notFound } from "next/navigation";
import Link from "next/link";
import {
  FolderKanban, ChevronRight, Building2, User, CalendarDays,
  Clock, Scissors, Plus, Trash2, CheckCircle, XCircle,
  ListTodo, Timer, ArrowRight, Package, AlertTriangle, Receipt, Lock,
} from "lucide-react";
import { generateInvoiceFromProject } from "@/app/actions/invoices";
import { formatRef, formatDate } from "@/lib/utils";
import { LogTimeForm } from "@/components/projects/LogTimeForm";
import { CheckInButton } from "@/components/projects/CheckInButton";
import { CloseProjectDialog } from "@/components/projects/CloseProjectDialog";
import { BackButton } from "@/components/shared/BackButton";
import { BundleSearchSelect } from "@/components/shared/BundleSearchSelect";
import { QrCode } from "@/components/shared/QrCode";
import { CreatorBadge } from "@/components/shared/CreatorBadge";
import { AttachmentSection } from "@/components/attachments/AttachmentSection";
import { listAttachments } from "@/app/actions/attachments";

function formatDur(min: number) {
  const h = Math.floor(min / 60);
  const m = min % 60;
  if (h === 0) return `${m}m`;
  if (m === 0) return `${h}t`;
  return `${h}t ${m}m`;
}

const STATUS_STYLE: Record<string, { label: string; dot: string }> = {
  active:    { label: "Aktiv",      dot: "bg-emerald-500" },
  waiting:   { label: "Afventer",   dot: "bg-amber-500"   },
  closed:    { label: "Lukket",     dot: "bg-slate-400"   },
  // Legacy
  planning:  { label: "Planlægning", dot: "bg-slate-400"  },
  on_hold:   { label: "Pause",       dot: "bg-amber-500"  },
  completed: { label: "Afsluttet",   dot: "bg-blue-500"   },
  cancelled: { label: "Aflyst",      dot: "bg-red-400"    },
};

const PRIORITY_STYLE: Record<string, string> = {
  low:      "bg-slate-100 text-slate-600",
  medium:   "bg-blue-100 text-blue-700",
  high:     "bg-amber-100 text-amber-700",
  critical: "bg-red-100 text-red-700",
};
const PRIORITY_LABEL: Record<string, string> = {
  low: "Lav", medium: "Normal", high: "Høj", critical: "Kritisk",
};

export default async function ProjectDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ from?: string }>;
}) {
  const { id } = await params;
  const { from } = await searchParams;
  const backHref =
    from && from.startsWith("/") && !from.startsWith("//") ? from : "/projects";
  const [project, allBundles, myCheckIn] = await Promise.all([
    getProject(id),
    getHourBundles(),
    getMyCheckIn(),
  ]);
  if (!project) notFound();

  const isCheckedIn = myCheckIn?.projectId === id;
  const checkedInAt = isCheckedIn ? myCheckIn!.startedAt.toISOString() : null;
  const isClosed = project.status === "closed";

  const st = STATUS_STYLE[project.status] ?? STATUS_STYLE.planning;
  const ref = formatRef(project.tenant.projectPrefix, project.number);

  // Klippekort-stats
  const totalBundleMin = project.projectBundles.reduce((s, pb) => s + pb.bundle.totalHours * 60, 0);
  const usedBundleMin  = project.projectBundles.reduce((s, pb) => s + pb.bundle.usedMinutes, 0);
  const remainingMin   = totalBundleMin - usedBundleMin;
  const totalProjectMin = project.timeLogs.reduce((s, l) => s + l.durationMin, 0);

  // Bundles der er tilgaengelige for tilknytning (ikke allerede tilknyttet, same company)
  const linkedBundleIds = new Set(project.projectBundles.map((pb) => pb.bundleId));
  const availableBundles = allBundles.filter(
    (b) => !linkedBundleIds.has(b.id) && b.companyId === project.company.id && b.isActive
  );

  async function handleDelete() {
    "use server";
    await deleteProject(id);
  }

  async function handleReopen() {
    "use server";
    await reopenProject(id);
  }

  return (
    <>
      <AppTopbar pageTitle={project.title} />


      <BackButton href={backHref} />
      <div className="flex items-center gap-2 text-sm text-muted-foreground mb-5">
        <Link href="/projects" className="hover:text-foreground transition-colors">Projekter</Link>
        <ChevronRight className="h-3.5 w-3.5" />
        <span className="font-mono text-xs">{ref}</span>
        <ChevronRight className="h-3.5 w-3.5" />
        <span className="text-foreground font-medium truncate">{project.title}</span>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">

        {/* VENSTRE */}
        <div className="xl:col-span-1 space-y-4">

          {/* Info-kort */}
          <div className="bg-card border border-border rounded-xl p-4">
            <div className="flex items-start gap-3 mb-4">
              <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
                <FolderKanban className="h-5 w-5 text-primary" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-mono text-xs text-muted-foreground">{ref}</p>
                <h2 className="font-semibold leading-tight">{project.title}</h2>
                <div className="flex items-center gap-1.5 mt-1">
                  <span className={`w-2 h-2 rounded-full ${st.dot}`} />
                  <span className="text-xs text-muted-foreground">{st.label}</span>
                </div>
                <div className="mt-1">
                  <CreatorBadge
                    createdById={(project as any).createdById}
                    createdByImpersonatorId={(project as any).createdByImpersonatorId}
                    createdAt={project.createdAt}
                  />
                </div>
              </div>
              <QrCode
                url={`${process.env.NEXT_PUBLIC_APP_URL ?? ""}/projects/${project.id}`}
                storageKey={`project/${project.id}`}
                label={ref}
              />
            </div>

            <div className="space-y-2 text-sm">
              <div className="flex items-center gap-2 text-muted-foreground">
                <Building2 className="h-3.5 w-3.5 shrink-0" />
                <Link href={`/kunder/${project.company.id}`} className="hover:text-primary transition-colors">
                  {project.company.name}
                </Link>
              </div>
              {project.assignedTo && (
                <div className="flex items-center gap-2 text-muted-foreground">
                  <User className="h-3.5 w-3.5 shrink-0" />
                  {project.assignedTo.name}
                </div>
              )}
              {project.startDate && (
                <div className="flex items-center gap-2 text-muted-foreground">
                  <CalendarDays className="h-3.5 w-3.5 shrink-0" />
                  {formatDate(project.startDate)}
                  {project.endDate && <> &rarr; {formatDate(project.endDate)}</>}
                </div>
              )}
            </div>

            {project.description && (
              <p className="mt-3 text-sm text-muted-foreground leading-relaxed border-t border-border pt-3">
                {project.description}
              </p>
            )}

            <div className="grid grid-cols-3 gap-2 text-center p-3 bg-secondary/50 rounded-lg mt-4">
              <div>
                <p className="text-lg font-bold">{project._count?.backlog ?? project.backlog.length}</p>
                <p className="text-xs text-muted-foreground">Opgaver</p>
              </div>
              <div>
                <p className="text-lg font-bold">{formatDur(totalProjectMin)}</p>
                <p className="text-xs text-muted-foreground">Total tid</p>
              </div>
              <div>
                <p className="text-lg font-bold">{project.projectBundles.length}</p>
                <p className="text-xs text-muted-foreground">Klippekort</p>
              </div>
            </div>

            <div className="mt-3 flex gap-2">
              {!isClosed && (
                <Link href={`/projects/${project.id}/edit`} className="flex-1">
                  <Button variant="ghost" size="sm" className="w-full">Rediger</Button>
                </Link>
              )}
              {isClosed ? (
                <form action={handleReopen} className="flex-1">
                  <Button type="submit" variant="ghost" size="sm" className="w-full">
                    <Lock className="h-3.5 w-3.5" />
                    Genåbn projekt
                  </Button>
                </form>
              ) : (
                <CloseProjectDialog projectId={project.id} />
              )}
              {!isClosed && (
                <form action={handleDelete}>
                  <Button type="submit" variant="ghost" size="sm" className="text-destructive hover:text-destructive hover:bg-destructive/10">
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                </form>
              )}
            </div>
          </div>

          {/* Klippekort-panel */}
          <div className="bg-card border border-border rounded-xl p-4">
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-3 flex items-center gap-1.5">
              <Scissors className="h-3.5 w-3.5" /> Klippekort
            </p>

            {project.projectBundles.length === 0 ? (
              <p className="text-xs text-muted-foreground mb-3">Ingen klippekort tilknyttet endnu.</p>
            ) : (
              <div className="space-y-3 mb-3">
                {project.projectBundles.map((pb, idx) => {
                  const b = pb.bundle;
                  const usedH = Math.round(b.usedMinutes / 60 * 10) / 10;
                  const remH  = Math.round((b.totalHours * 60 - b.usedMinutes) / 60 * 10) / 10;
                  const pct   = Math.min((b.usedMinutes / (b.totalHours * 60)) * 100, 100);
                  const isFull = remH <= 0;
                  const bundleRef = formatRef(project.tenant.bundlePrefix, b.number);
                  return (
                    <div key={pb.id} className={`rounded-lg border p-3 ${isFull ? "border-amber-200 bg-amber-50/50" : "border-border"}`}>
                      <div className="flex items-center justify-between mb-1.5">
                        <div>
                          <Link href={`/klippekort/${b.id}`} className="text-xs font-mono text-muted-foreground hover:text-primary transition-colors">
                            {bundleRef}
                          </Link>
                          {b.name && <p className="text-xs font-medium">{b.name}</p>}
                        </div>
                        <div className="flex items-center gap-1">
                          {idx === 0 && !isFull && (
                            <span className="text-xs bg-emerald-100 text-emerald-700 px-1.5 py-0.5 rounded-full">Aktiv</span>
                          )}
                          {isFull && (
                            <span className="text-xs bg-amber-100 text-amber-700 px-1.5 py-0.5 rounded-full">Opbrugt</span>
                          )}
                          {!isClosed && (
                            <form action={async () => { "use server"; await removeBundleFromProject(pb.id, id); }}>
                              <button type="submit" className="text-muted-foreground hover:text-destructive p-0.5 rounded transition-colors">
                                <XCircle className="h-3.5 w-3.5" />
                              </button>
                            </form>
                          )}
                        </div>
                      </div>
                      <div className="flex justify-between text-xs text-muted-foreground mb-1">
                        <span>{usedH}t brugt</span>
                        <span>{remH}t tilbage / {b.totalHours}t</span>
                      </div>
                      <div className="h-1.5 bg-secondary rounded-full overflow-hidden">
                        <div
                          className={`h-full rounded-full ${pct >= 100 ? "bg-amber-500" : pct > 80 ? "bg-amber-400" : "bg-primary"}`}
                          style={{ width: `${pct}%` }}
                        />
                      </div>
                      {b.expiresAt && (
                        <p className="text-xs text-muted-foreground mt-1">Udlober {formatDate(b.expiresAt)}</p>
                      )}
                    </div>
                  );
                })}
              </div>
            )}

            {!isClosed && availableBundles.length > 0 && (
              <form action={assignBundleToProject} className="space-y-2">
                <input type="hidden" name="projectId" value={project.id} />
                <input type="hidden" name="applyRetroactive" value="true" />
                <BundleSearchSelect
                  bundles={availableBundles.map((b) => ({
                    id: b.id,
                    number: b.number,
                    name: b.name,
                    totalHours: b.totalHours,
                    usedMinutes: b.usedMinutes,
                    expiresAt: b.expiresAt,
                    company: b.company ? { name: b.company.name } : null,
                  }))}
                  bundlePrefix={project.tenant.bundlePrefix ?? undefined}
                  placeholder="Søg klippekort…"
                />
                <Button type="submit" size="sm" className="w-full">
                  <Plus className="h-3 w-3" /> Tilknyt
                </Button>
                <p className="text-xs text-muted-foreground">
                  Eksisterende timer på projektet vil automatisk blive trukket på det nye klippekort.
                </p>
              </form>
            )}

            {!isClosed && availableBundles.length === 0 && project.projectBundles.length > 0 && (
              <a href={`/klippekort/new?companyId=${project.company.id}&projectId=${project.id}`}>
                <Button variant="ghost" size="sm" className="w-full mt-1">
                  <Plus className="h-3.5 w-3.5" /> Opret nyt klippekort
                </Button>
              </a>
            )}
            {!isClosed && availableBundles.length === 0 && project.projectBundles.length === 0 && (
              <a href={`/klippekort/new?companyId=${project.company.id}&projectId=${project.id}`}>
                <Button variant="ghost" size="sm" className="w-full">
                  <Plus className="h-3.5 w-3.5" /> Opret klippekort til dette projekt
                </Button>
              </a>
            )}
          </div>

          {/* Produkter */}
          {project.products.length > 0 && (
            <div className="bg-card border border-border rounded-xl p-4">
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-3 flex items-center gap-1.5">
                <Package className="h-3.5 w-3.5" /> Produkter
              </p>
              <div className="space-y-1.5">
                {project.products.map((pp) => (
                  <Link key={pp.productId} href={`/products/${pp.productId}`}
                    className="text-sm hover:text-primary transition-colors flex items-center gap-2">
                    <Package className="h-3 w-3 text-muted-foreground" />
                    {pp.product.name}
                  </Link>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* HOEJRE */}
        <div className="xl:col-span-2 space-y-5">

          {/* Lukket-banner */}
          {isClosed && (
            <div className="flex items-center gap-3 p-4 bg-secondary/60 border border-border rounded-xl">
              <Lock className="h-4 w-4 text-muted-foreground shrink-0" />
              <p className="text-sm text-muted-foreground">
                Dette projekt er lukket. Der kan ikke registreres mere tid eller tilknyttes yderligere ressourcer.
              </p>
            </div>
          )}

          {/* Check-ind + tidregistrering */}
          {!isClosed && (
          <div className="bg-card border border-border rounded-xl p-5">
            <h3 className="text-sm font-semibold flex items-center gap-2 mb-4">
              <Timer className="h-4 w-4 text-muted-foreground" /> Registrer tid
              {project.projectBundles.length > 0 && (
                <span className="text-xs font-normal text-muted-foreground ml-auto">
                  Trækkes automatisk på klippekort
                </span>
              )}
            </h3>
            <CheckInButton projectId={project.id} isCheckedIn={isCheckedIn} checkedInAt={checkedInAt} />
            <div className="mt-4 pt-4 border-t border-border">
              <LogTimeForm projectId={project.id} />
            </div>
          </div>
          )}

          {/* Backlog */}
          <div className="bg-card border border-border rounded-xl p-5">
            <h3 className="text-sm font-semibold flex items-center gap-2 mb-4">
              <ListTodo className="h-4 w-4 text-muted-foreground" /> Opgaver ({project.backlog.length})
            </h3>
            {project.backlog.length === 0 ? (
              <p className="text-sm text-muted-foreground">Ingen opgaver endnu.</p>
            ) : (
              <div className="space-y-2">
                {["in_progress", "todo", "done"].map((st) => {
                  const items = project.backlog.filter((i) => i.status === st);
                  if (items.length === 0) return null;
                  return (
                    <div key={st}>
                      <p className="text-xs text-muted-foreground font-medium uppercase tracking-wide mb-1.5">
                        {st === "todo" ? "At gøre" : st === "in_progress" ? "I gang" : "Færdig"}
                      </p>
                      {items.map((item) => (
                        <div key={item.id} className="flex items-center gap-2 py-1.5 px-2 rounded-lg hover:bg-secondary/40">
                          <span className={`text-xs px-1.5 py-0.5 rounded ${PRIORITY_STYLE[item.priority]}`}>
                            {PRIORITY_LABEL[item.priority]}
                          </span>
                          <span className="text-sm flex-1 truncate">{item.title}</span>
                          {item.estimateHours && (
                            <span className="text-xs text-muted-foreground shrink-0">{String(item.estimateHours)}t</span>
                          )}
                        </div>
                      ))}
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Faktura */}
          <div className="bg-card border border-border rounded-xl p-5">
            <h3 className="text-sm font-semibold flex items-center gap-2 mb-3">
              <Receipt className="h-4 w-4 text-muted-foreground" /> Faktura
            </h3>
            {project.invoices && project.invoices.length > 0 ? (
              <div className="space-y-2 mb-3">
                {project.invoices.map((inv: { id: string; number: number; status: string }) => (
                  <Link key={inv.id} href={`/invoices/${inv.id}`}
                    className="flex items-center justify-between p-2.5 rounded-lg hover:bg-secondary/50 transition-colors">
                    <span className="font-mono text-xs text-muted-foreground">F-{String(inv.number).padStart(4,"0")}</span>
                    <span className="text-xs px-2 py-0.5 rounded-full bg-secondary text-muted-foreground">{inv.status}</span>
                  </Link>
                ))}
              </div>
            ) : null}
            {!isClosed && (
              <form action={async () => { "use server"; await generateInvoiceFromProject(id); }}>
                <Button type="submit" size="sm" variant="ghost" className="w-full">
                  <Receipt className="h-3.5 w-3.5" /> Generer faktura fra projekt
                </Button>
              </form>
            )}
            {isClosed && project.invoices && project.invoices.length === 0 && (
              <p className="text-xs text-muted-foreground">
                Projektet er lukket uden faktura. Genåbn for at oprette en.
              </p>
            )}
          </div>

          {/* Tidslogs */}
          <div className="bg-card border border-border rounded-xl p-5">
            <h3 className="text-sm font-semibold flex items-center gap-2 mb-4">
              <Clock className="h-4 w-4 text-muted-foreground" /> Tidsregistreringer ({project.timeLogs.length})
            </h3>
            {project.timeLogs.length === 0 ? (
              <p className="text-sm text-muted-foreground">Ingen tidregistreringer endnu.</p>
            ) : (
              <div className="divide-y divide-border">
                {project.timeLogs.map((log) => (
                  <div key={log.id} className="flex items-center gap-3 py-2.5">
                    <div className="flex-1 min-w-0">
                      {log.description && (
                        <p className="text-sm truncate">{log.description}</p>
                      )}
                      <p className="text-xs text-muted-foreground">
                        {log.user.name} &bull; {new Date(log.date).toLocaleDateString("da-DK")}
                      </p>
                    </div>
                    {log.bundle ? (
                      <Link href={`/klippekort/${log.bundle.id}`}
                        className="text-xs text-primary/70 hover:text-primary font-mono shrink-0 transition-colors">
                        {formatRef(project.tenant.bundlePrefix, log.bundle.number)}
                      </Link>
                    ) : (
                      <span className="text-xs text-muted-foreground shrink-0">Ikke på KB</span>
                    )}
                    <span className={`text-xs px-1.5 py-0.5 rounded-full shrink-0 ${
                      log.isBillable
                        ? "bg-emerald-100 text-emerald-700"
                        : "bg-secondary text-muted-foreground"
                    }`}>
                      {log.isBillable ? "Fakturerbar" : "Intern"}
                    </span>
                    <span className="text-sm font-semibold tabular-nums text-primary shrink-0">
                      {formatDur(log.durationMin)}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Filer-sektion */}
        <div className="bg-card border border-border rounded-xl p-5">
          <div className="flex items-center gap-2 mb-4">
            <Package className="h-4 w-4 text-muted-foreground" />
            <h2 className="text-sm font-semibold">Filer</h2>
          </div>
          <ProjectFiler projectId={project.id} />
        </div>
      </div>
    </>
  );
}

async function ProjectFiler({ projectId }: { projectId: string }) {
  const initialAttachments = await listAttachments("project", projectId);
  return (
    <AttachmentSection
      scope="project"
      parentId={projectId}
      initialAttachments={initialAttachments as any}
      bare
    />
  );
}
