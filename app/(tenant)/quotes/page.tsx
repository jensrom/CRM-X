import { getDeals } from "@/app/actions/deals";
import { AppTopbar } from "@/components/layout/AppTopbar";
import { PageHeader } from "@/components/shared/PageHeader";
import { Button } from "@/components/ui/button";
import { FileText, Plus, Building2, CalendarDays, TrendingUp } from "lucide-react";
import Link from "next/link";
import { formatCurrency, formatDate } from "@/lib/utils";

const STAGE_STYLE: Record<string, { label: string; bg: string }> = {
  proposal:    { label: "Tilbud sendt",   bg: "bg-violet-100 text-violet-700" },
  negotiation: { label: "Forhandling",    bg: "bg-amber-100 text-amber-700" },
  won:         { label: "Vundet",         bg: "bg-emerald-100 text-emerald-700" },
};

export default async function QuotesPage() {
  // Hent deals i relevante stadier for tilbud
  const [proposal, negotiation, won] = await Promise.all([
    getDeals("proposal"),
    getDeals("negotiation"),
    getDeals("won"),
  ]);

  const allQuotes = [...proposal, ...negotiation, ...won];
  const totalValue = allQuotes.reduce((sum, d) => sum + Number(d.value ?? 0), 0);
  const openValue  = [...proposal, ...negotiation].reduce((sum, d) => sum + Number(d.value ?? 0), 0);

  return (
    <>
      <AppTopbar pageTitle="Tilbud" />
      <PageHeader
        title="Tilbud"
        description={`${allQuotes.length} tilbud — ${formatCurrency(openValue)} åben pipeline`}
        actions={
          <a href="/pipeline/new">
            <Button size="sm"><Plus className="h-3.5 w-3.5" /> Nyt tilbud</Button>
          </a>
        }
      />

      {/* KPI-strimmel */}
      <div className="grid grid-cols-3 gap-4 mb-6">
        {[
          { label: "Tilbud sendt", count: proposal.length, value: proposal.reduce((s,d) => s+Number(d.value??0),0), color: "text-violet-600" },
          { label: "Under forhandling", count: negotiation.length, value: negotiation.reduce((s,d) => s+Number(d.value??0),0), color: "text-amber-600" },
          { label: "Vundet (alle tider)", count: won.length, value: won.reduce((s,d) => s+Number(d.value??0),0), color: "text-emerald-600" },
        ].map((kpi) => (
          <div key={kpi.label} className="bg-card border border-border rounded-xl p-4">
            <p className={`text-2xl font-bold tabular-nums ${kpi.color}`}>{formatCurrency(kpi.value)}</p>
            <p className="text-xs text-muted-foreground mt-0.5">{kpi.label}</p>
            <p className="text-xs text-muted-foreground">{kpi.count} deals</p>
          </div>
        ))}
      </div>

      {allQuotes.length === 0 ? (
        <div className="bg-card border border-border rounded-xl p-16 text-center">
          <FileText className="h-10 w-10 text-muted-foreground mx-auto mb-4" />
          <p className="font-semibold mb-1">Ingen tilbud endnu</p>
          <p className="text-sm text-muted-foreground mb-4">Ryk deals til stadiet "Tilbud" i din pipeline for at se dem her.</p>
          <Link href="/pipeline"><Button size="sm" variant="ghost">Ga til pipeline</Button></Link>
        </div>
      ) : (
        <div className="space-y-6">
          {[
            { title: "Afventer svar", deals: proposal },
            { title: "Under forhandling", deals: negotiation },
            { title: "Vundne tilbud", deals: won },
          ].filter(g => g.deals.length > 0).map((group) => (
            <div key={group.title}>
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-3">{group.title}</p>
              <div className="bg-card border border-border rounded-xl overflow-hidden">
                <div className="divide-y divide-border">
                  {group.deals.map((deal) => (
                    <Link key={deal.id} href={`/pipeline/${deal.id}`}>
                      <div className="flex items-center gap-4 px-4 py-3 hover:bg-secondary/20 transition-colors">
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium">{deal.title}</p>
                          <p className="text-xs text-muted-foreground flex items-center gap-1 mt-0.5">
                            <Building2 className="h-3 w-3" />{deal.company.name}
                          </p>
                        </div>
                        {deal.expectedCloseDate && (
                          <span className="text-xs text-muted-foreground hidden sm:flex items-center gap-1 shrink-0">
                            <CalendarDays className="h-3 w-3" />
                            {formatDate(deal.expectedCloseDate)}
                          </span>
                        )}
                        <span className={`text-xs px-2 py-0.5 rounded-full shrink-0 ${STAGE_STYLE[deal.stage]?.bg ?? "bg-secondary text-muted-foreground"}`}>
                          {STAGE_STYLE[deal.stage]?.label ?? deal.stage}
                        </span>
                        <span className="text-sm font-semibold tabular-nums text-primary shrink-0">
                          {deal.value ? formatCurrency(Number(deal.value)) : "—"}
                        </span>
                      </div>
                    </Link>
                  ))}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </>
  );
}
