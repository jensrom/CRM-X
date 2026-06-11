"use client";

import { useState, useEffect, useTransition } from "react";
import { checkIn, checkOut } from "@/app/actions/projects";
import { Timer, LogOut, Loader2 } from "lucide-react";

interface CheckInButtonProps {
  projectId: string;
  isCheckedIn: boolean;
  checkedInAt: string | null;
}

function formatElapsed(startedAt: string): string {
  const diff = Math.floor((Date.now() - new Date(startedAt).getTime()) / 1000);
  const h = Math.floor(diff / 3600);
  const m = Math.floor((diff % 3600) / 60);
  const s = diff % 60;
  if (h > 0) return `${h}t ${m}m`;
  if (m > 0) return `${m}m ${s}s`;
  return `${s}s`;
}

export function CheckInButton({ projectId, isCheckedIn, checkedInAt }: CheckInButtonProps) {
  const [elapsed, setElapsed] = useState<string>("");
  const [isPending, startTransition] = useTransition();

  useEffect(() => {
    if (!isCheckedIn || !checkedInAt) return;
    const interval = setInterval(() => {
      setElapsed(formatElapsed(checkedInAt));
    }, 1000);
    setElapsed(formatElapsed(checkedInAt));
    return () => clearInterval(interval);
  }, [isCheckedIn, checkedInAt]);

  async function handleCheckIn() {
    startTransition(async () => {
      await checkIn(projectId);
    });
  }

  async function handleCheckOut() {
    startTransition(async () => {
      await checkOut();
    });
  }

  if (isCheckedIn) {
    return (
      <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-4">
        <div className="flex items-center gap-2 mb-3">
          <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
          <p className="text-xs font-semibold text-emerald-700">Aktiv check-in</p>
        </div>
        <p className="text-2xl font-bold text-emerald-700 mb-3 font-mono">{elapsed}</p>
        <button
          onClick={handleCheckOut}
          disabled={isPending}
          className="w-full flex items-center justify-center gap-2 px-4 py-2 rounded-lg
                     bg-emerald-600 text-white text-sm font-medium
                     hover:bg-emerald-700 disabled:opacity-50 transition-colors"
        >
          {isPending
            ? <Loader2 className="h-4 w-4 animate-spin" />
            : <LogOut className="h-4 w-4" />}
          Check ud — log tid automatisk
        </button>
        <p className="text-[10px] text-emerald-600 text-center mt-2">
          Tid rundes op til nærmeste 5 min
        </p>
      </div>
    );
  }

  return (
    <div className="bg-card border border-border rounded-xl p-4">
      <p className="text-xs font-semibold text-muted-foreground mb-3 flex items-center gap-1.5">
        <Timer className="h-3.5 w-3.5" /> Tidtagning
      </p>
      <button
        onClick={handleCheckIn}
        disabled={isPending}
        className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg
                   bg-primary text-primary-foreground text-sm font-medium
                   hover:bg-primary/90 disabled:opacity-50 transition-colors"
      >
        {isPending
          ? <Loader2 className="h-4 w-4 animate-spin" />
          : <Timer className="h-4 w-4" />}
        Check ind
      </button>
      <p className="text-[10px] text-muted-foreground text-center mt-2">
        Tid stoppes og logges automatisk ved check ud
      </p>
    </div>
  );
}
