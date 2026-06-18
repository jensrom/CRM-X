"use client";

/**
 * GlobalSearch — ⌘K / Ctrl+K aabner modal med tværgaaende søg
 * ──────────────────────────────────────────────────────────
 * UX-aftaler:
 *   • ⌘K (Mac) / Ctrl+K (Win) aabner modal
 *   • Escape lukker
 *   • Pile-op/ned navigerer mellem resultater
 *   • Enter aabner den fokuserede
 *   • Debounced fetch (200ms) saa vi ikke spammer server
 *   • Resultater grupperet efter type med ikon
 *   • Tom-tilstand viser hjaelpetekst og keybinding-hints
 */

import { useState, useEffect, useRef, useTransition, useMemo } from "react";
import { useRouter } from "next/navigation";
import {
  Search, X, Building2, User, FileSignature, Receipt,
  FolderKanban, Ticket as TicketIcon, Scissors, Loader2,
} from "lucide-react";
import { globalSearch, type SearchResult } from "@/app/actions/search";

const TYPE_ICON: Record<SearchResult["type"], any> = {
  company:  Building2,
  contact:  User,
  quote:    FileSignature,
  invoice:  Receipt,
  project:  FolderKanban,
  ticket:   TicketIcon,
  bundle:   Scissors,
};

const TYPE_LABEL: Record<SearchResult["type"], string> = {
  company:  "Kunde",
  contact:  "Kontakt",
  quote:    "Tilbud",
  invoice:  "Faktura",
  project:  "Projekt",
  ticket:   "Ticket",
  bundle:   "Klippekort",
};

const TYPE_COLOR: Record<SearchResult["type"], string> = {
  company:  "text-primary bg-primary/10",
  contact:  "text-blue-600 bg-blue-500/10",
  quote:    "text-violet-600 bg-violet-500/10",
  invoice:  "text-emerald-600 bg-emerald-500/10",
  project:  "text-amber-600 bg-amber-500/10",
  ticket:   "text-rose-600 bg-rose-500/10",
  bundle:   "text-slate-600 bg-slate-500/10",
};

