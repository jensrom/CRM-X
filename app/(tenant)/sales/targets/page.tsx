import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { redirect } from "next/navigation";
import { AppTopbar } from "@/components/layout/AppTopbar";
import { BackButton } from "@/components/shared/BackButton";
import { PageHeader } from "@/components/shared/PageHeader";
import {
  listTargetsWithProgress,
  getCurrentLeaderboard,
  upsertSalesTarget,
  deleteSalesTarget,
} from "@/app/actions/sales-targets";
import { periodBounds } from "@/lib/sales-periods";
import { Target, Trophy, TrendingUp, Users, Plus } from "lucide-react";
import { formatCurrency } from "@/lib/utils";

export const dynamic = "force-dynamic";

export default async function SalesTargetsPage({
  searchParams,
}: {
  searchParams: Promise<{ period?: string }>;
}) {
  const session = await auth();
  if (!session?.user?.tenantId) redirect("/login");

  const sp = await searchParams;
  // ?period=YYYY-MM eller default = nuværende måned
  const now = sp.period
    ? new Date(`${sp.period}-01T00:00:00Z`)
    : new Date();
  const { start, end, label } = periodBounds("month", now);

  const [users, targets, leaderboard] = await Promise.all([
    db.user.findMany({
      where: { tenantId: session.user.tenantId, isActive: true },
      select: { id: true, name: true, email: true },
      orderBy: { name: "asc" },
    }),
    listTargetsWithProgress(start, end),
    getCurrentLeaderboard(),
  ]);

  const periodInputValue = `${start.getUTCFullYear()}-${String(start.getUTCMonth() + 1).padStart(2, "0")}`;
  const isAdmin = session.user.role === "admin" || session.user.role === "super_admin";

  // Beregn tenant-overordnet status
  const totalTargetAmount = targets.reduce(
    (s, t) => s + (t.targetType === "revenue" ? t.targetAmount : 0),
    0,
  );
  const totalAchieved = targets.reduce(
    (s, t) => s + (t.targetType === "revenue" ? t.achieved : 0),
    0,
  );
  const totalPercent = totalTargetAmount > 0
    ? Math.round((totalAchieved / totalTargetAmount) * 100)
    : 0;

  return (
    <>
      <AppTopbar pageTitle="Salgs-mål" />
      <BackButton href="/dashboard" label="Dashboard" />
      <PageHeader
        title="Salgs-mål"
        description={`Periode: ${label} — trækker fra Deal.value når stage = vundet`}
      />

      {/* Periodevælger */}
      <form action="" method="get" className="mb-5 flex items-center gap-2 text-sm">
        <label className="text-muted-foreground">Periode:</label>
        <input
          type="month"
          name="period"
          defaultValue={periodInputValue}
          className="px-2 py-1.5 border border-border rounded-md bg-card text-foreground text-sm"
        />
        <button
          type="submit"
          className="px-3 py-1.5 bg-secondary hover:bg-secondary/80 rounded-md text-sm font-medium"
        >
          Vis
        </button>
      </form>

      {/* Tenant-totaler */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <StatCard
          label="Mål denne periode"
          value={formatCurrency(totalTargetAmount, "DKK")}
          icon={Target}
          tone="primary"
        />
        <StatCard
          label="Realiseret"
          value={formatCurrency(totalAchieved, "DKK")}
          icon={TrendingUp}
          tone="emerald"
        />
        <StatCard
          label="Status"
          value={`${totalPercent}%`}
          icon={Trophy}
          tone={totalPercent >= 100 ? "emerald" : totalPercent >= 70 ? "amber" : "neutral"}
        />
      </div>

      {/* Admin-formular */}
      {isAdmin && (
        <div className="bg-card border border-border rounded-xl p-5 mb-6">
          <h2 className="text-sm font-semibold mb-3 flex items-center gap-2">
            <Plus className="h-4 w-4" />
            Sæt mål
          </h2>
          <form action={upsertSalesTarget} className="grid grid-cols-1 md:grid-cols-5 gap-3 items-end">
            <div>
              <label className="text-xs font-medium text-muted-foreground mb-1 block">Bruger</label>
              <select
                name="userId"
                className="w-full px-2 py-1.5 border border-border rounded-md bg-card text-sm"
              >
                <option value="">— Hele teamet —</option>
                {users.map((u) => (
                  <option key={u.id} value={u.id}>{u.name || u.email}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="text-xs font-medium text-muted-foreground mb-1 block">Periode</label>
              <input
                type="month"
                name="periodStart"
                defaultValue={periodInputValue}
                required
                className="w-full px-2 py-1.5 border border-border rounded-md bg-card text-sm"
              />
            </div>
            <div>
              <label className="text-xs font-medium text-muted-foreground mb-1 block">Type</label>
              <select
                name="targetType"
                className="w-full px-2 py-1.5 border border-border rounded-md bg-card text-sm"
              >
                <option value="revenue">Omsætning (DKK)</option>
                <option value="won_deals">Vundne deals (antal)</option>
              </select>
            </div>
            <div>
              <label className="text-xs font-medium text-muted-foreground mb-1 block">Beløb / antal</label>
              <input
                type="number"
                name="targetAmount"
                step="100"
                min="0"
                required
                className="w-full px-2 py-1.5 border border-border rounded-md bg-card text-sm"
              />
            </div>
            <input type="hidden" name="periodType" value="month" />
            <button
              type="submit"
              className="px-3 py-2 bg-primary text-primary-foreground rounded-md text-sm font-medium hover:bg-primary/90"
            >
              Gem mål
            </button>
          </form>
        </div>
      )}

      {/* Leaderboard for indeværende måned */}
      <div className="bg-card border border-border rounded-xl p-5 mb-6">
        <h2 className="text-sm font-semibold mb-4 flex items-center gap-2">
          <Trophy className="h-4 w-4 text-amber-500" />
          Leaderboard — {leaderboard.label}
        </h2>
        {leaderboard.rows.length === 0 ? (
          <p className="text-sm text-muted-foreground">Ingen revenue-mål sat for nuværende måned.</p>
        ) : (
          <div className="space-y-3">
            {leaderboard.rows.map((row, idx) => (
              <LeaderboardRow key={row.userId} row={row} rank={idx + 1} />
            ))}
          </div>
        )}
      </div>

      {/* Alle mål for valgt periode (tabel) */}
      <div className="bg-card border border-border rounded-xl p-5">
        <h2 className="text-sm font-semibold mb-4 flex items-center gap-2">
          <Users className="h-4 w-4" />
          Alle mål — {label}
        </h2>
        {targets.length === 0 ? (
          <p className="text-sm text-muted-foreground">Ingen mål sat for denne periode endnu.</p>
        ) : (
          <div className="overflow-x-auto -mx-5 px-5">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border text-left text-xs font-medium text-muted-foreground">
                  <th className="pb-2">Bruger</th>
                  <th className="pb-2">Type</th>
                  <th className="pb-2 text-right">Mål</th>
                  <th className="pb-2 text-right">Realiseret</th>
                  <th className="pb-2 text-right">Vundne deals</th>
                  <th className="pb-2 text-right">%</th>
                  {isAdmin && <th className="pb-2"></th>}
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {targets.map((t) => (
                  <tr key={t.id} className="hover:bg-secondary/20">
                    <td className="py-3 font-medium">{t.userName}</td>
                    <td className="py-3 text-muted-foreground">
                      {t.targetType === "revenue" ? "Omsætning" : "Vundne deals"}
                    </td>
                    <td className="py-3 text-right tabular-nums">
                      {t.targetType === "revenue"
                        ? formatCurrency(t.targetAmount, t.currency)
                        : t.targetAmount}
                    </td>
                    <td className="py-3 text-right tabular-nums">
                      {t.targetType === "revenue"
                        ? formatCurrency(t.achieved, t.currency)
                        : t.achieved}
                    </td>
                    <td className="py-3 text-right tabular-nums text-muted-foreground">
                      {t.wonDeals}
                    </td>
                    <td className="py-3 text-right tabular-nums font-semibold">
                      <span className={t.percent >= 100 ? "text-emerald-600" : t.percent >= 70 ? "text-amber-600" : "text-foreground"}>
                        {t.percent}%
                      </span>
                    </td>
                    {isAdmin && (
                      <td className="py-3 text-right">
                        <form action={deleteSalesTarget.bind(null, t.id)}>
                          <button
                            type="submit"
                            className="text-xs text-destructive hover:underline"
                          >
                            Slet
                          </button>
                        </form>
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </>
  );
}

function StatCard({
  label, value, icon: Icon, tone = "neutral",
}: {
  label: string; value: string; icon: any;
  tone?: "neutral" | "primary" | "emerald" | "amber";
}) {
  const tones = {
    neutral: "bg-secondary/40 text-muted-foreground",
    primary: "bg-primary/10 text-primary",
    emerald: "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300",
    amber:   "bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300",
  };
  return (
    <div className="bg-card border border-border rounded-xl p-4">
      <div className="flex items-center justify-between mb-2">
        <p className="text-xs font-medium text-muted-foreground">{label}</p>
        <div className={`h-8 w-8 rounded-md flex items-center justify-center ${tones[tone]}`}>
          <Icon className="h-4 w-4" />
        </div>
      </div>
      <p className="text-xl font-semibold tabular-nums">{value}</p>
    </div>
  );
}

function LeaderboardRow({
  row, rank,
}: {
  row: { userName: string; targetAmount: number; achieved: number; wonDeals: number; percent: number; currency: string };
  rank: number;
}) {
  const medal = rank === 1 ? "🥇" : rank === 2 ? "🥈" : rank === 3 ? "🥉" : `${rank}.`;
  const percentClamped = Math.min(100, row.percent);
  return (
    <div>
      <div className="flex items-center justify-between mb-1">
        <div className="flex items-center gap-2">
          <span className="text-sm w-7 tabular-nums">{medal}</span>
          <span className="text-sm font-medium">{row.userName}</span>
          <span className="text-xs text-muted-foreground">
            ({row.wonDeals} {row.wonDeals === 1 ? "deal" : "deals"})
          </span>
        </div>
        <div className="text-sm tabular-nums">
          <span className="font-semibold">{formatCurrency(row.achieved, row.currency)}</span>
          <span className="text-muted-foreground"> / {formatCurrency(row.targetAmount, row.currency)}</span>
          <span className={`ml-2 font-semibold ${row.percent >= 100 ? "text-emerald-600" : row.percent >= 70 ? "text-amber-600" : "text-muted-foreground"}`}>
            {row.percent}%
          </span>
        </div>
      </div>
      <div className="h-2 bg-secondary/40 rounded-full overflow-hidden">
        <div
          className={`h-full rounded-full transition-all ${
            row.percent >= 100 ? "bg-emerald-500" : row.percent >= 70 ? "bg-amber-500" : "bg-primary"
          }`}
          style={{ width: `${percentClamped}%` }}
        />
      </div>
    </div>
  );
}
