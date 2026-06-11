import { getContact } from "@/app/actions/contacts";
import { AppTopbar } from "@/components/layout/AppTopbar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { notFound } from "next/navigation";
import Link from "next/link";
import {
  Phone, Mail, Briefcase, Building2, Linkedin,
  ChevronRight, Pencil, Ticket, Clock, ShieldCheck
} from "lucide-react";
import { formatDate, TICKET_STATUS, TICKET_PRIORITY } from "@/lib/utils";
import { BackButton } from "@/components/shared/BackButton";
import { getDecisionRole } from "@/lib/decision-roles";

export default async function ContactDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const contact = await getContact(id);
  if (!contact) notFound();

  const fullName = `${contact.firstName} ${contact.lastName}`;

  return (
    <>
      <AppTopbar pageTitle={fullName} />


      <BackButton href="/contacts" label="Kontakter" />
      <div className="flex items-center gap-2 text-sm text-muted-foreground mb-5">
        <Link href="/contacts" className="hover:text-foreground transition-colors">Kontakter</Link>
        <ChevronRight className="h-3.5 w-3.5" />
        <span className="text-foreground font-medium">{fullName}</span>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">

        {/* Kontakt-kort */}
        <div className="xl:col-span-1 space-y-4">
          <div className="bg-card border border-border rounded-xl p-5">
            <div className="flex items-start justify-between mb-4">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center text-lg font-bold text-primary">
                  {contact.firstName[0]}{contact.lastName[0]}
                </div>
                <div>
                  <h2 className="font-semibold text-foreground">{fullName}</h2>
                  {contact.title && <p className="text-xs text-muted-foreground">{contact.title}</p>}
                </div>
              </div>
              <Link href={`/contacts/${contact.id}/edit`}>
                <Button variant="ghost" size="sm"><Pencil className="h-3.5 w-3.5" /></Button>
              </Link>
            </div>

            <div className="space-y-2.5">
              {contact.company && (
                <div className="flex items-center gap-2.5 text-sm">
                  <Building2 className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                  <Link href={`/companies/${contact.company.id}`} className="text-primary hover:underline">
                    {contact.company.name}
                  </Link>
                </div>
              )}
              {contact.phone && (
                <div className="flex items-center gap-2.5 text-sm">
                  <Phone className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                  <a href={`tel:${contact.phone}`} className="text-primary hover:underline">{contact.phone}</a>
                </div>
              )}
              {contact.mobile && (
                <div className="flex items-center gap-2.5 text-sm">
                  <Phone className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                  <a href={`tel:${contact.mobile}`} className="text-primary hover:underline">{contact.mobile}</a>
                  <span className="text-xs text-muted-foreground">(mobil)</span>
                </div>
              )}
              {contact.email && (
                <div className="flex items-center gap-2.5 text-sm">
                  <Mail className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                  <a href={`mailto:${contact.email}`} className="text-primary hover:underline truncate">{contact.email}</a>
                </div>
              )}
              {(contact as any).linkedInUrl && (
                <div className="flex items-center gap-2.5 text-sm">
                  <Linkedin className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                  <a
                    href={(contact as any).linkedInUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-primary hover:underline truncate"
                  >
                    LinkedIn-profil
                  </a>
                </div>
              )}
              {(() => {
                const role = getDecisionRole((contact as any).decisionRole);
                if (!role) return null;
                return (
                  <div className="flex items-center gap-2.5 text-sm pt-1">
                    <ShieldCheck className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                    <span className={`text-xs px-2 py-0.5 rounded-full border ${role.badgeClass}`}>
                      {role.label}
                    </span>
                  </div>
                );
              })()}
            </div>

            {contact.notes && (
              <div className="mt-4 pt-4 border-t border-border">
                <p className="text-xs text-muted-foreground font-medium mb-1">Noter</p>
                <p className="text-sm whitespace-pre-wrap">{contact.notes}</p>
              </div>
            )}
          </div>
        </div>

        {/* Højre: Relationer */}
        <div className="xl:col-span-2 space-y-5">

          {/* Aktive tickets */}
          <div className="bg-card border border-border rounded-xl overflow-hidden">
            <div className="flex items-center justify-between px-5 py-3.5 border-b border-border">
              <h3 className="text-sm font-semibold flex items-center gap-2">
                <Ticket className="h-4 w-4 text-muted-foreground" />
                Aktive tickets ({contact.tickets.length})
              </h3>
            </div>
            {contact.tickets.length === 0 ? (
              <p className="px-5 py-6 text-sm text-muted-foreground text-center">Ingen åbne tickets.</p>
            ) : (
              <div className="divide-y divide-border">
                {contact.tickets.map((ticket) => {
                  const status = TICKET_STATUS[ticket.status as keyof typeof TICKET_STATUS];
                  return (
                    <Link key={ticket.id} href={`/support/tickets/${ticket.id}`}
                      className="flex items-center gap-3 px-5 py-3 hover:bg-secondary/30 transition-colors">
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate">#{ticket.number} {ticket.title}</p>
                        <p className="text-xs text-muted-foreground">{formatDate(ticket.createdAt)}</p>
                      </div>
                      <Badge variant={status?.color as any}>{status?.label}</Badge>
                    </Link>
                  );
                })}
              </div>
            )}
          </div>

          {/* Seneste aktiviteter */}
          <div className="bg-card border border-border rounded-xl overflow-hidden">
            <div className="px-5 py-3.5 border-b border-border">
              <h3 className="text-sm font-semibold flex items-center gap-2">
                <Clock className="h-4 w-4 text-muted-foreground" />
                Aktiviteter ({contact.activities.length})
              </h3>
            </div>
            {contact.activities.length === 0 ? (
              <p className="px-5 py-6 text-sm text-muted-foreground text-center">Ingen aktiviteter endnu.</p>
            ) : (
              <div className="divide-y divide-border">
                {contact.activities.map((act) => (
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

          <p className="text-xs text-muted-foreground px-1">
            Oprettet {formatDate(contact.createdAt)}
          </p>
        </div>
      </div>
    </>
  );
}
