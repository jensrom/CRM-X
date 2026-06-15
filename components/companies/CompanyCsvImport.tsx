"use client";

import { useState, useRef } from "react";
import { useRouter } from "next/navigation";
import {
  Upload, Download, CheckCircle2, AlertCircle, FileText,
  Building2, X, Loader2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { importCompaniesFromCsv } from "@/app/actions/companies";

const CSV_HEADERS = [
  "navn",
  "cvr",
  "branche",
  "telefon",
  "email",
  "fakturamail",
  "hjemmeside",
  "adresse",
  "postnummer",
  "by",
  "land",
  "noter",
];

const EXAMPLE_ROWS = [
  [
    "Acme A/S",
    "12345678",
    "IT",
    "+45 12 34 56 78",
    "info@acme.dk",
    "faktura@acme.dk",
    "https://acme.dk",
    "Eksempelvej 42",
    "8000",
    "Aarhus",
    "Danmark",
    "Stor kunde",
  ],
  [
    "Beta ApS",
    "87654321",
    "Produktion",
    "+45 98 76 54 32",
    "kontakt@beta.dk",
    "",
    "",
    "Industrivej 1",
    "9000",
    "Aalborg",
    "Danmark",
    "",
  ],
];

function downloadTemplate() {
  const lines = [CSV_HEADERS.join(";"), ...EXAMPLE_ROWS.map((r) => r.join(";"))];
  const csv = "﻿" + lines.join("\r\n"); // BOM for Excel
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = "kunde-import-skabelon.csv";
  a.click();
  URL.revokeObjectURL(url);
}

function parseCsv(text: string): Record<string, string>[] {
  // Håndter BOM
  const clean = text.replace(/^﻿/, "").replace(/\r\n/g, "\n").replace(/\r/g, "\n");
  const lines = clean.split("\n").filter((l) => l.trim());
  if (lines.length < 2) return [];

  // Detect separator (, eller ;)
  const sep = lines[0].includes(";") ? ";" : ",";
  const headers = lines[0].split(sep).map((h) => h.trim().toLowerCase());

  return lines.slice(1).map((line) => {
    const vals = line.split(sep);
    const obj: Record<string, string> = {};
    headers.forEach((h, i) => {
      obj[h] = (vals[i] ?? "").trim().replace(/^"|"$/g, "");
    });
    return obj;
  });
}

interface PreviewRow {
  name: string;
  orgNumber?: string;
  industry?: string;
  phone?: string;
  email?: string;
  invoiceEmail?: string;
  website?: string;
  address?: string;
  zipCode?: string;
  city?: string;
  country?: string;
  notes?: string;
  _error?: string;
}

function mapRow(row: Record<string, string>): PreviewRow {
  const name = row["navn"] || row["name"] || row["kundenavn"] || "";
  if (!name) return { name: "", _error: "Kundenavn mangler" };

  return {
    name,
    orgNumber:    row["cvr"] || row["orgnumber"] || row["cvr-nummer"] || "",
    industry:     row["branche"] || row["industry"] || "",
    phone:        row["telefon"] || row["phone"] || "",
    email:        row["email"] || "",
    invoiceEmail: row["fakturamail"] || row["invoiceemail"] || "",
    website:      row["hjemmeside"] || row["website"] || "",
    address:      row["adresse"] || row["address"] || "",
    zipCode:      row["postnummer"] || row["zipcode"] || "",
    city:         row["by"] || row["city"] || "",
    country:      row["land"] || row["country"] || "Danmark",
    notes:        row["noter"] || row["notes"] || "",
  };
}

export function CompanyCsvImport() {
  const router = useRouter();
  const fileRef = useRef<HTMLInputElement>(null);
  const [preview, setPreview] = useState<PreviewRow[]>([]);
  const [fileName, setFileName] = useState<string>("");
  const [importing, setImporting] = useState(false);
  const [result, setResult] = useState<{ ok: number; errors: string[] } | null>(null);

  function handleFile(file: File) {
    setFileName(file.name);
    setResult(null);
    const reader = new FileReader();
    reader.onload = (e) => {
      const text = e.target?.result as string;
      const rows = parseCsv(text);
      setPreview(rows.map(mapRow));
    };
    reader.readAsText(file, "UTF-8");
  }

  function onFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (file) handleFile(file);
  }

  function onDrop(e: React.DragEvent) {
    e.preventDefault();
    const file = e.dataTransfer.files?.[0];
    if (file) handleFile(file);
  }

  const validRows = preview.filter((r) => !r._error && r.name);
  const errorRows = preview.filter((r) => r._error || !r.name);

  async function handleImport() {
    if (!validRows.length) return;
    setImporting(true);
    try {
      const res = await importCompaniesFromCsv(validRows);
      setResult(res);
      if (res.ok > 0) {
        setTimeout(() => router.push("/kunder"), 2000);
      }
    } catch (err: any) {
      setResult({ ok: 0, errors: [err.message ?? "Ukendt fejl"] });
    } finally {
      setImporting(false);
    }
  }

  return (
    <div className="max-w-4xl space-y-6">
      {/* Header-sektion */}
      <div className="bg-card border border-border rounded-xl p-6">
        <div className="flex items-start justify-between mb-4">
          <div>
            <h2 className="text-lg font-semibold mb-1">CSV-import af kunder</h2>
            <p className="text-sm text-muted-foreground">
              Importer kunder fra en semikolon- eller kommasepareret CSV-fil.
              Download skabelonen for at se det forventede format.
            </p>
          </div>
          <Button variant="ghost" size="sm" onClick={downloadTemplate}>
            <Download className="h-4 w-4" />
            Download skabelon
          </Button>
        </div>

        {/* Kolonneoversigt */}
        <div className="p-3 bg-secondary/50 rounded-lg text-xs text-muted-foreground">
          <span className="font-medium text-foreground">Kolonner: </span>
          {CSV_HEADERS.join(" · ")}
          <span className="ml-2 text-amber-600 font-medium">* navn er påkrævet</span>
        </div>
      </div>

      {/* Drop-zone */}
      {!preview.length && (
        <div
          onDrop={onDrop}
          onDragOver={(e) => e.preventDefault()}
          onClick={() => fileRef.current?.click()}
          className="border-2 border-dashed border-border hover:border-primary/50 rounded-xl p-12 flex flex-col items-center justify-center gap-4 cursor-pointer transition-colors bg-card"
        >
          <div className="w-14 h-14 rounded-2xl bg-primary/10 flex items-center justify-center">
            <Upload className="h-7 w-7 text-primary" />
          </div>
          <div className="text-center">
            <p className="font-medium">Træk og slip din CSV-fil her</p>
            <p className="text-sm text-muted-foreground mt-1">eller klik for at vælge fil</p>
          </div>
          <input ref={fileRef} type="file" accept=".csv,text/csv" onChange={onFileChange} className="hidden" />
        </div>
      )}

      {/* Preview */}
      {preview.length > 0 && (
        <div className="bg-card border border-border rounded-xl overflow-hidden">
          <div className="flex items-center justify-between px-5 py-3.5 border-b border-border bg-secondary/30">
            <div className="flex items-center gap-3">
              <FileText className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm font-medium">{fileName}</span>
              <span className="text-xs text-muted-foreground">
                {validRows.length} klar · {errorRows.length} fejl
              </span>
            </div>
            <button
              onClick={() => { setPreview([]); setFileName(""); setResult(null); }}
              className="text-muted-foreground hover:text-foreground transition-colors"
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border text-xs text-muted-foreground bg-secondary/20">
                  <th className="text-left px-4 py-2.5">#</th>
                  <th className="text-left px-4 py-2.5">Kundenavn</th>
                  <th className="text-left px-4 py-2.5 hidden sm:table-cell">CVR</th>
                  <th className="text-left px-4 py-2.5 hidden md:table-cell">Email</th>
                  <th className="text-left px-4 py-2.5 hidden lg:table-cell">Fakturamail</th>
                  <th className="text-left px-4 py-2.5 hidden lg:table-cell">By</th>
                  <th className="text-left px-4 py-2.5">Status</th>
                </tr>
              </thead>
              <tbody>
                {preview.map((row, i) => (
                  <tr key={i} className={`border-b border-border/50 last:border-0 ${row._error ? "bg-destructive/5" : ""}`}>
                    <td className="px-4 py-2.5 text-muted-foreground text-xs">{i + 1}</td>
                    <td className="px-4 py-2.5 font-medium">
                      {row.name || <span className="text-destructive text-xs">(tomt)</span>}
                    </td>
                    <td className="px-4 py-2.5 text-muted-foreground hidden sm:table-cell">
                      {row.orgNumber || "—"}
                    </td>
                    <td className="px-4 py-2.5 text-muted-foreground hidden md:table-cell">
                      {row.email || "—"}
                    </td>
                    <td className="px-4 py-2.5 text-muted-foreground hidden lg:table-cell">
                      {row.invoiceEmail || "—"}
                    </td>
                    <td className="px-4 py-2.5 text-muted-foreground hidden lg:table-cell">
                      {row.zipCode ? `${row.zipCode} ${row.city}` : row.city || "—"}
                    </td>
                    <td className="px-4 py-2.5">
                      {row._error ? (
                        <span className="flex items-center gap-1 text-xs text-destructive">
                          <AlertCircle className="h-3 w-3" /> {row._error}
                        </span>
                      ) : (
                        <span className="flex items-center gap-1 text-xs text-emerald-600">
                          <CheckCircle2 className="h-3 w-3" /> Klar
                        </span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Import-knap */}
          <div className="px-5 py-4 border-t border-border flex items-center justify-between">
            {result ? (
              <div className={`flex items-center gap-2 text-sm ${result.ok > 0 ? "text-emerald-600" : "text-destructive"}`}>
                {result.ok > 0 ? <CheckCircle2 className="h-4 w-4" /> : <AlertCircle className="h-4 w-4" />}
                {result.ok > 0
                  ? `${result.ok} kunder importeret! Omdirigerer...`
                  : result.errors.join(", ")}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">
                {validRows.length} kunde{validRows.length !== 1 ? "er" : ""} klar til import
                {errorRows.length > 0 && ` · ${errorRows.length} rækker springes over`}
              </p>
            )}

            <Button
              onClick={handleImport}
              disabled={!validRows.length || importing || !!result?.ok}
              size="sm"
            >
              {importing ? (
                <><Loader2 className="h-3.5 w-3.5 animate-spin" /> Importerer...</>
              ) : (
                <><Building2 className="h-3.5 w-3.5" /> Importer {validRows.length} kunder</>
              )}
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
