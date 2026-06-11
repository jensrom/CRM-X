import { AppTopbar } from "@/components/layout/AppTopbar";
import { PageHeader } from "@/components/shared/PageHeader";
import { getRole, updateRole, deleteRole } from "@/app/actions/settings";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ArrowLeft, Trash2, Users } from "lucide-react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { PermissionMatrix } from "@/components/settings/PermissionMatrix";
import { BackButton } from "@/components/shared/BackButton";

export default async function EditRolePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const role = await getRole(id);
  if (!role) notFound();

  async function handleDelete() {
    "use server";
    await deleteRole(id);
  }

  const perms = role.permissions as Record<string, Record<string, boolean>>;

  return (
    <>
      <AppTopbar pageTitle={`Rolle: ${role.name}`} />

      <BackButton href="/settings/roles" label="Roller" />
      <div className="max-w-3xl">
        <PageHeader
          title={role.name}
          actions={
            <Link href="/settings/roles">
              <Button variant="ghost" size="sm"><ArrowLeft className="h-4 w-4" />Tilbage</Button>
            </Link>
          }
        />

        <form action={updateRole} className="space-y-5">
          <input type="hidden" name="id" value={role.id} />

          <div className="bg-card border border-border rounded-xl p-5 space-y-4">
            <h3 className="text-sm font-semibold">Rollenavn</h3>
            <div className="flex items-center gap-4">
              <div className="flex-1">
                <Input name="name" label="Navn" defaultValue={role.name} required disabled={role.isSystem} />
              </div>
              <div className="flex items-center gap-1.5 text-sm text-muted-foreground mt-5">
                <Users className="h-4 w-4" />
                {role.users.length} bruger{role.users.length !== 1 ? "e" : ""}
              </div>
            </div>
            {role.isSystem && (
              <p className="text-xs text-muted-foreground">Systemroller kan ikke omdøbes.</p>
            )}
          </div>

          <PermissionMatrix permissions={perms} />

          {/* Brugere med denne rolle */}
          {role.users.length > 0 && (
            <div className="bg-card border border-border rounded-xl p-4">
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-3">
                Brugere med denne rolle ({role.users.length})
              </p>
              <div className="flex flex-wrap gap-2">
                {role.users.map((u) => (
                  <span key={u.id} className="text-xs px-2.5 py-1 rounded-full bg-secondary text-foreground">
                    {u.name}
                  </span>
                ))}
              </div>
            </div>
          )}

          <div className="flex items-center justify-between pt-2">
            <Button type="submit" size="md">Gem ændringer</Button>
            {!role.isSystem && (
                              <Button type="submit" formAction={handleDelete} variant="ghost" size="sm"
                  className="text-destructive hover:text-destructive hover:bg-destructive/10">
                  <Trash2 className="h-3.5 w-3.5" />
                  Slet rolle
                </Button>
            )}
          </div>
        </form>
      </div>
    </>
  );
}
