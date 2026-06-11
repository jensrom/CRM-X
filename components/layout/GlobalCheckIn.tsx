"use client";

import { useEffect, useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Timer, X, Play, ChevronDown, FolderKanban, Building2 } from "lucide-react";
import { checkIn, checkOut } from "@/app/actions/projects";

export interface CheckInProject {
  id: string;
  title: string;
  number: number;
  company: { name: string };
  tenant: { projectPrefix: string };
}

interface Props {
  activeCheckIn: {
    projectId: string;
    projectTitle: string;
    startedAt: string; // ISO string
  } | null;
  projects: CheckInProject[];
}

function formatElapsed(startedAt: string) {
  const diff = Math.max(Date.now() - new Date(startedAt).getTime(), 0);
  const h = Math.floor(diff / 3_600_000);
  const m = Math.floor((diff % 3_600_000) / 60_000);
  const s = Math.floor((diff % 60_000) / 1_000);
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
}

/**
 * Persistent check-in widget i topbar.
 *
 * - Hvis brugeren er stemplet ind: pulserende timer + projekt-navn + stop-knap.
 * - Hvis ikke: "Stemple ind"-knap der åbner en projekt-picker dropdown.
 *
 * Synlig på ALLE tenant-sider så brugeren altid kan logge tid.
 */
export function GlobalCheckIn({ activeCheckIn, projects }: Props) {
  const router = useRouter();
  const [now, setNow] = useState(Date.now());
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [isPending, startTransition] = useTransition();

  useEffect(() => {
    if (!activeCheckIn) return;
    const interval = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(interval);
  }, [activeCheckIn]);

  function stop() {
    startTransition(async () => {
      await checkOut();
      router.refresh();
    });
  }

  function startCheckIn(projectId: string) {
    setOpen(false);
    setQuery("");
    startTransition(async () => {
      await checkIn(projectId);
      router.refresh();
    });
  }

  // Aktiv check-in
  if (activeCheckIn) {
    const elapsed = formatElapsed(activeCheckIn.startedAt);
    return (
      <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-emerald-500/10 border border-emerald-500/30 text-emerald-700 text-xs font-medium">
        <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
        <Timer className="h-3.5 w-3.5" />
        <span className="font-mono tabular-nums">{elapsed}</span>
        <Link
          href={`/projects/${activeCheckIn.projectId}`}
          className="text-emerald-700/80 hover:text-emerald-800 max-w-[140px] truncate"
        >
          {activeCheckIn.projectTitle}
        </Link>
        <button
          onClick={stop}
          disabled={isPending}
          className="ml-1 hover:text-emerald-900 transition-colors disabled:opacity-50"
          title="Stop tidregistrering"
          aria-label="Stop tidregistrering"
        >
          <X className="h-3.5 w-3.5" />
        </button>
      </div>
    );
  }

  // Ingen aktiv check-in: vis knap der åbner picker
  const filtered = query
    ? projects.filter((p) => {
        const q = query.toLowerCase();
        return (
          p.title.toLowerCase().includes(q) ||
          p.company.name.toLowerCase().includes(q) ||
          `${p.tenant.projectPrefix}-${String(p.number).padStart(4, "0")}`.toLowerCase().includes(q)
        );
      })
    : projects;

  return (
    <div className="relative">
      <button
        onClick={() => setOpen((v) => !v)}
        disabled={isPending}
        className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-secondary border border-border text-xs font-medium hover:bg-secondary/70 transition-colors disabled:opacity-50"
      >
        <Play className="h-3 w-3 text-primary" />
        Stemple ind
        <ChevronDown className="h-3 w-3 opacity-60" />
      </button>

      {open && (
        <>
          <div className="fixed inset-0 z-30" onClick={() => setOpen(false)} />
          <div className="absolute right-0 top-full mt-1.5 w-80 bg-popover border border-border rounded-xl shadow-xl z-40 overflow-hidden">
            <div className="p-2 border-b border-border">
              <input
                autoFocus
                type="text"
                placeholder="Søg projekt…"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                className="w-full px-3 py-1.5 rounded-lg border border-input bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring"
              />
            </div>
            <div className="max-h-72 overflow-y-auto">
              {filtered.length === 0 ? (
                <p className="px-4 py-6 text-center text-xs text-muted-foreground">
                  {projects.length === 0
                    ? "Ingen projekter at stemple ind på"
                    : `Ingen match for "${query}"`}
                </p>
              ) : (
                <div className="divide-y divide-border/50">
                  {filtered.slice(0, 30).map((p) => (
                    <button
                      key={p.id}
                      onClick={() => startCheckIn(p.id)}
                      className="w-full flex items-center gap-3 px-4 py-2.5 text-left hover:bg-secondary/60 transition-colors"
                    >
                      <div className="w-7 h-7 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                        <FolderKanban className="h-3.5 w-3.5 text-primary" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate">{p.title}</p>
                        <p className="text-[11px] text-muted-foreground truncate flex items-center gap-1">
                          <Building2 className="h-2.5 w-2.5" />
                          {p.company.name}
                        </p>
                      </div>
                      <span className="text-[10px] font-mono text-muted-foreground shrink-0">
                        {p.tenant.projectPrefix}-{String(p.number).padStart(4, "0")}
                      </span>
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
