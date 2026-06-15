"use client";

/**
 * ToggleUserActiveButton
 * ──────────────────────
 * Lille knap der aktiverer/deaktiverer en bruger.
 * Aktivering kan fejle pga. license-cap — vises som inline-fejl.
 */

import { useState, useTransition } from "react";
import { Power, PowerOff, Loader2 } from "lucide-react";
import { toggleUserActive } from "@/app/actions/settings";

interface Props {
  userId: string;
  isActive: boolean;
  userName: string;
  canAtCap: boolean; // Hvis license er ved cap og bruger er INAKTIV, skal aktivér-knap vises som disabled
  /** Brugerens eget id, saa vi forhindrer self-deaktivering */
  selfId?: string | null;
}

export function ToggleUserActiveButton({ userId, isActive, userName, canAtCap, selfId }: Props) {
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const isSelf = userId === selfId;

  const willActivate = !isActive;
  const disabledByCap = willActivate && canAtCap;
  const disabledBySelf = isSelf && isActive; // Ikke kunne deaktivere sig selv

  function handleClick() {
    if (pending || disabledByCap || disabledBySelf) return;
    setError(null);
    startTransition(async () => {
      try {
        await toggleUserActive(userId, willActivate);
      } catch (e: any) {
        setError(e?.message ?? "Kunne ikke skifte status.");
      }
    });
  }

  return (
    <div className="flex flex-col items-end gap-0.5">
      <button
        type="button"
        onClick={handleClick}
        disabled={pending || disabledByCap || disabledBySelf}
        title={
          disabledBySelf
            ? "Du kan ikke deaktivere dig selv"
            : disabledByCap
              ? "Ingen frie licenser — opgrader plan eller deaktiver en anden"
              : isActive
                ? `Deaktivér ${userName}`
                : `Aktivér ${userName}`
        }
        className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border text-xs font-medium transition-colors ${
          pending || disabledByCap || disabledBySelf
            ? "border-border bg-secondary/40 text-muted-foreground cursor-not-allowed opacity-60"
            : isActive
              ? "border-border bg-background hover:border-destructive/40 hover:bg-destructive/5 hover:text-destructive"
              : "border-emerald-200 bg-emerald-50 text-emerald-700 hover:bg-emerald-100"
        }`}
      >
        {pending
          ? <Loader2 className="h-3 w-3 animate-spin" />
          : isActive
            ? <PowerOff className="h-3 w-3" />
            : <Power className="h-3 w-3" />}
        {isActive ? "Deaktivér" : "Aktivér"}
      </button>
      {error && <p className="text-[10px] text-destructive max-w-[180px] text-right">{error}</p>}
    </div>
  );
}
