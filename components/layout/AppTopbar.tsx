"use client";

/**
 * AppTopbar
 * ─────────
 * Topbar med side-titel + globale widgets (timer, notifikationer, soeg).
 *
 * Alle widgets er self-fetching client-components, saa pages kan bruge
 * <AppTopbar pageTitle="..." /> uden at hente noget data foerst.
 */

import { Search } from "lucide-react";
import { NotificationBell } from "./NotificationBell";
import { TimerWidget } from "./TimerWidget";

interface AppTopbarProps {
  pageTitle: string;
}

export function AppTopbar({ pageTitle }: AppTopbarProps) {
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
        {/* Tidsregistrering — self-fetching, live tikker */}
        <TimerWidget />

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

        {/* Notifikationer — self-fetching + polling */}
        <NotificationBell />
      </div>
    </header>
  );
}
