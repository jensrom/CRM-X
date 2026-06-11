import { AppTopbar } from "@/components/layout/AppTopbar";
import { PageHeader } from "@/components/shared/PageHeader";
import { BackButton } from "@/components/shared/BackButton";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { KeyRound, ShieldCheck, ShieldOff } from "lucide-react";
import { MfaSetupFlow } from "@/components/compliance/MfaSetupFlow";
import { MfaDisableForm } from "@/components/compliance/MfaDisableForm";

export const metadata = { title: "To-faktor-godkendelse — CRM-X" };

export default async function MfaPage() {
  const session = await auth();
  if (!session?.user?.id) return null;

  const user = await db.user.findUnique({
    where: { id: session.user.id },
    select: { mfaEnabled: true, mfaEnrolledAt: true, email: true } as any,
  });

  const isEnabled = (user as any)?.mfaEnabled === true;
  const enrolledAt = (user as any)?.mfaEnrolledAt as Date | null | undefined;

  return (
    <>
      <AppTopbar pageTitle="To-faktor-godkendelse" />
      <BackButton href="/settings" label="Indstillinger" />
      <PageHeader
        title="To-faktor-godkendelse"
        description="Tilføj et ekstra sikkerhedslag til din konto med en authenticator-app"
      />

      <div className="max-w-2xl space-y-5">
        {/* Status-kort */}
        <div className="bg-card border border-border rounded-xl p-5">
          <div className="flex items-start gap-4">
            <div
              className={`w-11 h-11 rounded-xl flex items-center justify-center shrink-0 ${
                isEnabled ? "bg-emerald-500/10" : "bg-secondary"
              }`}
            >
              {isEnabled ? (
                <ShieldCheck className="h-5 w-5 text-emerald-600" />
              ) : (
                <ShieldOff className="h-5 w-5 text-muted-foreground" />
              )}
            </div>
            <div className="flex-1">
              <p className="font-semibold text-sm">
                {isEnabled ? "MFA er aktiveret" : "MFA er ikke aktiveret"}
              </p>
              <p className="text-xs text-muted-foreground mt-0.5">
                {isEnabled
                  ? `Aktiveret ${
                      enrolledAt
                        ? new Intl.DateTimeFormat("da-DK", { dateStyle: "medium" }).format(enrolledAt)
                        : "—"
                    }. Du skal bruge din authenticator-app ved næste login.`
                  : "Anbefales for alle konti med adgang til kundedata. Brug Google Authenticator, 1Password, Authy eller lignende."}
              </p>
            </div>
          </div>
        </div>

        {/* Flow */}
        {isEnabled ? <MfaDisableForm /> : <MfaSetupFlow />}

        {/* Info-tekst */}
        <div className="bg-secondary/40 border border-border rounded-xl p-4 text-xs text-muted-foreground leading-relaxed">
          <div className="flex items-center gap-1.5 mb-2 text-foreground font-medium">
            <KeyRound className="h-3.5 w-3.5" />
            Hvorfor MFA?
          </div>
          To-faktor-godkendelse beskytter din konto selv hvis nogen får adgang til din adgangskode.
          MFA er et krav i ISO 27001 A.8.5 og SOC 2 CC6.1 for systemer der håndterer kundedata.
          Hvis du mister din enhed, kan du bruge en af de 10 recovery-koder du fik ved opsætning.
        </div>
      </div>
    </>
  );
}
