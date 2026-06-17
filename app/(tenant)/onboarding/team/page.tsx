import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { redirect } from "next/navigation";
import { Button } from "@/components/ui/button";
import { ProgressStrip } from "@/components/onboarding/ProgressStrip";
import { completeOnboarding } from "@/app/actions/onboarding";
import { Users, ArrowLeft, CheckCircle2, ExternalLink, Plus } from "lucide-react";
import Link from "next/link";

export default async function TeamStepPage() {
  const session = await auth();
  if (!session?.user?.tenantId) redirect("/login");

  const [userCount, tenant] = await Promise.all([
    db.user.count({ where: { tenantId: session.user.tenantId, isActive: true } }),
    db.tenant.findFirst({
      where: { id: session.user.tenantId },
      select: { maxUsers: true, plan: true },
    }),
  ]);

  const seatsLeft = (tenant?.maxUsers ?? 5) - userCount;

  return (
    <div>
      <ProgressStrip current="team" />

      <header className="mb-6">
        <div className="flex items-center gap-3 mb-2">
          <div className="w-10 h-10 rounded-xl bg-emerald-500/10 flex items-center justify-center">
            <Users className="h-5 w-5 text-emerald-600" />
          </div>
          <div>
            <h1 className="text-xl font-bold">Inviter dit team</h1>
            <p className="text-sm text-muted-foreground">
              Du kan altid invitere flere senere fra Indstillinger → Brugere.
            </p>
          </div>
        </div>
      </header>

      <div className="bg-card border border-border rounded-xl p-6 space-y-5">
        <div className="bg-secondary/30 rounded-lg p-4 flex items-start gap-3">
          <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
            <Users className="h-4 w-4 text-primary" />
          </div>
          <div className="flex-1">
            <p className="text-sm font-medium">
              {userCount} {userCount === 1 ? "bruger" : "brugere"} aktive
            </p>
            <p className="text-xs text-muted-foreground mt-0.5">
              Din pakke ({tenant?.plan ?? "small"}) tillader op til {tenant?.maxUsers ?? 5} brugere
              {seatsLeft > 0 && ` — du har ${seatsLeft} pladser tilbage`}
            </p>
          </div>
        </div>

        <div className="text-center py-6">
          <p className="text-sm font-medium mb-1">Vil du invitere kolleger nu?</p>
          <p className="text-xs text-muted-foreground mb-4 max-w-md mx-auto">
            Bruger-administration er på en separat side hvor du kan oprette flere brugere ad gangen
            med deres rolle og e-mail.
          </p>
          <Link href="/settings/users" target="_blank">
            <Button type="button" size="md" variant="outline">
              <Plus className="h-3.5 w-3.5" />
              Åbn brugere
              <ExternalLink className="h-3 w-3 ml-1" />
            </Button>
          </Link>
        </div>

        <p className="text-xs text-muted-foreground text-center pt-4 border-t border-border">
          Du kan altid komme tilbage til denne side. Klik <strong>Færdig</strong> for at springe ind i CRM-X.
        </p>
      </div>

      <div className="flex items-center justify-between mt-5">
        <Link href="/onboarding/branding">
          <Button type="button" size="sm" variant="ghost">
            <ArrowLeft className="h-3.5 w-3.5" />
            Tilbage
          </Button>
        </Link>
        <form action={completeOnboarding}>
          <Button type="submit" size="md" className="bg-emerald-600 hover:bg-emerald-700">
            <CheckCircle2 className="h-4 w-4" />
            Færdig — gå til dashboard
          </Button>
        </form>
      </div>
    </div>
  );
}
