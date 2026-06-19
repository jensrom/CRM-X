"use client";

import { useState, useTransition } from "react";
import { Copy, Check, RefreshCw, Calendar, X } from "lucide-react";

interface Props {
  feedUrl: string | null;
  webcalUrl: string | null;
  issuedAt: Date | string | null;
  onGenerate: () => Promise<void>;
  onRevoke: () => Promise<void>;
}

export function CalendarFeedManager({
  feedUrl, webcalUrl, issuedAt, onGenerate, onRevoke,
}: Props) {
  const [copied, setCopied] = useState(false);
  const [isPending, startTransition] = useTransition();
  const [confirmRevoke, setConfirmRevoke] = useState(false);

  const copy = () => {
    if (!feedUrl) return;
    navigator.clipboard.writeText(feedUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };

  if (!feedUrl) {
    return (
      <div className="bg-card border border-border rounded-xl p-5 text-center">
        <Calendar className="h-8 w-8 mx-auto mb-2 text-muted-foreground" />
        <h3 className="text-sm font-semibold mb-1">Du har ikke aktiveret feedet endnu</h3>
        <p className="text-xs text-muted-foreground mb-4">
          Generer en privat URL der kan abonneres i din kalender.
        </p>
        <button
          type="button"
          onClick={() => startTransition(() => onGenerate())}
          disabled={isPending}
          className="px-4 py-2 bg-primary text-primary-foreground rounded-md text-sm font-medium hover:bg-primary/90 disabled:opacity-50 inline-flex items-center gap-2"
        >
          <Calendar className="h-4 w-4" />
          {isPending ? "Genererer..." : "Aktivér kalender-feed"}
        </button>
      </div>
    );
  }

  return (
    <div className="bg-card border border-border rounded-xl p-5 space-y-3">
      <div>
        <label className="text-xs font-medium text-muted-foreground mb-1.5 block">
          Din private feed-URL
        </label>
        <div className="flex items-center gap-2">
          <input
            type="text"
            readOnly
            value={feedUrl}
            onClick={(e) => (e.target as HTMLInputElement).select()}
            className="flex-1 px-3 py-2 border border-border rounded-md bg-secondary/30 text-xs font-mono"
          />
          <button
            type="button"
            onClick={copy}
            className="px-3 py-2 bg-secondary hover:bg-secondary/80 rounded-md text-xs font-medium inline-flex items-center gap-1.5"
          >
            {copied ? <Check className="h-3.5 w-3.5 text-emerald-600" /> : <Copy className="h-3.5 w-3.5" />}
            {copied ? "Kopieret" : "Kopiér"}
          </button>
        </div>
        {issuedAt && (
          <p className="text-[10px] text-muted-foreground mt-1.5">
            Oprettet {new Date(issuedAt).toLocaleDateString("da-DK", { day: "2-digit", month: "short", year: "numeric" })}
          </p>
        )}
      </div>

      {/* One-click webcal for Apple Calendar */}
      {webcalUrl && (
        <a
          href={webcalUrl}
          className="block text-center py-2 bg-primary/10 text-primary rounded-md text-sm font-medium hover:bg-primary/20 inline-flex items-center justify-center gap-2 w-full"
        >
          <Calendar className="h-3.5 w-3.5" />
          Abonnér direkte (Apple Calendar / kompatible)
        </a>
      )}

      {/* Reset / Revoke */}
      <div className="flex items-center justify-between pt-3 border-t border-border">
        <button
          type="button"
          onClick={() => startTransition(() => onGenerate())}
          disabled={isPending}
          className="text-xs text-muted-foreground hover:text-foreground inline-flex items-center gap-1.5 disabled:opacity-50"
        >
          <RefreshCw className="h-3 w-3" />
          Reset URL (gammel holder op med at virke)
        </button>
        {!confirmRevoke ? (
          <button
            type="button"
            onClick={() => setConfirmRevoke(true)}
            className="text-xs text-destructive hover:underline inline-flex items-center gap-1.5"
          >
            <X className="h-3 w-3" />
            Deaktivér
          </button>
        ) : (
          <div className="inline-flex items-center gap-2">
            <span className="text-xs text-muted-foreground">Sikker?</span>
            <button
              type="button"
              onClick={() => setConfirmRevoke(false)}
              className="text-xs hover:bg-secondary px-2 py-0.5 rounded"
            >
              Annullér
            </button>
            <button
              type="button"
              onClick={() => startTransition(() => onRevoke())}
              disabled={isPending}
              className="text-xs bg-destructive text-destructive-foreground px-2 py-0.5 rounded hover:opacity-90 disabled:opacity-50"
            >
              Ja, deaktivér
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
