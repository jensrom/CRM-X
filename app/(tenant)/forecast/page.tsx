import { AppTopbar } from "@/components/layout/AppTopbar";
import { ForecastShell } from "@/components/forecast/ForecastShell";
import { KpiCard, ConfidenceBadge, ForecastSection } from "@/components/forecast/widgets";
import {
  TrendingUp, DollarSign, Target, Users, Clock, Repeat, AlertTriangle, Sparkles,
} from "lucide-react";
import {
  getSnapshotFunnel, getLeadConversionRate, getVelocityAnalysis, getRevenueForecast,
} from "@/lib/forecast";
import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { formatCurrency } from "@/lib/utils";

export default async function ForecastDashboardPage() {
  const session = await auth();
  if (!session?.user?.tenantId) redirect("/login");
  const tenantId = session.user.tenantId;

  const twelveMonthsAgo = new Date();
  twelveMonthsAgo.setMonth(twelveMonthsAgo.getMonth() - 12);

  const [funnel, leads, velocity, revenue] = await Promise.all([
    getSnapshotFunnel(tenantId, twelveMonthsAgo, new Date()),
    getLeadConversionRate(tenantId, twelveMonthsAgo, new Date()),
    getVelocityAnalysis(tenantId),
    getRevenueForecast(tenantId, 6),
  ]);

  return (
    <>
      <AppTopbar pageTitle="Forecast" />
      <ForecastShell active="/forecast">
        {/* Hero KPI'er */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <KpiCard
            label="Forventet 6 mdr"
            value={formatCurrency(revenue.totalExpected)}
            sublabel={`Konservativt: ${formatCurrency(revenue.totalConservative)}`}
            icon={TrendingUp}
            accentColor="emerald"
            confidence={revenue.confidence}
          />
          <KpiCard
            label="Current MRR"
            value={formatCurrency(revenue.currentMRR)}
            sublabel="Recurring revenue lige nu"
            icon={Repeat}
            accentColor="primary"
          />
          <KpiCard
            label="Lead → Won rate"
            value={`${funnel.topToWinRate.toFixed(1)}%`}
            sublabel={`${funnel.totalDealCount} deals i datasæt`}
            icon={Target}
            accentColor="blue"
          />
          <KpiCard
            label="Sales cycle"
            value={velocity.averageSalesCycleDays > 0 ? Math.round(velocity.averageSalesCycleDays).toString() : "—"}
            unit="dage"
            sublabel={velocity.salesCycleN > 0 ? `${velocity.salesCycleN} vundne deals` : "Mangler vundne deals"}
            icon={Clock}
            accentColor="violet"
          />
        </div>

        {/* Data-kvalitet & advarsler */}
        {(revenue.dataQuality.warnings.length > 0 || revenue.dataQuality.overallScore < 80) && (
          <ForecastSection
            title="Data-kvalitet"
            subtitle={`Samlet score: ${revenue.dataQuality.overallScore}/100`}
            icon={AlertTriangle}
          >
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mb-4">
              <DataQualityBar
                label="Forventet lukkedato"
                pct={revenue.dataQuality.dealsWithCloseDate}
              />
              <DataQualityBar
                label="Sandsynlighed"
                pct={revenue.dataQuality.dealsWithProbability}
              />
              <DataQualityBar
                label="Kr-værdi"
                pct={revenue.dataQuality.dealsWithValue}
              />
            </div>
            {revenue.dataQuality.warnings.length > 0 && (
              <div className="space-y-1.5">
                {revenue.dataQuality.warnings.map((w, i) => (
                  <p key={i} className="text-xs text-amber-700 flex items-start gap-1.5">
                    <AlertTriangle className="h-3.5 w-3.5 shrink-0 mt-0.5" />
                    {w}
                  </p>
                ))}
              </div>
            )}
          </ForecastSection>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mt-4">
          {/* Lead-funnel sammenfatning */}
          <ForecastSection
            title="Sales funnel (sidste 12 mdr)"
            subtitle={`${leads.totalLeads} leads → ${funnel.stages[funnel.stages.length - 1]?.count ?? 0} vundne deals`}
            icon={Users}
          >
            <div className="space-y-3">
              {funnel.stages.map((s, i) => (
                <div key={s.stage}>
                  <div className="flex items-center justify-between text-sm mb-1">
                    <span className="font-medium">{s.label}</span>
                    <span className="text-xs tabular-nums text-muted-foreground">
                      {s.count} · {s.conversionFromTop.toFixed(1)}% af top
                    </span>
                  </div>
                  <div className="h-2 bg-secondary rounded-full overflow-hidden">
                    <div
                      className={`h-full rounded-full ${i === funnel.stages.length - 1 ? "bg-emerald-500" : "bg-primary"}`}
                      style={{ width: `${Math.max(5, s.conversionFromTop)}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
            <p className="text-xs text-muted-foreground mt-4 pt-3 border-t border-border">
              Lead-konverteringsrate: <strong className="text-foreground">{leads.conversionRate.toFixed(1)}%</strong>
              {" · "}
              Avg won deal: <strong className="text-foreground">{formatCurrency(funnel.averageWonValue)}</strong>
            </p>
          </ForecastSection>

          {/* Velocity sammenfatning */}
          <ForecastSection
            title="Stadie-velocity"
            subtitle="Gennemsnitlig tid pr. stadie (kun afsluttede)"
            icon={Clock}
          >
            <div className="space-y-2.5">
              {velocity.stages.map((s) => {
                const maxDays = Math.max(...velocity.stages.map((x) => x.meanDays), 1);
                const width = (s.meanDays / maxDays) * 100;
                return (
                  <div key={s.stage}>
                    <div className="flex items-center justify-between text-sm mb-1">
                      <span className="font-medium">{s.label}</span>
                      <span className="text-xs tabular-nums text-muted-foreground">
                        {s.n > 0 ? `${s.meanDays.toFixed(1)} dage` : "Ingen data"}
                        {s.n > 0 && ` · n=${s.n}`}
                      </span>
                    </div>
                    <div className="h-2 bg-secondary rounded-full overflow-hidden">
                      <div
                        className="h-full bg-violet-500 rounded-full"
                        style={{ width: `${Math.max(2, width)}%` }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
            {velocity.stalledDeals.length > 0 && (
              <div className="mt-4 pt-3 border-t border-border">
                <p className="text-xs font-semibold text-amber-700 mb-2 flex items-center gap-1.5">
                  <AlertTriangle className="h-3.5 w-3.5" />
                  {velocity.stalledDeals.length} stallede deals identificeret
                </p>
                <p className="text-xs text-muted-foreground">
                  Se hele listen under <strong>Velocity</strong>-tabben.
                </p>
              </div>
            )}
          </ForecastSection>
        </div>

        {/* Næste 6 måneders projektion (oversigt) */}
        <ForecastSection
          title="Næste 6 måneders projektion"
          subtitle="Forventet (vægtet) · Konservativt (≥70% sandsynlighed) · Best case (alt lukker)"
          icon={Sparkles}
        >
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-5">
            <ProjectionCell
              label="Konservativt"
              value={revenue.totalConservative}
              tone="slate"
            />
            <ProjectionCell
              label="Forventet"
              value={revenue.totalExpected}
              tone="emerald"
              highlight
            />
            <ProjectionCell
              label="Best case"
              value={revenue.totalBest}
              tone="violet"
            />
          </div>
          <div className="space-y-2">
            {revenue.months.map((m) => {
              const max = Math.max(...revenue.months.map((mm) => mm.bestTotal), 1);
              return (
                <div key={m.yearMonth}>
                  <div className="flex items-center justify-between text-xs mb-1">
                    <span className="font-medium">{m.monthLabel}</span>
                    <span className="text-muted-foreground tabular-nums">
                      {formatCurrency(m.expectedTotal)}
                    </span>
                  </div>
                  <div className="h-2.5 bg-secondary rounded-full overflow-hidden relative">
                    {/* Best case (lyseste) */}
                    <div className="absolute inset-y-0 left-0 bg-violet-200 rounded-full"
                         style={{ width: `${(m.bestTotal / max) * 100}%` }} />
                    {/* Expected (medium) */}
                    <div className="absolute inset-y-0 left-0 bg-emerald-400 rounded-full"
                         style={{ width: `${(m.expectedTotal / max) * 100}%` }} />
                    {/* Conservative (mørkest) */}
                    <div className="absolute inset-y-0 left-0 bg-emerald-700 rounded-full"
                         style={{ width: `${(m.conservativeTotal / max) * 100}%` }} />
                  </div>
                </div>
              );
            })}
          </div>
          <div className="mt-4 pt-4 border-t border-border">
            <ConfidenceBadge level={revenue.confidence} />
          </div>
        </ForecastSection>
      </ForecastShell>
    </>
  );
}

function DataQualityBar({ label, pct }: { label: string; pct: number }) {
  const tone = pct >= 80 ? "bg-emerald-500" : pct >= 50 ? "bg-amber-500" : "bg-red-500";
  return (
    <div>
      <div className="flex justify-between text-xs mb-1">
        <span className="text-muted-foreground">{label}</span>
        <span className="font-semibold tabular-nums">{pct}%</span>
      </div>
      <div className="h-1.5 bg-secondary rounded-full overflow-hidden">
        <div className={`h-full rounded-full ${tone}`} style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
}

function ProjectionCell({
  label, value, tone, highlight = false,
}: {
  label: string; value: number; tone: "slate" | "emerald" | "violet"; highlight?: boolean;
}) {
  const colors: Record<string, string> = {
    slate:   "border-slate-200 bg-slate-50",
    emerald: "border-emerald-200 bg-emerald-50",
    violet:  "border-violet-200 bg-violet-50",
  };
  return (
    <div className={`rounded-lg border p-4 ${colors[tone]} ${highlight ? "ring-2 ring-emerald-300" : ""}`}>
      <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">{label}</p>
      <p className="text-2xl font-bold tabular-nums mt-1">{formatCurrency(value)}</p>
    </div>
  );
}
