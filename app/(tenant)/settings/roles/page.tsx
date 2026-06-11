import { AppTopbar } from "@/components/layout/AppTopbar";
import { PageHeader } from "@/components/shared/PageHeader";
import { BackButton } from "@/components/shared/BackButton";
import { getRoles } from "@/app/actions/settings";
import { Button } from "@/components/ui/button";
import { Shield, Plus, Users, Lock, Pencil } from "lucide-react";
import Link from "next/link";

const MODULE_LABELS: Record<string, string> = {
  sales: "Salg", marketing: "Marketing", support: "Support",
  projects: "Projekter", products: "Produkter", licenses: "Licenser",
};

export default async function RolesPage() {
  const roles = await getRoles();

  return (
    <>
      <AppTopbar pageTitle="Roller og rettigheder" />
      <BackButton href="/settings" label="Indstillinger" />
      <PageHeader
        title="Roller og rettigheder"
        description={`${roles.length} roller defineret`}
        actions={
          <Link href="/settings/roles/new">
            <Button size="md"><Plus className="h-4 w-4" />Ny rolle</Button>
          </Link>
        }
      />

      <div className="space-y-3 max-w-3xl">
        {roles.map((role) => {
          const perms = role.permissions as Record<string, Record<string, boolean>>;
          const activeModules = Object.entries(perms)
            .filter(([, p]) => p?.view)
            .map(([mod]) => mod);

          return (
            <Link
              key={role.id}
              href={`/settings/roles/${role.id}`}
              className="flex items-center justify-between p-4 bg-card border border-border rounded-xl hover:border-primary/40 hover:shadow-sm transition-all group"
            >
              <div className="flex items-center gap-3">
                <div className={`w-9 h-9 rounded-lg flex items-center justify-center ${role.isSystem ? "bg-primary/10" : "bg-secondary"}`}>
                  {role.isSystem
                    ? <Lock className="h-4 w-4 text-primary" />
                    : <Shield className="h-4 w-4 text-muted-foreground" />
                  }
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <p className="text-sm font-semibold group-hover:text-primary transition-colors">{role.name}</p>
                    {role.isSystem && (
                      <span className="text-[10px] px-1.5 py-0.5 rounded bg-primary/10 text-primary font-medium">System</span>
                    )}
                  </div>
                  <div className="flex flex-wrap gap-1 mt-1">
                    {activeModules.map((mod) => (
                      <span key={mod} className="text-[10px] px-1.5 py-0.5 rounded bg-secondary text-muted-foreground">
                        {MODULE_LABELS[mod] ?? mod}
                      </span>
                    ))}
                    {activeModules.length === 0 && (
                      <span className="text-[10px] text-muted-foreground">Ingen adgang</span>
                    )}
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-4 shrink-0">
                <div className="flex items-center gap-1 text-xs text-muted-foreground">
                  <Users className="h-3.5 w-3.5" />
                  {role._count.users}
                </div>
                <Pencil className="h-3.5 w-3.5 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
              </div>
            </Link>
          );
        })}

        {roles.length === 0 && (
          <div className="text-center py-10 text-muted-foreground">
            <Shield className="h-8 w-8 mx-auto mb-3 opacity-30" />
            <p className="text-sm">Ingen roller defineret endnu</p>
          </div>
        )}
      </div>
    </>
  );
}
