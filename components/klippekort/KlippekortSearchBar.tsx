"use client";

/**
 * KlippekortSearchBar
 * ───────────────────
 * Søgefelt der filtrerer klippekort-listen paa kunde-navn ELLER projekt-navn.
 *
 * UX:
 *   • Tomt felt + Enter → ryd filter (vis alle)
 *   • Tekst + Enter → naviger til /klippekort?q=<text>
 *   • Klar-knappen viser en X til hurtig nulstilling naar der er aktivt filter
 *
 * Bruger server-side filter via searchParams (?q=) saa resultatet er
 * delelig som URL og overlever sideopdateringer.
 */

import { useState, useRef, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Search, X } from "lucide-react";

export function KlippekortSearchBar() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const currentQuery = searchParams.get("q") ?? "";

  const [text, setText] = useState<string>(currentQuery);
  const inputRef = useRef<HTMLInputElement>(null);

  // Synkronisér intern state hvis URL skifter (fx via Tilbage-knap)
  useEffect(() => {
    setText(currentQuery);
  }, [currentQuery]);

  function submit(value: string) {
    const trimmed = value.trim();
    if (trimmed) {
      router.push(`/klippekort?q=${encodeURIComponent(trimmed)}`);
    } else {
      router.push("/klippekort");
    }
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === "Enter") {
      e.preventDefault();
      submit(text);
    }
    if (e.key === "Escape") {
      setText("");
      submit("");
    }
  }

  function clearFilter() {
    setText("");
    submit("");
    inputRef.current?.focus();
  }

  return (
    <div className="relative max-w-md">
      <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
      <input
        ref={inputRef}
        type="text"
        value={text}
        onChange={(e) => setText(e.target.value)}
        onKeyDown={handleKeyDown}
        placeholder="Søg paa kunde eller projekt og tryk Enter…"
        className="w-full pl-9 pr-9 py-2 rounded-lg border border-input bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring"
        aria-label="Søg klippekort"
      />
      {currentQuery && (
        <button
          type="button"
          onClick={clearFilter}
          className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground p-1 rounded transition-colors"
          aria-label="Ryd filter"
          title="Ryd filter (Esc)"
        >
          <X className="h-3.5 w-3.5" />
        </button>
      )}
    </div>
  );
}
