"use client";

import { useState, useTransition } from "react";
import { updateDealStage } from "@/app/actions/deals";
import { ChevronLeft, ChevronRight, Loader2 } from "lucide-react";

const STAGES = ["new", "qualified", "proposal", "negotiation", "won", "lost"] as const;
type Stage = typeof STAGES[number];

const STAGE_LABELS: Record<Stage, string> = {
  new: "Ny",
  qualified: "Kvalificeret",
  proposal: "Tilbud sendt",
  negotiation: "Forhandling",
  won: "Vundet",
  lost: "Tabt",
};

const STAGE_COLORS: Record<Stage, string> = {
  new: "bg-slate-100 text-slate-700",
  qualified: "bg-blue-100 text-blue-700",
  proposal: "bg-violet-100 text-violet-700",
  negotiation: "bg-amber-100 text-amber-700",
  won: "bg-emerald-100 text-emerald-700",
  lost: "bg-red-100 text-red-700",
};

interface Props {
  dealId: string;
  currentStage: Stage;
}

export function StageSwitcher({ dealId, currentStage }: Props) {
  const [stage, setStage] = useState<Stage>(currentStage);
  const [isPending, startTransition] = useTransition();

  const currentIdx = STAGES.indexOf(stage);
  const canGoBack = currentIdx > 0;
  const canGoForward = currentIdx < STAGES.length - 1;

  function moveTo(newStage: Stage) {
    setStage(newStage);
    startTransition(() => {
      updateDealStage(dealId, newStage);
    });
  }

  return (
    <div className="flex items-center gap-2">
      <button
        onClick={() => canGoBack && moveTo(STAGES[currentIdx - 1])}
        disabled={!canGoBack || isPending}
        className="p-1 rounded hover:bg-secondary disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
      >
        <ChevronLeft className="h-4 w-4" />
      </button>

      <span className={`px-3 py-1 rounded-full text-xs font-semibold ${STAGE_COLORS[stage]}`}>
        {isPending ? (
          <span className="flex items-center gap-1">
            <Loader2 className="h-3 w-3 animate-spin" /> Opdaterer…
          </span>
        ) : (
          STAGE_LABELS[stage]
        )}
      </span>

      <button
        onClick={() => canGoForward && moveTo(STAGES[currentIdx + 1])}
        disabled={!canGoForward || isPending}
        className="p-1 rounded hover:bg-secondary disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
      >
        <ChevronRight className="h-4 w-4" />
      </button>
    </div>
  );
}
