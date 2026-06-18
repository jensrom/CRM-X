/**
 * AtRiskCustomersWidget — top-N kunder med laveste health-score.
 * Vises kun hvis der er > 0 at-risk kunder (mindre støj for sunde tenants).
 */

import Link from "next/link";
import { AlertTriangle, ArrowUpRight } from "lucide-react";
import { HealthBadge } from "@/components/companies/HealthBadge";

interface Row {
  id: string;
  name: string;
  healthScore: number | null;
  healthSignals: any;
}

export function AtRiskCustomersWidget({ rows }: { rows: Row[] }) {
  if (rows.length === 0) return null;

  return (
    <div className="bg-card border border-border rounded-xl p-5">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-sm font-semibold flex items-center gap-2">
          <AlertTriangle className="h-4 w-4 text-amber-500" />
          Kunder i risiko
        </h3>
        <Link href="/kunder?health=risk" className="text-xs text-muted-foreground hover:text-foreground">
          Se alle →
        </Link>
      </div>
      <div className="space-y-2">
        {rows.map((r) => {
          const reasons = (r.healthSignals?.reasons ?? []) as string[];
          return (
            <Link
              key={r.id}
              href={`/kunder/${r.id}`}
              className="flex items-center gap-3 p-2.5 rounded-lg hover:bg-secondary/30 transition-colors group"
            >
              <HealthBadge score={r.healthScore} signals={r.healthSignals} size="sm" />
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium truncate">{r.name}</p>
                {reasons[0] && (
                  <p className="text-xs text-muted-foreground truncate">{reasons[0]}</p>
                )}
              </div>
              <ArrowUpRight className="h-3.5 w-3.5 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
            </Link>
          );
        })}
      </div>
    </div>
  );
}
