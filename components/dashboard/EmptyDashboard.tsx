/**
 * EmptyDashboard — friendly welcome med CTA-kort for nye tenants
 * ──────────────────────────────────────────────────────────────
 * Vises NAAR onboarding er faerdig men der endnu ikke er nogen data.
 *
 * UX-aftaler:
 *   • Hilsen + tydeligt "her er hvad du kan goere foerst"-CTA-grid
 *   • Hvert kort har ikon, kort beskrivelse, og direkte link til opret-flow
 *   • Sorteret efter typisk first-step-rækkefoelge (kunde → produkt → tilbud)
 *   • Footer-link til import-flow for dem der har eksisterende data
 */

import Link from "next/link";
import {
  Sparkles, Building2, Tag, FileSignature, FolderKanban,
  Ticket as TicketIcon, Users, Upload, ArrowRight,
} from "lucide-react";

export function EmptyDashboard({
  userName,
  tenantName,
  modules,
}: {
  userName: string;
  tenantName?: string;
  modules: string[];
}) {
  const hasSales    = modules.includes("sales");
  const hasSupport  = modules.includes("support");
  const hasProjects = modules.includes("projects");

  return (
    <div className="space-y-8">
      {/* Hero */}
      <div className="text-center py-8">
        <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-gradient-to-br from-violet-500 to-emerald-500 mb-5">
          <Sparkles className="h-8 w-8 text-white" />
        </div>
        <h1 className="text-2xl font-bold mb-2">Velkommen, {userName}</h1>
        <p className="text-sm text-muted-foreground max-w-md mx-auto">
          {tenantName ? `${tenantName} er klar.` : "Du er klar."} Lad os få den første kunde,
          det første produkt og det første tilbud i systemet.
        </p>
      </div>

      {/* CTA-grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        <CtaCard
          icon={Building2}
          accent="primary"
          step={1}
          title="Opret din første kunde"
          description="Stamdata, kontaktpersoner, telefon — udgangspunktet for alt andet."
          href="/kunder?create=1"
          ctaLabel="Tilføj kunde"
        />
        <CtaCard
          icon={Tag}
          accent="violet"
          step={2}
          title="Opret et produkt"
          description="SaaS-licens, klippekort, eller engangskøb. Bruges på tilbud + fakturaer."
          href="/products/new"
          ctaLabel="Tilføj produkt"
        />
        {hasSales && (
          <CtaCard
            icon={FileSignature}
            accent="emerald"
            step={3}
            title="Send dit første tilbud"
            description="Tilbud med produkter, SaaS-pladser, klippekort — konverter til faktura med ét klik."
            href="/quotes/new"
            ctaLabel="Nyt tilbud"
          />
        )}
        {hasProjects && (
          <CtaCard
            icon={FolderKanban}
            accent="blue"
            step={4}
            title="Start et projekt"
            description="Knyt timer, deltagere og klippekort til en konkret indsats."
            href="/projects/new"
          />
        )}
        {hasSupport && (
          <CtaCard
            icon={TicketIcon}
            accent="amber"
            step={5}
            title="Opret en support-ticket"
            description="Prioritet, status og tidsregistrering i ét spor."
            href="/support/tickets/new"
          />
        )}
        <CtaCard
          icon={Users}
          accent="slate"
          step={6}
          title="Inviter dit team"
          description="Brugere, roller, og pladser. Konsulenter kan logge tid og kommentere tickets."
          href="/settings/users"
        />
      </div>

      {/* Import-fodnote */}
      <div className="text-center pt-4">
        <Link
          href="/kunder/import"
          className="inline-flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors"
        >
          <Upload className="h-3 w-3" />
          Har du eksisterende kunder? Importér fra CSV →
        </Link>
      </div>
    </div>
  );
}

// ─── CTA-card ────────────────────────────────────────────────

function CtaCard({
  icon: Icon, accent, step, title, description, href, ctaLabel = "Kom i gang",
}: {
  icon: any;
  accent: "primary" | "emerald" | "violet" | "blue" | "amber" | "slate";
  step: number;
  title: string;
  description: string;
  href: string;
  ctaLabel?: string;
}) {
  const accentClasses: Record<string, { bg: string; text: string; ring: string }> = {
    primary: { bg: "bg-primary/10",     text: "text-primary",     ring: "group-hover:ring-primary/30" },
    emerald: { bg: "bg-emerald-500/10", text: "text-emerald-600", ring: "group-hover:ring-emerald-500/30" },
    violet:  { bg: "bg-violet-500/10",  text: "text-violet-600",  ring: "group-hover:ring-violet-500/30" },
    blue:    { bg: "bg-blue-500/10",    text: "text-blue-600",    ring: "group-hover:ring-blue-500/30" },
    amber:   { bg: "bg-amber-500/10",   text: "text-amber-600",   ring: "group-hover:ring-amber-500/30" },
    slate:   { bg: "bg-slate-500/10",   text: "text-slate-600",   ring: "group-hover:ring-slate-500/30" },
  };
  const a = accentClasses[accent];

  return (
    <Link
      href={href}
      className={`group bg-card border border-border rounded-xl p-5 hover:shadow-sm hover:border-primary/30 transition-all flex flex-col`}
    >
      <div className="flex items-start justify-between mb-3">
        <div className={`w-10 h-10 rounded-xl ${a.bg} flex items-center justify-center ring-0 ${a.ring} transition-shadow`}>
          <Icon className={`h-5 w-5 ${a.text}`} />
        </div>
        <span className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground bg-secondary/40 px-2 py-0.5 rounded-full">
          Trin {step}
        </span>
      </div>
      <h3 className="text-sm font-semibold mb-1">{title}</h3>
      <p className="text-xs text-muted-foreground leading-relaxed flex-1 mb-3">{description}</p>
      <div className="flex items-center gap-1.5 text-xs font-medium text-primary group-hover:gap-2 transition-all">
        {ctaLabel}
        <ArrowRight className="h-3 w-3" />
      </div>
    </Link>
  );
}
