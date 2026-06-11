import { getTenantTimeLogs, getTenantUsers } from "@/app/actions/time-logs";
import { auth } from "@/lib/auth";
import { AppTopbar } from "@/components/layout/AppTopbar";
import { PageHeader } from "@/components/shared/PageHeader";
import { Timer, Clock, TrendingUp, Users, FolderKanban, Ticket, CalendarDays } from "lucide-react";
import Link from "next/link";
import { formatRef, formatDate, formatDuration } from "@/lib/utils";

function isoWeekStart(d: Date) {
  const day = d.getDay();
  const diff = d.getDate() - day + (day === 0 ? -6 : 1);
  return new Date(d.setDate(diff));
}

export default async function TidsregistreringPage({
  searchParams,
}: {
  searchParams: Promise<{ userId?: string; from?: string; to?: string; period?: string }>;
}) {
  const sp = await searchParams;
  const session = await auth();
  const myId = session?.user?.id;

  // Standardperiode: denne uge
  const now = new Date();
  const weekStart = isoWeekStart(new Date());
  const weekStartStr = weekStart.toISOString().split("T")[0];
  const todayStr = now.toISOString().split("T")[0];

  const period = sp.period ?? "week";
  let fromDate: string;
  let toDate = todayStr;

  if (sp.from) {
    fromDate = sp.from;
    toDate = sp.to ?? todayStr;
  } else if (period === "today") {
    fromDate = todayStr;
  } else if (period === "week") {
    fromDate = weekStartStr;
  } else if (period === "month") {
    fromDate = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-01`;
  } else {
    fromDate = weekStartStr;
  }

  const [logs, users] = await Promise.all([
    getTenantTimeLogs({
      from: fromDate,
      to: toDate,
      userId: sp.userId,
    }),
    getTenantUsers(),
  ]);

  // ── Aggregater ───────────────────────────────────────────────────────
  const totalMin = logs.reduce((s, l) => s + l.durationMin, 0);
  const billableMin = logs.filter((l) => l.isBillable).reduce((s, l) => s + l.durationMin, 0);
  const projectMin = logs.filter((l) => l.project).reduce((s, l) => s + l.durationMin, 0);
  const ticketMin = logs.filter((l) => l.ticket).reduce((s, l) => s + l.durationMin, 0);

  // Gruppér pr. bruger
  const byUser = users
    .map((u) => {
      const uLogs = logs.filter((l) => l.user.id === u.id);
      const mins = uLogs.reduce((s, l) => s + l.durationMin, 0);
      return { ...u, mins, count: uLogs.length };
    })
    .filter((u) => u.count > 0)
    .sort((a, b) => b.mins - a.mins);

  // Gruppér pr. dag (til tabel)
  type DayGroup = { date: string; entries: typeof logs; totalMin: number };
  const byDay: DayGroup[] = [];
  const dayMap = new Map<string, typeof logs>();
  for (const log of logs) {
    const key = log.date instanceof Date
      ? log.date.toISOString().split("T")[0]
      : String(log.date).split("T")[0];
    if (!dayMap.has(key)) dayMap.set(key, []);
    dayMap.get(key)!.push(log);
  }
  for (const [date, entries] of Array.from(dayMap.entries()).sort((a, b) => b[0].localeCompare(a[0]))) {
    byDay.push({ date, entries, totalMin: entries.reduce((s, l) => s + l.durationMin, 0) });
  }

  const PERIODS = [
    { key: "today", label: "I dag" },
    { key: "week",  label: "Denne uge" },
    { key: "month", label: "Denne måned" },
  ];

  return (
    <>
      <AppTopbar pageTitle="Tidsregistrering" />

      <PageHeader
        title="Tidsregistrering"
        description={`${formatDuration(totalMin)} registreret i perioden`}
      />

      {/* Filtre */}
      <div className="flex flex-wrap items-center gap-3 mb-5">
        {/* Tidsperiode */}
        <div className="flex gap-1 bg-secondary/60 rounded-lg p-1">
          {PERIODS.map((p) => (
            <Link
              key={p.key}
              href={`/time?period=${p.key}${sp.userId ? `&userId=${sp.userId}` : ""}`}
              className={`px-3 py-1 rounded-md text-xs font-medium transition-colors ${
                period === p.key && !sp.from
                  ? "bg-background shadow text-foreground"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              {p.label}
            </Link>
          ))}
        </div>

        {/* Brugerfilter */}
        {users.length > 1 && (
          <form method="get">
            <input type="hidden" name="period" value={period} />
            <select
              name="userId"
              defaultValue={sp.userId ?? ""}
              onChange={undefined}
              className="px-3 py-1.5 rounded-lg border border-input bg-background text-xs focus:outline-none focus:ring-2 focus:ring-ring"
            >
              <option value="">Alle medarbejdere</option>
              {users.map((u) => (
                <option key={u.id} value={u.id}>{u.name}</option>
              ))}
            </select>
            <button type="submit" className="ml-2 px-2 py-1.5 text-xs bg-secondary rounded-lg hover:bg-secondary/80 transition-colors">
              Filtrer
            </button>
          </form>
        )}
      </div>

      {/* KPI-kort */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
        <KpiCard
          icon={Clock}
          label="Total tid"
          value={formatDuration(totalMin)}
          sub={`${logs.length} registreringer`}
          color="blue"
        />
        <KpiCard
          icon={TrendingUp}
          label="Fakturerbar"
          value={formatDuration(billableMin)}
          sub={totalMin > 0 ? `${Math.round((billableMin / totalMin) * 100)}%` : "—"}
          color="green"
        />
        <KpiCard
          icon={FolderKanban}
          label="Projekttid"
          value={formatDuration(projectMin)}
          color="purple"
        />
        <KpiCard
          icon={Ticket}
          label="Ticket-tid"
          value={formatDuration(ticketMin)}
          color="amber"
        />
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-4 gap-6">

        {/* ── Medarbej­der­over­sigt (sidebar) ─────────────────────── */}
        {byUser.length > 0 && (
          <div className="xl:col-span-1">
            <div className="bg-card border border-border rounded-xl p-4">
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-3 flex items-center gap-1.5">
                <Users className="h-3.5 w-3.5" /> Medarbej­dere
              </p>
              <div className="space-y-3">
                {byUser.map((u) => {
                  const pct = totalMin > 0 ? Math.round((u.mins / totalMin) * 100) : 0;
                  return (
                    <div key={u.id}>
                      <div className="flex items-center justify-between text-xs mb-1">
                        <span className="font-medium truncate">{u.name}</span>
                        <span className="text-muted-foreground shrink-0 ml-2">{formatDuration(u.mins)}</span>
                      </div>
                      <div className="h-1.5 bg-secondary rounded-full overflow-hidden">
                        <div
                          className="h-full bg-primary/60 rounded-full"
                          style={{ width: `${pct}%` }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        )}

        {/* ── Log tabel ─────────────────────────────────────────────── */}
        <div className={byUser.length > 0 ? "xl:col-span-3" : "xl:col-span-4"}>
          {byDay.length === 0 ? (
            <div className="bg-card border border-border rounded-xl p-10 text-center">
              <Timer className="h-8 w-8 text-muted-foreground mx-auto mb-3" />
              <p className="text-sm text-muted-foreground">Ingen tidregistreringer i den valgte periode</p>
            </div>
          ) : (
            <div className="space-y-4">
              {byDay.map(({ date, entries, totalMin: dayTotal }) => (
                <div key={date} className="bg-card border border-border rounded-xl overflow-hidden">
                  {/* Dagsoverskrift */}
                  <div className="flex items-center justify-between px-4 py-2.5 bg-secondary/30 border-b border-border">
                    <div className="flex items-center gap-2">
                      <CalendarDays className="h-3.5 w-3.5 text-muted-foreground" />
                      <span className="text-sm font-semibold">
                        {new Date(date + "T12:00:00").toLocaleDateString("da-DK", {
                          weekday: "long",
                          day: "numeric",
                          month: "long",
                        })}
                      </span>
                    </div>
                    <span className="text-xs font-medium text-primary">
                      {formatDuration(dayTotal)}
                    </span>
                  </div>

                  {/* Rækker */}
                  <div className="divide-y divide-border">
                    {entries.map((log) => {
                      const ref = log.project
                        ? formatRef(log.project.tenant.projectPrefix, log.project.number)
                        : log.ticket
                        ? formatRef(log.ticket.tenant.ticketPrefix, log.ticket.number)
                        : null;

                      const href = log.project
                        ? `/projects/${log.project.id}`
                        : log.ticket
                        ? `/support/tickets/${log.ticket.id}`
                        : null;

                      const title = log.project?.title ?? log.ticket?.title ?? null;

                      return (
                        <div
                          key={log.id}
                          className="flex items-center gap-4 px-4 py-3 hover:bg-secondary/20 transition-colors"
                        >
                          {/* Ikon */}
                          <div className="shrink-0">
                            {log.project ? (
                              <FolderKanban className="h-4 w-4 text-primary/60" />
                            ) : (
                              <Ticket className="h-4 w-4 text-amber-500/70" />
                            )}
                          </div>

                          {/* Reference + titel */}
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2">
                              {ref && href ? (
                                <Link
                                  href={href}
                                  className="text-xs text-muted-foreground hover:text-primary font-mono transition-colors"
                                >
                                  {ref}
                                </Link>
                              ) : null}
                              {title && (
                                <span className="text-sm font-medium truncate">{title}</span>
                              )}
                            </div>
                            {log.backlogItem && (
                              <p className="text-xs text-muted-foreground mt-0.5 truncate">
                                {log.backlogItem.title}
                              </p>
                            )}
                            {log.description && (
                              <p className="text-xs text-muted-foreground mt-0.5 truncate italic">
                                {log.description}
                              </p>
                            )}
                          </div>

                          {/* Bruger */}
                          <span className="text-xs text-muted-foreground shrink-0 hidden md:block">
                            {log.user.name}
                          </span>

                          {/* Billable */}
                          <span
                            className={`text-xs px-1.5 py-0.5 rounded-full shrink-0 hidden sm:block ${
                              log.isBillable
                                ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400"
                                : "bg-secondary text-muted-foreground"
                            }`}
                          >
                            {log.isBillable ? "Fakturerbar" : "Intern"}
                          </span>

                          {/* Varighed */}
                          <span className="text-sm font-semibold tabular-nums text-primary shrink-0">
                            {formatDuration(log.durationMin)}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </>
  );
}

function KpiCard({
  icon: Icon,
  label,
  value,
  sub,
  color,
}: {
  icon: React.ElementType;
  label: string;
  value: string;
  sub?: string;
  color: "blue" | "green" | "purple" | "amber";
}) {
  const colors = {
    blue:   "bg-blue-500/10 text-blue-600 dark:text-blue-400",
    green:  "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400",
    purple: "bg-purple-500/10 text-purple-600 dark:text-purple-400",
    amber:  "bg-amber-500/10 text-amber-600 dark:text-amber-400",
  };

  return (
    <div className="bg-card border border-border rounded-xl p-4">
      <div className={`w-8 h-8 rounded-lg ${colors[color]} flex items-center justify-center mb-3`}>
        <Icon className="h-4 w-4" />
      </div>
      <p className="text-2xl font-bold tabular-nums">{value}</p>
      <p className="text-xs text-muted-foreground mt-0.5">{label}</p>
      {sub && <p className="text-xs text-muted-foreground mt-0.5">{sub}</p>}
    </div>
  );
}
