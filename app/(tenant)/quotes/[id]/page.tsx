import {
  getQuote, updateQuote, upsertQuoteLine, deleteQuoteLine,
  sendQuote, acceptQuote, rejectQuote, convertQuoteToInvoice, deleteQuote,
} from "@/app/actions/quotes";
import { getProducts } from "@/app/actions/products";
import { AppTopbar } from "@/components/layout/AppTopbar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { notFound } from "next/navigation";
import Link from "next/link";
import {
  FileSignature, ChevronRight, Trash2, Plus, Send, CheckCircle2, XCircle, Receipt, Calendar,
} from "lucide-react";
import { formatDate, formatCurrency } from "@/lib/utils";
import { BackButton } from "@/components/shared/BackButton";
import { CreatorBadge } from "@/components/shared/CreatorBadge";
import { QuoteProductsPanel } from "@/components/quotes/QuoteProductsPanel";
import { MailtoSendButton } from "@/components/shared/MailtoSendButton";
import { lineTotal, type BillingIntervalSlug } from "@/lib/billing-intervals";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";

const STATUS_OPTS: Record<string, { label: string; bg: string }> = {
  draft:    { label: "Kladde",     bg: "bg-slate-100 text-slate-700" },
  sent:     { label: "Sendt",      bg: "bg-blue-100 text-blue-700" },
  accepted: { label: "Accepteret", bg: "bg-emerald-100 text-emerald-700" },
  rejected: { label: "Afvist",     bg: "bg-red-100 text-red-700" },
  expired:  { label: "Udløbet",    bg: "bg-amber-100 text-amber-700" },
};

const LINE_TYPES = [
  { value: "product", label: "Produkt" },
  { value: "manual",  label: "Manuel"  },
  { value: "discount",label: "Rabat"   },
];

const VAT_PCT = 25;

