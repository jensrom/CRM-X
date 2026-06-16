import { AppTopbar } from "@/components/layout/AppTopbar";
import { BackButton } from "@/components/shared/BackButton";
import { listEmailLogs, countByStatus } from "@/app/actions/email-log";
import {
  Mail, CheckCircle2, AlertTriangle, Send, User as UserIcon, Building2,
  FileSignature, Receipt, FileText, ChevronRight,
} from "lucide-react";
import Link from "next/link";

const PROVIDER_LABEL: Record<string, string> = {
  resend:    "System",
  microsoft: "Microsoft",
  google:    "Google",
  mailto:    "Mailto",
};

const PROVIDER_TONE: Record<string, string> = {
  resend:    "bg-violet-50 text-violet-700 border-violet-200",
  microsoft: "bg-blue-50 text-blue-700 border-blue-200",
  google:    "bg-rose-50 text-rose-700 border-rose-200",
  mailto:    "bg-slate-50 text-slate-700 border-slate-200",
};

const STATUS_TONE: Record<string, { label: string; tone: string; icon: any }> = {
  sent:      { label: "Sendt",      tone: "bg-emerald-50 text-emerald-700 border-emerald-200", icon: CheckCircle2 },
  delivered: { label: "Leveret",    tone: "bg-emerald-50 text-emerald-700 border-emerald-200", icon: CheckCircle2 },
  failed:    { label: "Fejlede",    tone: "bg-red-50 text-red-700 border-red-200",             icon: AlertTriangle },
  bounced:   { label: "Returneret", tone: "bg-amber-50 text-amber-700 border-amber-200",       icon: AlertTriangle },
  queued:    { label: "I kø",       tone: "bg-slate-50 text-slate-700 border-slate-200",       icon: Send },
};

function resourceIcon(type: string | null) {
  switch (type) {
    case "quote":   return FileSignature;
    case "invoice": return Receipt;
    case "invite":  return UserIcon;
    default:        return FileText;
  }
}

function resourceHref(type: string | null, id: string | null): string | null {
  if (!id) return null;
  if (type === "quote")   return `/quotes/${id}`;
  if (type === "invoice") return `/invoices/${id}`;
  return null;
}

