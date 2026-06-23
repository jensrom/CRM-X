"use client";

/**
 * AssistantPanel — chat-UI med thread-sidebar.
 *
 * Layout: 3-kolonne split
 *   [Threads-sidebar (250px)] [Chat-historik + input (resten)]
 *
 * Threads persisterer i DB via assistant-threads-actions.
 * Skift tråd → load history. Skriv → opret eller append.
 */

import {
  useState,
  useRef,
  useEffect,
  useTransition,
  type FormEvent,
} from "react";
import {
  Send,
  Sparkles,
  Loader2,
  CheckCircle2,
  XCircle,
  Info,
  Wand2,
  MessageSquare,
  Plus,
  Trash2,
  Pin,
  PinOff,
  Pencil,
  Check,
  X,
} from "lucide-react";
import {
  sendThreadMessage,
  renameThread,
  setThreadPinned,
  deleteThread,
  confirmThreadAction,
  cancelThreadAction,
} from "@/app/actions/assistant-threads";

interface ThreadSummary {
  id: string;
  title: string;
  pinned: boolean;
  updatedAt: Date | string;
  _count: { messages: number };
}

interface Message {
  id: string;
  role: "user" | "assistant";
  text: string;
  variant?: "success" | "error" | "info" | "help" | string;
  createdAt: Date | string;
}

interface Props {
  initialThreads: ThreadSummary[];
  initialActiveThreadId: string | null;
  initialMessages: Message[];
}

const QUICK_COMMANDS = [
  "vis pipeline",
  "vis åbne tickets",
  "vis leads",
  "opsummer dagens status",
  "hvad er status på mine 3 bedste leads",
  "hjælp",
];

const WELCOME: Message = {
  id: "welcome",
  role: "assistant",
  text:
    "Hej! Skriv en kommando eller spørgsmål for at starte en ny samtale.\n\n" +
    "Eksempler: \"vis pipeline\", \"skift lead Pia til kvalificeret\", \"hjælp\"",
  variant: "info",
  createdAt: new Date(),
};

