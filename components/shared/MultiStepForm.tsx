"use client";

import { ReactNode, useState } from "react";
import { Check } from "lucide-react";
import { cn } from "@/lib/utils";

export interface StepDefinition {
  id: string;
  label: string;
  description?: string;
  optional?: boolean;
}

interface MultiStepFormProps {
  steps: StepDefinition[];
  currentStepId: string;
  onStepChange?: (stepId: string) => void;
  children: (currentStep: StepDefinition) => ReactNode;
  className?: string;
}

/**
 * MultiStepForm — wizard-shell med synlig progress.
 *
 * Designprincipper:
 *   - Trin-indikator øverst med klart aktive/færdige/fremtidige states
 *   - "Hop tilbage" altid muligt; "hop frem" kun til allerede besøgte
 *   - Visuelt roligt — nordisk, ingen overdreven animation
 *   - Optional-trin markeres med "(valgfri)" så brugeren ved de kan skippe
 *
 * State-håndtering delegeres til parent — denne komponent er ren shell.
 */
export function MultiStepForm({
  steps,
  currentStepId,
  onStepChange,
  children,
  className,
}: MultiStepFormProps) {
  const currentIndex = steps.findIndex((s) => s.id === currentStepId);
  const currentStep = steps[currentIndex] ?? steps[0];
  const [visited, setVisited] = useState<Set<string>>(
    () => new Set(steps.slice(0, currentIndex + 1).map((s) => s.id))
  );

  function navigateTo(stepId: string) {
    const targetIdx = steps.findIndex((s) => s.id === stepId);
    if (targetIdx < 0) return;
    // Kun lov til at hoppe tilbage eller til allerede besøgt trin
    if (targetIdx <= currentIndex || visited.has(stepId)) {
      onStepChange?.(stepId);
    }
  }

  function nextStep() {
    const next = steps[currentIndex + 1];
    if (!next) return;
    setVisited((v) => new Set(v).add(next.id));
    onStepChange?.(next.id);
  }

  function prevStep() {
    const prev = steps[currentIndex - 1];
    if (!prev) return;
    onStepChange?.(prev.id);
  }

  return (
    <div className={cn("w-full", className)}>
      {/* Step-indikator */}
      <ol className="flex items-center gap-2 mb-8">
        {steps.map((step, idx) => {
          const isActive = step.id === currentStepId;
          const isComplete = idx < currentIndex;
          const isClickable = idx <= currentIndex || visited.has(step.id);

          return (
            <li key={step.id} className="flex-1 flex items-center gap-2 min-w-0">
              <button
                type="button"
                onClick={() => navigateTo(step.id)}
                disabled={!isClickable}
                className={cn(
                  "flex items-center gap-3 px-3 py-2 rounded-xl text-left transition-all flex-1 min-w-0",
                  isActive && "bg-primary/5 border border-primary/20",
                  isComplete && "hover:bg-secondary cursor-pointer",
                  !isClickable && "opacity-40 cursor-not-allowed"
                )}
              >
                <span
                  className={cn(
                    "shrink-0 w-7 h-7 rounded-full flex items-center justify-center text-xs font-semibold transition-colors",
                    isComplete && "bg-primary text-primary-foreground",
                    isActive && "bg-primary text-primary-foreground",
                    !isActive && !isComplete && "bg-secondary text-muted-foreground"
                  )}
                >
                  {isComplete ? <Check className="h-3.5 w-3.5" /> : idx + 1}
                </span>
                <span className="min-w-0">
                  <span
                    className={cn(
                      "block text-sm font-medium leading-tight truncate",
                      !isActive && !isComplete && "text-muted-foreground"
                    )}
                  >
                    {step.label}
                    {step.optional && (
                      <span className="ml-1 text-[10px] font-normal text-muted-foreground">
                        (valgfri)
                      </span>
                    )}
                  </span>
                  {step.description && (
                    <span className="block text-[11px] text-muted-foreground leading-tight truncate mt-0.5">
                      {step.description}
                    </span>
                  )}
                </span>
              </button>
              {idx < steps.length - 1 && (
                <span
                  className={cn(
                    "h-px flex-1 max-w-6 transition-colors",
                    idx < currentIndex ? "bg-primary/40" : "bg-border"
                  )}
                  aria-hidden
                />
              )}
            </li>
          );
        })}
      </ol>

      {/* Slot */}
      <div className="bg-card border border-border rounded-xl">
        {children(currentStep)}
      </div>
    </div>
  );
}

/**
 * Helper-context til at navigere fra inden i et trin.
 * Eksporteres som plain object — bruges af step-komponenter
 * der modtager `onNext`/`onPrev` som props (eksplicit prop drilling).
 */
export interface StepNavigation {
  onNext: () => void;
  onPrev: () => void;
  isFirst: boolean;
  isLast: boolean;
}
