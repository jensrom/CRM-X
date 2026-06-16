/**
 * ForecastShell — fælles header + tab-navigation til alle /forecast/*-sider
 * Nordisk layout, BETA-badge tydeligt synligt.
 */

import Link from "next/link";
import { Sparkles } from "lucide-react";

const FORECAST_TABS = [
  { href: "/forecast",            label: "Overblik" },
  { href: "/forecast/funnel",     label: "Sales funnel" },
  { href: "/forecast/velocity",   label: "Velocity" },
  { href: "/forecast/revenue",    label: "Omsætnings-forecast" },
  { href: "/forecast/simulator",  label: "Hvad-hvis simulator" },
];

export function ForecastShell({
  active,
  children,
}: {
  active: string; // pathname til active match
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-5">
      <div className="flex items-start justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <h1 className="text-2xl font-semibold">Forecast</h1>
            <BetaBadge />
          </div>
          <p className="text-sm text-muted-foreground max-w-2xl">
            Bygge-grundlaget for økonomiske beslutninger. Vi læser dine historiske deals,
            stadie-tider og konverteringer — og projicerer hvad det betyder for de næste måneder.
            Alle tal vises med fejlmargin baseret på datavolumen.
          </p>
        </div>
      </div>

      <nav className="border-b border-border -mx-6 px-6 overflow-x-auto scrollbar-thin">
        <div className="flex items-center gap-1 min-w-max">
          {FORECAST_TABS.map((t) => {
            const isActive = active === t.href || (t.href !== "/forecast" && active.startsWith(t.href));
            return (
              <Link
                key={t.href}
                href={t.href}
                className={`relative px-3.5 py-2.5 text-sm font-medium rounded-t-lg transition-colors ${
                  isActive
                    ? "text-foreground"
                    : "text-muted-foreground hover:text-foreground hover:bg-secondary/40"
                }`}
              >
                {t.label}
                {isActive && (
                  <span className="absolute inset-x-2 -bottom-px h-0.5 bg-primary rounded-full" />
                )}
              </Link>
            );
          })}
        </div>
      </nav>

      <div>{children}</div>
    </div>
  );
}

export function BetaBadge() {
  return (
    <span className="inline-flex items-center gap-1 text-[10px] uppercase tracking-wide font-semibold px-2 py-0.5 rounded-full bg-violet-100 text-violet-700 border border-violet-200">
      <Sparkles className="h-2.5 w-2.5" />
      Beta
    </span>
  );
}
