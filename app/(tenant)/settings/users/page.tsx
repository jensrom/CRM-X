import { AppTopbar } from "@/components/layout/AppTopbar";
import { PageHeader } from "@/components/shared/PageHeader";
import { BackButton } from "@/components/shared/BackButton";
import {
  getTenantUsersWithRoles,
  getRoles,
  updateUserRole,
  updateUserPassword,
  getTenantLicenseInfo,
} from "@/app/actions/settings";
import { auth } from "@/lib/auth";
import { CreateUserDialog } from "@/components/settings/CreateUserDialog";
import { ToggleUserActiveButton } from "@/components/settings/ToggleUserActiveButton";
import { Users, Key, AlertTriangle } from "lucide-react";
import { formatDate } from "@/lib/utils";

export default async function UsersSettingsPage() {
  const [users, roles, licenseInfo, session] = await Promise.all([
    getTenantUsersWithRoles(),
    getRoles(),
    getTenantLicenseInfo(),
    auth(),
  ]);

  const selfId = session?.user?.id ?? null;
  const atCap = licenseInfo?.atCap ?? false;
  const lowOnSeats = licenseInfo && licenseInfo.remaining <= 2 && !licenseInfo.atCap;

  return (
    <>
      <AppTopbar pageTitle="Brugerstyring" />
      <BackButton href="/settings" label="Indstillinger" />

      <div className="flex items-start justify-between flex-wrap gap-3 mb-5">
        <div>
          <h1 className="text-xl font-semibold">Brugerstyring</h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            {users.filter((u) => u.isActive).length} aktive brugere
          </p>
        </div>
        <CreateUserDialog
          roles={roles.map((r) => ({ id: r.id, name: r.name }))}
          disabled={atCap}
          disabledReason={atCap ? "Ingen frie licenser — opgrader plan først" : undefined}
        />
      </div>

      {/* License-counter */}
      {licenseInfo && (
        <div
          className={`mb-5 rounded-xl border p-4 flex items-center gap-3 ${
            atCap
              ? "border-destructive/30 bg-destructive/5"
              : lowOnSeats
                ? "border-amber-200 bg-amber-50/50"
                : "border-border bg-card"
          }`}
        >
          {atCap ? (
            <AlertTriangle className="h-5 w-5 text-destructive shrink-0" />
          ) : (
            <Users className="h-5 w-5 text-primary shrink-0" />
          )}
          <div className="flex-1 min-w-0">
            <div className="flex items-baseline gap-2">
              <span className="text-lg font-bold tabular-nums">
                {licenseInfo.activeUsers}/{licenseInfo.maxUsers}
              </span>
              <span className="text-sm text-muted-foreground">pladser brugt</span>
              <span className="ml-auto text-[11px] uppercase tracking-wide text-muted-foreground font-mono">
                {licenseInfo.plan}-plan
              </span>
            </div>
            <div className="h-1.5 bg-secondary rounded-full overflow-hidden mt-2">
              <div
                className={`h-full rounded-full transition-all ${
                  atCap ? "bg-destructive" : lowOnSeats ? "bg-amber-500" : "bg-primary"
                }`}
                style={{
                  width: `${Math.min(100, (licenseInfo.activeUsers / licenseInfo.maxUsers) * 100)}%`,
                }}
              />
            </div>
            <p className="text-xs text-muted-foreground mt-2">
              {atCap
                ? "Ingen frie licenser — opgrader plan eller deaktiver en bruger for at oprette flere."
                : lowOnSeats
                  ? `Kun ${licenseInfo.remaining} ${licenseInfo.remaining === 1 ? "plads" : "pladser"} tilbage.`
                  : `${licenseInfo.remaining} ${licenseInfo.remaining === 1 ? "plads" : "pladser"} tilbage.`}
            </p>
          </div>
        </div>
      )}

      <div className="max-w-3xl space-y-3">
        {users.map((u) => (
          <div
            key={u.id}
            className={`bg-card border rounded-xl p-4 ${u.isActive ? "border-border" : "border-border/50 opacity-70"}`}
          >
            <div className="flex items-start gap-4">
              {/* Avatar */}
              <div className="w-9 h-9 rounded-full bg-primary/10 flex items-center justify-center shrink-0 text-sm font-semibold text-primary">
                {u.name.split(" ").map((n: string) => n[0]).slice(0, 2).join("")}
              </div>

              {/* Info */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-0.5">
                  <p className="font-medium text-sm">{u.name}</p>
                  {u.isActive ? (
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 shrink-0" title="Aktiv" />
                  ) : (
                    <span className="w-1.5 h-1.5 rounded-full bg-muted-foreground/40 shrink-0" title="Inaktiv" />
                  )}
                  {u.id === selfId && (
                    <span className="text-[10px] px-1.5 py-0.5 rounded bg-primary/10 text-primary uppercase tracking-wider">
                      dig
                    </span>
                  )}
                </div>
                <p className="text-xs text-muted-foreground">{u.email}</p>
                {u.lastLogin && (
                  <p className="text-xs text-muted-foreground mt-0.5">
                    Senest aktiv {formatDate(u.lastLogin)}
                  </p>
                )}
              </div>

              {/* Rolle-skift */}
              <form action={updateUserRole} className="flex items-center gap-2 shrink-0">
                <input type="hidden" name="userId" value={u.id} />
                <select
                  name="roleId"
                  defaultValue={u.role?.id ?? ""}
                  className="px-2.5 py-1.5 rounded-lg border border-input bg-background text-xs focus:outline-none focus:ring-2 focus:ring-ring"
                >
                  <option value="">Ingen rolle</option>
                  {roles.map((r) => (
                    <option key={r.id} value={r.id}>{r.name}</option>
                  ))}
                </select>
                <button type="submit" className="px-2.5 py-1.5 text-xs bg-secondary hover:bg-secondary/80 rounded-lg border border-border transition-colors">
                  Gem
                </button>
              </form>

              {/* Aktiver/deaktiver-toggle */}
              <ToggleUserActiveButton
                userId={u.id}
                isActive={u.isActive}
                userName={u.name}
                canAtCap={atCap}
                selfId={selfId}
              />
            </div>

            {/* Password reset */}
            <div className="mt-3 pt-3 border-t border-border/50 flex items-center gap-2">
              <Key className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
              <form action={updateUserPassword} className="flex items-center gap-2 flex-1">
                <input type="hidden" name="userId" value={u.id} />
                <input
                  type="password"
                  name="password"
                  placeholder="Nyt password (min. 8 tegn)"
                  minLength={8}
                  className="flex-1 px-2.5 py-1.5 rounded-lg border border-input bg-background text-xs focus:outline-none focus:ring-2 focus:ring-ring"
                />
                <button type="submit" className="px-2.5 py-1.5 text-xs bg-secondary hover:bg-secondary/80 rounded-lg border border-border transition-colors shrink-0">
                  Skift password
                </button>
              </form>
            </div>
          </div>
        ))}

        {users.length === 0 && (
          <div className="text-center py-10 text-muted-foreground">
            <Users className="h-8 w-8 mx-auto mb-3 opacity-30" />
            <p className="text-sm">Ingen brugere fundet</p>
          </div>
        )}
      </div>
    </>
  );
}
