"use client";

/**
 * PersonaTabs — switcher mellem "Mit" og "Team"-view paa dashboard.
 *
 * Bruger URL-state (?view=) saa man kan dele links og browser-back virker.
 * Default = "mit" naar parameteret ikke er sat.
 */

import { useRouter, useSearchParams, usePathname } from "next/navigation";
import { User as UserIcon, Users } from "lucide-react";
import type { Persona } from "@/lib/personas";
import { PERSONA_LABELS, PERSONA_DESCRIPTIONS } from "@/lib/personas";

interface Props {
  persona: Persona;
  currentView: "mit" | "team";
  myName: string;
}

export function PersonaTabs({ persona, currentView, myName }: Props) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const pathname = usePathname();

  const switchView = (view: "mit" | "team") => {
    const sp = new URLSearchParams(searchParams.toString());
    if (view === "mit") sp.delete("view");
    else sp.set("view", view);
    const qs = sp.toString();
    router.push(qs ? `${pathname}?${qs}` : pathname);
  };

  return (
    <div className="flex items-center gap-4 mb-6 border-b border-border">
      <button
        type="button"
        onClick={() => switchView("mit")}
        className={`flex items-center gap-2 px-1 py-3 text-sm font-medium border-b-2 -mb-px transition-colors ${
          currentView === "mit"
            ? "border-primary text-primary"
            : "border-transparent text-muted-foreground hover:text-foreground"
        }`}
      >
        <UserIcon className="h-3.5 w-3.5" />
        Mit — {myName.split(" ")[0]}
        <span className="text-[10px] uppercase tracking-wider px-1.5 py-0.5 rounded-full bg-secondary text-muted-foreground ml-1">
          {PERSONA_LABELS[persona]}
        </span>
      </button>
      <button
        type="button"
        onClick={() => switchView("team")}
        className={`flex items-center gap-2 px-1 py-3 text-sm font-medium border-b-2 -mb-px transition-colors ${
          currentView === "team"
            ? "border-primary text-primary"
            : "border-transparent text-muted-foreground hover:text-foreground"
        }`}
      >
        <Users className="h-3.5 w-3.5" />
        Hele teamet
      </button>
      <p className="ml-auto text-xs text-muted-foreground hidden md:block">
        {currentView === "mit"
          ? PERSONA_DESCRIPTIONS[persona]
          : "Samlet overblik på tværs af brugere"}
      </p>
    </div>
  );
}
