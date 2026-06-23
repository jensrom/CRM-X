/**
 * TechPersonaView — server-rendered "Mit" dashboard for tekniker-personaen.
 *
 * Viser brugerens egne tickets/projekter/klippekort + timer i dag + claim-CTA
 * paa unclaimed kritiske tickets.
 */

import Link from "next/link";
import {
  Ticket as TicketIcon, FolderKanban, Scissors, Clock, AlertTriangle,
  ArrowUpRight, Sparkles,
} from "lucide-react";
import { formatDuration, formatRef } from "@/lib/utils";

interface Props {
  data: {
    openTicketsCount: number;
    criticalCount: number;
    activeProjectsCount: number;
    activeBundlesCount: number;
    minutesToday: number;
    unclaimedTickets: number;
    topTickets: Array<{
      id: string; number: number; title: string;
      status: string; priority: string;
      slaResolveDueAt: Date | null; slaResolveBreached: boolean;
      company: { name: string };
    }>;
    activeProjects: Array<{
      id: string; number: number; title: string; status: string;
      endDate: Date | null;
      company: { name: string };
    }>;
    activeBundles: Array<{
      id: string; number: number; name: string | null;
      totalHours: number; usedMinutes: number;
      totalMinutes: number; remainingMinutes: number; usedPct: number;
      company: { name: string };
    }>;
  };
}

const PRIORITY_COLORS: Record<string, string> = {
  low: "text-muted-foreground",
  normal: "text-foreground",
  high: "text-amber-600",
  critical: "text-rose-600",
};

const STATUS_LABELS: Record<string, string> = {
  open: "Åben",
  pending_customer: "Afventer kunde",
  pending_supplier: "Afventer leverandør",
  resolved: "Løst",
  closed: "Lukket",
};

function KpiCard({
  label, value, sub, icon: Icon, color, href, alert,
}: {
  label: string; value: string | number; sub?: string;
  icon: React.ElementType; color: string; href?: string; alert?: boolean;
}) {
  const card = (
    <div className={`bg-card border rounded-xl p-5 hover:border-primary/40 transition-colors group h-full ${
      alert ? "border-rose-300 dark:border-rose-800" : "border-border"
    }`}>
      <div className="flex items-start justify-between">
        <div className={`w-9 h-9 rounded-lg ${color} flex items-center justify-center`}>
          <Icon className="h-4 w-4" />
        </div>
        {href && <ArrowUpRight className="h-4 w-4 text-muted-foreground opacity-0 group-hover:opacity-100" />}
      </div>
      <p className="text-2xl font-bold mt-3 tabular-nums">{value}</p>
      <p className="text-sm mt-0.5">{label}</p>
      {sub && <p className={`text-xs mt-0.5 ${alert ? "text-rose-600" : "text-muted-foreground"}`}>{sub}</p>}
    </div>
  );
  return href ? <Link href={href}>{card}</Link> : card;
}

