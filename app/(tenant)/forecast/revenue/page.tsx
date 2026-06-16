import { AppTopbar } from "@/components/layout/AppTopbar";
import { ForecastShell } from "@/components/forecast/ForecastShell";
import { ForecastSection, KpiCard, ConfidenceBadge } from "@/components/forecast/widgets";
import { getRevenueForecast } from "@/lib/forecast";
import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { formatCurrency } from "@/lib/utils";
import { Filter, DollarSign, Repeat, TrendingUp, AlertTriangle, CheckCircle2 } from "lucide-react";

export default async function RevenuePage({
  searchParams,
}: {
  searchParams: Promise<{ horizon?: string }>;
}) {
  const session = await auth();
  if (!session?.user?.tenantId) redirect("/login");
  const tenantId = session.user.tenantId;

  const sp = await searchParams;
  const horizon = Number(sp.horizon ?? 6);
  const revenue = await getRevenueForecast(tenantId, horizon);

  // Find max for graf-skalering
  const maxValue = Math.max(...revenue.months.map((m) => m.bestTotal), 1);

  return (
    <>
      <AppTopbar pageTitle="Forecast — Omsætnings-projektion" />
      <ForecastShell active="/forecast/revenue">
        {/* Horisont-vælger */}
        <div className="flex items-center gap-2 mb-4">
          <Filter className="h-4 w-4 text-muted-foreground" />
          <span className="text-sm text-muted-foreground">Horisont:</span>
          {[3, 6, 9, 12].map((h) => (
            <a
              key={h}
              href={`/forecast/revenue?horizon=${h}`}
              className={`text-xs px-2 py-1 rounded-md border transition-colors ${
                horizon === h
                  ? "bg-primary text-primary-foreground border-primary"
                  : "border-border hover:bg-secondary/40"
              }`}
            >
              {h} mdr
            </a>
          ))}
        </div>

        {/* KPI'er */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          <KpiCard
            label="Konservativt"
            value={formatCurrency(revenue.totalConservative)}
            sublabel={`${horizon} mdr · ≥70% sandsynlighed`}
            icon={CheckCircle2}
            accentColor="slate"
          />
          <KpiCard
            label="Forventet"
            value={formatCurrency(revenue.totalExpected)}
            sublabel={`${horizon} mdr · vægtet`}
            icon={TrendingUp}
            accentColor="emerald"
            confidence={revenue.confidence}
          />
          <KpiCard
            label="Best case"
            value={formatCurrency(revenue.totalBest)}
            sublabel={`${horizon} mdr · alt lukker`}
            icon={DollarSign}
            accentColor="violet"
          />
          <KpiCard
            label="Current MRR"
            value={formatCurrency(revenue.currentMRR)}
            sublabel={`${formatCurrency(revenue.currentMRR * 12)}/år`}
            icon={Repeat}
            accentColor="primary"
          />
        </div>

        {/* Maaneds-projektion graf */}
        <ForecastSection
          title={`Måned-for-måned projektion — ${horizon} måneder`}
          subtitle="Stablede bjælker: mørk = konservativ · medium = forventet · lys = best case"
          icon={TrendingUp}
        >
          <div className="space-y-3">
            {revenue.months.map((m) => (
              <div key={m.yearMonth}>
                <div className="flex items-center justify-between text-sm mb-1.5">
                  <span className="font-medium">{m.monthLabel}</span>
                  <span className="text-xs text-muted-foreground tabular-nums">
                    Forventet: <strong className="text-foreground">{formatCurrency(m.expectedTotal)}</strong>
                  </span>
                </div>
                <div className="h-7 bg-secondary/30 rounded-lg overflow-hidden relative">
                  {/* Best case (lyseste) */}
                  <div
                    className="absolute inset-y-0 left-0 bg-violet-200"
                    style={{ width: `${(m.bestTotal / maxValue) * 100}%` }}
                  />
                  {/* Expected (medium) */}
                  <div
                    className="absolute inset-y-0 left-0 bg-emerald-300"
                    style={{ width: `${(m.expectedTotal / maxValue) * 100}%` }}
                  />
                  {/* Conservative (mørkest) */}
                  <div
                    className="absolute inset-y-0 left-0 bg-emerald-600"
                    style={{ width: `${(m.conservativeTotal / maxValue) * 100}%` }}
                  />
                  {/* Recurring baseline marker */}
                  <div
                    className="absolute inset-y-0 w-0.5 bg-primary"
                    style={{ left: `${(m.recurringRevenue / maxValue) * 100}%` }}
                    title="Current MRR-baseline"
                  />
                  <div className="absolute inset-0 flex items-center px-3 text-xs font-medium">
                    {m.committedRevenue > 0 && (
                      <span className="bg-card/80 px-2 py-0.5 rounded-md text-emerald-700">
                        ✓ {formatCurrency(m.committedRevenue)} commit
                      </span>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Forklaring */}
          <div className="mt-5 pt-4 border-t border-border grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
            <div>
              <p className="font-semibold mb-1.5">Hvad ser jeg?</p>
              <ul className="space-y-1 text-muted-foreground">
                <li><span className="inline-block w-3 h-3 bg-emerald-600 rounded-sm mr-1.5" />Konservativ — kun deals med ≥70% probability</li>
                <li><span className="inline-block w-3 h-3 bg-emerald-300 rounded-sm mr-1.5" />Forventet — vægtet (value × probability)</li>
                <li><span className="inline-block w-3 h-3 bg-violet-200 rounded-sm mr-1.5" />Best case — hele pipeline-værdien</li>
                <li><span className="inline-block w-0.5 h-3 bg-primary rounded-sm mr-2" />Recurring MRR-baseline</li>
              </ul>
            </div>
            <div>
              <ConfidenceBadge level={revenue.confidence} />
            </div>
          </div>
        </ForecastSection>

        {/* Data-kvalitet detaljer */}
        <ForecastSection
          title="Data-kvalitet"
          subtitle={`Samlet score: ${revenue.dataQuality.overallScore}/100`}
          icon={AlertTriangle}
        >
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
            <QualityCell label="Forventet lukkedato" pct={revenue.dataQuality.dealsWithCloseDate} />
            <QualityCell label="Sandsynlighed" pct={revenue.dataQuality.dealsWithProbability} />
            <QualityCell label="Kr-værdi" pct={revenue.dataQuality.dealsWithValue} />
          </div>
          {revenue.dataQuality.warnings.length > 0 ? (
            <div className="space-y-2">
              {revenue.dataQuality.warnings.map((w, i) => (
                <div key={i} className="flex items-start gap-2 p-3 rounded-lg bg-amber-50 border border-amber-200 text-xs text-amber-900">
                  <AlertTriangle className="h-3.5 w-3.5 shrink-0 mt-0.5" />
                  <span>{w}</span>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-xs text-emerald-700 flex items-center gap-1.5">
              <CheckCircle2 className="h-3.5 w-3.5" />
              Dine deals er velvedligeholdt — forecast-grundlaget er solidt.
            </p>
          )}
        </ForecastSection>
      </ForecastShell>
    </>
  );
}

function QualityCell({ label, pct }: { label: string; pct: number }) {
  const tone = pct >= 80 ? "bg-emerald-500" : pct >= 50 ? "bg-amber-500" : "bg-red-500";
  return (
    <div>
      <div className="flex justify-between text-xs mb-1">
        <span className="text-muted-foreground">{label}</span>
        <span className="font-semibold tabular-nums">{pct}%</span>
      </div>
      <div className="h-2 bg-secondary rounded-full overflow-hidden">
        <div className={`h-full rounded-full ${tone}`} style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
}
