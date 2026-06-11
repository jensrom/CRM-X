import { getReportsData } from "@/app/actions/reports";
import { AppTopbar } from "@/components/layout/AppTopbar";
import { PageHeader } from "@/components/shared/PageHeader";
import { formatCurrency } from "@/lib/utils";
import {
  TrendingUp, Clock, FolderKanban, FileText, Ticket,
  Scissors, Users, BarChart3,
} from "lucide-react";

function fmt(min: number) {
  const h = Math.floor(min / 60);
  const m = min % 60;
  return m > 0 ? `${h}t ${m}m` : `${h}t`;
}

function KPI({
  label,
  value,
  sub,
  icon: Icon,
  accent,
}: {
  label: string;
  value: string;
  sub?: string;
  icon: React.ElementType;
  accent?: string;
}) {
  return (
    <div className="bg-card border border-border rounded-xl p-5">
      <div className="flex items-center justify-between mb-3">
        <p className="text-xs text-muted-foreground font-medium uppercase tracking-wide">{label}</p>
        <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${accent ?? "bg-primary/10"}`}>
          <Icon className="h-4 w-4 text-primary" />
        </div>
      </div>
      <p className="text-2xl font-bold text-foreground">{value}</p>
      {sub && <p className="text-xs text-muted-foreground mt-1">{sub}</p>}
    </div>
  );
}

function Bar({ pct, color }: { pct: number; color: string }) {
  return (
    <div className="h-2 bg-secondary rounded-full overflow-hidden flex-1">
      <div className={`h-full rounded-full ${color}`} style={{ width: `${Math.min(pct, 100)}%` }} />
    </div>
  );
}

export default async function ReportsPage({
  searchParams,
}: {
  searchParams: Promise<{ year?: string; month?: string }>;
}) {
  const sp = await searchParams;
  const now = new Date();
  const year = parseInt(sp.year ?? String(now.getFullYear()));
  const month = parseInt(sp.month ?? String(now.getMonth()));

  const data = await getReportsData({ year, month });
  if (!data) return null;

  const PROJECT_STATUS: Record<string, string> = {
    planning: "Planlægning",
    active: "Aktiv",
    on_hold: "På hold",
    completed: "Færdig",
    cancelled: "Annulleret",
  };
  const STATUS_COLOR: Record<string, string> = {
    planning: "bg-secondary",
    active: "bg-primary",
    on_hold: "bg-amber-500",
    completed: "bg-emerald-500",
    cancelled: "bg-destructive",
  };

  const totalProjects = Object.values(data.projectsByStatus).reduce((s, c) => s + c, 0);
  const maxMonthWon = Math.max(...data.last12Months.map((m) => m.won), 1);
  const maxUserMin = Math.max(...data.timePerUser.map((u) => u.minutes), 1);
  const bundlePct = data.bundleTotalHours > 0
    ? (data.bundleUsedHours / data.bundleTotalHours) * 100
    : 0;

  // Månedsvælger: find nuværende og ±11
  const monthOptions: { label: string; year: number; month: number }[] = [];
  for (let i = 11; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    monthOptions.push({
      label: d.toLocaleDateString("da-DK", { month: "long", year: "numeric" }),
      year: d.getFullYear(),
      month: d.getMonth(),
    });
  }

  return (
    <>
      <AppTopbar pageTitle="Rapporter" />

      <PageHeader
        title="Rapporter"
        description="Overblik over salg, tid, projekter og support"
      />

      {/* Månedsvælger */}
      <form className="mb-6 flex items-center gap-2">
        <BarChart3 className="h-4 w-4 text-muted-foreground" />
        <select
          name="monthSelect"
          defaultValue={`${year}-${month}`}
          onChange={undefined}
          className="px-3 py-1.5 rounded-lg border border-input bg-background text-sm
                     focus:outline-none focus:ring-2 focus:ring-ring"
          onInput={undefined}
        >
          {monthOptions.map((o) => (
            <option key={`${o.year}-${o.month}`} value={`${o.year}-${o.month}`}>
              {o.label}
            </option>
          ))}
        </select>
        {/* Månedsskift via links */}
        <div className="flex gap-1 ml-2">
          {monthOptions.map((o) => (
            <a
              key={`${o.year}-${o.month}`}
              href={`/reports?year=${o.year}&month=${o.month}`}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors
                ${o.year === year && o.month === month
                  ? "bg-primary text-white border-primary"
                  : "bg-background border-border text-muted-foreground hover:text-foreground"
                }`}
            >
              {new Date(o.year, o.month, 1).toLocaleDateString("da-DK", { month: "short" })}
            </a>
          ))}
        </div>
      </form>

      {/* KPI-grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <KPI
          label="Salg denne måned"
          value={formatCurrency(data.dealsWonValueThisMonth)}
          sub={`${data.dealsWonThisMonth} vundne deals`}
          icon={TrendingUp}
          accent="bg-emerald-500/10"
        />
        <KPI
          label="Pipeline"
          value={formatCurrency(data.pipelineValue)}
          sub={`${data.pipelineCount} aktive deals`}
          icon={TrendingUp}
        />
        <KPI
          label="Team-timer (md.)"
          value={fmt(data.teamTimeMonth)}
          sub={`${fmt(data.teamTimeYear)} i år`}
          icon={Clock}
          accent="bg-blue-500/10"
        />
        <KPI
          label="Fakturaer oprettet"
          value={String(data.invoicesThisMonth)}
          sub={`${data.invoicesByStatus["sent"] ?? 0} sendt · ${data.invoicesByStatus["paid"] ?? 0} betalt`}
          icon={FileText}
          accent="bg-violet-500/10"
        />
      </div>

      {/* 2-kolonne layout */}
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">

        {/* Salg de seneste 12 måneder */}
        <div className="bg-card border border-border rounded-xl p-5">
          <div className="flex items-center gap-2 mb-4">
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
            <h3 className="text-sm font-semibold">Salg — seneste 12 måneder</h3>
          </div>
          <div className="space-y-2">
            {data.last12Months.map((m) => (
              <div key={m.label} className="flex items-center gap-3">
                <span className="text-xs text-muted-foreground w-14 shrink-0">{m.label}</span>
                <Bar
                  pct={(m.won / maxMonthWon) * 100}
                  color={m.won > 0 ? "bg-emerald-500" : "bg-secondary"}
                />
                <span className="text-xs font-medium w-24 text-right shrink-0">
                  {m.won > 0 ? formatCurrency(m.won) : "—"}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Timer per medarbejder */}
        <div className="bg-card border border-border rounded-xl p-5">
          <div className="flex items-center gap-2 mb-4">
            <Users className="h-4 w-4 text-muted-foreground" />
            <h3 className="text-sm font-semibold">Timer per medarbejder — {data.monthLabel}</h3>
          </div>
          {data.timePerUser.length === 0 ? (
            <p className="text-sm text-muted-foreground">Ingen tidregistreringer denne måned.</p>
          ) : (
            <div className="space-y-2">
              {data.timePerUser.map((u) => (
                <div key={u.name} className="flex items-center gap-3">
                  <span className="text-xs text-muted-foreground w-28 truncate shrink-0">{u.name}</span>
                  <Bar pct={(u.minutes / maxUserMin) * 100} color="bg-primary" />
                  <span className="text-xs font-medium w-14 text-right shrink-0">{fmt(u.minutes)}</span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Projekter — statusfordeling */}
        <div className="bg-card border border-border rounded-xl p-5">
          <div className="flex items-center gap-2 mb-4">
            <FolderKanban className="h-4 w-4 text-muted-foreground" />
            <h3 className="text-sm font-semibold">Projekter — statusfordeling</h3>
          </div>
          {totalProjects === 0 ? (
            <p className="text-sm text-muted-foreground">Ingen projekter endnu.</p>
          ) : (
            <div className="space-y-2">
              {Object.entries(data.projectsByStatus).map(([status, count]) => (
                <div key={status} className="flex items-center gap-3">
                  <span className="text-xs text-muted-foreground w-28 shrink-0">
                    {PROJECT_STATUS[status] ?? status}
                  </span>
                  <Bar pct={(count / totalProjects) * 100} color={STATUS_COLOR[status] ?? "bg-primary"} />
                  <span className="text-xs font-medium w-8 text-right shrink-0">{count}</span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Klippekort + Support */}
        <div className="space-y-4">
          {/* Klippekort */}
          <div className="bg-card border border-border rounded-xl p-5">
            <div className="flex items-center gap-2 mb-3">
              <Scissors className="h-4 w-4 text-muted-foreground" />
              <h3 className="text-sm font-semibold">Klippekort — aktive</h3>
            </div>
            <div className="flex items-end justify-between mb-2">
              <div>
                <p className="text-2xl font-bold">{data.activeBundlesCount}</p>
                <p className="text-xs text-muted-foreground">aktive klippekort</p>
              </div>
              <div className="text-right">
                <p className="text-sm font-semibold">{data.bundleUsedHours}t / {data.bundleTotalHours}t</p>
                <p className="text-xs text-muted-foreground">brugt af total</p>
              </div>
            </div>
            <div className="h-2 bg-secondary rounded-full overflow-hidden">
              <div
                className={`h-full rounded-full transition-all ${
                  bundlePct > 90 ? "bg-destructive" : bundlePct > 70 ? "bg-amber-500" : "bg-primary"
                }`}
                style={{ width: `${Math.min(bundlePct, 100)}%` }}
              />
            </div>
          </div>

          {/* Support */}
          <div className="bg-card border border-border rounded-xl p-5">
            <div className="flex items-center gap-2 mb-3">
              <Ticket className="h-4 w-4 text-muted-foreground" />
              <h3 className="text-sm font-semibold">Support — {data.monthLabel}</h3>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="text-center p-3 bg-secondary/50 rounded-lg">
                <p className="text-xl font-bold">{data.ticketsThisMonth}</p>
                <p className="text-xs text-muted-foreground mt-0.5">oprettede tickets</p>
              </div>
              <div className="text-center p-3 bg-emerald-500/10 rounded-lg">
                <p className="text-xl font-bold text-emerald-600">{data.ticketsClosedThisMonth}</p>
                <p className="text-xs text-muted-foreground mt-0.5">lukkede tickets</p>
              </div>
            </div>
          </div>
        </div>

        {/* Top projekter (timer) */}
        {data.topProjects.length > 0 && (
          <div className="bg-card border border-border rounded-xl p-5 xl:col-span-2">
            <div className="flex items-center gap-2 mb-4">
              <Clock className="h-4 w-4 text-muted-foreground" />
              <h3 className="text-sm font-semibold">Top projekter efter timer — {data.monthLabel}</h3>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-5 gap-3">
              {data.topProjects.map((p, i) => {
                const maxMin = data.topProjects[0]?.minutes ?? 1;
                return (
                  <div key={i} className="bg-secondary/30 rounded-lg p-3 text-center">
                    <p className="text-xs text-muted-foreground truncate">{p.company}</p>
                    <p className="text-sm font-semibold truncate mt-0.5">{p.project}</p>
                    <p className="text-lg font-bold mt-2">{fmt(p.minutes)}</p>
                    <div className="h-1.5 bg-secondary rounded-full overflow-hidden mt-2">
                      <div
                        className="h-full bg-primary rounded-full"
                        style={{ width: `${(p.minutes / maxMin) * 100}%` }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

      </div>
    </>
  );
}
