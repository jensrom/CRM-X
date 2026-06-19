import { getDeal } from "@/app/actions/deals";
import { getProducts } from "@/app/actions/products";
import { AppTopbar } from "@/components/layout/AppTopbar";
import { Button } from "@/components/ui/button";
import { StageSwitcher } from "@/components/pipeline/StageSwitcher";
import { DealProductsPanel } from "@/components/pipeline/DealProductsPanel";
import { WonDealButton } from "@/components/pipeline/WonDealButton";
import { GenerateQuoteButton } from "@/components/pipeline/GenerateQuoteButton";
import { CreatorBadge } from "@/components/shared/CreatorBadge";
import { notFound } from "next/navigation";
import Link from "next/link";
import {
  Building2, Calendar, Target, User, Pencil,
  ChevronRight, Clock, Percent, FileText, Receipt
} from "lucide-react";
import { formatCurrency, formatDate, DEAL_STAGES, INVOICE_STATUS } from "@/lib/utils";
import { BackButton } from "@/components/shared/BackButton";

export default async function DealDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ from?: string }>;
}) {
  const { id } = await params;
  const { from } = await searchParams;
  const [deal, allProducts] = await Promise.all([
    getDeal(id),
    getProducts({ isActive: true }),
  ]);
  if (!deal) notFound();
  const backHref =
    from && from.startsWith("/") && !from.startsWith("//") ? from : "/pipeline";

  const stageMeta = DEAL_STAGES[deal.stage as keyof typeof DEAL_STAGES];
  const isClosed = deal.stage === "won" || deal.stage === "lost";
  const hasActiveInvoice = (deal.invoices ?? []).some((i: any) => i.status !== "cancelled");

  // Serialiser produkter til klient-komponenten
  const productOptions = (allProducts as any[]).map((p) => ({
    id: p.id,
    name: p.name,
    type: p.type,
    pricingMode: (p.pricingMode ?? "per_unit") as "per_unit" | "per_user_per_period",
    pricing: (p.pricing ?? []).map((pp: any) => ({ interval: pp.interval, price: Number(pp.price) })),
  }));
  const dealProductLines = (deal.products ?? []).map((dp: any) => ({
    id: dp.id,
    productId: dp.productId,
    product: {
      id: dp.product.id,
      name: dp.product.name,
      type: dp.product.type,
      pricingMode: (dp.product.pricingMode ?? "per_unit") as "per_unit" | "per_user_per_period",
      pricing: (dp.product.pricing ?? []).map((pp: any) => ({ interval: pp.interval, price: Number(pp.price) })),
    },
    seats: dp.seats,
    pricingInterval: dp.pricingInterval,
    billingInterval: dp.billingInterval,
    unitPriceOverride: dp.unitPriceOverride ? Number(dp.unitPriceOverride) : null,
    discountPct: Number(dp.discountPct),
  }));

  return (
    <>
      <AppTopbar pageTitle={deal.title} />


      <BackButton href={backHref} />
      {/* Breadcrumb */}
      <div className="flex items-center gap-2 text-sm text-muted-foreground mb-5">
        <Link href="/pipeline" className="hover:text-foreground transition-colors">Pipeline</Link>
        <ChevronRight className="h-3.5 w-3.5" />
        <span className="text-foreground font-medium truncate max-w-xs">{deal.title}</span>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">

        {/* VENSTRE: Deal-kort */}
        <div className="xl:col-span-1 space-y-4">
          <div className="bg-card border border-border rounded-xl p-5">
            <div className="flex items-start justify-between mb-4">
              <div>
                <h2 className="font-semibold text-foreground text-base leading-snug">{deal.title}</h2>
                {deal.value && (
                  <p className="text-2xl font-bold text-primary mt-1">
                    {formatCurrency(Number(deal.value))}
                  </p>
                )}
              </div>
              <Link href={`/pipeline/${deal.id}/edit`}>
                <Button variant="ghost" size="sm"><Pencil className="h-3.5 w-3.5" /></Button>
              </Link>
            </div>

            {/* Stage-switcher */}
            <div className="mb-4">
              <p className="text-xs text-muted-foreground font-medium mb-1.5">Stage</p>
              <StageSwitcher dealId={deal.id} currentStage={deal.stage as any} />
            </div>

            <div className="space-y-2.5">
              {deal.company && (
                <div className="flex items-center gap-2.5 text-sm">
                  <Building2 className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                  <Link href={`/kunder/${deal.company.id}`} className="text-primary hover:underline">
                    {deal.company.name}
                  </Link>
                </div>
              )}
              {deal.assignedTo && (
                <div className="flex items-center gap-2.5 text-sm">
                  <User className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                  <span>{deal.assignedTo.name}</span>
                </div>
              )}
              {deal.expectedCloseDate && (
                <div className="flex items-center gap-2.5 text-sm">
                  <Calendar className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                  <span>Lukkes {formatDate(deal.expectedCloseDate)}</span>
                </div>
              )}
              {deal.probability > 0 && (
                <div className="flex items-center gap-2.5 text-sm">
                  <Percent className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                  <div className="flex-1">
                    <div className="flex items-center justify-between mb-0.5">
                      <span className="text-xs text-muted-foreground">Sandsynlighed</span>
                      <span className="text-xs font-semibold">{deal.probability}%</span>
                    </div>
                    <div className="h-1.5 bg-secondary rounded-full overflow-hidden">
                      <div
                        className="h-full bg-primary rounded-full transition-all"
                        style={{ width: `${deal.probability}%` }}
                      />
                    </div>
                  </div>
                </div>
              )}
            </div>

            {deal.notes && (
              <div className="mt-4 pt-4 border-t border-border">
                <p className="text-xs text-muted-foreground font-medium mb-1 flex items-center gap-1.5">
                  <FileText className="h-3.5 w-3.5" /> Noter
                </p>
                <p className="text-sm whitespace-pre-wrap">{deal.notes}</p>
              </div>
            )}

            {deal.lostReason && (
              <div className="mt-4 pt-4 border-t border-border">
                <p className="text-xs text-muted-foreground font-medium mb-1">Tabt-årsag</p>
                <p className="text-sm text-red-600">{deal.lostReason}</p>
              </div>
            )}
          </div>

          {/* Datoer */}
          <div className="bg-card border border-border rounded-xl p-4 space-y-2">
            <p className="text-xs text-muted-foreground font-medium">Tidslinje</p>
            <div className="space-y-1.5 text-xs text-muted-foreground">
              <CreatorBadge
                createdById={(deal as any).createdById}
                createdByImpersonatorId={(deal as any).createdByImpersonatorId}
                createdAt={deal.createdAt}
              />
              {deal.closedAt && <p>Lukket: {formatDate(deal.closedAt)}</p>}
            </div>
          </div>
        </div>

        {/* HØJRE: Produkter + Vundet-knap + Aktiviteter */}
        <div className="xl:col-span-2 space-y-5">

          {/* Produkter på tilbud */}
          <DealProductsPanel
            dealId={deal.id}
            lines={dealProductLines}
            availableProducts={productOptions}
            isClosed={isClosed}
          />

          {/* Tilbud-genererings-flow — kun naar der er produkter at tilbyde */}
          {!isClosed && dealProductLines.length > 0 && (
            <div className="bg-violet-50/40 border border-violet-200 rounded-xl p-4 flex items-center justify-between gap-4">
              <div className="min-w-0">
                <p className="text-sm font-semibold text-violet-900">
                  {(deal.quotes ?? []).length > 0
                    ? `Tilbud sendt (${(deal.quotes ?? []).length})`
                    : "Klar til at sende tilbud?"}
                </p>
                <p className="text-xs text-violet-700/80 mt-0.5">
                  Generér tilbud fra produkterne — accepterede tilbud konverteres til faktura med ét klik.
                </p>
                {(deal.quotes ?? []).length > 0 && (
                  <div className="flex flex-wrap gap-1.5 mt-2">
                    {(deal.quotes ?? []).map((q: any) => (
                      <Link
                        key={q.id}
                        href={`/quotes/${q.id}?from=${encodeURIComponent(`/pipeline/${deal.id}`)}`}
                        className="inline-flex items-center gap-1 text-[11px] px-2 py-0.5 rounded-full bg-white border border-violet-200 hover:border-violet-400 transition-colors"
                      >
                        Q-{String(q.number).padStart(4, "0")}
                        <span className="text-violet-600">·</span>
                        <span className="capitalize">{q.status}</span>
                      </Link>
                    ))}
                  </div>
                )}
              </div>
              <GenerateQuoteButton
                dealId={deal.id}
                hasExistingQuote={(deal.quotes ?? []).length > 0}
              />
            </div>
          )}

          {/* Vundet-knap — kun før dealen er lukket */}
          {!isClosed && dealProductLines.length > 0 && (
            <div className="bg-emerald-50/40 border border-emerald-200 rounded-xl p-4 flex items-center justify-between">
              <div>
                <p className="text-sm font-semibold text-emerald-900">Klar til at lukke?</p>
                <p className="text-xs text-emerald-700/80 mt-0.5">
                  Markér dealen som Vundet og generér faktura + tilkobl produkter på kunden i ét hug.
                </p>
              </div>
              <WonDealButton
                dealId={deal.id}
                productCount={dealProductLines.length}
                hasInvoice={hasActiveInvoice}
                dealTitle={deal.title}
                companyName={deal.company?.name ?? "kunden"}
              />
            </div>
          )}

          {/* Genereret faktura (vises efter Vundet) */}
          {(deal.invoices ?? []).length > 0 && (
            <div className="bg-card border border-border rounded-xl overflow-hidden">
              <div className="px-5 py-3.5 border-b border-border">
                <h3 className="text-sm font-semibold flex items-center gap-2">
                  <Receipt className="h-4 w-4 text-muted-foreground" />
                  Fakturaer fra dette deal ({deal.invoices.length})
                </h3>
              </div>
              <ul className="divide-y divide-border">
                {deal.invoices.map((inv: any) => {
                  const stMeta = (INVOICE_STATUS as any)[inv.status];
                  return (
                    <li key={inv.id}>
                      <Link
                        href={`/invoices/${inv.id}`}
                        className="flex items-center gap-3 px-5 py-3 hover:bg-secondary/30 transition-colors"
                      >
                        <Receipt className="h-4 w-4 text-muted-foreground" />
                        <div className="flex-1">
                          <p className="text-sm font-medium">F-{String(inv.number).padStart(4, "0")}</p>
                          <p className="text-xs text-muted-foreground">{formatDate(inv.issueDate)}</p>
                        </div>
                        <span className="text-xs text-muted-foreground">{stMeta?.label ?? inv.status}</span>
                        <ChevronRight className="h-4 w-4 text-muted-foreground" />
                      </Link>
                    </li>
                  );
                })}
              </ul>
            </div>
          )}

          {/* Aktiviteter */}
          <div className="bg-card border border-border rounded-xl overflow-hidden">
            <div className="px-5 py-3.5 border-b border-border">
              <h3 className="text-sm font-semibold flex items-center gap-2">
                <Clock className="h-4 w-4 text-muted-foreground" />
                Aktiviteter ({deal.activities.length})
              </h3>
            </div>
            {deal.activities.length === 0 ? (
              <p className="px-5 py-8 text-sm text-muted-foreground text-center">
                Ingen aktiviteter endnu.
              </p>
            ) : (
              <div className="divide-y divide-border">
                {deal.activities.map((act: any) => (
                  <div key={act.id} className="flex items-start gap-3 px-5 py-3">
                    <div>
                      <p className="text-sm font-medium">{act.subject}</p>
                      <p className="text-xs text-muted-foreground">{formatDate(act.createdAt)}</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Kommentarer */}
        <DealCommentsSection dealId={deal.id} />
      </div>
    </>
  );
}

async function DealCommentsSection({ dealId }: { dealId: string }) {
  const { listComments } = await import("@/app/actions/comments");
  const { CommentThread } = await import("@/components/comments/CommentThread");
  const initial = await listComments("deal", dealId);
  return (
    <div className="bg-card border border-border rounded-xl p-5 mt-5">
      <CommentThread scope="deal" parentId={dealId} initialComments={initial as any} />
    </div>
  );
}
