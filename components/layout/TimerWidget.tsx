"use client";

/**
 * TimerWidget — tidsregistrering i topbar
 * ───────────────────────────────────────
 * Tre tilstande:
 *   1) Ingen check-in → "Start timer"-knap aabner quick-start dropdown
 *   2) Aktiv check-in → grøn pill med tikkende HH:MM:SS + projekt-navn + stop-X
 *   3) Loading → diskret skeleton
 *
 * UX-aftaler:
 *   • Tæller live i klient (1s interval) saa brugeren ser det stige
 *   • Polling hver 30s for at fange ekstern stop (mobile app, anden bruger osv.)
 *   • Quick-start: dropdown med op til 20 aktive projekter, "Mine" foerst
 *   • Klik paa projekt → optimistic check-in + lukker dropdown
 *   • Klik stop-X → optimistic check-out + viser quick-start igen
 *
 * Compliance: vi ruller op til naermeste 5 min naar check-out (samme som server).
 */

import { useState, useEffect, useRef, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Timer, X, Play, Search, FolderKanban, Loader2 } from "lucide-react";
import { checkIn, checkOut, getMyCheckInWithProject, getMyActiveProjectsForTimer } from "@/app/actions/projects";

interface ActiveCheckIn {
  startedAt:     Date | string;
  projectId:     string;
  projectTitle:  string;
  projectNumber: number;
  companyName:   string;
}

interface ProjectOption {
  id:      string;
  title:   string;
  number:  number;
  assignedToId: string | null;
  company: { name: string };
  tenant:  { projectPrefix: string };
}

