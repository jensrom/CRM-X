"use client";

/**
 * Lille knap der opretter et tilbud fra dealets DealProducts og
 * navigerer brugeren direkte ind på det nye tilbud.
 *
 * Vises kun naar dealet har produkter — ellers ville tilbuddet vaere tomt.
 */

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { FileSignature, Loader2 } from "lucide-react";
import { createQuoteFromDeal } from "@/app/actions/quotes";

export function GenerateQuoteButton({
  dealId,
  hasExistingQuote,
}: {
  dealId: string;
  hasExistingQuote: boolean;
}) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const handleClick = () => {
    setError(null);
    start(async () => {
      try {
        const quoteId = await createQuoteFromDeal(dealId);
        router.push(`/quotes/${quoteId}?from=${encodeURIComponent(`/pipeline/${dealId}`)}`);
      } catch (e: any) {
        setError(e?.message ?? "Kunne ikke generere tilbud");
      }
    });
  };

  return (
    <div className="flex flex-col items-end gap-1">
      <Button
        type="button"
        size="sm"
        variant={hasExistingQuote ? "ghost" : "outline"}
        onClick={handleClick}
        disabled={pending}
      >
        {pending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <FileSignature className="h-3.5 w-3.5" />}
        {hasExistingQuote ? "Generér nyt tilbud" : "Generér tilbud"}
      </Button>
      {error && <p className="text-xs text-red-600">{error}</p>}
    </div>
  );
}
