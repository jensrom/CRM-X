"use client";

/**
 * LeadActivityTimeline
 * ────────────────────
 * Tidslinje af hændelser pr. lead — opkald, møder, opfølgninger, frie noter.
 *
 * Lowkey nordisk design: bløde farver pr. type, ikoner fra lucide,
 * tydelig "hvem-hvad-hvornår"-linje under hver hændelse.
 *
 * Composition:
 *   • Form i toppen — hurtigt log: type, emne, beskrivelse, valgfri opfølgnings-dato
 *   • Liste nedenunder — nyeste først, hver med kvik-handlinger (færdig, slet)
 */

import {
  createLeadActivity,
  completeLeadActivity,
  deleteLeadActivity,
} from "@/app/actions/lead-activities";
import { Button } from "@/components/ui/button";
import {
  Phone,
  Users,
  Mail,
  CheckSquare,
  Bell,
  StickyNote,
  Send,
  Check,
  Trash2,
  Calendar,
  Clock,
} from "lucide-react";
import { useState, useRef, useTransition } from "react";
import { formatDate } from "@/lib/utils";

type ActivityType = "call" | "meeting" | "email" | "task" | "followup" | "note";

interface ActivityRow {
  id: string;
  type: string;
  subject: string;
  description: string | null;
  dueDate: Date | null;
  completedAt: Date | null;
  createdAt: Date;
  user: { id: string; name: string | null };
}

interface Props {
  leadId: string;
  activities: ActivityRow[];
}

const TYPE_META: Record<
  ActivityType,
  { label: string; icon: any; cls: string }
> = {
  call:     { label: "Opkald",      icon: Phone,      cls: "bg-blue-50 text-blue-700 border-blue-200" },
  meeting:  { label: "Møde",        icon: Users,      cls: "bg-violet-50 text-violet-700 border-violet-200" },
  email:    { label: "E-mail",      icon: Mail,       cls: "bg-cyan-50 text-cyan-700 border-cyan-200" },
  task:     { label: "Opgave",      icon: CheckSquare,cls: "bg-amber-50 text-amber-700 border-amber-200" },
  followup: { label: "Opfølgning",  icon: Bell,       cls: "bg-emerald-50 text-emerald-700 border-emerald-200" },
  note:     { label: "Note",        icon: StickyNote, cls: "bg-secondary text-muted-foreground border-border" },
};

const TYPE_ORDER: ActivityType[] = ["call", "meeting", "email", "task", "followup", "note"];

