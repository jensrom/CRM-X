"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { useMemo, useEffect, useState } from "react";

interface BackButtonProps {
  href?: string;
  label?: string;
}

// BackButton med "husk hvor jeg kom fra"-logik.
// Praeference-rækkefoelge:
//   1) ?from= searchParam (eksplicit besked om hvor man kom fra)
//   2) document.referrer (samme origin, ikke same path)
//   3) href-prop (default-mål for siden)
//   4) router.back() som sidste udvej

export function BackButton({ href, label = "Tilbage" }: BackButtonProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [referrer, setReferrer] = useState<string | null>(null);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const ref = document.referrer;
    if (!ref) return;
    try {
      const refUrl = new URL(ref);
      if (refUrl.origin === window.location.origin && refUrl.pathname !== window.location.pathname) {
        setReferrer(refUrl.pathname + refUrl.search);
      }
    } catch {
      // Ignorer ugyldige referrers
    }
  }, []);

  const { target, displayLabel } = useMemo(() => {
    const from = searchParams.get("from");
    if (from && from.startsWith("/") && !from.startsWith("//")) {
      const fromLabel = labelFromPath(from);
      return { target: from, displayLabel: fromLabel ?? label };
    }
    if (referrer && referrer.startsWith("/") && !referrer.startsWith("//")) {
      const refLabel = labelFromPath(referrer);
      if (refLabel) {
        return { target: referrer, displayLabel: refLabel };
      }
    }
    return { target: href, displayLabel: label };
  }, [searchParams, referrer, href, label]);

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
  if (pathOnly.startsWith("/kunder/")) return "Kunde";
  if (pathOnly === "/kunder")          return "Kunder";
  if (pathOnly.startsWith("/pipeline/"))  return "Deal";
  if (pathOnly === "/pipeline")           return "Pipeline";
  if (pathOnly.startsWith("/projects/"))  return "Projekt";
  if (pathOnly === "/projects")           return "Projekter";
  if (pathOnly.startsWith("/leads/"))     return "Lead";
  if (pathOnly === "/leads")              return "Leads";
  if (pathOnly.startsWith("/contacts/"))  return "Kontakt";
  if (pathOnly === "/contacts")           return "Kontakter";
  if (pathOnly.startsWith("/support/tickets/")) return "Ticket";
  if (pathOnly === "/support/tickets")    return "Tickets";
  if (pathOnly.startsWith("/klippekort/"))return "Klippekort";
  if (pathOnly === "/klippekort")         return "Klippekort";
  if (pathOnly.startsWith("/invoices/"))  return "Faktura";
  if (pathOnly === "/invoices")           return "Fakturaer";
  return null;
}
