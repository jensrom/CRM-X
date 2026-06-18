"use server";

/**
 * Global søg paa tværs af kunder, kontakter, tilbud, fakturaer, projekter, tickets, klippekort.
 *
 * Aftaler:
 *   • Case-insensitive, prefix-match
 *   • Tenant-isoleret
 *   • Max 5 resultater pr. type for at holde dropdown overskuelig
 *   • Numerisk match: hvis query er en taldel kun, prøv ogsaa at matche paa
 *     ressource-nummer (faktura F-0042, tilbud Q-0007, etc.)
 */

import { db } from "@/lib/db";
import { auth } from "@/lib/auth";

export interface SearchResult {
  id:    string;
  type:  "company" | "contact" | "quote" | "invoice" | "project" | "ticket" | "bundle";
  title: string;
  subtitle?: string;
  href:  string;
}

const PER_TYPE = 5;

export async function globalSearch(rawQuery: string): Promise<SearchResult[]> {
  const session = await auth();
  if (!session?.user?.tenantId) return [];
  const tenantId = session.user.tenantId;

  const q = rawQuery.trim();
  if (q.length < 1) return [];

  // Match ogsaa rene numre eller suffixer som "42" → faktura-nr 42
  const numericMatch = q.match(/(\d+)/);
  const num = numericMatch ? parseInt(numericMatch[1], 10) : null;

  const containsFilter = { contains: q, mode: "insensitive" as const };

  const [companies, contacts, quotes, invoices, projects, tickets, bundles] = await Promise.all([
    db.company.findMany({
      where: { tenantId, isActive: true, name: containsFilter },
      select: { id: true, name: true, orgNumber: true, city: true },
      take: PER_TYPE,
      orderBy: { name: "asc" },
    }),
    db.contact.findMany({
      where: {
        tenantId, isActive: true,
        OR: [
          { firstName: containsFilter },
          { lastName:  containsFilter },
          { email:     containsFilter },
        ],
      },
      select: { id: true, firstName: true, lastName: true, email: true, company: { select: { name: true } } },
      take: PER_TYPE,
    }),
    db.quote.findMany({
      where: {
        tenantId,
        OR: [
          { title: containsFilter },
          { company: { name: containsFilter } },
          ...(num !== null ? [{ number: num }] : []),
        ],
      },
      select: { id: true, number: true, title: true, status: true, company: { select: { name: true } } },
      take: PER_TYPE,
      orderBy: { createdAt: "desc" },
    }),
    db.invoice.findMany({
      where: {
        tenantId,
        OR: [
          { company: { name: containsFilter } },
          ...(num !== null ? [{ number: num }] : []),
        ],
      },
      select: { id: true, number: true, status: true, company: { select: { name: true } } },
      take: PER_TYPE,
      orderBy: { createdAt: "desc" },
    }),
    db.project.findMany({
      where: {
        tenantId,
        OR: [
          { title: containsFilter },
          { company: { name: containsFilter } },
          ...(num !== null ? [{ number: num }] : []),
        ],
      },
      select: { id: true, number: true, title: true, status: true, company: { select: { name: true } }, tenant: { select: { projectPrefix: true } } },
      take: PER_TYPE,
      orderBy: { updatedAt: "desc" },
    }),
    db.ticket.findMany({
      where: {
        tenantId,
        OR: [
          { subject: containsFilter },
          { company: { name: containsFilter } },
          ...(num !== null ? [{ number: num }] : []),
        ],
      },
      select: { id: true, number: true, subject: true, status: true, priority: true, company: { select: { name: true } } },
      take: PER_TYPE,
      orderBy: { createdAt: "desc" },
    }),
    db.hourBundle.findMany({
      where: {
        tenantId,
        OR: [
          { name: containsFilter },
          { company: { name: containsFilter } },
          ...(num !== null ? [{ number: num }] : []),
        ],
      },
      select: { id: true, number: true, name: true, totalHours: true, company: { select: { name: true } }, tenant: { select: { bundlePrefix: true } } },
      take: PER_TYPE,
    }),
  ]);

  const results: SearchResult[] = [
    ...companies.map((c): SearchResult => ({
      id: c.id, type: "company",
      title: c.name,
      subtitle: c.city ? `Kunde · ${c.city}` : "Kunde",
      href: `/kunder/${c.id}`,
    })),
    ...contacts.map((c): SearchResult => ({
      id: c.id, type: "contact",
      title: `${c.firstName} ${c.lastName ?? ""}`.trim(),
      subtitle: [c.company?.name, c.email].filter(Boolean).join(" · "),
      href: `/contacts/${c.id}`,
    })),
    ...quotes.map((q): SearchResult => ({
      id: q.id, type: "quote",
      title: `Q-${String(q.number).padStart(4, "0")}${q.title ? ` · ${q.title}` : ""}`,
      subtitle: `${q.company.name} · ${q.status}`,
      href: `/quotes/${q.id}`,
    })),
    ...invoices.map((inv): SearchResult => ({
      id: inv.id, type: "invoice",
      title: `F-${String(inv.number).padStart(4, "0")}`,
      subtitle: `${inv.company.name} · ${inv.status}`,
      href: `/invoices/${inv.id}`,
    })),
    ...projects.map((p): SearchResult => ({
      id: p.id, type: "project",
      title: `${p.tenant.projectPrefix}-${String(p.number).padStart(4, "0")} · ${p.title}`,
      subtitle: `${p.company.name} · ${p.status}`,
      href: `/projects/${p.id}`,
    })),
    ...tickets.map((t): SearchResult => ({
      id: t.id, type: "ticket",
      title: `T-${String(t.number).padStart(4, "0")} · ${t.subject}`,
      subtitle: `${t.company.name} · ${t.status} · ${t.priority}`,
      href: `/support/tickets/${t.id}`,
    })),
    ...bundles.map((b): SearchResult => ({
      id: b.id, type: "bundle",
      title: `${b.tenant.bundlePrefix}-${String(b.number).padStart(4, "0")}${b.name ? ` · ${b.name}` : ""}`,
      subtitle: `${b.company.name} · ${b.totalHours}t`,
      href: `/klippekort/${b.id}`,
    })),
  ];

  return results;
}
