/**
 * LeaderPersonaView — server-rendered "Mit" dashboard for leder-personaen.
 *
 * Lederen ser team-niveau metrics: total pipeline, vundet-i-mdr, top performers,
 * targets-progress pr saelger, kritiske SLA tickets paa tværs af teamet,
 * og recent wins-feed. Ingen "claim et lead" — det er ikke lederens job.
 *
 * Stil matcher SalesPersonaView/TechPersonaView (rounded-xl kort, soft farver,
 * nordisk æstetik).
 */

import Link from "next/link";
import {
  Users, TrendingUp, Trophy, AlertTriangle, Target, Sparkles,
  ArrowUpRight, CheckCircle2, Calendar, Ticket, Snowflake,
} from "lucide-react";
import { formatCurrency, formatRef } from "@/lib/utils";

interface Props {
  data: {
    teamSize: number;
    pipelineValue: number;
    activeDealsCount: number;
    wonValueMonth: number;
    wonCountMonth: number;
    wonValueWeek: number;
    wonCountWeek: number;
    criticalTicketsCount: number;
    topPerformers: Array<{
      userId: string | null;
      userName: string;
      wonValue: number;
      wonCount: number;
    }>;
    coldReps: Array<{ id: string; name: string | null; email: string }>;
    activeTargets: Array<{
      userId: string;
      userName: string;
      targetAmount: number;
      wonAmount: number;
      progressPct: number;
      wonCount: number;
    }>;
    atRiskTickets: Array<{
      id: string; number: number; title: string;
      priority: string; status: string;
      slaResolveDueAt: Date | null;
      slaResolveBreached: boolean | null;
      company: { name: string };
      assignedTo: { name: string | null } | null;
    }>;
    recentWins: Array<{
      id: string; title: string; value: any;
      closedAt: Date | null;
      company: { name: string };
      assignedTo: { id: string; name: string | null } | null;
    }>;
  };
}

function KpiCard({
  label, value, sub, icon: Icon, color, href, alert,
}: {
  label: string; value: string | number; sub?: string;
  icon: React.ElementType; color: string; href?: string; alert?: boolean;
}) {
  const card = (
    <div className={`bg-card border rounded-xl p-5 transition-all group h-full ${alert ? "border-destructive/40 hover:border-destructive/60" : "border-border hover:border-primary/40 hover:shadow-sm"}`}>
      <div className="flex items-start justify-between">
        <div className={`w-9 h-9 rounded-lg ${color} flex items-center justify-center`}>
          <Icon className="h-4 w-4" />
        </div>
        {href && <ArrowUpRight className="h-4 w-4 text-muted-foreground opacity-0 group-hover:opacity-100" />}
      </div>
      <p className="text-2xl font-bold mt-3 tabular-nums">{value}</p>
      <p className="text-sm mt-0.5">{label}</p>
      {sub && <p className="text-xs text-muted-foreground mt-0.5">{sub}</p>}
    </div>
  );
  return href ? <Link href={href}>{card}</Link> : card;
}

function ProgressBar({ pct, color = "bg-emerald-500" }: { pct: number; color?: string }) {
  const clamped = Math.max(0, Math.min(100, pct));
  const overshoot = pct > 100;
  return (
    <div className="h-1.5 bg-secondary rounded-full overflow-hidden relative">
      <div
        className={`h-full rounded-full transition-all ${overshoot ? "bg-emerald-600" : color}`}
        style={{ width: `${clamped}%` }}
      />
    </div>
  );
}

function relTime(d: Date | null): string {
  if (!d) return "—";
  const ms = Date.now() - new Date(d).getTime();
  const days = Math.floor(ms / 86400000);
  if (days === 0) return "i dag";
  if (days === 1) return "i går";
  if (days < 7) return `for ${days} dage siden`;
  if (days < 30) return `for ${Math.floor(days / 7)} uger siden`;
  return new Date(d).toLocaleDateString("da-DK", { day: "numeric", month: "short" });
}

const PRIORITY_LABELS: Record<string, string> = {
  low: "Lav", normal: "Normal", high: "Høj", critical: "Kritisk",
};
const PRIORITY_COLORS: Record<string, string> = {
  low: "text-muted-foreground",
  normal: "text-foreground",
  high: "text-amber-600 dark:text-amber-500",
  critical: "text-destructive",
};

