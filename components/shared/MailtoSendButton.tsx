"use client";

/**
 * MailtoSendButton — aabner brugerens lokale mail-klient
 * ─────────────────────────────────────────────────────
 * Klik → mailto:-URL aabner Outlook (eller hvad brugerens default er) med:
 *   • Modtager pre-udfyldt
 *   • Emne pre-udfyldt
 *   • Body pre-udfyldt
 *   • Body laeses derefter i brugerens egen mail-klient hvor de kan
 *     redigere/vedhaefte/sende
 *
 * UX-aftaler:
 *   • Vi viser en dialog FOERST saa brugeren kan justere felter
 *   • Naar de klikker "Aabn i mail-klient" bygges mailto:-URL og window.location aabner det
 *   • Vi server-action logger til EmailLog (provider="mailto", status="opened")
 *     saa der er revisions-spor — vi kan ikke vide om mailen faktisk blev sendt,
 *     men vi ved at brugeren startede afsendelsen
 *
 * Begraensninger:
 *   • Body skal vaere plain text — mailto understoetter ikke HTML
 *   • Lange bodies kan ramme browser/OS-grænser (~2000 tegn er sikkert)
 *   • Ingen vedhaeftning kan tilfoejes automatisk
 */

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Mail, X, ExternalLink } from "lucide-react";
import { logMailtoOpened } from "@/app/actions/mailto-log";

interface Props {
  triggerLabel?: string;
  defaultTo:      string;
  defaultSubject: string;
  defaultMessage: string;
  /** Hvilken resource der startes mail om — bruges til EmailLog */
  resourceType?: "quote" | "invoice" | string;
  resourceId?:   string;
}

export function MailtoSendButton({
  triggerLabel = "Send via mail",
  defaultTo, defaultSubject, defaultMessage,
  resourceType, resourceId,
}: Props) {
  const [open, setOpen] = useState(false);
  const [to, setTo]           = useState(defaultTo);
  const [subject, setSubject] = useState(defaultSubject);
  const [body, setBody]       = useState(defaultMessage);

  const handleSend = () => {
    // Byg mailto:-URL — alle felter SKAL URL-encodes
    const params = new URLSearchParams();
    if (subject) params.set("subject", subject);
    if (body)    params.set("body",    body);
    const mailtoUrl = `mailto:${encodeURIComponent(to)}?${params.toString()}`;

    // Logger til EmailLog (best-effort — fail silent)
    if (resourceType && resourceId) {
      logMailtoOpened({
        to, subject, body, resourceType, resourceId,
      }).catch(() => { /* ignore */ });
    }

    // Aabn brugerens mail-klient
    window.location.href = mailtoUrl;
    setOpen(false);
  };

  return (
    <>
      <Button
        type="button"
        size="sm"
        onClick={() => setOpen(true)}
        className="w-full"
      >
        <Mail className="h-3.5 w-3.5" />
        {triggerLabel}
      </Button>

      {open && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
          onClick={() => setOpen(false)}
        >
          <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" />
          <div
            className="relative bg-card border border-border rounded-2xl shadow-2xl w-full max-w-xl max-h-[90vh] flex flex-col overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-start justify-between px-6 py-4 border-b border-border">
              <div>
                <h2 className="text-base font-semibold">{triggerLabel}</h2>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Åbner din lokale mail-klient (Outlook, Apple Mail, Gmail) med pre-udfyldt indhold.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="text-muted-foreground hover:text-foreground p-1 -mr-1 rounded-md hover:bg-secondary/50"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto px-6 py-5 space-y-4">
              <div>
                <label className="text-xs font-medium text-foreground mb-1.5 block">Modtager</label>
                <Input
                  type="email"
                  value={to}
                  onChange={(e) => setTo(e.target.value)}
                  required
                  placeholder="kunde@firma.dk"
                />
                <p className="text-[10px] text-muted-foreground mt-1">
                  Adskil flere modtagere med komma.
                </p>
              </div>

              <div>
                <label className="text-xs font-medium text-foreground mb-1.5 block">Emne</label>
                <Input
                  value={subject}
                  onChange={(e) => setSubject(e.target.value)}
                  required
                />
              </div>

              <div>
                <label className="text-xs font-medium text-foreground mb-1.5 block">Besked</label>
                <textarea
                  value={body}
                  onChange={(e) => setBody(e.target.value)}
                  rows={10}
                  required
                  className="w-full px-3 py-2 rounded-lg border border-input bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                />
                <p className="text-[10px] text-muted-foreground mt-1">
                  Indholdet sendes som almindelig tekst — du kan formattere og vedhæfte PDF i din mail-klient.
                </p>
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 px-6 py-3 border-t border-border bg-secondary/20">
              <Button type="button" size="sm" variant="ghost" onClick={() => setOpen(false)}>
                Annullér
              </Button>
              <Button type="button" size="sm" onClick={handleSend} disabled={!to || !subject}>
                <ExternalLink className="h-3.5 w-3.5" />
                Åbn i mail-klient
              </Button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
