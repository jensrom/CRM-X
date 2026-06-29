import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { getAdminTenant, updateTenant, createTenantUser, toggleUserActive, resetUserPassword } from "@/app/actions/admin";
import { notFound } from "next/navigation";
import { ArrowLeft, Building2, Users, Settings, CheckCircle2, XCircle, Plus, Key, RefreshCw, UserCheck, ExternalLink } from "lucide-react";
import Link from "next/link";
import { formatDate } from "@/lib/utils";
import { TenantLifecyclePanel } from "@/components/admin/TenantLifecyclePanel";
import { TenantStatusBadge } from "@/components/admin/TenantStatusBadge";
import { ADDON_LIST, isAddOnAvailable, getAddOnPricePerUser, type PlanSlug, type AddOnSlug } from "@/lib/plans";

const MODULES = [
  { key: "sales",     label: "Salg",      desc: "Pipeline, tilbud, deals" },
  { key: "marketing", label: "Marketing", desc: "Kampagner og leads" },
  { key: "support",   label: "Support",   desc: "Tickets og tidlogning" },
  { key: "projects",  label: "Projekter", desc: "Projekter og klippekort" },
  { key: "products",  label: "Produkter", desc: "Produktkatalog og priser" },
  { key: "licenses",  label: "Licenser",  desc: "Licensstyring" },
];

