"use client";

/**
 * CompanyPickerWithCreate
 * ───────────────────────
 * Kunde-vælger med søgbar liste + "Opret ny kunde" inline-modal.
 *
 * Bruges i flows hvor sælger skal vælge en kunde, men ofte ikke finder
 * et match (ny kunde fra et lead eller første-gangs-deal). I stedet for
 * at sende sælgeren ud af flowet for at oprette, åbner vi en modal og
 * auto-vælger den nye kunde når den er oprettet.
 *
 * Submit'er skjult input `companyId` så formularen virker som forventet.
 */

import { useState, useMemo } from "react";
import { Building2, Search } from "lucide-react";
import { InlineCreateCompany } from "./InlineCreateCompany";

interface CompanyOption {
  id: string;
  name: string;
}

interface Props {
  /** Initielle kunder fra server */
  companies: CompanyOption[];
  /** Form-feltnavn (default "companyId") */
  name?: string;
  /** Default-valgt kunde-id */
  defaultValue?: string;
  /** Påkrævet i formularen */
  required?: boolean;
}

export function CompanyPickerWithCreate({
  companies: initialCompanies,
  name = "companyId",
  defaultValue = "",
  required = false,
}: Props) {
  const [companies, setCompanies] = useState<CompanyOption[]>(initialCompanies);
  const [selectedId, setSelectedId] = useState<string>(defaultValue);
  const [searchText, setSearchText] = useState<string>("");

  // Filtreret liste — case-insensitive substring-søg på navn
  const filtered = useMemo(() => {
    const q = searchText.trim().toLowerCase();
    if (!q) return companies;
    return companies.filter((c) => c.name.toLowerCase().includes(q));
  }, [searchText, companies]);

  const hasResults = filtered.length > 0;
  const selected = companies.find((c) => c.id === selectedId);

  return (
    <div className="space-y-2">
      {/* Skjult input til form-submit */}
      <input type="hidden" name={name} value={selectedId} required={required} />

      {/* Hvis allerede valgt: vis badge + skift-knap */}
      {selected ? (
        <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-primary/5 border border-primary/20">
          <Building2 className="h-4 w-4 text-primary" />
          <span className="text-sm font-medium flex-1">{selected.name}</span>
          <button
            type="button"
            onClick={() => setSelectedId("")}
            className="text-xs text-muted-foreground hover:text-foreground"
          >
            Skift
          </button>
        </div>
      ) : (
        <>
          {/* Søg + liste */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
            <input
              type="text"
              value={searchText}
              onChange={(e) => setSearchText(e.target.value)}
              placeholder="Søg efter kunde…"
              className="w-full pl-9 pr-3 py-2 rounded-lg border border-input bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring"
            />
          </div>

          {searchText && (
            <div className="border border-border rounded-lg max-h-48 overflow-y-auto bg-card">
              {hasResults ? (
                filtered.slice(0, 15).map((c) => (
                  <button
                    key={c.id}
                    type="button"
                    onClick={() => {
                      setSelectedId(c.id);
                      setSearchText("");
                    }}
                    className="w-full text-left px-3 py-2 hover:bg-secondary/40 text-sm flex items-center gap-2 border-b border-border last:border-b-0"
                  >
                    <Building2 className="h-3.5 w-3.5 text-muted-foreground" />
                    {c.name}
                  </button>
                ))
              ) : (
                <div className="px-3 py-4 text-center">
                  <p className="text-sm text-muted-foreground mb-2">
                    Ingen match for <span className="font-medium">"{searchText}"</span>
                  </p>
                  <InlineCreateCompany
                    initialName={searchText}
                    triggerLabel={`Opret "${searchText}" som ny kunde`}
                    triggerVariant="default"
                    onCreated={(c) => {
                      setCompanies((prev) => [...prev, c]);
                      setSelectedId(c.id);
                      setSearchText("");
                    }}
                  />
                </div>
              )}
            </div>
          )}

          {/* Opret altid synlig som fallback */}
          {!searchText && (
            <div className="flex items-center justify-between">
              <p className="text-xs text-muted-foreground">
                {companies.length} kunder tilgængelige
              </p>
              <InlineCreateCompany
                triggerLabel="Opret ny kunde"
                triggerVariant="ghost"
                onCreated={(c) => {
                  setCompanies((prev) => [...prev, c]);
                  setSelectedId(c.id);
                }}
              />
            </div>
          )}
        </>
      )}
    </div>
  );
}
