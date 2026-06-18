"use client";

import { useState, useEffect, useTransition } from "react";
import { Sun, Moon, Monitor } from "lucide-react";
import { applyTheme } from "@/components/layout/ThemeProvider";
import { updateMyTheme } from "@/app/actions/settings";

type Theme = "light" | "dark" | "system";

const OPTIONS: { value: Theme; label: string; icon: any }[] = [
  { value: "light",  label: "Lys",      icon: Sun },
  { value: "dark",   label: "Mørk",     icon: Moon },
  { value: "system", label: "System",   icon: Monitor },
];

export function ThemeToggle({ initial = "system" }: { initial?: Theme }) {
  const [theme, setTheme] = useState<Theme>(initial);
  const [, start] = useTransition();

  useEffect(() => {
    const stored = (localStorage.getItem("theme") as Theme | null) ?? initial;
    setTheme(stored);
  }, [initial]);

  const handleChange = (next: Theme) => {
    setTheme(next);
    applyTheme(next);
    start(async () => {
      try {
        await updateMyTheme(next);
      } catch {}
    });
  };

  return (
    <div>
      <p className="text-sm font-medium mb-2">Tema</p>
      <div className="inline-flex items-center bg-secondary/30 rounded-lg p-1">
        {OPTIONS.map((opt) => {
          const Icon = opt.icon;
          const active = theme === opt.value;
          return (
            <button
              key={opt.value}
              type="button"
              onClick={() => handleChange(opt.value)}
              className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-md transition-colors ${
                active
                  ? "bg-card text-foreground shadow-sm"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              <Icon className="h-3.5 w-3.5" />
              {opt.label}
            </button>
          );
        })}
      </div>
      <p className="text-xs text-muted-foreground mt-2">
        Vælg lyst, mørkt eller følg systemets indstilling.
      </p>
    </div>
  );
}
