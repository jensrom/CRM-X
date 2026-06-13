import { db } from "@/lib/db";
import Link from "next/link";
import { Activity, LogIn, UserPlus, Building2, Ticket, FolderKanban, TrendingUp } from "lucide-react";
import { formatDate } from "@/lib/utils";

/**
 * Aktivitet — tværgående indsigt i hvad der sker på platformen.
 * Vi læser KUN audit-log og _count på tværs af tenants — aldrig kunde-data.
 */
export default async function AdminInsightsActivityPage() {
  const since30d = new Date(Date.now() - 30 * 86400_000);
  const since7d = new Date(Date.now() - 7 * 86400_000);

  const [
    loginsLast7d,
    loginsLast30d,
    creationsLast7d,
    failedLoginsLast7d,
    recentLogins,
    recentCreations,
    activeTenants,
    topTenantsByActivity,
  ] = await Promise.all([
    db.auditLog.count({ where: { action: "login_success", createdAt: { gte: since7d } } }),
    db.auditLog.count({ where: { action: "login_success", createdAt: { gte: since30d } } }),
    db.auditLog.count({ where: { action: "create", createdAt: { gte: since7d } } }),
    db.auditLog.count({ where: { action: "login_failed", createdAt: { gte: since7d } } }),
    db.auditLog.findMany({
      where: { action: "login_success" },
      orderBy: { createdAt: "desc" },
      take: 12,
      select: { actorEmail: true, ipAddress: true, createdAt: true, tenantId: true },
    }),
    db.auditLog.findMany({
      where: { action: "create" },
      orderBy: { createdAt: "desc" },
      take: 10,
      select: { actorEmail: true, resourceType: true, createdAt: true, tenantId: true },
    }),
    db.tenant.count({ where: { status: "active" } }),
    db.auditLog.groupBy({
      by: ["tenantId"],
      where: { createdAt: { gte: since7d }, tenantId: { not: null } },
      _count: true,
      orderBy: { _count: { tenantId: "desc" } },
      take: 8,
    }),
  ]);

  // Map tenantIds → names
  const tenantIds = topTenantsByActivity.map((t) => t.tenantId!).filter(Boolean);
  const tenantNames = tenantIds.length
    ? await db.tenant.findMany({
        where: { id: { in: tenantIds } },
        select: { id: true, name: true, slug: true },
      })
    : [];
  const nameById = Object.fromEntries(tenantNames.map((t) => [t.id, t]));

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-semibold">Aktivitet</h1>
        <p className="text-sm text-muted-foreground mt-0.5">
          Logins, oprettelser og brugerbevægelser på tværs af alle tenants.
        </p>
      </div>

      {/* KPI */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <Kpi label="Logins sidste 7d" value={loginsLast7d} sub={`${loginsLast30d} sidste 30d`} icon={LogIn} color="bg-blue-500/10 text-blue-600" />
        <Kpi label="Oprettelser sidste 7d" value={creationsLast7d} sub="kunde, ticket, kontakt..." icon={UserPlus} color="bg-emerald-500/10 text-emerald-600" />
        <Kpi label="Fejlede logins" value={failedLoginsLast7d} sub="Sidste 7d — overvåg" icon={Activity} color={failedLoginsLast7d > 10 ? "bg-rose-500/10 text-rose-600" : "bg-amber-500/10 text-amber-600"} />
        <Kpi label="Aktive tenants" value={activeTenants} sub="Med login sidste 30d" icon={TrendingUp} color="bg-violet-500/10 text-violet-600" />
      </div>

      {/* Top-tenants på aktivitet */}
      <div className="bg-card border border-border rounded-xl overflow-hidden">
        <div className="px-5 py-3.5 border-b border-border">
          <h3 className="text-sm font-semibold">Mest aktive tenants (sidste 7 dage)</h3>
        </div>
        <div className="divide-y divide-border">
          {topTenantsByActivity.map((t) => {
            const tn = t.tenantId ? nameById[t.tenantId] : null;
            return (
              <div key={t.tenantId} className="px-5 py-3 flex items-center gap-3">
                <Building2 className="h-4 w-4 text-muted-foreground shrink-0" />
                <div className="flex-1 min-w-0">
                  {tn ? (
                    <Link href={`/admin/tenants/${tn.id}`} className="text-sm font-medium hover:text-primary transition-colors">
                      {tn.name}
                      <span className="font-mono text-[10px] text-muted-foreground ml-2">{tn.slug}</span>
                    </Link>
                  ) : (
                    <span className="text-sm text-muted-foreground">— ukendt —</span>
                  )}
                </div>
                <span className="text-sm font-semibold tabular-nums">{t._count}</span>
                <span className="text-xs text-muted-foreground">events</span>
              </div>
            );
          })}
          {topTenantsByActivity.length === 0 && (
            <p className="px-5 py-8 text-center text-sm text-muted-foreground">
              Ingen aktivitet endnu.
            </p>
          )}
        </div>
      </div>

      {/* To kolonner: logins + oprettelser */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        <div className="bg-card border border-border rounded-xl overflow-hidden">
          <div className="px-5 py-3.5 border-b border-border">
            <h3 className="text-sm font-semibold">Seneste logins</h3>
          </div>
          <div className="divide-y divide-border">
            {recentLogins.map((l, i) => (
              <div key={i} className="px-5 py-2.5 flex items-center gap-3">
                <LogIn className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="text-xs truncate font-medium">{l.actorEmail ?? "—"}</p>
                  <p className="text-[10px] text-muted-foreground">
                    {l.ipAddress ?? "—"} · {formatDate(l.createdAt)}
                  </p>
                </div>
              </div>
            ))}
            {recentLogins.length === 0 && (
              <p className="px-5 py-8 text-center text-sm text-muted-foreground">Ingen events</p>
            )}
          </div>
        </div>

        <div className="bg-card border border-border rounded-xl overflow-hidden">
          <div className="px-5 py-3.5 border-b border-border">
            <h3 className="text-sm font-semibold">Seneste oprettelser</h3>
          </div>
          <div className="divide-y divide-border">
            {recentCreations.map((l, i) => (
              <div key={i} className="px-5 py-2.5 flex items-center gap-3">
                {l.resourceType === "ticket" ? <Ticket className="h-3.5 w-3.5 text-muted-foreground" /> :
                 l.resourceType === "project" ? <FolderKanban className="h-3.5 w-3.5 text-muted-foreground" /> :
                 <Building2 className="h-3.5 w-3.5 text-muted-foreground" />}
                <div className="flex-1 min-w-0">
                  <p className="text-xs truncate font-medium">
                    <span className="text-muted-foreground">{l.resourceType}</span> — {l.actorEmail ?? "—"}
                  </p>
                  <p className="text-[10px] text-muted-foreground">{formatDate(l.createdAt)}</p>
                </div>
              </div>
            ))}
            {recentCreations.length === 0 && (
              <p className="px-5 py-8 text-center text-sm text-muted-foreground">Ingen events</p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function Kpi({ label, value, sub, icon: Icon, color }: { label: string; value: number; sub?: string; icon: any; color: string }) {
  return (
    <div className="bg-card border border-border rounded-xl p-5">
      <div className={`w-9 h-9 rounded-lg flex items-center justify-center mb-3 ${color}`}>
        <Icon className="h-4 w-4" />
      </div>
      <p className="text-2xl font-bold tabular-nums">{value}</p>
      <p className="text-sm text-foreground mt-0.5">{label}</p>
      {sub && <p className="text-xs text-muted-foreground mt-0.5">{sub}</p>}
    </div>
  );
}
