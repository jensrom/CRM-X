import { AppTopbar } from "@/components/layout/AppTopbar";
import { PageHeader } from "@/components/shared/PageHeader";
import { BackButton } from "@/components/shared/BackButton";
import { db } from "@/lib/db";
import { auth } from "@/lib/auth";
import { ScrollText, User, Globe, AlertCircle, CheckCircle2, Ban } from "lucide-react";

export const metadata = {
  title: "Audit-log — CRM-X",
};

const ACTION_LABEL: Record<string, string> = {
  login_success: "Login (OK)",
  login_failed: "Login mislykket",
  logout: "Logout",
  password_change: "Adgangskode ændret",
  password_reset_requested: "Reset anmodet",
  mfa_enable: "MFA aktiveret",
  mfa_disable: "MFA deaktiveret",
  create: "Oprettet",
  update: "Opdateret",
  delete: "Slettet",
  soft_delete: "Soft-deleted",
  restore: "Gendannet",
  export: "Eksporteret",
  erase: "GDPR-sletning",
  rectify: "GDPR-rettelse",
  access_request: "GDPR-indsigt",
  role_change: "Rolle ændret",
  permission_change: "Rettigheder ændret",
  tenant_create: "Tenant oprettet",
  tenant_suspend: "Tenant suspenderet",
  tenant_activate: "Tenant aktiveret",
  module_change: "Moduler ændret",
  consent_given: "Samtykke givet",
  consent_withdrawn: "Samtykke trukket",
  config_change: "Konfiguration",
};

function OutcomeIcon({ outcome }: { outcome: string }) {
  if (outcome === "success") return <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600" />;
  if (outcome === "denied") return <Ban className="h-3.5 w-3.5 text-amber-600" />;
  return <AlertCircle className="h-3.5 w-3.5 text-destructive" />;
}

export default async function AuditPage({
  searchParams,
}: {
  searchParams: Promise<{ action?: string; resource?: string; outcome?: string }>;
}) {
  const session = await auth();
  if (!session?.user?.tenantId) return null;
  const tenantId = session.user.tenantId;
  const params = await searchParams;

  const where: any = { tenantId };
  if (params.action) where.action = params.action;
  if (params.resource) where.resourceType = params.resource;
  if (params.outcome) where.outcome = params.outcome;

  const [logs, totalCount, byActionRaw] = await Promise.all([
    db.auditLog.findMany({
      where,
      orderBy: { createdAt: "desc" },
      take: 200,
    }),
    db.auditLog.count({ where: { tenantId } }),
    db.auditLog.groupBy({
      by: ["action"],
      where: { tenantId, createdAt: { gte: new Date(Date.now() - 30 * 86400000) } },
      _count: true,
      orderBy: { _count: { action: "desc" } },
      take: 6,
    }),
  ]);

  const dateFmt = new Intl.DateTimeFormat("da-DK", {
    dateStyle: "short",
    timeStyle: "medium",
  });

  return (
    <>
      <AppTopbar pageTitle="Audit-log" />
      <BackButton href="/settings" label="Indstillinger" />
      <PageHeader
        title="Audit-log"
        description={`${totalCount} hændelser registreret · opbevares i 13 måneder`}
      />

      {/* Stats-strimmel — top-handlinger sidste 30 dage */}
      <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-6 gap-3 mb-6 max-w-5xl">
        {byActionRaw.map((row) => (
          <div key={row.action} className="bg-card border border-border rounded-xl p-3">
            <p className="text-lg font-bold tabular-nums">{row._count}</p>
            <p className="text-xs text-muted-foreground">{ACTION_LABEL[row.action] ?? row.action}</p>
          </div>
        ))}
      </div>

      {/* Tabel */}
      <div className="bg-card border border-border rounded-xl overflow-hidden max-w-5xl">
        <div className="px-5 py-3 border-b border-border flex items-center justify-between">
          <div className="flex items-center gap-2">
            <ScrollText className="h-4 w-4 text-muted-foreground" />
            <h3 className="text-sm font-semibold">Seneste hændelser</h3>
          </div>
          <p className="text-xs text-muted-foreground">Viser op til 200 nyeste</p>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border bg-secondary/20">
                <th className="text-left px-4 py-2.5 text-xs font-semibold text-muted-foreground">Tidspunkt</th>
                <th className="text-left px-4 py-2.5 text-xs font-semibold text-muted-foreground">Aktør</th>
                <th className="text-left px-4 py-2.5 text-xs font-semibold text-muted-foreground">Handling</th>
                <th className="text-left px-4 py-2.5 text-xs font-semibold text-muted-foreground">Objekt</th>
                <th className="text-left px-4 py-2.5 text-xs font-semibold text-muted-foreground">IP</th>
                <th className="text-left px-4 py-2.5 text-xs font-semibold text-muted-foreground">Status</th>
              </tr>
            </thead>
            <tbody>
              {logs.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-4 py-8 text-center text-muted-foreground text-xs">
                    Ingen hændelser endnu
                  </td>
                </tr>
              ) : (
                logs.map((log) => (
                  <tr key={log.id} className="border-b border-border last:border-0 hover:bg-secondary/30 transition-colors">
                    <td className="px-4 py-2.5 text-xs tabular-nums text-muted-foreground whitespace-nowrap">
                      {dateFmt.format(log.createdAt)}
                    </td>
                    <td className="px-4 py-2.5 text-xs">
                      <div className="flex items-center gap-1.5">
                        <User className="h-3 w-3 text-muted-foreground" />
                        <span className="truncate max-w-[180px]">{log.actorEmail ?? "system"}</span>
                      </div>
                    </td>
                    <td className="px-4 py-2.5 text-xs font-medium">
                      {ACTION_LABEL[log.action] ?? log.action}
                    </td>
                    <td className="px-4 py-2.5 text-xs">
                      <span className="font-mono text-muted-foreground">{log.resourceType}</span>
                      {log.resourceId && (
                        <span className="text-muted-foreground"> · {log.resourceId.slice(0, 8)}…</span>
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
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </>
  );
}
