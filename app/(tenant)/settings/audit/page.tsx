import { AppTopbar } from "@/components/layout/AppTopbar";
import { PageHeader } from "@/components/shared/PageHeader";
import { BackButton } from "@/components/shared/BackButton";
import { AuditDetailDialog } from "@/components/audit/AuditDetailDialog";
import { db } from "@/lib/db";
import { auth } from "@/lib/auth";
import {
  ScrollText, User, Globe, AlertCircle, CheckCircle2, Ban, X,
  Filter, Users, Activity, ShieldAlert,
} from "lucide-react";
import Link from "next/link";

export const metadata = {
  title: "Audit-log — CRM-X",
};

const ACTION_LABEL: Record<string, string> = {
  login_success: "Login (OK)",
  login_failed:  "Login mislykket",
  logout:        "Logout",
  password_change: "Adgangskode ændret",
  password_reset_requested: "Password-reset anmodet",
  mfa_enable:    "MFA aktiveret",
  mfa_disable:   "MFA deaktiveret",
  create:        "Oprettet",
  update:        "Opdateret",
  delete:        "Slettet",
  soft_delete:   "Soft-deleted",
  restore:       "Gendannet",
  export:        "Eksporteret",
  erase:         "GDPR-sletning",
  rectify:       "GDPR-rettelse",
  access_request:"GDPR-indsigt",
  role_change:   "Rolle ændret",
  permission_change: "Rettigheder ændret",
  tenant_create: "Tenant oprettet",
  tenant_suspend:"Tenant suspenderet",
  tenant_activate:"Tenant aktiveret",
  module_change: "Moduler ændret",
  consent_given: "Samtykke givet",
  consent_withdrawn: "Samtykke trukket",
  config_change: "Konfiguration",
};

const RESOURCE_LABEL: Record<string, string> = {
  user:    "Bruger",
  tenant:  "Tenant",
  company: "Kunde",
  contact: "Kontakt",
  ticket:  "Ticket",
  project: "Projekt",
  invoice: "Faktura",
  quote:   "Tilbud",
  deal:    "Deal",
  product: "Produkt",
  license: "Licens",
  bundle:  "Klippekort",
  role:    "Rolle",
  apiToken:"API-token",
  session: "Session",
};

function OutcomeIcon({ outcome }: { outcome: string }) {
  if (outcome === "success") return <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600" />;
  if (outcome === "denied")  return <Ban className="h-3.5 w-3.5 text-amber-600" />;
  return <AlertCircle className="h-3.5 w-3.5 text-destructive" />;
}

