import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { redirect } from "next/navigation";
import { AppTopbar } from "@/components/layout/AppTopbar";
import { getDashboardData } from "@/app/actions/dashboard";
import { getMyCurrentTarget } from "@/app/actions/sales-targets";
import { MyTargetWidget } from "@/components/dashboard/MyTargetWidget";
import { getAtRiskCompanies } from "@/app/actions/health-score";
import { AtRiskCustomersWidget } from "@/components/dashboard/AtRiskCustomersWidget";
import { EmptyDashboard } from "@/components/dashboard/EmptyDashboard";
import {
  Building2, Ticket, TrendingUp, Timer, AlertTriangle, CheckCircle2,
  Clock, ArrowUpRight, FolderKanban, Key, Package, Users, Scissors
} from "lucide-react";
import Link from "next/link";
import { formatCurrency, formatDuration, formatRef } from "@/lib/utils";

const TICKET_STATUS_LABELS: Record<string, string> = {
  // Aktuelle statuses
  open: "Åbne",
  pending_customer: "Afventer kunde",
  pending_supplier: "Afventer leverandør",
  resolved: "Løst",
  closed: "Lukket",
  // Legacy (vises hvis gamle data stadig findes — mappes ikke automatisk her,
  //  bare for at undgå "undefined" tekst i dashboardet)
  new: "Åbne",
  pending_reply: "Afventer kunde",
};
const TICKET_STATUS_COLORS: Record<string, string> = {
  open: "bg-amber-500",
  pending_customer: "bg-purple-500",
  pending_supplier: "bg-indigo-500",
  resolved: "bg-emerald-500",
  closed: "bg-muted-foreground",
  new: "bg-amber-500",
  pending_reply: "bg-purple-500",
};
const PRIORITY_COLORS: Record<string, string> = {
  low: "text-muted-foreground", normal: "text-foreground",
  high: "text-amber-600", critical: "text-destructive",
};
const PROJECT_STATUS_LABELS: Record<string, string> = {
  planning: "Planlægning", active: "Aktiv", on_hold: "På hold",
  completed: "Færdig", cancelled: "Annulleret",
};

