import { getCompany } from "@/app/actions/companies";
import { AppTopbar } from "@/components/layout/AppTopbar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/shared/EmptyState";
import { notFound } from "next/navigation";
import Link from "next/link";
import {
  Building2, Phone, Mail, Globe, MapPin, Hash,
  Users, Package, Ticket, Plus, Pencil, ChevronRight,
} from "lucide-react";
import { formatDate, TICKET_STATUS, TICKET_PRIORITY } from "@/lib/utils";
import { BackButton } from "@/components/shared/BackButton";

export default async function CompanyDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const company = await getCompany(id);
  if (!company) notFound();
  const invoiceEmail = (company as any).invoiceEmail as string | null;

  return (
    <>
      <AppTopbar pageTitle={company.name} />
      <BackButton href="/companies" label="Firmaer" />
      <div className="flex items-center gap-2 text-sm text-muted-foreground mb-5">
        <Link href="/companies" className="hover:text-foreground transition-colors">Firmaer</Link>
        <ChevronRight className="h-3.5 w-3.5" />
        <span className="text-foreground font-medium">{company.name}</span>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        <div className="xl:col-span-1 space-y-4">
          <div className="bg-card border border-border rounded-xl p-5">
            <div className="flex items-start justify-between mb-4">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center">
                  <Building2 className="h-6 w-6 text-primary" />
                </div>
                <div>
                  <h2 className="font-semibold">{company.name}</h2>
                  {company.industry && <p className="text-xs text-muted-foreground">{company.industry}</p>}
                </div>
              </div>
              <Link href={`/companies/${company.id}/edit`}>
                <Button variant="ghost" size="sm"><Pencil className="h-3.5 w-3.5" /></Button>
              </Link>
            </div>

            <div className="space-y-2.5 text-sm">
              {company.orgNumber && (
                <div className="flex items-center gap-2.5">
                  <Hash className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                  <span className="text-muted-foreground">CVR:</span>
                  <span className="font-medium">{company.orgNumber}</span>
                </div>
              )}
              {company.phone && (
                <div className="flex items-center gap-2.5">
                  <Phone className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                  <a href={`tel:${company.phone}`} className="text-primary hover:underline">{company.phone}</a>
                </div>
              )}
              {company.email && (
                <div className="flex items-center gap-2.5">
                  <Mail className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                  <a href={`mailto:${company.email}`} className="text-primary hover:underline truncate">{company.email}</a>
                </div>
              )}
              {invoiceEmail && (
                <div className="flex items-center gap-2.5">
                  <Mail className="h-3.5 w-3.5 text-emerald-600 shrink-0" />
                  <span className="text-muted-foreground text-xs">Faktura:</span>
                  <a href={`mailto:${invoiceEmail}`} className="text-primary hover:underline truncate">{invoiceEmail}</a>
                </div>
              )}
              {company.website && (
                <div className="flex items-center gap-2.5">
                  <Globe className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                  <a href={company.website} target="_blank" rel="noopener noreferrer" className="text-primary hover:underline truncate">{company.website}</a>
                </div>
              )}
              {(company.address || company.city) && (
                <div className="flex items-start gap-2.5">
                  <MapPin className="h-3.5 w-3.5 text-muted-foreground shrink-0 mt-0.5" />
                  <div>
                    {company.address && <p>{company.address}</p>}
                    {company.city && <p>{company.zipCode} {company.city}</p>}
                    {company.country && company.country !== "Danmark" && <p>{company.country}</p>}
                  </div>
                </div>
              )}
            </div>

            {company.notes && (
              <div className="mt-4 pt-4 border-t border-border">
                <p className="text-xs text-muted-foreground font-medium mb-1">Noter</p>
                <p className="text-sm whitespace-pre-wrap">{company.notes}</p>
              </div>
            )}
          </div>

          <div className="grid grid-cols-3 gap-3">
            {[
              { label: "Kontakter", value: company.contacts.length, icon: Users },
              { label: "Produkter", value: company.customerProducts.length, icon: Package },
              { label: "Tickets", value: company.tickets.length, icon: Ticket },
            ].map(({ label, value, icon: Icon }) => (
              <div key={label} className="bg-card border border-border rounded-xl p-3 text-center">
                <Icon className="h-4 w-4 text-muted-foreground mx-auto mb-1" />
                <p className="text-xl font-bold">{value}</p>
                <p className="text-[11px] text-muted-foreground">{label}</p>
              </div>
            ))}
          </div>
        </div>

        <div className="xl:col-span-2 space-y-5">
          <div className="bg-card border border-border rounded-xl overflow-hidden">
            <div className="flex items-center justify-between px-5 py-3.5 border-b border-border">
              <h3 className="text-sm font-semibold flex items-center gap-2">
                <Users className="h-4 w-4 text-muted-foreground" />
                Kontakter ({company.contacts.length})
              </h3>
              <a href={`/contacts/new?companyId=${company.id}`}>
                <Button variant="ghost" size="sm"><Plus className="h-3.5 w-3.5" />Tilfoej</Button>
              </a>
            </div>
            {company.contacts.length === 0 ? (
              <EmptyState icon={Users} title="Ingen kontakter" description="Tilfoej en kontaktperson hos kunden." />
            ) : (
              <div className="divide-y divide-border">
                {company.contacts.map((c) => (
                  <Link key={c.id} href={`/contacts/${c.id}`} className="flex items-center gap-3 px-5 py-3 hover:bg-secondary/30 transition-colors">
                    <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-xs font-semibold text-primary shrink-0">
                      {c.firstName[0]}{c.lastName[0]}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold truncate">{c.firstName} {c.lastName}</p>
                      {c.title && <p className="text-xs text-muted-foreground truncate">{c.title}</p>}
                    </div>
                    {c.email && (<span className="text-xs text-muted-foreground truncate hidden sm:inline">{c.email}</span>)}
                  </Link>
                ))}
              </div>
            )}
          </div>

          <div className="bg-card border border-border rounded-xl overflow-hidden">
            <div className="flex items-center justify-between px-5 py-3.5 border-b border-border">
              <h3 className="text-sm font-semibold flex items-center gap-2">
                <Ticket className="h-4 w-4 text-muted-foreground" />
                Tickets ({company.tickets.length})
              </h3>
              <Link href={`/support/tickets?companyId=${company.id}`} className="text-xs text-primary hover:underline">Se alle</Link>
            </div>
            {company.tickets.length === 0 ? (
              <EmptyState icon={Ticket} title="Ingen aabne tickets" description="Alle tickets paa dette firma er lukket eller loest." />
            ) : (
              <div className="divide-y divide-border">
                {company.tickets.map((ticket) => {
                  const status = TICKET_STATUS[ticket.status as keyof typeof TICKET_STATUS];
                  const priority = TICKET_PRIORITY[ticket.priority as keyof typeof TICKET_PRIORITY];
                  return (
                    <Link key={ticket.id} href={`/support/tickets/${ticket.id}`} className="flex items-center gap-3 px-5 py-3 hover:bg-secondary/30 transition-colors">
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate">#{ticket.number} {ticket.title}</p>
                        <p className="text-xs text-muted-foreground">{formatDate(ticket.createdAt)}</p>
                      </div>
                      {priority && <Badge variant={priority.color as any}>{priority.label}</Badge>}
                      {status && <Badge variant={status.color as any}>{status.label}</Badge>}
                    </Link>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </div>
    </>
  );
}
