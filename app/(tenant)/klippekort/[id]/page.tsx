import { getHourBundle, updateHourBundle, deleteHourBundle } from "@/app/actions/hour-bundles";
import { AppTopbar } from "@/components/layout/AppTopbar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { LockedField } from "@/components/shared/LockedField";
import { auth } from "@/lib/auth";
import { notFound } from "next/navigation";
import Link from "next/link";
import {
  Scissors, ChevronRight, Building2, Trash2, Clock,
  FolderKanban, CalendarDays, TrendingUp, AlertTriangle,
} from "lucide-react";
import { formatDate, formatRef } from "@/lib/utils";
import { BackButton } from "@/components/shared/BackButton";
import { QrCode } from "@/components/shared/QrCode";
import { CreatorBadge } from "@/components/shared/CreatorBadge";

function formatDur(min: number) {
  const h = Math.floor(min / 60);
  const m = min % 60;
  if (h === 0) return `${m}m`;
  if (m === 0) return `${h}t`;
  return `${h}t ${m}m`;
}

const EXPIRY_YEARS = [
  { label: "1 år",  years: 1 },
  { label: "2 år",  years: 2 },
  { label: "3 år",  years: 3 },
  { label: "4 år",  years: 4 },
];

function addYears(date: Date, years: number): string {
  const d = new Date(date);
  d.setFullYear(d.getFullYear() + years);
  return d.toISOString().split("T")[0];
}