/** Smart "X dage siden" eller fuld dato hvis det er længere væk. */
function relativeTime(d: Date): string {
  const now = Date.now();
  const t = new Date(d).getTime();
  const diffMs = now - t;
  const min = Math.floor(diffMs / 60000);
  if (min < 1) return "lige nu";
  if (min < 60) return `${min} min siden`;
  const hours = Math.floor(min / 60);
  if (hours < 24) return `${hours} timer siden`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days} dage siden`;
  return formatDate(d);
}

/** Tjek om en due-date er forbi i dag (uden tid på). */
function isOverdue(due: Date | null, completed: Date | null): boolean {
  if (!due || completed) return false;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return new Date(due) < today;
}

export function LeadActivityTimeline({ leadId, activities }: Props) {
  const [type, setType] = useState<ActivityType>("call");
  const [showDescription, setShowDescription] = useState(false);
  const [showDueDate, setShowDueDate] = useState(false);
  const [pending, startTransition] = useTransition();
  const formRef = useRef<HTMLFormElement>(null);

  function handleSubmit(formData: FormData) {
    startTransition(async () => {
      await createLeadActivity(formData);
      formRef.current?.reset();
      setShowDescription(false);
      setShowDueDate(false);
    });
  }

  return (
    <div className="bg-card border border-border rounded-xl overflow-hidden">
      <div className="px-5 py-3.5 border-b border-border">
        <h3 className="text-sm font-semibold flex items-center gap-2">
          <Clock className="h-4 w-4 text-muted-foreground" />
          Aktivitetslog
          <span className="text-xs font-normal text-muted-foreground ml-1">
            ({activities.length})
          </span>
        </h3>
        <p className="text-xs text-muted-foreground mt-0.5">
          Log opkald, møder og opfølgninger på dette lead.
        </p>
      </div>

      {/* Hurtig-log form */}
      <form ref={formRef} action={handleSubmit} className="p-4 border-b border-border bg-secondary/30 space-y-3">
        <input type="hidden" name="leadId" value={leadId} />
        <input type="hidden" name="type" value={type} />

        {/* Type-chips */}
        <div className="flex flex-wrap gap-1.5">
          {TYPE_ORDER.map((t) => {
            const meta = TYPE_META[t];
            const Icon = meta.icon;
            const active = type === t;
            return (
              <button
                key={t}
                type="button"
                onClick={() => setType(t)}
                className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg border text-xs transition-colors ${
                  active
                    ? meta.cls + " font-medium"
                    : "bg-background border-border text-muted-foreground hover:border-primary/40"
                }`}
              >
                <Icon className="h-3 w-3" />
                {meta.label}
              </button>
            );
          })}
        </div>

        {/* Emne */}
        <input
          name="subject"
          required
          placeholder={
            type === "call"     ? "fx 'Ringede til Lars — aftalte møde fredag'"  :
            type === "meeting"  ? "fx 'Indledende møde — afdækning af behov'"     :
            type === "email"    ? "fx 'Sendt produktoverblik + pris-eksempel'"   :
            type === "task"     ? "fx 'Forbered demo-script til torsdag'"        :
            type === "followup" ? "fx 'Følg op på prisforslag'"                  :
                                  "fx 'Kunde nævnte at de allerede har leverandør X'"
          }
          className="w-full px-3 py-2 rounded-lg border border-input bg-background text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
        />

        {/* Valgfri beskrivelse */}
        {showDescription ? (
          <textarea
            name="description"
            rows={2}
            placeholder="Detaljer, citater, næste skridt…"
            className="w-full px-3 py-2 rounded-lg border border-input bg-background text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring resize-none"
          />
        ) : (
          <button
            type="button"
            onClick={() => setShowDescription(true)}
            className="text-xs text-muted-foreground hover:text-primary transition-colors"
          >
            + Tilføj beskrivelse
          </button>
        )}

        {/* Valgfri opfølgningsdato */}
        {showDueDate ? (
          <div className="flex items-center gap-2">
            <Calendar className="h-3.5 w-3.5 text-muted-foreground" />
            <input
              name="dueDate"
              type="date"
              className="px-2.5 py-1 rounded-lg border border-input bg-background text-xs focus:outline-none focus:ring-2 focus:ring-ring"
            />
            <span className="text-xs text-muted-foreground">— opfølges</span>
            <button
              type="button"
              onClick={() => setShowDueDate(false)}
              className="text-xs text-muted-foreground hover:text-destructive ml-auto"
            >
              fjern
            </button>
          </div>
        ) : (
          <button
            type="button"
            onClick={() => setShowDueDate(true)}
            className="text-xs text-muted-foreground hover:text-primary transition-colors"
          >
            + Sæt opfølgningsdato
          </button>
        )}

        <div className="flex justify-end">
          <Button type="submit" size="sm" disabled={pending}>
            <Send className="h-3 w-3" />
            {pending ? "Gemmer…" : "Log hændelse"}
          </Button>
        </div>
      </form>

      {/* Tidslinje */}
      {activities.length === 0 ? (
        <div className="px-5 py-8 text-center">
          <Clock className="h-8 w-8 text-muted-foreground/40 mx-auto mb-2" />
          <p className="text-sm text-muted-foreground">Ingen aktiviteter endnu.</p>
          <p className="text-xs text-muted-foreground/80 mt-1">
            Den første hændelse du logger lander her.
          </p>
        </div>
      ) : (
        <ul className="divide-y divide-border">
          {activities.map((a) => {
            const meta = TYPE_META[(a.type as ActivityType)] ?? TYPE_META.note;
            const Icon = meta.icon;
            const overdue = isOverdue(a.dueDate, a.completedAt);
            const done = !!a.completedAt;
            return (
              <li key={a.id} className="px-5 py-3.5 hover:bg-secondary/30 transition-colors">
                <div className="flex items-start gap-3">
                  <div className={`w-7 h-7 rounded-lg border flex items-center justify-center shrink-0 ${meta.cls}`}>
                    <Icon className="h-3.5 w-3.5" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-2">
                      <p className={`text-sm font-medium leading-snug ${done ? "line-through text-muted-foreground" : ""}`}>
                        {a.subject}
                      </p>
                      <div className="flex items-center gap-1 shrink-0">
                        {!done && (a.type === "task" || a.type === "followup") && (
                          <form
                            action={async () => {
                              await completeLeadActivity(a.id, leadId);
                            }}
                          >
                            <button
                              type="submit"
                              className="text-muted-foreground hover:text-emerald-600 p-1 rounded transition-colors"
                              title="Markér som færdig"
                            >
                              <Check className="h-3.5 w-3.5" />
                            </button>
                          </form>
                        )}
                        <form
                          action={async () => {
                            await deleteLeadActivity(a.id, leadId);
                          }}
                        >
                          <button
                            type="submit"
                            className="text-muted-foreground hover:text-destructive p-1 rounded transition-colors"
                            title="Slet aktivitet"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        </form>
                      </div>
                    </div>
                    {a.description && (
                      <p className="text-xs text-muted-foreground mt-1 leading-relaxed whitespace-pre-wrap">
                        {a.description}
                      </p>
                    )}
                    <div className="flex items-center gap-3 mt-1.5 text-[11px] text-muted-foreground">
                      <span>{a.user.name ?? "—"}</span>
                      <span>·</span>
                      <span>{relativeTime(new Date(a.createdAt))}</span>
                      {a.dueDate && (
                        <>
                          <span>·</span>
                          <span className={`flex items-center gap-1 ${overdue ? "text-amber-700 font-medium" : ""}`}>
                            <Calendar className="h-2.5 w-2.5" />
                            Opfølges {formatDate(a.dueDate)}
                            {overdue && " (forfalden)"}
                          </span>
                        </>
                      )}
                      {done && (
                        <>
                          <span>·</span>
                          <span className="flex items-center gap-1 text-emerald-700">
                            <Check className="h-2.5 w-2.5" />
                            Færdig {formatDate(a.completedAt!)}
                          </span>
                        </>
                      )}
                    </div>
                  </div>
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
