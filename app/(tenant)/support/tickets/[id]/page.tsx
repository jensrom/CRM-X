import { getTicket } from "@/app/actions/tickets";
import { addComment, updateTicketStatus } from "@/app/actions/tickets";
import { LogTimeForm } from "@/components/tickets/LogTimeForm";
import { AppTopbar } from "@/components/layout/AppTopbar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { notFound } from "next/navigation";
import Link from "next/link";
import {
  Building2, User, Package, ChevronRight, Pencil,
  Clock, MessageSquare, Lock, CheckCircle2, AlertCircle
} from "lucide-react";
import { formatDate, formatDuration, formatRef, TICKET_STATUS, TICKET_PRIORITY } from "@/lib/utils";
import { auth } from "@/lib/auth";
import { BackButton } from "@/components/shared/BackButton";
import { QrCode } from "@/components/shared/QrCode";
import { CreatorBadge } from "@/components/shared/CreatorBadge";
import { AttachmentSection } from "@/components/attachments/AttachmentSection";
import { listAttachments } from "@/app/actions/attachments";

const STATUS_FLOW = [
  { value: "open",             label: "Åben"                 },
  { value: "pending_customer", label: "Afventer kunde"       },
  { value: "pending_supplier", label: "Afventer leverandør"  },
  { value: "resolved",         label: "Løst"                 },
  { value: "closed",           label: "Lukket"               },
];

