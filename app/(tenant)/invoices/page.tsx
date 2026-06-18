import { getInvoices } from "@/app/actions/invoices";
import { AppTopbar } from "@/components/layout/AppTopbar";
import { PageHeader } from "@/components/shared/PageHeader";
import { Button } from "@/components/ui/button";
import { FileText, Plus, Building2, FolderKanban, CalendarDays, Download } from "lucide-react";
import Link from "next/link";
import { formatDate, formatCurrency } from "@/lib/utils";

const STATUS_STYLE: Record<string, { label: string; bg: string }> = {
  draft:     { label: "Kladde",     bg: "bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300" },
  sent:      { label: "Sendt",      bg: "bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300" },
  paid:      { label: "Betalt",     bg: "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300" },
  cancelled: { label: "Annulleret", bg: "bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300" },
};

function invoiceTotal(
  lines: { quantity: unknown; unitPrice: unknown; isCredit: boolean; discountPct?: unknown }[],
  vatEnabled = true,
  vatPct = 25,
) {
  const subtotal = lines.reduce((sum, l) => {
    const base = Number(l.quantity) * Number(l.unitPrice);
    const disc = Number(l.discountPct ?? 0);
    const afterDisc = base * (1 - disc / 100);
    return sum + (l.isCredit ? -afterDisc : afterDisc);
  }, 0);
  return vatEnabled ? subtotal * (1 + vatPct / 100) : subtotal;
}

export default async function InvoicesPage() {
  const invoices = await getInvoices();

  const draft = invoices.filter((i) => i.status === "draft");
  const sent  = invoices.filter((i) => i.status === "sent");
  const paid  = invoices.filter((i) => i.status === "paid");
  const other = invoices.filter((i) => !["draft", "sent", "paid"].includes(i.status));

  const openValue = [...draft, ...sent].reduce(
    (s, i) => s + invoiceTotal(i.lines, (i as any).vatEnabled ?? true, Number((i as any).vatPct ?? 25)),
    0,
  );

  return (
    <>
      <AppTopbar pageTitle="Fakturaer" />

      <PageHeader
        title="Fakturaer"
        description={`${invoices.length} fakturaer — ${formatCurrency(openValue)} udestående`}
        actions={
          <div className="flex items-center gap-2">
            <a href="/api/invoices/export" download className="inline-flex items-center gap-1.5 text-sm font-medium px-3 py-1.5 rounded-lg border border-border hover:bg-secondary/40 transition-colors">
              <Download className="h-3.5 w-3.5" />
              CSV-eksport
            </a>
            <a href="/invoices/new">
              <Button size="md">
                <Plus className="h-4 w-4" />
                Ny faktura
              </Button>
            </a>
          </div>
        }
      />

      {invoices.length === 0 ? (
        <div className="bg-card border border-border rounded-xl p-16 text-center">
          <FileText className="h-10 w-10 text-muted-foreground mx-auto mb-4" />
          <p className="font-semibold mb-1">Ingen fakturaer endnu</p>
          <p className="text-sm text-muted-foreground mb-4">
            Opret en manuel faktura eller generer én fra et projekt.
          </p>
          <div className="flex items-center justify-center gap-2">
            <a href="/invoices/new">
              <Button size="sm">
                <Plus className="h-3.5 w-3.5" />
                Ny faktura
              </Button>
            </a>
            <Link href="/projects">
              <Button size="sm" variant="ghost">
                Gå til projekter
              </Button>
            </Link>
          </div>
        </div>
      ) : (
        <div className="space-y-6">
          {[
            { title: "Kladder",    items: draft },
            { title: "Sendte",     items: sent  },
            { title: "Betalte",    items: paid  },
            { title: "Øvrige",     items: other },
          ]
            .filter((g) => g.items.length > 0)
            .map((group) => (
              <div key={group.title}>
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-3">
                  {group.title} ({group.items.length})
                </p>
                <div className="bg-card border border-border rounded-xl overflow-hidden">
                  <div className="divide-y divide-border">
                    {group.items.map((inv) => {
                      const s = STATUS_STYLE[inv.status] ?? STATUS_STYLE.draft;
                      const total = invoiceTotal(inv.lines, (inv as any).vatEnabled ?? true, Number((inv as any).vatPct ?? 25));
                      const customerType = (inv as any).customerType ?? "B2B";
                      return (
                        <Link
                          key={inv.id}
                          href={`/invoices/${inv.id}`}
                          className="flex items-center gap-4 px-4 py-3 hover:bg-secondary/20 transition-colors block"
                        >
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2">
                              <span className="font-mono text-xs text-muted-foreground">
                                F-{String(inv.number).padStart(4, "0")}
                              </span>
                              <span className="text-sm font-medium truncate">
                                {inv.company.name}
                              </span>
                            </div>
                            {inv.project && (
                              <p className="text-xs text-muted-foreground flex items-center gap-1 mt-0.5">
                                <FolderKanban className="h-3 w-3 shrink-0" />
                                {inv.project.title}
                              </p>
                            )}
                          </div>
                          {inv.dueDate && (
                            <span className="text-xs text-muted-foreground hidden sm:flex items-center gap-1 shrink-0">
                              <CalendarDays className="h-3 w-3" />
                              {formatDate(inv.dueDate)}
                            </span>
                          )}
                          <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-semibold shrink-0 ${
                            customerType === "B2B"
                              ? "bg-blue-50 text-blue-700 border border-blue-200"
                              : "bg-violet-50 text-violet-700 border border-violet-200"
                          }`}>
                            {customerType}
                          </span>
                          <span className={`text-xs px-2 py-0.5 rounded-full font-medium shrink-0 ${s.bg}`}>
                            {s.label}
                          </span>
                          <span className="text-sm font-semibold tabular-nums text-primary shrink-0">
                            {formatCurrency(total)}
                          </span>
                        </Link>
                      );
                    })}
                  </div>
                </div>
              </div>
            ))}
        </div>
      )}
    </>
  );
}
