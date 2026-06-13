import { getCompanies } from "@/app/actions/companies";
import { AppTopbar } from "@/components/layout/AppTopbar";
import { PageHeader } from "@/components/shared/PageHeader";
import { EmptyState } from "@/components/shared/EmptyState";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Building2, Plus, Phone, Mail, MapPin, Upload } from "lucide-react";
import Link from "next/link";
import { formatDate } from "@/lib/utils";

export default async function CompaniesPage({
  searchParams,
}: {
  searchParams: Promise<{ search?: string }>;
}) {
  const sp = await searchParams;
  const companies = await getCompanies(sp.search);

  return (
    <>
      <AppTopbar pageTitle="Kunder" />

      <PageHeader
        title="Kunder"
        description={`${companies.length} aktive kunder`}
        actions={
          <div className="flex items-center gap-2">
            <Link href="/companies/import">
              <Button variant="ghost" size="md">
                <Upload className="h-4 w-4" />
                CSV-import
              </Button>
            </Link>
            <a href="/companies/new">
              <Button size="md">
                <Plus className="h-4 w-4" />
                Opret kunde
              </Button>
            </a>
          </div>
        }
      />

      {/* Søgning */}
      <form className="mb-4">
        <input
          name="search"
          defaultValue={sp.search}
          placeholder="Søg efter kunde..."
          className="w-full max-w-sm px-3 py-2 rounded-lg border border-input bg-background text-sm
                     placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
        />
      </form>

      {/* Tabel */}
      {companies.length === 0 ? (
        <EmptyState
          icon={Building2}
          title="Ingen kunder endnu"
          description="Opret dit første kunde for at komme i gang."
          action={
            <a href="/companies/new">
              <Button size="sm"><Plus className="h-3.5 w-3.5" />Opret kunde</Button>
            </a>
          }
        />
      ) : (
        <div className="bg-card border border-border rounded-xl overflow-hidden">
          <table className="w-full">
            <thead>
              <tr className="border-b border-border bg-secondary/40">
                <th className="text-left px-5 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wide">Kunde</th>
                <th className="text-left px-5 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wide hidden md:table-cell">By</th>
                <th className="text-left px-5 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wide hidden lg:table-cell">Kontakt</th>
                <th className="text-left px-5 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wide hidden lg:table-cell">Produkter</th>
                <th className="text-left px-5 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wide hidden xl:table-cell">Oprettet</th>
              </tr>
            </thead>
            <tbody>
              {companies.map((company) => (
                <tr
                  key={company.id}
                  className="border-b border-border last:border-0 hover:bg-secondary/30 transition-colors cursor-pointer group"
                >
                  <td className="px-5 py-3.5">
                    <Link href={`/companies/${company.id}`} className="block">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                          <Building2 className="h-4 w-4 text-primary" />
                        </div>
                        <div>
                          <p className="text-sm font-semibold text-foreground group-hover:text-primary transition-colors">
                            {company.name}
                          </p>
                          {company.orgNumber && (
                            <p className="text-xs text-muted-foreground">CVR: {company.orgNumber}</p>
                          )}
                        </div>
                      </div>
                    </Link>
                  </td>
                  <td className="px-5 py-3.5 hidden md:table-cell">
                    <Link href={`/companies/${company.id}`} className="block">
                      {company.city ? (
                        <span className="flex items-center gap-1.5 text-sm text-muted-foreground">
                          <MapPin className="h-3.5 w-3.5" />
                          {company.zipCode} {company.city}
                        </span>
                      ) : (
                        <span className="text-muted-foreground/40 text-sm">—</span>
                      )}
                    </Link>
                  </td>
                  <td className="px-5 py-3.5 hidden lg:table-cell">
                    <Link href={`/companies/${company.id}`} className="block space-y-0.5">
                      {company.phone && (
                        <span className="flex items-center gap-1.5 text-xs text-muted-foreground">
                          <Phone className="h-3 w-3" />{company.phone}
                        </span>
                      )}
                      {company.email && (
                        <span className="flex items-center gap-1.5 text-xs text-muted-foreground">
                          <Mail className="h-3 w-3" />{company.email}
                        </span>
                      )}
                    </Link>
                  </td>
                  <td className="px-5 py-3.5 hidden lg:table-cell">
                    <Link href={`/companies/${company.id}`} className="block">
                      <div className="flex flex-wrap gap-1">
                        {company.customerProducts.slice(0, 2).map((cp) => (
                          <Badge key={cp.id} variant="default">
                            {cp.product.name}
                          </Badge>
                        ))}
                        {company.customerProducts.length > 2 && (
                          <Badge variant="muted">+{company.customerProducts.length - 2}</Badge>
                        )}
                        {company.customerProducts.length === 0 && (
                          <span className="text-muted-foreground/40 text-sm">—</span>
                        )}
                      </div>
                    </Link>
                  </td>
                  <td className="px-5 py-3.5 hidden xl:table-cell">
                    <Link href={`/companies/${company.id}`} className="block">
                      <span className="text-sm text-muted-foreground">{formatDate(company.createdAt)}</span>
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
