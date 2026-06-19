import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { redirect } from "next/navigation";
import Link from "next/link";
import { AppTopbar } from "@/components/layout/AppTopbar";
import { BackButton } from "@/components/shared/BackButton";
import { PageHeader } from "@/components/shared/PageHeader";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/shared/EmptyState";
import {
  listRecurringInvoices,
  setRecurringStatus,
  deleteRecurring,
  runRecurringNow,
} from "@/app/actions/recurring-invoices";
import { Repeat, Plus, Pause, Play, Trash2, Zap, Receipt } from "lucide-react";
import { formatCurrency, formatDate } from "@/lib/utils";
import { CreateRecurringForm } from "@/components/recurring/CreateRecurringForm";

export const dynamic = "force-dynamic";

export default async function RecurringInvoicesPage() {
  const session = await auth();
  if (!session?.user?.tenantId) redirect("/login");

  const [recurring, companies] = await Promise.all([
    listRecurringInvoices(),
    db.company.findMany({
      where: { tenantId: session.user.tenantId, isActive: true },
      select: { id: true, name: true },
      orderBy: { name: "asc" },
    }),
  ]);

  // Tæl forfaldne
  const now = new Date();
  const dueThisWeek = recurring.filter(
    (r) => r.status === "active" && r.nextRunAt <= new Date(now.getTime() + 7 * 86400000),
  ).length;
  const overdue = recurring.filter(
    (r) => r.status === "active" && r.nextRunAt < now,
  ).length;

  return (
    <>
      <AppTopbar pageTitle="Faste fakturaer" />
      <BackButton href="/invoices" label="Fakturaer" />
      <PageHeader
        title="Faste fakturaer"
        description="Genererer kladde-fakturaer automatisk hver måned/kvartal/år"
      />

      {/* Status-banner */}
      {(overdue > 0 || dueThisWeek > 0) && (
        <div className="mb-5 grid grid-cols-1 md:grid-cols-2 gap-3">
          {overdue > 0 && (
            <div className="bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-800 rounded-xl p-4">
              <p className="text-sm text-amber-900 dark:text-amber-200">
                <span className="font-semibold">{overdue}</span> faktura{overdue === 1 ? "" : "er"} venter på at blive genereret nu.
                Næste cron-kørsel er kl. 06:00 UTC, eller tryk "Kør nu" pr. række.
              </p>
            </div>
          )}
          {dueThisWeek - overdue > 0 && (
            <div className="bg-blue-50 dark:bg-blue-950/20 border border-blue-200 dark:border-blue-800 rounded-xl p-4">
              <p className="text-sm text-blue-900 dark:text-blue-200">
                <span className="font-semibold">{dueThisWeek - overdue}</span> faste fakturaer genereres indenfor 7 dage.
              </p>
            </div>
          )}
        </div>
      )}

      {/* Opret-formular */}
      <CreateRecurringForm companies={companies} />

      {/* Liste */}
      {recurring.length === 0 ? (
        <EmptyState
          icon={Repeat}
          title="Ingen faste fakturaer endnu"
          description="Opret én for at få genereret kladde-fakturaer automatisk hver måned."
        />
      ) : (
        <div className="bg-card border border-border rounded-xl overflow-x-auto">
          <table className="w-full min-w-[700px]">
            <thead>
              <tr className="border-b border-border bg-secondary/40 text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                <th className="text-left px-4 py-3">Navn</th>
                <th className="text-left px-4 py-3">Kunde</th>
                <th className="text-left px-4 py-3">Interval</th>
                <th className="text-left px-4 py-3">Næste kørsel</th>
                <th className="text-right px-4 py-3">Beløb</th>
                <th className="text-center px-4 py-3">Status</th>
                <th className="px-4 py-3"></th>
              </tr>
            </thead>
            <tbody>
              {recurring.map((r) => {
                const lines = (r.lineTemplate as any) as Array<{
                  quantity: number; unitPrice: number; discountPct?: number;
                }>;
                const subtotal = lines.reduce((s, l) => {
                  const lineTotal = Number(l.quantity) * Number(l.unitPrice);
                  const after = lineTotal * (1 - (Number(l.discountPct ?? 0) / 100));
                  return s + after;
                }, 0);
                const total = r.vatEnabled
                  ? subtotal * (1 + Number(r.vatPct) / 100)
                  : subtotal;
                const isOverdue = r.status === "active" && r.nextRunAt < now;

                return (
                  <tr key={r.id} className="border-b border-border last:border-0 hover:bg-secondary/20">
                    <td className="px-4 py-3 text-sm font-medium">{r.name}</td>
                    <td className="px-4 py-3 text-sm">
                      <Link href={`/kunder/${r.companyId}`} className="text-primary hover:underline">
                        {r.company.name}
                      </Link>
                    </td>
                    <td className="px-4 py-3 text-sm text-muted-foreground">
                      {r.intervalType === "monthly" ? "Månedligt" : r.intervalType === "quarterly" ? "Kvartalsvis" : "Årligt"}
                    </td>
                    <td className="px-4 py-3 text-sm">
                      <span className={isOverdue ? "text-amber-600 font-semibold" : "text-foreground"}>
                        {formatDate(r.nextRunAt)}
                      </span>
                      {r.lastRunAt && (
                        <div className="text-[10px] text-muted-foreground">
                          Sidst: {formatDate(r.lastRunAt)} · {r.runCount} kørsler
                        </div>
                      )}
                    </td>
                    <td className="px-4 py-3 text-sm text-right tabular-nums font-semibold">
                      {formatCurrency(total, r.currency)}
                    </td>
                    <td className="px-4 py-3 text-center">
                      <StatusPill status={r.status} />
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center justify-end gap-1">
                        {r.status === "active" && (
                          <>
                            <form action={runRecurringNow.bind(null, r.id)}>
                              <button
                                type="submit"
                                title="Generer faktura nu"
                                className="h-7 w-7 rounded-md hover:bg-primary/10 flex items-center justify-center text-muted-foreground hover:text-primary"
                              >
                                <Zap className="h-3.5 w-3.5" />
                              </button>
                            </form>
                            <form action={setRecurringStatus.bind(null, r.id, "paused")}>
                              <button
                                type="submit"
                                title="Pause"
                                className="h-7 w-7 rounded-md hover:bg-secondary flex items-center justify-center text-muted-foreground hover:text-foreground"
                              >
                                <Pause className="h-3.5 w-3.5" />
                              </button>
                            </form>
                          </>
                        )}
                        {r.status === "paused" && (
                          <form action={setRecurringStatus.bind(null, r.id, "active")}>
                            <button
                              type="submit"
                              title="Genoptag"
                              className="h-7 w-7 rounded-md hover:bg-emerald-100 dark:hover:bg-emerald-900/30 flex items-center justify-center text-muted-foreground hover:text-emerald-600"
                            >
                              <Play className="h-3.5 w-3.5" />
                            </button>
                          </form>
                        )}
                        <form action={deleteRecurring.bind(null, r.id)}>
                          <button
                            type="submit"
                            title="Slet"
                            className="h-7 w-7 rounded-md hover:bg-destructive/10 flex items-center justify-center text-muted-foreground hover:text-destructive"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        </form>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </>
  );
}

function StatusPill({ status }: { status: string }) {
  const styles: Record<string, string> = {
    active:  "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300",
    paused:  "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300",
    stopped: "bg-secondary text-muted-foreground",
  };
  const labels: Record<string, string> = {
    active: "Aktiv", paused: "Pause", stopped: "Stoppet",
  };
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${styles[status] ?? styles.stopped}`}>
      {labels[status] ?? status}
    </span>
  );
}