export default async function TicketDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ from?: string }>;
}) {
  const { id } = await params;
  const { from } = await searchParams;
  const [ticket, session] = await Promise.all([getTicket(id), auth()]);
  if (!ticket) notFound();
  const backHref =
    from && from.startsWith("/") && !from.startsWith("//") ? from : "/support/tickets";

  const status = TICKET_STATUS[ticket.status as keyof typeof TICKET_STATUS];
  const priority = TICKET_PRIORITY[ticket.priority as keyof typeof TICKET_PRIORITY];

  const totalMinutes = ticket.timeLogs.reduce((sum, t) => sum + t.durationMin, 0);
  const billableMinutes = ticket.timeLogs
    .filter((t) => t.isBillable)
    .reduce((sum, t) => sum + t.durationMin, 0);

  const today = new Date().toISOString().split("T")[0];

  async function handleStatusChange(formData: FormData) {
    "use server";
    const newStatus = formData.get("status") as string;
    await updateTicketStatus(id, newStatus);
  }

  return (
    <>
      <AppTopbar pageTitle={`${formatRef(ticket.tenant.ticketPrefix, ticket.number)} ${ticket.title}`} />


      <BackButton href={backHref} />
      {/* Breadcrumb */}
      <div className="flex items-center gap-2 text-sm text-muted-foreground mb-5">
        <Link href="/support/tickets" className="hover:text-foreground transition-colors">
          Tickets
        </Link>
        <ChevronRight className="h-3.5 w-3.5" />
        <span className="text-foreground font-medium">{formatRef(ticket.tenant.ticketPrefix, ticket.number)}</span>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">

        {/* VENSTRE: Meta */}
        <div className="xl:col-span-1 space-y-4">

          {/* Info-kort */}
          <div className="bg-card border border-border rounded-xl p-5">
            <div className="flex items-start justify-between mb-3">
              <div>
                <h2 className="font-semibold text-foreground">{ticket.title}</h2>
                <p className="text-xs text-muted-foreground mt-0.5 font-mono">{formatRef(ticket.tenant.ticketPrefix, ticket.number)}</p>
              </div>
              <div className="flex items-center gap-1">
                <QrCode
                  url={`${process.env.NEXT_PUBLIC_APP_URL ?? ""}/support/tickets/${ticket.id}`}
                  storageKey={`ticket/${ticket.id}`}
                  label={formatRef(ticket.tenant.ticketPrefix, ticket.number)}
                />
                <Link href={`/support/tickets/${ticket.id}/edit`}>
                  <Button variant="ghost" size="sm"><Pencil className="h-3.5 w-3.5" /></Button>
                </Link>
              </div>
            </div>

            <div className="flex items-center gap-2 mb-4">
              <Badge variant={status?.color as any}>{status?.label}</Badge>
              <Badge variant={priority?.color as any}>{priority?.label}</Badge>
            </div>

            <div className="space-y-2.5">
              {ticket.company && (
                <div className="flex items-center gap-2.5 text-sm">
                  <Building2 className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                  <Link href={`/kunder/${ticket.company.id}`} className="text-primary hover:underline">
                    {ticket.company.name}
                  </Link>
                </div>
              )}
              {ticket.contact && (
                <div className="flex items-center gap-2.5 text-sm">
                  <User className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                  <Link
                    href={`/contacts/${ticket.contact.id}`}
                    className="text-primary hover:underline"
                  >
                    {ticket.contact.firstName} {ticket.contact.lastName}
                  </Link>
                </div>
              )}
              {ticket.product && (
                <div className="flex items-center gap-2.5 text-sm">
                  <Package className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                  <span>{ticket.product.name}</span>
                </div>
              )}
              {ticket.assignedTo && (
                <div className="flex items-center gap-2.5 text-sm">
                  <User className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                  <span>Tildelt: {ticket.assignedTo.name}</span>
                </div>
              )}
            </div>

            <div className="mt-4 pt-4 border-t border-border text-xs text-muted-foreground space-y-1">
              <CreatorBadge
                createdById={(ticket as any).createdById}
                createdByImpersonatorId={(ticket as any).createdByImpersonatorId}
                createdAt={ticket.createdAt}
              />
              {ticket.resolvedAt && <p>Løst {formatDate(ticket.resolvedAt)}</p>}
              {ticket.closedAt && <p>Lukket {formatDate(ticket.closedAt)}</p>}
            </div>
          </div>

          {/* Status-skift */}
          <div className="bg-card border border-border rounded-xl p-4">
            <p className="text-xs font-semibold text-muted-foreground mb-3">Skift status</p>
            <div className="space-y-1.5">
              {STATUS_FLOW.map((s) => (
                <form key={s.value} action={handleStatusChange}>
                  <input type="hidden" name="status" value={s.value} />
                  <button
                    type="submit"
                    className={`w-full text-left px-3 py-2 rounded-lg text-sm transition-colors flex items-center gap-2
                      ${ticket.status === s.value
                        ? "bg-primary/10 text-primary font-semibold"
                        : "hover:bg-secondary text-muted-foreground hover:text-foreground"
                      }`}
                  >
                    {ticket.status === s.value
                      ? <CheckCircle2 className="h-3.5 w-3.5 text-primary shrink-0" />
                      : <div className="h-3.5 w-3.5 rounded-full border border-current shrink-0" />
                    }
                    {s.label}
                  </button>
                </form>
              ))}
            </div>
          </div>

          {/* Tidsoverblik */}
          <div className="bg-card border border-border rounded-xl p-4">
            <p className="text-xs font-semibold text-muted-foreground mb-3 flex items-center gap-1.5">
              <Clock className="h-3.5 w-3.5" /> Tidsoverblik
            </p>
            <div className="grid grid-cols-2 gap-3">
              <div className="text-center">
                <p className="text-xl font-bold">{formatDuration(totalMinutes)}</p>
                <p className="text-xs text-muted-foreground">I alt</p>
              </div>
              <div className="text-center">
                <p className="text-xl font-bold text-primary">{formatDuration(billableMinutes)}</p>
                <p className="text-xs text-muted-foreground">Fakturerbar</p>
              </div>
            </div>
          </div>
        </div>

        {/* HØJRE: Beskrivelse + Kommentarer + Tid */}
        <div className="xl:col-span-2 space-y-5">

          {/* Beskrivelse */}
          <div className="bg-card border border-border rounded-xl p-5">
            <h3 className="text-sm font-semibold mb-3">Beskrivelse</h3>
            <p className="text-sm text-foreground whitespace-pre-wrap leading-relaxed">
              {ticket.description}
            </p>
          </div>

          {/* Kommentarer */}
          <div className="bg-card border border-border rounded-xl overflow-hidden">
            <div className="px-5 py-3.5 border-b border-border">
              <h3 className="text-sm font-semibold flex items-center gap-2">
                <MessageSquare className="h-4 w-4 text-muted-foreground" />
                Kommentarer ({ticket.comments.length})
              </h3>
            </div>

            {ticket.comments.length > 0 && (
              <div className="divide-y divide-border">
                {ticket.comments.map((comment) => (
                  <div
                    key={comment.id}
                    className={`px-5 py-4 ${comment.isInternal ? "bg-amber-50/50" : ""}`}
                  >
                    <div className="flex items-center gap-2 mb-2">
                      <div className="w-6 h-6 rounded-full bg-primary/10 flex items-center justify-center">
                        <span className="text-[10px] font-semibold text-primary">
                          {comment.user.name?.[0] ?? "?"}
                        </span>
                      </div>
                      <span className="text-xs font-medium">{comment.user.name}</span>
                      <span className="text-xs text-muted-foreground">
                        {formatDate(comment.createdAt)}
                      </span>
                      {comment.isInternal && (
                        <span className="flex items-center gap-0.5 text-xs text-amber-600 font-medium">
                          <Lock className="h-3 w-3" /> Intern
                        </span>
                      )}
                    </div>
                    <p className="text-sm whitespace-pre-wrap pl-8">{comment.content}</p>
                  </div>
                ))}
              </div>
            )}

            {/* Tilføj kommentar */}
            <div className="px-5 py-4 border-t border-border bg-secondary/20">
              <form action={addComment} className="space-y-3">
                <input type="hidden" name="ticketId" value={ticket.id} />
                <textarea
                  name="content"
                  rows={3}
                  required
                  placeholder="Skriv en kommentar..."
                  className="w-full px-3 py-2 rounded-lg border border-input bg-background text-sm
                             placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring resize-none"
                />
                <div className="flex items-center justify-between">
                  <label className="flex items-center gap-2 text-xs text-muted-foreground cursor-pointer">
                    <input type="checkbox" name="isInternal" value="true" className="rounded" />
                    <Lock className="h-3 w-3" />
                    Intern note
                  </label>
                  <Button type="submit" size="sm">Send kommentar</Button>
                </div>
              </form>
            </div>
          </div>

          {/* Tidslogning */}
          <div className="bg-card border border-border rounded-xl overflow-hidden">
            <div className="px-5 py-3.5 border-b border-border">
              <h3 className="text-sm font-semibold flex items-center gap-2">
                <Clock className="h-4 w-4 text-muted-foreground" />
                Tidslogning ({ticket.timeLogs.length} poster)
              </h3>
            </div>

            {ticket.timeLogs.length > 0 && (
              <div className="divide-y divide-border">
                {ticket.timeLogs.map((log) => (
                  <div key={log.id} className="flex items-center gap-3 px-5 py-3">
                    <div className="w-8 h-8 rounded-lg bg-blue-50 flex items-center justify-center shrink-0">
                      <Clock className="h-3.5 w-3.5 text-blue-600" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium">{formatDuration(log.durationMin)}</p>
                      {log.description && (
                        <p className="text-xs text-muted-foreground truncate">{log.description}</p>
                      )}
                    </div>
                    <div className="text-right">
                      <p className="text-xs text-muted-foreground">{log.user.name}</p>
                      <p className="text-xs text-muted-foreground">{formatDate(log.date)}</p>
                    </div>
                    {!log.isBillable && (
                      <span className="text-xs text-muted-foreground/60">Ikke fakturerbar</span>
                    )}
                  </div>
                ))}
              </div>
            )}

            <LogTimeForm ticketId={ticket.id} today={today} />
          </div>
        </div>

        {/* Filer-sektion */}
        <div className="mt-4 bg-card rounded-xl border border-border p-5">
          <div className="flex items-center gap-2 mb-4">
            <Package className="h-4 w-4 text-muted-foreground" />
            <h2 className="text-sm font-semibold">Filer</h2>
          </div>
          <TicketFiler ticketId={ticket.id} />
        </div>
      </div>
    </>
  );
}

async function TicketFiler({ ticketId }: { ticketId: string }) {
  const initialAttachments = await listAttachments("ticket", ticketId);
  return (
    <AttachmentSection
      scope="ticket"
      parentId={ticketId}
      initialAttachments={initialAttachments as any}
      bare
    />
  );
}