export default async function TenantDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams?: Promise<{ userError?: string; userCreated?: string; userOk?: string; onboarded?: string }>;
}) {
  const { id } = await params;
  const sp = (await (searchParams ?? Promise.resolve({}))) as {
    userError?: string;
    userCreated?: string;
    userOk?: string;
    onboarded?: string;
  };
  const session = await auth();
  if (session?.user?.role !== "super_admin") redirect("/login");

  const tenant = await getAdminTenant(id);
  if (!tenant) notFound();

  return (
    <div className="space-y-6">
      {/* Toast-bar: success / fejl fra recent action */}
      {sp.userCreated && (
        <div className="bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-300 dark:border-emerald-800 rounded-xl px-4 py-3 flex items-start gap-3">
          <CheckCircle2 className="h-4 w-4 text-emerald-600 dark:text-emerald-400 shrink-0 mt-0.5" />
          <p className="text-sm text-emerald-900 dark:text-emerald-200">
            Brugeren <strong>{sp.userCreated}</strong> er oprettet og kan logge ind nu.
          </p>
        </div>
      )}
      {sp.userError && (
        <div className="bg-rose-50 dark:bg-rose-950/30 border border-rose-300 dark:border-rose-800 rounded-xl px-4 py-3 flex items-start gap-3">
          <XCircle className="h-4 w-4 text-rose-600 dark:text-rose-400 shrink-0 mt-0.5" />
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold text-rose-900 dark:text-rose-200">
              Handlingen kunne ikke gennemføres
            </p>
            <p className="text-xs text-rose-800 dark:text-rose-300 mt-0.5 break-words">
              {sp.userError}
            </p>
            <p className="text-xs text-rose-700/80 dark:text-rose-300/80 mt-1">
              Password skal være mindst 12 tegn og indeholde mindst 3 af: små bogstaver, store bogstaver, tal, symbol.
            </p>
          </div>
        </div>
      )}
      {sp.userOk && (
        <div className="bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-300 dark:border-emerald-800 rounded-xl px-4 py-3 flex items-start gap-3">
          <CheckCircle2 className="h-4 w-4 text-emerald-600 dark:text-emerald-400 shrink-0 mt-0.5" />
          <p className="text-sm text-emerald-900 dark:text-emerald-200">{sp.userOk}</p>
        </div>
      )}

      {/* Breadcrumb + actions */}
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div className="flex items-center gap-2 text-sm">
          <Link href="/admin/tenants" className="text-muted-foreground hover:text-foreground transition-colors flex items-center gap-1">
            <ArrowLeft className="h-3.5 w-3.5" />
            Alle kunder
          </Link>
          <span className="text-muted-foreground/40">/</span>
          <span className="font-medium">{tenant.name}</span>
          <TenantStatusBadge
            status={(tenant as any).status}
            trialEndsAt={(tenant as any).trialEndsAt}
            scheduledDeletionAt={(tenant as any).scheduledDeletionAt}
          />
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <a
            href={`https://${tenant.slug}.plesnertech.dk`}
            target="_blank"
            rel="noopener noreferrer"
            className="text-xs text-muted-foreground hover:text-foreground font-mono flex items-center gap-1"
          >
            {tenant.slug}.plesnertech.dk
            <ExternalLink className="h-3 w-3" />
          </a>
          <form action="/api/admin/impersonate" method="POST">
            <input type="hidden" name="action" value="start" />
            <input type="hidden" name="tenantId" value={tenant.id} />
            <button
              type="submit"
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-amber-500/10 text-amber-700 hover:bg-amber-500/20 transition-colors border border-amber-200"
              title="Start 60-min impersonation-session med fuld audit"
            >
              <UserCheck className="h-3.5 w-3.5" />
              Log ind som tenant-admin
            </button>
          </form>
        </div>
      </div>

      <div className="space-y-6">

        {/* Stats row */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {[
            { label: "Brugere", value: `${tenant.users.length}/${tenant.maxUsers}`, icon: Users },
            { label: "Kunder", value: tenant._count.companies, icon: Building2 },
            { label: "Tickets", value: tenant._count.tickets, icon: Settings },
            { label: "Projekter", value: tenant._count.projects, icon: CheckCircle2 },
          ].map((s) => (
            <div key={s.label} className="bg-card border border-border rounded-xl p-4">
              <p className="text-2xl font-bold tabular-nums">{s.value}</p>
              <p className="text-xs text-muted-foreground mt-0.5">{s.label}</p>
            </div>
          ))}
        </div>

        <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">

          {/* Indstillinger */}
          <div className="space-y-5">
            <div className="bg-card border border-border rounded-xl p-5">
              <h2 className="text-sm font-semibold mb-4 flex items-center gap-2">
                <Settings className="h-4 w-4 text-muted-foreground" />
                Site-indstillinger
              </h2>

              <form action={updateTenant} className="space-y-4">
                <input type="hidden" name="id" value={tenant.id} />

                <div className="space-y-1.5">
                  <label className="block text-sm font-medium">Kundenavn</label>
                  <input name="name" defaultValue={tenant.name} required
                    className="w-full px-3 py-2 rounded-lg border border-input bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring" />
                </div>

                <div className="space-y-1.5">
                  <label className="block text-sm font-medium">Subdomain</label>
                  <div className="flex items-center gap-0">
                    <input value={tenant.slug} disabled
                      className="flex-1 px-3 py-2 rounded-l-lg border border-input bg-secondary text-sm font-mono opacity-60" />
                    <span className="px-3 py-2 border border-l-0 border-input rounded-r-lg bg-secondary text-sm text-muted-foreground">.plesnertech.dk</span>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <label className="block text-sm font-medium">Ticket-præfiks</label>
                    <input name="ticketPrefix" defaultValue={tenant.ticketPrefix} maxLength={3}
                      className="w-full px-3 py-2 rounded-lg border border-input bg-background text-sm font-mono focus:outline-none focus:ring-2 focus:ring-ring" />
                  </div>
                  <div className="space-y-1.5">
                    <label className="block text-sm font-medium">Projekt-præfiks</label>
                    <input name="projectPrefix" defaultValue={tenant.projectPrefix} maxLength={3}
                      className="w-full px-3 py-2 rounded-lg border border-input bg-background text-sm font-mono focus:outline-none focus:ring-2 focus:ring-ring" />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <label className="block text-sm font-medium">Plan</label>
                    <select name="plan" defaultValue={tenant.plan}
                      className="w-full px-3 py-2 rounded-lg border border-input bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring">
                      <option value="small">Small — 68 kr/seat/md</option>
                      <option value="medium">Medium — 109 kr/seat/md</option>
                      <option value="large">Large — 170 kr/seat/md</option>
                    </select>
                  </div>
                  <div className="space-y-1.5">
                    <label className="block text-sm font-medium">Maks. brugere</label>
                    <input name="maxUsers" type="number" defaultValue={tenant.maxUsers} min="1"
                      className="w-full px-3 py-2 rounded-lg border border-input bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring" />
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label className="block text-sm font-medium">Status</label>
                  <select name="isActive" defaultValue={tenant.isActive ? "true" : "false"}
                    className="w-full px-3 py-2 rounded-lg border border-input bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring">
                    <option value="true">Aktiv</option>
                    <option value="false">Inaktiv</option>
                  </select>
                </div>

                {/* Modul-toggle */}
                <div className="space-y-2 pt-1">
                  <p className="text-sm font-medium">Aktive moduler</p>
                  <div className="grid grid-cols-2 gap-2">
                    {MODULES.map((m) => (
                      <label key={m.key}
                        className="flex items-center gap-2.5 p-2.5 rounded-lg border border-border hover:bg-secondary/50 cursor-pointer transition-colors">
                        <input
                          type="checkbox"
                          name={`module_${m.key}`}
                          value="on"
                          defaultChecked={tenant.modules.includes(m.key)}
                          className="accent-primary"
                        />
                        <div>
                          <p className="text-xs font-medium">{m.label}</p>
                          <p className="text-[10px] text-muted-foreground">{m.desc}</p>
                        </div>
                      </label>
                    ))}
                  </div>
                </div>

                {/* Named add-ons — Forecast etc. Plan-restriktioner gates her. */}
                <div className="space-y-2 pt-1">
                  <div className="flex items-baseline justify-between">
                    <p className="text-sm font-medium">Tilkøbsmoduler (add-ons)</p>
                    <p className="text-[10px] text-muted-foreground">Pris pr. seat/md afhænger af plan</p>
                  </div>
                  <div className="space-y-2">
                    {ADDON_LIST.map((addon) => {
                      const planSlug = (tenant.plan ?? "small") as PlanSlug;
                      const available = isAddOnAvailable(addon.slug, planSlug);
                      const price = getAddOnPricePerUser(addon.slug, planSlug, "DKK");
                      const isOn = (tenant as any).addOns?.includes(addon.slug) ?? false;
                      return (
                        <label key={addon.slug}
                          className={`flex items-start gap-2.5 p-3 rounded-lg border ${
                            available ? "border-border hover:bg-secondary/50 cursor-pointer" : "border-dashed border-border bg-secondary/30 opacity-60 cursor-not-allowed"
                          } transition-colors`}>
                          <input
                            type="checkbox"
                            name={`addon_${addon.slug}`}
                            value="on"
                            defaultChecked={isOn}
                            disabled={!available}
                            className="mt-0.5 disabled:opacity-50"
                          />
                          <div className="flex-1 min-w-0">
                            <div className="flex items-baseline justify-between gap-2">
                              <p className="text-sm font-medium">{addon.name}</p>
                              {available ? (
                                <span className="text-xs tabular-nums text-primary font-semibold whitespace-nowrap">
                                  +{price} kr/seat/md
                                </span>
                              ) : (
                                <span className="text-[10px] uppercase tracking-wider text-amber-600 dark:text-amber-400 font-semibold whitespace-nowrap">
                                  Kræver Medium+
                                </span>
                              )}
                            </div>
                            <p className="text-xs text-muted-foreground mt-0.5">{addon.tagline}</p>
                          </div>
                        </label>
                      );
                    })}
                  </div>
                </div>

                <div className="pt-1">
                  <button type="submit"
                    className="px-4 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 transition-colors">
                    Gem ændringer
                  </button>
                </div>
              </form>
            </div>
          </div>

          {/* Brugere */}
          <div className="space-y-5">
            <div className="bg-card border border-border rounded-xl p-5">
              <h2 className="text-sm font-semibold mb-4 flex items-center gap-2">
                <Users className="h-4 w-4 text-muted-foreground" />
                Brugere ({tenant.users.length}/{tenant.maxUsers})
              </h2>

              <div className="space-y-2 mb-4">
                {tenant.users.map((u) => (
                  <div key={u.id} className={`flex items-center justify-between p-3 rounded-lg border transition-colors ${u.isActive ? "border-border bg-background" : "border-border/50 bg-secondary/30 opacity-60"}`}>
                    <div className="min-w-0">
                      <p className="text-sm font-medium truncate">{u.name}</p>
                      <p className="text-xs text-muted-foreground truncate">{u.email}</p>
                      {u.role && <p className="text-[10px] text-primary mt-0.5">{u.role.name}</p>}
                    </div>
                    <div className="flex items-center gap-1.5 shrink-0 ml-2">
                      {/* Password reset */}
                      <form action={resetUserPassword}>
                        <input type="hidden" name="userId" value={u.id} />
                        <input type="hidden" name="tenantId" value={tenant.id} />
                        <input
                          type="text"
                          name="password"
                          placeholder="Nyt pw"
                          className="w-20 px-2 py-1 text-xs rounded-md border border-input bg-background focus:outline-none focus:ring-1 focus:ring-ring"
                        />
                        <button type="submit" title="Nulstil password"
                          className="ml-1 p-1 rounded text-muted-foreground hover:text-primary transition-colors">
                          <Key className="h-3.5 w-3.5" />
                        </button>
                      </form>
                      {/* Toggle active */}
                      <form action={async () => {
                        "use server";
                        await toggleUserActive(u.id, tenant.id, !u.isActive);
                      }}>
                        <button type="submit" title={u.isActive ? "Deaktiver" : "Aktiver"}
                          className={`p-1 rounded transition-colors ${u.isActive ? "text-muted-foreground hover:text-destructive" : "text-muted-foreground hover:text-emerald-600"}`}>
                          {u.isActive
                            ? <XCircle className="h-3.5 w-3.5" />
                            : <CheckCircle2 className="h-3.5 w-3.5" />
                          }
                        </button>
                      </form>
                    </div>
                  </div>
                ))}

                {tenant.users.length === 0 && (
                  <p className="text-sm text-muted-foreground text-center py-4">Ingen brugere endnu</p>
                )}
              </div>

              {/* Opret ny bruger */}
              <div className="border-t border-border pt-4">
                <div className="flex items-center justify-between mb-3">
                  <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Opret bruger</p>
                  <p className="text-[10px] text-muted-foreground">Min 12 tegn · 3 af 4 klasser</p>
                </div>
                <form action={createTenantUser} className="space-y-2">
                  <input type="hidden" name="tenantId" value={tenant.id} />
                  <input name="name" required placeholder="Navn"
                    className="w-full px-3 py-2 rounded-lg border border-input bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring" />
                  <input name="email" type="email" required placeholder="Email"
                    className="w-full px-3 py-2 rounded-lg border border-input bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring" />
                  <div className="grid grid-cols-2 gap-2">
                    <input name="password" type="password" placeholder="Password (tom = Velkommen2026!)"
                      className="w-full px-3 py-2 rounded-lg border border-input bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring" />
                    <select name="roleId"
                      className="w-full px-3 py-2 rounded-lg border border-input bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring">
                      <option value="">Ingen rolle</option>
                      {tenant.roles.map((r) => (
                        <option key={r.id} value={r.id}>{r.name}</option>
                      ))}
                    </select>
                  </div>
                  <button type="submit"
                    className="w-full py-2 rounded-lg border border-dashed border-primary/40 text-sm text-primary hover:bg-primary/5 transition-colors flex items-center justify-center gap-2">
                    <Plus className="h-3.5 w-3.5" />
                    Opret bruger
                  </button>
                </form>
              </div>
            </div>
          </div>
        </div>

        {/* Lifecycle-panel (suspend / scheduled_deletion / purge) */}
        <TenantLifecyclePanel
          tenantId={tenant.id}
          tenantName={tenant.name}
          tenantSlug={tenant.slug}
          status={(tenant as any).status}
          trialEndsAt={(tenant as any).trialEndsAt}
          suspendedAt={(tenant as any).suspendedAt}
          scheduledDeletionAt={(tenant as any).scheduledDeletionAt}
        />
      </div>
    </div>
  );
}
