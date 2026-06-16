import { AppTopbar } from "@/components/layout/AppTopbar";
import { ForecastShell } from "@/components/forecast/ForecastShell";
import { ForecastSection } from "@/components/forecast/widgets";
import { WhatIfSimulator } from "@/components/forecast/WhatIfSimulator";
import { buildWhatIfBaseline } from "@/lib/forecast";
import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { Sparkles, Lightbulb } from "lucide-react";

export default async function SimulatorPage() {
  const session = await auth();
  if (!session?.user?.tenantId) redirect("/login");
  const tenantId = session.user.tenantId;

  const baseline = await buildWhatIfBaseline(tenantId);

  const hasData =
    baseline.leadsPerMonth > 0 ||
    baseline.avgDealValue > 0 ||
    baseline.negotiationToWon > 0;

  return (
    <>
      <AppTopbar pageTitle="Forecast — Hvad-hvis simulator" />
      <ForecastShell active="/forecast/simulator">
        <div className="bg-violet-50 border border-violet-200 rounded-xl px-5 py-4 mb-5 flex items-start gap-3">
          <Lightbulb className="h-5 w-5 text-violet-700 shrink-0 mt-0.5" />
          <div className="text-sm">
            <p className="font-semibold text-violet-900 mb-0.5">Sådan bruger du simulatoren</p>
            <p className="text-violet-800/80 text-xs leading-relaxed">
              Skub på parametrene i venstre side for at se hvordan ændringer påvirker årlig omsætning.
              Baseline-tallene kommer fra <strong>dine sidste 12 måneders data</strong> — så simuleringen er
              forankret i jeres reelle salgs-præstation, ikke gæt.
            </p>
          </div>
        </div>

        {hasData ? (
          <WhatIfSimulator baseline={baseline} />
        ) : (
          <ForecastSection title="Ikke nok data endnu" icon={Sparkles}>
            <div className="text-center py-8">
              <Sparkles className="h-10 w-10 text-muted-foreground mx-auto mb-3" />
              <p className="font-semibold mb-1">Vi mangler historisk data</p>
              <p className="text-sm text-muted-foreground max-w-md mx-auto">
                Simulatoren har brug for leads, deals og mindst nogle vundne aftaler for at kunne bygge en baseline.
                Når I har kørt salgsprocessen i nogle måneder, kommer den her side til live.
              </p>
            </div>
          </ForecastSection>
        )}
      </ForecastShell>
    </>
  );
}
