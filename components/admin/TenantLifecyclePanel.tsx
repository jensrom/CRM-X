"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  CheckCircle2, Pause, Trash2, RotateCw, AlertTriangle, Download,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { TenantStatusBadge } from "./TenantStatusBadge";
import {
  activateTenant,
  suspendTenant,
  scheduleTenantForDeletion,
  cancelTenantDeletion,
  purgeTenant,
} from "@/app/actions/tenant-lifecycle";
import {
  getStatusDefinition,
  getAllowedTransitions,
  type TenantStatus,
} from "@/lib/tenant-status";

interface Props {
  tenantId: string;
  tenantSlug: string;
  tenantName: string;
  status: TenantStatus;
  trialEndsAt: Date | string | null;
  scheduledDeletionAt: Date | string | null;
  suspendedAt: Date | string | null;
}

export function TenantLifecyclePanel({
  tenantId,
  tenantSlug,
  tenantName,
  status,
  trialEndsAt,
  scheduledDeletionAt,
  suspendedAt,
}: Props) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [reason, setReason] = useState("");
  const [showPurge, setShowPurge] = useState(false);
  const [purgeConfirm, setPurgeConfirm] = useState("");

  const def = getStatusDefinition(status);
  const allowed = getAllowedTransitions(status);
  const expectedPurgePhrase = `SLET ${tenantSlug}`;

  function handle(action: () => Promise<{ ok: boolean; error?: string }>) {
    setError(null);
    startTransition(async () => {
      try {
        const res = await action();
        if (!res.ok) setError(res.error ?? "Handling fejlede");
        else {
          setReason("");
          router.refresh();
        }
      } catch (e: any) {
        setError(e?.message ?? "Uventet fejl");
      }
    });
  }

  return (
    <div className="bg-card border border-border rounded-xl overflow-hidden">
      {/* Header */}
      <div className="px-5 py-4 border-b border-border flex items-center justify-between">
        <div>
          <h3 className="text-sm font-semibold mb-1">Status & livscyklus</h3>
          <p className="text-xs text-muted-foreground">{def.description}</p>
        </div>
        <TenantStatusBadge
          status={status}
          trialEndsAt={trialEndsAt}
          scheduledDeletionAt={scheduledDeletionAt}
        />
      </div>

      {/* Body */}
      <div className="p-5 space-y-4">
        {/* Tilstands-info */}
        <dl className="grid grid-cols-2 gap-3 text-xs">
          {trialEndsAt && (
            <div>
              <dt className="text-muted-foreground mb-0.5">Trial udløber</dt>
              <dd className="font-medium">
                {new Date(trialEndsAt).toLocaleDateString("da-DK", {
                  day: "numeric",
                  month: "long",
                  year: "numeric",
                })}
              </dd>
            </div>
          )}
          {suspendedAt && (
            <div>
              <dt className="text-muted-foreground mb-0.5">Suspenderet</dt>
              <dd className="font-medium">
                {new Date(suspendedAt).toLocaleDateString("da-DK", {
                  day: "numeric",
                  month: "long",
                  year: "numeric",
                })}
              </dd>
            </div>
          )}
          {scheduledDeletionAt && (
            <div className="col-span-2">
              <dt className="text-destructive/80 mb-0.5">Planlagt slettet</dt>
              <dd className="font-medium text-destructive">
                {new Date(scheduledDeletionAt).toLocaleDateString("da-DK", {
                  day: "numeric",
                  month: "long",
                  year: "numeric",
                })}
              </dd>
            </div>
          )}
          <div className="col-span-2">
            <dt className="text-muted-foreground mb-0.5">Data-tilgang</dt>
            <dd className="font-medium">
              {def.dataAccess === "full" && "Fuld — alle moduler aktive"}
              {def.dataAccess === "read_only" && "Kun læseadgang for tenant-brugere"}
              {def.dataAccess === "export_only" && "Tenant låst — kun super-admin kan eksportere"}
              {def.dataAccess === "purged" && "Data slettet endeligt"}
            </dd>
          </div>
        </dl>

        {error && (
          <div className="flex items-start gap-2 p-3 bg-destructive/10 border border-destructive/20 rounded-lg">
            <AlertTriangle className="h-4 w-4 text-destructive shrink-0 mt-0.5" />
            <p className="text-sm text-destructive">{error}</p>
          </div>
        )}

        {/* Begrundelse (deles af alle handlinger) */}
        {(allowed.length > 0 || status === "scheduled_deletion") && status !== "deleted" && (
          <div>
            <label className="block text-xs font-medium text-muted-foreground mb-1.5">
              Begrundelse (audit-log)
            </label>
            <input
              type="text"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="fx 'betalt 8.6.2026' eller 'manglende betaling 60 dage'"
              className="w-full px-3 py-2 rounded-lg border border-input bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring"
            />
          </div>
        )}

        {/* Handlinger */}
        <div className="flex flex-wrap gap-2">
          {allowed.includes("active") && (
            <Button
              type="button"
              size="md"
              onClick={() => handle(() => activateTenant(tenantId, reason))}
              disabled={isPending}
              className="bg-emerald-600 hover:bg-emerald-700 text-white"
            >
              <CheckCircle2 className="h-4 w-4" />
              {status === "trial" ? "Aktivér (betalt)" : "Genaktivér"}
            </Button>
          )}
          {allowed.includes("suspended") && status !== "scheduled_deletion" && (
            <Button
              type="button"
              size="md"
              variant="ghost"
              onClick={() => handle(() => suspendTenant(tenantId, reason))}
              disabled={isPending}
              className="border border-amber-500/30 text-amber-700 hover:bg-amber-500/10"
            >
              <Pause className="h-4 w-4" />
              Suspendér
            </Button>
          )}
          {status === "scheduled_deletion" && (
            <Button
              type="button"
              size="md"
              variant="ghost"
              onClick={() => handle(() => cancelTenantDeletion(tenantId, reason))}
              disabled={isPending}
              className="border border-emerald-500/30 text-emerald-700 hover:bg-emerald-500/10"
            >
              <RotateCw className="h-4 w-4" />
              Fortryd sletning
            </Button>
          )}
          {allowed.includes("scheduled_deletion") && (
            <Button
              type="button"
              size="md"
              variant="ghost"
              onClick={() => handle(() => scheduleTenantForDeletion(tenantId, reason))}
              disabled={isPending}
              className="border border-destructive/30 text-destructive hover:bg-destructive/10"
            >
              <Trash2 className="h-4 w-4" />
              Planlæg sletning (60d cooldown)
            </Button>
          )}
          <a href={`/admin/tenants/${tenantId}/export`}>
            <Button type="button" size="md" variant="ghost">
              <Download className="h-4 w-4" />
              Eksportér data
            </Button>
          </a>
        </div>

        {/* Hard-purge — eskaleret med bekræftelse */}
        {status === "scheduled_deletion" && (
          <div className="border-t border-border pt-4">
            {!showPurge ? (
              <button
                type="button"
                onClick={() => setShowPurge(true)}
                className="text-xs text-destructive/70 hover:text-destructive underline"
              >
                Vis eskaleret handling (slet nu)
              </button>
            ) : (
              <div className="bg-destructive/5 border border-destructive/30 rounded-lg p-3 space-y-2">
                <div className="flex items-start gap-2">
                  <AlertTriangle className="h-4 w-4 text-destructive shrink-0 mt-0.5" />
                  <p className="text-xs text-destructive font-medium">
                    Slet endeligt nu — kan ikke fortrydes
                  </p>
                </div>
                <p className="text-xs text-muted-foreground">
                  Normalt sker hard-sletning automatisk efter 60-dages cooldown. Skriv{" "}
                  <code className="bg-secondary px-1.5 py-0.5 rounded font-mono text-xs">
                    {expectedPurgePhrase}
                  </code>{" "}
                  for at slette nu.
                </p>
                <input
                  type="text"
                  value={purgeConfirm}
                  onChange={(e) => setPurgeConfirm(e.target.value)}
                  placeholder={expectedPurgePhrase}
                  className="w-full px-3 py-1.5 rounded border border-destructive/30 bg-background text-sm font-mono focus:outline-none focus:ring-2 focus:ring-destructive/40"
                />
                <div className="flex gap-2">
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => {
                      setShowPurge(false);
                      setPurgeConfirm("");
                    }}
                  >
                    Annullér
                  </Button>
                  <Button
                    type="button"
                    size="sm"
                    onClick={() =>
                      handle(() => purgeTenant(tenantId, purgeConfirm, reason))
                    }
                    disabled={isPending || purgeConfirm !== expectedPurgePhrase}
                    className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                    Slet {tenantName} nu
                  </Button>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
