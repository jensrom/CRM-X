"use client";

import { useState, useRef, useEffect } from "react";
import { Search, Building2, ChevronDown, X, Check } from "lucide-react";

interface Company {
  id: string;
  name: string;
  orgNumber?: string | null;
  industry?: string | null;
  city?: string | null;
}

interface CompanySearchSelectProps {
  companies: Company[];
  name?: string;
  required?: boolean;
  defaultValue?: string;
  placeholder?: string;
}

export function CompanySearchSelect({
  companies,
  name = "companyId",
  required,
  defaultValue,
  placeholder = "Søg og vælg firma...",
}: CompanySearchSelectProps) {
  const initial = defaultValue ? companies.find((c) => c.id === defaultValue) ?? null : null;

  const [open, setOpen]         = useState(false);
  const [query, setQuery]       = useState("");
  const [selected, setSelected] = useState<Company | null>(initial);
  const containerRef            = useRef<HTMLDivElement>(null);
  const inputRef                = useRef<HTMLInputElement>(null);

  useEffect(() => {
    function handler(e: MouseEvent) {
      if (!containerRef.current?.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const filtered = query
    ? companies.filter((c) => {
        const q = query.toLowerCase();
        return (
          c.name.toLowerCase().includes(q) ||
          (c.orgNumber ?? "").toLowerCase().includes(q) ||
          (c.industry ?? "").toLowerCase().includes(q) ||
          (c.city ?? "").toLowerCase().includes(q)
        );
      })
    : companies;

  function select(c: Company) {
    setSelected(c);
    setOpen(false);
    setQuery("");
  }

  function clearSelection(e: React.MouseEvent) {
    e.stopPropagation();
    setSelected(null);
    setQuery("");
  }

  function openDropdown() {
    setOpen(true);
    setTimeout(() => inputRef.current?.focus(), 50);
  }

  return (
    <div ref={containerRef} className="relative">
      <input type="hidden" name={name} value={selected?.id ?? ""} required={required} />

      {/* Trigger — div to avoid nested button issue */}
      <div
        role="button"
        tabIndex={0}
        onClick={openDropdown}
        onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") openDropdown(); }}
        className={[
          "w-full flex items-center gap-2.5 px-3 py-2.5 rounded-lg border text-sm transition-all text-left cursor-pointer select-none bg-background",
          open ? "border-ring ring-2 ring-ring/20" : "border-input hover:border-ring/50",
        ].join(" ")}
      >
        {selected ? (
          <>
            <div className="w-6 h-6 rounded bg-primary/10 flex items-center justify-center shrink-0">
              <Building2 className="h-3.5 w-3.5 text-primary" />
            </div>
            <span className="flex-1 font-medium truncate">{selected.name}</span>
            {selected.city && (
              <span className="text-xs text-muted-foreground shrink-0 hidden sm:block">{selected.city}</span>
            )}
            <button
              type="button"
              onClick={clearSelection}
              className="shrink-0 ml-1 p-0.5 rounded hover:bg-secondary text-muted-foreground hover:text-foreground transition-colors"
              aria-label="Fjern valg"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          </>
        ) : (
          <>
            <Search className="h-4 w-4 text-muted-foreground shrink-0" />
            <span className="flex-1 text-muted-foreground">{placeholder}</span>
            <ChevronDown
              className={["h-4 w-4 text-muted-foreground transition-transform shrink-0", open ? "rotate-180" : ""].join(" ")}
            />
          </>
        )}
      </div>

      {/* Dropdown */}
      {open && (
        <div className="absolute z-50 mt-1.5 w-full bg-popover border border-border rounded-xl shadow-xl overflow-hidden animate-in slide-in-from-top-1 fade-in duration-150">
          {/* Search field */}
          <div className="p-2 border-b border-border">
            <div className="flex items-center gap-2 px-2 py-1 bg-secondary/50 rounded-lg">
              <Search className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
              <input
                ref={inputRef}
                type="text"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Søg på navn, CVR eller by..."
                className="flex-1 bg-transparent text-sm outline-none placeholder:text-muted-foreground"
                onKeyDown={(e) => {
                  if (e.key === "Escape") { setOpen(false); setQuery(""); }
                  if (e.key === "Enter" && filtered.length === 1) { e.preventDefault(); select(filtered[0]); }
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
          <div className="max-h-60 overflow-y-auto">
            {filtered.length === 0 ? (
              <div className="px-4 py-8 text-center">
                <Building2 className="h-8 w-8 text-muted-foreground/30 mx-auto mb-2" />
                <p className="text-sm text-muted-foreground">
                  {query ? `Ingen firmaer matcher "${query}"` : "Ingen firmaer tilgaengelige"}
                </p>
              </div>
            ) : (
              <div className="divide-y divide-border/50">
                {filtered.map((c) => {
                  const isSelected = selected?.id === c.id;
                  const initials = c.name.split(" ").slice(0, 2).map((w) => w[0]).join("").toUpperCase();
                  return (
                    <button
                      key={c.id}
                      type="button"
                      onClick={() => select(c)}
                      className={[
                        "w-full flex items-center gap-3 px-4 py-3 text-left hover:bg-secondary/60 transition-colors",
                        isSelected ? "bg-primary/5" : "",
                      ].join(" ")}
                    >
                      <div className={[
                        "w-8 h-8 rounded-lg flex items-center justify-center text-xs font-bold shrink-0",
                        isSelected ? "bg-primary text-primary-foreground" : "bg-primary/10 text-primary",
                      ].join(" ")}>
                        {initials}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate">{c.name}</p>
                        <div className="flex items-center gap-2 mt-0.5">
                          {c.industry && <span className="text-xs text-muted-foreground truncate">{c.industry}</span>}
                          {c.city && <span className="text-xs text-muted-foreground">· {c.city}</span>}
                          {c.orgNumber && !c.industry && !c.city && (
                            <span className="text-xs text-muted-foreground font-mono">CVR: {c.orgNumber}</span>
                          )}
                        </div>
                      </div>
                      {c.orgNumber && (c.industry || c.city) && (
                        <span className="text-[10px] font-mono text-muted-foreground shrink-0 hidden sm:block">{c.orgNumber}</span>
                      )}
                      {isSelected && <Check className="h-4 w-4 text-primary shrink-0" />}
                    </button>
                  );
                })}
              </div>
            )}
          </div>

          {companies.length > 5 && (
            <div className="px-4 py-2 border-t border-border bg-secondary/20">
              <p className="text-xs text-muted-foreground">
                {filtered.length === companies.length ? `${companies.length} firmaer` : `${filtered.length} af ${companies.length} firmaer`}
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
