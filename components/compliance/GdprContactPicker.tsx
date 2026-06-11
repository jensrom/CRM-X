"use client";

import { useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Download, Trash2, AlertTriangle } from "lucide-react";
import { exportContactData, eraseContact } from "@/app/actions/gdpr";

interface Props {
  mode: "export" | "erase";
  tenantId: string;
}

/**
 * Letvægts client-component der lader admin udføre GDPR-handling
 * direkte fra compliance-portal'en. Vi tager kontakt-id som input
 * (UI viser en full-text picker i en senere iteration).
 */
export function GdprContactPicker({ mode }: Props) {
  const [contactId, setContactId] = useState("");
  const [reason, setReason] = useState("");
  const [confirmText, setConfirmText] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function handleExport() {
    if (!contactId) return setError("Indtast kontakt-ID");
    setError(null);
    startTransition(async () => {
      try {
        const json = await exportContactData(contactId);
        // Download som fil
        const blob = new Blob([json], { type: "application/json" });
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = `gdpr-export-${contactId}-${new Date().toISOString().slice(0, 10)}.json`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
        setContactId("");
      } catch (e: any) {
        setError(e?.message ?? "Kunne ikke eksportere");
      }
    });
  }

  function handleErase() {
    if (!contactId) return setError("Indtast kontakt-ID");
    if (confirmText !== "SLET") return setError("Skriv SLET for at bekræfte");
    setError(null);
    startTransition(async () => {
      try {
        await eraseContact(contactId, reason);
        setContactId("");
        setReason("");
        setConfirmText("");
      } catch (e: any) {
        setError(e?.message ?? "Kunne ikke slette");
      }
    });
  }

  return (
    <div className="space-y-3">
      <Input
        label="Kontakt-ID"
        placeholder="cuid..."
        value={contactId}
        onChange={(e) => setContactId(e.target.value)}
      />

      {mode === "erase" && (
        <>
          <Input
            label="Begrundelse (audit-log)"
            placeholder="Fx: Anmodning modtaget pr. mail 03-06-2026"
            value={reason}
            onChange={(e) => setReason(e.target.value)}
          />
          <div className="bg-destructive/5 border border-destructive/20 rounded-lg p-3 text-xs">
            <div className="flex items-start gap-2 mb-2">
              <AlertTriangle className="h-3.5 w-3.5 text-destructive shrink-0 mt-0.5" />
              <span className="text-destructive">
                Denne handling kan ikke fortrydes. Skriv <span className="font-mono font-semibold">SLET</span> for at bekræfte.
              </span>
            </div>
            <Input
              placeholder="SLET"
              value={confirmText}
              onChange={(e) => setConfirmText(e.target.value)}
            />
          </div>
        </>
      )}

      {error && (
        <p className="text-xs text-destructive flex items-center gap-1.5">
          <AlertTriangle className="h-3.5 w-3.5" /> {error}
        </p>
      )}

      {mode === "export" ? (
        <Button
          type="button"
          size="md"
          onClick={handleExport}
          disabled={isPending}
          className="w-full"
        >
          <Download className="h-3.5 w-3.5" />
          {isPending ? "Eksporterer..." : "Eksportér som JSON"}
        </Button>
      ) : (
        <Button
          type="button"
          size="md"
          variant="ghost"
          onClick={handleErase}
          disabled={isPending || confirmText !== "SLET"}
          className="w-full text-destructive hover:bg-destructive/10"
        >
          <Trash2 className="h-3.5 w-3.5" />
          {isPending ? "Sletter..." : "Slet og anonymisér"}
        </Button>
      )}
    </div>
  );
}
