"use client";

/**
 * CRM-X — Cookie / Consent Banner
 *
 * Compliance:
 *   - GDPR Art. 6(1)(a) — samtykke som retsgrundlag
 *   - GDPR Art. 7 — krav til samtykke (informeret, frivilligt, specifikt, dokumenteret)
 *   - ePrivacy-direktivet — cookie-samtykke
 *   - Datatilsynets vejledning: "Afvis"-knappen skal være lige så tilgængelig som "Accepter"
 *
 * Adfærd:
 *   - Vises kun hvis ingen samtykke-record findes i localStorage
 *   - Default-fokus på "Afvis ikke-nødvendige" (mest privacy-bevarende)
 *   - Samtykke logges med tidsstempel + version (af samtykke-policyen)
 *   - Brugeren kan altid trække samtykke tilbage via /legal/cookies
 */

import { useEffect, useState, useRef } from "react";
import Link from "next/link";
import { Cookie } from "lucide-react";

const CONSENT_KEY = "crmx-cookie-consent-v1";
const CONSENT_POLICY_VERSION = "1.0";

interface ConsentRecord {
  version: string;
  timestamp: string;
  necessary: boolean;
  analytics: boolean;
  marketing: boolean;
}

export function CookieBanner() {
  const [show, setShow] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [analytics, setAnalytics] = useState(false);
  const [marketing, setMarketing] = useState(false);
  const declineRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    try {
      const existing = localStorage.getItem(CONSENT_KEY);
      if (!existing) {
        setShow(true);
        // Privacy-by-default: fokus på "Afvis" når banner vises
        setTimeout(() => declineRef.current?.focus(), 100);
      }
    } catch {
      // localStorage utilgængelig (privacy-mode, ssr) — vis ikke banner
    }
  }, []);

  function record(consent: Omit<ConsentRecord, "version" | "timestamp">) {
    const full: ConsentRecord = {
      version: CONSENT_POLICY_VERSION,
      timestamp: new Date().toISOString(),
      ...consent,
    };
    try {
      localStorage.setItem(CONSENT_KEY, JSON.stringify(full));
    } catch {
      // Ignoreres
    }
    setShow(false);
  }

  function acceptAll() {
    record({ necessary: true, analytics: true, marketing: true });
  }
  function declineNonEssential() {
    record({ necessary: true, analytics: false, marketing: false });
  }
  function saveCustom() {
    record({ necessary: true, analytics, marketing });
  }

  if (!show) return null;

  return (
    <div
      role="dialog"
      aria-labelledby="cookie-title"
      aria-describedby="cookie-desc"
      className="fixed inset-x-0 bottom-0 z-50 p-3 sm:p-4 pointer-events-none"
    >
      <div className="max-w-3xl mx-auto bg-card border border-border rounded-2xl shadow-xl p-5 sm:p-6 pointer-events-auto">
        {!showSettings ? (
          <>
            <div className="flex items-start gap-3 mb-4">
              <div className="w-9 h-9 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
                <Cookie className="h-4 w-4 text-primary" />
              </div>
              <div className="flex-1 min-w-0">
                <h2 id="cookie-title" className="text-sm font-semibold mb-1">
                  Vi respekterer dit privatliv
                </h2>
                <p id="cookie-desc" className="text-xs text-muted-foreground leading-relaxed">
                  Vi bruger udelukkende strengt nødvendige cookies til at få platformen til at fungere.
                  Hvis du ønsker det, kan du give samtykke til at vi måler hvordan vores marketing-side
                  bruges, så vi kan gøre den bedre.{" "}
                  <Link href="/legal/cookies" className="text-primary hover:underline">
                    Læs mere om cookies
                  </Link>
                  .
                </p>
              </div>
            </div>

            <div className="flex flex-col sm:flex-row gap-2 sm:items-center sm:justify-between">
              <button
                onClick={() => setShowSettings(true)}
                className="text-xs text-muted-foreground hover:text-foreground transition-colors underline underline-offset-2"
              >
                Tilpas indstillinger
              </button>
              <div className="flex gap-2">
                <button
                  ref={declineRef}
                  onClick={declineNonEssential}
                  className="px-4 py-2 rounded-lg border border-border text-sm font-medium hover:bg-secondary transition-colors flex-1 sm:flex-initial"
                >
                  Kun nødvendige
                </button>
                <button
                  onClick={acceptAll}
                  className="px-4 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 transition-colors flex-1 sm:flex-initial"
                >
                  Accepter alle
                </button>
              </div>
            </div>
          </>
        ) : (
          <>
            <h2 className="text-sm font-semibold mb-3">Cookie-indstillinger</h2>
            <div className="space-y-3 mb-4">
              <div className="flex items-start gap-3 p-3 rounded-lg bg-secondary/40">
                <input type="checkbox" checked disabled className="mt-0.5" />
                <div className="text-xs">
                  <p className="font-medium">Strengt nødvendige</p>
                  <p className="text-muted-foreground">Login, sikkerhed, tenant-routing. Kan ikke slås fra.</p>
                </div>
              </div>
              <label className="flex items-start gap-3 p-3 rounded-lg hover:bg-secondary/40 cursor-pointer transition-colors">
                <input
                  type="checkbox"
                  checked={analytics}
                  onChange={(e) => setAnalytics(e.target.checked)}
                  className="mt-0.5 accent-primary"
                />
                <div className="text-xs">
                  <p className="font-medium">Analyse</p>
                  <p className="text-muted-foreground">Anonyme besøgsstatistikker. Ingen cross-site tracking.</p>
                </div>
              </label>
              <label className="flex items-start gap-3 p-3 rounded-lg hover:bg-secondary/40 cursor-pointer transition-colors">
                <input
                  type="checkbox"
                  checked={marketing}
                  onChange={(e) => setMarketing(e.target.checked)}
                  className="mt-0.5 accent-primary"
                />
                <div className="text-xs">
                  <p className="font-medium">Marketing</p>
                  <p className="text-muted-foreground">Måling af kampagne-effekt. P.t. ikke i brug.</p>
                </div>
              </label>
            </div>

            <div className="flex justify-between items-center">
              <button
                onClick={() => setShowSettings(false)}
                className="text-xs text-muted-foreground hover:text-foreground transition-colors"
              >
                ← Tilbage
              </button>
              <button
                onClick={saveCustom}
                className="px-4 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 transition-colors"
              >
                Gem valg
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
