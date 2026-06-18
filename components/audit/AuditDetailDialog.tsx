"use client";

/**
 * AuditDetailDialog — klik paa audit-raekke for fuld detalje
 * ──────────────────────────────────────────────────────────
 * Viser:
 *   • Header: aktion + objekt + tidspunkt
 *   • Aktor-blok: bruger, email, IP, User-Agent
 *   • Before/After JSON diff (hvis tilgaengelig)
 *   • Besked + outcome
 */

import { useState, useEffect } from "react";
import { X, Code, User as UserIcon, Globe, Clock, Hash } from "lucide-react";

interface AuditLogShape {
  id:           string;
  action:       string;
  resourceType: string;
  resourceId:   string | null;
  outcome:      string;
  message:      string | null;
  actorEmail:   string | null;
  actorRole:    string | null;
  ipAddress:    string | null;
  userAgent:    string | null;
  before:       any;
  after:        any;
  createdAt:    Date | string;
}

interface Props {
  log:         AuditLogShape;
  actionLabel: string;
  trigger:     React.ReactNode;
}

export function AuditDetailDialog({ log, actionLabel, trigger }: Props) {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (!open) return;
    const h = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    window.addEventListener("keydown", h);
    return () => window.removeEventListener("keydown", h);
  }, [open]);

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="contents"
      >
        {trigger}
      </button>

      {open && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
          onClick={() => setOpen(false)}
        >
          <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" />
          <div
            className="relative bg-card border border-border rounded-2xl shadow-2xl w-full max-w-3xl max-h-[90vh] flex flex-col overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="flex items-start justify-between px-6 py-4 border-b border-border">
              <div>
                <h2 className="text-base font-semibold">{actionLabel}</h2>
                <p className="text-xs text-muted-foreground mt-0.5">
                  <span className="font-mono">{log.resourceType}</span>
                  {log.resourceId && <span> · {log.resourceId}</span>}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="text-muted-foreground hover:text-foreground p-1 -mr-1 rounded-md hover:bg-secondary/50"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            {/* Body */}
            <div className="flex-1 overflow-y-auto px-6 py-5 space-y-5">
              {/* Aktor-blok */}
              <div className="bg-secondary/30 rounded-lg p-4 space-y-2">
                <h3 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-2">
                  Aktør & request
                </h3>
                <Row icon={UserIcon} label="Aktør"     value={log.actorEmail ?? "system"} />
                {log.actorRole && <Row icon={UserIcon} label="Rolle"     value={log.actorRole} />}
                <Row icon={Clock}    label="Tidspunkt" value={new Date(log.createdAt).toLocaleString("da-DK")} />
                {log.ipAddress && <Row icon={Globe} label="IP" value={log.ipAddress} />}
                {log.userAgent && (
                  <div className="flex items-start gap-2 text-xs">
                    <Globe className="h-3.5 w-3.5 text-muted-foreground mt-0.5 shrink-0" />
                    <div className="min-w-0">
                      <span className="text-muted-foreground">User-Agent:</span>{" "}
                      <span className="font-mono text-[11px] break-all">{log.userAgent}</span>
                    </div>
                  </div>
                )}
                <Row icon={Hash} label="Audit-ID" value={log.id} mono />
              </div>

              {/* Outcome + besked */}
              <div>
                <div className="flex items-center gap-2 mb-2">
                  <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-medium ${
                    log.outcome === "success" ? "bg-emerald-100 text-emerald-700" :
                    log.outcome === "denied"  ? "bg-amber-100 text-amber-700" :
                                                "bg-red-100 text-red-700"
                  }`}>
                    {log.outcome.toUpperCase()}
                  </span>
                  {log.message && (
                    <p className="text-sm text-foreground">{log.message}</p>
                  )}
                </div>
              </div>

              {/* Before/After diff */}
              {(log.before || log.after) && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {log.before && (
                    <JsonPanel
                      title="Før"
                      tone="rose"
                      json={log.before}
                    />
                  )}
                  {log.after && (
                    <JsonPanel
                      title="Efter"
                      tone="emerald"
                      json={log.after}
                    />
                  )}
                </div>
              )}

              {!log.before && !log.after && (
                <p className="text-xs text-muted-foreground italic">
                  Ingen før/efter-snapshot gemt på dette event.
                </p>
              )}
            </div>

            {/* Footer */}
            <div className="px-6 py-3 border-t border-border bg-secondary/20 flex justify-end">
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="text-sm font-medium px-3 py-1.5 rounded-md hover:bg-secondary/50 transition-colors"
              >
                Luk
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

// ─── Sub-components ──────────────────────────────────────────

function Row({ icon: Icon, label, value, mono = false }: { icon: any; label: string; value: string; mono?: boolean }) {
  return (
    <div className="flex items-center gap-2 text-xs">
      <Icon className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
      <span className="text-muted-foreground">{label}:</span>
      <span className={mono ? "font-mono text-[11px]" : "text-foreground"}>{value}</span>
    </div>
  );
}

function JsonPanel({ title, tone, json }: { title: string; tone: "rose" | "emerald"; json: any }) {
  const ring = tone === "rose"
    ? "border-rose-200 bg-rose-50/30"
    : "border-emerald-200 bg-emerald-50/30";
  const labelTone = tone === "rose" ? "text-rose-700" : "text-emerald-700";

  return (
    <div className={`rounded-lg border ${ring} overflow-hidden`}>
      <div className="px-3 py-2 flex items-center gap-1.5 border-b border-current/10">
        <Code className={`h-3 w-3 ${labelTone}`} />
        <p className={`text-xs font-semibold ${labelTone}`}>{title}</p>
      </div>
      <pre className="text-[10px] p-3 overflow-x-auto max-h-64 leading-relaxed">
        {JSON.stringify(json, null, 2)}
      </pre>
    </div>
  );
}
