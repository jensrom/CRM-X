import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { AssistantPanel } from "@/components/assistant/AssistantPanel";
import { Sparkles, AlertTriangle } from "lucide-react";

export const dynamic = "force-dynamic";

/**
 * /admin/assistant — Super-admin AI-assistent.
 *
 * Bemærk: Assistenten er tenant-scoped — den arbejder kun mod den tenant
 * super-adminen aktuelt er impersoneret som. Hvis ingen impersonation aktiv,
 * vises en advarsel.
 */
export default async function AdminAssistantPage() {
  const session = await auth();
  if (session?.user?.role !== "super_admin") redirect("/login");

  const hasTenantContext = !!session.user.tenantId;

  return (
    <div className="space-y-6">
      <div className="flex items-end justify-between">
        <div>
          <div className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-primary" />
            <h1 className="text-xl font-semibold">AI-assistent</h1>
            <span className="text-[10px] uppercase tracking-wider px-2 py-0.5 rounded-full bg-primary/10 text-primary font-semibold">
              BETA
            </span>
          </div>
          <p className="text-sm text-muted-foreground mt-1">
            Chat-baseret hjælper der kan svare på data-spørgsmål og udføre actions.
          </p>
        </div>
      </div>

      {!hasTenantContext && (
        <div className="bg-amber-50 dark:bg-amber-950/30 border border-amber-300 dark:border-amber-800 rounded-xl p-4 flex items-start gap-3">
          <AlertTriangle className="h-4 w-4 text-amber-700 dark:text-amber-300 shrink-0 mt-0.5" />
          <div className="text-sm text-amber-900 dark:text-amber-200">
            <p className="font-semibold">Ingen tenant-kontekst aktiv</p>
            <p className="text-xs mt-1">
              For at bruge assistenten skal du først starte en impersonation-session på en kunde.
              Gå til <strong>Alle kunder</strong>, vælg en kunde, og tryk "Log ind som tenant-admin".
            </p>
          </div>
        </div>
      )}

      <AssistantPanel />

      {/* Eksempel-bibliotek */}
      <div className="bg-card border border-border rounded-xl p-5">
        <h3 className="text-sm font-semibold mb-3">Eksempler på hvad jeg forstår</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
          <div>
            <p className="font-semibold text-muted-foreground uppercase tracking-wide mb-1.5">
              📊 Opslag
            </p>
            <ul className="space-y-1 text-foreground/80">
              <li><code className="bg-secondary px-1 rounded">vis pipeline</code></li>
              <li><code className="bg-secondary px-1 rounded">vis åbne tickets</code></li>
              <li><code className="bg-secondary px-1 rounded">vis leads</code></li>
              <li><code className="bg-secondary px-1 rounded">vis lead Pia</code></li>
              <li><code className="bg-secondary px-1 rounded">vis kunde Aalborg</code></li>
              <li><code className="bg-secondary px-1 rounded">status på T-0011</code></li>
            </ul>
          </div>
          <div>
            <p className="font-semibold text-muted-foreground uppercase tracking-wide mb-1.5">
              ⚡ Actions (kræver godkendelse)
            </p>
            <ul className="space-y-1 text-foreground/80">
              <li><code className="bg-secondary px-1 rounded">skift lead Pia til kvalificeret</code></li>
              <li><code className="bg-secondary px-1 rounded">skift deal Hosting-flytning til vundet</code></li>
              <li><code className="bg-secondary px-1 rounded">luk T-0011 til løst</code></li>
              <li><code className="bg-secondary px-1 rounded">genberegn health for Skagen Beauty</code></li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}
