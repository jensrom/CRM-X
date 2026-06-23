/**
 * SalesPersonaView — server-rendered "Mit" dashboard for saelger-personaen.
 *
 * Viser brugerens egne deals/leads/tilbud/pipeline-vaerdi + claim-CTA paa
 * unclaimed leads. Komplementeres af MyTargetWidget i parent-pagen.
 */

import Link from "next/link";
import {
  TrendingUp, Target, FileText, CheckCircle2, AlertCircle,
  ArrowUpRight, Sparkles,
} from "lucide-react";
import { formatCurrency, formatRef } from "@/lib/utils";

interface Props {
  data: {
    openDealsCount: number;
    pipelineValue: number;
    wonThisMonth: number;
    wonCountMonth: number;
    draftQuotesCount: number;
    leadsCount: number;
    unclaimedLeads: number;
    topDeals: Array<{
      id: string; title: string; stage: string;
      value: any; probability: number;
      expectedCloseDate: Date | null;
      company: { name: string };
    }>;
    activeLeads: Array<{
      id: string; firstName: string; lastName: string;
      company: string | null; status: string; source: string | null;
    }>;
    sentQuotes: Array<{
      id: string; number: number; title: string | null;
      sentAt: Date | null; validUntil: Date | null;
      company: { name: string };
    }>;
  };
}

const STAGE_LABELS: Record<string, string> = {
  new: "Ny", qualified: "Kvalificeret", proposal: "Tilbud sendt",
  negotiation: "Forhandling", won: "Vundet", lost: "Tabt",
};

const LEAD_STATUS_LABELS: Record<string, string> = {
  new: "Ny", contacted: "Kontaktet", qualified: "Kvalificeret",
  converted: "Konverteret", lost: "Tabt",
};

function Card({ children, href }: { children: React.ReactNode; href?: string }) {
  const body = (
    <div className="bg-card border border-border rounded-xl p-5 hover:border-primary/40 transition-colors h-full">
      {children}
    </div>
  );
  return href ? <Link href={href}>{body}</Link> : body;
}