export function TechPersonaView({ data }: Props) {
  return (
    <div className="space-y-6">
      {/* KPI-row — personlig */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <KpiCard
          label="Mine åbne tickets"
          value={data.openTicketsCount}
          sub={data.criticalCount > 0 ? `${data.criticalCount} kritisk${data.criticalCount === 1 ? "" : "e"}!` : "Ingen kritiske"}
          icon={TicketIcon}
          color={data.criticalCount > 0 ? "bg-rose-500/10 text-rose-600" : "bg-amber-500/10 text-amber-600"}
          href="/support/tickets?owner=me"
          alert={data.criticalCount > 0}
        />
        <KpiCard
          label="Mine projekter"
          value={data.activeProjectsCount}
          sub="Aktive"
          icon={FolderKanban}
          color="bg-primary/10 text-primary"
          href="/projects?owner=me"
        />
        <KpiCard
          label="Mine klippekort"
          value={data.activeBundlesCount}
          sub="Under min varetagelse"
          icon={Scissors}
          color="bg-blue-500/10 text-blue-600"
          href="/klippekort?owner=me"
        />
        <KpiCard
          label="Timer i dag"
          value={formatDuration(data.minutesToday)}
          sub={data.minutesToday === 0 ? "Husk at stemple ind" : "Stemplet"}
          icon={Clock}
          color="bg-emerald-500/10 text-emerald-600"
          href="/time"
        />
      </div>

      {/* Unclaimed kritiske tickets CTA */}
      {data.unclaimedTickets > 0 && (
        <Link href="/support/tickets?owner=unclaimed">
          <div className="bg-card border border-violet-300 dark:border-violet-800 rounded-xl p-4 hover:bg-violet-500/5 transition-colors">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-violet-500/10 text-violet-600 flex items-center justify-center">
                <Sparkles className="h-5 w-5" />
              </div>
              <div className="flex-1">
                <p className="font-semibold">
                  {data.unclaimedTickets} {data.unclaimedTickets === 1 ? "ledig ticket" : "ledige tickets"} venter på en tekniker
                </p>
                <p className="text-sm text-muted-foreground">
                  Tag en hvis du har kapacitet — eller delegér til en kollega.
                </p>
              </div>
              <ArrowUpRight className="h-4 w-4 text-muted-foreground" />
            </div>
          </div>
        </Link>
      )}

      {/* To kolonner: Tickets + Projekter */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className="bg-card border border-border rounded-xl p-5">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-semibold">Mine åbne tickets — prioriteret</h3>
            <Link href="/support/tickets?owner=me" className="text-xs text-primary hover:underline">Se alle →</Link>
          </div>
          {data.topTickets.length === 0 ? (
            <p className="text-xs text-muted-foreground text-center py-6">Ingen åbne tickets — nyd roen 🍵</p>
          ) : (
            <div className="space-y-2">
              {data.topTickets.map((t) => (
                <Link
                  key={t.id}
                  href={`/support/tickets/${t.id}`}
                  className="flex items-center justify-between gap-3 px-3 py-2 rounded-lg hover:bg-secondary/60 transition-colors"
                >
                  <div className="min-w-0 flex-1">
                    <p className={`text-sm font-medium truncate ${PRIORITY_COLORS[t.priority] ?? ""}`}>
                      {formatRef("T", t.number)} · {t.title}
                    </p>
                    <p className="text-xs text-muted-foreground truncate">
                      {t.company.name} · {STATUS_LABELS[t.status] ?? t.status}
                    </p>
                  </div>
                  {t.slaResolveBreached && (
                    <span className="inline-flex items-center gap-1 text-xs text-rose-600 shrink-0">
                      <AlertTriangle className="h-3 w-3" /> SLA
                    </span>
                  )}
                </Link>
              ))}
            </div>
          )}
        </div>

        <div className="bg-card border border-border rounded-xl p-5">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-semibold">Mine aktive projekter</h3>
            <Link href="/projects?owner=me" className="text-xs text-primary hover:underline">Se alle →</Link>
          </div>
          {data.activeProjects.length === 0 ? (
            <p className="text-xs text-muted-foreground text-center py-6">Ingen aktive projekter</p>
          ) : (
            <div className="space-y-2">
              {data.activeProjects.map((p) => {
                const overdue = p.endDate && new Date(p.endDate) < new Date();
                return (
                  <Link
                    key={p.id}
                    href={`/projects/${p.id}`}
                    className="flex items-center justify-between gap-3 px-3 py-2 rounded-lg hover:bg-secondary/60 transition-colors"
                  >
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium truncate">
                        {formatRef("P", p.number)} · {p.title}
                      </p>
                      <p className="text-xs text-muted-foreground truncate">{p.company.name}</p>
                    </div>
                    {p.endDate && (
                      <span className={`text-xs shrink-0 ${overdue ? "text-rose-600" : "text-muted-foreground"}`}>
                        {overdue ? "Overskredet" : `→ ${new Date(p.endDate).toLocaleDateString("da-DK")}`}
                      </span>
                    )}
                  </Link>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* Mine klippekort */}
      {data.activeBundles.length > 0 && (
        <div className="bg-card border border-border rounded-xl p-5">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-semibold">Mine klippekort</h3>
            <Link href="/klippekort?owner=me" className="text-xs text-primary hover:underline">Se alle →</Link>
          </div>
          <div className="space-y-3">
            {data.activeBundles.map((b) => {
              const low = b.usedPct >= 80;
              return (
                <Link
                  key={b.id}
                  href={`/klippekort/${b.id}`}
                  className="block px-3 py-2 rounded-lg hover:bg-secondary/60 transition-colors"
                >
                  <div className="flex items-center justify-between gap-3 mb-1">
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium truncate">
                        {formatRef("KB", b.number)} {b.name ? `· ${b.name}` : ""}
                      </p>
                      <p className="text-xs text-muted-foreground truncate">{b.company.name}</p>
                    </div>
                    <span className={`text-xs tabular-nums shrink-0 ${low ? "text-rose-600 font-semibold" : "text-muted-foreground"}`}>
                      {Math.round(b.remainingMinutes / 60)}t tilbage
                    </span>
                  </div>
                  <div className="h-1.5 bg-secondary rounded-full overflow-hidden">
                    <div
                      className={`h-full rounded-full ${low ? "bg-rose-500" : "bg-emerald-500"}`}
                      style={{ width: `${Math.min(100, b.usedPct)}%` }}
                    />
                  </div>
                </Link>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
