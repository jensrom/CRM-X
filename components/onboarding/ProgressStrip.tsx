/**
 * Progress-strip til onboarding-trin
 * Viser hvor brugeren er + lader dem hoppe tilbage til tidligere trin
 */

import Link from "next/link";
import { Check } from "lucide-react";

type Step = "welcome" | "company" | "branding" | "team";

const STEPS: { id: Step; label: string; href: string }[] = [
  { id: "welcome",  label: "Velkommen",         href: "/onboarding" },
  { id: "company",  label: "Firma-stamdata",    href: "/onboarding/company" },
  { id: "branding", label: "Branding",          href: "/onboarding/branding" },
  { id: "team",     label: "Team",              href: "/onboarding/team" },
];

export function ProgressStrip({ current }: { current: Step }) {
  const currentIdx = STEPS.findIndex((s) => s.id === current);

  return (
    <nav className="mb-8">
      <ol className="flex items-center justify-between gap-2">
        {STEPS.map((step, idx) => {
          const done = idx < currentIdx;
          const isCurrent = idx === currentIdx;
          const clickable = idx <= currentIdx;

          return (
            <li key={step.id} className="flex-1 flex items-center">
              <div className="flex flex-col items-center flex-1 min-w-0">
                {clickable ? (
                  <Link href={step.href} className="flex flex-col items-center gap-1.5 group">
                    <Bubble done={done} current={isCurrent} idx={idx} />
                    <span className={`text-[11px] font-medium transition-colors ${
                      isCurrent ? "text-foreground" : "text-muted-foreground group-hover:text-foreground"
                    }`}>
                      {step.label}
                    </span>
                  </Link>
                ) : (
                  <div className="flex flex-col items-center gap-1.5">
                    <Bubble done={false} current={false} idx={idx} />
                    <span className="text-[11px] font-medium text-muted-foreground/60">{step.label}</span>
                  </div>
                )}
              </div>
              {idx < STEPS.length - 1 && (
                <div className={`flex-1 h-0.5 mx-1 transition-colors ${
                  done ? "bg-primary" : "bg-border"
                }`} />
              )}
            </li>
          );
        })}
      </ol>
    </nav>
  );
}

function Bubble({ done, current, idx }: { done: boolean; current: boolean; idx: number }) {
  return (
    <span className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-semibold transition-all ${
      done    ? "bg-emerald-500 text-white" :
      current ? "bg-primary text-primary-foreground ring-4 ring-primary/20" :
                "bg-secondary text-muted-foreground"
    }`}>
      {done ? <Check className="h-3.5 w-3.5" /> : idx + 1}
    </span>
  );
}