export function GlobalSearch() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SearchResult[]>([]);
  const [focused, setFocused] = useState(0);
  const [pending, start] = useTransition();
  const inputRef = useRef<HTMLInputElement>(null);
  const isMacRef = useRef<boolean>(false);

  // Detekter Mac for korrekt keybinding
  useEffect(() => {
    isMacRef.current = navigator.platform.toUpperCase().includes("MAC");
  }, []);

  // ⌘K / Ctrl+K listener
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault();
        setOpen(true);
      }
      if (e.key === "Escape" && open) {
        setOpen(false);
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [open]);

  // Body-scroll-lock + autofocus
  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    setTimeout(() => inputRef.current?.focus(), 50);
    return () => { document.body.style.overflow = prev; };
  }, [open]);

  // Reset state naar dialog lukker
  useEffect(() => {
    if (!open) {
      setQuery("");
      setResults([]);
      setFocused(0);
    }
  }, [open]);

  // Debounced fetch
  useEffect(() => {
    if (!open) return;
    if (query.length < 1) {
      setResults([]);
      return;
    }
    const timeout = setTimeout(() => {
      start(async () => {
        try {
          const fresh = await globalSearch(query);
          setResults(fresh);
          setFocused(0);
        } catch {}
      });
    }, 200);
    return () => clearTimeout(timeout);
  }, [query, open]);

  // Pile-navigation
  const handleKey = (e: React.KeyboardEvent) => {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setFocused((i) => Math.min(i + 1, results.length - 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setFocused((i) => Math.max(i - 1, 0));
    } else if (e.key === "Enter" && results[focused]) {
      e.preventDefault();
      router.push(results[focused].href);
      setOpen(false);
    }
  };

  // Grupper resultater efter type
  const grouped = useMemo(() => {
    const groups = new Map<SearchResult["type"], SearchResult[]>();
    for (const r of results) {
      if (!groups.has(r.type)) groups.set(r.type, []);
      groups.get(r.type)!.push(r);
    }
    return Array.from(groups.entries());
  }, [results]);

  // Build flat index for focused-tracking
  const flatResults = useMemo(() => {
    const flat: { result: SearchResult; index: number }[] = [];
    let i = 0;
    for (const [, arr] of grouped) {
      for (const r of arr) {
        flat.push({ result: r, index: i++ });
      }
    }
    return flat;
  }, [grouped]);

  return (
    <>
      {/* Søg-knap i topbar */}
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="flex items-center gap-2 px-2 sm:px-3 py-1.5 rounded-lg border border-border bg-secondary/50 text-muted-foreground text-sm hover:bg-secondary transition-colors"
        aria-label="Globalsøgning"
      >
        <Search className="h-4 w-4" />
        <span className="hidden sm:inline">Søg...</span>
        <kbd className="hidden md:inline text-[10px] px-1.5 py-0.5 rounded bg-muted border border-border font-mono">
          {isMacRef.current ? "⌘K" : "Ctrl+K"}
        </kbd>
      </button>

      {/* Modal */}
      {open && (
        <div
          className="fixed inset-0 z-50 flex items-start justify-center p-4 pt-[10vh]"
          onClick={() => setOpen(false)}
        >
          <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" />
          <div
            className="relative bg-card border border-border rounded-2xl shadow-2xl w-full max-w-xl max-h-[70vh] flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-150"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Input */}
            <div className="flex items-center gap-3 px-4 py-3 border-b border-border">
              <Search className="h-4 w-4 text-muted-foreground shrink-0" />
              <input
                ref={inputRef}
                type="text"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                onKeyDown={handleKey}
                placeholder="Søg kunder, tilbud, fakturaer, projekter, tickets…"
                className="flex-1 bg-transparent text-sm outline-none placeholder:text-muted-foreground"
              />
              {pending && <Loader2 className="h-3.5 w-3.5 animate-spin text-muted-foreground" />}
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="text-muted-foreground hover:text-foreground p-1 -mr-1 rounded-md hover:bg-secondary/50"
                aria-label="Luk"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            {/* Resultater */}
            <div className="flex-1 overflow-y-auto">
              {query.length === 0 ? (
                <EmptyState />
              ) : results.length === 0 && !pending ? (
                <div className="px-6 py-12 text-center text-sm text-muted-foreground">
                  Ingen resultater for "{query}"
                </div>
              ) : (
                <div className="py-2">
                  {grouped.map(([type, items]) => (
                    <div key={type} className="mb-2">
                      <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider px-4 py-1.5">
                        {TYPE_LABEL[type]} ({items.length})
                      </p>
                      <ul>
                        {items.map((r) => {
                          const flatIdx = flatResults.findIndex((f) => f.result.id === r.id && f.result.type === r.type);
                          const isFocused = flatIdx === focused;
                          return (
                            <ResultRow
                              key={`${r.type}-${r.id}`}
                              result={r}
                              focused={isFocused}
                              onClick={() => {
                                router.push(r.href);
                                setOpen(false);
                              }}
                              onHover={() => setFocused(flatIdx)}
                            />
                          );
                        })}
                      </ul>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Footer hints */}
            <div className="px-4 py-2 border-t border-border bg-secondary/10 flex items-center gap-3 text-[10px] text-muted-foreground">
              <span><kbd className="px-1 py-0.5 rounded bg-card border border-border font-mono">↑↓</kbd> Naviger</span>
              <span><kbd className="px-1 py-0.5 rounded bg-card border border-border font-mono">↵</kbd> Åbn</span>
              <span><kbd className="px-1 py-0.5 rounded bg-card border border-border font-mono">Esc</kbd> Luk</span>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

// ─── Sub-components ──────────────────────────────────────────

function ResultRow({
  result, focused, onClick, onHover,
}: {
  result: SearchResult;
  focused: boolean;
  onClick: () => void;
  onHover: () => void;
}) {
  const Icon = TYPE_ICON[result.type];
  const color = TYPE_COLOR[result.type];

  return (
    <li>
      <button
        type="button"
        onClick={onClick}
        onMouseEnter={onHover}
        className={`w-full text-left px-4 py-2 flex items-center gap-3 transition-colors ${
          focused ? "bg-primary/5" : "hover:bg-secondary/30"
        }`}
      >
        <div className={`w-7 h-7 rounded-lg ${color} flex items-center justify-center shrink-0`}>
          <Icon className="h-3.5 w-3.5" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium truncate">{result.title}</p>
          {result.subtitle && (
            <p className="text-xs text-muted-foreground truncate">{result.subtitle}</p>
          )}
        </div>
        {focused && (
          <kbd className="text-[10px] px-1.5 py-0.5 rounded bg-card border border-border font-mono">↵</kbd>
        )}
      </button>
    </li>
  );
}

function EmptyState() {
  return (
    <div className="px-6 py-10 text-center">
      <div className="w-12 h-12 rounded-full bg-secondary/40 flex items-center justify-center mx-auto mb-3">
        <Search className="h-6 w-6 text-muted-foreground" />
      </div>
      <p className="text-sm font-semibold mb-1">Søg på tværs af alt</p>
      <p className="text-xs text-muted-foreground max-w-xs mx-auto">
        Skriv et navn, CVR, faktura-nummer (F-0042), tilbuds-nummer (Q-0007) eller hvad som helst.
      </p>
    </div>
  );
}