export function AssistantPanel({
  initialThreads,
  initialActiveThreadId,
  initialMessages,
}: Props) {
  const [threads, setThreads] = useState<ThreadSummary[]>(initialThreads);
  const [activeId, setActiveId] = useState<string | null>(initialActiveThreadId);
  const [messages, setMessages] = useState<Message[]>(
    initialMessages.length > 0 ? initialMessages : [WELCOME],
  );
  const [input, setInput] = useState("");
  const [isPending, startTransition] = useTransition();
  const [renamingId, setRenamingId] = useState<string | null>(null);
  const [renameValue, setRenameValue] = useState("");
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    scrollRef.current?.scrollTo({
      top: scrollRef.current.scrollHeight,
      behavior: "smooth",
    });
  }, [messages]);

  const switchThread = (threadId: string | null) => {
    if (threadId === activeId) return;
    // Naviger via URL — server-component genrenderer med korrekt history
    const url = threadId
      ? `${window.location.pathname}?t=${threadId}`
      : window.location.pathname;
    window.location.href = url;
  };

  // "Ny samtale" — server-page skal eksplicit ikke auto-vælge seneste tråd
  const newThread = () => {
    window.location.href = `${window.location.pathname}?new=1`;
  };

  const send = (text: string) => {
    const trimmed = text.trim();
    if (!trimmed) return;
    setInput("");

    // Optimistic: vis bruger-besked straks
    const optimisticUserId = `tmp-u-${Date.now()}`;
    setMessages((prev) =>
      [
        ...prev.filter((m) => m.id !== "welcome"),
        {
          id: optimisticUserId,
          role: "user",
          text: trimmed,
          createdAt: new Date(),
        },
      ],
    );

    startTransition(async () => {
      try {
        const reply = await sendThreadMessage({
          threadId: activeId,
          text: trimmed,
        });
        // Erstat optimistic + tilføj assistant-svar
        setMessages((prev) => {
          const withoutOptimistic = prev.filter((m) => m.id !== optimisticUserId);
          return [
            ...withoutOptimistic,
            {
              id: reply.userMessage.id,
              role: "user",
              text: reply.userMessage.text,
              createdAt: reply.userMessage.createdAt,
            },
            {
              id: reply.assistantMessage.id,
              role: "assistant",
              text: reply.assistantMessage.text,
              variant: reply.assistantMessage.variant,
              createdAt: reply.assistantMessage.createdAt,
            },
          ];
        });
        // Hvis ny thread — opdater URL silent
        if (!activeId && reply.threadId) {
          setActiveId(reply.threadId);
          const url = `${window.location.pathname}?t=${reply.threadId}`;
          window.history.replaceState({}, "", url);
          // Tilføj thread til sidebar uden full reload
          setThreads((prev) => [
            {
              id: reply.threadId,
              title: trimmed.length > 50 ? trimmed.slice(0, 47) + "..." : trimmed,
              pinned: false,
              updatedAt: new Date(),
              _count: { messages: 2 },
            },
            ...prev,
          ]);
        } else {
          // Opdater eksisterende thread's updatedAt
          setThreads((prev) =>
            prev
              .map((t) =>
                t.id === reply.threadId
                  ? { ...t, updatedAt: new Date(), _count: { messages: t._count.messages + 2 } }
                  : t,
              )
              .sort((a, b) => {
                if (a.pinned !== b.pinned) return a.pinned ? -1 : 1;
                return new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime();
              }),
          );
        }
      } catch (e: any) {
        setMessages((prev) => [
          ...prev.filter((m) => m.id !== optimisticUserId),
          {
            id: `tmp-e-${Date.now()}`,
            role: "assistant",
            text: e?.message ?? "Noget gik galt",
            variant: "error",
            createdAt: new Date(),
          },
        ]);
      }
    });
  };

  const togglePin = (threadId: string, pinned: boolean) => {
    setThreads((prev) =>
      prev
        .map((t) => (t.id === threadId ? { ...t, pinned } : t))
        .sort((a, b) => {
          if (a.pinned !== b.pinned) return a.pinned ? -1 : 1;
          return new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime();
        }),
    );
    startTransition(() => setThreadPinned(threadId, pinned));
  };

  const submitRename = (threadId: string) => {
    const newTitle = renameValue.trim();
    if (!newTitle) return;
    setThreads((prev) => prev.map((t) => (t.id === threadId ? { ...t, title: newTitle } : t)));
    setRenamingId(null);
    startTransition(() => renameThread(threadId, newTitle));
  };

  // Bekraeft pending destruktiv action
  const handleConfirm = (messageId: string) => {
    // Marker visuelt at vi venter
    setMessages((prev) =>
      prev.map((m) => (m.id === messageId ? { ...m, variant: "confirmed" } : m)),
    );
    startTransition(async () => {
      try {
        const res = await confirmThreadAction(messageId);
        setMessages((prev) => [
          ...prev,
          {
            id: res.resultMessage.id,
            role: "assistant",
            text: res.resultMessage.text,
            variant: res.resultMessage.variant,
            createdAt: res.resultMessage.createdAt,
          },
        ]);
      } catch (e: any) {
        setMessages((prev) => [
          ...prev,
          {
            id: `tmp-e-${Date.now()}`,
            role: "assistant",
            text: e?.message ?? "Kunne ikke bekraefte",
            variant: "error",
            createdAt: new Date(),
          },
        ]);
      }
    });
  };

  // Annuller pending action — marker som cancelled
  const handleCancel = (messageId: string) => {
    setMessages((prev) =>
      prev.map((m) => (m.id === messageId ? { ...m, variant: "cancelled" } : m)),
    );
    startTransition(() => cancelThreadAction(messageId));
  };

  const removeThread = (threadId: string) => {
    if (!confirm("Slet hele samtalen?")) return;
    setThreads((prev) => prev.filter((t) => t.id !== threadId));
    if (activeId === threadId) {
      setActiveId(null);
      setMessages([WELCOME]);
      window.history.replaceState({}, "", window.location.pathname);
    }
    startTransition(() => deleteThread(threadId));
  };

  return (
    <div className="bg-card border border-border rounded-xl flex h-[calc(100vh-12rem)] min-h-[500px] overflow-hidden">
      {/* Sidebar: threads */}
      <aside className="w-64 border-r border-border bg-secondary/20 flex flex-col">
        <div className="px-3 py-3 border-b border-border">
          <button
            type="button"
            onClick={newThread}
            className="w-full px-3 py-2 bg-primary text-primary-foreground rounded-lg text-xs font-medium hover:bg-primary/90 inline-flex items-center justify-center gap-2"
          >
            <Plus className="h-3.5 w-3.5" />
            Ny samtale
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-2 space-y-0.5">
          {threads.length === 0 && (
            <div className="px-2 py-6 text-center">
              <MessageSquare className="h-5 w-5 mx-auto mb-1.5 text-muted-foreground/40" />
              <p className="text-xs text-muted-foreground">Ingen samtaler endnu</p>
            </div>
          )}
          {threads.map((t) => {
            const active = t.id === activeId;
            const renaming = renamingId === t.id;
            return (
              <div
                key={t.id}
                className={`group relative rounded-lg ${
                  active ? "bg-primary/10" : "hover:bg-secondary/60"
                }`}
              >
                {renaming ? (
                  <div className="flex items-center gap-1 px-2 py-1.5">
                    <input
                      type="text"
                      value={renameValue}
                      onChange={(e) => setRenameValue(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") submitRename(t.id);
                        if (e.key === "Escape") setRenamingId(null);
                      }}
                      autoFocus
                      className="flex-1 px-2 py-1 text-xs border border-border rounded bg-card"
                    />
                    <button
                      type="button"
                      onClick={() => submitRename(t.id)}
                      className="p-1 text-emerald-600 hover:bg-emerald-100 dark:hover:bg-emerald-900/30 rounded"
                    >
                      <Check className="h-3 w-3" />
                    </button>
                    <button
                      type="button"
                      onClick={() => setRenamingId(null)}
                      className="p-1 text-muted-foreground hover:bg-secondary rounded"
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </div>
                ) : (
                  <>
                    <button
                      type="button"
                      onClick={() => switchThread(t.id)}
                      className={`w-full text-left px-2.5 py-2 text-xs flex items-start gap-2 ${
                        active ? "text-primary font-medium" : "text-foreground/80"
                      }`}
                    >
                      {t.pinned ? (
                        <Pin className="h-3 w-3 mt-0.5 shrink-0 text-amber-500 fill-amber-500/30" />
                      ) : (
                        <MessageSquare className="h-3 w-3 mt-0.5 shrink-0 opacity-60" />
                      )}
                      <div className="flex-1 min-w-0">
                        <p className="truncate flex items-center gap-1">
                          {t.title}
                          {t.pinned && (
                            <span className="text-[9px] uppercase tracking-wider text-amber-600 dark:text-amber-400 font-semibold">
                              Pinnet
                            </span>
                          )}
                        </p>
                        <p className="text-[10px] text-muted-foreground mt-0.5">
                          {t._count.messages} beskeder · {relativeTime(t.updatedAt)}
                        </p>
                      </div>
                    </button>

                    {/* Hover-actions */}
                    <div className="absolute right-1 top-1 opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-0.5">
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          setRenamingId(t.id);
                          setRenameValue(t.title);
                        }}
                        title="Omdøb"
                        className="p-1 rounded hover:bg-card text-muted-foreground hover:text-foreground"
                      >
                        <Pencil className="h-2.5 w-2.5" />
                      </button>
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          togglePin(t.id, !t.pinned);
                        }}
                        title={t.pinned ? "Unpin" : "Pin"}
                        className="p-1 rounded hover:bg-card text-muted-foreground hover:text-foreground"
                      >
                        {t.pinned ? (
                          <PinOff className="h-2.5 w-2.5" />
                        ) : (
                          <Pin className="h-2.5 w-2.5" />
                        )}
                      </button>
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          removeThread(t.id);
                        }}
                        title="Slet"
                        className="p-1 rounded hover:bg-destructive/10 text-muted-foreground hover:text-destructive"
                      >
                        <Trash2 className="h-2.5 w-2.5" />
                      </button>
                    </div>
                  </>
                )}
              </div>
            );
          })}
        </div>
      </aside>

      {/* Chat-panel */}
      <div className="flex-1 flex flex-col min-w-0">
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

        <div ref={scrollRef} className="flex-1 overflow-y-auto p-5 space-y-3">
          {messages.map((m) => (
            <MessageBubble
              key={m.id}
              message={m}
              onConfirm={() => handleConfirm(m.id)}
              onCancel={() => handleCancel(m.id)}
            />
          ))}
          {isPending && (
            <div className="flex items-center gap-2 text-xs text-muted-foreground pl-11">
              <Loader2 className="h-3 w-3 animate-spin" />
              Arbejder...
            </div>
          )}
        </div>

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

        <form
          onSubmit={(e: FormEvent) => {
            e.preventDefault();
            send(input);
          }}
          className="p-4 border-t border-border flex gap-2"
        >
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder={
              activeId
                ? "Fortsæt samtalen..."
                : 'Skriv noget for at starte en ny samtale — fx "vis pipeline"'
            }
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
    </div>
  );
}

