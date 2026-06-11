import Link from "next/link";
import { ShieldCheck, ExternalLink, Globe, Database, Send, Github, Sparkles } from "lucide-react";

export const metadata = {
  title: "Sub-processors — Plesner Tech",
  description: "Fortegnelse over Plesner Techs sub-processors i forbindelse med CRM-X.",
};

interface SubProcessor {
  name: string;
  service: string;
  dataCategories: string;
  location: string;
  certifications: string[];
  website: string;
  icon: React.ElementType;
}

const SUBPROCESSORS: SubProcessor[] = [
  {
    name: "Neon",
    service: "PostgreSQL hosting — primær database for alle tenant-data",
    dataCategories: "Alle tenant-data (firmaer, kontakter, tickets, projekter, fakturaer, audit-log)",
    location: "EU — Frankfurt (eu-central-1)",
    certifications: ["SOC 2 Type II", "ISO 27001"],
    website: "https://neon.tech",
    icon: Database,
  },
  {
    name: "Vercel",
    service: "Application hosting + CDN + edge functions",
    dataCategories: "Request/response-trafik, build-artefakter, deployment-logs",
    location: "EU (Frankfurt) + global edge",
    certifications: ["SOC 2 Type II", "ISO 27001", "HIPAA"],
    website: "https://vercel.com",
    icon: Globe,
  },
  {
    name: "Resend",
    service: "Transactional e-mail (notifikationer, invitationer)",
    dataCategories: "Modtager-email, afsender-info, indhold af mail",
    location: "EU/US",
    certifications: ["SOC 2 Type II"],
    website: "https://resend.com",
    icon: Send,
  },
  {
    name: "GitHub (Microsoft)",
    service: "Kildekode-hosting og version control",
    dataCategories: "Kildekode — ingen produktions-data",
    location: "US",
    certifications: ["SOC 2 Type II", "ISO 27001", "FedRAMP Moderate"],
    website: "https://github.com",
    icon: Github,
  },
  {
    name: "Anthropic",
    service: "AI-assisteret udvikling (Claude)",
    dataCategories: "Kildekode i developer-prompts — ingen kunde-data",
    location: "US",
    certifications: ["SOC 2 Type II", "Enterprise data protection"],
    website: "https://anthropic.com",
    icon: Sparkles,
  },
];

export default function SubprocessorsPage() {
  const lastUpdated = "2026-06-03";

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b border-border bg-card">
        <div className="max-w-4xl mx-auto px-6 py-4 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center">
              <span className="text-white font-bold text-sm">CX</span>
            </div>
            <span className="font-semibold">CRM-X</span>
          </Link>
          <Link href="/" className="text-sm text-muted-foreground hover:text-foreground transition-colors">
            ← Tilbage
          </Link>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-6 py-10 space-y-8">
        {/* Title */}
        <div>
          <div className="flex items-center gap-3 mb-3">
            <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
              <ShieldCheck className="h-5 w-5 text-primary" />
            </div>
            <div>
              <h1 className="text-2xl font-bold">Sub-processors</h1>
              <p className="text-sm text-muted-foreground">
                Senest opdateret: {lastUpdated}
              </p>
            </div>
          </div>
          <p className="text-sm text-muted-foreground leading-relaxed mt-4 max-w-2xl">
            Plesner Tech anvender følgende tredjepartsleverandører til at levere CRM-X.
            Listen er bindende og opdateres ved enhver ændring. Vi giver mindst 14 dages
            varsel om nye sub-processors. Vores kunder kan abonnere på ændringer via
            kontaktpunktet nederst på denne side.
          </p>
        </div>

        {/* Liste */}
        <div className="space-y-3">
          {SUBPROCESSORS.map((sp) => (
            <div
              key={sp.name}
              className="bg-card border border-border rounded-xl p-5 hover:border-primary/40 transition-colors"
            >
              <div className="flex items-start gap-4">
                <div className="w-10 h-10 rounded-xl bg-secondary flex items-center justify-center shrink-0">
                  <sp.icon className="h-5 w-5 text-foreground" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1 flex-wrap">
                    <h3 className="font-semibold text-base">{sp.name}</h3>
                    <a
                      href={sp.website}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-xs text-primary hover:underline flex items-center gap-1"
                    >
                      {sp.website.replace("https://", "")}
                      <ExternalLink className="h-3 w-3" />
                    </a>
                  </div>
                  <p className="text-sm text-foreground mb-2">{sp.service}</p>
                  <dl className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-1.5 text-xs">
                    <div>
                      <dt className="text-muted-foreground">Data-kategorier</dt>
                      <dd className="text-foreground">{sp.dataCategories}</dd>
                    </div>
                    <div>
                      <dt className="text-muted-foreground">Lokation</dt>
                      <dd className="text-foreground">{sp.location}</dd>
                    </div>
                    <div className="sm:col-span-2">
                      <dt className="text-muted-foreground">Certificeringer</dt>
                      <dd className="flex flex-wrap gap-1.5 mt-1">
                        {sp.certifications.map((c) => (
                          <span
                            key={c}
                            className="inline-flex items-center gap-1 text-[11px] bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 px-2 py-0.5 rounded-md font-medium"
                          >
                            <ShieldCheck className="h-2.5 w-2.5" />
                            {c}
                          </span>
                        ))}
                      </dd>
                    </div>
                  </dl>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Tredje-lands-overførsler */}
        <div className="bg-card border border-border rounded-xl p-5">
          <h2 className="text-sm font-semibold mb-2">Tredje-lands-overførsler</h2>
          <p className="text-sm text-muted-foreground leading-relaxed">
            Hvor data overføres uden for EU/EØS anvender vi EU Kommissionens{" "}
            <strong className="text-foreground">Standard Contractual Clauses</strong> (2021-version) suppleret af tekniske og
            organisatoriske foranstaltninger som krævet af Schrems II-dommen.
          </p>
        </div>

        {/* Notifikation-tilmelding */}
        <div className="bg-primary/5 border border-primary/20 rounded-xl p-5">
          <h2 className="text-sm font-semibold mb-2">Abonnér på opdateringer</h2>
          <p className="text-sm text-muted-foreground leading-relaxed mb-3">
            Som kunde kan du modtage e-mail-notifikation ved ændringer i sub-processor-listen.
            Send en mail til{" "}
            <a href="mailto:compliance@plesnertech.dk" className="text-primary hover:underline">
              compliance@plesnertech.dk
            </a>{" "}
            for at blive tilmeldt.
          </p>
        </div>
      </main>

      <footer className="border-t border-border bg-card mt-10">
        <div className="max-w-4xl mx-auto px-6 py-6 text-xs text-muted-foreground flex items-center justify-between">
          <span>© Plesner Tech</span>
          <div className="flex items-center gap-4">
            <Link href="/legal/subprocessors" className="hover:text-foreground transition-colors">
              Sub-processors
            </Link>
            <Link href="/legal/privacy" className="hover:text-foreground transition-colors">
              Privatlivspolitik
            </Link>
            <Link href="/legal/terms" className="hover:text-foreground transition-colors">
              Vilkår
            </Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
