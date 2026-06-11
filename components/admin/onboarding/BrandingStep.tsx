"use client";

import { Palette, ArrowRight, ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import type { WizardState } from "./OnboardingWizard";

interface Props {
  state: WizardState;
  update: <K extends keyof WizardState>(key: K, value: WizardState[K]) => void;
  onNext: () => void;
  onPrev: () => void;
}

const PRESET_COLORS = [
  { name: "Nordisk blå (default)", value: "" },
  { name: "Skoven", value: "#16A34A" },
  { name: "Solnedgang", value: "#EA580C" },
  { name: "Bordeaux", value: "#9F1239" },
  { name: "Indigo", value: "#4F46E5" },
  { name: "Slate", value: "#475569" },
];

export function BrandingStep({ state, update, onNext, onPrev }: Props) {
  return (
    <div className="p-6 space-y-6">
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-violet-500/10 flex items-center justify-center">
            <Palette className="h-5 w-5 text-violet-600" />
          </div>
          <div>
            <h2 className="font-semibold">Brand-touch (valgfri)</h2>
            <p className="text-xs text-muted-foreground">
              Du kan altid komme tilbage og ændre det her senere.
            </p>
          </div>
        </div>
        <button
          type="button"
          onClick={onNext}
          className="text-sm text-muted-foreground hover:text-foreground transition-colors underline underline-offset-2"
        >
          Skip
        </button>
      </div>

      <Input
        label="Logo URL"
        placeholder="https://acme.dk/logo.png (eller upload senere)"
        value={state.logoUrl}
        onChange={(e) => update("logoUrl", e.target.value)}
      />
      <p className="text-[11px] text-muted-foreground -mt-3">
        Indtast en URL for nu. I tenant-settings kan kunden senere uploade et logo direkte.
      </p>

      <div>
        <label className="block text-sm font-medium text-foreground mb-2">Accent-farve</label>
        <div className="grid grid-cols-3 sm:grid-cols-6 gap-2">
          {PRESET_COLORS.map((c) => {
            const isSelected = state.accentColor === c.value;
            return (
              <button
                key={c.name}
                type="button"
                onClick={() => update("accentColor", c.value)}
                className={`flex flex-col items-center gap-1 p-2 rounded-lg border transition-all ${
                  isSelected ? "border-primary bg-primary/5" : "border-border hover:border-primary/40"
                }`}
              >
                <div
                  className="w-8 h-8 rounded-lg shadow-sm"
                  style={{
                    background: c.value || "linear-gradient(135deg, #2563EB, #0EA5E9)",
                  }}
                />
                <span className="text-[10px] text-muted-foreground text-center leading-tight">
                  {c.name}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      <div>
        <label className="block text-sm font-medium text-foreground mb-1.5">
          Velkomsthilsen (vises på dashboard ved første login)
        </label>
        <textarea
          rows={3}
          maxLength={280}
          placeholder="Eks: Velkommen til vores nye CRM — håber du finder det nyttigt!"
          value={state.welcomeMessage}
          onChange={(e) => update("welcomeMessage", e.target.value)}
          className="w-full px-3 py-2 rounded-lg border border-input bg-background text-sm resize-none focus:outline-none focus:ring-2 focus:ring-ring"
        />
        <p className="text-[11px] text-muted-foreground mt-1">
          {state.welcomeMessage.length} / 280
        </p>
      </div>

      <div className="flex justify-between pt-2 border-t border-border">
        <Button variant="ghost" onClick={onPrev}>
          <ArrowLeft className="h-4 w-4" />
          Tilbage
        </Button>
        <Button onClick={onNext} size="lg">
          Næste — bekræft
          <ArrowRight className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}
