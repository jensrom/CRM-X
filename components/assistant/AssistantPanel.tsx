"use client";

/**
 * AssistantPanel — chat-UI for AI-assistenten.
 *
 * To-faset interaktion:
 *   1. Bruger skriver → vi parser → viser preview af intent
 *   2. Bruger godkender → vi eksekverer action eller henter lookup
 *
 * Actions kræver eksplicit bekræftelse for at undgå utilsigtede ændringer.
 */

import { useState, useRef, useEffect, useTransition } from "react";
import { Send, Sparkles, Loader2, CheckCircle2, XCircle, Info, Wand2 } from "lucide-react";
import { askAssistant, type AssistantReply } from "@/app/actions/assistant";
import { parseAssistantInput, type AssistantIntent } from "@/lib/assistant";

interface Message {
  id: string;
  role: "user" | "assistant";
  text: string;
  intent?: AssistantIntent;
  pendingAction?: AssistantIntent;
  appliedChange?: string;
  variant?: "success" | "error" | "info" | "help";
}

const QUICK_COMMANDS = [
  "vis pipeline",
  "vis åbne tickets",
  "vis leads",
  "hjælp",
];

export function AssistantPanel() {
  const [messages, setMessages] = useState<Message[]>([
    {
      id: "welcome",
      role: "assistant",
      text:
        "Hej! Jeg er din CRM-X assistent. Spørg mig om data eller bed mig om at udføre ændringer.\n\n" +
        "Skriv \"hjælp\" for at se hvad jeg kan.",
      variant: "info",
    },
  ]);
  const [input, setInput] = useState("");
  const [isPending, startTransition] = useTransition();
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages]);

  const send = (text: string) => {
    if (!text.trim()) return;
    const userMsg: Message = {
      id: `u-${Date.now()}`,
      role: "user",
      text,
    };
    setMessages((prev) => [...prev, userMsg]);
    setInput("");

    // Parse lokalt først for preview-feedback
    const intent = parseAssistantInput(text);

    if (intent.type === "action") {
      // Vis pending action med Confirm-knap
      setMessages((prev) => [
        ...prev,
        {
          id: `a-${Date.now()}`,
          role: "assistant",
          text: intent.preview + "\n\nGodkend for at fortsætte.",
          pendingAction: intent,
          variant: "info",
        },
      ]);
      return;
    }

    // Lookup / text / help / error — kør direkte
    startTransition(async () => {
      try {
        const reply = await askAssistant(text);
        addReply(reply);
      } catch (e: any) {
        setMessages((prev) => [
          ...prev,
          {
            id: `e-${Date.now()}`,
            role: "assistant",
            text: e?.message ?? "Noget gik galt",
            variant: "error",
          },
        ]);
      }
    });
  };

  const confirmAction = (originalText: string, pendingId: string) => {
    startTransition(async () => {
      try {
        const reply = await askAssistant(originalText);
        // Fjern pending state
        setMessages((prev) => prev.filter((m) => m.id !== pendingId));
        addReply(reply);
      } catch (e: any) {
        setMessages((prev) => [
          ...prev,
          {
            id: `e-${Date.now()}`,
            role: "assistant",
            text: e?.message ?? "Eksekvering fejlede",
            variant: "error",
          },
        ]);
      }
    });
  };

  const addReply = (reply: AssistantReply) => {
    const intent = reply.intent;
    let text = "";
    let variant: Message["variant"] = "info";

    if (intent.type === "help") {
      text = intent.message;
      variant = "help";
    } else if (intent.type === "error") {
      text = intent.message;
      variant = "error";
    } else if (intent.type === "text") {
      text = intent.message;
      variant = "info";
    } else if (intent.type === "lookup") {
      text = intent.preview;
      variant = reply.ok ? "info" : "error";
    } else if (intent.type === "action") {
      text = intent.preview;
      variant = reply.ok ? "success" : "error";
    }

    setMessages((prev) => [
      ...prev,
      {
        id: `r-${Date.now()}`,
        role: "assistant",
        text,
        variant,
        appliedChange: reply.appliedChange,
      },
    ]);
  };

  const cancelAction = (id: string) => {
    setMessages((prev) => prev.filter((m) => m.id !== id));
    setMessages((prev) => [
      ...prev,
      {
        id: `c-${Date.now()}`,
        role: "assistant",
        text: "Annulleret. Ingen ændringer foretaget.",
        variant: "info",
      },
    ]);
  };

  return (
    <div className="bg-card border border-border rounded-xl flex flex-col h-[calc(100vh-12rem)] min-h-[500px]">
      {/* Header */}
      <div className="px-5 py-4 border-b border-border flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-lg bg-primary/10 text-primary flex items-center justify-center">
            <Sparkles className="h-4 w-4" />
          </div>
          <div>
            <h2 className="text-sm font-semibold">CRM-X Assistent</h2>
            <p className="text-xs text-muted-foreground">
              Spørg om data · udfør actions · få hurtige opslag
            </p>
          </div>
        </div>
        <span className="text-[10px] uppercase tracking-wider px-2 py-0.5 rounded-full bg-primary/10 text-primary font-semibold">
          BETA
        </span>
      </div>

      {/* Messages */}
      <div ref={scrollRef} className="flex-1 overflow-y-auto p-5 space-y-3">
        {messages.map((m) => (
          <MessageBubble
            key={m.id}
            message={m}
            isPending={isPending}
            onConfirm={() => {
              const originalText = messages.find(
                (x, i) => x.role === "user" && messages[i + 1]?.id === m.id,
              )?.text;
              if (originalText) confirmAction(originalText, m.id);
            }}
            onCancel={() => cancelAction(m.id)}
          />
        ))}
        {isPending && (
          <div className="flex items-center gap-2 text-xs text-muted-foreground pl-11">
            <Loader2 className="h-3 w-3 animate-spin" />
            Arbejder...
          </div>
        )}
      </div>

      {/* Quick commands */}
      <div className="px-5 py-2 border-t border-border bg-secondary/20">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-[10px] text-muted-foreground uppercase tracking-wider">
            Hurtige kommandoer:
          </span>
          {QUICK_COMMANDS.map((c) => (
            <button
              key={c}
              type="button"
              onClick={() => send(c)}
              disabled={isPending}
              className="text-xs px-2 py-1 rounded-md bg-card border border-border hover:border-primary/40 hover:text-primary transition-colors"
            >
              {c}
            </button>
          ))}
        </div>
      </div>

      {/* Input */}
      <form
        onSubmit={(e) => {
          e.preventDefault();
          send(input);
        }}
        className="p-4 border-t border-border flex gap-2"
      >
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder='fx "skift lead Pia til kvalificeret" eller "vis pipeline"'
          disabled={isPending}
          className="flex-1 px-3 py-2 border border-border rounded-lg bg-card text-sm focus:outline-none focus:ring-2 focus:ring-ring disabled:opacity-50"
        />
        <button
          type="submit"
          disabled={isPending || !input.trim()}
          className="px-4 py-2 bg-primary text-primary-foreground rounded-lg text-sm font-medium hover:bg-primary/90 disabled:opacity-50 inline-flex items-center gap-2"
        >
          <Send className="h-3.5 w-3.5" />
          Send
        </button>
      </form>
    </div>
  );
}

