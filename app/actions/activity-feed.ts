"use server";

/**
 * Aktivitetsfeed — samlet kronologisk timeline for en kunde.
 *
 * Samler events fra:
 *   • Activity  (mode, opkald, opgaver — manuelt logget)
 *   • Quote     (oprettet, sendt, accepteret, konverteret)
 *   • Invoice   (oprettet, sendt, betalt)
 *   • Ticket    (oprettet, loest, lukket)
 *   • Project   (oprettet, started)
 *   • EmailLog  (mail sendt — fra MailtoSendButton + Resend)
 *   • HourBundle (klippekort koebt)
 *   • Deal      (vundet/tabt)
 *
 * Sorterer kronologisk faldende. Returnerer normaliserede events med
 * type + titel + beskrivelse + tidspunkt + ikon-hint + link.
 */

import { db } from "@/lib/db";
import { auth } from "@/lib/auth";

export type FeedEventType =
  | "activity"
  | "quote_created"   | "quote_sent" | "quote_accepted" | "quote_converted"
  | "invoice_created" | "invoice_sent" | "invoice_paid"
  | "ticket_created"  | "ticket_resolved" | "ticket_closed"
  | "project_created"
  | "email_sent"
  | "bundle_created"
  | "deal_won"        | "deal_lost";

export interface FeedEvent {
  id:          string;
  type:        FeedEventType;
  title:       string;
  description?: string;
  occurredAt:  Date;
  /** Link til detalje hvis relevant */
  href?:       string;
  /** Bruger der lavede handlingen (hvis kendt) */
  actorName?:  string;
}

