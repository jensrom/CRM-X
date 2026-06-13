"use client";

import { useState, useRef, useEffect } from "react";
import { Search, Check, Scissors, ChevronDown, X } from "lucide-react";

interface Bundle {
  id: string;
  number: number;
  name: string | null;
  totalHours: number;
  usedMinutes: number;
  expiresAt: Date | null;
  company: { name: string } | null;
}

interface BundleSearchSelectProps {
  bundles: Bundle[];
  bundlePrefix?: string;
  placeholder?: string;
  name?: string;
}

function formatRef(prefix: string | undefined, num: number) {
  return `${prefix ?? "KB"}-${String(num).padStart(4, "0")}`;
}

function remHours(b: Bundle) {
  return Math.max(0, Math.round(((b.totalHours * 60 - b.usedMinutes) / 60) * 10) / 10);
}

export function BundleSearchSelect({
  bundles,
  bundlePrefix,
  placeholder = "Søg og vælg klippekort…",
  name = "bundleId",
}: BundleSearchSelectProps) {
  const [open, setOpen]         = useState(false);
  const [query, setQuery]       = useState("");
  const [selected, setSelected] = useState<Bundle | null>(null);
  const containerRef            = useRef<HTMLDivElement>(null);
  const inputRef                = useRef<HTMLInputElement>(null);

  // Close on outside click
  useEffect(() => {
    function handler(e: MouseEvent) {
      if (!containerRef.current?.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const filtered = bundles.filter((b) => {
    if (!query) return true;
    const q = query.toLowerCase();
    const ref = formatRef(bundlePrefix, b.number).toLowerCase();
    const name = (b.name ?? "").toLowerCase();
    const company = (b.company?.name ?? "").toLowerCase();
    return ref.includes(q) || name.includes(q) || company.includes(q);
  });

  const isExpired = (b: Bundle) =>
    b.expiresAt ? new Date(b.expiresAt) < new Date() : false;

  function select(b: Bundle) {
    setSelected(b);
    setOpen(false);
    setQuery("");
  }

  function clear(e: React.MouseEvent) {
    e.stopPropagation();
    setSelected(null);
    setQuery("");
  }

  return (
    <div ref={containerRef} className="relative">
      {/* Hidden input for form submission */}
      <input type="hidden" name={name} value={selected?.id ?? ""} required />

      {/* Trigger button */}
      <button
        type="button"
        onClick={() => {
          setOpen((v) => !v);
          setTimeout(() => inputRef.current?.focus(), 50);
        }}
        className={`w-full flex items-center gap-2 px-3 py-2 rounded-lg border text-sm transition-colors text-left
          ${open ? "border-ring ring-2 ring-ring/20" : "border-input hover:border-ring/50"}
          bg-background`}
      >
        {selected ? (
          <>
            <Scissors className="h-3.5 w-3.5 text-primary shrink-0" />
            <span className="flex-1 min-w-0 font-medium truncate">
              {formatRef(bundlePrefix, selected.number)}
              {selected.name ? ` — ${selected.name}` : ""}
            </span>
            <span className={`text-xs shrink-0 ${remHours(selected) <= 0 ? "text-destructive" : "text-emerald-600 dark:text-emerald-400"}`}>
              {remHours(selected)}t tilbage
            </span>
            <X className="h-3.5 w-3.5 text-muted-foreground hover:text-foreground shrink-0 ml-1" onClick={clear} />
          </>
        ) : (
          <>
            <Search className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
            <span className="flex-1 text-muted-foreground">{placeholder}</span>
            <ChevronDown className={`h-3.5 w-3.5 text-muted-foreground transition-transform shrink-0 ${open ? "rotate-180" : ""}`} />
          </>
        )}
      </button>

      {/* Dropdown */}
      {open && (
        <div className="absolute z-50 mt-1 w-full bg-popover border border-border rounded-xl shadow-lg overflow-hidden animate-in slide-in-from-top-1 duration-100">
          {/* Search input */}
          <div className="p-2 border-b border-border">
            <div className="flex items-center gap-2 px-2">
              <Search className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
              <input
                ref={inputRef}
                type="text"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Søg på nummer, navn eller kunde…"
                className="flex-1 bg-transparent text-sm outline-none placeholder:text-muted-foreground py-1"
                onKeyDown={(e) => {
                  if (e.key === "Escape") setOpen(false);
                  if (e.key === "Enter" && filtered.length === 1) {
                    e.preventDefault();
                    select(filtered[0]);
                  }
                }}
              />
              {query && (
                <button type="button" onClick={() => setQuery("")} className="text-muted-foreground hover:text-foreground">
                  <X className="h-3.5 w-3.5" />
                </button>
              )}
            </div>
          </div>

          {/* Results */}
          <div className="max-h-56 overflow-y-auto">
            {filtered.length === 0 ? (
              <div className="px-4 py-6 text-center text-sm text-muted-foreground">
                Ingen klippekort matcher søgningen
              </div>
            ) : (
              filtered.map((b) => {
                const rem    = remHours(b);
                const exp    = isExpired(b);
                const pct    = Math.min(Math.round(((b.totalHours * 60 - b.usedMinutes) / (b.totalHours * 60)) * 100), 100);
                const isSelected = selected?.id === b.id;

                return (
                  <button
                    key={b.id}
                    type="button"
                    onClick={() => select(b)}
                    className={`w-full flex items-start gap-3 px-4 py-3 text-left hover:bg-secondary/60 transition-colors border-b border-border/50 last:border-0
                      ${isSelected ? "bg-primary/5" : ""}
                      ${exp ? "opacity-60" : ""}
                    `}
                  >
                    {/* Icon */}
                    <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 mt-0.5
                      ${exp ? "bg-destructive/10" : rem <= 0 ? "bg-destructive/10" : "bg-emerald-100 dark:bg-emerald-900/30"}`}>
                      <Scissors className={`h-3.5 w-3.5 ${exp || rem <= 0 ? "text-destructive" : "text-emerald-600 dark:text-emerald-400"}`} />
                    </div>

                    {/* Info */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-1.5 mb-0.5">
                        <span className="font-mono text-xs text-muted-foreground">{formatRef(bundlePrefix, b.number)}</span>
                        {b.name && <span className="text-sm font-medium truncate">{b.name}</span>}
                      </div>
                      {b.company && (
                        <p className="text-xs text-muted-foreground truncate">{b.company.name}</p>
                      )}
                      {/* Mini usage bar */}
                      <div className="mt-1.5 h-1 bg-secondary rounded-full overflow-hidden w-full">
                        <div
                          className={`h-full rounded-full ${rem <= 0 ? "bg-destructive" : pct < 30 ? "bg-emerald-500" : pct < 70 ? "bg-amber-500" : "bg-destructive"}`}
                          style={{ width: `${100 - pct}%` }}
                        />
                      </div>
                    </div>

                    {/* Right: hours + check */}
                    <div className="shrink-0 text-right">
                      <p className={`text-sm font-semibold ${rem <= 0 ? "text-destructive" : "text-emerald-600 dark:text-emerald-400"}`}>{rem}t</p>
                      <p className="text-[10px] text-muted-foreground">tilbage</p>
                      {exp && <p className="text-[10px] text-destructive">Udløbt</p>}
                    </div>

                    {isSelected && (
                      <Check className="h-4 w-4 text-primary shrink-0 mt-2" />
                    )}
                  </button>
                );
              })
            )}
          </div>

          {/* Footer count */}
          {bundles.length > 5 && (
            <div className="px-4 py-2 border-t border-border bg-secondary/20">
              <p className="text-xs text-muted-foreground">
                {filtered.length} af {bundles.length} klippekort vist
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
