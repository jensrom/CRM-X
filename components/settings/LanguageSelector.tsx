"use client";

/**
 * LanguageSelector
 * ────────────────
 * Tillader brugeren at skifte UI-sprog. Saved straks naar man vaelger
 * (ingen "Gem"-knap noedvendig — instant feedback). Genindlæser siden
 * for at få den nye locale ud i alle komponenter.
 */

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Globe, Check, Loader2 } from "lucide-react";
import { LOCALES, type LocaleSlug } from "@/lib/i18n";
import { updateMyLanguage } from "@/app/actions/settings";

interface Props {
  currentLocale: LocaleSlug;
}

export function LanguageSelector({ currentLocale }: Props) {
  const router = useRouter();
  const [selected, setSelected] = useState<LocaleSlug>(currentLocale);
  const [pending, startTransition] = useTransition();
  const [savedAt, setSavedAt] = useState<number | null>(null);

  function handleSelect(slug: LocaleSlug) {
    if (slug === selected || pending) return;
    setSelected(slug);
    startTransition(async () => {
      await updateMyLanguage(slug);
      setSavedAt(Date.now());
      // Refresh saa sidebar/dashboard renderes paa ny locale med det samme
      router.refresh();
    });
  }

  return (
    <div className="bg-card border border-border rounded-xl p-5">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-sm font-semibold flex items-center gap-2">
          <Globe className="h-4 w-4 text-muted-foreground" />
          Sprog
        </h3>
        {pending && <Loader2 className="h-3.5 w-3.5 animate-spin text-muted-foreground" />}
        {savedAt && !pending && (
          <span className="text-xs text-emerald-700 flex items-center gap-1">
            <Check className="h-3 w-3" /> Gemt
          </span>
        )}
      </div>

      <p className="text-xs text-muted-foreground mb-3">
        UI-sprog kun for din bruger. Andre brugere paa kunden er upaavirket.
      </p>

      <div className="space-y-1.5">
        {LOCALES.map((l) => {
          const isActive = selected === l.slug;
          return (
            <button
              key={l.slug}
              type="button"
              onClick={() => handleSelect(l.slug)}
              disabled={pending}
              className={`w-full flex items-center justify-between px-3 py-2 rounded-lg border transition-colors text-left ${
                isActive
                  ? "bg-primary/5 border-primary/30 text-foreground"
                  : "bg-background border-border hover:border-primary/30 hover:bg-secondary/30"
              } disabled:opacity-60 disabled:cursor-not-allowed`}
            >
              <span className="flex items-center gap-2.5">
                <span className="text-base leading-none">{l.flag}</span>
                <span className="text-sm font-medium">{l.label}</span>
                <span className="text-[10px] uppercase tracking-wider text-muted-foreground font-mono">{l.slug}</span>
              </span>
              {isActive && <Check className="h-3.5 w-3.5 text-primary" />}
            </button>
          );
        })}
      </div>
    </div>
  );
}
