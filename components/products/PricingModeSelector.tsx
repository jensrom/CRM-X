"use client";

/**
 * PricingModeSelector — knapper til at vaelge SaaS vs engangs prismodel
 * ─────────────────────────────────────────────────────────────────────
 * Kobler sammen med type-vaelgeren:
 *   • Naar type aendres til "saas" eller "subscription" → auto-skift til per_user_per_period
 *   • Brugeren kan stadig overskrive manuelt
 *   • Visuel forklaring saa man forstaar forskellen
 */

import { useState, useEffect } from "react";
import { Users, Package, Scissors } from "lucide-react";

type Mode = "per_unit" | "per_user_per_period" | "per_hour_bundle";

interface Props {
  defaultType: string;
  defaultMode: Mode;
}

export function PricingModeSelector({ defaultType, defaultMode }: Props) {
  const [type, setType] = useState(defaultType);
  const [mode, setMode] = useState<Mode>(defaultMode);
  // Husk om brugeren har valgt eksplicit — i sa fald override'r vi ikke fra type-aendring
  const [userTouched, setUserTouched] = useState(false);

  // Auto-skift naar type aendres
  useEffect(() => {
    if (userTouched) return;
    if (type === "saas" || type === "subscription") {
      setMode("per_user_per_period");
    } else if (type === "bundle") {
      setMode("per_hour_bundle");
    } else {
      setMode("per_unit");
    }
  }, [type, userTouched]);

  // Hook ind i select[name=type] i den omgivende form for at lytte til aendringer
  useEffect(() => {
    const typeSelect = document.querySelector<HTMLSelectElement>("select[name=type]");
    if (!typeSelect) return;
    const handler = () => setType(typeSelect.value);
    typeSelect.addEventListener("change", handler);
    return () => typeSelect.removeEventListener("change", handler);
  }, []);

  const setExplicit = (m: Mode) => {
    setMode(m);
    setUserTouched(true);
  };

  return (
    <div className="space-y-1.5">
      <label className="block text-sm font-medium text-foreground">Prismodel</label>
      <input type="hidden" name="pricingMode" value={mode} />

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
        <button
          type="button"
          onClick={() => setExplicit("per_unit")}
          className={`text-left p-3 rounded-lg border-2 transition-all ${
            mode === "per_unit"
              ? "border-primary bg-primary/5"
              : "border-border hover:border-primary/30 bg-card"
          }`}
        >
          <div className="flex items-center gap-2 mb-1">
            <Package className={`h-4 w-4 ${mode === "per_unit" ? "text-primary" : "text-muted-foreground"}`} />
            <p className="text-sm font-semibold">Pr. enhed</p>
          </div>
          <p className="text-xs text-muted-foreground">
            Pris × antal stk. Hardware, éngangs-licenser, konsulenttimer.
          </p>
        </button>

        <button
          type="button"
          onClick={() => setExplicit("per_user_per_period")}
          className={`text-left p-3 rounded-lg border-2 transition-all ${
            mode === "per_user_per_period"
              ? "border-primary bg-primary/5"
              : "border-border hover:border-primary/30 bg-card"
          }`}
        >
          <div className="flex items-center gap-2 mb-1">
            <Users className={`h-4 w-4 ${mode === "per_user_per_period" ? "text-primary" : "text-muted-foreground"}`} />
            <p className="text-sm font-semibold">Pr. bruger / periode</p>
          </div>
          <p className="text-xs text-muted-foreground">
            kr/bruger/md med fleksibel faktureringsperiode. SaaS-model.
          </p>
        </button>

        <button
          type="button"
          onClick={() => setExplicit("per_hour_bundle")}
          className={`text-left p-3 rounded-lg border-2 transition-all ${
            mode === "per_hour_bundle"
              ? "border-primary bg-primary/5"
              : "border-border hover:border-primary/30 bg-card"
          }`}
        >
          <div className="flex items-center gap-2 mb-1">
            <Scissors className={`h-4 w-4 ${mode === "per_hour_bundle" ? "text-primary" : "text-muted-foreground"}`} />
            <p className="text-sm font-semibold">Pr. time-pakke</p>
          </div>
          <p className="text-xs text-muted-foreground">
            kr/time × antal timer. Klippekort & pre-paid services.
          </p>
        </button>
      </div>

      {(type === "saas" || type === "subscription") && mode !== "per_user_per_period" && (
        <p className="text-xs text-amber-700 pl-0.5 mt-1.5">
          Bemærk: {type === "saas" ? "SaaS" : "Abonnement"}-produkter bruger typisk pr. bruger-prisning.
        </p>
      )}
      {type === "bundle" && mode !== "per_hour_bundle" && (
        <p className="text-xs text-amber-700 pl-0.5 mt-1.5">
          Bemærk: Klippekort bruger typisk pr. time-prisning.
        </p>
      )}
    </div>
  );
}
