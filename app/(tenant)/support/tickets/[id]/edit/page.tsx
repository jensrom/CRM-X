import { getTicket } from "@/app/actions/tickets";
import { updateTicket, deleteTicket } from "@/app/actions/tickets";
import { AppTopbar } from "@/components/layout/AppTopbar";
import { PageHeader } from "@/components/shared/PageHeader";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { getCompanies } from "@/app/actions/companies";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { notFound } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Trash2 } from "lucide-react";
import { BackButton } from "@/components/shared/BackButton";

export default async function EditTicketPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const [ticket, companies, session] = await Promise.all([
    getTicket(id),
    getCompanies(),
    auth(),
  ]);

  if (!ticket) notFound();

  const tenantId = session?.user?.tenantId;

  const [users, products] = await Promise.all([
    tenantId
      ? db.user.findMany({
          where: { tenantId, isActive: true },
          select: { id: true, name: true },
          orderBy: { name: "asc" },
        })
      : Promise.resolve([]),
    tenantId
      ? db.product.findMany({
          where: { tenantId, isActive: true },
          select: { id: true, name: true },
          orderBy: { name: "asc" },
        })
      : Promise.resolve([]),
  ]);

  // Kontakter til det aktuelt tilknyttede kunde
  const contacts = ticket.company
    ? await db.contact.findMany({
        where: { companyId: ticket.company.id, isActive: true },
        select: { id: true, firstName: true, lastName: true },
        orderBy: { firstName: "asc" },
      })
    : [];

  async function handleDelete() {
    "use server";
    await deleteTicket(id);
  }

  return (
    <>
      <AppTopbar pageTitle="Rediger ticket" />


      <BackButton href="/support/tickets" label="Support Tickets" />
      <div className="max-w-2xl">
        <PageHeader
          title="Rediger ticket"
          actions={
            <Link href={`/support/tickets/${ticket.id}`}>
              <Button variant="ghost" size="sm">
                <ArrowLeft className="h-4 w-4" />
                Tilbage
              </Button>
            </Link>
          }
        />

        <form action={updateTicket} className="space-y-5">
          <input type="hidden" name="id" value={ticket.id} />

          {/* Ticket-detaljer */}
          <div className="bg-card border border-border rounded-xl p-5 space-y-4">
            <h3 className="text-sm font-semibold">Ticket-detaljer</h3>

            <Input name="title" label="Titel" defaultValue={ticket.title} required />

            <div className="space-y-1.5">
              <label className="block text-sm font-medium text-foreground">
                Beskrivelse <span className="text-destructive">*</span>
              </label>
              <textarea
                name="description"
                rows={5}
                required
                defaultValue={ticket.description}
                className="w-full px-3 py-2 rounded-lg border border-input bg-background text-sm
                           placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring resize-none"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label className="block text-sm font-medium text-foreground">Prioritet</label>
                <select
                  name="priority"
                  defaultValue={ticket.priority}
                  className="w-full px-3 py-2 rounded-lg border border-input bg-background text-sm
                             focus:outline-none focus:ring-2 focus:ring-ring"
                >
                  <option value="low">Lav</option>
                  <option value="normal">Normal</option>
                  <option value="high">Høj</option>
                  <option value="critical">Kritisk</option>
                </select>
              </div>
              <div className="space-y-1.5">
                <label className="block text-sm font-medium text-foreground">Status</label>
                <select
                  name="status"
                  defaultValue={ticket.status}
                  className="w-full px-3 py-2 rounded-lg border border-input bg-background text-sm
                             focus:outline-none focus:ring-2 focus:ring-ring"
                >
                  <option value="open">Åben</option>
                  <option value="pending_customer">Afventer kunde</option>
                  <option value="pending_supplier">Afventer leverandør</option>
                  <option value="resolved">Løst</option>
                  <option value="closed">Lukket</option>
                </select>
              </div>
            </div>
          </div>

          {/* Tilknytning */}
          <div className="bg-card border border-border rounded-xl p-5 space-y-4">
            <h3 className="text-sm font-semibold">Tilknytning</h3>

            <div className="space-y-1.5">
              <label className="block text-sm font-medium text-foreground">
                Kunde <span className="text-destructive">*</span>
              </label>
              <select
                name="companyId"
                required
                defaultValue={ticket.company?.id ?? ""}
                className="w-full px-3 py-2 rounded-lg border border-input bg-background text-sm
                           focus:outline-none focus:ring-2 focus:ring-ring"
              >
                <option value="">— Vælg kunde —</option>
                {companies.map((c) => (
                  <option key={c.id} value={c.id}>{c.name}</option>
                ))}
              </select>
            </div>

            {contacts.length > 0 && (
              <div className="space-y-1.5">
                <label className="block text-sm font-medium text-foreground">Kontakt</label>
                <select
                  name="contactId"
                  defaultValue={ticket.contact?.id ?? ""}
                  className="w-full px-3 py-2 rounded-lg border border-input bg-background text-sm
                             focus:outline-none focus:ring-2 focus:ring-ring"
                >
                  <option value="">— Ingen kontakt —</option>
                  {contacts.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.firstName} {c.lastName}
                    </option>
                  ))}
                </select>
              </div>
            )}

            {products.length > 0 && (
              <div className="space-y-1.5">
                <label className="block text-sm font-medium text-foreground">Produkt</label>
                <select
                  name="productId"
                  defaultValue={ticket.product?.id ?? ""}
                  className="w-full px-3 py-2 rounded-lg border border-input bg-background text-sm
                             focus:outline-none focus:ring-2 focus:ring-ring"
                >
                  <option value="">— Intet produkt —</option>
                  {products.map((p) => (
                    <option key={p.id} value={p.id}>{p.name}</option>
                  ))}
                </select>
              </div>
            )}

            {users.length > 0 && (
              <div className="space-y-1.5">
                <label className="block text-sm font-medium text-foreground">Tildelt til</label>
                <select
                  name="assignedToId"
                  defaultValue={ticket.assignedTo?.id ?? ""}
                  className="w-full px-3 py-2 rounded-lg border border-input bg-background text-sm
                             focus:outline-none focus:ring-2 focus:ring-ring"
                >
                  <option value="">— Ingen —</option>
                  {users.map((u) => (
                    <option key={u.id} value={u.id}>{u.name}</option>
                  ))}
                </select>
              </div>
            )}
          </div>

          <div className="flex items-center justify-between pt-2">
            <div className="flex items-center gap-3">
              <Button type="submit" size="lg">Gem ændringer</Button>
              <Link href={`/support/tickets/${ticket.id}`}>
                <Button type="button" variant="ghost" size="lg">Annuller</Button>
              </Link>
            </div>

                          <Button type="submit" formAction={handleDelete}
                variant="ghost"
                size="sm"
                className="text-destructive hover:text-destructive hover:bg-destructive/10"
              >
                <Trash2 className="h-3.5 w-3.5" />
                Slet ticket
              </Button>
          </div>
        </form>
      </div>
    </>
  );
}
