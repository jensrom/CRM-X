import { AppTopbar } from "@/components/layout/AppTopbar";
import { ForecastShell } from "@/components/forecast/ForecastShell";
import { ForecastSection, FunnelBar, KpiCard } from "@/components/forecast/widgets";
import { getSnapshotFunnel, getLeadConversionRate } from "@/lib/forecast";
import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { formatCurrency } from "@/lib/utils";
import { Users, Target, TrendingUp, Filter } from "lucide-react";

export default async function FunnelPage({
  searchParams,
}: {
  searchParams: Promise<{ months?: string }>;
}) {
  const session = await auth();
  if (!session?.user?.tenantId) redirect("/login");
  const tenantId = session.user.tenantId;

  const sp = await searchParams;
  const months = Number(sp.months ?? 12);
  const from = new Date();
  from.setMonth(from.getMonth() - months);

  const [funnel, leads] = await Promise.all([
    getSnapshotFunnel(tenantId, from, new Date()),
    getLeadConversionRate(tenantId, from, new Date()),
  ]);

  const topCount = funnel.totalDealCount;
  const wonStage = funnel.stages[funnel.stages.length - 1];

  return (
    <>
      <AppTopbar pageTitle="Forecast — Sales funnel" />
      <ForecastShell active="/forecast/funnel">
        {/* Periode-vælger */}
        <div className="flex items-center gap-2 mb-4">
          <Filter className="h-4 w-4 text-muted-foreground" />
          <span className="text-sm text-muted-foreground">Periode:</span>
          {[3, 6, 12, 24].map((m) => (
            <a
              key={m}
              href={`/forecast/funnel?months=${m}`}
              className={`text-xs px-2 py-1 rounded-md border transition-colors ${
                months === m
                  ? "bg-primary text-primary-foreground border-primary"
                  : "border-border hover:bg-secondary/40"
              }`}
            >
              {m} mdr
            </a>
          ))}
        </div>

        {/* Top KPI'er */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
          <KpiCard
            label="Leads i periode"
            value={leads.totalLeads}
            sublabel={`${leads.convertedLeads} konverteret`}
            icon={Users}
            accentColor="blue"
          />
          <KpiCard
            label="Lead → Deal"
            value={`${leads.conversionRate.toFixed(1)}%`}
            sublabel="Konverteringsrate"
            icon={Target}
            accentColor="violet"
          />
          <KpiCard
            label="Vundne deals"
            value={wonStage?.count ?? 0}
            sublabel={`af ${topCount} i pipeline`}
            icon={TrendingUp}
            accentColor="emerald"
          />
          <KpiCard
            label="Total vundet"
            value={formatCurrency(funnel.totalWonValue)}
            sublabel={`Avg: ${formatCurrency(funnel.averageWonValue)}`}
            icon={TrendingUp}
            accentColor="emerald"
          />
        </div>

        {/* Visuel funnel */}
        <ForecastSection
          title="Funnel-visualisering"
          subtitle="Hvor mange opportunities overlever fra stadie til stadie?"
          icon={Filter}
        >
          <div className="space-y-4">
            {funnel.stages.map((s, i) => (
              <FunnelBar
                key={s.stage}
                label={s.label}
                count={s.count}
                value={s.totalValue}
                percentage={s.conversionFromTop}
                isLast={i === funnel.stages.length - 1}
              />
            ))}
          </div>
        </ForecastSection>

        {/* Stadie-detalje tabel */}
        <ForecastSection
          title="Konverterings-detaljer"
          subtitle="Drop-off mellem hvert stadie + vægtet pipeline-værdi"
        >
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-xs text-muted-foreground uppercase tracking-wide border-b border-border">
                  <th className="py-2 pr-4 font-medium">Stadie</th>
                  <th className="py-2 px-4 font-medium text-right">Deals</th>
                  <th className="py-2 px-4 font-medium text-right">% af forrige</th>
                  <th className="py-2 px-4 font-medium text-right">% af top</th>
                  <th className="py-2 px-4 font-medium text-right">Værdi</th>
                  <th className="py-2 pl-4 font-medium text-right">Vægtet værdi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {funnel.stages.map((s) => (
                  <tr key={s.stage} className="hover:bg-secondary/20 transition-colors">
                    <td className="py-2.5 pr-4 font-medium">{s.label}</td>
                    <td className="py-2.5 px-4 text-right tabular-nums">{s.count}</td>
                    <td className="py-2.5 px-4 text-right tabular-nums">
                      <DropOffPct pct={s.conversionFromPrevious} />
                    </td>
                    <td className="py-2.5 px-4 text-right tabular-nums">{s.conversionFromTop.toFixed(1)}%</td>
                    <td className="py-2.5 px-4 text-right tabular-nums">{formatCurrency(s.totalValue)}</td>
                    <td className="py-2.5 pl-4 text-right tabular-nums font-medium">{formatCurrency(s.weightedValue)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="text-xs text-muted-foreground mt-3 pt-3 border-t border-border">
            <strong>Vægtet værdi</strong> = sum af (deal.value × deal.probability) for deals i stadiet.
            Bruges som realistisk forecast-baseline.
          </p>
        </ForecastSection>
      </ForecastShell>
    </>
  );
}

function DropOffPct({ pct }: { pct: number }) {
  const tone = pct >= 60 ? "text-emerald-700" : pct >= 30 ? "text-amber-700" : "text-red-700";
  return <span className={`font-semibold ${tone}`}>{pct.toFixed(1)}%</span>;
}
