import { getInvoice, updateInvoice, deleteInvoice, upsertInvoiceLine, deleteInvoiceLine } from "@/app/actions/invoices";
import { AppTopbar } from "@/components/layout/AppTopbar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { notFound } from "next/navigation";
import Link from "next/link";
import {
  FileText, ChevronRight, Trash2, Plus,
} from "lucide-react";
import { formatDate, formatCurrency } from "@/lib/utils";
import { BackButton } from "@/components/shared/BackButton";
import { QrCode } from "@/components/shared/QrCode";

const STATUS_OPTS = [
  { value: "draft",     label: "Kladde" },
  { value: "sent",      label: "Sendt" },
  { value: "paid",      label: "Betalt" },
  { value: "cancelled", label: "Annulleret" },
];

const LINE_TYPES = [
  { value: "time",    label: "Timer"   },
  { value: "product", label: "Produkt" },
  { value: "manual",  label: "Manuel"  },
  { value: "discount",label: "Rabat"   },
];

const VAT_PCT = 25; // Dansk standard moms

export default async function InvoiceDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ from?: string }>;
}) {
  const { id } = await params;
  const { from } = await searchParams;
  const invoice = await getInvoice(id);
  if (!invoice) notFound();

  // Server-side "tilbage"-mål. Hvis brugeren kom fra en kunde-side
  // (eller hvor som helst med ?from=), respektér det. Ellers default til faktura-listen.
  const backHref =
    from && from.startsWith("/") && !from.startsWith("//") ? from : "/invoices";

  async function handleDelete() {
    "use server";
    await deleteInvoice(id);
  }

  const invoiceRef = `F-${String(invoice.number).padStart(4, "0")}`;

  // Moms-konfiguration (backward-compatible med optional chaining)
  const vatEnabled = (invoice as any).vatEnabled ?? true;
  const customerType = (invoice as any).customerType ?? "B2B";

  // Beregn totaler inkl. rabat pr. linje
  const subtotal = invoice.lines.reduce((sum, l) => {
    const lineBase = Number(l.quantity) * Number(l.unitPrice);
    const discPct = Number((l as any).discountPct ?? 0);
    const lineAfterDisc = lineBase * (1 - discPct / 100);
    return sum + (l.isCredit ? -lineAfterDisc : lineAfterDisc);
  }, 0);
  const vatAmount = vatEnabled ? subtotal * (VAT_PCT / 100) : 0;
  const total = subtotal + vatAmount;

  return (
    <>
      <AppTopbar pageTitle={`Faktura ${invoiceRef}`} />


      <BackButton href={backHref} />
      <div className="flex items-center gap-2 text-sm text-muted-foreground mb-5">
        <Link href="/invoices" className="hover:text-foreground transition-colors">Fakturaer</Link>
        <ChevronRight className="h-3.5 w-3.5" />
        <span className="font-mono text-xs">{invoiceRef}</span>
        <ChevronRight className="h-3.5 w-3.5" />
        <span className="text-foreground font-medium">{invoice.company.name}</span>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">

        {/* VENSTRE — info + rediger */}
        <div className="xl:col-span-1 space-y-4">
          <div className="bg-card border border-border rounded-xl p-4">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-xl bg-blue-500/10 flex items-center justify-center shrink-0">
                <FileText className="h-5 w-5 text-blue-600" />
              </div>
              <div>
                <p className="font-mono text-xs text-muted-foreground">{invoiceRef}</p>
                <p className="font-semibold">{invoice.company.name}</p>
                {invoice.project && (
                  <Link href={`/projects/${invoice.project.id}`} className="text-xs text-muted-foreground hover:text-primary transition-colors">
                    {invoice.project.title}
                  </Link>
                )}
              </div>
              <QrCode
                url={`${process.env.NEXT_PUBLIC_APP_URL ?? ""}/invoices/${invoice.id}`}
                storageKey={`invoice/${invoice.id}`}
                label={invoiceRef}
              />
            </div>

            <div className="p-3 bg-secondary/50 rounded-lg mb-4 space-y-1">
              <div className="flex justify-between text-xs">
                <span className="text-muted-foreground">Linjer</span>
                <span>{invoice.lines.length}</span>
              </div>
              <div className="flex justify-between text-xs">
                <span className="text-muted-foreground">Subtotal ekskl. moms</span>
                <span className="tabular-nums">{formatCurrency(subtotal)}</span>
              </div>
              {vatEnabled && (
                <div className="flex justify-between text-xs">
                  <span className="text-muted-foreground">Moms ({VAT_PCT}%)</span>
                  <span className="tabular-nums">{formatCurrency(vatAmount)}</span>
                </div>
              )}
              <div className="flex justify-between text-sm font-bold border-t border-border pt-1 mt-1">
                <span>Total inkl. moms</span>
                <span className="text-primary tabular-nums">{formatCurrency(total)}</span>
              </div>
            </div>

            <form action={updateInvoice} className="space-y-3">
              <input type="hidden" name="id" value={invoice.id} />
              <div className="space-y-1.5">
                <label className="block text-sm font-medium text-foreground">Status</label>
                <select name="status" defaultValue={invoice.status}
                  className="w-full px-3 py-2 rounded-lg border border-input bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring">
                  {STATUS_OPTS.map((s) => (
                    <option key={s.value} value={s.value}>{s.label}</option>
                  ))}
                </select>
              </div>

              {/* Kundetype B2B / B2C */}
              <div className="space-y-1.5">
                <label className="block text-sm font-medium text-foreground">Kundetype</label>
                <select name="customerType" defaultValue={customerType}
                  className="w-full px-3 py-2 rounded-lg border border-input bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring">
                  <option value="B2B">B2B (erhvervskunde)</option>
                  <option value="B2C">B2C (privatkunde)</option>
                </select>
              </div>

              {/* Moms toggle */}
              <div className="flex items-center gap-2 py-1">
                <input type="checkbox" name="vatEnabled" value="true" id="vatEnabled"
                  defaultChecked={vatEnabled}
                  className="rounded border-input h-4 w-4" />
                <label htmlFor="vatEnabled" className="text-sm cursor-pointer select-none">
                  Tilføj dansk moms (25%)
                </label>
              </div>

              <Input name="dueDate" label="Betalingsfrist" type="date"
                defaultValue={invoice.dueDate ? new Date(invoice.dueDate).toISOString().split("T")[0] : ""} />
              <div className="space-y-1.5">
                <label className="block text-sm font-medium text-foreground">Interne noter</label>
                <textarea name="notes" rows={2} defaultValue={invoice.notes ?? ""}
                  className="w-full px-3 py-2 rounded-lg border border-input bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring resize-none" />
              </div>
              <div className="flex items-center justify-between pt-1">
                <Button type="submit" size="sm">Gem</Button>
                                  <Button type="submit" formAction={handleDelete} variant="ghost" size="sm" className="text-destructive hover:text-destructive hover:bg-destructive/10">
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
              </div>
            </form>
          </div>
        </div>

        {/* HOEJRE — faktura-preview + linjer */}
        <div className="xl:col-span-2 space-y-5">

          {/* Faktura-preview (udskriv-venlig) */}
          <div className="bg-card border border-border rounded-xl p-6 print:shadow-none" id="invoice-print">
            {/* Header */}
            <div className="flex items-start justify-between mb-8">
              <div>
                <p className="text-2xl font-bold text-primary mb-1">FAKTURA</p>
                <p className="font-mono text-sm text-muted-foreground">{invoiceRef}</p>
                <span className={`text-xs px-2 py-0.5 rounded-full mt-1.5 inline-block font-medium ${
                  customerType === "B2B"
                    ? "bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300"
                    : "bg-violet-100 text-violet-700 dark:bg-violet-900/40 dark:text-violet-300"
                }`}>
                  {customerType}
                </span>
              </div>
              <div className="text-right text-sm">
                <p className="font-semibold">{invoice.tenant.name}</p>
                <p className="text-muted-foreground text-xs">Udstedt: {formatDate(invoice.issueDate)}</p>
                {invoice.dueDate && (
                  <p className="text-muted-foreground text-xs">Forfald: {formatDate(invoice.dueDate)}</p>
                )}
              </div>
            </div>

            {/* Modtager */}
            <div className="mb-8 p-3 bg-secondary/40 rounded-lg">
              <p className="text-xs text-muted-foreground mb-1 uppercase font-medium">Faktureres til</p>
              <p className="font-semibold">{invoice.company.name}</p>
              {invoice.company.address && <p className="text-sm text-muted-foreground">{invoice.company.address}</p>}
              {invoice.company.zipCode && (
                <p className="text-sm text-muted-foreground">{invoice.company.zipCode} {invoice.company.city}</p>
              )}
              {invoice.company.orgNumber && (
                <p className="text-xs text-muted-foreground mt-1">CVR: {invoice.company.orgNumber}</p>
              )}
            </div>

            {/* Linjer */}
            <table className="w-full text-sm mb-6">
              <thead>
                <tr className="border-b border-border">
                  <th className="text-left pb-2 font-medium text-muted-foreground">Beskrivelse</th>
                  <th className="text-right pb-2 font-medium text-muted-foreground w-16">Antal</th>
                  <th className="text-right pb-2 font-medium text-muted-foreground w-28">Enhedspris</th>
                  <th className="text-right pb-2 font-medium text-muted-foreground w-16">Rabat</th>
                  <th className="text-right pb-2 font-medium text-muted-foreground w-28">Beløb</th>
                  <th className="w-8 pb-2 print:hidden"></th>
                </tr>
              </thead>
              <tbody>
                {invoice.lines.map((line) => {
                  const lineBase = Number(line.quantity) * Number(line.unitPrice);
                  const discPct = Number((line as any).discountPct ?? 0);
                  const lineAmount = lineBase * (1 - discPct / 100);
                  return (
                    <tr key={line.id} className="border-b border-border/50 group">
                      <td className="py-2.5">
                        <p>{line.description}</p>
                        {line.isCredit && <span className="text-xs text-emerald-600">(kreditering)</span>}
                      </td>
                      <td className="py-2.5 text-right tabular-nums text-muted-foreground">
                        {Number(line.quantity)}
                      </td>
                      <td className="py-2.5 text-right tabular-nums text-muted-foreground">
                        {formatCurrency(Number(line.unitPrice))}
                      </td>
                      <td className="py-2.5 text-right tabular-nums">
                        {discPct > 0 ? (
                          <span className="text-amber-600 text-xs font-medium">{discPct}%</span>
                        ) : (
                          <span className="text-muted-foreground/30">—</span>
                        )}
                      </td>
                      <td className={`py-2.5 text-right tabular-nums font-medium ${line.isCredit ? "text-emerald-600" : ""}`}>
                        {line.isCredit ? `-${formatCurrency(lineAmount)}` : formatCurrency(lineAmount)}
                      </td>
                      <td className="py-2.5 print:hidden">
                        <form action={async () => { "use server"; await deleteInvoiceLine(line.id, invoice.id); }}>
                          <button type="submit" className="opacity-0 group-hover:opacity-100 text-muted-foreground hover:text-destructive transition-all p-0.5">
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        </form>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
              <tfoot>
                <tr>
                  <td colSpan={4} className="pt-3 text-right text-sm text-muted-foreground">Subtotal ekskl. moms</td>
                  <td className="pt-3 text-right tabular-nums text-sm">{formatCurrency(subtotal)}</td>
                  <td className="print:hidden"></td>
                </tr>
                {vatEnabled && (
                  <tr>
                    <td colSpan={4} className="pt-1 text-right text-sm text-muted-foreground">Moms ({VAT_PCT}%)</td>
                    <td className="pt-1 text-right tabular-nums text-sm">{formatCurrency(vatAmount)}</td>
                    <td className="print:hidden"></td>
                  </tr>
                )}
                <tr className="border-t border-border">
                  <td colSpan={4} className="pt-3 text-right font-bold">Total inkl. moms</td>
                  <td className="pt-3 text-right font-bold text-primary tabular-nums text-base">
                    {formatCurrency(total)}
                  </td>
                  <td className="print:hidden"></td>
                </tr>
                <tr>
                  <td colSpan={6} className="pt-1 pb-2 text-right text-xs text-muted-foreground">
                    Heraf moms: {formatCurrency(vatEnabled ? vatAmount : 0)} · {customerType}
                  </td>
                </tr>
              </tfoot>
            </table>

            {invoice.notes && (
              <p className="text-sm text-muted-foreground border-t border-border pt-4">{invoice.notes}</p>
            )}
          </div>

          {/* Tilføj linje */}
          <div className="bg-card border border-border rounded-xl p-5 print:hidden">
            <h3 className="text-sm font-semibold mb-4 flex items-center gap-2">
              <Plus className="h-4 w-4 text-muted-foreground" /> Tilføj linje
            </h3>
            <form action={upsertInvoiceLine} className="space-y-3">
              <input type="hidden" name="invoiceId" value={invoice.id} />
              <input type="hidden" name="sortOrder" value={String(invoice.lines.length)} />

              <Input name="description" label="Beskrivelse" required placeholder="Konsulentydelse / Produkt / Rabat" />

              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                <Input name="quantity" label="Antal" type="number" step="0.01" defaultValue="1" required />
                <Input name="unitPrice" label="Enhedspris (DKK)" type="number" step="0.01" defaultValue="0" required />
                <Input name="discountPct" label="Rabat %" type="number" step="0.01" min="0" max="100" defaultValue="0" />
                <div className="space-y-1.5">
                  <label className="block text-sm font-medium text-foreground">Type</label>
                  <select name="type" className="w-full px-3 py-2 rounded-lg border border-input bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring">
                    {LINE_TYPES.map((t) => <option key={t.value} value={t.value}>{t.label}</option>)}
                  </select>
                </div>
              </div>

              <div className="flex items-center gap-3">
                <label className="flex items-center gap-2 text-sm cursor-pointer">
                  <input type="checkbox" name="isCredit" value="true" className="rounded" />
                  Minuslinje (kreditering)
                </label>
              </div>

              <Button type="submit" size="sm">
                <Plus className="h-3.5 w-3.5" /> Tilføj linje
              </Button>
            </form>
          </div>
        </div>
      </div>
    </>
  );
}
