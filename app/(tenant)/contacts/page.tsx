import { getContacts } from "@/app/actions/contacts";
import { AppTopbar } from "@/components/layout/AppTopbar";
import { PageHeader } from "@/components/shared/PageHeader";
import { EmptyState } from "@/components/shared/EmptyState";
import { Button } from "@/components/ui/button";
import { Users, Plus, Phone, Mail, Building2, ChevronRight, Upload } from "lucide-react";
import Link from "next/link";
import { DECISION_ROLE_LIST, getDecisionRole } from "@/lib/decision-roles";

export default async function ContactsPage({
  searchParams,
}: {
  searchParams: Promise<{ search?: string; role?: string }>;
}) {
  const sp = await searchParams;
  const contacts = await getContacts(sp.search, undefined, sp.role);

  return (
    <>
      <AppTopbar pageTitle="Kontakter" />

      <PageHeader
        title="Kontakter"
        description={`${contacts.length} kontakter`}
        actions={
          <div className="flex items-center gap-2">
            <Link href="/contacts/import">
              <Button variant="ghost" size="md">
                <Upload className="h-4 w-4" />
                CSV-import
              </Button>
            </Link>
            <a href="/contacts/new">
              <Button size="md"><Plus className="h-4 w-4" />Opret kontakt</Button>
            </a>
          </div>
        }
      />

      <form className="mb-3">
        <input
          name="search"
          defaultValue={sp.search}
          placeholder="Søg efter navn, email..."
          className="w-full max-w-sm px-3 py-2 rounded-lg border border-input bg-background text-sm
                     placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
        />
        {sp.role && <input type="hidden" name="role" value={sp.role} />}
      </form>

      {/* Beslutningsmandat-filter */}
      <div className="flex flex-wrap gap-2 mb-4">
        <Link
          href={sp.search ? `/contacts?search=${encodeURIComponent(sp.search)}` : "/contacts"}
          className={`px-3 py-1 rounded-full text-xs font-medium transition-colors border ${
            !sp.role
              ? "bg-primary text-primary-foreground border-primary"
              : "bg-card border-border text-muted-foreground hover:text-foreground"
          }`}
        >
          Alle roller
        </Link>
        {DECISION_ROLE_LIST.map((r) => {
          const url = `/contacts?role=${r.slug}${sp.search ? `&search=${encodeURIComponent(sp.search)}` : ""}`;
          const active = sp.role === r.slug;
          return (
            <Link
              key={r.slug}
              href={url}
              className={`px-3 py-1 rounded-full text-xs font-medium transition-colors border ${
                active
                  ? "bg-primary text-primary-foreground border-primary"
                  : `${r.badgeClass} hover:opacity-80`
              }`}
            >
              {r.shortLabel}
            </Link>
          );
        })}
      </div>

      {contacts.length === 0 ? (
        <EmptyState
          icon={Users}
          title="Ingen kontakter endnu"
          description="Opret din første kontakt eller tilknyt én til et kunde."
          action={
            <a href="/contacts/new">
              <Button size="sm"><Plus className="h-3.5 w-3.5" />Opret kontakt</Button>
            </a>
          }
        />
      ) : (
        <div className="bg-card border border-border rounded-xl overflow-hidden">
          <table className="w-full">
            <thead>
              <tr className="border-b border-border bg-secondary/40">
                <th className="text-left px-5 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wide">Navn</th>
                <th className="text-left px-5 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wide hidden md:table-cell">Kunde</th>
                <th className="text-left px-5 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wide hidden lg:table-cell">Kontakt</th>
                <th className="text-left px-5 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wide hidden xl:table-cell">Mandat</th>
                <th className="w-10 px-5 py-3"></th>
              </tr>
            </thead>
            <tbody>
              {contacts.map((contact) => (
                <tr key={contact.id} className="border-b border-border last:border-0 hover:bg-secondary/30 transition-colors cursor-pointer group">
                  <td className="px-5 py-3.5">
                    <Link href={`/contacts/${contact.id}`} className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-xs font-semibold text-primary shrink-0">
                        {contact.firstName[0]}{contact.lastName[0]}
                      </div>
                      <div>
                        <p className="text-sm font-semibold group-hover:text-primary transition-colors">
                          {contact.firstName} {contact.lastName}
                        </p>
                        {contact.title && <p className="text-xs text-muted-foreground">{contact.title}</p>}
                      </div>
                    </Link>
                  </td>
                  <td className="px-5 py-3.5 hidden md:table-cell">
                    <Link href={`/contacts/${contact.id}`} className="block">
                      {contact.company ? (
                        <span className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-primary transition-colors">
                          <Building2 className="h-3.5 w-3.5" />{contact.company.name}
                        </span>
                      ) : <span className="text-muted-foreground/40 text-sm">—</span>}
                    </Link>
                  </td>
                  <td className="px-5 py-3.5 hidden lg:table-cell">
                    <Link href={`/contacts/${contact.id}`} className="block space-y-0.5">
                      {contact.phone && (
                        <span className="flex items-center gap-1.5 text-xs text-muted-foreground">
                          <Phone className="h-3 w-3" />{contact.phone}
                        </span>
                      )}
                      {contact.email && (
                        <span className="flex items-center gap-1.5 text-xs text-muted-foreground">
                          <Mail className="h-3 w-3" />{contact.email}
                        </span>
                      )}
                    </Link>
                  </td>
                  <td className="px-5 py-3.5 hidden xl:table-cell">
                    <Link href={`/contacts/${contact.id}`}>
                      {(() => {
                        const r = getDecisionRole((contact as any).decisionRole);
                        return r ? (
                          <span className={`text-xs px-2 py-0.5 rounded-full border ${r.badgeClass}`}>
                            {r.shortLabel}
                          </span>
                        ) : (
                          <span className="text-muted-foreground/40 text-xs">—</span>
                        );
                      })()}
                    </Link>
                  </td>
                  <td className="px-5 py-3.5">
                    <Link href={`/contacts/${contact.id}`}>
                      <ChevronRight className="h-4 w-4 text-muted-foreground/40 group-hover:text-muted-foreground" />
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </>
  );
}
