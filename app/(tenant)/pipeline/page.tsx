import { getDeals, getPipelineStats } from "@/app/actions/deals";
import { AppTopbar } from "@/components/layout/AppTopbar";
import { PageHeader } from "@/components/shared/PageHeader";
import { Button } from "@/components/ui/button";
import { formatCurrency, formatDate, DEAL_STAGES } from "@/lib/utils";
import { Plus, TrendingUp, Target, Trophy, XCircle, Building2 } from "lucide-react";
import Link from "next/link";

const STAGE_ORDER = ["new", "qualified", "proposal", "negotiation", "won", "lost"] as const;
type StageKey = typeof STAGE_ORDER[number];

const STAGE_STYLE: Record<StageKey, { header: string; dot: string }> = {
  new:         { header: "bg-slate-100 border-slate-200",    dot: "bg-slate-400"   },
  qualified:   { header: "bg-blue-50 border-blue-200",       dot: "bg-blue-500"    },
  proposal:    { header: "bg-violet-50 border-violet-200",   dot: "bg-violet-500"  },
  negotiation: { header: "bg-amber-50 border-amber-200",     dot: "bg-amber-500"   },
  won:         { header: "bg-emerald-50 border-emerald-200", dot: "bg-emerald-500" },
  lost:        { header: "bg-red-50 border-red-200",         dot: "bg-red-400"     },
};

export default async function PipelinePage() {
  const [deals, stats] = await Promise.all([getDeals(), getPipelineStats()]);

  // Grupper deals per stage
  const byStage = STAGE_ORDER.reduce<Record<StageKey, typeof deals>>((acc, s) => {
    acc[s] = deals.filter((d) => d.stage === s);
    return acc;
  }, {} as Record<StageKey, typeof deals>);

  return (
    <>
      <AppTopbar pageTitle="Pipeline" />

      <PageHeader
        title="Sales Pipeline"
        description={`${deals.length} deals i alt`}
        actions={
          <div className="flex items-center gap-2">
            <a href="/api/pipeline/export" download className="inline-flex items-center gap-1.5 text-sm font-medium px-3 py-1.5 rounded-lg border border-border hover:bg-secondary/40 transition-colors">
              CSV-eksport
            </a>
            <a href="/pipeline/new">
              <Button size="md"><Plus className="h-4 w-4" />Opret deal</Button>
            </a>
          </div>
        }
      />

      {/* KPI-stribe */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        {[
          {
            label: "Aktive deals",
            value: stats?.activeCount ?? 0,
            icon: Target,
            sub: "i pipeline",
            color: "text-blue-600",
            bg: "bg-blue-50",
          },
          {
            label: "Pipeline værdi",
            value: formatCurrency(stats?.totalPipeline),
            icon: TrendingUp,
            sub: "aktive stages",
            color: "text-violet-600",
            bg: "bg-violet-50",
          },
          {
            label: "Vundet",
            value: stats?.wonCount ?? 0,
            icon: Trophy,
            sub: formatCurrency(stats?.wonValue),
            color: "text-emerald-600",
            bg: "bg-emerald-50",
          },
          {
            label: "Tabt",
            value: stats?.lostCount ?? 0,
            icon: XCircle,
            sub: "deals",
            color: "text-red-500",
            bg: "bg-red-50",
          },
        ].map(({ label, value, icon: Icon, sub, color, bg }) => (
          <div key={label} className="bg-card border border-border rounded-xl p-4 flex items-center gap-3">
            <div className={`w-10 h-10 rounded-lg ${bg} flex items-center justify-center shrink-0`}>
              <Icon className={`h-5 w-5 ${color}`} />
            </div>
            <div>
              <p className="text-xs text-muted-foreground">{label}</p>
              <p className="text-lg font-bold leading-tight">{value}</p>
              <p className="text-xs text-muted-foreground">{sub}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Kanban board */}
      <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-3 items-start">
        {STAGE_ORDER.map((stage) => {
          const stageMeta = DEAL_STAGES[stage];
          const stageDeals = byStage[stage];
          const stageStyle = STAGE_STYLE[stage];
          const stageTotal = stageDeals.reduce(
            (sum, d) => sum + (d.value ? Number(d.value) : 0),
            0
          );

          return (
            <div key={stage} className="flex flex-col gap-2">
              {/* Stage-header */}
              <div className={`flex items-center justify-between px-3 py-2 rounded-lg border ${stageStyle.header}`}>
                <div className="flex items-center gap-2">
                  <span className={`w-2 h-2 rounded-full ${stageStyle.dot}`} />
                  <span className="text-xs font-semibold text-foreground">{stageMeta.label}</span>
                </div>
                <span className="text-xs font-bold text-muted-foreground">{stageDeals.length}</span>
              </div>

              {/* Stage sum */}
              {stageTotal > 0 && (
                <p className="text-xs text-center text-muted-foreground px-1">
                  {formatCurrency(stageTotal)}
                </p>
              )}

              {/* Deal-kort */}
              <div className="space-y-2">
                {stageDeals.map((deal) => (
                  <Link
                    key={deal.id}
                    href={`/pipeline/${deal.id}`}
                    className="block bg-card border border-border rounded-xl p-3 hover:border-primary/40 hover:shadow-sm transition-all group"
                  >
                    <p className="text-sm font-semibold text-foreground group-hover:text-primary transition-colors line-clamp-2 mb-2">
                      {deal.title}
                    </p>

                    {deal.company && (
                      <div className="flex items-center gap-1.5 text-xs text-muted-foreground mb-2">
                        <Building2 className="h-3 w-3 shrink-0" />
                        <span className="truncate">{deal.company.name}</span>
                      </div>
                    )}

                    {deal.value && (
                      <p className="text-sm font-bold text-foreground">
                        {formatCurrency(Number(deal.value))}
                      </p>
                    )}

                    {deal.expectedCloseDate && (
                      <p className="text-xs text-muted-foreground mt-1">
                        Lukkes {formatDate(deal.expectedCloseDate)}
                      </p>
                    )}

                    {deal.probability > 0 && (
                      <div className="mt-2">
                        <div className="flex items-center justify-between mb-0.5">
                          <span className="text-[10px] text-muted-foreground">Sandsynlighed</span>
                          <span className="text-[10px] font-semibold">{deal.probability}%</span>
                        </div>
                        <div className="h-1 bg-secondary rounded-full overflow-hidden">
                          <div
                            className="h-full bg-primary rounded-full"
                            style={{ width: `${deal.probability}%` }}
                          />
                        </div>
                      </div>
                    )}
                  </Link>
                ))}

                {stageDeals.length === 0 && (
                  <div className="border border-dashed border-border rounded-xl p-4 text-center">
                    <p className="text-xs text-muted-foreground/60">Tom</p>
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </>
  );
}
