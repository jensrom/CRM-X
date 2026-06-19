/**
 * SlaAtRiskWidget — tickets i SLA-fare (warning eller breach).
 * Vises kun hvis der er > 0 risiko-tickets.
 */

import Link from "next/link";
import { AlertTriangle, ArrowUpRight } from "lucide-react";
import { SlaBadge } from "@/components/sla/SlaBadge";
import type { SlaResult } from "@/lib/sla";

interface Row {
  ticket: {
    id: string;
    title: string;
    priority: string;
    company: { name: string };
  };
  result: SlaResult;
}

export function SlaAtRiskWidget({ rows }: { rows: Row[] }) {
  if (rows.length === 0) return null;

  return (
    <div className="bg-card border border-border rounded-xl p-5">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-sm font-semibold flex items-center gap-2">
          <AlertTriangle className="h-4 w-4 text-rose-500" />
          SLA i fare
        </h3>
        <Link href="/support/tickets?sla=at_risk" className="text-xs text-muted-foreground hover:text-foreground">
          Se alle →
        </Link>
      </div>
      <div className="space-y-2">
        {rows.map((r) => (
          <Link
            key={r.ticket.id}
            href={`/support/tickets/${r.ticket.id}`}
            className="flex items-center gap-3 p-2.5 rounded-lg hover:bg-secondary/30 transition-colors group"
          >
            <SlaBadge result={r.result} size="sm" />
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium truncate">{r.ticket.title}</p>
              <p className="text-xs text-muted-foreground truncate">{r.ticket.company.name} · {r.ticket.priority}</p>
            </div>
            <ArrowUpRight className="h-3.5 w-3.5 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
          </Link>
        ))}
      </div>
    </div>
  );
}
