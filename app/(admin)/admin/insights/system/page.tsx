import { db } from "@/lib/db";
import Link from "next/link";
import { ServerCog, ShieldCheck, KeyRound, AlertTriangle, PauseCircle, Lock } from "lucide-react";
import { formatDate } from "@/lib/utils";

/**
 * System — sundhedstjek på sikkerhed og lifecycle.
 *
 * Vi læser KUN platformdata (User-flags, Tenant-status, audit-log).
 */
export default async function AdminInsightsSystemPage() {
  const since7d = new Date(Date.now() - 7 * 86400_000);

  const [
    suspendedTenants,
    scheduledDeletion,
    totalUsers,
    mfaEnabledUsers,
    lockedUsers,
    failedLogins7d,
    suspendedList,
    recentLockouts,
  ] = await Promise.all([
    db.tenant.count({ where: { status: "suspended" } }),
    db.tenant.count({ where: { status: "scheduled_deletion" } }),
    db.user.count({ where: { isActive: true } }),
    db.user.count({ where: { isActive: true, mfaEnabled: true } }),
    db.user.count({ where: { lockedUntil: { gt: new Date() } } }),
    db.auditLog.count({ where: { action: "login_failed", createdAt: { gte: since7d } } }),
    db.tenant.findMany({
      where: { status: { in: ["suspended", "scheduled_deletion"] } },
      orderBy: { suspendedAt: "desc" },
      take: 10,
      select: {
        id: true,
        name: true,
        slug: true,
        status: true,
        suspendedAt: true,
        scheduledDeletionAt: true,
      },
    }),
    db.user.findMany({
      where: { lockedUntil: { gt: new Date() } },
      orderBy: { lockedUntil: "desc" },
      take: 8,
      select: {
        id: true,
        email: true,
        failedLoginCount: true,
        lockedUntil: true,
        tenant: { select: { name: true, slug: true } },
      },
    }),
  ]);

  const mfaCoverage = totalUsers > 0 ? (mfaEnabledUsers / totalUsers) * 100 : 0;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-semibold">System</h1>
        <p className="text-sm text-muted-foreground mt-0.5">
          Sikkerhed, lifecycle-status og fejlede logins på tværs af platformen.
        </p>
      </div>

      {/* KPI */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <Kpi
          label="Suspenderede tenants"
          value={suspendedTenants}
          sub={`${scheduledDeletion} venter på sletning`}
          icon={PauseCircle}
          color={suspendedTenants > 0 ? "bg-amber-500/10 text-amber-600" : "bg-emerald-500/10 text-emerald-600"}
        />
        <Kpi
          label="MFA-dækning"
          value={`${mfaCoverage.toFixed(0)}%`}
          sub={`${mfaEnabledUsers} af ${totalUsers} brugere`}
          icon={ShieldCheck}
          color={mfaCoverage >= 80 ? "bg-emerald-500/10 text-emerald-600" : "bg-amber-500/10 text-amber-600"}
        />
        <Kpi
          label="Låste konti"
          value={lockedUsers}
          sub="Brute-force beskyttelse aktiv"
          icon={Lock}
          color={lockedUsers > 0 ? "bg-rose-500/10 text-rose-600" : "bg-muted/50 text-muted-foreground"}
        />
        <Kpi
          label="Fejlede logins (7d)"
          value={failedLogins7d}
          sub="Overvåg for angreb"
          icon={AlertTriangle}
          color={failedLogins7d > 50 ? "bg-rose-500/10 text-rose-600" : "bg-amber-500/10 text-amber-600"}
        />
      </div>

      {/* Suspenderede tenants */}
      {suspendedList.length > 0 && (
        <div className="bg-card border border-border rounded-xl overflow-hidden">
          <div className="px-5 py-3.5 border-b border-border">
            <h3 className="text-sm font-semibold">Suspenderede / planlagt slettet</h3>
          </div>
          <div className="divide-y divide-border">
            {suspendedList.map((t) => (
              <Link
                key={t.id}
                href={`/admin/tenants/${t.id}`}
                className="px-5 py-3 flex items-center gap-3 hover:bg-secondary/20 transition-colors"
              >
                <PauseCircle className="h-4 w-4 text-amber-600 shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-sm">{t.name}</p>
                  <p className="text-xs text-muted-foreground font-mono">{t.slug}.plesnertech.dk</p>
                </div>
                <span className="text-xs text-muted-foreground">
                  {t.status === "scheduled_deletion" && t.scheduledDeletionAt ? (
                    <>Slettes {formatDate(t.scheduledDeletionAt)}</>
                  ) : t.suspendedAt ? (
                    <>Suspenderet {formatDate(t.suspendedAt)}</>
                  ) : null}
                </span>
              </Link>
            ))}
          </div>
        </div>
      )}

      {/* Låste konti */}
      {recentLockouts.length > 0 && (
        <div className="bg-card border border-border rounded-xl overflow-hidden">
          <div className="px-5 py-3.5 border-b border-border">
            <h3 className="text-sm font-semibold">Aktuelt låste konti</h3>
          </div>
          <div className="divide-y divide-border">
            {recentLockouts.map((u) => (
              <div key={u.id} className="px-5 py-3 flex items-center gap-3">
                <KeyRound className="h-4 w-4 text-rose-600 shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">{u.email}</p>
                  <p className="text-xs text-muted-foreground">
                    {u.tenant.name} · {u.failedLoginCount} fejlede forsøg
                  </p>
                </div>
                <span className="text-xs text-rose-700">
                  Låst til {formatDate(u.lockedUntil!)}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {suspendedList.length === 0 && recentLockouts.length === 0 && (
        <div className="bg-card border border-border rounded-xl p-8 text-center">
          <ShieldCheck className="h-8 w-8 text-emerald-600 mx-auto mb-2" />
          <p className="text-sm font-medium">Alt ser sundt ud</p>
          <p className="text-xs text-muted-foreground mt-1">
            Ingen suspenderede tenants og ingen aktuelle lockouts.
          </p>
        </div>
      )}
    </div>
  );
}

function Kpi({ label, value, sub, icon: Icon, color }: { label: string; value: number | string; sub?: string; icon: any; color: string }) {
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
