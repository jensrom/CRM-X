import { db } from "@/lib/db";
import Link from "next/link";
import {
  Globe, CheckCircle2, PauseCircle, AlertTriangle, Plus,
  TrendingUp, Users, Building2, Activity, CircleDollarSign,
  ArrowUpRight, ServerCog,
} from "lucide-react";
import { formatDate, formatCurrency } from "@/lib/utils";
import { PLANS, normalizePlanSlug } from "@/lib/plans";

/**
 * Super-admin Dashboard — overblik over alle kunder.
 *
 * Tre hurtige genveje øverst (Aktivitet/Økonomi/System) leder ned i
 * detaljerede dashboards under /admin/insights/*.
 */
export default async function AdminDashboardPage() {
  const [
    tenantsByStatus,
    totalTenants,
    activeUserCount,
    last30dSignups,
    recentTenants,
    last5Logins,
  ] = await Promise.all([
    db.tenant.groupBy({ by: ["status"], _count: true }),
    db.tenant.count(),
    db.user.count({ where: { isActive: true } }),
    db.tenant.count({
      where: { createdAt: { gte: new Date(Date.now() - 30 * 86400_000) } },
    }),
    db.tenant.findMany({
      orderBy: { createdAt: "desc" },
      take: 8,
      include: { _count: { select: { users: true } } },
    }),
    db.auditLog.findMany({
      where: { action: "login_success" },
      orderBy: { createdAt: "desc" },
      take: 5,
      select: { actorEmail: true, tenantId: true, createdAt: true },
    }),
  ]);

  // MRR-estimat (Small/Medium/Large × maxUsers × DKK-pris)
  const allTenants = await db.tenant.findMany({
    select: { plan: true, maxUsers: true, status: true, billingCurrency: true },
  });
  const mrr = allTenants
    .filter((t) => t.status === "active")
    .reduce((sum, t) => {
      const plan = PLANS[normalizePlanSlug(t.plan)];
      return sum + plan.pricePerUserMonth.DKK * t.maxUsers;
    }, 0);

  const statusMap = Object.fromEntries(tenantsByStatus.map((s) => [s.status, s._count]));
  const activeTenants = statusMap["active"] ?? 0;
  const trialTenants = statusMap["trial"] ?? 0;
  const suspendedTenants = statusMap["suspended"] ?? 0;

  return (
    <div className="space-y-6">
      {/* Velkomst */}
      <div className="flex items-end justify-between">
        <div>
          <h1 className="text-xl font-semibold">Admin overblik</h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            Status på alle CRM-sites og signaler du skal kigge på.
          </p>
        </div>
        <Link
          href="/admin/tenants/new"
          className="flex items-center gap-2 px-3.5 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 transition-colors"
        >
          <Plus className="h-4 w-4" />
          Onboard ny kunde
        </Link>
      </div>

      {/* KPI-grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <KpiCard label="Aktive tenants" value={activeTenants} icon={CheckCircle2} color="emerald" sub={`${totalTenants} total`} />
        <KpiCard label="MRR (DKK)" value={formatCurrency(mrr)} icon={TrendingUp} color="primary" sub="Estimat på aktive abonnementer" />
        <KpiCard label="Trial" value={trialTenants} icon={Activity} color="amber" sub="Konverter snart" />
        <KpiCard label="Nye sidste 30d" value={last30dSignups} icon={Plus} color="blue" sub="Onboarding-tempo" />
      </div>

      {/* Kategori-genveje */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <CategoryCard
          title="Aktivitet"
          desc="Logins, oprettelser, brugerbevægelser på tværs af tenants"
          href="/admin/insights/activity"
          icon={Activity}
          accent="bg-blue-500/10 text-blue-600"
        />
        <CategoryCard
          title="Økonomi"
          desc="MRR, abonnementer, fakturaer og plan-fordeling"
          href="/admin/insights/finance"
          icon={CircleDollarSign}
          accent="bg-emerald-500/10 text-emerald-600"
        />
        <CategoryCard
          title="System"
          desc="Suspenderede tenants, MFA-coverage, lockouts"
          href="/admin/insights/system"
          icon={ServerCog}
          accent="bg-amber-500/10 text-amber-600"
        />
      </div>

      {/* Advarsler */}
      {suspendedTenants > 0 && (
        <Link
          href="/admin/tenants?status=suspended"
          className="flex items-center gap-3 p-3 bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-800 rounded-xl hover:bg-amber-100/50 transition-colors"
        >
          <AlertTriangle className="h-4 w-4 text-amber-600 shrink-0" />
          <span className="text-sm text-amber-800 dark:text-amber-300 font-medium flex-1">
            {suspendedTenants} suspenderede tenants kræver opmærksomhed
          </span>
          <ArrowUpRight className="h-4 w-4 text-amber-600" />
        </Link>
      )}

      {/* Senest oprettede */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-5">
        <div className="bg-card border border-border rounded-xl overflow-hidden xl:col-span-2">
          <div className="px-5 py-3.5 border-b border-border flex items-center justify-between">
            <h3 className="text-sm font-semibold">Senest onboardet</h3>
            <Link href="/admin/tenants" className="text-xs text-primary hover:underline">
              Se alle tenants →
            </Link>
          </div>
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-secondary/30 border-b border-border text-xs text-muted-foreground">
                <th className="text-left px-5 py-2.5 font-semibold">Firma</th>
                <th className="text-left px-5 py-2.5 font-semibold">Plan</th>
                <th className="text-right px-5 py-2.5 font-semibold">Brugere</th>
                <th className="text-left px-5 py-2.5 font-semibold">Oprettet</th>
              </tr>
            </thead>
            <tbody>
              {recentTenants.map((t) => (
                <tr key={t.id} className="border-b border-border/50 last:border-0 hover:bg-secondary/20">
                  <td className="px-5 py-3">
                    <Link href={`/admin/tenants/${t.id}`} className="hover:text-primary transition-colors">
                      <p className="font-medium">{t.name}</p>
                      <p className="font-mono text-[10px] text-muted-foreground">{t.slug}.plesnertech.dk</p>
                    </Link>
                  </td>
                  <td className="px-5 py-3">
                    <span className="text-xs px-2 py-0.5 rounded-full bg-secondary capitalize">
                      {t.plan}
                    </span>
                  </td>
                  <td className="px-5 py-3 text-right tabular-nums text-muted-foreground">
                    {t._count.users}/{t.maxUsers}
                  </td>
                  <td className="px-5 py-3 text-muted-foreground text-xs">
                    {formatDate(t.createdAt)}
                  </td>
                </tr>
              ))}
              {recentTenants.length === 0 && (
                <tr>
                  <td colSpan={4} className="text-center text-sm text-muted-foreground py-8">
                    Ingen tenants endnu.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Seneste logins */}
        <div className="bg-card border border-border rounded-xl overflow-hidden">
          <div className="px-5 py-3.5 border-b border-border flex items-center justify-between">
            <h3 className="text-sm font-semibold">Seneste logins</h3>
            <Link href="/admin/insights/activity" className="text-xs text-primary hover:underline">
              Detaljer →
            </Link>
          </div>
          <div className="divide-y divide-border">
            {last5Logins.map((l, i) => (
              <div key={i} className="px-5 py-3 flex items-center gap-3">
                <Users className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="text-xs truncate font-medium">{l.actorEmail ?? "—"}</p>
                  <p className="text-[10px] text-muted-foreground">
                    {formatDate(l.createdAt)}
                  </p>
                </div>
              </div>
            ))}
            {last5Logins.length === 0 && (
              <div className="px-5 py-8 text-center text-sm text-muted-foreground">
                Ingen audit-events endnu
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function KpiCard({
  label, value, sub, icon: Icon, color,
}: {
  label: string; value: string | number; sub?: string; icon: any; color: "emerald" | "primary" | "amber" | "blue";
}) {
  const colors = {
    primary: "bg-primary/10 text-primary",
    emerald: "bg-emerald-500/10 text-emerald-600",
    amber: "bg-amber-500/10 text-amber-600",
    blue: "bg-blue-500/10 text-blue-600",
  };
  return (
    <div className="bg-card border border-border rounded-xl p-5">
      <div className={`w-9 h-9 rounded-lg flex items-center justify-center mb-3 ${colors[color]}`}>
        <Icon className="h-4 w-4" />
      </div>
      <p className="text-2xl font-bold tabular-nums">{value}</p>
      <p className="text-sm text-foreground mt-0.5">{label}</p>
      {sub && <p className="text-xs text-muted-foreground mt-0.5">{sub}</p>}
    </div>
  );
}

function CategoryCard({
  title, desc, href, icon: Icon, accent,
}: {
  title: string; desc: string; href: string; icon: any; accent: string;
}) {
  return (
    <Link
      href={href}
      className="group bg-card border border-border rounded-xl p-5 hover:border-primary/40 hover:shadow-sm transition-all"
    >
      <div className="flex items-start gap-3">
        <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${accent}`}>
          <Icon className="h-5 w-5" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="font-semibold flex items-center gap-1.5">
            {title}
            <ArrowUpRight className="h-3.5 w-3.5 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
          </p>
          <p className="text-xs text-muted-foreground mt-0.5 leading-relaxed">{desc}</p>
        </div>
      </div>
    </Link>
  );
}
