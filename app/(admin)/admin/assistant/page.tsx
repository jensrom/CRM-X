import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { AssistantPanel } from "@/components/assistant/AssistantPanel";
import { Sparkles, AlertTriangle } from "lucide-react";
import {
  listMyThreads,
  getThread,
} from "@/app/actions/assistant-threads";

export const dynamic = "force-dynamic";

/**
 * /admin/assistant — Super-admin AI-assistent med threads.
 *
 * URL-param `?t=<threadId>` aabner en specifik tråd.
 */
export default async function AdminAssistantPage({
  searchParams,
}: {
  searchParams?: Promise<{ t?: string; new?: string }>;
}) {
  const session = await auth();
  if (session?.user?.role !== "super_admin") redirect("/login");

  const sp = (await (searchParams ?? Promise.resolve({}))) as { t?: string; new?: string };
  const hasTenantContext = !!session.user.tenantId;

  const threads = await listMyThreads();

  // Bestem aktiv tråd:
  //   ?t=<id>  → load specifik tråd
  //   ?new=1   → tom state (brugeren startede "Ny samtale")
  //   ingen    → auto-vælg seneste tråd (smart default)
  let activeId: string | null = sp.t ?? null;
  const forceNew = sp.new === "1";
  if (!activeId && !forceNew && threads.length > 0) {
    activeId = threads[0].id;
  }

  // Load messages for aktiv tråd
  let initialMessages: any[] = [];
  if (activeId) {
    const thread = await getThread(activeId);
    if (thread) {
      initialMessages = thread.messages.map((m) => ({
        id: m.id,
        role: m.role as "user" | "assistant",
        text: m.text,
        variant: m.variant ?? "info",
        createdAt: m.createdAt,
      }));
    } else {
      activeId = null;
    }
  }

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
            Alle samtaler gemmes — du kan vende tilbage senere.
          </p>
        </div>
      </div>

      {!hasTenantContext && (
        <div className="bg-amber-50 dark:bg-amber-950/30 border border-amber-300 dark:border-amber-800 rounded-xl p-4 flex items-start gap-3">
          <AlertTriangle className="h-4 w-4 text-amber-700 dark:text-amber-300 shrink-0 mt-0.5" />
          <div className="text-sm text-amber-900 dark:text-amber-200">
            <p className="font-semibold">Ingen tenant-kontekst aktiv</p>
            <p className="text-xs mt-1">
              For at assistenten kan udføre actions og hente data, skal du først starte en impersonation-session på en kunde.
              Gå til <strong>Alle kunder</strong>, vælg en kunde, og tryk "Log ind som tenant-admin".
            </p>
          </div>
        </div>
      )}

      <AssistantPanel
        initialThreads={threads as any}
        initialActiveThreadId={activeId}
        initialMessages={initialMessages}
      />
    </div>
  );
}