function MessageBubble({
  message,
  isPending,
  onConfirm,
  onCancel,
}: {
  message: Message;
  isPending: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}) {
  const isUser = message.role === "user";
  const variantColors = {
    success: "bg-emerald-50 dark:bg-emerald-950/30 border-emerald-300 dark:border-emerald-800 text-emerald-900 dark:text-emerald-200",
    error: "bg-rose-50 dark:bg-rose-950/30 border-rose-300 dark:border-rose-800 text-rose-900 dark:text-rose-200",
    info: "bg-card border-border text-foreground",
    help: "bg-blue-50 dark:bg-blue-950/30 border-blue-300 dark:border-blue-800 text-blue-900 dark:text-blue-200",
  };
  const v = message.variant ?? "info";
  const Icon =
    v === "success" ? CheckCircle2 : v === "error" ? XCircle : v === "help" ? Wand2 : Info;

  if (isUser) {
    return (
      <div className="flex justify-end">
        <div className="max-w-[80%] bg-primary text-primary-foreground rounded-2xl rounded-tr-md px-4 py-2 text-sm">
          {message.text}
        </div>
      </div>
    );
  }

  return (
    <div className="flex gap-2.5">
      <div className="w-8 h-8 rounded-full bg-primary/10 text-primary flex items-center justify-center shrink-0">
        <Sparkles className="h-3.5 w-3.5" />
      </div>
      <div className="flex-1 min-w-0">
        <div
          className={`rounded-2xl rounded-tl-md border px-4 py-3 text-sm whitespace-pre-wrap ${variantColors[v]}`}
        >
          <div className="flex items-start gap-2">
            <Icon className="h-3.5 w-3.5 shrink-0 mt-0.5 opacity-70" />
            <span className="flex-1 break-words">{message.text}</span>
          </div>
          {message.pendingAction && (
            <div className="mt-3 pt-3 border-t border-current/20 flex gap-2">
              <button
                type="button"
                onClick={onConfirm}
                disabled={isPending}
                className="flex-1 px-3 py-1.5 bg-primary text-primary-foreground rounded-md text-xs font-medium hover:bg-primary/90 disabled:opacity-50"
              >
                Godkend og udfør
              </button>
              <button
                type="button"
                onClick={onCancel}
                disabled={isPending}
                className="px-3 py-1.5 bg-secondary text-foreground rounded-md text-xs font-medium hover:bg-secondary/80 disabled:opacity-50"
              >
                Annullér
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
