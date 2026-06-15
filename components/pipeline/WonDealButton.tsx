"use client";

/**
 * WonDealButton
 * ─────────────
 * Markér deal som Vundet → generér faktura + tilkobl produkter på kunden.
 *
 * Flow:
 *   1. Klik åbner bekræftelses-modal med oversigt over hvad der sker
 *   2. Brugeren bekræfter → server-action kører
 *   3. Ved succes redirectes til den nye faktura
 *   4. Ved fejl (fx ingen produkter) vises fejlbesked i modalen
 *
 * UI'en er tydeligt grøn for at signalere positiv handling — men kræver
 * eksplicit bekræftelse fordi handlingen påvirker faktura + kundens produkter.
 */

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Check, X, AlertTriangle, Trophy, Loader2 } from "lucide-react";
import { markDealAsWon } from "@/app/actions/deals";

interface Props {
  dealId: string;
  productCount: number;
  hasInvoice: boolean;
  dealTitle: string;
  companyName: string;
}

export function WonDealButton({ dealId, productCount, hasInvoice, dealTitle, companyName }: Props) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const canProceed = productCount > 0 && !hasInvoice;

  function handleConfirm() {
    setError(null);
    startTransition(async () => {
      try {
        const result = await markDealAsWon(dealId);
        setOpen(false);
        router.push(`/invoices/${result.invoiceId}`);
      } catch (e: any) {
        setError(e?.message ?? "Noget gik galt. Prøv igen.");
      }
    });
  }

  return (
    <>
      <Button
        size="sm"
        onClick={() => setOpen(true)}
        className="bg-emerald-600 hover:bg-emerald-700 text-white"
      >
        <Trophy className="h-3.5 w-3.5" /> Markér som Vundet
      </Button>

      {open && (
        <div
          className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4"
          onClick={() => !pending && setOpen(false)}
        >
          <div
            className="bg-card border border-border rounded-xl shadow-xl max-w-md w-full p-6"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-start gap-3 mb-4">
              <div className="w-10 h-10 rounded-xl bg-emerald-500/10 flex items-center justify-center shrink-0">
                <Trophy className="h-5 w-5 text-emerald-600" />
              </div>
              <div className="flex-1">
                <h2 className="font-semibold">Markér deal som Vundet</h2>
                <p className="text-xs text-muted-foreground mt-0.5">
                  {dealTitle} — {companyName}
                </p>
              </div>
              <button
                onClick={() => !pending && setOpen(false)}
                className="text-muted-foreground hover:text-foreground p-1"
                disabled={pending}
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            {!canProceed ? (
              <div className="rounded-lg bg-amber-50 border border-amber-200 px-3 py-3 mb-4">
                <div className="flex items-start gap-2">
                  <AlertTriangle className="h-4 w-4 text-amber-700 shrink-0 mt-0.5" />
                  <div className="text-sm text-amber-900">
                    {productCount === 0 && <p>Tilføj mindst ét produkt til dealen før den kan markeres som Vundet.</p>}
                    {hasInvoice && <p>Der findes allerede en faktura på dette deal — åbn den eksisterende.</p>}
                  </div>
                </div>
              </div>
            ) : (
              <div className="space-y-3 mb-4">
                <p className="text-sm text-muted-foreground">
                  Følgende sker automatisk når du bekræfter:
                </p>
                <ul className="space-y-2 text-sm">
                  <li className="flex items-start gap-2">
                    <Check className="h-3.5 w-3.5 text-emerald-600 mt-0.5 shrink-0" />
                    <span>Deal-stage sættes til <strong>Vundet</strong></span>
                  </li>
                  <li className="flex items-start gap-2">
                    <Check className="h-3.5 w-3.5 text-emerald-600 mt-0.5 shrink-0" />
                    <span>
                      Ny <strong>kladde-faktura</strong> genereres med {productCount} produkt{productCount > 1 ? "linjer" : "linje"}
                    </span>
                  </li>
                  <li className="flex items-start gap-2">
                    <Check className="h-3.5 w-3.5 text-emerald-600 mt-0.5 shrink-0" />
                    <span>Produkterne tilkobles automatisk <strong>{companyName}</strong></span>
                  </li>
                  <li className="flex items-start gap-2">
                    <Check className="h-3.5 w-3.5 text-emerald-600 mt-0.5 shrink-0" />
                    <span>Du sendes til fakturaen så du kan tjekke + sende</span>
                  </li>
                </ul>
              </div>
            )}

            {error && (
              <div className="rounded-lg bg-destructive/10 border border-destructive/20 px-3 py-2 mb-3">
                <p className="text-sm text-destructive">{error}</p>
              </div>
            )}

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-border">
              <Button variant="ghost" size="sm" onClick={() => setOpen(false)} disabled={pending}>
                Annullér
              </Button>
              {canProceed && (
                <Button
                  size="sm"
                  onClick={handleConfirm}
                  disabled={pending}
                  className="bg-emerald-600 hover:bg-emerald-700 text-white"
                >
                  {pending ? <><Loader2 className="h-3.5 w-3.5 animate-spin" /> Genererer…</> : <><Trophy className="h-3.5 w-3.5" /> Ja, markér som Vundet</>}
                </Button>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
}