export default async function BundleDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ from?: string }>;
}) {
  const { id } = await params;
  const { from } = await searchParams;
  const [bundle, session] = await Promise.all([getHourBundle(id), auth()]);
  if (!bundle) notFound();
  const backHref =
    from && from.startsWith("/") && !from.startsWith("//") ? from : "/klippekort";

  // Kun administrator må redigere låste felter (navn).
  // Match både den indbyggede "Admin"-rolle og super_admin.
  const userRole = session?.user?.role ?? "";
  const canEditName =
    userRole === "super_admin" ||
    userRole.toLowerCase() === "admin" ||
    userRole.toLowerCase() === "administrator";

  async function handleDelete() {
    "use server";
    await deleteHourBundle(id);
  }

  const usedHours   = Math.round(bundle.usedMinutes / 60 * 10) / 10;
  const remainHours = Math.round((bundle.totalHours * 60 - bundle.usedMinutes) / 60 * 10) / 10;
  const pct         = Math.min((bundle.usedMinutes / (bundle.totalHours * 60)) * 100, 100);
  const isExpired   = bundle.expiresAt && new Date(bundle.expiresAt) < new Date();
  const isFull      = remainHours <= 0;

  // Gruppér timelogs pr. projekt
  type ProjectGroup = {
    id: string;
    title: string;
    number: number;
    prefix: string;
    totalMin: number;
    logCount: number;
  };
  const projectMap = new Map<string, ProjectGroup>();
  for (const log of bundle.timeLogs) {
    if (!log.project) continue;
    const key = log.project.id;
    if (!projectMap.has(key)) {
      projectMap.set(key, {
        id: log.project.id,
        title: log.project.title,
        number: log.project.number,
        prefix: "P",
        totalMin: 0,
        logCount: 0,
      });
    }
    const g = projectMap.get(key)!;
    g.totalMin += log.durationMin;
    g.logCount++;
  }
  const projectGroups = Array.from(projectMap.values()).sort((a, b) => b.totalMin - a.totalMin);

  const todayStr = new Date().toISOString().split("T")[0];

  return (
    <>
      <AppTopbar pageTitle={bundle.name ?? `${bundle.totalHours}t klippekort`} />


      <BackButton href={backHref} />
      <div className="flex items-center gap-2 text-sm text-muted-foreground mb-5">
        <Link href="/klippekort" className="hover:text-foreground transition-colors">Klippekort</Link>
        <ChevronRight className="h-3.5 w-3.5" />
        <span className="text-foreground font-medium">
          KB-{String(bundle.number).padStart(4, "0")}
          {bundle.name && ` — ${bundle.name}`}
        </span>
      </div>

      {/* Advarsler */}
      {isExpired && (
        <div className="flex items-center gap-2 mb-4 px-4 py-3 bg-red-50 border border-red-200 rounded-xl text-red-700 text-sm">
          <AlertTriangle className="h-4 w-4 shrink-0" />
          Dette klippekort er udlobet ({formatDate(bundle.expiresAt!)})
        </div>
      )}
      {isFull && !isExpired && (
        <div className="flex items-center gap-2 mb-4 px-4 py-3 bg-amber-50 border border-amber-200 rounded-xl text-amber-700 text-sm">
          <AlertTriangle className="h-4 w-4 shrink-0" />
          Alle timer er opbrugt på dette klippekort
        </div>
      )}

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">

        {/* VENSTRE */}
        <div className="xl:col-span-1 space-y-4">

          {/* Oversigtskort */}
          <div className="bg-card border border-border rounded-xl p-4">
            <div className="flex items-start gap-3 mb-4">
              <div className="w-10 h-10 rounded-xl bg-emerald-500/10 flex items-center justify-center shrink-0">
                <Scissors className="h-5 w-5 text-emerald-600" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-mono text-xs text-muted-foreground">
                  KB-{String(bundle.number).padStart(4, "0")}
                </p>
                <p className="font-semibold">{bundle.name ?? `${bundle.totalHours}t klippekort`}</p>
                <Link href={`/kunder/${bundle.company.id}`} className="text-xs text-muted-foreground hover:text-primary flex items-center gap-1 transition-colors">
                  <Building2 className="h-3 w-3" />{bundle.company.name}
                </Link>
              </div>
              <QrCode
                url={`${process.env.NEXT_PUBLIC_APP_URL ?? ""}/klippekort/${bundle.id}`}
                storageKey={`klippekort/${bundle.id}`}
                label={`KB-${String(bundle.number).padStart(4, "0")}`}
              />
            </div>

            {/* Timeopgørelse */}
            <div className="space-y-1.5 mb-3">
              <div className="flex justify-between text-xs">
                <span className="text-muted-foreground">Købt</span>
                <span className="font-medium">{bundle.totalHours}t</span>
              </div>
              <div className="flex justify-between text-xs">
                <span className="text-muted-foreground">Brugt</span>
                <span className="font-medium text-amber-600">{usedHours}t</span>
              </div>
              <div className="flex justify-between text-xs border-t border-border pt-1.5">
                <span className="font-semibold">Rest</span>
                <span className={`font-bold ${isFull ? "text-destructive" : "text-emerald-600"}`}>
                  {remainHours}t
                </span>
              </div>
            </div>

            {/* Progress bar */}
            <div className="h-2.5 bg-secondary rounded-full overflow-hidden mb-3">
              <div
                className={`h-full rounded-full transition-all ${
                  pct >= 100 ? "bg-destructive" : pct > 80 ? "bg-amber-500" : "bg-emerald-500"
                }`}
                style={{ width: `${pct}%` }}
              />
            </div>

            <div className="grid grid-cols-2 gap-2 text-center p-3 bg-secondary/50 rounded-lg">
              <div>
                <p className="text-lg font-bold">{bundle.projectBundles.length}</p>
                <p className="text-xs text-muted-foreground">Projekter</p>
              </div>
              <div>
                <p className="text-lg font-bold">{bundle.timeLogs.length}</p>
                <p className="text-xs text-muted-foreground">Registreringer</p>
              </div>
            </div>

            {bundle.expiresAt && (
              <div className="mt-3 flex items-center gap-2 text-xs text-muted-foreground">
                <CalendarDays className="h-3.5 w-3.5" />
                Udlober {formatDate(bundle.expiresAt)}
              </div>
            )}
            {bundle.purchaseDate && (
              <div className="mt-1 flex items-center gap-2 text-xs text-muted-foreground">
                <CalendarDays className="h-3.5 w-3.5" />
                Købt {formatDate(bundle.purchaseDate)}
              </div>
            )}
          </div>

          {/* Projekt-fordeling */}
          {projectGroups.length > 0 && (
            <div className="bg-card border border-border rounded-xl p-4">
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-3 flex items-center gap-1.5">
                <FolderKanban className="h-3.5 w-3.5" /> Timeforbrug pr. projekt
              </p>
              <div className="space-y-3">
                {projectGroups.map((g) => {
                  const projPct = bundle.usedMinutes > 0
                    ? Math.round((g.totalMin / bundle.usedMinutes) * 100)
                    : 0;
                  return (
                    <div key={g.id}>
                      <div className="flex items-center justify-between text-xs mb-1">
                        <Link href={`/projects/${g.id}`} className="font-medium hover:text-primary transition-colors truncate">
                          P-{String(g.number).padStart(4, "0")} {g.title}
                        </Link>
                        <span className="text-muted-foreground ml-2 shrink-0">
                          {formatDur(g.totalMin)} ({projPct}%)
                        </span>
                      </div>
                      <div className="h-1.5 bg-secondary rounded-full overflow-hidden">
                        <div className="h-full bg-primary/60 rounded-full" style={{ width: `${projPct}%` }} />
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>

        {/* HOEJRE */}
        <div className="xl:col-span-2 space-y-5">

          {/* Rediger */}
          <div className="bg-card border border-border rounded-xl p-5">
            <h3 className="text-sm font-semibold mb-4">Rediger klippekort</h3>
            <form action={updateHourBundle} className="space-y-4">
              <input type="hidden" name="id" value={bundle.id} />

              <LockedField
                name="name"
                label="Navn"
                defaultValue={bundle.name ?? ""}
                placeholder="fx '20-timers pakke Q3 2025'"
                canEdit={canEditName}
                unlockLabel="Rediger navn"
                lockedHint="Klik Rediger navn for at låse op. Beskyt mod utilsigtede ændringer."
                noPermissionHint="Kun administrator kan ændre navnet på klippekortet"
              />
              <Input name="totalHours" label="Antal timer" type="number" min="1" step="1" defaultValue={String(bundle.totalHours)} required />
              <Input name="price" label="Pris (DKK)" type="number" min="0" step="100" defaultValue={bundle.price ? String(bundle.price) : ""} />

              {/* Udlobsdato med genveje */}
              <div className="space-y-2">
                <label className="block text-sm font-medium text-foreground">Udlobsdato</label>
                <div className="flex gap-1.5 flex-wrap">
                  {EXPIRY_YEARS.map((s) => (
                    <span key={s.label} className="text-xs text-muted-foreground px-2 py-1 bg-secondary rounded-lg">
                      {s.label}: {addYears(new Date(bundle.purchaseDate), s.years)}
                    </span>
                  ))}
                </div>
                <input
                  name="expiresAt"
                  type="date"
                  defaultValue={bundle.expiresAt ? new Date(bundle.expiresAt).toISOString().split("T")[0] : ""}
                  className="w-full px-3 py-2 rounded-lg border border-input bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                />
              </div>

              <div className="space-y-1.5">
                <label className="block text-sm font-medium text-foreground">Status</label>
                <select name="isActive" defaultValue={bundle.isActive ? "true" : "false"}
                  className="w-full px-3 py-2 rounded-lg border border-input bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring">
                  <option value="true">Aktiv</option>
                  <option value="false">Inaktiv</option>
                </select>
              </div>

              <div className="space-y-1.5">
                <label className="block text-sm font-medium text-foreground">Notater</label>
                <textarea name="notes" rows={2} defaultValue={bundle.notes ?? ""}
                  className="w-full px-3 py-2 rounded-lg border border-input bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring resize-none" />
              </div>

              <div className="flex items-center justify-between pt-2">
                <Button type="submit" size="md">Gem ændringer</Button>
              </div>
            </form>
            <form action={handleDelete} className="mt-3 flex justify-end">
              <Button type="submit" variant="ghost" size="sm" className="text-destructive hover:text-destructive hover:bg-destructive/10">
                <Trash2 className="h-3.5 w-3.5" /> Slet klippekort
              </Button>
            </form>

            <div className="mt-4 pt-3 border-t border-border">
              <CreatorBadge
                createdById={(bundle as any).createdById}
                createdByImpersonatorId={(bundle as any).createdByImpersonatorId}
                createdAt={(bundle as any).createdAt ?? bundle.purchaseDate}
              />
            </div>
          </div>

          {/* Tilknyttede projekter */}
          {bundle.projectBundles.length > 0 && (
            <div className="bg-card border border-border rounded-xl p-5">
              <h3 className="text-sm font-semibold flex items-center gap-2 mb-4">
                <FolderKanban className="h-4 w-4 text-muted-foreground" />
                Tilknyttede projekter ({bundle.projectBundles.length})
              </h3>
              <div className="space-y-2">
                {bundle.projectBundles.map((pb) => (
                  <Link key={pb.id} href={`/projects/${pb.project.id}`}
                    className="flex items-center gap-3 p-2.5 rounded-lg hover:bg-secondary/50 transition-colors">
                    <FolderKanban className="h-4 w-4 text-muted-foreground shrink-0" />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">{pb.project.title}</p>
                    </div>
                    <p className="text-xs font-mono text-muted-foreground shrink-0">
                      P-{String(pb.project.number).padStart(4, "0")}
                    </p>
                  </Link>
                ))}
              </div>
            </div>
          )}

          {/* Tidslogs (alle) */}
          {bundle.timeLogs.length > 0 && (
            <div className="bg-card border border-border rounded-xl p-5">
              <h3 className="text-sm font-semibold flex items-center gap-2 mb-4">
                <Clock className="h-4 w-4 text-muted-foreground" />
                Tidsregistreringer ({bundle.timeLogs.length})
              </h3>
              <div className="divide-y divide-border">
                {bundle.timeLogs.map((log) => (
                  <div key={log.id} className="flex items-center gap-3 py-2.5">
                    <div className="flex-1 min-w-0">
                      {log.description && <p className="text-sm truncate">{log.description}</p>}
                      <p className="text-xs text-muted-foreground">
                        {log.user.name}
                        {log.project && (
                          <> &bull; <Link href={`/projects/${log.project.id}`} className="hover:text-primary transition-colors">
                            P-{String(log.project.number).padStart(4, "0")} {log.project.title}
                          </Link></>
                        )}
                        {" "}&bull; {new Date(log.date).toLocaleDateString("da-DK")}
                      </p>
                    </div>
                    <span className="text-sm font-semibold tabular-nums text-primary shrink-0">
                      {formatDur(log.durationMin)}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </>
  );
}
