"use client";

/**
 * CreateUserDialog
 * ────────────────
 * Modal til at oprette en ny bruger paa tenanten.
 * Validerer license-cap server-side — hvis ingen frie pladser viser vi
 * fejlen i modalen og oprettelsen afvises.
 */

import { useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { UserPlus, X, Loader2 } from "lucide-react";
import { createTenantUser } from "@/app/actions/settings";

interface Role {
  id: string;
  name: string;
}

interface Props {
  roles: Role[];
  disabled?: boolean;
  disabledReason?: string;
}

export function CreateUserDialog({ roles, disabled = false, disabledReason }: Props) {
  const [open, setOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function handleSubmit(formData: FormData) {
    setError(null);
    startTransition(async () => {
      try {
        await createTenantUser(formData);
        setOpen(false);
      } catch (e: any) {
        setError(e?.message ?? "Kunne ikke oprette bruger.");
      }
    });
  }

  return (
    <>
      <Button
        size="sm"
        onClick={() => setOpen(true)}
        disabled={disabled}
        title={disabled ? disabledReason : undefined}
      >
        <UserPlus className="h-3.5 w-3.5" /> Opret ny bruger
      </Button>

      {open && (
        <div
          className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4"
          onClick={() => !pending && setOpen(false)}
        >
          <div
            className="bg-card border border-border rounded-xl shadow-xl max-w-md w-full p-6"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-start gap-3 mb-4">
              <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
                <UserPlus className="h-5 w-5 text-primary" />
              </div>
              <div className="flex-1">
                <h2 className="font-semibold">Opret ny bruger</h2>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Brugeren faar tildelt rollen og kan logge ind med det samme.
                </p>
              </div>
              <button
                type="button"
                onClick={() => !pending && setOpen(false)}
                className="text-muted-foreground hover:text-foreground p-1"
                disabled={pending}
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <form action={handleSubmit} className="space-y-3">
              <div className="space-y-1">
                <label className="text-xs font-medium text-foreground">
                  Navn <span className="text-destructive">*</span>
                </label>
                <input
                  name="name"
                  required
                  autoFocus
                  placeholder="fx Anders Knudsen"
                  className="w-full px-3 py-2 rounded-lg border border-input bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-medium text-foreground">
                  Email <span className="text-destructive">*</span>
                </label>
                <input
                  name="email"
                  type="email"
                  required
                  placeholder="anders@dindomain.dk"
                  className="w-full px-3 py-2 rounded-lg border border-input bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-medium text-foreground">
                  Password <span className="text-destructive">*</span>
                </label>
                <input
                  name="password"
                  type="password"
                  required
                  minLength={8}
                  placeholder="Mindst 8 tegn"
                  className="w-full px-3 py-2 rounded-lg border border-input bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                />
                <p className="text-[11px] text-muted-foreground">
                  Brugeren kan selv skifte password efter login.
                </p>
              </div>

              <div className="space-y-1">
                <label className="text-xs font-medium text-foreground">Rolle</label>
                <select
                  name="roleId"
                  className="w-full px-3 py-2 rounded-lg border border-input bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                >
                  <option value="">Ingen rolle (begraenset adgang)</option>
                  {roles.map((r) => (
                    <option key={r.id} value={r.id}>{r.name}</option>
                  ))}
                </select>
              </div>

              {error && (
                <div className="rounded-lg bg-destructive/10 border border-destructive/20 px-3 py-2">
                  <p className="text-sm text-destructive">{error}</p>
                </div>
              )}

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-border">
                <Button type="button" variant="ghost" size="sm" onClick={() => setOpen(false)} disabled={pending}>
                  Annullér
                </Button>
                <Button type="submit" size="sm" disabled={pending}>
                  {pending
                    ? <><Loader2 className="h-3.5 w-3.5 animate-spin" /> Opretter…</>
                    : <><UserPlus className="h-3.5 w-3.5" /> Opret bruger</>}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
