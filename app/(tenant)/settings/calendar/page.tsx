import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { redirect } from "next/navigation";
import { AppTopbar } from "@/components/layout/AppTopbar";
import { BackButton } from "@/components/shared/BackButton";
import { PageHeader } from "@/components/shared/PageHeader";
import {
  regenerateCalendarToken,
  revokeCalendarToken,
} from "@/app/actions/settings";
import { CalendarFeedManager } from "@/components/settings/CalendarFeedManager";
import { Calendar, ShieldCheck } from "lucide-react";

export const dynamic = "force-dynamic";

export default async function CalendarSettingsPage() {
  const session = await auth();
  if (!session?.user?.tenantId) redirect("/login");

  const user = await db.user.findUnique({
    where: { id: session.user.id! },
    select: { calendarToken: true, calendarTokenIssuedAt: true } as any,
  });

  const token = (user as any)?.calendarToken as string | null | undefined;
  const issuedAt = (user as any)?.calendarTokenIssuedAt as Date | null | undefined;

  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || "https://crm-x.app";
  const feedUrl = token ? `${baseUrl}/api/calendar/${token}.ics` : null;
  // webcal:// gør at klient-OS spørger om at abonnere automatisk
  const webcalUrl = feedUrl?.replace(/^https?:\/\//, "webcal://");

  return (
    <>
      <AppTopbar pageTitle="Kalender-feed" />
      <BackButton href="/settings" label="Indstillinger" />
      <PageHeader
        title="Personlig kalender-feed"
        description="Abonnér på dine CRM-X deadlines i Google Calendar, Outlook eller Apple Calendar"
      />

      <div className="space-y-6 max-w-3xl">
        {/* Info-banner */}
        <div className="bg-card border border-border rounded-xl p-5">
          <div className="flex items-start gap-3">
            <div className="h-9 w-9 rounded-md bg-primary/10 text-primary flex items-center justify-center shrink-0">
              <Calendar className="h-4 w-4" />
            </div>
            <div>
              <h3 className="text-sm font-semibold mb-2">Hvad er med i feedet?</h3>
              <ul className="text-sm text-muted-foreground space-y-1 list-disc list-inside">
                <li>🎫 Åbne tickets tildelt dig — påmindelse 7 dage efter sidste opdatering</li>
                <li>📁 Aktive projekter — på deadline-datoen</li>
                <li>💰 Ubetalte fakturaer — på forfaldsdato</li>
                <li>✂️ Klippekort under 20% — påmindelse om fornyelse</li>
              </ul>
            </div>
          </div>
        </div>

        {/* Token-management (client) */}
        <CalendarFeedManager
          feedUrl={feedUrl}
          webcalUrl={webcalUrl ?? null}
          issuedAt={issuedAt ?? null}
          onGenerate={regenerateCalendarToken}
          onRevoke={revokeCalendarToken}
        />

        {/* Security note */}
        <div className="bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-800 rounded-xl p-4">
          <div className="flex items-start gap-2">
            <ShieldCheck className="h-4 w-4 text-amber-700 dark:text-amber-300 shrink-0 mt-0.5" />
            <div className="text-xs text-amber-900 dark:text-amber-200">
              <p className="font-semibold mb-1">Hold URLen privat</p>
              <p>
                Alle der har URLen kan se dine deadlines.
                Hvis du har delt den ved en fejl — tryk <strong>Reset</strong>
                for at lukke den gamle URL og generere en ny.
              </p>
            </div>
          </div>
        </div>

        {/* Instruktioner */}
        <div className="bg-card border border-border rounded-xl p-5">
          <h3 className="text-sm font-semibold mb-3">Sådan abonnerer du</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
            <InstructionCard
              title="Google Calendar"
              steps={[
                "Åbn calendar.google.com",
                "Klik + ved 'Andre kalendere'",
                "Vælg 'Fra URL'",
                "Indsæt feed-URLen",
              ]}
            />
            <InstructionCard
              title="Outlook"
              steps={[
                "File → Account Settings",
                "Klik 'Internet Calendars' fanen",
                "Klik 'New' og indsæt URLen",
              ]}
            />
            <InstructionCard
              title="Apple Calendar"
              steps={[
                "Tryk webcal-knappen ovenfor",
                "Eller File → New Calendar Subscription",
                "Indsæt URL og vælg refresh-interval",
              ]}
            />
          </div>
        </div>
      </div>
    </>
  );
}

function InstructionCard({ title, steps }: { title: string; steps: string[] }) {
  return (
    <div className="border border-border rounded-lg p-3">
      <h4 className="text-xs font-semibold text-foreground mb-2">{title}</h4>
      <ol className="text-xs text-muted-foreground space-y-1 list-decimal list-inside">
        {steps.map((s) => <li key={s}>{s}</li>)}
      </ol>
    </div>
  );
}
