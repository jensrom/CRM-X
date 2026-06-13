import { getTickets } from "@/app/actions/tickets";
import { AppTopbar } from "@/components/layout/AppTopbar";
import { PageHeader } from "@/components/shared/PageHeader";
import { EmptyState } from "@/components/shared/EmptyState";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Ticket, Plus, Building2, User, MessageSquare, Clock } from "lucide-react";
import Link from "next/link";
import { formatDate, formatRef, TICKET_STATUS, TICKET_PRIORITY } from "@/lib/utils";

const PRIORITY_ORDER = ["critical", "high", "normal", "low"];

export default async function TicketsPage({
  searchParams,
}: {
  searchParams: Promise<{ search?: string; status?: string }>;
}) {
  const sp = await searchParams;
  const tickets = await getTickets({
    search: sp.search,
    status: sp.status,
  });

  // Sorter: kritisk øverst
  const sorted = [...tickets].sort((a, b) => {
    const pa = PRIORITY_ORDER.indexOf(a.priority);
    const pb = PRIORITY_ORDER.indexOf(b.priority);
    return pa - pb;
  });

  const openCount = tickets.filter(
    (t) => !["resolved", "closed"].includes(t.status)
  ).length;

  return (
    <>
      <AppTopbar pageTitle="Support Tickets" />

      <PageHeader
        title="Support Tickets"
        description={`${openCount} åbne tickets`}
        actions={
          <a href="/support/tickets/new">
            <Button size="md"><Plus className="h-4 w-4" />Opret ticket</Button>
          </a>
        }
      />

      {/* Filtre */}
      <div className="flex items-center gap-3 mb-4 flex-wrap">
        <form className="flex-1 min-w-0">
          <input
            name="search"
            defaultValue={sp.search}
            placeholder="Søg i tickets..."
            className="w-full max-w-sm px-3 py-2 rounded-lg border border-input bg-background text-sm
                       placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
          />
          {sp.status && (
            <input type="hidden" name="status" value={sp.status} />
          )}
        </form>

        <div className="flex items-center gap-2 flex-wrap">
          {[
            { label: "Alle",               value: "" },
            { label: "Åben",               value: "open" },
            { label: "Afventer kunde",     value: "pending_customer" },
            { label: "Afventer leverandør",value: "pending_supplier" },
            { label: "Løst",               value: "resolved" },
            { label: "Lukket",             value: "closed" },
          ].map(({ label, value }) => (
            <Link
              key={value}
              href={value ? `/support/tickets?status=${value}` : "/support/tickets"}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors border
                ${
                  (sp.status ?? "") === value
                    ? "bg-primary text-white border-primary"
                    : "bg-background border-border text-muted-foreground hover:text-foreground"
                }`}
            >
              {label}
            </Link>
          ))}
        </div>
      </div>

      {sorted.length === 0 ? (
        <EmptyState
          icon={Ticket}
          title="Ingen tickets"
          description="Opret din første support ticket."
          action={
            <a href="/support/tickets/new">
              <Button size="sm"><Plus className="h-3.5 w-3.5" />Opret ticket</Button>
            </a>
          }
        />
      ) : (
        <div className="bg-card border border-border rounded-xl overflow-hidden">
          <table className="w-full">
            <thead>
              <tr className="border-b border-border bg-secondary/40">
                <th className="text-left px-5 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wide">#</th>
                <th className="text-left px-5 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wide">Titel</th>
                <th className="text-left px-5 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wide hidden md:table-cell">Kunde</th>
                <th className="text-left px-5 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wide hidden lg:table-cell">Prioritet</th>
                <th className="text-left px-5 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wide">Status</th>
                <th className="text-left px-5 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wide hidden xl:table-cell">Oprettet</th>
              </tr>
            </thead>
            <tbody>
              {sorted.map((ticket) => {
                const status = TICKET_STATUS[ticket.status as keyof typeof TICKET_STATUS];
                const priority = TICKET_PRIORITY[ticket.priority as keyof typeof TICKET_PRIORITY];

                return (
                  <tr
                    key={ticket.id}
                    className="border-b border-border last:border-0 hover:bg-secondary/30 transition-colors cursor-pointer group"
                  >
                    <td className="px-5 py-3.5">
                      <Link href={`/support/tickets/${ticket.id}`} className="text-xs text-muted-foreground font-mono">
                        {formatRef(ticket.tenant.ticketPrefix, ticket.number)}
                      </Link>
                    </td>
                    <td className="px-5 py-3.5">
                      <Link href={`/support/tickets/${ticket.id}`} className="block">
                        <p className="text-sm font-semibold group-hover:text-primary transition-colors">
                          {ticket.title}
                        </p>
                        <div className="flex items-center gap-3 mt-0.5">
                          {ticket._count.comments > 0 && (
                            <span className="flex items-center gap-1 text-xs text-muted-foreground">
                              <MessageSquare className="h-3 w-3" />
                              {ticket._count.comments}
                            </span>
                          )}
                          {ticket._count.timeLogs > 0 && (
                            <span className="flex items-center gap-1 text-xs text-muted-foreground">
                              <Clock className="h-3 w-3" />
                              {ticket._count.timeLogs} logs
                            </span>
                          )}
                          {ticket.assignedTo && (
                            <span className="flex items-center gap-1 text-xs text-muted-foreground">
                              <User className="h-3 w-3" />
                              {ticket.assignedTo.name}
                            </span>
                          )}
                        </div>
                      </Link>
                    </td>
                    <td className="px-5 py-3.5 hidden md:table-cell">
                      <Link href={`/support/tickets/${ticket.id}`} className="flex items-center gap-1.5 text-sm text-muted-foreground">
                        <Building2 className="h-3.5 w-3.5 shrink-0" />
                        {ticket.company?.name ?? "—"}
                      </Link>
                    </td>
                    <td className="px-5 py-3.5 hidden lg:table-cell">
                      <Link href={`/support/tickets/${ticket.id}`}>
                        <Badge variant={priority?.color as any}>{priority?.label}</Badge>
                      </Link>
                    </td>
                    <td className="px-5 py-3.5">
                      <Link href={`/support/tickets/${ticket.id}`}>
                        <Badge variant={status?.color as any}>{status?.label}</Badge>
                      </Link>
                    </td>
                    <td className="px-5 py-3.5 hidden xl:table-cell text-xs text-muted-foreground">
                      <Link href={`/support/tickets/${ticket.id}`}>
                        {formatDate(ticket.createdAt)}
                      </Link>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </>
  );
}
