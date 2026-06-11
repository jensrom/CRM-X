"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { logTime } from "@/app/actions/tickets";
import { logProjectTime } from "@/app/actions/projects";
import { Clock } from "lucide-react";

const TIME_PRESETS = [
  { label: "15 min", minutes: 15 },
  { label: "½t",     minutes: 30 },
  { label: "1t",     minutes: 60 },
  { label: "2t",     minutes: 120 },
  { label: "4t",     minutes: 240 },
  { label: "8t",     minutes: 480 },
];

interface LogTimeFormProps {
  ticketId: string;  // bruges som ticketId eller projectId afhængig af projectMode
  today: string;
  projectMode?: boolean;
}

export function LogTimeForm({ ticketId, today, projectMode = false }: LogTimeFormProps) {
  const [minutes, setMinutes] = useState<string>("");
  const action = projectMode ? logProjectTime : logTime;
  const idField = projectMode ? "projectId" : "ticketId";

  return (
    <div className="px-5 py-4 bg-secondary/20">
      <p className="text-xs font-semibold text-muted-foreground mb-3 flex items-center gap-1.5">
        <Clock className="h-3.5 w-3.5" />
        Log tid
      </p>

      {/* Hurtige tids-knapper */}
      <div className="flex items-center gap-1.5 mb-3 flex-wrap">
        {TIME_PRESETS.map((preset) => (
          <button
            key={preset.minutes}
            type="button"
            tabIndex={0}
            onClick={() => setMinutes(String(preset.minutes))}
            className={`px-2.5 py-1 rounded-lg text-xs font-medium border transition-colors
              ${String(preset.minutes) === minutes
                ? "bg-primary text-white border-primary"
                : "bg-background border-border text-muted-foreground hover:border-primary hover:text-primary"
              }`}
          >
            {preset.label}
          </button>
        ))}
      </div>

      <form action={action} className="space-y-3">
        <input type="hidden" name={idField} value={ticketId} />

        <div className="grid grid-cols-3 gap-3">
          <div className="space-y-1">
            <label htmlFor="log-minutes" className="text-xs font-medium">
              Minutter
            </label>
            <input
              id="log-minutes"
              name="durationMin"
              type="number"
              min="1"
              step="1"
              required
              value={minutes}
              onChange={(e) => setMinutes(e.target.value)}
              onBlur={(e) => {
                const val = parseInt(e.target.value);
                if (!isNaN(val) && val > 0) {
                  setMinutes(String(Math.ceil(val / 5) * 5));
                }
              }}
              placeholder="fx 45 min"
              tabIndex={1}
              className="w-full px-3 py-2 rounded-lg border border-input bg-background text-sm
                         focus:outline-none focus:ring-2 focus:ring-ring"
            />
          </div>
          <div className="space-y-1">
            <label htmlFor="log-date" className="text-xs font-medium">Dato</label>
            <input
              id="log-date"
              name="date"
              type="date"
              defaultValue={today}
              required
              tabIndex={2}
              className="w-full px-3 py-2 rounded-lg border border-input bg-background text-sm
                         focus:outline-none focus:ring-2 focus:ring-ring"
            />
          </div>
          <div className="space-y-1">
            <label htmlFor="log-billable" className="text-xs font-medium">Fakturerbar</label>
            <select
              id="log-billable"
              name="isBillable"
              defaultValue="true"
              tabIndex={3}
              className="w-full px-3 py-2 rounded-lg border border-input bg-background text-sm
                         focus:outline-none focus:ring-2 focus:ring-ring"
            >
              <option value="true">Ja</option>
              <option value="false">Nej</option>
            </select>
          </div>
        </div>

        <input
          id="log-description"
          name="description"
          placeholder="Beskrivelse (valgfrit)"
          tabIndex={4}
          className="w-full px-3 py-2 rounded-lg border border-input bg-background text-sm
                     placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
        />

        <Button type="submit" size="sm" tabIndex={5}>
          Log tid
        </Button>
      </form>
    </div>
  );
}