export async function getActivityFeed(companyId: string, take = 50): Promise<FeedEvent[]> {
  const session = await auth();
  if (!session?.user?.tenantId) return [];
  const tenantId = session.user.tenantId;

  // Tjek at kunden tilhoerer tenanten (sikkerhed)
  const company = await db.company.findFirst({
    where: { id: companyId, tenantId },
    select: { id: true },
  });
  if (!company) return [];

  const events: FeedEvent[] = [];

  const [activities, quotes, invoices, tickets, projects, emails, bundles, deals] = await Promise.all([
    db.activity.findMany({
      where: { tenantId, companyId },
      include: { user: { select: { name: true } } },
      orderBy: { createdAt: "desc" },
      take: 30,
    }),
    db.quote.findMany({
      where: { tenantId, companyId },
      select: {
        id: true, number: true, title: true, status: true,
        createdAt: true, sentAt: true, acceptedAt: true, convertedAt: true,
        convertedToInvoiceId: true,
      },
      take: 20,
    }),
    db.invoice.findMany({
      where: { tenantId, companyId },
      select: { id: true, number: true, status: true, createdAt: true, issueDate: true },
      take: 20,
    }),
    db.ticket.findMany({
      where: { tenantId, companyId },
      select: { id: true, number: true, subject: true, status: true, createdAt: true, resolvedAt: true, closedAt: true },
      take: 20,
    }),
    db.project.findMany({
      where: { tenantId, companyId },
      select: { id: true, number: true, title: true, createdAt: true, tenant: { select: { projectPrefix: true } } },
      take: 20,
    }),
    db.emailLog.findMany({
      where: { tenantId, OR: [
        { resourceType: "quote",   resourceId: { not: null } },
        { resourceType: "invoice", resourceId: { not: null } },
      ] },
      select: {
        id: true, subject: true, status: true, sentAt: true,
        resourceType: true, resourceId: true, provider: true,
        user: { select: { name: true } },
      },
      orderBy: { sentAt: "desc" },
      take: 30,
    }),
    db.hourBundle.findMany({
      where: { tenantId, companyId },
      select: {
        id: true, number: true, name: true, totalHours: true,
        purchaseDate: true,
        tenant: { select: { bundlePrefix: true } },
      },
      take: 20,
    }),
    db.deal.findMany({
      where: { tenantId, companyId, stage: { in: ["won", "lost"] } },
      select: { id: true, title: true, stage: true, value: true, closedAt: true, updatedAt: true },
      orderBy: { updatedAt: "desc" },
      take: 10,
    }),
  ]);

  // Filter mails der vedrører denne kundes resourcer
  const quoteIds = new Set(quotes.map((q) => q.id));
  const invoiceIds = new Set(invoices.map((i) => i.id));
  const relevantEmails = emails.filter((e) =>
    (e.resourceType === "quote"   && quoteIds.has(e.resourceId!)) ||
    (e.resourceType === "invoice" && invoiceIds.has(e.resourceId!))
  );

  // ─── Map til FeedEvents ──────────────────────────────────────

  for (const a of activities) {
    events.push({
      id:        `act-${a.id}`,
      type:      "activity",
      title:     a.subject,
      description: a.description ?? a.type,
      occurredAt: a.createdAt,
      actorName: a.user?.name,
    });
  }

  for (const q of quotes) {
    const ref = `Q-${String(q.number).padStart(4, "0")}`;
    events.push({
      id: `quote-c-${q.id}`,
      type: "quote_created",
      title: `Tilbud ${ref} oprettet`,
      description: q.title ?? undefined,
      occurredAt: q.createdAt,
      href: `/quotes/${q.id}`,
    });
    if (q.sentAt) {
      events.push({
        id: `quote-s-${q.id}`, type: "quote_sent",
        title: `Tilbud ${ref} sendt`,
        occurredAt: q.sentAt,
        href: `/quotes/${q.id}`,
      });
    }
    if (q.acceptedAt) {
      events.push({
        id: `quote-a-${q.id}`, type: "quote_accepted",
        title: `Tilbud ${ref} accepteret`,
        occurredAt: q.acceptedAt,
        href: `/quotes/${q.id}`,
      });
    }
    if (q.convertedAt) {
      events.push({
        id: `quote-co-${q.id}`, type: "quote_converted",
        title: `Tilbud ${ref} konverteret til faktura`,
        occurredAt: q.convertedAt,
        href: q.convertedToInvoiceId ? `/invoices/${q.convertedToInvoiceId}` : `/quotes/${q.id}`,
      });
    }
  }

  for (const inv of invoices) {
    const ref = `F-${String(inv.number).padStart(4, "0")}`;
    events.push({
      id: `inv-c-${inv.id}`,
      type: "invoice_created",
      title: `Faktura ${ref} oprettet`,
      occurredAt: inv.createdAt,
      href: `/invoices/${inv.id}`,
    });
    if (inv.status === "paid") {
      events.push({
        id: `inv-p-${inv.id}`, type: "invoice_paid",
        title: `Faktura ${ref} markeret som betalt`,
        occurredAt: inv.issueDate ?? inv.createdAt,
        href: `/invoices/${inv.id}`,
      });
    }
  }

  for (const t of tickets) {
    const ref = `T-${String(t.number).padStart(4, "0")}`;
    events.push({
      id: `tic-c-${t.id}`,
      type: "ticket_created",
      title: `Ticket ${ref} oprettet`,
      description: t.subject ?? undefined,
      occurredAt: t.createdAt,
      href: `/support/tickets/${t.id}`,
    });
    if (t.resolvedAt) {
      events.push({
        id: `tic-r-${t.id}`, type: "ticket_resolved",
        title: `Ticket ${ref} løst`,
        occurredAt: t.resolvedAt,
        href: `/support/tickets/${t.id}`,
      });
    }
    if (t.closedAt) {
      events.push({
        id: `tic-cl-${t.id}`, type: "ticket_closed",
        title: `Ticket ${ref} lukket`,
        occurredAt: t.closedAt,
        href: `/support/tickets/${t.id}`,
      });
    }
  }

  for (const p of projects) {
    events.push({
      id: `proj-${p.id}`,
      type: "project_created",
      title: `Projekt ${p.tenant.projectPrefix}-${String(p.number).padStart(4, "0")} oprettet`,
      description: p.title,
      occurredAt: p.createdAt,
      href: `/projects/${p.id}`,
    });
  }

  for (const e of relevantEmails) {
    const provider = e.provider === "mailto" ? "via mail-klient" : e.provider === "resend" ? "via system-mail" : `via ${e.provider}`;
    events.push({
      id: `em-${e.id}`,
      type: "email_sent",
      title: `Mail sendt — ${e.subject}`,
      description: provider,
      occurredAt: e.sentAt,
      href: e.resourceType === "quote"   ? `/quotes/${e.resourceId}` :
            e.resourceType === "invoice" ? `/invoices/${e.resourceId}` : undefined,
      actorName: e.user?.name,
    });
  }

  for (const b of bundles) {
    events.push({
      id: `bun-${b.id}`,
      type: "bundle_created",
      title: `Klippekort ${b.tenant.bundlePrefix}-${String(b.number).padStart(4, "0")} købt`,
      description: `${b.totalHours} timer${b.name ? ` · ${b.name}` : ""}`,
      occurredAt: b.purchaseDate,
      href: `/klippekort/${b.id}`,
    });
  }

  for (const d of deals) {
    const occurredAt = d.closedAt ?? d.updatedAt;
    if (d.stage === "won") {
      events.push({
        id: `deal-w-${d.id}`, type: "deal_won",
        title: `Deal vundet — ${d.title}`,
        description: d.value ? `Værdi: ${Number(d.value).toLocaleString("da-DK")} kr` : undefined,
        occurredAt,
        href: `/pipeline/${d.id}`,
      });
    } else {
      events.push({
        id: `deal-l-${d.id}`, type: "deal_lost",
        title: `Deal tabt — ${d.title}`,
        occurredAt,
        href: `/pipeline/${d.id}`,
      });
    }
  }

  // Kronologisk faldende
  events.sort((a, b) => b.occurredAt.getTime() - a.occurredAt.getTime());
  return events.slice(0, take);
}
