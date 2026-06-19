"use client";

/**
 * CommentThread — universal kommentar-tråd til kunder/projekter/deals/quotes/invoices.
 *
 * Optimistisk UI: nye kommentarer vises straks i listen før server-respons.
 * Cmd/Ctrl+Enter sender. Hver bruger kan redigere/slette egne.
 */

import { useState, useTransition, useRef, useEffect } from "react";
import { Send, Edit3, Trash2, X, Check, MessageCircle } from "lucide-react";
import {
  addComment,
  editComment,
  deleteComment,
  type CommentScope,
} from "@/app/actions/comments";

interface Comment {
  id: string;
  body: string;
  authorId: string | null;
  authorName: string;
  authorEmail: string;
  createdAt: Date | string;
  editedAt: Date | string | null;
  isMine: boolean;
}

interface Props {
  scope: CommentScope;
  parentId: string;
  initialComments: Comment[];
  /** Skjul header/titel (inline-brug i tabs uden ekstra wrap) */
  bare?: boolean;
}

function initials(name: string): string {
  return name
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((s) => s[0]?.toUpperCase() ?? "")
    .join("");
}

function timeAgo(d: Date | string): string {
  const date = typeof d === "string" ? new Date(d) : d;
  const diff = Date.now() - date.getTime();
  const min = Math.floor(diff / 60000);
  if (min < 1) return "nu";
  if (min < 60) return `${min} min siden`;
  const h = Math.floor(min / 60);
  if (h < 24) return `${h}t siden`;
  const days = Math.floor(h / 24);
  if (days < 7) return `${days}d siden`;
  return date.toLocaleDateString("da-DK", { day: "2-digit", month: "short", year: "numeric" });
}

