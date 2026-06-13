import { db } from "@/lib/db";
import Link from "next/link";
import { formatDate } from "@/lib/utils";
import { Plus, Search } from "lucide-react";
import { TenantStatusBadge } from "@/components/admin/TenantStatusBadge";

const MODULE_COLORS: Record<string, string> = {
  sales:     "bg-blue-50 text-blue-700 border-blue-200",
  marketing: "bg-purple-50 text-purple-700 border-purple-200",
  support:   "bg-amber-50 text-amber-700 border-amber-200",
  projects:  "bg-emerald-50 text-emerald-700 border-emerald-200",
  products:  "bg-indigo-50 text-indigo-700 border-indigo-200",
  licenses:  "bg-rose-50 text-rose-700 border-rose-200",
};

const STATUS_TABS = [
  { label: "Alle", value: "" },
  { label: "Aktive", value: "active" },
  { label: "Trial", value: "trial" },
  { label: "Suspenderede", value: "suspended" },
  { label: "Lukket", value: "deleted" },
];

export default async function AdminTenantsListPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string; search?: string }>;
}) {
  const sp = await searchParams;

  const tenants = await db.tenant.findMany({
    where: {
      ...(sp.status ? { status: sp.status } : {}),
      ...(sp.search
        ? {
            OR: [
              { name: { contains: sp.search, mode: "insensitive" } },
              { slug: { contains: sp.search, mode: "insensitive" } },
              { adminEmail: { contains: sp.search, mode: "insensitive" } },
            ],
          }
        : {}),
    },
    orderBy: { createdAt: "desc" },
    include: { _count: { select: { users: true, companies: true } } },
  });

  return (
    <div className="space-y-5">
      <div className="flex items-end justify-between">
        <div>
          <h1 className="text-xl font-semibold">Alle kunder</h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            {tenants.length} tenant{tenants.length !== 1 ? "s" : ""}
            {sp.status ? ` med status "${sp.status}"` : ""}
          </p>
        </div>
        <Link
          href="/admin/tenants/new"
          className="flex items-center gap-2 px-3.5 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 transition-colors"
        >
          <Plus className="h-4 w-4" />
          Onboard ny kunde
        </Link>
      </div>

      {/* Filtre */}
      <div className="flex items-center gap-3 flex-wrap">
        <form className="flex-1 max-w-sm">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
            <input
              name="search"
              defaultValue={sp.search}
              placeholder="Søg på navn, slug eller email..."
              className="w-full pl-9 pr-3 py-2 rounded-lg border border-input bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring"
            />
            {sp.status && <input type="hidden" name="status" value={sp.status} />}
          </div>
        </form>
        <div className="flex items-center gap-2 flex-wrap">
          {STATUS_TABS.map(({ label, value }) => {
            const params = new URLSearchParams();
            if (value) params.set("status", value);
            if (sp.search) params.set("search", sp.search);
            const href = params.toString() ? `/admin/tenants?${params}` : "/admin/tenants";
            const active = (sp.status ?? "") === value;
            return (
              <Link
                key={value}
                href={href}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors ${
                  active
                    ? "bg-primary text-primary-foreground border-primary"
                    : "bg-background border-border text-muted-foreground hover:text-foreground"
                }`}
              >
                {label}
              </Link>
            );
          })}
        </div>
      </div>

      {/* Tabel */}
      <div className="bg-card border border-border rounded-xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border bg-secondary/30 text-xs text-muted-foreground">
                <th className="text-left px-5 py-3 font-semibold">Kunde</th>
                <th className="text-left px-5 py-3 font-semibold">Plan</th>
                <th className="text-left px-5 py-3 font-semibold hidden md:table-cell">Moduler</th>
                <th className="text-right px-5 py-3 font-semibold hidden sm:table-cell">Brugere</th>
                <th className="text-right px-5 py-3 font-semibold hidden lg:table-cell">Kunder</th>
                <th className="text-left px-5 py-3 font-semibold">Status</th>
                <th className="text-left px-5 py-3 font-semibold hidden xl:table-cell">Oprettet</th>
                <th className="w-12 px-5 py-3"></th>
              </tr>
            </thead>
            <tbody>
              {tenants.map((t) => (
                <tr key={t.id} className="border-b border-border/50 last:border-0 hover:bg-secondary/20 transition-colors">
                  <td className="px-5 py-3.5">
                    <Link href={`/admin/tenants/${t.id}`} className="block">
                      <p className="font-medium">{t.name}</p>
                      <p className="font-mono text-[10px] text-muted-foreground">
                        {t.slug}.plesnertech.dk
                      </p>
                    </Link>
                  </td>
                  <td className="px-5 py-3.5">
                    <span className="text-xs px-2 py-0.5 rounded-full bg-secondary capitalize">
                      {t.plan}
                    </span>
                  </td>
                  <td className="px-5 py-3.5 hidden md:table-cell">
                    <div className="flex flex-wrap gap-1">
                      {t.modules.slice(0, 4).map((m) => (
                        <span
                          key={m}
                          className={`text-[10px] px-1.5 py-0.5 rounded font-medium border ${
                            MODULE_COLORS[m] ?? "bg-secondary text-muted-foreground"
                          }`}
                        >
                          {m}
                        </span>
                      ))}
                      {t.modules.length > 4 && (
                        <span className="text-[10px] text-muted-foreground">+{t.modules.length - 4}</span>
                      )}
                    </div>
                  </td>
                  <td className="px-5 py-3.5 text-right tabular-nums hidden sm:table-cell">
                    {t._count.users}/{t.maxUsers}
                  </td>
                  <td className="px-5 py-3.5 text-right tabular-nums hidden lg:table-cell text-muted-foreground">
                    {t._count.companies}
                  </td>
                  <td className="px-5 py-3.5">
                    <TenantStatusBadge
                      status={t.status as any}
                      trialEndsAt={t.trialEndsAt}
                      scheduledDeletionAt={t.scheduledDeletionAt}
                    />
                  </td>
                  <td className="px-5 py-3.5 text-muted-foreground text-xs hidden xl:table-cell">
                    {formatDate(t.createdAt)}
                  </td>
                  <td className="px-5 py-3.5">
                    <Link
                      href={`/admin/tenants/${t.id}`}
                      className="text-xs text-primary hover:underline"
                    >
                      Åbn →
                    </Link>
                  </td>
                </tr>
              ))}
              {tenants.length === 0 && (
                <tr>
                  <td colSpan={8} className="text-center text-sm text-muted-foreground py-12">
                    Ingen tenants matcher filteret.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
