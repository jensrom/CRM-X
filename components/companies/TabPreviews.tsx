/**
 * TabPreviews — modal-popup-content til kunde-tabs
 * ────────────────────────────────────────────────
 * Hver komponent rendrer en sammenfatning af en faktura/projekt/ticket/klippekort/tilbud
 * inde i en <PreviewDialog>. Brugeren kan se det vigtigste uden at miste sin plads
 * paa kunden — og klikke "Aabn fuldt" hvis de vil dykke ned.
 *
 * Data kommer ALLEREDE pre-loadet fra getCompanyFull, saa ingen klient-fetch er noedvendig.
 *
 * Server-component-renderet inde i PreviewDialog (client) — Reach tillader det
 * fordi children-prop er erklaeret som ReactNode og bare bliver portaleret ind.
 */

import {
  Receipt, FolderKanban, Scissors, FileSignature,
  Ticket as TicketIcon, ChevronRight, Building2, User, Clock, FileText,
} from "lucide-react";
import { formatDate, formatCurrency, TICKET_STATUS, TICKET_PRIORITY, PROJECT_STATUS, INVOICE_STATUS } from "@/lib/utils";

// ─── FAKTURA ─────────────────────────────────────────────────────────────

export function InvoicePreviewBody({ invoice }: { invoice: any }) {
  const subtotal = invoice.lines.reduce(
    (s: number, l: any) =>
      s + Number(l.quantity) * Number(l.unitPrice) * (1 - Number(l.discountPct ?? 0) / 100),
    0,
  );
  const total = invoice.vatEnabled ? subtotal * (1 + Number(invoice.vatPct) / 100) : subtotal;
  const status = (INVOICE_STATUS as any)[invoice.status] ?? { label: invoice.status, color: "muted" };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2 text-xs">
          <span className="px-2 py-0.5 rounded-full bg-secondary text-muted-foreground font-medium">
            {status.label}
          </span>
          <span className="text-muted-foreground">
            Udstedt {formatDate(invoice.issueDate)}
          </span>
        </div>
        <p className="text-xl font-semibold tabular-nums">{formatCurrency(total)}</p>
      </div>

      <div className="border border-border rounded-lg divide-y divide-border">
        {invoice.lines.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-6">Ingen linjer.</p>
        ) : (
          invoice.lines.map((l: any) => {
            const lineBase = Number(l.quantity) * Number(l.unitPrice);
            const afterDisc = lineBase * (1 - Number(l.discountPct ?? 0) / 100);
            return (
              <div key={l.id} className="flex items-center gap-3 px-3 py-2 text-sm">
                <div className="flex-1 min-w-0">
                  <p className="font-medium truncate">{l.description}</p>
                  <p className="text-xs text-muted-foreground">
                    {Number(l.quantity)} × {formatCurrency(Number(l.unitPrice))}
                    {Number(l.discountPct) > 0 && ` · ${Number(l.discountPct)}% rabat`}
                  </p>
                </div>
                <span className="font-mono tabular-nums text-sm">{formatCurrency(afterDisc)}</span>
              </div>
            );
          })
        )}
      </div>

      <div className="space-y-1 text-sm pt-2 border-t border-border">
        <div className="flex justify-between text-muted-foreground">
          <span>Subtotal</span>
          <span className="tabular-nums">{formatCurrency(subtotal)}</span>
        </div>
        {invoice.vatEnabled && (
          <div className="flex justify-between text-muted-foreground">
            <span>Moms ({Number(invoice.vatPct)}%)</span>
            <span className="tabular-nums">{formatCurrency(total - subtotal)}</span>
          </div>
        )}
        <div className="flex justify-between font-semibold pt-1">
          <span>Total</span>
          <span className="tabular-nums">{formatCurrency(total)}</span>
        </div>
      </div>
    </div>
  );
}

// ─── PROJEKT ─────────────────────────────────────────────────────────────

export function ProjectPreviewBody({ project }: { project: any }) {
  const status = (PROJECT_STATUS as any)[project.status] ?? { label: project.status, color: "muted" };
  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2 text-xs">
        <span className="px-2 py-0.5 rounded-full bg-secondary text-muted-foreground font-medium">
          {status.label}
        </span>
        {project.assignedTo && (
          <span className="flex items-center gap-1 text-muted-foreground">
            <User className="h-3 w-3" /> {project.assignedTo.name}
          </span>
        )}
      </div>

      {project.description && (
        <p className="text-sm text-muted-foreground whitespace-pre-wrap line-clamp-6">
          {project.description}
        </p>
      )}

      <div className="grid grid-cols-2 gap-3 pt-2 border-t border-border">
        <Cell label="Tidslogs" value={project._count?.timeLogs ?? 0} />
        <Cell label="Backlog" value={project._count?.backlog ?? 0} />
        {project.startDate && <Cell label="Startdato" value={formatDate(project.startDate)} />}
        {project.deadline && <Cell label="Deadline" value={formatDate(project.deadline)} />}
      </div>
    </div>
  );
}

// ─── TICKET ──────────────────────────────────────────────────────────────

