"use client";

/**
 * PreviewDialog — generisk centreret modal
 * ─────────────────────────────────────────
 * Bruges paa kunde-tabs (faktura/projekt/ticket/klippekort/tilbud) saa man
 * kan se en detalje uden at navigere vaek fra kunden.
 *
 * UX-aftaler:
 *   • Klik paa trigger → modal aabner
 *   • Escape, X-knap, eller backdrop-klik → modal lukker
 *   • Body scroll-lock saa siden ikke kan scrolle bagved
 *   • Eksplicit "Aabn fuldt"-link i footer for at navigere helt vaek
 *
 * Bevidst: vi gemmer IKKE modal-state i URL'en. Det betyder:
 *   • Browser-back-knap goer ikke noget naar modal er aabent
 *   • Refresh lukker modal (men du forbliver paa kunden)
 *   • Ingen back-button-gaet-spil
 */

import { useEffect, useState, type ReactNode } from "react";
import { X, ExternalLink } from "lucide-react";

interface Props {
  trigger: ReactNode;
  title: string;
  subtitle?: string;
  /** Path til den fulde detalje-side — vises som "Aabn fuldt"-link */
  openFullHref?: string;
  /** Indhold i modal-body */
  children: ReactNode;
  /** Ekstra knapper/handlinger i footer */
  footerActions?: ReactNode;
}

export function PreviewDialog({
  trigger, title, subtitle, openFullHref, children, footerActions,
}: Props) {
  const [open, setOpen] = useState(false);

  // Escape lukker
  useEffect(() => {
    if (!open) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [open]);

  // Body scroll-lock naar modal er aabent
  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => { document.body.style.overflow = prev; };
  }, [open]);

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="w-full text-left"
      >
        {trigger}
      </button>

      {open && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="preview-dialog-title"
          className="fixed inset-0 z-50 flex items-center justify-center p-4 animate-in fade-in duration-150"
          onClick={() => setOpen(false)}
        >
          {/* Backdrop */}
          <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" />

          {/* Modal */}
          <div
            className="relative bg-card border border-border rounded-2xl shadow-2xl w-full max-w-2xl max-h-[85vh] flex flex-col overflow-hidden animate-in zoom-in-95 duration-150"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="flex items-start justify-between px-6 py-4 border-b border-border">
              <div className="min-w-0">
                <h2 id="preview-dialog-title" className="text-base font-semibold truncate">
                  {title}
                </h2>
                {subtitle && (
                  <p className="text-xs text-muted-foreground mt-0.5 truncate">{subtitle}</p>
                )}
              </div>
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="text-muted-foreground hover:text-foreground transition-colors p-1 -mr-1 rounded-md hover:bg-secondary/50"
                aria-label="Luk"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            {/* Body */}
            <div className="flex-1 overflow-y-auto px-6 py-5">
              {children}
            </div>

            {/* Footer */}
            <div className="flex items-center justify-between gap-2 px-6 py-3 border-t border-border bg-secondary/20">
              <div className="flex items-center gap-2">
                {footerActions}
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setOpen(false)}
                  className="text-sm text-muted-foreground hover:text-foreground transition-colors px-3 py-1.5 rounded-md hover:bg-secondary/50"
                >
                  Luk
                </button>
                {openFullHref && (
                  <a
                    href={openFullHref}
                    className="inline-flex items-center gap-1.5 text-sm font-medium text-primary hover:text-primary/80 transition-colors px-3 py-1.5 rounded-md hover:bg-primary/5"
                  >
                    Åbn fuldt
                    <ExternalLink className="h-3.5 w-3.5" />
                  </a>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
