import { db } from "@/lib/db";
import Link from "next/link";
import { CircleDollarSign, TrendingUp, TrendingDown, Layers, Users } from "lucide-react";
import { formatCurrency } from "@/lib/utils";
import { PLANS, PLAN_LIST, normalizePlanSlug } from "@/lib/plans";

/**
 * Økonomi — overblik over MRR, plan-fordeling, churn.
 *
 * Bemærk: vi læser KUN tenant-niveau data (plan, maxUsers, status),
 * IKKE kundernes egne fakturaer eller indtægter — dem rører vi ikke.
 */
export default async function AdminInsightsFinancePage() {
  const since30d = new Date(Date.now() - 30 * 86400_000);

  const allTenants = await db.tenant.findMany({
    select: {
      id: true,
      name: true,
      slug: true,
      plan: true,
      maxUsers: true,
      status: true,
      createdAt: true,
      trialEndsAt: true,
    },
  });

  // MRR-beregning
  const active = allTenants.filter((t) => t.status === "active");
  const mrrTotal = active.reduce((sum, t) => {
    const plan = PLANS[normalizePlanSlug(t.plan)];
    return sum + plan.pricePerUserMonth.DKK * t.maxUsers;
  }, 0);

  // Per plan (gruppér på normaliseret slug så legacy "enterprise" tæller med under "large")
  const mrrByPlan = PLAN_LIST.map((plan) => {
    const tenants = active.filter((t) => normalizePlanSlug(t.plan) === plan.slug);
    const totalSeats = tenants.reduce((s, t) => s + t.maxUsers, 0);
    const planMrr = plan.pricePerUserMonth.DKK * totalSeats;
    return {
      plan,
      tenantCount: tenants.length,
      totalSeats,
      mrr: planMrr,
      share: mrrTotal > 0 ? (planMrr / mrrTotal) * 100 : 0,
    };
  });

  // Trials der udløber snart
  const expiringTrials = allTenants.filter(
    (t) =>
      t.status === "trial" &&
      t.trialEndsAt &&
      new Date(t.trialEndsAt) > new Date() &&
      new Date(t.trialEndsAt) < new Date(Date.now() + 7 * 86400_000),
  );

  // Tenants oprettet sidste 30d (signups)
  const signups30d = allTenants.filter((t) => t.createdAt >= since30d).length;
  const newMrr30d = allTenants
    .filter((t) => t.status === "active" && t.createdAt >= since30d)
    .reduce((sum, t) => {
      const plan = PLANS[normalizePlanSlug(t.plan)];
      return sum + plan.pricePerUserMonth.DKK * t.maxUsers;
    }, 0);

  // Churned = suspended/deleted seneste 30d (cheap proxy)
  const churned30d = allTenants.filter(
    (t) => (t.status === "suspended" || t.status === "deleted") && t.createdAt < since30d,
  ).length;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-semibold">Økonomi</h1>
        <p className="text-sm text-muted-foreground mt-0.5">
          MRR, plan-fordeling og signupstempo. Beregnet på tenant-niveau —
          kunde-data røres ikke.
        </p>
      </div>

      {/* KPI */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <Kpi
          label="MRR (DKK)"
          value={formatCurrency(mrrTotal)}
          sub={`${active.length} aktive abonnementer`}
          icon={CircleDollarSign}
          color="bg-emerald-500/10 text-emerald-600"
        />
        <Kpi
          label="Ny MRR (30d)"
          value={formatCurrency(newMrr30d)}
          sub={`${signups30d} signups`}
          icon={TrendingUp}
          color="bg-blue-500/10 text-blue-600"
        />
        <Kpi
          label="Churn (30d)"
          value={churned30d.toString()}
          sub="Suspended eller slettede"
          icon={TrendingDown}
          color={churned30d > 0 ? "bg-rose-500/10 text-rose-600" : "bg-muted/50 text-muted-foreground"}
        />
        <Kpi
          label="Trials udløber 7d"
          value={expiringTrials.length.toString()}
          sub="Klar til konvertering"
          icon={Layers}
          color="bg-amber-500/10 text-amber-600"
        />
      </div>

      {/* MRR pr. plan */}
      <div className="bg-card border border-border rounded-xl overflow-hidden">
        <div className="px-5 py-3.5 border-b border-border">
          <h3 className="text-sm font-semibold">MRR pr. plan</h3>
        </div>
        <div className="p-5 space-y-3">
          {mrrByPlan.map((row) => (
            <div key={row.plan.slug}>
              <div className="flex items-center justify-between mb-1.5 text-sm">
                <div className="flex items-center gap-2">
                  <span className="font-medium">{row.plan.name}</span>
                  <span className="text-xs text-muted-foreground">
                    {row.tenantCount} tenants · {row.totalSeats} seats
                  </span>
                </div>
                <span className="font-semibold tabular-nums">{formatCurrency(row.mrr)}</span>
              </div>
              <div className="h-2 bg-secondary rounded-full overflow-hidden">
                <div
                  className="h-full bg-primary rounded-full transition-all"
                  style={{ width: `${row.share}%` }}
                />
              </div>
              <p className="text-[10px] text-muted-foreground mt-1 tabular-nums">
                {row.share.toFixed(1)}% af samlet MRR
              </p>
            </div>
          ))}
        </div>
      </div>

      {/* Expiring trials */}
      {expiringTrials.length > 0 && (
        <div className="bg-card border border-border rounded-xl overflow-hidden">
          <div className="px-5 py-3.5 border-b border-border">
            <h3 className="text-sm font-semibold">Trials der udløber inden for 7 dage</h3>
          </div>
          <div className="divide-y divide-border">
            {expiringTrials.map((t) => {
              const daysLeft = Math.ceil(
                (new Date(t.trialEndsAt!).getTime() - Date.now()) / 86400_000,
              );
              return (
                <Link
                  key={t.id}
                  href={`/admin/tenants/${t.id}`}
                  className="px-5 py-3 flex items-center gap-3 hover:bg-secondary/20 transition-colors"
                >
                  <Users className="h-4 w-4 text-amber-600 shrink-0" />
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-sm">{t.name}</p>
                    <p className="text-xs text-muted-foreground font-mono">
                      {t.slug}.plesnertech.dk · plan: {t.plan}
                    </p>
                  </div>
                  <span className="text-xs font-medium text-amber-700">
                    {daysLeft} dag{daysLeft !== 1 ? "e" : ""} tilbage
                  </span>
                </Link>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

function Kpi({ label, value, sub, icon: Icon, color }: { label: string; value: string; sub?: string; icon: any; color: string }) {
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
