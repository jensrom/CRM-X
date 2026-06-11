"use client";

import { UserCog, ArrowRight, ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import type { WizardState } from "./OnboardingWizard";

interface Props {
  state: WizardState;
  update: <K extends keyof WizardState>(key: K, value: WizardState[K]) => void;
  onNext: () => void;
  onPrev: () => void;
}

export function AdminContactStep({ state, update, onNext, onPrev }: Props) {
  const canProceed =
    state.adminName.trim().length >= 2 &&
    /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(state.adminEmail);

  return (
    <div className="p-6 space-y-6">
      <div>
        <div className="flex items-center gap-3 mb-4">
          <div className="w-10 h-10 rounded-xl bg-emerald-500/10 flex items-center justify-center">
            <UserCog className="h-5 w-5 text-emerald-600" />
          </div>
          <div>
            <h2 className="font-semibold">Hvem styrer det daglige?</h2>
            <p className="text-xs text-muted-foreground">
              Denne person bliver tenant-admin og modtager velkomstmailen.
            </p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <Input
          label="Fulde navn *"
          placeholder="Lars Larsen"
          value={state.adminName}
          onChange={(e) => update("adminName", e.target.value)}
        />

        <Input
          label="Email *"
          placeholder="lars@acme.dk"
          type="email"
          value={state.adminEmail}
          onChange={(e) => update("adminEmail", e.target.value.trim())}
        />

        <Input
          label="Telefon"
          placeholder="+45 12 34 56 78"
          value={state.adminPhone}
          onChange={(e) => update("adminPhone", e.target.value)}
        />

        <Input
          label="Stilling"
          placeholder="Adm. direktør"
          value={state.adminTitle}
          onChange={(e) => update("adminTitle", e.target.value)}
        />
      </div>

      <div className="bg-secondary/40 border border-border rounded-lg p-3 text-xs text-muted-foreground">
        💡 Stillingsbetegnelsen bruges i velkomstmailen, fx <em>"Hej Lars, direktør"</em>.
        Lad den være tom hvis du foretrækker en mere uformel tiltale.
      </div>

      <div className="flex justify-between pt-2 border-t border-border">
        <Button variant="ghost" onClick={onPrev}>
          <ArrowLeft className="h-4 w-4" />
          Tilbage
        </Button>
        <Button onClick={onNext} disabled={!canProceed} size="lg">
          Næste — plan
          <ArrowRight className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}