export default async function EmailLogPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string; provider?: string; search?: string; mine?: string }>;
}) {
  const sp = await searchParams;
  const filter = {
    status:   (sp.status as any) || null,
    provider: (sp.provider as any) || null,
    search:   sp.search || null,
    onlyMine: sp.mine === "1",
  };

  const [logs, counts] = await Promise.all([
    listEmailLogs(filter, 100),
    countByStatus(),
  ]);

  return (
    <>
      <AppTopbar pageTitle="Email-log" />
      <BackButton href="/settings/email" />

      <div className="max-w-5xl space-y-5">
        <header>
          <h1 className="text-2xl font-semibold mb-1">Email-historik</h1>
          <p className="text-sm text-muted-foreground">
            Audit-spor over alle mails sendt fra CRM-X — system-mails, tilbud, fakturaer og invites.
          </p>
        </header>

        {/* KPI strimmel */}
        <div className="grid grid-cols-3 gap-3">
          <KpiCard label="Total" value={counts.total} icon={Mail} tone="primary" />
          <KpiCard label="Sendt / leveret" value={counts.sent} icon={CheckCircle2} tone="emerald" />
          <KpiCard label="Fejlede" value={counts.failed} icon={AlertTriangle} tone={counts.failed > 0 ? "amber" : "slate"} />
        </div>

        {/* Filtre */}
        <div className="flex items-center gap-2 flex-wrap">
          <FilterChip href="/settings/email-log" label="Alle" active={!filter.status && !filter.provider && !filter.onlyMine} />
          <FilterChip href="/settings/email-log?status=sent" label="Kun sendt" active={filter.status === "sent"} />
          <FilterChip href="/settings/email-log?status=failed" label="Kun fejlede" active={filter.status === "failed"} />
          <span className="text-xs text-muted-foreground mx-1">·</span>
          <FilterChip href="/settings/email-log?provider=resend" label="System (Resend)" active={filter.provider === "resend"} />
          <FilterChip href="/settings/email-log?provider=microsoft" label="Microsoft" active={filter.provider === "microsoft"} />
          <FilterChip href="/settings/email-log?provider=google" label="Google" active={filter.provider === "google"} />
          <span className="text-xs text-muted-foreground mx-1">·</span>
          <FilterChip href="/settings/email-log?mine=1" label="Kun mine" active={filter.onlyMine} />
        </div>

        {/* Liste */}
        {logs.length === 0 ? (
          <div className="bg-card border border-border rounded-xl p-12 text-center">
            <Mail className="h-10 w-10 text-muted-foreground/40 mx-auto mb-3" />
            <p className="font-semibold mb-1">Ingen mails matcher filteret</p>
            <p className="text-sm text-muted-foreground">
              Når du sender et tilbud eller faktura, dukker det op her.
            </p>
          </div>
        ) : (
          <div className="bg-card border border-border rounded-xl overflow-hidden">
            <ul className="divide-y divide-border">
              {logs.map((log) => {
                const sMeta = STATUS_TONE[log.status] ?? STATUS_TONE.sent;
                const StatusIcon = sMeta.icon;
                const RIcon = resourceIcon(log.resourceType);
                const rHref = resourceHref(log.resourceType, log.resourceId);

                return (
                  <li key={log.id} className="hover:bg-secondary/30 transition-colors">
                    <div className="flex items-start gap-3 px-4 py-3">
                      <div className="w-8 h-8 rounded-lg bg-secondary/50 flex items-center justify-center shrink-0 mt-0.5">
                        <RIcon className="h-3.5 w-3.5 text-muted-foreground" />
                      </div>

                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap mb-0.5">
                          <p className="text-sm font-medium truncate max-w-md">{log.subject}</p>
                          <span className={`text-[10px] px-1.5 py-0.5 rounded border font-medium ${sMeta.tone}`}>
                            <StatusIcon className="inline h-2.5 w-2.5 mr-0.5" />
                            {sMeta.label}
                          </span>
                          <span className={`text-[10px] px-1.5 py-0.5 rounded border font-medium ${PROVIDER_TONE[log.provider] ?? "border-border"}`}>
                            {PROVIDER_LABEL[log.provider] ?? log.provider}
                          </span>
                        </div>
                        <p className="text-xs text-muted-foreground truncate">
                          <span className="font-mono">{log.fromAddress}</span>
                          {" → "}
                          <span className="font-mono">{log.toAddresses.join(", ")}</span>
                        </p>
                        <p className="text-[10px] text-muted-foreground mt-0.5">
                          {new Date(log.sentAt).toLocaleString("da-DK", {
                            day: "numeric", month: "short", year: "numeric",
                            hour: "2-digit", minute: "2-digit",
                          })}
                          {log.user && <> · af {log.user.name}</>}
                        </p>
                        {log.errorMessage && (
                          <p className="text-[11px] text-red-700 mt-1 truncate">
                            ⚠ {log.errorMessage}
                          </p>
                        )}
                      </div>

                      {rHref && (
                        <Link
                          href={rHref}
                          className="text-xs text-primary hover:text-primary/80 flex items-center gap-1 shrink-0 mt-1"
                        >
                          Åbn
                          <ChevronRight className="h-3 w-3" />
                        </Link>
                      )}
                    </div>
                  </li>
                );
              })}
            </ul>
          </div>
        )}

        <p className="text-xs text-muted-foreground px-1">
          Viser op til 100 seneste. Data-retention er 12 mdr i henhold til GDPR Art. 5(1)(e).
        </p>
      </div>
    </>
  );
}

// ─── Sub-components ───────────────────────────────────────────

function KpiCard({
  label, value, icon: Icon, tone,
}: {
  label: string; value: number; icon: any; tone: "primary" | "emerald" | "amber" | "slate";
}) {
  const colorMap: Record<string, { bg: string; text: string }> = {
    primary: { bg: "bg-primary/10",  text: "text-primary" },
    emerald: { bg: "bg-emerald-500/10", text: "text-emerald-600" },
    amber:   { bg: "bg-amber-500/10",   text: "text-amber-600" },
    slate:   { bg: "bg-slate-500/10",   text: "text-slate-600" },
  };
  const c = colorMap[tone];
  return (
    <div className="bg-card border border-border rounded-xl p-4 flex items-start justify-between">
      <div>
        <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">{label}</p>
        <p className="text-2xl font-bold tabular-nums mt-1">{value}</p>
      </div>
      <div className={`w-8 h-8 rounded-lg ${c.bg} flex items-center justify-center shrink-0`}>
        <Icon className={`h-4 w-4 ${c.text}`} />
      </div>
    </div>
  );
}

function FilterChip({ href, label, active }: { href: string; label: string; active: boolean }) {
  return (
    <Link
      href={href}
      className={`text-xs px-2.5 py-1 rounded-md border transition-colors ${
        active
          ? "bg-primary text-primary-foreground border-primary"
          : "border-border hover:bg-secondary/40 text-muted-foreground"
      }`}
    >
      {label}
    </Link>
  );
}
