import { getQuotes } from "@/app/actions/quotes";
import { AppTopbar } from "@/components/layout/AppTopbar";
import { PageHeader } from "@/components/shared/PageHeader";
import { Button } from "@/components/ui/button";
import { FileText, Plus, FileSignature, CalendarDays, AlertCircle, ArrowRight } from "lucide-react";
import Link from "next/link";
import { formatDate, formatCurrency } from "@/lib/utils";

const QUOTE_STATUS: Record<string, { label: string; bg: string }> = {
  draft:    { label: "Kladde",    bg: "bg-slate-100 text-slate-700" },
  sent:     { label: "Sendt",     bg: "bg-blue-100 text-blue-700" },
  accepted: { label: "Accepteret", bg: "bg-emerald-100 text-emerald-700" },
  rejected: { label: "Afvist",    bg: "bg-red-100 text-red-700" },
  expired:  { label: "Udløbet",   bg: "bg-amber-100 text-amber-700" },
};

function quoteTotal(
  lines: { quantity: unknown; unitPrice: unknown; discountPct?: unknown }[],
  vatEnabled = true,
  vatPct = 25,
) {
  const subtotal = lines.reduce((sum, l) => {
    const base = Number(l.quantity) * Number(l.unitPrice);
    const disc = Number(l.discountPct ?? 0);
    return sum + base * (1 - disc / 100);
  }, 0);
  return vatEnabled ? subtotal * (1 + vatPct / 100) : subtotal;
}

export default async function QuotesPage() {
  const quotes = await getQuotes();
  const now = new Date();

  // Visuel "udløbet"-status: validUntil er passeret OG status er stadig draft/sent.
  // (Den persistente status ændres af et job senere — UI gør det selv synligt nu)
  const decorated = quotes.map((q) => {
    const expired =
      q.validUntil && new Date(q.validUntil) < now && ["draft", "sent"].includes(q.status);
    return { ...q, _displayStatus: expired ? "expired" : q.status };
  });

  const draft    = decorated.filter((q) => q._displayStatus === "draft");
  const sent     = decorated.filter((q) => q._displayStatus === "sent");
  const accepted = decorated.filter((q) => q._displayStatus === "accepted");
  const rejected = decorated.filter((q) => q._displayStatus === "rejected");
  const expired  = decorated.filter((q) => q._displayStatus === "expired");

  const openValue = [...draft, ...sent].reduce(
    (s, q) =>
      s +
      quoteTotal(q.lines, (q as any).vatEnabled ?? true, Number((q as any).vatPct ?? 25)),
    0,
  );

  return (
    <>
      <AppTopbar pageTitle="Tilbud" />

      <PageHeader
        title="Tilbud"
        description={
          quotes.length === 0
            ? "Send tilbud til kunder. Når de accepteres, konvertér til faktura med ét klik."
            : `${quotes.length} tilbud — ${formatCurrency(openValue)} i åbne tilbud`
        }
        actions={
          <Link href="/quotes/new">
            <Button size="md">
              <Plus className="h-4 w-4" />
              Nyt tilbud
            </Button>
          </Link>
        }
      />

      {quotes.length === 0 ? (
        <div className="bg-card border border-border rounded-xl p-16 text-center">
          <FileSignature className="h-10 w-10 text-muted-foreground mx-auto mb-4" />
          <p className="font-semibold mb-1">Ingen tilbud endnu</p>
          <p className="text-sm text-muted-foreground mb-4 max-w-md mx-auto">
            Opret et tilbud manuelt eller generér fra et deal i pipelinen.
            Accepterede tilbud konverteres til faktura med ét klik.
          </p>
          <div className="flex items-center justify-center gap-2">
            <Link href="/quotes/new">
              <Button size="sm">
                <Plus className="h-3.5 w-3.5" />
                Nyt tilbud
              </Button>
            </Link>
            <Link href="/pipeline">
              <Button size="sm" variant="ghost">
                Gå til pipeline
              </Button>
            </Link>
          </div>
        </div>
      ) : (
        <div className="space-y-6">
          {[
            { title: "Kladder",     items: draft,    icon: FileText },
            { title: "Sendte",      items: sent,     icon: FileSignature },
            { title: "Accepterede", items: accepted, icon: ArrowRight },
            { title: "Udløbne",     items: expired,  icon: AlertCircle },
            { title: "Afviste",     items: rejected, icon: AlertCircle },
          ]
            .filter((g) => g.items.length > 0)
            .map((group) => (
              <div key={group.title}>
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-3">
                  {group.title} ({group.items.length})
                </p>
                <div className="bg-card border border-border rounded-xl overflow-hidden">
                  <div className="divide-y divide-border">
                    {group.items.map((q) => {
                      const s = QUOTE_STATUS[q._displayStatus] ?? QUOTE_STATUS.draft;
                      const total = quoteTotal(
                        q.lines,
                        (q as any).vatEnabled ?? true,
                        Number((q as any).vatPct ?? 25),
                      );
                      return (
                        <Link
                          key={q.id}
                          href={`/quotes/${q.id}`}
                          className="flex items-center gap-4 px-4 py-3 hover:bg-secondary/20 transition-colors block"
                        >
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className="font-mono text-xs text-muted-foreground">
                                Q-{String(q.number).padStart(4, "0")}
                              </span>
                              <span className="text-sm font-medium truncate">
                                {q.company.name}
                              </span>
                              {q.title && (
                                <span className="text-xs text-muted-foreground truncate">
                                  · {q.title}
                                </span>
                              )}
                            </div>
                            {q.deal && (
                              <p className="text-xs text-muted-foreground mt-0.5">
                                Fra deal: {q.deal.title}
                              </p>
                            )}
                          </div>
                          {q.validUntil && (
                            <span className="text-xs text-muted-foreground hidden sm:flex items-center gap-1 shrink-0">
                              <CalendarDays className="h-3 w-3" />
                              {formatDate(q.validUntil)}
                            </span>
                          )}
                          <span
                            className={`text-[10px] px-2 py-0.5 rounded-full font-semibold shrink-0 ${s.bg}`}
                          >
                            {s.label}
                          </span>
                          <span className="text-sm font-semibold tabular-nums w-28 text-right shrink-0">
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
