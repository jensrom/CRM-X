import { getHourBundles } from "@/app/actions/hour-bundles";
import { AppTopbar } from "@/components/layout/AppTopbar";
import { PageHeader } from "@/components/shared/PageHeader";
import { EmptyState } from "@/components/shared/EmptyState";
import { Button } from "@/components/ui/button";
import { Scissors, Plus, Building2, CalendarDays, FolderKanban } from "lucide-react";
import Link from "next/link";
import { formatDate, formatCurrency } from "@/lib/utils";
import { ClickableRow } from "@/components/shared/ClickableRow";

export default async function KlippekortPage() {
  const bundles = await getHourBundles();
  const active = bundles.filter((b) => b.isActive);

  function BundleRow({ bundle }: { bundle: typeof bundles[0] }) {
    const usedHours = Math.round((bundle.usedMinutes / 60) * 10) / 10;
    // Beregn rest fra rå minutter for præcision, rund derefter (undgår float-fejl som 1.700000000000028t)
    const remainingHours = Math.round(Math.max(bundle.totalHours - bundle.usedMinutes / 60, 0) * 10) / 10;
    const pct = Math.min((usedHours / bundle.totalHours) * 100, 100);
    const isExpired = bundle.expiresAt ? new Date(bundle.expiresAt) < new Date() : false;
    const statusLabel = !bundle.isActive
      ? { text: "Inaktiv", color: "bg-secondary text-muted-foreground" }
      : isExpired
      ? { text: "Udløbet", color: "bg-destructive/10 text-destructive" }
      : pct > 90
      ? { text: "Næsten opbrugt", color: "bg-destructive/10 text-destructive" }
      : pct > 70
      ? { text: "Lav saldo", color: "bg-amber-500/10 text-amber-700" }
      : { text: "Aktiv", color: "bg-emerald-500/10 text-emerald-700" };

    return (
      <ClickableRow href={`/klippekort/${bundle.id}`}>
        <td className="px-4 py-3 font-mono text-xs text-muted-foreground tabular-nums whitespace-nowrap">
          KB-{String(bundle.number).padStart(4, "0")}
        </td>
        <td className="px-4 py-3">
          <p className="font-medium text-foreground group-hover:text-primary transition-colors truncate max-w-xs">
            {bundle.name ?? `${bundle.totalHours}t klippekort`}
          </p>
          {bundle.price && (
            <p className="text-xs text-muted-foreground tabular-nums mt-0.5">
              {formatCurrency(Number(bundle.price))}
            </p>
          )}
        </td>
        <td className="px-4 py-3 text-muted-foreground">
          <div className="flex items-center gap-1.5 truncate">
            <Building2 className="h-3 w-3 shrink-0" />
            <span className="truncate">{bundle.company.name}</span>
          </div>
        </td>
        <td className="px-4 py-3 text-right tabular-nums hidden sm:table-cell text-foreground font-medium">
          {bundle.totalHours}t
        </td>
        <td className="px-4 py-3 text-right tabular-nums hidden sm:table-cell text-muted-foreground">
          {usedHours}t
        </td>
        <td className="px-4 py-3 text-right tabular-nums hidden md:table-cell">
          <span
            className={`font-medium ${
              remainingHours <= 0
                ? "text-destructive"
                : pct > 80
                ? "text-amber-600"
                : "text-emerald-600"
            }`}
          >
            {remainingHours}t
          </span>
        </td>
        <td className="px-4 py-3 w-32 hidden lg:table-cell">
          <div className="h-1.5 bg-secondary rounded-full overflow-hidden">
            <div
              className={`h-full rounded-full transition-all ${
                pct > 90 ? "bg-destructive" : pct > 70 ? "bg-amber-500" : "bg-emerald-500"
              }`}
              style={{ width: `${pct}%` }}
            />
          </div>
          <div className="text-[10px] text-muted-foreground text-right mt-0.5 tabular-nums">
            {Math.round(pct)}%
          </div>
        </td>
        <td className="px-4 py-3 text-muted-foreground tabular-nums hidden xl:table-cell">
          <span className="inline-flex items-center gap-1">
            <FolderKanban className="h-3 w-3" />
            {bundle.projectBundles.length}
          </span>
        </td>
        <td className="px-4 py-3 text-muted-foreground tabular-nums whitespace-nowrap hidden xl:table-cell">
          {bundle.expiresAt ? (
            <span className="inline-flex items-center gap-1">
              <CalendarDays className="h-3 w-3" />
              {formatDate(bundle.expiresAt)}
            </span>
          ) : (
            <span className="text-muted-foreground/60">—</span>
          )}
        </td>
        <td className="px-4 py-3">
          <span className={`inline-block text-[11px] font-medium px-2 py-0.5 rounded-full ${statusLabel.color}`}>
            {statusLabel.text}
          </span>
        </td>
      </ClickableRow>
    );
  }

  return (
    <>
      <AppTopbar pageTitle="Klippekort" />

      <PageHeader
        title="Klippekort"
        description={`${active.length} aktive · ${bundles.length} i alt`}
        actions={
          <a href="/klippekort/new">
            <Button size="md"><Plus className="h-4 w-4" />Nyt klippekort</Button>
          </a>
        }
      />

      {bundles.length === 0 ? (
        <EmptyState
          icon={Scissors}
          title="Ingen klippekort"
          description="Opret et klippekort til en kunde."
          action={
            <a href="/klippekort/new">
              <Button size="sm"><Plus className="h-3.5 w-3.5" />Nyt klippekort</Button>
            </a>
          }
        />
      ) : (
        <div className="bg-card border border-border rounded-xl overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border bg-secondary/30 text-xs uppercase tracking-wide text-muted-foreground">
                  <th className="text-left px-4 py-3 font-semibold w-20">Ref</th>
                  <th className="text-left px-4 py-3 font-semibold">Klippekort</th>
                  <th className="text-left px-4 py-3 font-semibold">Firma</th>
                  <th className="text-right px-4 py-3 font-semibold w-20 hidden sm:table-cell">Købt</th>
                  <th className="text-right px-4 py-3 font-semibold w-20 hidden sm:table-cell">Brugt</th>
                  <th className="text-right px-4 py-3 font-semibold w-20 hidden md:table-cell">Resterende</th>
                  <th className="text-left px-4 py-3 font-semibold w-32 hidden lg:table-cell">Saldo</th>
                  <th className="text-left px-4 py-3 font-semibold w-20 hidden xl:table-cell">Projekter</th>
                  <th className="text-left px-4 py-3 font-semibold w-28 hidden xl:table-cell">Udløb</th>
                  <th className="text-left px-4 py-3 font-semibold w-32">Status</th>
                </tr>
              </thead>
              <tbody>
                {bundles.map((b) => <BundleRow key={b.id} bundle={b} />)}
              </tbody>
            </table>
          </div>
          <div className="px-4 py-2.5 border-t border-border bg-secondary/20 text-xs text-muted-foreground">
            {bundles.length} klippekort i alt
          </div>
        </div>
      )}
    </>
  );
}
