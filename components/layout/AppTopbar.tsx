"use client";

import { useState, useEffect, useRef } from "react";
import { Bell, Search, Timer, X, ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";

interface ActiveCheckIn {
  projectTitle: string;
  startedAt: Date;
}

interface AppTopbarProps {
  pageTitle: string;
  activeCheckIn?: ActiveCheckIn | null;
  onStopCheckIn?: () => void;
  notificationCount?: number;
}

export function AppTopbar({
  pageTitle,
  activeCheckIn,
  onStopCheckIn,
  notificationCount = 0,
}: AppTopbarProps) {
  const [elapsed, setElapsed] = useState("00:00:00");

  // Tæl tid siden check-in
  useEffect(() => {
    if (!activeCheckIn) return;

    const interval = setInterval(() => {
      const diff = Date.now() - new Date(activeCheckIn.startedAt).getTime();
      const h = Math.floor(diff / 3600000);
      const m = Math.floor((diff % 3600000) / 60000);
      const s = Math.floor((diff % 60000) / 1000);
      setElapsed(
        `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`
      );
    }, 1000);

    return () => clearInterval(interval);
  }, [activeCheckIn]);

  return (
    <header
      className="fixed top-0 right-0 bg-card border-b border-border flex items-center justify-between px-6 z-20"
      style={{
        left: "var(--sidebar-width)",
        height: "var(--topbar-height)",
      }}
    >
      {/* Page title */}
      <h1 className="text-base font-semibold text-foreground">{pageTitle}</h1>

      <div className="flex items-center gap-2">
        {/* Aktiv check-in indikator */}
        {activeCheckIn && (
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-success/10 border border-success/20 text-success text-xs font-medium">
            <div className="w-1.5 h-1.5 rounded-full bg-success animate-pulse" />
            <Timer className="h-3.5 w-3.5" />
            <span className="font-mono">{elapsed}</span>
            <span className="text-success/70 max-w-[120px] truncate">
              {activeCheckIn.projectTitle}
            </span>
            <button
              onClick={onStopCheckIn}
              className="ml-1 hover:text-success/60 transition-colors"
              title="Stop tidregistrering"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          </div>
        )}

        {/* Søg */}
        <button
          className="flex items-center gap-2 px-3 py-1.5 rounded-lg border border-border bg-secondary/50
                     text-muted-foreground text-sm hover:bg-secondary transition-colors"
        >
          <Search className="h-4 w-4" />
          <span className="hidden sm:inline">Søg...</span>
          <kbd className="hidden sm:inline text-[10px] px-1.5 py-0.5 rounded bg-muted border border-border font-mono">
            ⌘K
          </kbd>
        </button>

        {/* Notifikationer */}
        <button className="relative p-2 rounded-lg hover:bg-secondary transition-colors">
          <Bell className="h-4.5 w-4.5 text-muted-foreground" />
          {notificationCount > 0 && (
            <span className="absolute top-1 right-1 w-4 h-4 rounded-full bg-destructive text-destructive-foreground text-[9px] font-bold flex items-center justify-center leading-none">
              {notificationCount > 9 ? "9+" : notificationCount}
            </span>
          )}
        </button>
      </div>
    </header>
  );
}
