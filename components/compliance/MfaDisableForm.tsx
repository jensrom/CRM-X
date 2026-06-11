"use client";

import { useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { disableMfa } from "@/app/actions/mfa";
import { ShieldOff, AlertTriangle } from "lucide-react";

export function MfaDisableForm() {
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function handleDisable() {
    if (!password) return setError("Indtast din nuværende adgangskode");
    setError(null);
    startTransition(async () => {
      try {
        await disableMfa(password);
        window.location.reload();
      } catch (e: any) {
        setError(e?.message ?? "Kunne ikke deaktivere MFA");
      }
    });
  }

  return (
    <div className="bg-card border border-destructive/30 rounded-xl p-5 space-y-3">
      <h3 className="text-sm font-semibold flex items-center gap-2">
        <ShieldOff className="h-4 w-4 text-destructive" />
        Deaktivér MFA
      </h3>
      <p className="text-xs text-muted-foreground">
        Sænker sikkerheden på din konto. Anbefales ikke for konti der har adgang til kundedata.
      </p>

      <label className="flex items-start gap-2 cursor-pointer pt-2">
        <input
          type="checkbox"
          checked={confirm}
          onChange={(e) => setConfirm(e.target.checked)}
          className="mt-0.5 accent-destructive"
        />
        <span className="text-xs">Jeg forstår at min konto bliver mindre sikker</span>
      </label>

      {confirm && (
        <div className="space-y-2 pt-2">
          <Input
            type="password"
            label="Bekræft med din adgangskode"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
          <Button
            type="button"
            variant="ghost"
            onClick={handleDisable}
            disabled={isPending || !password}
            className="w-full text-destructive hover:bg-destructive/10"
          >
            {isPending ? "Deaktiverer..." : "Deaktivér MFA"}
          </Button>
          {error && (
            <p className="text-xs text-destructive flex items-center gap-1.5">
              <AlertTriangle className="h-3.5 w-3.5" /> {error}
            </p>
          )}
        </div>
      )}
    </div>
  );
}
