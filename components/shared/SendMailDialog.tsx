"use client";

/**
 * SendMailDialog — generisk send-mail dialog
 * ──────────────────────────────────────────
 * Bruges af Quote og Invoice (og fremtidige resourcer).
 *
 * Tager en submit-funktion ind som prop saa parent kan binde sin egen action:
 *   <SendMailDialog onSubmit={(fd) => emailQuote(id, fd)} ... />
 *
 * UX-aftaler:
 *   • Vaelg afsender (Mig vs System) — knapper er disabled hvis ikke konfigureret
 *   • Pre-udfyldt emne + body, men brugeren kan redigere
 *   • Modtager-felt: kommasepareret hvis flere
 *   • Sender er asynkron med loading-state; viser fejl i dialogen hvis det fejler
 *   • Lukker automatisk efter succes
 */

import { useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Send, User as UserIcon, Building2, Loader2, X, AlertTriangle } from "lucide-react";

interface Props {
  triggerLabel?: string;
  triggerVariant?: "default" | "outline" | "ghost";
  defaultTo:        string;
  defaultSubject:   string;
  defaultMessage:   string;
  userMailbox: {
    provider: "microsoft" | "google";
    address:  string;
  } | null;
  systemMailbox: {
    address: string;
  } | null;
  /** Returnerer Promise — kaster ved fejl */
  onSubmit: (formData: FormData) => Promise<void>;
}

export function SendMailDialog({
  triggerLabel = "Send via mail",
  triggerVariant = "default",
  defaultTo, defaultSubject, defaultMessage,
  userMailbox, systemMailbox,
  onSubmit,
}: Props) {
  const [open, setOpen] = useState(false);
  const [via, setVia] = useState<"user" | "system">(userMailbox ? "user" : "system");
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();

  const canUseUser   = !!userMailbox;
  const canUseSystem = !!systemMailbox;
  const canSend = canUseUser || canUseSystem;

  const handleSubmit = (formData: FormData) => {
    setError(null);
    formData.set("via", via);
    start(async () => {
      try {
        await onSubmit(formData);
        setOpen(false);
      } catch (e: any) {
        setError(e?.message ?? "Ukendt fejl");
      }
    });
  };

  return (
    <>
      <Button
        type="button"
        size="sm"
        variant={triggerVariant}
        onClick={() => setOpen(true)}
        disabled={!canSend}
        title={!canSend ? "Konfigurer en mail-afsender i Indstillinger → Email" : undefined}
        className="w-full"
      >
        <Send className="h-3.5 w-3.5" />
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
                  Logges automatisk i email-historikken.
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

            <form action={handleSubmit} className="flex-1 overflow-y-auto px-6 py-5 space-y-4">
              <div>
                <label className="text-xs font-medium text-foreground mb-1.5 block">Afsender</label>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setVia("user")}
                    disabled={!canUseUser}
                    className={`text-left p-3 rounded-lg border-2 transition-all ${
                      via === "user"
                        ? "border-primary bg-primary/5"
                        : "border-border hover:border-primary/30 bg-card"
                    } ${!canUseUser ? "opacity-40 cursor-not-allowed" : ""}`}
                  >
                    <div className="flex items-center gap-2 mb-0.5">
                      <UserIcon className={`h-3.5 w-3.5 ${via === "user" ? "text-primary" : "text-muted-foreground"}`} />
                      <p className="text-sm font-semibold">Mig</p>
                    </div>
                    <p className="text-[11px] text-muted-foreground truncate">
                      {userMailbox?.address ?? "Ingen mailbox koblet"}
                    </p>
                  </button>
                  <button
                    type="button"
                    onClick={() => setVia("system")}
                    disabled={!canUseSystem}
                    className={`text-left p-3 rounded-lg border-2 transition-all ${
                      via === "system"
                        ? "border-primary bg-primary/5"
                        : "border-border hover:border-primary/30 bg-card"
                    } ${!canUseSystem ? "opacity-40 cursor-not-allowed" : ""}`}
                  >
                    <div className="flex items-center gap-2 mb-0.5">
                      <Building2 className={`h-3.5 w-3.5 ${via === "system" ? "text-primary" : "text-muted-foreground"}`} />
                      <p className="text-sm font-semibold">System-mail</p>
                    </div>
                    <p className="text-[11px] text-muted-foreground truncate">
                      {systemMailbox?.address ?? "Ikke konfigureret"}
                    </p>
                  </button>
                </div>
              </div>

              <div>
                <label className="text-xs font-medium text-foreground mb-1.5 block">Modtager</label>
                <Input name="to" type="email" defaultValue={defaultTo} required placeholder="kunde@firma.dk" />
                <p className="text-[10px] text-muted-foreground mt-1">Adskil flere modtagere med komma.</p>
              </div>

              <div>
                <label className="text-xs font-medium text-foreground mb-1.5 block">Emne</label>
                <Input name="subject" defaultValue={defaultSubject} required />
              </div>

              <div>
                <label className="text-xs font-medium text-foreground mb-1.5 block">Besked</label>
                <textarea
                  name="message"
                  rows={8}
                  defaultValue={defaultMessage}
                  required
                  className="w-full px-3 py-2 rounded-lg border border-input bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                />
              </div>

              {error && (
                <div className="bg-red-50 border border-red-200 rounded-lg px-3 py-2 flex items-start gap-2">
                  <AlertTriangle className="h-3.5 w-3.5 text-red-700 mt-0.5 shrink-0" />
                  <p className="text-xs text-red-900">{error}</p>
                </div>
              )}

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-border">
                <Button type="button" size="sm" variant="ghost" onClick={() => setOpen(false)}>
                  Annullér
                </Button>
                <Button type="submit" size="sm" disabled={pending}>
                  {pending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Send className="h-3.5 w-3.5" />}
                  Send
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