export default async function AuditPage({
  searchParams,
}: {
  searchParams: Promise<{ action?: string; resource?: string; outcome?: string; actor?: string; since?: string }>;
}) {
  const session = await auth();
  if (!session?.user?.tenantId) return null;
  const tenantId = session.user.tenantId;
  const params = await searchParams;

  // ─── Filter ─────────────────────────────────────────────────
  const where: any = { tenantId };
  if (params.action)   where.action       = params.action;
  if (params.resource) where.resourceType = params.resource;
  if (params.outcome)  where.outcome      = params.outcome;
  if (params.actor)    where.actorEmail   = params.actor;
  if (params.since) {
    const days = Number(params.since);
    if (!isNaN(days)) {
      where.createdAt = { gte: new Date(Date.now() - days * 86400000) };
    }
  }

  // ─── Data-fetch (parallelt) ─────────────────────────────────
  const oneDayAgo = new Date(Date.now() - 86400000);

  const [logs, totalCount, last24h, deniedCount, failedCount, byActionRaw, distinctActors] = await Promise.all([
    db.auditLog.findMany({
      where,
      orderBy: { createdAt: "desc" },
      take: 200,
    }),
    db.auditLog.count({ where: { tenantId } }),
    db.auditLog.count({ where: { tenantId, createdAt: { gte: oneDayAgo } } }),
    db.auditLog.count({
      where: { tenantId, outcome: "denied", createdAt: { gte: oneDayAgo } },
    }),
    db.auditLog.count({
      where: { tenantId, outcome: { in: ["failure", "error"] }, createdAt: { gte: oneDayAgo } },
    }),
    db.auditLog.groupBy({
      by: ["action"],
      where: { tenantId, createdAt: { gte: new Date(Date.now() - 30 * 86400000) } },
      _count: true,
      orderBy: { _count: { action: "desc" } },
      take: 6,
    }),
    db.auditLog.findMany({
      where: { tenantId, actorEmail: { not: null }, createdAt: { gte: new Date(Date.now() - 30 * 86400000) } },
      distinct: ["actorEmail"],
      select: { actorEmail: true },
      take: 20,
    }),
  ]);

  const dateFmt = new Intl.DateTimeFormat("da-DK", {
    dateStyle: "short",
    timeStyle: "medium",
  });

  const hasFilter = !!(params.action || params.resource || params.outcome || params.actor || params.since);

  return (
    <>
      <AppTopbar pageTitle="Audit-log" />
      <BackButton href="/settings" />

      <div className="max-w-6xl space-y-5">
        <PageHeader
          title="Audit-log"
          description={`${totalCount.toLocaleString("da-DK")} hændelser registreret · opbevares i 13 måneder · GDPR Art. 30 + ISO 27001 A.8.15`}
        />

        {/* KPI strimmel */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <KpiCard label="Total" value={totalCount} icon={ScrollText} tone="slate" />
          <KpiCard label="Sidste 24 timer" value={last24h} icon={Activity} tone="blue" />
          <KpiCard label="Afvist (24t)" value={deniedCount} icon={Ban} tone={deniedCount > 0 ? "amber" : "slate"} />
          <KpiCard label="Fejlet (24t)" value={failedCount} icon={ShieldAlert} tone={failedCount > 0 ? "rose" : "slate"} />
        </div>

        {/* Top-handlinger sidste 30 dage */}
        {byActionRaw.length > 0 && (
          <div>
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">
              Mest aktive handlinger — sidste 30 dage
            </p>
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2">
              {byActionRaw.map((row) => (
                <Link
                  key={row.action}
                  href={`/settings/audit?action=${row.action}`}
                  className={`text-left p-3 rounded-lg border transition-colors ${
                    params.action === row.action
                      ? "bg-primary/5 border-primary/30"
                      : "border-border hover:border-primary/30 hover:bg-secondary/30"
                  }`}
                >
                  <p className="text-lg font-bold tabular-nums">{row._count.toLocaleString("da-DK")}</p>
                  <p className="text-xs text-muted-foreground truncate">
                    {ACTION_LABEL[row.action] ?? row.action}
                  </p>
                </Link>
              ))}
            </div>
          </div>
        )}

        {/* Filter-bar */}
        <div className="bg-card border border-border rounded-xl p-3">
          <div className="flex items-center gap-2 flex-wrap">
            <div className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground px-2">
              <Filter className="h-3.5 w-3.5" />
              Filter
            </div>

            {/* Outcome */}
            <FilterDropdown
              currentParams={params}
              filterKey="outcome"
              label="Status"
              options={[
                { value: "",        label: "Alle" },
                { value: "success", label: "Succes" },
                { value: "denied",  label: "Afvist" },
                { value: "failure", label: "Fejlet" },
                { value: "error",   label: "Fejl" },
              ]}
            />

            {/* Resource */}
            <FilterDropdown
              currentParams={params}
              filterKey="resource"
              label="Objekt"
              options={[
                { value: "", label: "Alle" },
                ...Object.entries(RESOURCE_LABEL).map(([v, l]) => ({ value: v, label: l })),
              ]}
            />

            {/* Tidsrum */}
            <FilterDropdown
              currentParams={params}
              filterKey="since"
              label="Periode"
              options={[
                { value: "",   label: "Alle tider" },
                { value: "1",  label: "Sidste 24t" },
                { value: "7",  label: "Sidste 7 dage" },
                { value: "30", label: "Sidste 30 dage" },
                { value: "90", label: "Sidste 90 dage" },
              ]}
            />

            {/* Aktør */}
            {distinctActors.length > 0 && (
              <FilterDropdown
                currentParams={params}
                filterKey="actor"
                label="Aktør"
                options={[
                  { value: "", label: "Alle aktører" },
                  ...distinctActors
                    .map((a) => a.actorEmail!)
                    .filter(Boolean)
                    .map((email) => ({ value: email, label: email })),
                ]}
              />
            )}

            {hasFilter && (
              <Link
                href="/settings/audit"
                className="ml-auto text-xs text-muted-foreground hover:text-foreground flex items-center gap-1 transition-colors"
              >
                <X className="h-3 w-3" />
                Ryd alle filtre
              </Link>
            )}
          </div>
        </div>

        {/* Tabel */}
        <div className="bg-card border border-border rounded-xl overflow-hidden">
          <div className="px-5 py-3 border-b border-border flex items-center justify-between">
            <div className="flex items-center gap-2">
              <ScrollText className="h-4 w-4 text-muted-foreground" />
              <h3 className="text-sm font-semibold">
                Hændelser ({logs.length})
              </h3>
            </div>
            <p className="text-xs text-muted-foreground">
              Klik på række for fuld detalje
            </p>
          </div>

          {logs.length === 0 ? (
            <div className="px-4 py-12 text-center text-sm text-muted-foreground">
              <ScrollText className="h-8 w-8 mx-auto mb-3 opacity-30" />
              Ingen hændelser matcher filteret
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border bg-secondary/20">
                    <th className="text-left px-4 py-2.5 text-[11px] font-semibold text-muted-foreground uppercase tracking-wide">Tidspunkt</th>
                    <th className="text-left px-4 py-2.5 text-[11px] font-semibold text-muted-foreground uppercase tracking-wide">Aktør</th>
                    <th className="text-left px-4 py-2.5 text-[11px] font-semibold text-muted-foreground uppercase tracking-wide">Handling</th>
                    <th className="text-left px-4 py-2.5 text-[11px] font-semibold text-muted-foreground uppercase tracking-wide">Objekt</th>
                    <th className="text-left px-4 py-2.5 text-[11px] font-semibold text-muted-foreground uppercase tracking-wide">IP</th>
                    <th className="text-left px-4 py-2.5 text-[11px] font-semibold text-muted-foreground uppercase tracking-wide">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {logs.map((log) => {
                    const actionLabel = ACTION_LABEL[log.action] ?? log.action;
                    return (
                      <AuditDetailDialog
                        key={log.id}
                        log={log as any}
                        actionLabel={actionLabel}
                        trigger={
                          <tr className="border-b border-border last:border-0 hover:bg-secondary/30 transition-colors cursor-pointer">
                            <td className="px-4 py-2.5 text-xs tabular-nums text-muted-foreground whitespace-nowrap">
                              {dateFmt.format(log.createdAt)}
                            </td>
                            <td className="px-4 py-2.5 text-xs">
                              <div className="flex items-center gap-1.5">
                                <User className="h-3 w-3 text-muted-foreground shrink-0" />
                                <span className="truncate max-w-[180px]">{log.actorEmail ?? "system"}</span>
                              </div>
                            </td>
                            <td className="px-4 py-2.5 text-xs font-medium">
                              {actionLabel}
                            </td>
                            <td className="px-4 py-2.5 text-xs">
                              <span className="font-mono text-muted-foreground">
                                {RESOURCE_LABEL[log.resourceType] ?? log.resourceType}
                              </span>
                              {log.resourceId && (
                                <span className="text-muted-foreground/70"> · {log.resourceId.slice(0, 8)}…</span>
                              )}
                            </td>
                            <td className="px-4 py-2.5 text-xs text-muted-foreground tabular-nums">
                              <div className="flex items-center gap-1">
                                <Globe className="h-3 w-3" /> {log.ipAddress ?? "—"}
                              </div>
                            </td>
                            <td className="px-4 py-2.5 text-xs">
                              <div className="flex items-center gap-1.5">
                                <OutcomeIcon outcome={log.outcome} />
                                <span className="capitalize text-muted-foreground">{log.outcome}</span>
                              </div>
                            </td>
                          </tr>
                        }
                      />
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>

        <p className="text-xs text-muted-foreground px-1">
          Logs er append-only og kan ikke ændres eller slettes manuelt. Sletning sker udelukkende via retention-job (13 mdr).
          Følsomme felter (passwords, tokens, API-keys) redact'es automatisk inden de gemmes.
        </p>
      </div>
    </>
  );
}

// ─── Sub-components ──────────────────────────────────────────

function KpiCard({
  label, value, icon: Icon, tone,
}: {
  label: string; value: number; icon: any; tone: "slate" | "blue" | "amber" | "rose";
}) {
  const tones: Record<string, { bg: string; text: string }> = {
    slate: { bg: "bg-slate-500/10", text: "text-slate-600" },
    blue:  { bg: "bg-blue-500/10",  text: "text-blue-600" },
    amber: { bg: "bg-amber-500/10", text: "text-amber-600" },
    rose:  { bg: "bg-rose-500/10",  text: "text-rose-600" },
  };
  const t = tones[tone];
  return (
    <div className="bg-card border border-border rounded-xl p-4 flex items-start justify-between">
      <div>
        <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">{label}</p>
        <p className="text-2xl font-bold tabular-nums mt-1">{value.toLocaleString("da-DK")}</p>
      </div>
      <div className={`w-8 h-8 rounded-lg ${t.bg} flex items-center justify-center shrink-0`}>
        <Icon className={`h-4 w-4 ${t.text}`} />
      </div>
    </div>
  );
}

function FilterDropdown({
  currentParams, filterKey, label, options,
}: {
  currentParams: Record<string, string | undefined>;
  filterKey: string;
  label: string;
  options: { value: string; label: string }[];
}) {
  const currentValue = currentParams[filterKey] ?? "";
  const currentLabel = options.find((o) => o.value === currentValue)?.label ?? "Alle";
  const active = !!currentValue;

  return (
    <div className="relative inline-block">
      <details className="group">
        <summary
          className={`list-none cursor-pointer text-xs px-2.5 py-1.5 rounded-md border transition-colors flex items-center gap-1.5 ${
            active
              ? "bg-primary/5 border-primary/30 text-foreground"
              : "border-border hover:bg-secondary/40 text-muted-foreground"
          }`}
        >
          <span className="font-medium">{label}:</span>
          <span>{currentLabel}</span>
        </summary>
        <div className="absolute top-full left-0 mt-1 bg-card border border-border rounded-lg shadow-lg z-10 py-1 min-w-[180px] max-h-64 overflow-y-auto">
          {options.map((opt) => {
            const params = new URLSearchParams(currentParams as any);
            if (opt.value) params.set(filterKey, opt.value);
            else           params.delete(filterKey);
            return (
              <Link
                key={opt.value}
                href={`/settings/audit?${params.toString()}`}
                className={`block px-3 py-1.5 text-xs hover:bg-secondary/40 transition-colors ${
                  opt.value === currentValue ? "bg-primary/5 font-medium text-primary" : "text-foreground"
                }`}
              >
                {opt.label}
              </Link>
            );
          })}
        </div>
      </details>
    </div>
  );
}
