import { AppTopbar } from "@/components/layout/AppTopbar";
import { PageHeader } from "@/components/shared/PageHeader";
import { BackButton } from "@/components/shared/BackButton";
import { db } from "@/lib/db";
import { auth } from "@/lib/auth";
import {
  ShieldCheck,
  Download,
  Trash2,
  FileText,
  AlertCircle,
  ExternalLink,
  CheckCircle2,
} from "lucide-react";
import Link from "next/link";
import { GdprContactPicker } from "@/components/compliance/GdprContactPicker";

export const metadata = {
  title: "Compliance & GDPR — CRM-X",
};

export default async function CompliancePage() {
  const session = await auth();
  if (!session?.user?.tenantId) return null;
  const tenantId = session.user.tenantId;

  const [contactsCount, lastExport, lastErase] = await Promise.all([
    db.contact.count({ where: { tenantId, isActive: true } }),
    db.auditLog.findFirst({
      where: { tenantId, action: "export" },
      orderBy: { createdAt: "desc" },
      select: { createdAt: true, actorEmail: true },
    }),
    db.auditLog.findFirst({
      where: { tenantId, action: "erase" },
      orderBy: { createdAt: "desc" },
      select: { createdAt: true, actorEmail: true },
    }),
  ]);

  const fmt = (d: Date | undefined | null) =>
    d ? new Intl.DateTimeFormat("da-DK", { dateStyle: "medium", timeStyle: "short" }).format(d) : "—";

  return (
    <>
      <AppTopbar pageTitle="Compliance & GDPR" />
      <BackButton href="/settings" label="Indstillinger" />
      <PageHeader
        title="Compliance & GDPR"
        description="Værktøjer til at opfylde dine forpligtelser efter GDPR Art. 15-22 (registreredes rettigheder)"
      />

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-5 max-w-5xl">
        {/* Status-strimmel */}
        <div className="xl:col-span-3 bg-card border border-border rounded-xl p-5">
          <div className="flex items-start gap-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-500/10 flex items-center justify-center shrink-0">
              <ShieldCheck className="h-5 w-5 text-emerald-600" />
            </div>
            <div className="flex-1">
              <p className="text-sm font-semibold">Persondata-beskyttelse er aktiveret</p>
              <p className="text-xs text-muted-foreground mt-0.5">
                Alle handlinger på persondata logges automatisk. Audit-spor opbevares i 13 måneder.
              </p>
            </div>
            <div className="hidden sm:flex items-center gap-2 text-xs text-muted-foreground">
              <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600" />
              Multi-tenant isolation
              <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600 ml-2" />
              TLS 1.3
              <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600 ml-2" />
              AES-256 at rest
            </div>
          </div>
        </div>

        {/* Eksporter data om en registreret */}
        <div className="xl:col-span-2 bg-card border border-border rounded-xl p-5 space-y-4">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <Download className="h-4 w-4 text-blue-600" />
              <h3 className="text-sm font-semibold">Eksportér data om en kontakt</h3>
            </div>
            <p className="text-xs text-muted-foreground">
              Henter alle data CRM-X har om en specifik kontakt — opfylder GDPR Art. 15 (indsigt) og Art. 20 (dataportabilitet).
              Eksporten leveres som JSON og kan udleveres direkte til den registrerede.
            </p>
          </div>

          <GdprContactPicker mode="export" tenantId={tenantId} />

          <div className="text-xs text-muted-foreground pt-3 border-t border-border">
            Sidste eksport: <span className="font-medium text-foreground">{fmt(lastExport?.createdAt)}</span>
            {lastExport?.actorEmail && <> af <span className="font-mono">{lastExport.actorEmail}</span></>}
          </div>
        </div>

        {/* Slet kontakt */}
        <div className="xl:col-span-1 bg-card border border-destructive/30 rounded-xl p-5 space-y-4">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <Trash2 className="h-4 w-4 text-destructive" />
              <h3 className="text-sm font-semibold">Slet og anonymisér</h3>
            </div>
            <p className="text-xs text-muted-foreground">
              GDPR Art. 17 — ret til at blive glemt. PII anonymiseres straks, hard-delete efter 30 dage.
            </p>
          </div>

          <GdprContactPicker mode="erase" tenantId={tenantId} />

          <div className="text-xs text-muted-foreground pt-3 border-t border-border">
            Sidste sletning: <span className="font-medium text-foreground">{fmt(lastErase?.createdAt)}</span>
          </div>
        </div>

        {/* Adviseringer */}
        <div className="xl:col-span-3 bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-800 rounded-xl p-5">
          <div className="flex items-start gap-3">
            <AlertCircle className="h-5 w-5 text-amber-600 shrink-0 mt-0.5" />
            <div className="text-sm">
              <p className="font-semibold text-amber-900 dark:text-amber-200">Husk din anmeldelsespligt</p>
              <p className="text-amber-800 dark:text-amber-300 mt-1">
                Brud på persondatasikkerheden skal anmeldes til Datatilsynet inden 72 timer (GDPR Art. 33).
                Plesner Tech notificerer dig som tenant inden 24 timer ved brud på platformen.
              </p>
            </div>
          </div>
        </div>

        {/* Ressourcer */}
        <div className="xl:col-span-3 grid grid-cols-1 sm:grid-cols-3 gap-3">
          <a
            href="https://www.datatilsynet.dk/sikkerhedsbrud/anmeldelse-af-brud-paa-persondatasikkerheden"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center justify-between p-4 bg-card border border-border rounded-xl hover:border-primary/40 transition-colors group"
          >
            <div className="flex items-center gap-3">
              <FileText className="h-4 w-4 text-muted-foreground" />
              <div>
                <p className="text-xs font-medium">Anmeld brud</p>
                <p className="text-[11px] text-muted-foreground">Datatilsynet</p>
              </div>
            </div>
            <ExternalLink className="h-3.5 w-3.5 text-muted-foreground group-hover:text-primary transition-colors" />
          </a>
          <Link
            href="/legal/subprocessors"
            className="flex items-center justify-between p-4 bg-card border border-border rounded-xl hover:border-primary/40 transition-colors group"
          >
            <div className="flex items-center gap-3">
              <FileText className="h-4 w-4 text-muted-foreground" />
              <div>
                <p className="text-xs font-medium">Sub-processors</p>
                <p className="text-[11px] text-muted-foreground">Plesner Techs leverandører</p>
              </div>
            </div>
            <ExternalLink className="h-3.5 w-3.5 text-muted-foreground group-hover:text-primary transition-colors" />
          </Link>
          <Link
            href="/settings/audit"
            className="flex items-center justify-between p-4 bg-card border border-border rounded-xl hover:border-primary/40 transition-colors group"
          >
            <div className="flex items-center gap-3">
              <FileText className="h-4 w-4 text-muted-foreground" />
              <div>
                <p className="text-xs font-medium">Audit-log</p>
                <p className="text-[11px] text-muted-foreground">{contactsCount} kontakter under behandling</p>
              </div>
            </div>
            <ExternalLink className="h-3.5 w-3.5 text-muted-foreground group-hover:text-primary transition-colors" />
          </Link>
        </div>
      </div>
    </>
  );
}
