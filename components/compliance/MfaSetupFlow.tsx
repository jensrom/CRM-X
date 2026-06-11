"use client";

import { useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { beginMfaSetup, confirmMfaSetup } from "@/app/actions/mfa";
import { ShieldCheck, Copy, Check, AlertTriangle, ScanLine } from "lucide-react";

type Step = "idle" | "scan" | "verify" | "done";

export function MfaSetupFlow() {
  const [step, setStep] = useState<Step>("idle");
  const [setupData, setSetupData] = useState<{ secret: string; otpauthUrl: string; accountLabel: string } | null>(null);
  const [code, setCode] = useState("");
  const [recoveryCodes, setRecoveryCodes] = useState<string[]>([]);
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function start() {
    setError(null);
    startTransition(async () => {
      try {
        const data = await beginMfaSetup();
        setSetupData(data);
        setStep("scan");
      } catch (e: any) {
        setError(e?.message ?? "Kunne ikke starte MFA-opsætning");
      }
    });
  }

  function verify() {
    if (!/^\d{6}$/.test(code)) {
      setError("Indtast den 6-cifrede kode fra din authenticator-app");
      return;
    }
    setError(null);
    startTransition(async () => {
      try {
        const result = await confirmMfaSetup(code);
        setRecoveryCodes(result.recoveryCodes);
        setStep("done");
      } catch (e: any) {
        setError(e?.message ?? "Kunne ikke bekræfte koden");
      }
    });
  }

  function copyRecoveryCodes() {
    navigator.clipboard.writeText(recoveryCodes.join("\n"));
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  // QR-URL via Google Charts (kun til UI — secret afsløres ikke ekstra)
  const qrSrc = setupData
    ? `https://api.qrserver.com/v1/create-qr-code/?size=180x180&data=${encodeURIComponent(setupData.otpauthUrl)}`
    : "";

  if (step === "idle") {
    return (
      <div className="bg-card border border-border rounded-xl p-5">
        <h3 className="text-sm font-semibold mb-2">Aktivér to-faktor-godkendelse</h3>
        <p className="text-xs text-muted-foreground mb-4">
          Du skal have en authenticator-app installeret (fx Google Authenticator, 1Password eller Authy).
        </p>
        <Button type="button" size="md" onClick={start} disabled={isPending}>
          <ShieldCheck className="h-4 w-4" />
          {isPending ? "Forbereder..." : "Kom i gang"}
        </Button>
        {error && (
          <p className="text-xs text-destructive mt-3 flex items-center gap-1.5">
            <AlertTriangle className="h-3.5 w-3.5" /> {error}
          </p>
        )}
      </div>
    );
  }

  if (step === "scan" && setupData) {
    return (
      <div className="bg-card border border-border rounded-xl p-5 space-y-4">
        <div>
          <h3 className="text-sm font-semibold flex items-center gap-2 mb-1">
            <ScanLine className="h-4 w-4 text-primary" />
            Trin 1 — Scan QR-koden
          </h3>
          <p className="text-xs text-muted-foreground">
            Åbn din authenticator-app og scan koden. Du kan også indtaste den manuelt.
          </p>
        </div>

        <div className="flex flex-col sm:flex-row gap-5 items-start">
          <div className="bg-white p-3 rounded-lg border border-border shrink-0">
            {/* Brug img direkte — vi vil ikke have Next/Image til at proxie via /_next/image */}
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={qrSrc} alt="MFA QR-kode" width={180} height={180} />
          </div>
          <div className="flex-1 min-w-0 space-y-3">
            <div>
              <p className="text-xs text-muted-foreground mb-1">Manuel kode</p>
              <code className="block bg-secondary px-3 py-2 rounded-lg text-xs font-mono break-all">
                {setupData.secret}
              </code>
            </div>
            <div>
              <p className="text-xs text-muted-foreground mb-1">Konto-label</p>
              <code className="block bg-secondary px-3 py-2 rounded-lg text-xs font-mono">
                {setupData.accountLabel}
              </code>
            </div>
          </div>
        </div>

        <div className="pt-4 border-t border-border">
          <h3 className="text-sm font-semibold mb-1">Trin 2 — Bekræft</h3>
          <p className="text-xs text-muted-foreground mb-3">
            Indtast den 6-cifrede kode din app viser nu:
          </p>
          <div className="flex gap-2">
            <Input
              placeholder="000000"
              value={code}
              onChange={(e) => setCode(e.target.value.replace(/\D/g, "").slice(0, 6))}
              className="font-mono tracking-widest text-center"
            />
            <Button type="button" onClick={verify} disabled={isPending || code.length !== 6}>
              {isPending ? "Bekræfter..." : "Bekræft"}
            </Button>
          </div>
          {error && (
            <p className="text-xs text-destructive mt-2 flex items-center gap-1.5">
              <AlertTriangle className="h-3.5 w-3.5" /> {error}
            </p>
          )}
        </div>
      </div>
    );
  }

  if (step === "done") {
    return (
      <div className="bg-card border border-emerald-500/30 rounded-xl p-5 space-y-4">
        <div className="flex items-start gap-3">
          <div className="w-10 h-10 rounded-xl bg-emerald-500/10 flex items-center justify-center shrink-0">
            <ShieldCheck className="h-5 w-5 text-emerald-600" />
          </div>
          <div>
            <h3 className="text-sm font-semibold">MFA er aktiveret 🎉</h3>
            <p className="text-xs text-muted-foreground mt-0.5">
              Gem dine 10 recovery-koder et sikkert sted (fx en password manager).
              Hver kode kan kun bruges én gang. Vi viser dem KUN nu.
            </p>
          </div>
        </div>

        <div className="bg-secondary/50 rounded-lg p-4">
          <div className="grid grid-cols-2 gap-2 font-mono text-sm">
            {recoveryCodes.map((c) => (
              <div key={c} className="px-3 py-2 bg-background rounded border border-border tracking-widest">
                {c.slice(0, 4)}-{c.slice(4)}
              </div>
            ))}
          </div>
        </div>

        <div className="flex gap-2">
          <Button type="button" variant="ghost" onClick={copyRecoveryCodes} className="flex-1">
            {copied ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
            {copied ? "Kopieret" : "Kopiér alle"}
          </Button>
          <Button
            type="button"
            onClick={() => window.location.reload()}
            className="flex-1"
          >
            Færdig
          </Button>
        </div>
      </div>
    );
  }

  return null;
}
