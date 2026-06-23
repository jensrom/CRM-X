import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { AppTopbar } from "@/components/layout/AppTopbar";
import { AssistantPanel } from "@/components/assistant/AssistantPanel";
import { Sparkles } from "lucide-react";
import {
  listMyThreads,
  getThread,
} from "@/app/actions/assistant-threads";

export const dynamic = "force-dynamic";

/**
 * /assistant — Tenant-bruger AI-assistent med threads.
 *
 * Samme komponent som admin-portalen — alle threads er ejet af den indloggede bruger
 * og scoped til den tenant brugeren tilhører.
 */
export default async function TenantAssistantPage({
  searchParams,
}: {
  searchParams?: Promise<{ t?: string; new?: string }>;
}) {
  const session = await auth();
  if (!session?.user?.tenantId) redirect("/login");

  const sp = (await (searchParams ?? Promise.resolve({}))) as { t?: string; new?: string };

  const threads = await listMyThreads();

  let activeId: string | null = sp.t ?? null;
  const forceNew = sp.new === "1";
  if (!activeId && !forceNew && threads.length > 0) {
    activeId = threads[0].id;
  }

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
    <>
      <AppTopbar pageTitle="AI-assistent" />

      <div className="mb-5">
        <div className="flex items-center gap-2">
          <Sparkles className="h-5 w-5 text-primary" />
          <h1 className="text-xl font-semibold">AI-assistent</h1>
          <span className="text-[10px] uppercase tracking-wider px-2 py-0.5 rounded-full bg-primary/10 text-primary font-semibold">
            BETA
          </span>
        </div>
        <p className="text-sm text-muted-foreground mt-1">
          Skriv kommandoer eller spørgsmål — assistenten kan både svare på data og udføre handlinger for dig.
        </p>
      </div>

      <AssistantPanel
        initialThreads={threads as any}
        initialActiveThreadId={activeId}
        initialMessages={initialMessages}
      />

      {/* Eksempel-bibliotek — vises kun ved tom-state (ingen aktiv samtale)
          for at undgaa at stjaele plads under en koerende dialog. */}
      {!activeId && (
      <div className="mt-6 bg-card border border-border rounded-xl p-5">
        <h3 className="text-sm font-semibold mb-3">Eksempler på hvad jeg forstår</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
          <div>
            <p className="font-semibold text-muted-foreground uppercase tracking-wide mb-1.5">
              ⚡ Handlinger
            </p>
            <ul className="space-y-1 text-foreground/80">
              <li><code className="bg-secondary px-1 rounded">notér 2t arbejde på klippekort KB-0001 idag</code></li>
              <li><code className="bg-secondary px-1 rounded">flyt lead Pia til næste step</code></li>
              <li><code className="bg-secondary px-1 rounded">send tilbud Q-0001 til Aalborg Tagdækning</code></li>
              <li><code className="bg-secondary px-1 rounded">skift deal Hosting til vundet</code></li>
              <li><code className="bg-secondary px-1 rounded">luk T-0011 til løst</code></li>
            </ul>
          </div>
          <div>
            <p className="font-semibold text-muted-foreground uppercase tracking-wide mb-1.5">
              🧠 Intelligente opsummeringer
            </p>
            <ul className="space-y-1 text-foreground/80">
              <li><code className="bg-secondary px-1 rounded">hvad er status på mine 3 bedste leads</code></li>
              <li><code className="bg-secondary px-1 rounded">opsummer dagens status</code></li>
              <li><code className="bg-secondary px-1 rounded">kunder i risiko</code></li>
              <li><code className="bg-secondary px-1 rounded">hvad skal jeg lave denne uge</code></li>
            </ul>
          </div>
          <div>
            <p className="font-semibold text-muted-foreground uppercase tracking-wide mb-1.5">
              📊 Direkte opslag
            </p>
            <ul className="space-y-1 text-foreground/80">
              <li><code className="bg-secondary px-1 rounded">vis pipeline</code></li>
              <li><code className="bg-secondary px-1 rounded">vis åbne tickets</code></li>
              <li><code className="bg-secondary px-1 rounded">vis kunde Aalborg</code></li>
              <li><code className="bg-secondary px-1 rounded">hvad er status på T-0011</code></li>
              <li><code className="bg-secondary px-1 rounded">hjælp</code> — fuld liste</li>
            </ul>
          </div>
        </div>
      </div>
      )}
    </>
  );
}
