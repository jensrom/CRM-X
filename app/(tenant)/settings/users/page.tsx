import { AppTopbar } from "@/components/layout/AppTopbar";
import { PageHeader } from "@/components/shared/PageHeader";
import { BackButton } from "@/components/shared/BackButton";
import { getTenantUsersWithRoles, getRoles, updateUserRole, updateUserPassword } from "@/app/actions/settings";
import { Button } from "@/components/ui/button";
import { Users, Key, CheckCircle2, XCircle } from "lucide-react";
import { formatDate } from "@/lib/utils";

export default async function UsersSettingsPage() {
  const [users, roles] = await Promise.all([
    getTenantUsersWithRoles(),
    getRoles(),
  ]);

  return (
    <>
      <AppTopbar pageTitle="Brugerstyring" />
      <BackButton href="/settings" label="Indstillinger" />
      <PageHeader
        title="Brugerstyring"
        description={`${users.filter((u) => u.isActive).length} aktive brugere`}
      />

      <div className="max-w-3xl space-y-3">
        {users.map((u) => (
          <div key={u.id}
            className={`bg-card border rounded-xl p-4 ${u.isActive ? "border-border" : "border-border/50 opacity-60"}`}>
            <div className="flex items-start gap-4">
              {/* Avatar */}
              <div className="w-9 h-9 rounded-full bg-primary/10 flex items-center justify-center shrink-0 text-sm font-semibold text-primary">
                {u.name.split(" ").map((n: string) => n[0]).slice(0, 2).join("")}
              </div>

              {/* Info */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-0.5">
                  <p className="font-medium text-sm">{u.name}</p>
                  {u.isActive
                    ? <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 shrink-0" title="Aktiv" />
                    : <span className="w-1.5 h-1.5 rounded-full bg-muted-foreground/40 shrink-0" title="Inaktiv" />
                  }
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
                <button type="submit"
                  className="px-2.5 py-1.5 text-xs bg-secondary hover:bg-secondary/80 rounded-lg border border-border transition-colors">
                  Gem
                </button>
              </form>
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
                <button type="submit"
                  className="px-2.5 py-1.5 text-xs bg-secondary hover:bg-secondary/80 rounded-lg border border-border transition-colors shrink-0">
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
