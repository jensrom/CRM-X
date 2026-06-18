/**
 * MyTargetWidget — viser brugerens egen salgs-progress for indeværende måned.
 *
 * Hentes server-side i dashboard via getMyCurrentTarget(). Renderer ingenting
 * hvis brugeren ikke har et mål sat (lavt visuelt støj-niveau).
 */

import Link from "next/link";
import { Target, ArrowUpRight, Trophy } from "lucide-react";
import { formatCurrency } from "@/lib/utils";

interface Props {
  target: {
    label: string;
    targetAmount: number;
    achieved: number;
    count: number;
    percent: number;
    currency: string;
  } | null;
}

export function MyTargetWidget({ target }: Props) {
  if (!target) return null;

  const remaining = Math.max(0, target.targetAmount - target.achieved);
  const tone =
    target.percent >= 100 ? "emerald" :
    target.percent >= 70 ? "amber" : "primary";

  const barColor = tone === "emerald"
    ? "bg-emerald-500"
    : tone === "amber"
    ? "bg-amber-500"
    : "bg-primary";

  return (
    <Link
      href="/sales/targets"
      className="block bg-card border border-border rounded-xl p-5 hover:border-primary/40 transition-colors group"
    >
      <div className="flex items-start justify-between mb-3">
        <div>
          <p className="text-xs font-medium text-muted-foreground">
            Dit salgsmål · {target.label}
          </p>
          <p className="text-lg font-semibold tabular-nums mt-1">
            {formatCurrency(target.achieved, target.currency)}
            <span className="text-sm font-normal text-muted-foreground">
              {" "}/ {formatCurrency(target.targetAmount, target.currency)}
            </span>
          </p>
        </div>
        <div className="h-9 w-9 rounded-md bg-primary/10 text-primary flex items-center justify-center">
          {target.percent >= 100 ? (
            <Trophy className="h-4 w-4" />
          ) : (
            <Target className="h-4 w-4" />
          )}
        </div>
      </div>

      <div className="h-2 bg-secondary/40 rounded-full overflow-hidden mb-2">
        <div
          className={`h-full rounded-full transition-all ${barColor}`}
          style={{ width: `${Math.min(100, target.percent)}%` }}
        />
      </div>

      <div className="flex items-center justify-between text-xs">
        <span className="font-semibold tabular-nums">
          {target.percent}% af mål
        </span>
        <span className="text-muted-foreground inline-flex items-center gap-1">
          {target.count} vundne deals
          <ArrowUpRight className="h-3 w-3 opacity-0 group-hover:opacity-100 transition-opacity" />
        </span>
      </div>

      {target.percent < 100 && remaining > 0 && (
        <p className="text-xs text-muted-foreground mt-3">
          Mangler {formatCurrency(remaining, target.currency)} til mål
        </p>
      )}
    </Link>
  );
}
