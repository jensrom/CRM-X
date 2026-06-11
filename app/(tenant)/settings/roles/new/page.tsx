import { AppTopbar } from "@/components/layout/AppTopbar";
import { PageHeader } from "@/components/shared/PageHeader";
import { createRole } from "@/app/actions/settings";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ArrowLeft } from "lucide-react";
import Link from "next/link";
import { PermissionMatrix } from "@/components/settings/PermissionMatrix";
import { BackButton } from "@/components/shared/BackButton";

export default function NewRolePage() {
  return (
    <>
      <AppTopbar pageTitle="Ny rolle" />

      <BackButton href="/settings/roles" label="Roller" />
      <div className="max-w-3xl">
        <PageHeader
          title="Ny rolle"
          actions={
            <Link href="/settings/roles">
              <Button variant="ghost" size="sm"><ArrowLeft className="h-4 w-4" />Tilbage</Button>
            </Link>
          }
        />

        <form action={createRole} className="space-y-5">
          <div className="bg-card border border-border rounded-xl p-5 space-y-4">
            <h3 className="text-sm font-semibold">Rollenavn</h3>
            <Input name="name" label="Navn" required placeholder="f.eks. Salgsmedarbejder" autoFocus />
          </div>

          <PermissionMatrix permissions={{}} />

          <div className="flex items-center gap-3">
            <Button type="submit" size="lg">Opret rolle</Button>
            <Link href="/settings/roles">
              <Button type="button" variant="ghost" size="lg">Annuller</Button>
            </Link>
          </div>
        </form>
      </div>
    </>
  );
}