export function CommentThread({ scope, parentId, initialComments, bare = false }: Props) {
  const [comments, setComments] = useState<Comment[]>(initialComments);
  const [body, setBody] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editBody, setEditBody] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Cmd/Ctrl+Enter sender
  useEffect(() => {
    const el = textareaRef.current;
    if (!el) return;
    const handler = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "Enter") {
        e.preventDefault();
        const form = el.closest("form");
        form?.requestSubmit();
      }
    };
    el.addEventListener("keydown", handler);
    return () => el.removeEventListener("keydown", handler);
  }, []);

  const handleAdd = (formData: FormData) => {
    setError(null);
    const text = ((formData.get("body") as string) || "").trim();
    if (!text) return;
    // Optimistisk preview
    const optimistic: Comment = {
      id: `temp-${Date.now()}`,
      body: text,
      authorId: "me",
      authorName: "Dig",
      authorEmail: "",
      createdAt: new Date(),
      editedAt: null,
      isMine: true,
    };
    setComments((prev) => [optimistic, ...prev]);
    setBody("");
    startTransition(async () => {
      try {
        await addComment(scope, parentId, formData);
        // Server-revalidatePath henter friske rows via parent-side reload —
        // her ville ideelt være refetch, men vi ladet optimistisk vare ved.
      } catch (e: any) {
        setError(e?.message ?? "Kunne ikke sende");
        setComments((prev) => prev.filter((c) => c.id !== optimistic.id));
      }
    });
  };

  const handleEditSave = (id: string) => {
    if (!editBody.trim()) return;
    startTransition(async () => {
      try {
        await editComment(id, editBody);
        setComments((prev) =>
          prev.map((c) => (c.id === id ? { ...c, body: editBody, editedAt: new Date() } : c)),
        );
        setEditingId(null);
      } catch (e: any) {
        setError(e?.message ?? "Kunne ikke gemme");
      }
    });
  };

  const handleDelete = (id: string) => {
    if (!confirm("Slet kommentaren?")) return;
    startTransition(async () => {
      try {
        await deleteComment(id);
        setComments((prev) => prev.filter((c) => c.id !== id));
      } catch (e: any) {
        setError(e?.message ?? "Kunne ikke slette");
      }
    });
  };

  return (
    <div className="space-y-4">
      {!bare && (
        <div className="flex items-center gap-2">
          <MessageCircle className="h-4 w-4 text-muted-foreground" />
          <h3 className="text-sm font-semibold">Kommentarer</h3>
          <span className="text-xs text-muted-foreground">({comments.length})</span>
        </div>
      )}

      {/* Ny kommentar */}
      <form action={handleAdd} className="space-y-2">
        <textarea
          ref={textareaRef}
          name="body"
          value={body}
          onChange={(e) => setBody(e.target.value)}
          rows={3}
          placeholder="Skriv en kommentar… (⌘+Enter for at sende)"
          className="w-full px-3 py-2 border border-border rounded-lg bg-card text-sm resize-y focus:outline-none focus:ring-2 focus:ring-ring"
          maxLength={5000}
        />
        <div className="flex items-center justify-between">
          <span className="text-xs text-muted-foreground">
            {body.length}/5000
          </span>
          <button
            type="submit"
            disabled={isPending || !body.trim()}
            className="px-3 py-1.5 bg-primary text-primary-foreground rounded-md text-sm font-medium hover:bg-primary/90 disabled:opacity-50 inline-flex items-center gap-2"
          >
            <Send className="h-3.5 w-3.5" />
            Send
          </button>
        </div>
      </form>

      {error && (
        <div className="text-xs text-destructive bg-destructive/10 border border-destructive/30 rounded-md px-3 py-2">
          {error}
        </div>
      )}

      {/* Liste */}
      {comments.length === 0 ? (
        <div className="text-center py-8 text-sm text-muted-foreground">
          Ingen kommentarer endnu. Vær den første.
        </div>
      ) : (
        <div className="space-y-3">
          {comments.map((c) => {
            const isEditing = editingId === c.id;
            return (
              <div key={c.id} className="flex gap-3 group">
                <div className="h-8 w-8 rounded-full bg-primary/10 text-primary flex items-center justify-center text-xs font-semibold shrink-0">
                  {initials(c.authorName)}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-0.5">
                    <span className="text-sm font-medium">{c.authorName}</span>
                    <span className="text-xs text-muted-foreground">
                      {timeAgo(c.createdAt)}
                      {c.editedAt && " · redigeret"}
                    </span>
                    {c.isMine && !isEditing && (
                      <div className="ml-auto opacity-0 group-hover:opacity-100 flex items-center gap-1 transition-opacity">
                        <button
                          type="button"
                          onClick={() => { setEditingId(c.id); setEditBody(c.body); }}
                          className="h-6 w-6 rounded hover:bg-secondary flex items-center justify-center text-muted-foreground hover:text-foreground"
                          title="Rediger"
                        >
                          <Edit3 className="h-3 w-3" />
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDelete(c.id)}
                          className="h-6 w-6 rounded hover:bg-destructive/10 flex items-center justify-center text-muted-foreground hover:text-destructive"
                          title="Slet"
                        >
                          <Trash2 className="h-3 w-3" />
                        </button>
                      </div>
                    )}
                  </div>
                  {isEditing ? (
                    <div className="space-y-2">
                      <textarea
                        value={editBody}
                        onChange={(e) => setEditBody(e.target.value)}
                        rows={3}
                        className="w-full px-3 py-2 border border-border rounded-lg bg-card text-sm"
                      />
                      <div className="flex justify-end gap-1">
                        <button
                          type="button"
                          onClick={() => setEditingId(null)}
                          className="px-2 py-1 text-xs hover:bg-secondary rounded inline-flex items-center gap-1"
                        >
                          <X className="h-3 w-3" /> Annullér
                        </button>
                        <button
                          type="button"
                          onClick={() => handleEditSave(c.id)}
                          className="px-2 py-1 text-xs bg-primary text-primary-foreground rounded inline-flex items-center gap-1"
                        >
                          <Check className="h-3 w-3" /> Gem
                        </button>
                      </div>
                    </div>
                  ) : (
                    <p className="text-sm whitespace-pre-wrap break-words">{c.body}</p>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
