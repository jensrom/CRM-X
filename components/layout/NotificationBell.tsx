"use client";

import { useState, useTransition, useRef, useEffect } from "react";
import { Bell, Check, CheckCheck, Ticket, Key, Scissors, TrendingUp, Info, X } from "lucide-react";
import { markAsRead, markAllAsRead } from "@/app/actions/notifications";
import Link from "next/link";

type Notification = {
  id: string;
  type: string;
  title: string;
  message: string;
  linkUrl: string | null;
  isRead: boolean;
  createdAt: Date;
};

const TYPE_ICON: Record<string, React.ElementType> = {
  ticket_assigned: Ticket,
  license_expiring: Key,
  bundle_low: Scissors,
  deal_won: TrendingUp,
  system: Info,
};
const TYPE_COLOR: Record<string, string> = {
  ticket_assigned: "bg-amber-500/10 text-amber-600",
  license_expiring: "bg-rose-500/10 text-rose-600",
  bundle_low: "bg-amber-500/10 text-amber-600",
  deal_won: "bg-emerald-500/10 text-emerald-600",
  system: "bg-blue-500/10 text-blue-600",
};

function timeAgo(date: Date): string {
  const diff = Math.floor((Date.now() - new Date(date).getTime()) / 1000);
  if (diff < 60) return "Lige nu";
  if (diff < 3600) return `${Math.floor(diff / 60)}m siden`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}t siden`;
  return `${Math.floor(diff / 86400)}d siden`;
}

export function NotificationBell({
  initialNotifications,
  initialUnread,
}: {
  initialNotifications: Notification[];
  initialUnread: number;
}) {
  const [open, setOpen] = useState(false);
  const [notifications, setNotifications] = useState(initialNotifications);
  const [unread, setUnread] = useState(initialUnread);
  const [isPending, startTransition] = useTransition();
  const ref = useRef<HTMLDivElement>(null);

  // Luk ved klik udenfor
  useEffect(() => {
    function handler(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  function handleMarkOne(id: string) {
    startTransition(async () => {
      await markAsRead(id);
      setNotifications((prev) => prev.map((n) => n.id === id ? { ...n, isRead: true } : n));
      setUnread((c) => Math.max(0, c - 1));
    });
  }

  function handleMarkAll() {
    startTransition(async () => {
      await markAllAsRead();
      setNotifications((prev) => prev.map((n) => ({ ...n, isRead: true })));
      setUnread(0);
    });
  }

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen((o) => !o)}
        className={`relative p-2 rounded-lg transition-colors ${open ? "bg-secondary" : "hover:bg-secondary"}`}
        aria-label="Notifikationer"
      >
        <Bell className="h-4.5 w-4.5 text-muted-foreground" />
        {unread > 0 && (
          <span className="absolute top-1 right-1 min-w-[16px] h-4 rounded-full bg-destructive text-destructive-foreground text-[9px] font-bold flex items-center justify-center px-1 leading-none">
            {unread > 9 ? "9+" : unread}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute right-0 top-full mt-2 w-80 bg-card border border-border rounded-xl shadow-lg z-50 overflow-hidden">
          {/* Header */}
          <div className="flex items-center justify-between px-4 py-3 border-b border-border">
            <div className="flex items-center gap-2">
              <h3 className="text-sm font-semibold">Notifikationer</h3>
              {unread > 0 && (
                <span className="text-xs px-1.5 py-0.5 rounded-full bg-destructive/10 text-destructive font-medium">
                  {unread} ulæst
                </span>
              )}
            </div>
            {unread > 0 && (
              <button
                onClick={handleMarkAll}
                disabled={isPending}
                className="flex items-center gap-1 text-xs text-muted-foreground hover:text-primary transition-colors"
              >
                <CheckCheck className="h-3.5 w-3.5" />
                Mærk alle laeest
              </button>
            )}
          </div>

          {/* Liste */}
          <div className="max-h-96 overflow-y-auto">
            {notifications.length === 0 ? (
              <div className="text-center py-10">
                <Bell className="h-8 w-8 text-muted-foreground/20 mx-auto mb-2" />
                <p className="text-sm text-muted-foreground">Ingen notifikationer</p>
              </div>
            ) : (
              notifications.map((n) => {
                const Icon = TYPE_ICON[n.type] ?? Info;
                const iconColor = TYPE_COLOR[n.type] ?? "bg-secondary text-muted-foreground";

                const content = (
                  <div className={`flex gap-3 px-4 py-3 border-b border-border/50 last:border-0 transition-colors ${n.isRead ? "opacity-60" : "bg-primary/3"}`}>
                    <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 mt-0.5 ${iconColor}`}>
                      <Icon className="h-3.5 w-3.5" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className={`text-sm leading-tight ${n.isRead ? "" : "font-semibold"}`}>{n.title}</p>
                      <p className="text-xs text-muted-foreground mt-0.5 leading-relaxed">{n.message}</p>
                      <p className="text-[10px] text-muted-foreground/60 mt-1">{timeAgo(n.createdAt)}</p>
                    </div>
                    {!n.isRead && (
                      <button
                        onClick={(e) => { e.preventDefault(); e.stopPropagation(); handleMarkOne(n.id); }}
                        className="p-1 rounded hover:bg-secondary transition-colors shrink-0 self-start"
                        title="Mærk som laeest"
                      >
                        <Check className="h-3.5 w-3.5 text-muted-foreground" />
                      </button>
                    )}
                  </div>
                );

                return n.linkUrl ? (
                  <Link
                    key={n.id}
                    href={n.linkUrl}
                    onClick={() => { if (!n.isRead) handleMarkOne(n.id); setOpen(false); }}
                    className="block hover:bg-secondary/30 transition-colors"
                  >
                    {content}
                  </Link>
                ) : (
                  <div key={n.id} className="hover:bg-secondary/20 transition-colors cursor-default">
                    {content}
                  </div>
                );
              })
            )}
          </div>
        </div>
      )}
    </div>
  );
}