export function TicketPreviewBody({ ticket }: { ticket: any }) {
  const status   = (TICKET_STATUS as any)[ticket.status] ?? { label: ticket.status };
  const priority = (TICKET_PRIORITY as any)[ticket.priority] ?? { label: ticket.priority };
  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2 text-xs flex-wrap">
        <span className="px-2 py-0.5 rounded-full bg-secondary text-muted-foreground font-medium">
          {status.label}
        </span>
        <span className="px-2 py-0.5 rounded-full bg-amber-100 text-amber-700 font-medium">
          {priority.label}
        </span>
        {ticket.assignedTo && (
          <span className="flex items-center gap-1 text-muted-foreground">
            <User className="h-3 w-3" /> {ticket.assignedTo.name}
          </span>
        )}
      </div>

      {ticket.description && (
        <p className="text-sm text-muted-foreground whitespace-pre-wrap line-clamp-8">
          {ticket.description}
        </p>
      )}

      <div className="grid grid-cols-2 gap-3 pt-2 border-t border-border text-xs">
        {ticket.product && <Cell label="Produkt" value={ticket.product.name} />}
        {ticket.contact && (
          <Cell
            label="Kontakt"
            value={`${ticket.contact.firstName} ${ticket.contact.lastName ?? ""}`.trim()}
          />
        )}
        <Cell label="Oprettet" value={formatDate(ticket.createdAt)} />
      </div>
    </div>
  );
}

// ─── KLIPPEKORT ──────────────────────────────────────────────────────────

export function BundlePreviewBody({ bundle }: { bundle: any }) {
  const usedH  = Math.round(bundle.usedMinutes / 60 * 10) / 10;
  const totalH = bundle.totalHours;
  const remH   = Math.max(0, totalH - usedH);
  const pct    = Math.min(100, (bundle.usedMinutes / (totalH * 60)) * 100);

  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <div className="flex justify-between text-sm">
          <span className="text-muted-foreground">{usedH}t brugt af {totalH}t</span>
          <span className="font-medium tabular-nums">{remH}t tilbage</span>
        </div>
        <div className="h-2 bg-secondary rounded-full overflow-hidden">
          <div
            className={`h-full rounded-full ${
              pct >= 100 ? "bg-amber-500" : pct > 80 ? "bg-amber-400" : "bg-primary"
            }`}
            style={{ width: `${pct}%` }}
          />
        </div>
        <p className="text-xs text-muted-foreground text-right">{Math.round(pct)}% forbrugt</p>
      </div>

      <div className="grid grid-cols-2 gap-3 pt-2 border-t border-border text-xs">
        <Cell label="Købt" value={formatDate(bundle.purchaseDate)} />
        {bundle.expiresAt && <Cell label="Udløber" value={formatDate(bundle.expiresAt)} />}
        {bundle.hourlyRate && (
          <Cell label="Timepris" value={`${formatCurrency(Number(bundle.hourlyRate))}/t`} />
        )}
        <Cell label="Status" value={bundle.isActive ? "Aktiv" : "Opbrugt/inaktiv"} />
      </div>
    </div>
  );
}

// ─── TILBUD ──────────────────────────────────────────────────────────────

export function QuotePreviewBody({ quote }: { quote: any }) {
  const subtotal = quote.lines.reduce(
    (s: number, l: any) =>
      s + Number(l.quantity) * Number(l.unitPrice) * (1 - Number(l.discountPct ?? 0) / 100),
    0,
  );
  const total = quote.vatEnabled ? subtotal * (1 + Number(quote.vatPct) / 100) : subtotal;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2 text-xs">
          <span className="px-2 py-0.5 rounded-full bg-secondary text-muted-foreground font-medium capitalize">
            {quote.status}
          </span>
          {quote.validUntil && (
            <span className="text-muted-foreground">
              Gyldig til {formatDate(quote.validUntil)}
            </span>
          )}
        </div>
        <p className="text-xl font-semibold tabular-nums">{formatCurrency(total)}</p>
      </div>

      <div className="border border-border rounded-lg divide-y divide-border">
        {quote.lines.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-6">Ingen linjer.</p>
        ) : (
          quote.lines.map((l: any) => {
            const base = Number(l.quantity) * Number(l.unitPrice);
            const afterDisc = base * (1 - Number(l.discountPct ?? 0) / 100);
            return (
              <div key={l.id} className="flex items-center gap-3 px-3 py-2 text-sm">
                <div className="flex-1 min-w-0">
                  <p className="font-medium truncate">{l.description}</p>
                  <p className="text-xs text-muted-foreground">
                    {Number(l.quantity)} × {formatCurrency(Number(l.unitPrice))}
                  </p>
                </div>
                <span className="font-mono tabular-nums text-sm">{formatCurrency(afterDisc)}</span>
              </div>
            );
          })
        )}
      </div>

      {quote.convertedToInvoiceId && (
        <div className="text-xs bg-emerald-50 border border-emerald-200 rounded-lg px-3 py-2 text-emerald-900">
          ✓ Konverteret til faktura
        </div>
      )}
    </div>
  );
}

// ─── Helper ──────────────────────────────────────────────────────────────

function Cell({ label, value }: { label: string; value: string | number | undefined }) {
  return (
    <div>
      <p className="text-[11px] text-muted-foreground uppercase tracking-wide">{label}</p>
      <p className="text-sm font-medium">{value ?? "—"}</p>
    </div>
  );
}