function KpiCard({
  label, value, sub, icon: Icon, color = "primary", href, alert,
}: {
  label: string; value: string | number; sub?: string; icon: React.ElementType;
  color?: string; href?: string; alert?: boolean;
}) {
  const colorMap: Record<string, string> = {
    primary: "bg-primary/10 text-primary",
    emerald: "bg-emerald-500/10 text-emerald-600",
    amber: "bg-amber-500/10 text-amber-600",
    blue: "bg-blue-500/10 text-blue-600",
    rose: "bg-rose-500/10 text-rose-600",
  };
  const card = (
    <div className={`bg-card border rounded-xl p-5 transition-all group ${alert ? "border-destructive/40 hover:border-destructive/60" : "border-border hover:border-primary/40 hover:shadow-sm"}`}>
      <div className="flex items-start justify-between">
        <div className={`w-9 h-9 rounded-lg flex items-center justify-center ${colorMap[color] ?? colorMap.primary}`}>
          <Icon className="h-4 w-4" />
        </div>
        {href && <ArrowUpRight className="h-4 w-4 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />}
      </div>
      <p className="text-2xl font-bold mt-3 tabular-nums">{value}</p>
      <p className="text-sm text-foreground mt-0.5">{label}</p>
      {sub && <p className="text-xs text-muted-foreground mt-0.5">{sub}</p>}
    </div>
  );
  if (href) return <Link href={href}>{card}</Link>;
  return card;
}

function Section({ title, href, linkLabel, children }: {
  title: string; href?: string; linkLabel?: string; children: React.ReactNode;
}) {
  return (
    <div className="bg-card border border-border rounded-xl overflow-hidden">
      <div className="flex items-center justify-between px-5 py-3.5 border-b border-border">
        <h3 className="text-sm font-semibold">{title}</h3>
        {href && <Link href={href} className="text-xs text-primary hover:underline">{linkLabel ?? "Se alle"} →</Link>}
      </div>
      <div className="p-4">{children}</div>
    </div>
  );
}

export default async function DashboardPage() {
  const session = await auth();
  const name = session?.user?.name?.split(" ")[0] ?? "der";
  const modules = session?.user?.modules ?? [];

  // Onboarding-gate: hvis admin og ikke faerdig → send til wizard
  if (session?.user?.tenantId) {
    const tenant = await db.tenant.findFirst({
      where: { id: session.user.tenantId },
      select: { onboardingCompletedAt: true },
    });
    if (!tenant?.onboardingCompletedAt) {
      const role = (session.user.role ?? "").toLowerCase();
      if (["admin", "administrator", "super_admin"].includes(role)) {
        redirect("/onboarding");
      }
    }
  }

  const hasSales = modules.includes("sales");
  const hasSupport = modules.includes("support");
  const hasProjects = modules.includes("projects");
  const hasLicenses = modules.includes("licenses");

  const d = await getDashboardData();
  const myTarget = await getMyCurrentTarget().catch(() => null);
  const atRiskCompanies = await getAtRiskCompanies(5).catch(() => []);
  if (!d) return null;

  const activeProjects = d.projectsByStatus["active"] ?? 0;
  const totalTickets = Object.values(d.ticketMap).reduce((a, b) => a + b, 0);

  // Tom-tilstand: ingen kunder, ingen tickets, ingen aktive deals → vis welcome+CTA
  const isEmpty =
    d.companiesCount === 0 &&
    totalTickets === 0 &&
    d.activeDealCount === 0;

  if (isEmpty) {
    const tenantName = session?.user?.tenantName ?? undefined;
    return (
      <>
        <AppTopbar pageTitle="Dashboard" />
        <EmptyDashboard
          userName={name}
          tenantName={tenantName as any}
          modules={modules}
        />
      </>
    );
  }

  return (
    <>
      <AppTopbar pageTitle="Dashboard" />

      <div className="space-y-6">
        {/* Velkomst */}
        <div>
          <h2 className="text-xl font-semibold">Goddag, {name} 👋</h2>
          <p className="text-muted-foreground text-sm mt-0.5">Her er et overblik over din dag</p>
        </div>

        {/* Advarsler */}
        {(d.criticalTickets > 0 || d.licensesExpired > 0 || d.lowBundles.length > 0) && (
          <div className="space-y-2">
            {d.criticalTickets > 0 && (
              <Link href="/support/tickets?priority=critical"
                className="flex items-center gap-3 p-3 bg-destructive/10 border border-destructive/30 rounded-xl hover:bg-destructive/15 transition-colors">
                <AlertTriangle className="h-4 w-4 text-destructive shrink-0" />
                <span className="text-sm text-destructive font-medium">
                  {d.criticalTickets} kritisk{d.criticalTickets > 1 ? "e" : ""} ticket{d.criticalTickets > 1 ? "s" : ""} kræver øjeblikkelig handling
                </span>
              </Link>
            )}
            {d.licensesExpired > 0 && (
              <Link href="/licenses"
                className="flex items-center gap-3 p-3 bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-800 rounded-xl hover:bg-amber-100/50 transition-colors">
                <Key className="h-4 w-4 text-amber-600 shrink-0" />
                <span className="text-sm text-amber-800 dark:text-amber-300 font-medium">
                  {d.licensesExpired} licens{d.licensesExpired > 1 ? "er har" : " har"} udløbet — forny snarest
                </span>
              </Link>
            )}
            {d.lowBundles.length > 0 && (
              <Link href="/klippekort"
                className="flex items-center gap-3 p-3 bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-800 rounded-xl hover:bg-amber-100/50 transition-colors">
                <Scissors className="h-4 w-4 text-amber-600 shrink-0" />
                <span className="text-sm text-amber-800 dark:text-amber-300 font-medium">
                  {d.lowBundles.length} klippekort under 20% — {d.lowBundles.map((b) => b.company.name).join(", ")}
                </span>
              </Link>
            )}
          </div>
        )}

        {/* Mit salgsmål — kun synlig hvis et mål er sat */}
        {myTarget && <MyTargetWidget target={myTarget} />}

        {/* Kunder i risiko — kun synlig hvis health-scores er beregnet */}
        {atRiskCompanies.length > 0 && (
          <AtRiskCustomersWidget rows={atRiskCompanies as any} />
        )}

        {/* KPI */}
        <div className="grid grid-cols-2 xl:grid-cols-4 gap-4">
          <KpiCard label="Aktive kunder" value={d.companiesCount} icon={Building2} color="primary" href="/kunder" />
          {hasSupport && (
            <KpiCard label="Åbne tickets" value={d.openTickets} sub={d.criticalTickets > 0 ? `${d.criticalTickets} kritisk${d.criticalTickets > 1 ? "e" : ""}` : "Alt roligt"}
              icon={Ticket} color={d.criticalTickets > 0 ? "rose" : "amber"} href="/support/tickets" alert={d.criticalTickets > 0} />
          )}
          {hasSales && (
            <KpiCard label="Pipeline" value={formatCurrency(d.pipelineValue)} sub={`${d.activeDealCount} aktive deals`}
              icon={TrendingUp} color="emerald" href="/pipeline" />
          )}
          {hasProjects && (
            <KpiCard label="Mine timer i dag" value={formatDuration(d.myTimeToday)} sub={`${formatDuration(d.myTimeWeek)} denne uge`}
              icon={Timer} color="blue" href="/time" />
          )}
        </div>

        {/* Modul-sektioner */}
        <div className="grid grid-cols-1 xl:grid-cols-3 gap-5">

          {/* Support */}
          {hasSupport && (
            <Section title="Support — Ticket status" href="/support/tickets">
              {totalTickets === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-4">Ingen tickets endnu</p>
              ) : (
                <div className="space-y-2.5">
                  {Object.entries(d.ticketMap).map(([status, count]) => {
                    const pct = Math.round((count / totalTickets) * 100);
                    return (
                      <div key={status}>
                        <div className="flex justify-between text-xs mb-1">
                          <span className="text-muted-foreground">{TICKET_STATUS_LABELS[status] ?? status}</span>
                          <span className="font-medium tabular-nums">{count}</span>
                        </div>
                        <div className="h-1.5 bg-secondary rounded-full overflow-hidden">
                          <div className={`h-full rounded-full ${TICKET_STATUS_COLORS[status] ?? "bg-primary"}`}
                            style={{ width: `${pct}%` }} />
                        </div>
                      </div>
                    );
                  })}
                  <div className="pt-2 text-xs text-muted-foreground text-right">{totalTickets} tickets totalt</div>
                </div>
              )}
            </Section>
          )}

          {/* Salg */}
          {hasSales && (
            <Section title="Salg — Månedsoversigt" href="/pipeline">
              <div className="space-y-3">
                <div className="flex justify-between items-center">
                  <span className="text-sm text-muted-foreground">Aktiv pipeline</span>
                  <span className="text-sm font-semibold tabular-nums">{formatCurrency(d.pipelineValue)}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-muted-foreground">Vundet denne måned</span>
                  <span className="text-sm font-semibold text-emerald-600 tabular-nums">
                    {d.dealsWonMonth > 0 ? formatCurrency(d.dealsWonValueMonth) : "—"}
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-muted-foreground">Win rate</span>
                  <span className={`text-sm font-semibold tabular-nums ${d.winRate !== null && d.winRate >= 50 ? "text-emerald-600" : ""}`}>
                    {d.winRate !== null ? `${d.winRate}%` : "—"}
                  </span>
                </div>
                <div className="pt-2 border-t border-border flex justify-between items-center">
                  <span className="text-sm text-muted-foreground">Aktive deals</span>
                  <span className="text-sm font-semibold tabular-nums">{d.activeDealCount}</span>
                </div>
              </div>
            </Section>
          )}

          {/* Projekter */}
          {hasProjects && (
            <Section title="Projekter og Timer" href="/projects">
              <div className="space-y-3">
                <div className="flex justify-between items-center">
                  <span className="text-sm text-muted-foreground">Aktive projekter</span>
                  <span className="text-sm font-semibold tabular-nums">{activeProjects}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-muted-foreground">Mine timer denne uge</span>
                  <span className="text-sm font-semibold tabular-nums">{formatDuration(d.myTimeWeek)}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-muted-foreground">Team-timer denne uge</span>
                  <span className="text-sm font-semibold tabular-nums">{formatDuration(d.teamTimeWeek)}</span>
                </div>
                {d.lowBundles.length > 0 && (
                  <div className="pt-2 border-t border-border">
                    <Link href="/klippekort" className="flex items-center gap-2 text-xs text-amber-600 hover:underline">
                      <AlertTriangle className="h-3.5 w-3.5" />
                      {d.lowBundles.length} klippekort under 20%
                    </Link>
                  </div>
                )}
              </div>
            </Section>
          )}
        </div>

        {/* Seneste aktivitet */}
        <div className="grid grid-cols-1 xl:grid-cols-2 gap-5">

          {/* Seneste tickets */}
          {hasSupport && d.recentTickets.length > 0 && (
            <Section title="Seneste tickets" href="/support/tickets">
              <div className="divide-y divide-border -my-1">
                {d.recentTickets.map((t) => (
                  <Link key={t.id} href={`/support/tickets/${t.id}`}
                    className="flex items-center gap-3 py-2.5 hover:bg-secondary/30 -mx-1 px-1 rounded-lg transition-colors group">
                    <Ticket className={`h-3.5 w-3.5 shrink-0 ${PRIORITY_COLORS[t.priority]}`} />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate group-hover:text-primary transition-colors">{t.title}</p>
                      <p className="text-xs text-muted-foreground">{t.company.name}</p>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <span className="text-xs font-mono text-muted-foreground">
                        {formatRef(t.tenant.ticketPrefix, t.number)}
                      </span>
                      <span className={`w-2 h-2 rounded-full ${TICKET_STATUS_COLORS[t.status]}`} />
                    </div>
                  </Link>
                ))}
              </div>
            </Section>
          )}

          {/* Seneste tidregistreringer */}
          {hasProjects && d.recentTimeLogs.length > 0 && (
            <Section title="Seneste tidregistreringer" href="/time">
              <div className="divide-y divide-border -my-1">
                {d.recentTimeLogs.map((l) => (
                  <div key={l.id} className="flex items-center gap-3 py-2.5">
                    <Timer className="h-3.5 w-3.5 shrink-0 text-primary/60" />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">
                        {l.project?.title ?? l.ticket?.title ?? "Intern"}
                      </p>
                      <p className="text-xs text-muted-foreground">{l.user.name}</p>
                    </div>
                    <span className="text-sm font-semibold tabular-nums text-primary shrink-0">
                      {formatDuration(l.durationMin)}
                    </span>
                  </div>
                ))}
              </div>
            </Section>
          )}

          {/* Seneste projekter */}
          {hasProjects && d.recentProjects.length > 0 && !d.recentTimeLogs.length && (
            <Section title="Seneste projekter" href="/projects">
              <div className="divide-y divide-border -my-1">
                {d.recentProjects.map((p) => (
                  <Link key={p.id} href={`/projects/${p.id}`}
                    className="flex items-center gap-3 py-2.5 hover:bg-secondary/30 -mx-1 px-1 rounded-lg transition-colors group">
                    <FolderKanban className="h-3.5 w-3.5 shrink-0 text-primary/60" />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate group-hover:text-primary transition-colors">{p.title}</p>
                      <p className="text-xs text-muted-foreground">{p.company.name}</p>
                    </div>
                    <span className="text-xs text-muted-foreground font-mono">
                      {formatRef(p.tenant.projectPrefix, p.number)}
                    </span>
                  </Link>
                ))}
              </div>
            </Section>
          )}

          {/* Licenser */}
          {hasLicenses && d.licensesExpiringSoon > 0 && (
            <Section title="Licenser — Advarsel" href="/licenses">
              <div className="flex items-center gap-3 py-2">
                <div className="w-9 h-9 rounded-lg bg-amber-500/10 flex items-center justify-center">
                  <Key className="h-4 w-4 text-amber-600" />
                </div>
                <div>
                  <p className="text-sm font-medium">{d.licensesExpiringSoon} udløber inden 30 dage</p>
                  {d.licensesExpired > 0 && (
                    <p className="text-xs text-destructive mt-0.5">{d.licensesExpired} allerede udløbet</p>
                  )}
                </div>
              </div>
            </Section>
          )}
        </div>

        {/* Tom state */}
        {d.companiesCount === 0 && (
          <div className="bg-card border border-border rounded-xl p-10 text-center">
            <Building2 className="h-10 w-10 text-muted-foreground/30 mx-auto mb-3" />
            <p className="text-sm font-medium mb-1">Kom i gang med CRM-X</p>
            <p className="text-xs text-muted-foreground mb-4">Start med at oprette dit første kunde</p>
            <div className="flex items-center justify-center gap-3">
              <Link href="/kunder/new"
                className="px-4 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-medium imary/90 transition-colors">
                Opret kunde
              </Link>
            </div>
          </div>
        )}
      </div>
    </>
  );
}
