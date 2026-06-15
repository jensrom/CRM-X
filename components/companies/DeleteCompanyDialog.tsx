"use client";

/**
 * DeleteCompanyDialog
 * ───────────────────
 * Sletter en kunde med tydelig friktion mod fejlklik:
 *   • Bekræftelses-modal
 *   • Brugeren skal selv skrive kundens navn for at bekræfte
 *   • Soft-delete (isActive: false) — data bevares 30 dage for revert
 *
 * Sletning fjerner kunden fra alle aktive views, men relaterede ressourcer
 * (tickets, projekter, klippekort, fakturaer) bevarer deres reference og
 * vises stadig på de respektive deres lister. Bruger advares hvis kunden
 * har aktive projekter/tickets — disse skal lukkes manuelt først.
 */

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Trash2, X, AlertTriangle, Loader2 } from "lucide-react";
import { deleteCompany } from "@/app/actions/companies";

interface Props {
  companyId: string;
  companyName: string;
  /** Antal åbne tickets/aktive projekter — vises som advarsel */
  openTicketsCount?: number;
  activeProjectsCount?: number;
}

export function DeleteCompanyDialog({
  companyId, companyName, openTicketsCount = 0, activeProjectsCount = 0,
}: Props) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [confirmText, setConfirmText] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const isMatch = confirmText.trim().toLowerCase() === companyName.trim().toLowerCase();
  const hasOpenWork = openTicketsCount > 0 || activeProjectsCount > 0;

  function handleConfirm() {
    if (!isMatch) return;
    setError(null);
    startTransition(async () => {
      try {
        await deleteCompany(companyId);
        // deleteCompany redirecter til /companies — vi når aldrig hertil
      } catch (e: any) {
        setError(e?.message ?? "Kunne ikke slette. Prøv igen.");
      }
    });
  }

  return (
    <>
      <Button
        variant="ghost"
        size="sm"
        onClick={() => setOpen(true)}
        className="text-destructive hover:bg-destructive/10 hover:text-destructive"
      >
        <Trash2 className="h-3.5 w-3.5" /> Slet
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
              <div className="w-10 h-10 rounded-xl bg-destructive/10 flex items-center justify-center shrink-0">
                <Trash2 className="h-5 w-5 text-destructive" />
              </div>
              <div className="flex-1">
                <h2 className="font-semibold">Slet kunde</h2>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Denne handling kan fortrydes inden for 30 dage.
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

            {hasOpenWork && (
              <div className="rounded-lg bg-amber-50 border border-amber-200 px-3 py-2.5 mb-4">
                <div className="flex items-start gap-2">
                  <AlertTriangle className="h-4 w-4 text-amber-700 shrink-0 mt-0.5" />
                  <div className="text-sm text-amber-900">
                    <p className="font-medium mb-0.5">Kunden har åbent arbejde</p>
                    <ul className="text-xs space-y-0.5">
                      {openTicketsCount > 0 && <li>{openTicketsCount} åbn{openTicketsCount === 1 ? " ticket" : "e tickets"}</li>}
                      {activeProjectsCount > 0 && <li>{activeProjectsCount} aktiv{activeProjectsCount === 1 ? "t projekt" : "e projekter"}</li>}
                    </ul>
                    <p className="text-xs mt-1 text-amber-700/80">Overvej at afslutte dem først.</p>
                  </div>
                </div>
              </div>
            )}

            <div className="space-y-3 mb-4">
              <p className="text-sm text-muted-foreground">
                Skriv kundens navn for at bekræfte sletning:
              </p>
              <div className="rounded-lg bg-secondary/40 border border-border px-3 py-2 font-mono text-sm">
                {companyName}
              </div>
              <input
                type="text"
                value={confirmText}
                onChange={(e) => setConfirmText(e.target.value)}
                placeholder="Skriv navnet her…"
                autoFocus
                className="w-full px-3 py-2 rounded-lg border border-input bg-background text-sm focus:outline-none focus:ring-2 focus:ring-destructive font-mono"
              />
            </div>

            {error && (
              <div className="rounded-lg bg-destructive/10 border border-destructive/20 px-3 py-2 mb-3">
                <p className="text-sm text-destructive">{error}</p>
              </div>
            )}

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-border">
              <Button variant="ghost" size="sm" onClick={() => setOpen(false)} disabled={pending}>
                Annullér
              </Button>
              <Button
                size="sm"
                onClick={handleConfirm}
                disabled={!isMatch || pending}
                className="bg-destructive hover:bg-destructive/90 text-white"
              >
                {pending
                  ? <><Loader2 className="h-3.5 w-3.5 animate-spin" /> Sletter…</>
                  : <><Trash2 className="h-3.5 w-3.5" /> Ja, slet kunde</>}
              </Button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
