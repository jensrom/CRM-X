/**
 * Forecast-layout gate'r adgang paa tenant-modulet "forecast".
 *
 * Hvis modulet ikke er aktiveret paa tenanten viser vi en faerdig
 * "tilkøb modulet"-side i stedet for at lade brugeren tilgaa sidens content.
 * Det er bevidst at vi ikke 404'er — superadmin og fremtidige sales-flows
 * skal vide at funktionen findes og hvad den giver.
 */

import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { redirect } from "next/navigation";
import Link from "next/link";
import { Sparkles, Lock, TrendingUp, Clock, Filter, DollarSign } from "lucide-react";
import { Button } from "@/components/ui/button";

export const dynamic = "force-dynamic";

export default async function ForecastLayout({ children }: { children: React.ReactNode }) {
  const session = await auth();
  if (!session?.user?.tenantId) redirect("/login");

  const tenant = await db.tenant.findFirst({
    where: { id: session.user.tenantId },
    select: { modules: true, name: true },
  });

  const hasForecastModule = tenant?.modules?.includes("forecast") ?? false;

  if (!hasForecastModule) {
    return <ForecastUpsellPage tenantName={tenant?.name ?? "Din tenant"} />;
  }

  return <>{children}</>;
}

function ForecastUpsellPage({ tenantName }: { tenantName: string }) {
  return (
    <div className="max-w-3xl mx-auto py-12">
      {/* Hero */}
      <div className="text-center mb-10">
        <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-gradient-to-br from-violet-500 to-emerald-500 mb-5">
          <Sparkles className="h-8 w-8 text-white" />
        </div>
        <div className="inline-flex items-center gap-1 text-[10px] uppercase tracking-wide font-semibold px-2 py-0.5 rounded-full bg-violet-100 text-violet-700 border border-violet-200 mb-3">
          <Sparkles className="h-2.5 w-2.5" /> Beta — Tillægsmodul
        </div>
        <h1 className="text-3xl font-bold mb-3">Forecast & Sales Intelligence</h1>
        <p className="text-base text-muted-foreground max-w-xl mx-auto">
          Byg økonomiske beslutninger på data — ikke mavefornemmelser. Vi læser dine deals, leads,
          stadie-tider og MRR, og projicerer hvad det betyder for de næste 3–12 måneder.
        </p>
      </div>

      {/* Feature grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-8">
        <FeatureCard
          icon={Filter}
          title="Sales funnel"
          description="Hvor mange leads → kvalificeret → tilbud → vundet? Hvor er drop-off størst?"
        />
        <FeatureCard
          icon={Clock}
          title="Velocity-analyse"
          description="Hvor lang tid bruger I i hvert stadie? Hvor er flaskehalsene? Hvilke deals er stallede?"
        />
        <FeatureCard
          icon={TrendingUp}
          title="Omsætnings-projektion"
          description="Konservativt, forventet og best-case scenario for de næste 3–12 måneder med fejlmargin."
        />
        <FeatureCard
          icon={DollarSign}
          title="Hvad-hvis simulator"
          description="Skru på konvertering, deal-størrelse og lead-volumen og se den årlige effekt live."
        />
      </div>

      {/* Tilkøb-CTA */}
      <div className="bg-card border border-border rounded-xl p-6 text-center">
        <Lock className="h-6 w-6 text-muted-foreground mx-auto mb-3" />
        <h2 className="font-semibold mb-1">Forecast-modulet er ikke aktiveret på {tenantName}</h2>
        <p className="text-sm text-muted-foreground mb-4 max-w-md mx-auto">
          Tilkøb modulet for at låse op for hele Forecast-sektionen — eller kontakt din administrator.
        </p>
        <div className="flex items-center justify-center gap-2">
          <Link href="/settings">
            <Button size="md">Aktivér Forecast (Beta)</Button>
          </Link>
          <Link href="/dashboard">
            <Button size="md" variant="ghost">Tilbage til dashboard</Button>
          </Link>
        </div>
        <p className="text-[11px] text-muted-foreground mt-4">
          BETA — funktionen er under aktiv udvikling. Tilbagemeldinger sendes direkte til Plesner Tech.
        </p>
      </div>
    </div>
  );
}

function FeatureCard({ icon: Icon, title, description }: { icon: any; title: string; description: string }) {
  return (
    <div className="bg-card border border-border rounded-xl p-4 flex items-start gap-3">
      <div className="w-9 h-9 rounded-lg bg-violet-500/10 flex items-center justify-center shrink-0">
        <Icon className="h-4 w-4 text-violet-700" />
      </div>
      <div>
        <p className="font-semibold text-sm">{title}</p>
        <p className="text-xs text-muted-foreground mt-0.5 leading-relaxed">{description}</p>
      </div>
    </div>
  );
}
