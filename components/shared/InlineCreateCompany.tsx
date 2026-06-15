"use client";

/**
 * InlineCreateCompany
 * ───────────────────
 * Modal-form til at oprette en kunde uden at forlade det aktuelle flow.
 * Bruges typisk fra:
 *   • Lead-konvertering når kunden ikke findes endnu
 *   • Pipeline → "Opret deal" når kunden ikke findes
 *   • Tilbud-bygger osv.
 *
 * Returnerer { id, name } via onCreated-callback så det kaldende flow
 * straks kan tilknytte den nye kunde.
 *
 * Minimum-form: navn er eneste påkrævede felt — sælgeren kan fylde resten
 * ud senere på kundens detalje-side. Det giver hurtigt "lige opret og videre"-
 * flow uden friktion.
 */

import { useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { Building2, X, Loader2, Plus } from "lucide-react";
import { createCompanyInline } from "@/app/actions/companies";

interface Props {
  /** Forudfyldt navn (fx fra søgetekst eller lead) */
  initialName?: string;
  /** Forudfyldt e-mail */
  initialEmail?: string;
  /** Forudfyldt telefon */
  initialPhone?: string;
  /** Knaplabel — default "Opret ny kunde" */
  triggerLabel?: string;
  /** Trigger-knapvariant */
  triggerVariant?: "default" | "ghost" | "outline";
  /** Callback når kunden er oprettet — kalderen kan så navigere/tilknytte */
  onCreated?: (company: { id: string; name: string }) => void;
}

export function InlineCreateCompany({
  initialName = "",
  initialEmail = "",
  initialPhone = "",
  triggerLabel = "Opret ny kunde",
  triggerVariant = "outline",
  onCreated,
}: Props) {
  const [open, setOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function handleSubmit(formData: FormData) {
    setError(null);
    startTransition(async () => {
      try {
        const result = await createCompanyInline(formData);
        setOpen(false);
        onCreated?.(result);
      } catch (e: any) {
        setError(e?.message ?? "Kunne ikke oprette kunden. Prøv igen.");
      }
    });
  }

  return (
    <>
      <Button
        type="button"
        size="sm"
        variant={triggerVariant}
        onClick={() => setOpen(true)}
      >
        <Plus className="h-3.5 w-3.5" /> {triggerLabel}
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
              <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
                <Building2 className="h-5 w-5 text-primary" />
              </div>
              <div className="flex-1">
                <h2 className="font-semibold">Opret ny kunde</h2>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Kun navn er påkrævet — resten kan udfyldes senere.
                </p>
              </div>
              <button
                type="button"
                onClick={() => !pending && setOpen(false)}
                className="text-muted-foreground hover:text-foreground p-1"
                disabled={pending}
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <form action={handleSubmit} className="space-y-3">
              <div className="space-y-1">
                <label className="text-xs font-medium text-foreground">
                  Kundenavn <span className="text-destructive">*</span>
                </label>
                <input
                  name="name"
                  required
                  autoFocus
                  defaultValue={initialName}
                  placeholder="fx Aalborg Tagdækning I/S"
                  className="w-full px-3 py-2 rounded-lg border border-input bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-xs font-medium text-foreground">CVR</label>
                  <input
                    name="orgNumber"
                    placeholder="12345678"
                    className="w-full px-3 py-2 rounded-lg border border-input bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-medium text-foreground">Telefon</label>
                  <input
                    name="phone"
                    defaultValue={initialPhone}
                    placeholder="+45 ..."
                    className="w-full px-3 py-2 rounded-lg border border-input bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                  />
                </div>
              </div>
              <div className="space-y-1">
                <label className="text-xs font-medium text-foreground">E-mail</label>
                <input
                  name="email"
                  type="email"
                  defaultValue={initialEmail}
                  placeholder="kontakt@..."
                  className="w-full px-3 py-2 rounded-lg border border-input bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                />
              </div>

              {error && (
                <div className="rounded-lg bg-destructive/10 border border-destructive/20 px-3 py-2">
                  <p className="text-sm text-destructive">{error}</p>
                </div>
              )}

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-border">
                <Button type="button" variant="ghost" size="sm" onClick={() => setOpen(false)} disabled={pending}>
                  Annullér
                </Button>
                <Button type="submit" size="sm" disabled={pending}>
                  {pending ? <><Loader2 className="h-3.5 w-3.5 animate-spin" /> Opretter…</> : <><Plus className="h-3.5 w-3.5" /> Opret kunde</>}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
