"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { useMemo } from "react";

interface BackButtonProps {
  href?: string;
  label?: string;
}

// BackButton med "husk hvor jeg kom fra"-logik.
// Laeser ?from= searchParam foerst. Hvis sat, navigeres dertil.
// Hvis ikke, falder tilbage til href-prop'en eller router.back().
// Sikkerhed: kun relative paths (start med /) accepteres.

export function BackButton({ href, label = "Tilbage" }: BackButtonProps) {
  const router = useRouter();
  const searchParams = useSearchParams();

  const { target, displayLabel } = useMemo(() => {
    const from = searchParams.get("from");
    if (from && from.startsWith("/") && !from.startsWith("//")) {
      const fromLabel = labelFromPath(from);
      return { target: from, displayLabel: fromLabel ?? label };
    }
    return { target: href, displayLabel: label };
  }, [searchParams, href, label]);

  return (
    <button
      onClick={() => (target ? router.push(target) : router.back())}
      className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors group mb-4"
    >
      <ArrowLeft className="h-4 w-4 transition-transform group-hover:-translate-x-0.5" />
      {displayLabel}
    </button>
  );
}

function labelFromPath(path: string): string | null {
  const pathOnly = path.split("?")[0];
  if (pathOnly.startsWith("/companies/")) return "Kunde";
  if (pathOnly === "/companies")          return "Kunder";
  if (pathOnly.startsWith("/pipeline/"))  return "Deal";
  if (pathOnly === "/pipeline")           return "Pipeline";
  if (pathOnly.startsWith("/projects/"))  return "Projekt";
  if (pathOnly === "/projects")           return "Projekter";
  if (pathOnly.startsWith("/leads/"))     return "Lead";
  if (pathOnly === "/leads")              return "Leads";
  if (pathOnly.startsWith("/contacts/"))  return "Kontakt";
  if (pathOnly === "/contacts")           return "Kontakter";
  if (pathOnly.startsWith("/support/tickets/")) return "Ticket";
  return null;
}
