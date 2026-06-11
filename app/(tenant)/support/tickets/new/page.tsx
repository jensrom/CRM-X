import { AppTopbar } from "@/components/layout/AppTopbar";
import { PageHeader } from "@/components/shared/PageHeader";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { createTicket } from "@/app/actions/tickets";
import { getCompanies } from "@/app/actions/companies";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { ArrowLeft } from "lucide-react";
import Link from "next/link";

export default async function NewTicketPage({
  searchParams,
}: {
  searchParams: Promise<{ companyId?: string }>;
}) {
  const sp = await searchParams;
  const [companies, session] = await Promise.all([getCompanies(), auth()]);

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

  const contacts = sp.companyId
    ? await db.contact.findMany({
        where: { companyId: sp.companyId, isActive: true },
        select: { id: true, firstName: true, lastName: true },
        orderBy: { firstName: "asc" },
      })
    : [];

  return (
    <>
      <AppTopbar pageTitle="Opret ticket" />

      <div className="max-w-2xl">
        <PageHeader
          title="Opret ticket"
          actions={
            <Link href="/support/tickets">
              <Button variant="ghost" size="sm"><ArrowLeft className="h-4 w-4" />Tilbage</Button>
            </Link>
          }
        />

        <form action={createTicket} className="space-y-5">
          {/* Detaljer */}
          <div className="bg-card border border-border rounded-xl p-5 space-y-4">
            <h3 className="text-sm font-semibold">Ticket-detaljer</h3>
            <Input name="title" label="Titel" placeholder="Kort beskrivelse af problemet" required />

            <div className="space-y-1.5">
              <label className="block text-sm font-medium text-foreground">
                Beskrivelse <span className="text-destructive">*</span>
              </label>
              <textarea
                name="description"
                rows={5}
                required
                placeholder="Beskriv problemet i detaljer..."
                className="w-full px-3 py-2 rounded-lg border border-input bg-background text-sm
                           placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring resize-none"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label className="block text-sm font-medium text-foreground">Prioritet</label>
                <select
                  name="priority"
                  defaultValue="normal"
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
                  defaultValue="open"
                  className="w-full px-3 py-2 rounded-lg border border-input bg-background text-sm
                             focus:outline-none focus:ring-2 focus:ring-ring"
                >
                  <option value="open">Åben</option>
                  <option value="pending_customer">Afventer kunde</option>
                  <option value="pending_supplier">Afventer leverandør</option>
                </select>
              </div>
            </div>
          </div>

          {/* Tilknytning */}
          <div className="bg-card border border-border rounded-xl p-5 space-y-4">
            <h3 className="text-sm font-semibold">Tilknytning</h3>

            <div className="space-y-1.5">
              <label className="block text-sm font-medium text-foreground">
                Firma <span className="text-destructive">*</span>
              </label>
              <select
                name="companyId"
                required
                defaultValue={sp.companyId ?? ""}
                className="w-full px-3 py-2 rounded-lg border border-input bg-background text-sm
                           focus:outline-none focus:ring-2 focus:ring-ring"
              >
                <option value="">— Vælg firma —</option>
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
                  className="w-full px-3 py-2 rounded-lg border border-input bg-background text-sm
                             focus:outline-none focus:ring-2 focus:ring-ring"
                >
                  <option value="">— Vælg kontakt (valgfrit) —</option>
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
                  className="w-full px-3 py-2 rounded-lg border border-input bg-background text-sm
                             focus:outline-none focus:ring-2 focus:ring-ring"
                >
                  <option value="">— Vælg produkt (valgfrit) —</option>
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

          <div className="flex items-center gap-3 pt-2">
            <Button type="submit" size="lg">Opret ticket</Button>
            <Link href="/support/tickets">
              <Button type="button" variant="ghost" size="lg">Annuller</Button>
            </Link>
          </div>
        </form>
      </div>
    </>
  );
}
