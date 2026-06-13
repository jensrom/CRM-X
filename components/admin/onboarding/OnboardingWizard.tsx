"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { MultiStepForm, StepDefinition } from "@/components/shared/MultiStepForm";
import { CompanyStep } from "./CompanyStep";
import { AdminContactStep } from "./AdminContactStep";
import { PlanStep } from "./PlanStep";
import { BrandingStep } from "./BrandingStep";
import { ConfirmStep } from "./ConfirmStep";
import { createTenantFromWizard } from "@/app/actions/admin-onboarding";
import type { Currency, PlanSlug } from "@/lib/plans";

/**
 * Wizard-state lever i denne komponent.
 * Vi bruger ikke URL-state (sessionStorage var alternativ), så
 * page-reload nulstiller — det er et bevidst valg for at undgå
 * stale-state-bugs. Hvis det bliver et problem, kan vi tilføje
 * sessionStorage senere.
 */
export interface WizardState {
  // Trin 1 — Kunde
  name: string;
  slug: string;
  cvr: string;
  industry: string;
  country: string;
  address: string;
  zipCode: string;
  city: string;
  website: string;
  employeeCount: string;

  // Trin 2 — Admin
  adminName: string;
  adminEmail: string;
  adminPhone: string;
  adminTitle: string;

  // Trin 3 — Plan
  plan: PlanSlug;
  modules: string[];
  maxUsers: number;
  startWithTrial: boolean;

  // Trin 4 — Branding
  logoUrl: string;
  accentColor: string;
  welcomeMessage: string;

  // Trin 5 — Bekræftelse
  sendInviteNow: boolean;
}

const initialState: WizardState = {
  name: "",
  slug: "",
  cvr: "",
  industry: "",
  country: "DK",
  address: "",
  zipCode: "",
  city: "",
  website: "",
  employeeCount: "",
  adminName: "",
  adminEmail: "",
  adminPhone: "",
  adminTitle: "",
  plan: "medium",
  modules: ["sales", "support", "marketing", "products"],
  maxUsers: 10,
  startWithTrial: true,
  logoUrl: "",
  accentColor: "",
  welcomeMessage: "",
  sendInviteNow: true,
};

const STEPS: StepDefinition[] = [
  { id: "company", label: "Kunde", description: "Stamdata" },
  { id: "admin", label: "Admin", description: "Kontaktperson" },
  { id: "plan", label: "Plan", description: "Pakke & licenser" },
  { id: "branding", label: "Branding", description: "Logo & farver", optional: true },
  { id: "confirm", label: "Bekræft", description: "Resumé & opret" },
];

interface Props {
  defaultCurrency: Currency;
}

export function OnboardingWizard({ defaultCurrency }: Props) {
  const router = useRouter();
  const [currentStepId, setCurrentStepId] = useState<string>("company");
  const [state, setState] = useState<WizardState>(initialState);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function update<K extends keyof WizardState>(key: K, value: WizardState[K]) {
    setState((s) => ({ ...s, [key]: value }));
  }

  function next() {
    const idx = STEPS.findIndex((s) => s.id === currentStepId);
    const nextStep = STEPS[idx + 1];
    if (nextStep) setCurrentStepId(nextStep.id);
  }

  function prev() {
    const idx = STEPS.findIndex((s) => s.id === currentStepId);
    const prevStep = STEPS[idx - 1];
    if (prevStep) setCurrentStepId(prevStep.id);
  }

  function goTo(stepId: string) {
    setCurrentStepId(stepId);
  }

  async function submit() {
    setError(null);
    startTransition(async () => {
      try {
        const result = await createTenantFromWizard({
          name: state.name,
          slug: state.slug,
          cvr: state.cvr || null,
          industry: state.industry || null,
          country: state.country,
          address: state.address || null,
          zipCode: state.zipCode || null,
          city: state.city || null,
          website: state.website || null,
          employeeCount: state.employeeCount || null,
          adminName: state.adminName,
          adminEmail: state.adminEmail,
          adminPhone: state.adminPhone || null,
          adminTitle: state.adminTitle || null,
          plan: state.plan,
          modules: state.modules,
          maxUsers: state.maxUsers,
          startWithTrial: state.startWithTrial,
          billingCurrency: defaultCurrency,
          logoUrl: state.logoUrl || null,
          accentColor: state.accentColor || null,
          welcomeMessage: state.welcomeMessage || null,
          sendInviteNow: state.sendInviteNow,
        });
        if (result.ok) {
          router.push(`/admin/tenants/${result.tenantId}?onboarded=1`);
        } else {
          setError(result.error ?? "Kunne ikke oprette tenanten");
        }
      } catch (e: any) {
        setError(e?.message ?? "Uventet fejl");
      }
    });
  }

  return (
    <MultiStepForm
      steps={STEPS}
      currentStepId={currentStepId}
      onStepChange={goTo}
    >
      {(step) => (
        <>
          {step.id === "company" && (
            <CompanyStep state={state} update={update} onNext={next} />
          )}
          {step.id === "admin" && (
            <AdminContactStep
              state={state}
              update={update}
              onNext={next}
              onPrev={prev}
            />
          )}
          {step.id === "plan" && (
            <PlanStep
              state={state}
              update={update}
              currency={defaultCurrency}
              onNext={next}
              onPrev={prev}
            />
          )}
          {step.id === "branding" && (
            <BrandingStep
              state={state}
              update={update}
              onNext={next}
              onPrev={prev}
            />
          )}
          {step.id === "confirm" && (
            <ConfirmStep
              state={state}
              update={update}
              currency={defaultCurrency}
              onPrev={prev}
              onSubmit={submit}
              isSubmitting={isPending}
              error={error}
            />
          )}
        </>
      )}
    </MultiStepForm>
  );
}
