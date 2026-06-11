"use client";

import { useState, useRef, useEffect } from "react";
import { Lock, Pencil, X, Check } from "lucide-react";
import { cn } from "@/lib/utils";

interface LockedFieldProps {
  name: string;
  label: string;
  defaultValue: string;
  placeholder?: string;
  /** Om brugeren har lov til at låse op (typisk admin-only) */
  canEdit: boolean;
  /** Tekst på "Rediger"-knappen */
  unlockLabel?: string;
  /** Hjælpetekst der vises når feltet er låst */
  lockedHint?: string;
  /** Tooltip når canEdit er false */
  noPermissionHint?: string;
}

/**
 * Et tekstfelt der er låst per default — kræver eksplicit klik på
 * "Rediger" før det kan ændres. Bruges på følsomme felter som navn på
 * klippekort, fakturanummer-prefix, mv. hvor utilsigtet redigering
 * skal forhindres.
 *
 * Når låst:  vises som disabled input + lås-ikon + "Rediger"-knap (hvis canEdit)
 * Når låst op: redigerbart input + "Annuller"-knap der gendanner original værdi
 *
 * Submit af form sender altid den nuværende værdi via det skjulte input
 * (hvad enten det er originalen eller den redigerede version).
 */
export function LockedField({
  name,
  label,
  defaultValue,
  placeholder,
  canEdit,
  unlockLabel = "Rediger",
  lockedHint = "Kræver klik på Rediger-knappen for at ændre",
  noPermissionHint = "Kun administrator kan ændre dette felt",
}: LockedFieldProps) {
  const [unlocked, setUnlocked] = useState(false);
  const [value, setValue] = useState(defaultValue);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (unlocked) {
      inputRef.current?.focus();
      inputRef.current?.select();
    }
  }, [unlocked]);

  function cancel() {
    setValue(defaultValue);
    setUnlocked(false);
  }

  return (
    <div className="space-y-1.5">
      <label className="block text-sm font-medium text-foreground">{label}</label>
      <div className="flex gap-2">
        <div className="relative flex-1">
          <input
            ref={inputRef}
            type="text"
            name={name}
            value={value}
            onChange={(e) => setValue(e.target.value)}
            placeholder={placeholder}
            disabled={!unlocked}
            className={cn(
              "w-full px-3 py-2 pr-9 rounded-lg border text-sm transition-colors",
              "focus:outline-none focus:ring-2 focus:ring-ring",
              unlocked
                ? "bg-background border-input"
                : "bg-secondary/50 border-border text-foreground cursor-not-allowed"
            )}
          />
          {!unlocked && (
            <Lock className="absolute right-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground/70" />
          )}
        </div>
        {!unlocked ? (
          canEdit ? (
            <button
              type="button"
              onClick={() => setUnlocked(true)}
              className="px-3 py-2 rounded-lg border border-border bg-background text-xs font-medium hover:bg-secondary transition-colors flex items-center gap-1.5 shrink-0"
            >
              <Pencil className="h-3 w-3" />
              {unlockLabel}
            </button>
          ) : (
            <span
              title={noPermissionHint}
              className="px-3 py-2 rounded-lg border border-border bg-secondary/30 text-xs text-muted-foreground/60 flex items-center gap-1.5 shrink-0 cursor-not-allowed"
            >
              <Lock className="h-3 w-3" />
              Låst
            </span>
          )
        ) : (
          <button
            type="button"
            onClick={cancel}
            className="px-3 py-2 rounded-lg border border-border bg-background text-xs font-medium hover:bg-secondary transition-colors flex items-center gap-1.5 shrink-0"
          >
            <X className="h-3 w-3" />
            Annuller
          </button>
        )}
      </div>
      <p className="text-[11px] text-muted-foreground">
        {unlocked ? (
          <span className="text-amber-600 flex items-center gap-1">
            <Check className="h-3 w-3" />
            Feltet er åbnet for redigering — gem ændringen for at låse igen
          </span>
        ) : canEdit ? (
          lockedHint
        ) : (
          noPermissionHint
        )}
      </p>
    </div>
  );
}
