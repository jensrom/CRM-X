import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { AppTopbar } from "@/components/layout/AppTopbar";
import { BackButton } from "@/components/shared/BackButton";
import { PageHeader } from "@/components/shared/PageHeader";
import { listSlaPolicies, upsertSlaPolicy } from "@/app/actions/sla";
import { Clock, ShieldCheck } from "lucide-react";

export const dynamic = "force-dynamic";

const PRIORITY_LABELS: Record<string, string> = {
  critical: "Kritisk",
  high: "Høj",
  normal: "Normal",
  low: "Lav",
};

const PRIORITY_COLORS: Record<string, string> = {
  critical: "bg-rose-100 text-rose-700 dark:bg-rose-900/30 dark:text-rose-300",
  high:     "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300",
  normal:   "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300",
  low:      "bg-secondary text-muted-foreground",
};

function minutesToHumanInput(min: number): string {
  if (min < 60) return `${min}m`;
  if (min < 1440) return `${(min / 60).toFixed(1).replace(".0", "")}t`;
  return `${(min / 1440).toFixed(1).replace(".0", "")}d`;
}

export default async function SlaSettingsPage() {
  const session = await auth();
  if (!session?.user?.tenantId) redirect("/login");

  const policies = await listSlaPolicies();
  // Sort fra critical -> low
  const order = ["critical", "high", "normal", "low"];
  policies.sort((a, b) => order.indexOf(a.priority) - order.indexOf(b.priority));

  return (
    <>
      <AppTopbar pageTitle="SLA-politik" />
      <BackButton href="/settings" label="Indstillinger" />
      <PageHeader
        title="SLA-politik"
        description="Definer responstid og løsningstid pr. ticket-prioritet. Defaults er sat — tilpas til dine kunde-kontrakter."
      />

      <div className="space-y-3 max-w-3xl">
        {policies.map((p) => (
          <form
            key={p.id}
            action={upsertSlaPolicy}
            className="bg-card border border-border rounded-xl p-5"
          >
            <input type="hidden" name="priority" value={p.priority} />

            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-3">
                <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium ${PRIORITY_COLORS[p.priority]}`}>
                  {PRIORITY_LABELS[p.priority] ?? p.priority}
                </span>
                <span className="text-sm text-muted-foreground">
                  Nuværende: {minutesToHumanInput(p.responseTimeMin)} svar · {minutesToHumanInput(p.resolveTimeMin)} løsning
                </span>
              </div>
              <label className="flex items-center gap-2 text-xs">
                <input
                  type="checkbox"
                  name="isActive"
                  defaultChecked={p.isActive}
                  className="rounded"
                />
                Aktiv
              </label>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              <div>
                <label className="text-xs font-medium text-muted-foreground mb-1 block">
                  Responstid (minutter)
                </label>
                <input
                  type="number"
                  name="responseTimeMin"
                  defaultValue={p.responseTimeMin}
                  min="1"
                  required
                  className="w-full px-2 py-1.5 border border-border rounded-md bg-card text-sm tabular-nums"
                />
              </div>
              <div>
                <label className="text-xs font-medium text-muted-foreground mb-1 block">
                  Løsningstid (minutter)
                </label>
                <input
                  type="number"
                  name="resolveTimeMin"
                  defaultValue={p.resolveTimeMin}
                  min="1"
                  required
                  className="w-full px-2 py-1.5 border border-border rounded-md bg-card text-sm tabular-nums"
                />
              </div>
              <div>
                <label className="text-xs font-medium text-muted-foreground mb-1 block">
                  Advarsel ved %
                </label>
                <input
                  type="number"
                  name="warningPct"
                  defaultValue={p.warningPct}
                  min="0"
                  max="100"
                  required
                  className="w-full px-2 py-1.5 border border-border rounded-md bg-card text-sm tabular-nums"
                />
              </div>
            </div>

            <div className="flex justify-end mt-4">
              <button
                type="submit"
                className="px-3 py-1.5 bg-primary text-primary-foreground rounded-md text-sm font-medium hover:bg-primary/90"
              >
                Gem
              </button>
            </div>
          </form>
        ))}
      </div>

      <div className="mt-6 max-w-3xl">
        <div className="bg-blue-50 dark:bg-blue-950/20 border border-blue-200 dark:border-blue-800 rounded-xl p-4">
          <div className="flex items-start gap-2">
            <Clock className="h-4 w-4 text-blue-600 shrink-0 mt-0.5" />
            <div className="text-xs text-blue-900 dark:text-blue-200">
              <p className="font-semibold mb-1">Hvordan virker det?</p>
              <p>
                Når en ticket oprettes, beregnes <strong>response-deadline</strong> ud fra dens priority + responstid.
                Når en agent skriver første komment registreres <code>firstResponseAt</code> og response-SLA låses.
                <strong> Løsningstiden</strong> tæller indtil ticketens status sættes til "resolved".
                Vi advarer ved {policies[0]?.warningPct ?? 80}% af tiden gået, og markerer som "Brudt" ved overskridelse.
              </p>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
