import { AppTopbar } from "@/components/layout/AppTopbar";
import { ForecastShell } from "@/components/forecast/ForecastShell";
import { ForecastSection, KpiCard, ConfidenceBadge } from "@/components/forecast/widgets";
import { getVelocityAnalysis } from "@/lib/forecast";
import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { formatCurrency } from "@/lib/utils";
import Link from "next/link";
import { Clock, AlertTriangle, Activity, ChevronRight, Gauge } from "lucide-react";

export default async function VelocityPage() {
  const session = await auth();
  if (!session?.user?.tenantId) redirect("/login");
  const tenantId = session.user.tenantId;

  const velocity = await getVelocityAnalysis(tenantId);

  return (
    <>
      <AppTopbar pageTitle="Forecast — Velocity" />
      <ForecastShell active="/forecast/velocity">
        {/* Top KPI'er */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
          <KpiCard
            label="Avg sales cycle"
            value={velocity.averageSalesCycleDays > 0 ? Math.round(velocity.averageSalesCycleDays).toString() : "—"}
            unit="dage"
            sublabel={`Median: ${Math.round(velocity.medianSalesCycleDays)} dage`}
            icon={Clock}
            accentColor="primary"
          />
          <KpiCard
            label="Vundne deals analyseret"
            value={velocity.salesCycleN}
            sublabel="Mere data = skarpere forecast"
            icon={Activity}
            accentColor="blue"
          />
          <KpiCard
            label="Stallede deals"
            value={velocity.stalledDeals.length}
            sublabel="≥1.5σ over normalen"
            icon={AlertTriangle}
            accentColor={velocity.stalledDeals.length > 0 ? "amber" : "slate"}
          />
        </div>

        {/* Stage breakdown */}
        <ForecastSection
          title="Tid pr. stadie"
          subtitle="Mean, median og spredning (p25–p75). Spredning afsløerer om processen er stabil eller kaotisk."
          icon={Gauge}
        >
          <div className="space-y-5">
            {velocity.stages.map((s) => {
              const maxDays = Math.max(...velocity.stages.map((x) => x.p75Days), 1);
              return (
                <div key={s.stage}>
                  <div className="flex items-center justify-between mb-2">
                    <div>
                      <p className="text-sm font-medium">{s.label}</p>
                      <p className="text-xs text-muted-foreground">
                        {s.n > 0 ? `${s.n} observationer` : "Ingen afsluttede stadie-besøg"}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-lg font-semibold tabular-nums">
                        {s.n > 0 ? `${s.meanDays.toFixed(1)} dage` : "—"}
                      </p>
                      {s.n > 0 && (
                        <p className="text-xs text-muted-foreground tabular-nums">
                          median {s.medianDays.toFixed(1)}d · σ {s.stdDevDays.toFixed(1)}d
                        </p>
                      )}
                    </div>
                  </div>
                  {s.n > 0 && (
                    <>
                      {/* Spredning som range-bar med IQR + mean-marker */}
                      <div className="relative h-3 bg-secondary rounded-full overflow-hidden">
                        {/* IQR (p25 - p75) */}
                        <div
                          className="absolute top-0 bottom-0 bg-violet-200"
                          style={{
                            left:  `${(s.p25Days / maxDays) * 100}%`,
                            width: `${((s.p75Days - s.p25Days) / maxDays) * 100}%`,
                          }}
                        />
                        {/* Median */}
                        <div
                          className="absolute top-0 bottom-0 w-0.5 bg-violet-700"
                          style={{ left: `${(s.medianDays / maxDays) * 100}%` }}
                        />
                        {/* Mean (anderledes farve) */}
                        <div
                          className="absolute top-0 bottom-0 w-0.5 bg-primary"
                          style={{ left: `${(s.meanDays / maxDays) * 100}%` }}
                        />
                      </div>
                      <div className="flex justify-between text-[10px] text-muted-foreground mt-1 tabular-nums">
                        <span>0d</span>
                        <span>p25: {s.p25Days.toFixed(0)}d</span>
                        <span>p75: {s.p75Days.toFixed(0)}d</span>
                        <span>{maxDays.toFixed(0)}d</span>
                      </div>
                      <div className="mt-2">
                        <ConfidenceBadge level={s.confidence} />
                      </div>
                    </>
                  )}
                </div>
              );
            })}
          </div>
          <p className="text-xs text-muted-foreground mt-5 pt-4 border-t border-border">
            <strong>Lys violet</strong> = midterste 50% (p25–p75). <strong>Mørk violet</strong> = median.
            <strong className="text-primary"> Primary</strong> = gennemsnit. Stort gap mellem mean og median → tunge outliers.
          </p>
        </ForecastSection>

        {/* Stallede deals */}
        {velocity.stalledDeals.length > 0 && (
          <ForecastSection
            title={`Stallede deals (${velocity.stalledDeals.length})`}
            subtitle="Deals der har været usædvanligt længe i samme stadie (z-score ≥ 1.5)"
            icon={AlertTriangle}
          >
            <div className="divide-y divide-border -mx-5">
              {velocity.stalledDeals.map((d) => (
                <Link
                  key={d.dealId}
                  href={`/pipeline/${d.dealId}`}
                  className="flex items-center gap-3 px-5 py-3 hover:bg-secondary/30 transition-colors"
                >
                  <div className="w-8 h-8 rounded-lg bg-amber-100 flex items-center justify-center shrink-0">
                    <AlertTriangle className="h-3.5 w-3.5 text-amber-700" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{d.title}</p>
                    <p className="text-xs text-muted-foreground">
                      I <strong className="text-foreground">{d.stageLabel}</strong> i {d.daysInStage} dage
                      {" · "}
                      <span className="text-amber-700">{d.zScore}σ over normal</span>
                    </p>
                  </div>
                  <span className="text-sm font-semibold tabular-nums shrink-0">
                    {formatCurrency(d.value)}
                  </span>
                  <ChevronRight className="h-4 w-4 text-muted-foreground" />
                </Link>
              ))}
            </div>
          </ForecastSection>
        )}
      </ForecastShell>
    </>
  );
}
