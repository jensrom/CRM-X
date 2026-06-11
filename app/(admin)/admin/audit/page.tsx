import { db } from "@/lib/db";
import Link from "next/link";
import { ScrollText, Search } from "lucide-react";
import { formatDate } from "@/lib/utils";

const ACTION_COLORS: Record<string, string> = {
  login_success: "bg-emerald-50 text-emerald-700 border-emerald-200",
  login_failed:  "bg-rose-50 text-rose-700 border-rose-200",
  create:        "bg-blue-50 text-blue-700 border-blue-200",
  update:        "bg-amber-50 text-amber-700 border-amber-200",
  delete:        "bg-rose-50 text-rose-700 border-rose-200",
  impersonate_start: "bg-violet-50 text-violet-700 border-violet-200",
  impersonate_stop:  "bg-violet-50 text-violet-700 border-violet-200",
};

export default async function AdminAuditPage({
  searchParams,
}: {
  searchParams: Promise<{ action?: string; resourceType?: string; q?: string }>;
}) {
  const sp = await searchParams;

  const logs = await db.auditLog.findMany({
    where: {
      ...(sp.action ? { action: sp.action } : {}),
      ...(sp.resourceType ? { resourceType: sp.resourceType } : {}),
      ...(sp.q
        ? {
            OR: [
              { actorEmail: { contains: sp.q, mode: "insensitive" } },
              { message: { contains: sp.q, mode: "insensitive" } },
              { ipAddress: { contains: sp.q, mode: "insensitive" } },
            ],
          }
        : {}),
    },
    orderBy: { createdAt: "desc" },
    take: 200,
  });

  // Tenant names
  const tenantIds = Array.from(new Set(logs.map((l) => l.tenantId).filter((x): x is string => !!x)));
  const tenants = tenantIds.length
    ? await db.tenant.findMany({
        where: { id: { in: tenantIds } },
        select: { id: true, name: true, slug: true },
      })
    : [];
  const tenantById = Object.fromEntries(tenants.map((t) => [t.id, t]));

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-xl font-semibold">Audit-log</h1>
        <p className="text-sm text-muted-foreground mt-0.5">
          Append-only sporing af alle handlinger på platformen — 200 seneste vises.
        </p>
      </div>

      {/* Søg/filter */}
      <form className="flex items-center gap-3 flex-wrap">
        <div className="flex-1 max-w-md relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
          <input
            name="q"
            defaultValue={sp.q}
            placeholder="Søg email, besked eller IP..."
            className="w-full pl-9 pr-3 py-2 rounded-lg border border-input bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring"
          />
        </div>
        <select
          name="action"
          defaultValue={sp.action ?? ""}
          className="px-3 py-2 rounded-lg border border-input bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring"
        >
          <option value="">Alle handlinger</option>
          <option value="login_success">Login OK</option>
          <option value="login_failed">Login fejlet</option>
          <option value="create">Oprettelse</option>
          <option value="update">Opdatering</option>
          <option value="delete">Sletning</option>
          <option value="impersonate_start">Impersonering start</option>
          <option value="impersonate_stop">Impersonering stop</option>
        </select>
        <button
          type="submit"
          className="px-4 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 transition-colors"
        >
          Søg
        </button>
        {(sp.q || sp.action) && (
          <Link href="/admin/audit" className="text-sm text-muted-foreground hover:text-foreground">
            Nulstil
          </Link>
        )}
      </form>

      {/* Tabel */}
      <div className="bg-card border border-border rounded-xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-secondary/30 border-b border-border text-xs text-muted-foreground">
                <th className="text-left px-5 py-3 font-semibold">Tidspunkt</th>
                <th className="text-left px-5 py-3 font-semibold">Handling</th>
                <th className="text-left px-5 py-3 font-semibold">Aktør</th>
                <th className="text-left px-5 py-3 font-semibold hidden md:table-cell">Tenant</th>
                <th className="text-left px-5 py-3 font-semibold hidden lg:table-cell">Ressource</th>
                <th className="text-left px-5 py-3 font-semibold hidden xl:table-cell">Besked</th>
                <th className="text-left px-5 py-3 font-semibold hidden xl:table-cell">IP</th>
              </tr>
            </thead>
            <tbody>
              {logs.map((l) => {
                const t = l.tenantId ? tenantById[l.tenantId] : null;
                return (
                  <tr key={l.id} className="border-b border-border/50 last:border-0 hover:bg-secondary/10">
                    <td className="px-5 py-2.5 text-xs text-muted-foreground tabular-nums">
                      {formatDate(l.createdAt)}
                    </td>
                    <td className="px-5 py-2.5">
                      <span
                        className={`text-[10px] px-1.5 py-0.5 rounded font-medium border ${
                          ACTION_COLORS[l.action] ?? "bg-secondary text-muted-foreground border-border"
                        }`}
                      >
                        {l.action}
                      </span>
                    </td>
                    <td className="px-5 py-2.5 text-xs">
                      {l.actorEmail ?? <span className="text-muted-foreground/40">system</span>}
                    </td>
                    <td className="px-5 py-2.5 hidden md:table-cell">
                      {t ? (
                        <Link href={`/admin/tenants/${t.id}`} className="text-xs hover:text-primary transition-colors">
                          {t.name}
                        </Link>
                      ) : (
                        <span className="text-xs text-muted-foreground/40">—</span>
                      )}
                    </td>
                    <td className="px-5 py-2.5 hidden lg:table-cell text-xs text-muted-foreground">
                      {l.resourceType}
                      {l.resourceId && <span className="font-mono"> · {l.resourceId.slice(0, 8)}…</span>}
                    </td>
                    <td className="px-5 py-2.5 hidden xl:table-cell text-xs text-muted-foreground max-w-md truncate">
                      {l.message ?? ""}
                    </td>
                    <td className="px-5 py-2.5 hidden xl:table-cell text-xs text-muted-foreground font-mono">
                      {l.ipAddress ?? "—"}
                    </td>
                  </tr>
                );
              })}
              {logs.length === 0 && (
                <tr>
                  <td colSpan={7} className="px-5 py-12 text-center text-sm text-muted-foreground">
                    Ingen events matcher filteret.
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