export function LeaderPersonaView({ data }: Props) {
  const avgWinPerRep = data.teamSize > 0
    ? data.wonValueMonth / data.teamSize
    : 0;

  return (
    <div className="space-y-6">
      {/* Top-KPI: team-pipeline + vundet + team-size + critical-flag */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <KpiCard
          label="Team-pipeline"
          value={formatCurrency(data.pipelineValue)}
          sub={`${data.activeDealsCount} aktive deals`}
          icon={TrendingUp}
          color="bg-primary/10 text-primary"
          href="/pipeline"
        />
        <KpiCard
          label="Vundet denne måned"
          value={formatCurrency(data.wonValueMonth)}
          sub={`${data.wonCountMonth} ${data.wonCountMonth === 1 ? "deal" : "deals"} · ${formatCurrency(avgWinPerRep)} ⌀/rep`}
          icon={CheckCircle2}
          color="bg-emerald-500/10 text-emerald-600"
        />
        <KpiCard
          label="Vundet sidste 7 dage"
          value={formatCurrency(data.wonValueWeek)}
          sub={`${data.wonCountWeek} ${data.wonCountWeek === 1 ? "deal" : "deals"}`}
          icon={Sparkles}
          color="bg-violet-500/10 text-violet-600"
        />
        <KpiCard
          label="Kritiske tickets"
          value={data.criticalTicketsCount}
          sub={data.criticalTicketsCount > 0 ? "Kræver opmærksomhed" : "Alt roligt"}
          icon={AlertTriangle}
          color={data.criticalTicketsCount > 0 ? "bg-destructive/10 text-destructive" : "bg-emerald-500/10 text-emerald-600"}
          href="/support/tickets?priority=critical"
          alert={data.criticalTicketsCount > 0}
        />
      </div>

      {/* Top performers + Cold reps */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Top 5 denne måned */}
        <div className="bg-card border border-border rounded-xl p-5">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <Trophy className="h-4 w-4 text-amber-500" />
              <h3 className="text-sm font-semibold">Top performers — denne måned</h3>
            </div>
          </div>
          {data.topPerformers.length === 0 ? (
            <p className="text-xs text-muted-foreground text-center py-6">
              Ingen vundne deals endnu i indeværende måned
            </p>
          ) : (
            <div className="space-y-3">
              {data.topPerformers.map((p, idx) => {
                const maxWon = data.topPerformers[0]?.wonValue ?? 1;
                const relPct = (p.wonValue / maxWon) * 100;
                return (
                  <div key={p.userId ?? idx} className="space-y-1.5">
                    <div className="flex items-center justify-between gap-3">
                      <div className="flex items-center gap-2 min-w-0">
                        <span className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold tabular-nums ${
                          idx === 0 ? "bg-amber-400 text-amber-950" :
                          idx === 1 ? "bg-slate-300 text-slate-700" :
                          idx === 2 ? "bg-orange-400 text-orange-950" :
                          "bg-secondary text-muted-foreground"
                        }`}>
                          {idx + 1}
                        </span>
                        <span className="text-sm font-medium truncate">{p.userName}</span>
                      </div>
                      <div className="text-right shrink-0">
                        <span className="text-sm font-semibold tabular-nums">{formatCurrency(p.wonValue)}</span>
                        <span className="text-xs text-muted-foreground ml-1.5">· {p.wonCount}</span>
                      </div>
                    </div>
                    <ProgressBar pct={relPct} color="bg-emerald-500" />
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Cold reps — uden won-deal sidste 30 dage */}
        <div className="bg-card border border-border rounded-xl p-5">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <Snowflake className="h-4 w-4 text-blue-500" />
              <h3 className="text-sm font-semibold">Uden won-deal sidste 30 dage</h3>
            </div>
          </div>
          {data.coldReps.length === 0 ? (
            <p className="text-xs text-emerald-600 text-center py-6 flex items-center justify-center gap-1.5">
              <CheckCircle2 className="h-3.5 w-3.5" />
              Alle sælgere har lukket noget de sidste 30 dage
            </p>
          ) : (
            <div className="space-y-2">
              {data.coldReps.map((u) => (
                <div key={u.id} className="flex items-center justify-between gap-3 px-3 py-2 rounded-lg bg-secondary/30">
                  <div className="flex items-center gap-2 min-w-0">
                    <div className="w-7 h-7 rounded-full bg-blue-500/10 text-blue-600 flex items-center justify-center text-xs font-semibold">
                      {(u.name ?? u.email).charAt(0).toUpperCase()}
                    </div>
                    <span className="text-sm truncate">{u.name ?? u.email}</span>
                  </div>
                  <Link href={`/pipeline?owner=${u.id}`} className="text-xs text-primary hover:underline shrink-0">
                    Se pipeline →
                  </Link>
                </div>
              ))}
              <p className="text-[10px] text-muted-foreground pt-1">
                Overvej en 1:1 — tjek om de er blokeret af noget.
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Active sales-targets — fremdrift pr saelger */}
      {data.activeTargets.length > 0 && (
        <div className="bg-card border border-border rounded-xl p-5">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <Target className="h-4 w-4 text-primary" />
              <h3 className="text-sm font-semibold">Aktive sælger-mål</h3>
            </div>
            <Link href="/sales/targets" className="text-xs text-primary hover:underline">Administrer →</Link>
          </div>
          <div className="space-y-3.5">
            {data.activeTargets.map((t) => {
              const pctColor =
                t.progressPct >= 100 ? "bg-emerald-500" :
                t.progressPct >= 75  ? "bg-emerald-500" :
                t.progressPct >= 50  ? "bg-amber-500"   :
                                       "bg-rose-500";
              return (
                <div key={`${t.userId}-${t.targetAmount}`} className="space-y-1.5">
                  <div className="flex items-center justify-between gap-3">
                    <span className="text-sm font-medium truncate">{t.userName}</span>
                    <div className="text-right shrink-0 text-xs">
                      <span className="font-semibold tabular-nums">{formatCurrency(t.wonAmount)}</span>
                      <span className="text-muted-foreground"> / {formatCurrency(t.targetAmount)}</span>
                      <span className={`ml-2 font-semibold tabular-nums ${
                        t.progressPct >= 100 ? "text-emerald-600" :
                        t.progressPct >= 50  ? "text-foreground"  :
                                                "text-rose-600"
                      }`}>{t.progressPct}%</span>
                    </div>
                  </div>
                  <ProgressBar pct={t.progressPct} color={pctColor} />
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Recent wins + At-risk SLA */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Recent wins */}
        <div className="bg-card border border-border rounded-xl p-5">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <Sparkles className="h-4 w-4 text-emerald-500" />
              <h3 className="text-sm font-semibold">Seneste vundne deals</h3>
            </div>
            <Link href="/pipeline?stage=won" className="text-xs text-primary hover:underline">Alle →</Link>
          </div>
          {data.recentWins.length === 0 ? (
            <p className="text-xs text-muted-foreground text-center py-6">
              Ingen vundne deals endnu
            </p>
          ) : (
            <div className="space-y-2">
              {data.recentWins.map((d) => (
                <Link
                  key={d.id}
                  href={`/pipeline/${d.id}`}
                  className="flex items-center justify-between gap-3 px-3 py-2 rounded-lg hover:bg-secondary/60 transition-colors"
                >
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium truncate">{d.title}</p>
                    <p className="text-xs text-muted-foreground truncate flex items-center gap-1">
                      <span>{d.company.name}</span>
                      {d.assignedTo?.name && <><span>·</span><span>{d.assignedTo.name}</span></>}
                      <span>·</span>
                      <span>{relTime(d.closedAt)}</span>
                    </p>
                  </div>
                  <span className="text-sm font-semibold tabular-nums text-emerald-600 shrink-0">
                    {formatCurrency(Number(d.value ?? 0))}
                  </span>
                </Link>
              ))}
            </div>
          )}
        </div>

        {/* At-risk SLA tickets */}
        <div className="bg-card border border-border rounded-xl p-5">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <Ticket className="h-4 w-4 text-rose-500" />
              <h3 className="text-sm font-semibold">Tickets i SLA-fare (team)</h3>
            </div>
            <Link href="/support/tickets" className="text-xs text-primary hover:underline">Alle →</Link>
          </div>
          {data.atRiskTickets.length === 0 ? (
            <p className="text-xs text-emerald-600 text-center py-6 flex items-center justify-center gap-1.5">
              <CheckCircle2 className="h-3.5 w-3.5" />
              Ingen tickets i SLA-fare lige nu
            </p>
          ) : (
            <div className="space-y-2">
              {data.atRiskTickets.map((t) => (
                <Link
                  key={t.id}
                  href={`/support/tickets/${t.id}`}
                  className="flex items-center justify-between gap-3 px-3 py-2 rounded-lg hover:bg-secondary/60 transition-colors"
                >
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium truncate flex items-center gap-1.5">
                      <span className={`w-1.5 h-1.5 rounded-full ${PRIORITY_COLORS[t.priority]?.replace("text-", "bg-")} shrink-0`} />
                      {t.title}
                    </p>
                    <p className="text-xs text-muted-foreground truncate">
                      {t.company.name}
                      {t.assignedTo?.name && ` · ${t.assignedTo.name}`}
                      {t.slaResolveBreached && (
                        <span className="text-destructive font-semibold ml-1">· SLA brudt</span>
                      )}
                    </p>
                  </div>
                  <span className={`text-xs font-mono shrink-0 ${PRIORITY_COLORS[t.priority]}`}>
                    {PRIORITY_LABELS[t.priority] ?? t.priority}
                  </span>
                </Link>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
