"use client";

import { useState, useEffect } from "react";
import { Building2, Globe, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { INDUSTRIES, EMPLOYEE_COUNT_OPTIONS } from "@/lib/plans";
import type { WizardState } from "./OnboardingWizard";

interface Props {
  state: WizardState;
  update: <K extends keyof WizardState>(key: K, value: WizardState[K]) => void;
  onNext: () => void;
}

function slugify(name: string): string {
  return name
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[æå]/g, "a")
    .replace(/ø/g, "o")
    .replace(/[^a-z0-9-]/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 40);
}

export function CompanyStep({ state, update, onNext }: Props) {
  const [touched, setTouched] = useState(false);

  // Auto-foreslå slug fra firmanavn indtil brugeren rører feltet
  useEffect(() => {
    if (!touched && state.name) {
      update("slug", slugify(state.name));
    }
  }, [state.name, touched, update]);

  const canProceed =
    state.name.trim().length >= 2 &&
    /^[a-z0-9](?:[a-z0-9-]{0,40}[a-z0-9])?$/.test(state.slug);

  return (
    <div className="p-6 space-y-6">
      <div>
        <div className="flex items-center gap-3 mb-4">
          <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
            <Building2 className="h-5 w-5 text-primary" />
          </div>
          <div>
            <h2 className="font-semibold">Firma-stamdata</h2>
            <p className="text-xs text-muted-foreground">Kundens grunddata. Adressen bruges på fakturaer.</p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="sm:col-span-2">
          <Input
            label="Firmanavn *"
            placeholder="Acme Consulting A/S"
            value={state.name}
            onChange={(e) => update("name", e.target.value)}
          />
        </div>

        <div className="sm:col-span-2">
          <label className="block text-sm font-medium text-foreground mb-1.5">
            Subdomain (slug) *
          </label>
          <div className="flex items-stretch">
            <div className="flex items-center px-3 bg-secondary/50 border border-r-0 border-input rounded-l-lg text-xs text-muted-foreground">
              <Globe className="h-3.5 w-3.5 mr-1.5" />
              https://
            </div>
            <input
              type="text"
              value={state.slug}
              onChange={(e) => {
                setTouched(true);
                update("slug", slugify(e.target.value));
              }}
              placeholder="acme"
              className="flex-1 px-3 py-2 border border-input bg-background text-sm font-mono focus:outline-none focus:ring-2 focus:ring-ring"
            />
            <div className="flex items-center px-3 bg-secondary/50 border border-l-0 border-input rounded-r-lg text-xs text-muted-foreground">
              .plesnertech.dk
            </div>
          </div>
          <p className="text-[11px] text-muted-foreground mt-1">
            Auto-foreslået fra firmanavn. Kan ikke ændres efter oprettelse.
          </p>
        </div>

        <Input
          label="CVR-nummer"
          placeholder="12345678"
          maxLength={8}
          value={state.cvr}
          onChange={(e) => update("cvr", e.target.value.replace(/\D/g, ""))}
        />

        <div>
          <label className="block text-sm font-medium text-foreground mb-1.5">Branche</label>
          <select
            value={state.industry}
            onChange={(e) => update("industry", e.target.value)}
            className="w-full px-3 py-2 rounded-lg border border-input bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring"
          >
            <option value="">— Vælg branche —</option>
            {INDUSTRIES.map((i) => (
              <option key={i.value} value={i.value}>
                {i.label}
              </option>
            ))}
          </select>
        </div>

        <Input
          label="Adresse"
          placeholder="Hovedgaden 42"
          value={state.address}
          onChange={(e) => update("address", e.target.value)}
        />

        <div className="grid grid-cols-3 gap-2">
          <Input
            label="Postnr."
            placeholder="8000"
            maxLength={4}
            value={state.zipCode}
            onChange={(e) => update("zipCode", e.target.value)}
          />
          <div className="col-span-2">
            <Input
              label="By"
              placeholder="Aarhus"
              value={state.city}
              onChange={(e) => update("city", e.target.value)}
            />
          </div>
        </div>

        <Input
          label="Hjemmeside"
          placeholder="https://acme.dk"
          value={state.website}
          onChange={(e) => update("website", e.target.value)}
        />

        <div>
          <label className="block text-sm font-medium text-foreground mb-1.5">Antal medarbejdere</label>
          <select
            value={state.employeeCount}
            onChange={(e) => update("employeeCount", e.target.value)}
            className="w-full px-3 py-2 rounded-lg border border-input bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring"
          >
            <option value="">— Vælg størrelse —</option>
            {EMPLOYEE_COUNT_OPTIONS.map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className="flex justify-end pt-2 border-t border-border">
        <Button onClick={onNext} disabled={!canProceed} size="lg">
          Næste — admin-kontakt
          <ArrowRight className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}
