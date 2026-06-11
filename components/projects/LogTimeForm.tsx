"use client";

import { useRef, useState, useTransition } from "react";
import { logProjectTime } from "@/app/actions/projects";
import { Button } from "@/components/ui/button";
import { Clock, Check } from "lucide-react";

const QUICK = [
  { label: "15 min", value: 15 },
  { label: "½ t",    value: 30 },
  { label: "1 t",    value: 60 },
  { label: "2 t",    value: 120 },
  { label: "4 t",    value: 240 },
  { label: "8 t",    value: 480 },
];

function todayISO() {
  return new Date().toISOString().slice(0, 10);
}

export function LogTimeForm({ projectId }: { projectId: string }) {
  const formRef = useRef<HTMLFormElement>(null);
  const [minutes, setMinutes] = useState<number | "">("");
  const [done, setDone] = useState(false);
  const [isPending, startTransition] = useTransition();

  function handleQuick(min: number) {
    setMinutes(min);
  }

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!minutes) return;
    const fd = new FormData(e.currentTarget);
    fd.set("durationMin", String(minutes));
    startTransition(async () => {
      await logProjectTime(fd);
      setDone(true);
      setMinutes("");
      formRef.current?.reset();
      setTimeout(() => setDone(false), 2500);
    });
  }

  return (
    <div className="bg-card border border-border rounded-xl p-4 space-y-4">
      <div className="flex items-center gap-2 text-sm font-semibold">
        <Clock className="h-4 w-4 text-muted-foreground" />
        Log tid
      </div>

      <form ref={formRef} onSubmit={handleSubmit} className="space-y-3">
        <input type="hidden" name="projectId" value={projectId} />

        {/* Quick-pick knapper */}
        <div className="flex flex-wrap gap-2">
          {QUICK.map((q) => (
            <button
              key={q.value}
              type="button"
              onClick={() => handleQuick(q.value)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors
                ${minutes === q.value
                  ? "bg-primary text-primary-foreground border-primary"
                  : "bg-secondary/50 text-foreground border-border hover:bg-secondary"
                }`}
            >
              {q.label}
            </button>
          ))}
        </div>

        {/* Manuel minutter */}
        <div className="flex items-center gap-2">
          <input
            type="number"
            min={1}
            placeholder="fx 45"
            value={minutes}
            onChange={(e) => setMinutes(e.target.value ? parseInt(e.target.value) : "")}
            className="flex-1 h-9 rounded-lg border border-border bg-background px-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
          />
          <span className="text-xs text-muted-foreground shrink-0">min</span>
        </div>

        {/* Dato */}
        <input
          type="date"
          name="date"
          defaultValue={todayISO()}
          className="w-full h-9 rounded-lg border border-border bg-background px-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
        />

        {/* Beskrivelse */}
        <textarea
          name="description"
          placeholder="Beskrivelse (valgfri)"
          rows={2}
          className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-primary/30"
        />

        {/* Fakturerbar toggle */}
        <label className="flex items-center gap-2 text-sm cursor-pointer select-none">
          <input type="checkbox" name="isBillable" defaultChecked className="rounded" />
          Fakturerbar
        </label>

        <Button
          type="submit"
          size="sm"
          disabled={!minutes || isPending}
          className="w-full"
        >
          {done ? (
            <>
              <Check className="h-3.5 w-3.5" />
              Gemt!
            </>
          ) : isPending ? (
            "Gemmer…"
          ) : (
            "Log tid"
          )}
        </Button>
      </form>
    </div>
  );
}