export function TimerWidget() {
  const router = useRouter();
  const [active, setActive] = useState<ActiveCheckIn | null>(null);
  const [loading, setLoading] = useState(true);
  const [elapsed, setElapsed] = useState("00:00:00");
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [projects, setProjects] = useState<ProjectOption[]>([]);
  const [search, setSearch] = useState("");
  const [pending, start] = useTransition();
  const dropdownRef = useRef<HTMLDivElement>(null);

  // ─── Initial fetch ────────────────────────────────────────────
  useEffect(() => {
    (async () => {
      try {
        const ci = await getMyCheckInWithProject();
        setActive(ci);
      } catch {}
      setLoading(false);
    })();
  }, []);

  // ─── Polling for ekstern aendring ─────────────────────────────
  useEffect(() => {
    const id = setInterval(async () => {
      try {
        const ci = await getMyCheckInWithProject();
        setActive(ci);
      } catch {}
    }, 30_000);
    return () => clearInterval(id);
  }, []);

  // ─── Tik-interval naar aktiv ──────────────────────────────────
  useEffect(() => {
    if (!active) {
      setElapsed("00:00:00");
      return;
    }
    const tick = () => {
      const diff = Date.now() - new Date(active.startedAt).getTime();
      const h = Math.floor(diff / 3600000);
      const m = Math.floor((diff % 3600000) / 60000);
      const s = Math.floor((diff % 60000) / 1000);
      setElapsed(
        `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`,
      );
    };
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [active]);

  // ─── Klik udenfor lukker dropdown ─────────────────────────────
  useEffect(() => {
    if (!dropdownOpen) return;
    const handler = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setDropdownOpen(false);
      }
    };
    const escHandler = (e: KeyboardEvent) => {
      if (e.key === "Escape") setDropdownOpen(false);
    };
    document.addEventListener("mousedown", handler);
    window.addEventListener("keydown", escHandler);
    return () => {
      document.removeEventListener("mousedown", handler);
      window.removeEventListener("keydown", escHandler);
    };
  }, [dropdownOpen]);

  // ─── Hent projekter naar dropdown aabnes ─────────────────────
  const handleOpenDropdown = async () => {
    setDropdownOpen(true);
    if (projects.length === 0) {
      try {
        const list = await getMyActiveProjectsForTimer(30);
        setProjects(list as any);
      } catch {}
    }
  };

  const handleStart = (projectId: string, projectTitle: string, companyName: string, projectNumber: number) => {
    // Optimistic update
    setActive({
      startedAt:     new Date(),
      projectId,
      projectTitle,
      projectNumber,
      companyName,
    });
    setDropdownOpen(false);
    start(async () => {
      try {
        await checkIn(projectId);
      } catch {
        // Revert ved fejl
        setActive(null);
      }
    });
  };

  const handleStop = () => {
    const wasActive = active;
    setActive(null);
    start(async () => {
      try {
        await checkOut();
        router.refresh();
      } catch {
        // Revert ved fejl
        setActive(wasActive);
      }
    });
  };

  // ─── Render: loading ──────────────────────────────────────────
  if (loading) {
    return (
      <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-secondary/40 text-xs text-muted-foreground">
        <Loader2 className="h-3 w-3 animate-spin" />
        <span>Henter...</span>
      </div>
    );
  }

  // ─── Render: aktiv timer ──────────────────────────────────────
  if (active) {
    return (
      <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-700 text-xs font-medium">
        <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
        <Timer className="h-3.5 w-3.5" />
        <span className="font-mono tabular-nums">{elapsed}</span>
        <span className="text-emerald-700/70 max-w-[160px] truncate" title={`${active.projectTitle} · ${active.companyName}`}>
          {active.projectTitle}
        </span>
        <button
          onClick={handleStop}
          disabled={pending}
          className="ml-1 hover:text-emerald-900 transition-colors p-0.5 rounded hover:bg-emerald-500/10"
          title="Stop tidsregistrering (rundes op til 5 min)"
        >
          <X className="h-3.5 w-3.5" />
        </button>
      </div>
    );
  }

  // ─── Render: ingen aktiv + dropdown ───────────────────────────
  const filteredProjects = search
    ? projects.filter((p) => {
        const s = search.toLowerCase();
        return (
          p.title.toLowerCase().includes(s) ||
          p.company.name.toLowerCase().includes(s) ||
          `${p.tenant.projectPrefix}-${p.number}`.toLowerCase().includes(s)
        );
      })
    : projects;

  return (
    <div ref={dropdownRef} className="relative">
      <button
        type="button"
        onClick={handleOpenDropdown}
        className="flex items-center gap-1.5 px-3 py-1.5 rounded-full border border-border bg-secondary/30 text-xs font-medium text-muted-foreground hover:bg-secondary/60 hover:text-foreground transition-colors"
      >
        <Play className="h-3 w-3" />
        Start timer
      </button>

      {dropdownOpen && (
        <div className="absolute top-full right-0 mt-2 w-80 bg-card border border-border rounded-xl shadow-2xl overflow-hidden z-50 animate-in fade-in slide-in-from-top-2 duration-150">
          <div className="px-3 py-2.5 border-b border-border bg-secondary/20">
            <div className="flex items-center gap-2">
              <Search className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
              <input
                autoFocus
                placeholder="Søg projekt..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="flex-1 bg-transparent text-sm outline-none placeholder:text-muted-foreground"
              />
            </div>
          </div>

          <div className="max-h-80 overflow-y-auto">
            {filteredProjects.length === 0 ? (
              <div className="px-4 py-8 text-center">
                <FolderKanban className="h-8 w-8 text-muted-foreground/30 mx-auto mb-2" />
                <p className="text-sm text-muted-foreground">
                  {search ? "Ingen projekter matcher søgningen" : "Ingen aktive projekter"}
                </p>
              </div>
            ) : (
              <ul className="divide-y divide-border">
                {filteredProjects.map((p) => (
                  <li key={p.id}>
                    <button
                      type="button"
                      onClick={() => handleStart(p.id, p.title, p.company.name, p.number)}
                      className="w-full text-left px-4 py-3 hover:bg-secondary/40 transition-colors flex items-center gap-3"
                    >
                      <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                        <FolderKanban className="h-3.5 w-3.5 text-primary" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate">{p.title}</p>
                        <p className="text-xs text-muted-foreground truncate">
                          <span className="font-mono">{p.tenant.projectPrefix}-{String(p.number).padStart(4, "0")}</span>
                          {" · "}
                          {p.company.name}
                        </p>
                      </div>
                      <Play className="h-3 w-3 text-muted-foreground shrink-0" />
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>

          <div className="px-4 py-2 border-t border-border bg-secondary/10 text-center">
            <p className="text-[10px] text-muted-foreground">
              Timeren tikker i baggrunden — stop fra topbar når du er færdig.
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
