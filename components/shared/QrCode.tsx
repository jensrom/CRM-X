"use client";

/**
 * QrCode — Genbrugelig QR-kode komponent med bruger-præference
 *
 * Brug:
 *   <QrCode url="https://crm.example.dk/tickets/abc123" storageKey="tickets/abc123" />
 *
 * Opførsel:
 *   - Bruger-præference gemmes i localStorage (pr. storageKey)
 *   - "hidden" (default): Knap "Vis QR" — tryk for at se koden
 *   - "shown": QR-koden er synlig + knap til at gemme som billede
 *   - Præferencen huskes på tværs af sessioner
 */

import { useState, useEffect, useRef } from "react";
import { QrCode as QrIcon, X, Download, Eye } from "lucide-react";

interface Props {
  /** Den URL QR-koden peger på */
  url: string;
  /** Unik nøgle til localStorage, fx "ticket/abc123" */
  storageKey: string;
  /** Valgfri label vist under koden */
  label?: string;
  /** Størrelse i pixels (default: 180) */
  size?: number;
}

// Simpel QR-kode via offentlig API (ingen deps)
function qrApiUrl(data: string, size: number) {
  return `https://api.qrserver.com/v1/create-qr-code/?size=${size}x${size}&data=${encodeURIComponent(data)}&format=png&qzone=1&color=1a1a2e&bgcolor=ffffff`;
}

function lsKey(storageKey: string) {
  return `qr_pref:${storageKey}`;
}

export function QrCode({ url, storageKey, label, size = 180 }: Props) {
  const [pref, setPref] = useState<"hidden" | "shown" | null>(null); // null = ikke loadet endnu
  const [open, setOpen] = useState(false); // brugt i hidden-mode for at vise midlertidigt
  const imgRef = useRef<HTMLImageElement>(null);

  // Hent præference fra localStorage
  useEffect(() => {
    try {
      const stored = localStorage.getItem(lsKey(storageKey)) as "hidden" | "shown" | null;
      setPref(stored ?? "hidden");
    } catch {
      setPref("hidden");
    }
  }, [storageKey]);

  function savePref(val: "hidden" | "shown") {
    setPref(val);
    try { localStorage.setItem(lsKey(storageKey), val); } catch { /* ignore */ }
  }

  function downloadQr() {
    const a = document.createElement("a");
    a.href = qrApiUrl(url, size * 2);
    a.download = `qr-${storageKey.replace(/\//g, "-")}.png`;
    a.target = "_blank";
    a.click();
  }

  if (pref === null) return null; // SSR guard

  const src = qrApiUrl(url, size);
  const isShown = pref === "shown" || open;

  return (
    <div className="inline-flex flex-col items-center">
      {isShown ? (
        <div className="relative group">
          {/* QR-billede */}
          <div className="rounded-xl border border-border p-2 bg-white shadow-sm">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              ref={imgRef}
              src={src}
              alt="QR-kode"
              width={size}
              height={size}
              className="rounded-lg block"
            />
            {label && (
              <p className="text-center text-xs text-slate-500 mt-1.5 font-mono">{label}</p>
            )}
          </div>

          {/* Overlay-knapper */}
          <div className="absolute top-1 right-1 flex flex-col gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
            <button
              onClick={downloadQr}
              title="Gem QR-kode"
              className="w-7 h-7 rounded-md bg-white/90 border border-border shadow-sm flex items-center justify-center hover:bg-primary/10 transition-colors"
            >
              <Download className="h-3.5 w-3.5 text-muted-foreground" />
            </button>
            {open && pref === "hidden" ? (
              <button
                onClick={() => setOpen(false)}
                title="Skjul"
                className="w-7 h-7 rounded-md bg-white/90 border border-border shadow-sm flex items-center justify-center hover:bg-destructive/10 transition-colors"
              >
                <X className="h-3.5 w-3.5 text-muted-foreground" />
              </button>
            ) : null}
          </div>

          {/* Gem præference / skjul */}
          <div className="flex gap-2 mt-2 justify-center">
            {pref === "hidden" && (
              <button
                onClick={() => savePref("shown")}
                className="text-xs text-muted-foreground hover:text-primary transition-colors"
              >
                Gem som standard vist
              </button>
            )}
            {pref === "shown" && (
              <button
                onClick={() => savePref("hidden")}
                className="text-xs text-muted-foreground hover:text-foreground transition-colors"
              >
                Skjul QR som standard
              </button>
            )}
          </div>
        </div>
      ) : (
        /* Hidden-mode: kun ikon-knap */
        <button
          onClick={() => setOpen(true)}
          title="Vis QR-kode"
          className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors px-2 py-1 rounded-lg border border-border/60 hover:border-border hover:bg-secondary/50"
        >
          <QrIcon className="h-3.5 w-3.5" />
          QR-kode
        </button>
      )}
    </div>
  );
}