function KpiCard({
  label, value, sub, icon: Icon, color, href,
}: {
  label: string; value: string | number; sub?: string;
  icon: React.ElementType; color: string; href?: string;
}) {
  const card = (
    <div className="bg-card border border-border rounded-xl p-5 hover:border-primary/40 transition-colors group h-full">
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

export function SalesPersonaView({ data }: Props) {
  return (
    <div className="space-y-6">
      {/* KPI-row — personlig */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <KpiCard
          label="Mine åbne deals"
          value={data.openDealsCount}
          sub={`${formatCurrency(data.pipelineValue)} i pipeline`}
          icon={TrendingUp}
          color="bg-primary/10 text-primary"
          href="/pipeline?owner=me"
        />
        <KpiCard
          label="Vundet denne måned"
          value={formatCurrency(data.wonThisMonth)}
          sub={`${data.wonCountMonth} ${data.wonCountMonth === 1 ? "deal" : "deals"}`}
          icon={CheckCircle2}
          color="bg-emerald-500/10 text-emerald-600"
        />
        <KpiCard
          label="Mine leads"
          value={data.leadsCount}
          sub={data.unclaimedLeads > 0 ? `+ ${data.unclaimedLeads} ledige` : "Ingen ledige"}
          icon={Target}
          color="bg-blue-500/10 text-blue-600"
          href="/leads?owner=me"
        />
        <KpiCard
          label="Mine tilbud"
          value={data.draftQuotesCount}
          sub={data.draftQuotesCount > 0 ? "Kladder klar til sending" : "Alt er sendt"}
          icon={FileText}
          color="bg-amber-500/10 text-amber-600"
          href="/quotes?owner=me"
        />
      </div>

      {/* Unclaimed CTA */}
      {data.unclaimedLeads > 0 && (
        <Card href="/leads?owner=unclaimed">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-violet-500/10 text-violet-600 flex items-center justify-center">
              <Sparkles className="h-5 w-5" />
            </div>
            <div className="flex-1">
              <p className="font-semibold">
                {data.unclaimedLeads} {data.unclaimedLeads === 1 ? "ledigt lead" : "ledige leads"} venter på en sælger
              </p>
              <p className="text-sm text-muted-foreground">
                Tryk for at se og claime — jo hurtigere du tager kontakt, jo bedre konvertering.
              </p>
            </div>
            <ArrowUpRight className="h-4 w-4 text-muted-foreground" />
          </div>
        </Card>
      )}

      {/* To kolonner: Mine top-deals + Mine aktive leads */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className="bg-card border border-border rounded-xl p-5">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-semibold">Mine top deals</h3>
            <Link href="/pipeline?owner=me" className="text-xs text-primary hover:underline">Se alle →</Link>
          </div>
          {data.topDeals.length === 0 ? (
            <p className="text-xs text-muted-foreground text-center py-6">Ingen åbne deals</p>
          ) : (
            <div className="space-y-2">
              {data.topDeals.map((d) => (
                <Link
                  key={d.id}
                  href={`/pipeline/${d.id}`}
                  className="flex items-center justify-between gap-3 px-3 py-2 rounded-lg hover:bg-secondary/60 transition-colors"
                >
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium truncate">{d.title}</p>
                    <p className="text-xs text-muted-foreground truncate">
                      {d.company.name} · {STAGE_LABELS[d.stage] ?? d.stage} · {d.probability}%
                    </p>
                  </div>
                  <span className="text-sm tabular-nums shrink-0">{formatCurrency(Number(d.value ?? 0))}</span>
                </Link>
              ))}
            </div>
          )}
        </div>

        <div className="bg-card border border-border rounded-xl p-5">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-semibold">Mine aktive leads</h3>
            <Link href="/leads?owner=me" className="text-xs text-primary hover:underline">Se alle →</Link>
          </div>
          {data.activeLeads.length === 0 ? (
            <p className="text-xs text-muted-foreground text-center py-6">Ingen aktive leads</p>
          ) : (
            <div className="space-y-2">
              {data.activeLeads.map((l) => (
                <Link
                  key={l.id}
                  href={`/leads/${l.id}`}
                  className="flex items-center justify-between gap-3 px-3 py-2 rounded-lg hover:bg-secondary/60 transition-colors"
                >
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium truncate">{l.firstName} {l.lastName}</p>
                    <p className="text-xs text-muted-foreground truncate">
                      {l.company ?? "—"} · {l.source ?? "ukendt kilde"}
                    </p>
                  </div>
                  <span className="text-[10px] uppercase tracking-wider px-2 py-0.5 rounded-full bg-secondary text-muted-foreground shrink-0">
                    {LEAD_STATUS_LABELS[l.status] ?? l.status}
                  </span>
                </Link>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Mine sendte tilbud */}
      {data.sentQuotes.length > 0 && (
        <div className="bg-card border border-border rounded-xl p-5">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-semibold">Mine sendte tilbud — afventer svar</h3>
            <Link href="/quotes?owner=me" className="text-xs text-primary hover:underline">Se alle →</Link>
          </div>
          <div className="space-y-2">
            {data.sentQuotes.map((q) => {
              const overdue = q.validUntil && new Date(q.validUntil) < new Date();
              return (
                <Link
                  key={q.id}
                  href={`/quotes/${q.id}`}
                  className="flex items-center justify-between gap-3 px-3 py-2 rounded-lg hover:bg-secondary/60 transition-colors"
                >
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium truncate">
                      {formatRef("Q", q.number)} {q.title ? `· ${q.title}` : ""}
                    </p>
                    <p className="text-xs text-muted-foreground truncate">{q.company.name}</p>
                  </div>
                  {overdue ? (
                    <span className="inline-flex items-center gap-1 text-xs text-rose-600">
                      <AlertCircle className="h-3 w-3" /> Udløbet
                    </span>
                  ) : q.validUntil ? (
                    <span className="text-xs text-muted-foreground">
                      Gyldig til {new Date(q.validUntil).toLocaleDateString("da-DK")}
                    </span>
                  ) : null}
                </Link>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