function MessageBubble({
  message,
  onConfirm,
  onCancel,
}: {
  message: Message;
  onConfirm?: () => void;
  onCancel?: () => void;
}) {
  const isUser = message.role === "user";
  const variantColors: Record<string, string> = {
    success:
      "bg-emerald-50 dark:bg-emerald-950/30 border-emerald-300 dark:border-emerald-800 text-emerald-900 dark:text-emerald-200",
    error:
      "bg-rose-50 dark:bg-rose-950/30 border-rose-300 dark:border-rose-800 text-rose-900 dark:text-rose-200",
    info: "bg-card border-border text-foreground",
    help: "bg-blue-50 dark:bg-blue-950/30 border-blue-300 dark:border-blue-800 text-blue-900 dark:text-blue-200",
    pending: "bg-amber-50 dark:bg-amber-950/30 border-amber-300 dark:border-amber-800 text-amber-900 dark:text-amber-200",
    confirmed: "bg-emerald-50 dark:bg-emerald-950/30 border-emerald-300 dark:border-emerald-800 text-emerald-900 dark:text-emerald-200 opacity-70",
    cancelled: "bg-secondary border-border text-muted-foreground opacity-60 line-through",
  };
  const v = (message.variant as string) || "info";
  const colors = variantColors[v] ?? variantColors.info;
  const Icon =
    v === "success" || v === "confirmed" ? CheckCircle2
    : v === "error" ? XCircle
    : v === "help" ? Wand2
    : v === "pending" ? Info
    : v === "cancelled" ? XCircle
    : Info;

  if (isUser) {
    return (
      <div className="flex justify-end">
        <div className="max-w-[80%] bg-primary text-primary-foreground rounded-2xl rounded-tr-md px-4 py-2 text-sm whitespace-pre-wrap break-words">
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
          className={`rounded-2xl rounded-tl-md border px-4 py-3 text-sm whitespace-pre-wrap ${colors}`}
        >
          <div className="flex items-start gap-2">
            <Icon className="h-3.5 w-3.5 shrink-0 mt-0.5 opacity-70" />
            <span className="flex-1 break-words">{message.text}</span>
          </div>
          {v === "pending" && (onConfirm || onCancel) && (
            <div className="flex items-center gap-2 mt-3 pt-3 border-t border-amber-300/50 dark:border-amber-800/50">
              <button
                type="button"
                onClick={onConfirm}
                className="flex-1 px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-md text-xs font-medium inline-flex items-center justify-center gap-1.5"
              >
                <CheckCircle2 className="h-3 w-3" />
                Godkend og udfør
              </button>
              <button
                type="button"
                onClick={onCancel}
                className="px-3 py-1.5 bg-card hover:bg-secondary border border-border text-foreground rounded-md text-xs font-medium inline-flex items-center justify-center gap-1.5"
              >
                <XCircle className="h-3 w-3" />
                Annullér
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function relativeTime(d: Date | string): string {
  const date = typeof d === "string" ? new Date(d) : d;
  const diff = Date.now() - date.getTime();
  const min = Math.floor(diff / 60000);
  if (min < 1) return "nu";
  if (min < 60) return `${min}m`;
  const h = Math.floor(min / 60);
  if (h < 24) return `${h}t`;
  const days = Math.floor(h / 24);
  if (days < 7) return `${days}d`;
  return date.toLocaleDateString("da-DK", { day: "2-digit", month: "short" });
}
