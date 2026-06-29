"use client";

import { CheckCircle2, ArrowLeft, Send, AlertTriangle, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { getPlan, formatPrice, calculateMonthlyPrice, type Currency } from "@/lib/plans";
import type { WizardState } from "./OnboardingWizard";

interface Props {
  state: WizardState;
  update?: <K extends keyof WizardState>(key: K, value: WizardState[K]) => void;
  currency: Currency;
  onPrev: () => void;
  onSubmit: () => void;
  isSubmitting: boolean;
  error: string | null;
}

function Row({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex items-start justify-between py-2 border-b border-border last:border-0 gap-4">
      <span className="text-xs text-muted-foreground">{label}</span>
      <span className="text-sm font-medium text-right">{value}</span>
    </div>
  );
}

export function ConfirmStep({ state, update, currency, onPrev, onSubmit, isSubmitting, error }: Props) {
  const plan = getPlan(state.plan)!;
  const total = calculateMonthlyPrice(plan, state.maxUsers, currency);

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl bg-emerald-500/10 flex items-center justify-center">
          <Sparkles className="h-5 w-5 text-emerald-600" />
        </div>
        <div>
          <h2 className="font-semibold">Klar til at sætte i gang? 🌱</h2>
          <p className="text-xs text-muted-foreground">
            Gennemgå resuméet — tryk Opret når det stemmer.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className="bg-secondary/30 rounded-xl p-4">
          <p className="text-[11px] text-muted-foreground uppercase tracking-wide font-semibold mb-2">
            Kunde
          </p>
          <Row label="Navn" value={state.name} />
          <Row label="Subdomain" value={<code className="font-mono text-xs">{state.slug}.plesnertech.dk</code>} />
          {state.cvr && <Row label="CVR" value={state.cvr} />}
          {state.city && <Row label="Adresse" value={`${state.address}, ${state.zipCode} ${state.city}`} />}
        </div>

        <div className="bg-secondary/30 rounded-xl p-4">
          <p className="text-[11px] text-muted-foreground uppercase tracking-wide font-semibold mb-2">
            Admin-kontakt
          </p>
          <Row label="Navn" value={state.adminName} />
          <Row label="Email" value={state.adminEmail} />
          {state.adminTitle && <Row label="Stilling" value={state.adminTitle} />}
          {state.adminPhone && <Row label="Telefon" value={state.adminPhone} />}
        </div>

        <div className="bg-secondary/30 rounded-xl p-4">
          <p className="text-[11px] text-muted-foreground uppercase tracking-wide font-semibold mb-2">
            Plan & moduler
          </p>
          <Row label="Plan" value={<span className="font-semibold">{plan.name}</span>} />
          <Row label="Brugere" value={`${state.maxUsers} licenser`} />
          <Row
            label="Moduler"
            value={
              <span className="text-xs text-muted-foreground">
                {state.modules.join(", ")}
              </span>
            }
          />
          {(state.addOns ?? []).length > 0 && (
            <Row
              label="Tilkøb"
              value={
                <span className="text-xs text-primary font-semibold">
                  {(state.addOns ?? []).join(", ")}
                </span>
              }
            />
          )}
          {state.startWithTrial ? (
            <Row label="Trial" value={<span className="text-emerald-600">14 dage gratis</span>} />
          ) : (
            <Row label="Billing" value={<span className="text-foreground">Direkte aktiv</span>} />
          )}
          <Row
            label="Pris/md"
            value={
              <span className="text-base font-bold tabular-nums">
                {formatPrice(total, currency)}
              </span>
            }
          />
        </div>

        <div className="bg-secondary/30 rounded-xl p-4">
          <p className="text-[11px] text-muted-foreground uppercase tracking-wide font-semibold mb-2">
            Branding
          </p>
          {state.logoUrl ? (
            <Row label="Logo" value={<code className="font-mono text-[10px]">{state.logoUrl.slice(0, 30)}…</code>} />
          ) : (
            <Row label="Logo" value={<span className="text-muted-foreground">Default</span>} />
          )}
          <Row
            label="Farve"
            value={
              state.accentColor ? (
                <span className="flex items-center gap-2 justify-end">
                  <span className="w-3 h-3 rounded-sm" style={{ background: state.accentColor }} />
                  {state.accentColor}
                </span>
              ) : (
                <span className="text-muted-foreground">Nordisk blå</span>
              )
            }
          />
          <Row
            label="Velkomst"
            value={
              state.welcomeMessage ? (
                <span className="text-xs italic max-w-xs">"{state.welcomeMessage.slice(0, 50)}…"</span>
              ) : (
                <span className="text-muted-foreground">Standard</span>
              )
            }
          />
        </div>
      </div>

      {/* Invite-toggle */}
      <label className="flex items-start gap-3 p-4 rounded-lg border-2 border-primary/20 bg-primary/5 cursor-pointer hover:bg-primary/10 transition-colors">
        <input
          type="checkbox"
          checked={state.sendInviteNow}
          onChange={(e) => update?.("sendInviteNow", e.target.checked)}
          className="mt-0.5 accent-primary"
        />
        <div className="text-sm">
          <p className="font-medium flex items-center gap-1.5">
            <Send className="h-3.5 w-3.5" />
            Send velkomstmail med invite-link nu
          </p>
          <p className="text-xs text-muted-foreground mt-0.5">
            {state.adminEmail || "Admin"} modtager en venlig velkomstmail med et link til at
            sætte adgangskode og logge ind. Linket virker i 7 dage.
          </p>
        </div>
      </label>

      {error && (
        <div className="flex items-start gap-3 p-3 bg-destructive/10 border border-destructive/30 rounded-lg">
          <AlertTriangle className="h-4 w-4 text-destructive shrink-0 mt-0.5" />
          <p className="text-sm text-destructive">{error}</p>
        </div>
      )}

      <div className="flex justify-between pt-2 border-t border-border">
        <Button variant="ghost" onClick={onPrev} disabled={isSubmitting}>
          <ArrowLeft className="h-4 w-4" />
          Tilbage
        </Button>
        <Button onClick={onSubmit} disabled={isSubmitting} size="lg">
          <CheckCircle2 className="h-4 w-4" />
          {isSubmitting ? "Opretter…" : "Opret tenant"}
        </Button>
      </div>
    </div>
  );
}