export default async function QuoteDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ from?: string }>;
}) {
  const { id } = await params;
  const { from } = await searchParams;
  const session = await auth();
  const [quote, allProducts, primaryContact] = await Promise.all([
    getQuote(id),
    getProducts({ isActive: true }),
    // Find første aktive kontakt på kunden for default-mail-modtager
    db.contact.findFirst({
      where: { companyId: (await getQuote(id))?.companyId ?? "" },
      orderBy: { createdAt: "asc" },
      select: { email: true, firstName: true },
    }).catch(() => null),
  ]);
  if (!quote) notFound();


  // Serialiser produkter til client-komponenten
  const availableProducts = (allProducts as any[]).map((p) => ({
    id: p.id,
    name: p.name,
    type: p.type,
    pricingMode: (p.pricingMode ?? "per_unit") as "per_unit" | "per_user_per_period",
    pricing: (p.pricing ?? []).map((pp: any) => ({ interval: pp.interval, price: Number(pp.price) })),
  }));

  // Adskil produkt-linjer fra manuelle linjer
  const productLines = quote.lines.filter((l: any) => l.productId);
  const manualLines  = quote.lines.filter((l: any) => !l.productId);

  const serializedProductLines = productLines.map((l: any) => ({
    id: l.id,
    description: l.description,
    quantity: Number(l.quantity),
    unitPrice: Number(l.unitPrice),
    discountPct: Number(l.discountPct),
    productId: l.productId,
    product: l.product ? {
      id: l.product.id,
      name: l.product.name,
      type: l.product.type,
      pricingMode: (l.product.pricingMode ?? "per_unit") as "per_unit" | "per_user_per_period",
      pricing: (l.product.pricing ?? []).map((pp: any) => ({ interval: pp.interval, price: Number(pp.price) })),
    } : null,
    seats: l.seats,
    pricingInterval: l.pricingInterval,
    billingInterval: l.billingInterval,
    unitPriceOverride: l.unitPriceOverride ? Number(l.unitPriceOverride) : null,
  }));

  const backHref =
    from && from.startsWith("/") && !from.startsWith("//") ? from : "/quotes";

  const quoteRef = `Q-${String(quote.number).padStart(4, "0")}`;
  const editable = ["draft", "sent"].includes(quote.status);
  const now = new Date();
  const isExpired =
    quote.validUntil && new Date(quote.validUntil) < now &&
    ["draft", "sent"].includes(quote.status);
  const displayStatus = isExpired ? "expired" : quote.status;
  const statusMeta = STATUS_OPTS[displayStatus] ?? STATUS_OPTS.draft;

  // Total beregning — SaaS-linjer bruger lineTotal med periode-multiplikator,
  // manuelle linjer bruger flad pris × quantity
  const subtotal = quote.lines.reduce((s, l: any) => {
    const disc = Number(l.discountPct ?? 0);
    let base: number;
    if (l.productId && l.product?.pricingMode === "per_user_per_period") {
      base = lineTotal({
        pricingMode: "per_user_per_period",
        unitPrice: Number(l.unitPrice),
        seats: l.seats ?? Number(l.quantity),
        pricingInterval: (l.pricingInterval ?? "monthly") as BillingIntervalSlug,
        billingInterval: (l.billingInterval ?? "annual") as BillingIntervalSlug,
      });
    } else {
      base = Number(l.quantity) * Number(l.unitPrice);
    }
    return s + base * (1 - disc / 100);
  }, 0);
  const vatAmount = quote.vatEnabled ? subtotal * (VAT_PCT / 100) : 0;
  const total = subtotal + vatAmount;

  async function handleSend()   { "use server"; await sendQuote(id); }
  async function handleAccept() { "use server"; await acceptQuote(id); }
  async function handleConvert(){ "use server"; await convertQuoteToInvoice(id); }
  async function handleDelete() { "use server"; await deleteQuote(id); }

  return (
    <>
      <AppTopbar pageTitle={`Tilbud ${quoteRef}`} />

      <BackButton href={backHref} />

      <div className="flex items-center gap-2 text-sm text-muted-foreground mb-5">
        <Link href="/quotes" className="hover:text-foreground transition-colors">Tilbud</Link>
        <ChevronRight className="h-3.5 w-3.5" />
        <span className="font-mono text-xs">{quoteRef}</span>
        <ChevronRight className="h-3.5 w-3.5" />
        <span className="text-foreground font-medium">{quote.company.name}</span>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        {/* VENSTRE — info + status + actions */}
        <div className="xl:col-span-1 space-y-4">
          <div className="bg-card border border-border rounded-xl p-4">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-xl bg-violet-500/10 flex items-center justify-center shrink-0">
                <FileSignature className="h-5 w-5 text-violet-600" />
              </div>
              <div className="min-w-0">
                <p className="font-mono text-xs text-muted-foreground">{quoteRef}</p>
                <p className="font-semibold truncate">{quote.company.name}</p>
                {quote.title && (
                  <p className="text-xs text-muted-foreground truncate">{quote.title}</p>
                )}
              </div>
            </div>

            <div className="flex items-center justify-between mb-4">
              <span className="text-xs text-muted-foreground">Status</span>
              <span className={`text-xs px-2 py-0.5 rounded-full font-semibold ${statusMeta.bg}`}>
                {statusMeta.label}
              </span>
            </div>

            <div className="space-y-2 text-xs mb-4 pt-3 border-t border-border">
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">Oprettet</span>
                <span>{formatDate(quote.issueDate)}</span>
              </div>
              {quote.validUntil && (
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground flex items-center gap-1">
                    <Calendar className="h-3 w-3" /> Gyldig til
                  </span>
                  <span className={isExpired ? "text-amber-700 font-medium" : ""}>
                    {formatDate(quote.validUntil)}
                  </span>
                </div>
              )}
              {quote.sentAt && (
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">Sendt</span>
                  <span>{formatDate(quote.sentAt)}</span>
                </div>
              )}
              {quote.acceptedAt && (
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">Accepteret</span>
                  <span>{formatDate(quote.acceptedAt)}</span>
                </div>
              )}
              {quote.deal && (
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">Fra deal</span>
                  <Link href={`/pipeline/${quote.deal.id}`} className="text-primary hover:underline truncate max-w-[140px]">
                    {quote.deal.title}
                  </Link>
                </div>
              )}
              {quote.convertedToInvoiceId && (
                <div className="flex items-center justify-between pt-2 border-t border-border">
                  <span className="text-muted-foreground">Konverteret til</span>
                  <Link
                    href={`/invoices/${quote.convertedToInvoiceId}`}
                    className="text-emerald-700 font-medium hover:underline flex items-center gap-1"
                  >
                    <Receipt className="h-3 w-3" /> Faktura
                  </Link>
                </div>
              )}
            </div>

            {/* Status-handlinger */}
            {editable && !quote.convertedToInvoiceId && (
              <div className="space-y-2 pt-3 border-t border-border">
                {/* Aabn mail-klient med pre-fyldt indhold */}
                <MailtoSendButton
                  triggerLabel="Send tilbud via mail"
                  defaultTo={primaryContact?.email ?? ""}
                  defaultSubject={`Tilbud ${quoteRef} fra ${quote.tenant.name}`}
                  defaultMessage={
                    `Hej${primaryContact?.firstName ? " " + primaryContact.firstName : ""}\n\n` +
                    `Hermed tilbud ${quoteRef} på${quote.title ? " " + quote.title : ""}.\n\n` +
                    `Total: ${new Intl.NumberFormat("da-DK").format(Math.round(total))} kr inkl. moms.\n\n` +
                    `Lad mig vide hvis du har spørgsmål.\n\n` +
                    `Mvh\n${(session?.user as any)?.name ?? "Plesner Tech"}`
                  }
                  resourceType="quote"
                  resourceId={id}
                />
                {quote.status === "draft" && (
                  <form action={handleSend}>
                    <Button type="submit" size="sm" variant="ghost" className="w-full">
                      <Send className="h-3.5 w-3.5" /> Markér som sendt (uden mail)
                    </Button>
                  </form>
                )}
                <form action={handleAccept}>
                  <Button type="submit" size="sm" variant="ghost" className="w-full text-emerald-700">
                    <CheckCircle2 className="h-3.5 w-3.5" /> Markér accepteret
                  </Button>
                </form>
                <form action={rejectQuote.bind(null, id)}>
                  <Input
                    name="reason"
                    placeholder="Årsag (valgfri)"
                    className="text-xs h-8 mb-1"
                  />
                  <Button type="submit" size="sm" variant="ghost" className="w-full text-red-700">
                    <XCircle className="h-3.5 w-3.5" /> Afvis tilbud
                  </Button>
                </form>
              </div>
            )}

            {quote.status === "accepted" && !quote.convertedToInvoiceId && (
              <form action={handleConvert} className="pt-3 border-t border-border">
                <Button type="submit" size="sm" className="w-full bg-emerald-600 hover:bg-emerald-700">
                  <Receipt className="h-3.5 w-3.5" /> Konvertér til faktura
                </Button>
                <p className="text-[11px] text-muted-foreground mt-1.5 text-center">
                  Opretter en faktura-kladde med samme linjer.
                </p>
              </form>
            )}

            {!quote.convertedToInvoiceId && (
              <form action={handleDelete} className="pt-3 border-t border-border">
                <Button type="submit" size="sm" variant="ghost" className="w-full text-muted-foreground">
                  <Trash2 className="h-3.5 w-3.5" /> Slet tilbud
                </Button>
              </form>
            )}

            <div className="pt-3 border-t border-border mt-3">
              <CreatorBadge
                createdById={quote.createdById}
                createdByImpersonatorId={quote.createdByImpersonatorId}
                createdAt={quote.createdAt}
              />
            </div>
          </div>

          {/* Indstillinger */}
          {editable && (
            <form action={updateQuote.bind(null, id)} className="bg-card border border-border rounded-xl p-4 space-y-3">
              <h3 className="text-sm font-semibold">Indstillinger</h3>

              <div>
                <label className="text-xs text-muted-foreground">Emne</label>
                <Input name="title" defaultValue={quote.title ?? ""} className="text-sm" />
              </div>

              <div>
                <label className="text-xs text-muted-foreground">Gyldig til</label>
                <Input
                  name="validUntil"
                  type="date"
                  defaultValue={quote.validUntil ? new Date(quote.validUntil).toISOString().slice(0, 10) : ""}
                  className="text-sm"
                />
              </div>

              <div>
                <label className="text-xs text-muted-foreground">Noter</label>
                <textarea
                  name="notes"
                  defaultValue={quote.notes ?? ""}
                  rows={3}
                  className="w-full text-sm rounded-lg border border-border bg-background px-3 py-2"
                />
              </div>

              <div className="flex items-center gap-2 text-xs">
                <label className="flex items-center gap-1.5">
                  <input
                    type="checkbox"
                    name="vatEnabled"
                    value="true"
                    defaultChecked={quote.vatEnabled}
                  />
                  Moms ({VAT_PCT}%)
                </label>
                <input type="hidden" name="vatPct" value={String(quote.vatPct)} />
              </div>

              <Button type="submit" size="sm" className="w-full">Gem indstillinger</Button>
            </form>
          )}
        </div>

        {/* HØJRE — produkt-linjer (SaaS-aware) + manuelle linjer + total */}
        <div className="xl:col-span-2 space-y-4">

          {/* Produkt-panel (SaaS-aware, pris-pr-bruger-pr-md) */}
          <QuoteProductsPanel
            quoteId={id}
            productLines={serializedProductLines}
            availableProducts={availableProducts}
            editable={editable}
          />

          {/* Manuelle linjer (timer, rabat, fri-tekst) */}
          <div className="bg-card border border-border rounded-xl p-4">
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-sm font-semibold">Manuelle linjer ({manualLines.length})</h2>
            </div>

            {manualLines.length === 0 ? (
              <p className="text-xs text-muted-foreground py-3 text-center">
                Tilføj manuelle linjer for timer, rabatter eller fri-tekst.
              </p>
            ) : (
              <div className="divide-y divide-border -mx-4">
                {manualLines.map((l: any) => {
                  const base = Number(l.quantity) * Number(l.unitPrice);
                  const tot = base * (1 - Number(l.discountPct) / 100);
                  return (
                    <div key={l.id} className="px-4 py-2.5 flex items-center gap-3 text-sm hover:bg-secondary/20">
                      <div className="flex-1 min-w-0">
                        <p className="font-medium truncate">{l.description}</p>
                        <p className="text-xs text-muted-foreground">
                          {Number(l.quantity)} × {formatCurrency(Number(l.unitPrice))}
                          {Number(l.discountPct) > 0 && ` · ${Number(l.discountPct)}% rabat`}
                        </p>
                      </div>
                      <span className="font-mono text-sm tabular-nums w-28 text-right">
                        {formatCurrency(tot)}
                      </span>
                      {editable && (
                        <form action={deleteQuoteLine.bind(null, l.id, id)}>
                          <button type="submit" className="text-muted-foreground hover:text-red-600">
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        </form>
                      )}
                    </div>
                  );
                })}
              </div>
            )}

            {/* Linje-form */}
            {editable && (
              <form
                action={upsertQuoteLine.bind(null, id)}
                className="mt-4 pt-4 border-t border-border grid grid-cols-12 gap-2 items-end"
              >
                <div className="col-span-5">
                  <label className="text-xs text-muted-foreground">Beskrivelse</label>
                  <Input name="description" required className="text-sm h-9" />
                </div>
                <div className="col-span-1">
                  <label className="text-xs text-muted-foreground">Antal</label>
                  <Input name="quantity" type="number" step="0.01" defaultValue="1" className="text-sm h-9" />
                </div>
                <div className="col-span-2">
                  <label className="text-xs text-muted-foreground">Pris</label>
                  <Input name="unitPrice" type="number" step="0.01" defaultValue="0" className="text-sm h-9" />
                </div>
                <div className="col-span-1">
                  <label className="text-xs text-muted-foreground">Rabat%</label>
                  <Input name="discountPct" type="number" step="0.01" defaultValue="0" className="text-sm h-9" />
                </div>
                <div className="col-span-2">
                  <label className="text-xs text-muted-foreground">Type</label>
                  <select name="type" defaultValue="manual" className="w-full h-9 px-2 rounded-lg border border-border bg-background text-sm">
                    {LINE_TYPES.map((t) => <option key={t.value} value={t.value}>{t.label}</option>)}
                  </select>
                </div>
                <div className="col-span-1">
                  <Button type="submit" size="sm" className="w-full h-9">
                    <Plus className="h-3.5 w-3.5" />
                  </Button>
                </div>
              </form>
            )}

            {/* Total */}
            <div className="mt-4 pt-4 border-t border-border space-y-1 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Subtotal</span>
                <span className="tabular-nums">{formatCurrency(subtotal)}</span>
              </div>
              {quote.vatEnabled && (
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Moms ({VAT_PCT}%)</span>
                  <span className="tabular-nums">{formatCurrency(vatAmount)}</span>
                </div>
              )}
              <div className="flex justify-between pt-2 border-t border-border font-semibold text-base">
                <span>Total</span>
                <span className="tabular-nums">{formatCurrency(total)}</span>
              </div>
            </div>
          </div>

          {quote.notes && (
            <div className="bg-card border border-border rounded-xl p-4">
              <h3 className="text-sm font-semibold mb-2">Noter</h3>
              <p className="text-sm text-muted-foreground whitespace-pre-wrap">{quote.notes}</p>
            </div>
          )}
        </div>
      </div>
    </>
  );
}
