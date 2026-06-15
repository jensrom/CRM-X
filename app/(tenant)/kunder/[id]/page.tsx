import { getCompanyFull } from "@/app/actions/companies";
import { AppTopbar } from "@/components/layout/AppTopbar";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/shared/EmptyState";
import { notFound } from "next/navigation";
import Link from "next/link";
import {
  Building2, Phone, Mail, Globe, MapPin, Hash,
  Users, Package, Ticket as TicketIcon, Pencil, ChevronRight,
  Key, FolderKanban, Scissors, Receipt, Activity as ActivityIcon, Plus,
  CheckCircle2, XCircle, AlertTriangle, Clock,
} from "lucide-react";
import { formatDate, formatCurrency, TICKET_STATUS, TICKET_PRIORITY, formatRef, PROJECT_STATUS, INVOICE_STATUS, formatIndustry } from "@/lib/utils";
import { BackButton } from "@/components/shared/BackButton";
import { CompanyTabBar, type CompanyTabKey } from "@/components/companies/CompanyTabBar";
import { DeleteCompanyDialog } from "@/components/companies/DeleteCompanyDialog";
import { CreatorBadge } from "@/components/shared/CreatorBadge";
import { getProductType } from "@/lib/product-types";
import { BILLING_INTERVALS, lineTotal } from "@/lib/billing-intervals";

export default async function CompanyDetailPage({
  params, searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ tab?: string }>;
}) {
  const { id } = await params;
  const sp = await searchParams;
  const company = await getCompanyFull(id);
  if (!company) notFound();

  const tab = (sp.tab as CompanyTabKey) || "overblik";
  const invoiceEmail = (company as any).invoiceEmail as string | null;

  const counts = {
    produkter:  company.customerProducts.length,
    licenser:   company.licenses.length,
    projekter:  company.projects.length,
    tickets:    company.tickets.length,
    klippekort: company.hourBundles.length,
    fakturaer:  company.invoices.length,
    aktivitet:  company.activities.length,
  };

  return (
    <>
      <AppTopbar pageTitle={company.name} />
      <BackButton href="/kunder" label="Kunder" />
      <div className="flex items-center gap-2 text-sm text-muted-foreground mb-5">
        <Link href="/kunder" className="hover:text-foreground transition-colors">Kunder</Link>
        <ChevronRight className="h-3.5 w-3.5" />
        <span className="text-foreground font-medium">{company.name}</span>
      </div>

      <CompanyHeader company={company} invoiceEmail={invoiceEmail} />
      <CompanyTabBar counts={counts} basePath={`/kunder/${company.id}`} />

      {tab === "overblik"   && <OverblikTab company={company} />}
      {tab === "produkter"  && <ProdukterTab company={company} />}
      {tab === "licenser"   && <LicenserTab company={company} />}
      {tab === "projekter"  && <ProjekterTab company={company} />}
      {tab === "tickets"    && <TicketsTab   company={company} />}
      {tab === "klippekort" && <KlippekortTab company={company} />}
      {tab === "fakturaer"  && <FakturaerTab company={company} />}
      {tab === "aktivitet"  && <AktivitetTab company={company} />}
    </>
  );
}

function CompanyHeader({ company, invoiceEmail }: { company: any; invoiceEmail: string | null }) {
  return (
    <div className="bg-card border border-border rounded-xl p-5 mb-5">
      <div className="flex items-start justify-between mb-4">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center">
            <Building2 className="h-6 w-6 text-primary" />
          </div>
          <div>
            <h2 className="text-lg font-semibold">{company.name}</h2>
            {company.industry && <p className="text-xs text-muted-foreground">{formatIndustry(company.industry)}</p>}
            <div className="mt-1">
              <CreatorBadge
                createdById={(company as any).createdById}
                createdByImpersonatorId={(company as any).createdByImpersonatorId}
                createdAt={company.createdAt}
              />
            </div>
          </div>
        </div>
        <div className="flex items-center gap-1">
          <Link href={`/kunder/${company.id}/edit`}>
            <Button variant="ghost" size="sm"><Pencil className="h-3.5 w-3.5" /> Rediger</Button>
          </Link>
          <DeleteCompanyDialog
            companyId={company.id}
            companyName={company.name}
            openTicketsCount={company.tickets.filter((t: any) => t.status !== "closed").length}
            activeProjectsCount={company.projects.filter((p: any) => p.status === "active").length}
          />
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-sm">
        {company.orgNumber && <InfoCell icon={Hash} label="CVR" value={company.orgNumber} />}
        {company.phone && <InfoCell icon={Phone} label="Telefon" value={<a href={`tel:${company.phone}`} className="text-primary hover:underline">{company.phone}</a>} />}
        {company.email && <InfoCell icon={Mail} label="E-mail" value={<a href={`mailto:${company.email}`} className="text-primary hover:underline truncate">{company.email}</a>} />}
        {invoiceEmail && <InfoCell icon={Mail} label="Faktura" value={<a href={`mailto:${invoiceEmail}`} className="text-emerald-700 hover:underline truncate">{invoiceEmail}</a>} />}
        {company.website && <InfoCell icon={Globe} label="Website" value={<a href={company.website} target="_blank" rel="noopener noreferrer" className="text-primary hover:underline truncate">{company.website}</a>} />}
        {(company.address || company.city) && <InfoCell icon={MapPin} label="Adresse" value={<span className="text-foreground">{company.address && <>{company.address}</>}{company.city && <>, {company.zipCode} {company.city}</>}</span>} />}
      </div>

      {company.notes && (
        <div className="mt-4 pt-4 border-t border-border">
          <p className="text-xs text-muted-foreground font-medium mb-1">Noter</p>
          <p className="text-sm whitespace-pre-wrap">{company.notes}</p>
        </div>
      )}
    </div>
  );
}

function InfoCell({ icon: Icon, label, value }: { icon: any; label: string; value: React.ReactNode }) {
  return (
    <div className="flex items-start gap-2">
      <Icon className="h-3.5 w-3.5 text-muted-foreground shrink-0 mt-0.5" />
      <div className="min-w-0">
        <p className="text-[11px] text-muted-foreground uppercase tracking-wide">{label}</p>
        <div className="text-sm truncate">{value}</div>
      </div>
    </div>
  );
}

function OverblikTab({ company }: { company: any }) {
  const activeProducts = company.customerProducts.filter((p: any) => p.isActive);
  const activeLicenses = company.licenses.filter((l: any) => !l.expiresAt || new Date(l.expiresAt) > new Date());
  const openTickets = company.tickets.filter((t: any) => t.status !== "closed");
  const activeProjects = company.projects.filter((p: any) => p.status === "active");

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      <Section title={`Kontakter (${company.contacts.length})`} icon={Users}
        action={<Link href={`/contacts/new?companyId=${company.id}`}><Button variant="ghost" size="sm"><Plus className="h-3.5 w-3.5" />Tilføj</Button></Link>}>
        {company.contacts.length === 0
          ? <EmptyState icon={Users} title="Ingen kontakter" description="Tilføj en kontaktperson hos kunden." />
          : <div className="divide-y divide-border bg-card rounded-xl border border-border">
              {company.contacts.slice(0, 8).map((c: any) => (
                <Link key={c.id} href={`/contacts/${c.id}`} className="flex items-center gap-3 px-4 py-2.5 hover:bg-secondary/30 transition-colors">
                  <div className="w-7 h-7 rounded-full bg-primary/10 flex items-center justify-center text-[11px] font-semibold text-primary shrink-0">
                    {c.firstName?.[0]}{c.lastName?.[0]}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{c.firstName} {c.lastName}</p>
                    {c.title && <p className="text-xs text-muted-foreground truncate">{c.title}</p>}
                  </div>
                </Link>
              ))}
            </div>}
      </Section>

      <Section title={`Aktive produkter (${activeProducts.length})`} icon={Package}
        action={<Link href={`/kunder/${company.id}?tab=produkter`}><Button variant="ghost" size="sm">Se alle</Button></Link>}>
        {activeProducts.length === 0
          ? <EmptyState icon={Package} title="Ingen aktive produkter" description="Tilkobl et produkt fra produkt-tab'en." />
          : <div className="space-y-2">
              {activeProducts.slice(0, 5).map((cp: any) => <ProductSummaryCard key={cp.id} cp={cp} />)}
            </div>}
      </Section>

      <Section title="Status" icon={ActivityIcon}>
        <div className="grid grid-cols-2 gap-3">
          <StatCard label="Åbne tickets" value={openTickets.length} icon={TicketIcon} href={`/kunder/${company.id}?tab=tickets`} tone={openTickets.length > 0 ? "amber" : "neutral"} />
          <StatCard label="Aktive projekter" value={activeProjects.length} icon={FolderKanban} href={`/kunder/${company.id}?tab=projekter`} />
          <StatCard label="Aktive licenser" value={activeLicenses.length} icon={Key} href={`/kunder/${company.id}?tab=licenser`} />
          <StatCard label="Klippekort" value={company.hourBundles.filter((b: any) => b.isActive).length} icon={Scissors} href={`/kunder/${company.id}?tab=klippekort`} />
        </div>
      </Section>
    </div>
  );
}

function ProdukterTab({ company }: { company: any }) {
  const active = company.customerProducts.filter((p: any) => p.isActive);
  const inactive = company.customerProducts.filter((p: any) => !p.isActive);
  return (
    <div className="space-y-6">
      <Section title={`Aktive produkter (${active.length})`} icon={Package}
        action={<Link href={`/kunder/${company.id}/products/add`}><Button size="sm"><Plus className="h-3.5 w-3.5" /> Tilkobl produkt</Button></Link>}>
        {active.length === 0
          ? <EmptyState icon={Package} title="Ingen aktive produkter" description="Tilkobl et SaaS-produkt, en licens eller en konsulentydelse." />
          : <div className="grid grid-cols-1 md:grid-cols-2 gap-3">{active.map((cp: any) => <ProductRowCard key={cp.id} cp={cp} />)}</div>}
      </Section>
      {inactive.length > 0 && (
        <Section title={`Udfasede produkter (${inactive.length})`} icon={XCircle} muted>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 opacity-70">{inactive.map((cp: any) => <ProductRowCard key={cp.id} cp={cp} />)}</div>
        </Section>
      )}
    </div>
  );
}

function ProductSummaryCard({ cp }: { cp: any }) {
  const pt = getProductType(cp.product.type);
  return (
    <Link href={`/products/${cp.product.id}`} className="block group">
      <div className="flex items-center gap-2 p-2.5 rounded-lg border border-border hover:border-primary/40 hover:bg-secondary/30 transition-colors">
        <Package className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium truncate group-hover:text-primary transition-colors">{cp.product.name}</p>
          <p className="text-xs text-muted-foreground">
            {cp.seats > 1 && <>{cp.seats} pladser &middot; </>}
            {pt && <span className={`inline-block px-1.5 rounded ${pt.badgeClass} text-[10px]`}>{pt.label}</span>}
          </p>
        </div>
        <ChevronRight className="h-3.5 w-3.5 text-muted-foreground" />
      </div>
    </Link>
  );
}

function ProductRowCard({ cp }: { cp: any }) {
  const pt = getProductType(cp.product.type);
  const pricingMode = cp.product.pricingMode ?? "per_unit";
  const matchedPricing = cp.product.pricing?.find((p: any) => p.interval === cp.pricingInterval) ?? cp.product.pricing?.[0];
  const unitPrice = matchedPricing ? Number(matchedPricing.price) : 0;
  const total = unitPrice > 0 ? lineTotal({ pricingMode, unitPrice, seats: cp.seats ?? 1, pricingInterval: cp.pricingInterval ?? "monthly", billingInterval: cp.billingInterval ?? "monthly" }) : 0;
  return (
    <Link href={`/products/${cp.product.id}`} className="block group">
      <div className="p-3 rounded-lg border border-border hover:border-primary/40 hover:bg-secondary/30 transition-colors">
        <div className="flex items-start justify-between mb-2">
          <div className="flex items-center gap-2 min-w-0">
            <Package className="h-4 w-4 text-muted-foreground shrink-0" />
            <p className="font-medium truncate group-hover:text-primary transition-colors">{cp.product.name}</p>
          </div>
          {pt && <span className={`text-[10px] px-1.5 py-0.5 rounded border ${pt.badgeClass} shrink-0`}>{pt.label}</span>}
        </div>
        <div className="grid grid-cols-2 gap-2 text-xs text-muted-foreground">
          <div>
            <p className="text-[10px] uppercase tracking-wide opacity-70">Pladser</p>
            <p className="text-foreground font-medium">{cp.seats ?? 1}</p>
          </div>
          <div>
            <p className="text-[10px] uppercase tracking-wide opacity-70">Faktureres</p>
            <p className="text-foreground font-medium">{BILLING_INTERVALS[cp.billingInterval as keyof typeof BILLING_INTERVALS]?.label ?? cp.billingInterval ?? "-"}</p>
          </div>
        </div>
        {total > 0 && (
          <p className="mt-2 pt-2 border-t border-border text-xs">
            <span className="text-muted-foreground">Total: </span>
            <span className="font-semibold text-foreground">{formatCurrency(total)}</span>
          </p>
        )}
        {cp.department && <p className="text-[11px] text-muted-foreground mt-1.5">Afdeling: {cp.department.name}</p>}
      </div>
    </Link>
  );
}

function LicenserTab({ company }: { company: any }) {
  const now = Date.now();
  const active = company.licenses.filter((l: any) => !l.expiresAt || new Date(l.expiresAt).getTime() > now);
  const expired = company.licenses.filter((l: any) => l.expiresAt && new Date(l.expiresAt).getTime() <= now);
  return (
    <div className="space-y-6">
      <Section title={`Aktive licenser (${active.length})`} icon={Key}
        action={<Link href={`/licenses/new?companyId=${company.id}`}><Button size="sm"><Plus className="h-3.5 w-3.5" /> Opret licens</Button></Link>}>
        {active.length === 0
          ? <EmptyState icon={Key} title="Ingen aktive licenser" description="Opret en licens for kunden - fx software-licens med udløb og fil-upload." />
          : <div className="divide-y divide-border bg-card rounded-xl border border-border">{active.map((l: any) => <LicenseRow key={l.id} l={l} from={`/kunder/${company.id}?tab=licenser`} />)}</div>}
      </Section>
      {expired.length > 0 && (
        <Section title={`Udløbet (${expired.length})`} icon={AlertTriangle} muted>
          <div className="divide-y divide-border bg-card rounded-xl border border-border opacity-70">{expired.map((l: any) => <LicenseRow key={l.id} l={l} expired from={`/kunder/${company.id}?tab=licenser`} />)}</div>
        </Section>
      )}
    </div>
  );
}

function LicenseRow({ l, expired, from }: { l: any; expired?: boolean; from?: string }) {
  const daysToExpiry = l.expiresAt ? Math.ceil((new Date(l.expiresAt).getTime() - Date.now()) / 86400000) : null;
  const warning = daysToExpiry !== null && daysToExpiry <= 30 && daysToExpiry > 0;
  const href = from ? `/licenses/${l.id}?from=${encodeURIComponent(from)}` : `/licenses/${l.id}`;
  return (
    <Link href={href} className="flex items-center gap-3 px-4 py-3 hover:bg-secondary/30 transition-colors">
      <Key className={`h-4 w-4 shrink-0 ${expired ? "text-amber-600" : "text-primary"}`} />
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium truncate">{l.product?.name ?? l.name ?? "Licens"}</p>
        <p className="text-xs text-muted-foreground">
          {l.licenseKey && <>Nøgle: <span className="font-mono">{String(l.licenseKey).slice(0, 12)}...</span> &middot; </>}
          {l.expiresAt
            ? expired ? <>Udløbet {formatDate(l.expiresAt)}</>
            : <>Udløber {formatDate(l.expiresAt)}{warning && <span className="text-amber-700 font-medium"> &middot; om {daysToExpiry} dage</span>}</>
            : "Ingen udløb"}
        </p>
      </div>
      <ChevronRight className="h-4 w-4 text-muted-foreground" />
    </Link>
  );
}

function ProjekterTab({ company }: { company: any }) {
  const active = company.projects.filter((p: any) => p.status === "active" || p.status === "waiting");
  const closed = company.projects.filter((p: any) => ["closed", "completed", "cancelled"].includes(p.status));
  return (
    <div className="space-y-6">
      <Section title={`Aktive projekter (${active.length})`} icon={FolderKanban}
        action={<Link href={`/projects/new?companyId=${company.id}`}><Button size="sm"><Plus className="h-3.5 w-3.5" /> Nyt projekt</Button></Link>}>
        {active.length === 0
          ? <EmptyState icon={FolderKanban} title="Ingen aktive projekter" description="Opret et projekt for kunden." />
          : <div className="divide-y divide-border bg-card rounded-xl border border-border">{active.map((p: any) => <ProjectRow key={p.id} p={p} from={`/kunder/${company.id}?tab=projekter`} />)}</div>}
      </Section>
      {closed.length > 0 && (
        <Section title={`Afsluttede (${closed.length})`} icon={CheckCircle2} muted>
          <div className="divide-y divide-border bg-card rounded-xl border border-border opacity-80">{closed.map((p: any) => <ProjectRow key={p.id} p={p} closed from={`/kunder/${company.id}?tab=projekter`} />)}</div>
        </Section>
      )}
    </div>
  );
}

function ProjectRow({ p, closed, from }: { p: any; closed?: boolean; from?: string }) {
  const ref = p.tenant?.projectPrefix ? formatRef(p.tenant.projectPrefix, p.number) : `#${p.number}`;
  const href = from ? `/projects/${p.id}?from=${encodeURIComponent(from)}` : `/projects/${p.id}`;
  return (
    <Link href={href} className="flex items-center gap-3 px-4 py-3 hover:bg-secondary/30 transition-colors">
      <FolderKanban className={`h-4 w-4 shrink-0 ${closed ? "text-muted-foreground" : "text-primary"}`} />
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium truncate">{p.title}</p>
        <p className="text-xs text-muted-foreground">
          <span className="font-mono">{ref}</span>
          {p.assignedTo && <> &middot; {p.assignedTo.name}</>}
          {p._count?.timeLogs > 0 && <> &middot; {p._count.timeLogs} tidslogs</>}
        </p>
      </div>
      <span className={`text-[10px] px-1.5 py-0.5 rounded border ${TONE_BADGE[((PROJECT_STATUS as any)[p.status]?.color) ?? "muted"]}`}>
        {(PROJECT_STATUS as any)[p.status]?.label ?? p.status}
      </span>
      <ChevronRight className="h-4 w-4 text-muted-foreground" />
    </Link>
  );
}

function TicketsTab({ company }: { company: any }) {
  const open = company.tickets.filter((t: any) => t.status !== "closed");
  const closed = company.tickets.filter((t: any) => t.status === "closed");
  return (
    <div className="space-y-6">
      <Section title={`Åbne tickets (${open.length})`} icon={TicketIcon}
        action={<Link href={`/support/tickets/new?companyId=${company.id}`}><Button size="sm"><Plus className="h-3.5 w-3.5" /> Ny ticket</Button></Link>}>
        {open.length === 0
          ? <EmptyState icon={TicketIcon} title="Ingen åbne tickets" description="Alt er under kontrol - eller opret en ticket på kunden." />
          : <div className="divide-y divide-border bg-card rounded-xl border border-border">{open.map((t: any) => <TicketRow key={t.id} t={t} from={`/kunder/${company.id}?tab=tickets`} />)}</div>}
      </Section>
      {closed.length > 0 && (
        <Section title={`Lukkede tickets (${closed.length})`} icon={CheckCircle2} muted>
          <div className="divide-y divide-border bg-card rounded-xl border border-border opacity-70">{closed.slice(0, 20).map((t: any) => <TicketRow key={t.id} t={t} closed from={`/kunder/${company.id}?tab=tickets`} />)}</div>
        </Section>
      )}
    </div>
  );
}

const TONE_BADGE: Record<string, string> = {
  info:    "bg-blue-50 text-blue-700 border-blue-200",
  warning: "bg-amber-50 text-amber-700 border-amber-200",
  success: "bg-emerald-50 text-emerald-700 border-emerald-200",
  danger:  "bg-red-50 text-red-700 border-red-200",
  muted:   "bg-secondary text-muted-foreground border-border",
};

function TicketRow({ t, closed, from }: { t: any; closed?: boolean; from?: string }) {
  const stMeta = (TICKET_STATUS as any)[t.status];
  const prMeta = (TICKET_PRIORITY as any)[t.priority];
  const href = from ? `/support/tickets/${t.id}?from=${encodeURIComponent(from)}` : `/support/tickets/${t.id}`;
  return (
    <Link href={href} className="flex items-center gap-3 px-4 py-3 hover:bg-secondary/30 transition-colors">
      <TicketIcon className={`h-4 w-4 shrink-0 ${closed ? "text-muted-foreground" : "text-primary"}`} />
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium truncate">{t.subject ?? t.title ?? "Ticket"}</p>
        <p className="text-xs text-muted-foreground">
          T-{String(t.number).padStart(4, "0")}
          {t.product && <> &middot; {t.product.name}</>}
          {t.assignedTo && <> &middot; {t.assignedTo.name}</>}
        </p>
      </div>
      {prMeta?.label && <span className={`text-[10px] px-1.5 py-0.5 rounded border ${TONE_BADGE[prMeta.color] ?? TONE_BADGE.muted}`}>{prMeta.label}</span>}
      {stMeta?.label && <span className="text-xs text-muted-foreground">{stMeta.label}</span>}
      <ChevronRight className="h-4 w-4 text-muted-foreground" />
    </Link>
  );
}

function KlippekortTab({ company }: { company: any }) {
  const active = company.hourBundles.filter((b: any) => b.isActive);
  const used = company.hourBundles.filter((b: any) => !b.isActive);
  return (
    <div className="space-y-6">
      <Section title={`Aktive klippekort (${active.length})`} icon={Scissors}
        action={<Link href={`/klippekort/new?companyId=${company.id}`}><Button size="sm"><Plus className="h-3.5 w-3.5" /> Nyt klippekort</Button></Link>}>
        {active.length === 0
          ? <EmptyState icon={Scissors} title="Ingen aktive klippekort" description="Sælg en timepakke til kunden." />
          : <div className="grid grid-cols-1 md:grid-cols-2 gap-3">{active.map((b: any) => <BundleCard key={b.id} b={b} from={`/kunder/${company.id}?tab=klippekort`} />)}</div>}
      </Section>
      {used.length > 0 && (
        <Section title={`Opbrugte / inaktive (${used.length})`} icon={CheckCircle2} muted>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 opacity-70">{used.map((b: any) => <BundleCard key={b.id} b={b} from={`/kunder/${company.id}?tab=klippekort`} />)}</div>
        </Section>
      )}
    </div>
  );
}

function BundleCard({ b, from }: { b: any; from?: string }) {
  const ref = b.tenant?.bundlePrefix ? formatRef(b.tenant.bundlePrefix, b.number) : `KB-${b.number}`;
  const href = from ? `/klippekort/${b.id}?from=${encodeURIComponent(from)}` : `/klippekort/${b.id}`;
  const usedH = Math.round(b.usedMinutes / 60 * 10) / 10;
  const totalH = b.totalHours;
  const remH = Math.max(0, totalH - usedH);
  const pct = Math.min(100, (b.usedMinutes / (totalH * 60)) * 100);
  return (
    <Link href={href} className="block group">
      <div className="p-3 rounded-lg border border-border hover:border-primary/40 hover:bg-secondary/30 transition-colors">
        <div className="flex items-center justify-between mb-2">
          <p className="text-sm font-medium group-hover:text-primary transition-colors">{b.name ?? `${totalH} timers klippekort`}</p>
          <span className="font-mono text-xs text-muted-foreground">{ref}</span>
        </div>
        <div className="flex justify-between text-xs text-muted-foreground mb-1">
          <span>{usedH}t brugt</span>
          <span>{remH}t tilbage / {totalH}t</span>
        </div>
        <div className="h-1.5 bg-secondary rounded-full overflow-hidden">
          <div className={`h-full rounded-full ${pct >= 100 ? "bg-amber-500" : pct > 80 ? "bg-amber-400" : "bg-primary"}`} style={{ width: `${pct}%` }} />
        </div>
        {b.expiresAt && <p className="text-[11px] text-muted-foreground mt-1.5">Udløber {formatDate(b.expiresAt)}</p>}
      </div>
    </Link>
  );
}

function FakturaerTab({ company }: { company: any }) {
  if (company.invoices.length === 0) return <EmptyState icon={Receipt} title="Ingen fakturaer" description="Fakturaer genereret fra projekter eller tilbud vises her." />;
  return (
    <Section title={`Fakturaer (${company.invoices.length})`} icon={Receipt}>
      <div className="divide-y divide-border bg-card rounded-xl border border-border">
        {company.invoices.map((inv: any) => {
          const subtotal = inv.lines.reduce((s: number, l: any) => s + Number(l.quantity) * Number(l.unitPrice) * (1 - Number(l.discountPct ?? 0) / 100), 0);
          const total = inv.vatEnabled ? subtotal * (1 + Number(inv.vatPct) / 100) : subtotal;
          return (
            <Link key={inv.id} href={`/invoices/${inv.id}?from=${encodeURIComponent(`/kunder/${company.id}?tab=fakturaer`)}`} className="flex items-center gap-3 px-4 py-3 hover:bg-secondary/30 transition-colors">
              <Receipt className="h-4 w-4 text-muted-foreground" />
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium">F-{String(inv.number).padStart(4, "0")}</p>
                <p className="text-xs text-muted-foreground">{formatDate(inv.issueDate)}</p>
              </div>
              <span className={`text-[10px] px-1.5 py-0.5 rounded border ${TONE_BADGE[((INVOICE_STATUS as any)[inv.status]?.color) ?? "muted"]}`}>
                {(INVOICE_STATUS as any)[inv.status]?.label ?? inv.status}
              </span>
              <span className="text-sm font-semibold tabular-nums">{formatCurrency(total)}</span>
              <ChevronRight className="h-4 w-4 text-muted-foreground" />
            </Link>
          );
        })}
      </div>
    </Section>
  );
}

function AktivitetTab({ company }: { company: any }) {
  if (company.activities.length === 0) return <EmptyState icon={ActivityIcon} title="Ingen aktivitet" description="Møder, opkald, e-mails og noter på kunden vises her." />;
  return (
    <Section title={`Aktivitetslog (${company.activities.length})`} icon={ActivityIcon}>
      <ul className="divide-y divide-border bg-card rounded-xl border border-border">
        {company.activities.map((a: any) => (
          <li key={a.id} className="px-4 py-3">
            <div className="flex items-start gap-3">
              <Clock className="h-3.5 w-3.5 text-muted-foreground shrink-0 mt-1" />
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium">{a.subject}</p>
                {a.description && <p className="text-xs text-muted-foreground mt-0.5 whitespace-pre-wrap">{a.description}</p>}
                <p className="text-[11px] text-muted-foreground mt-1">{a.type} &middot; {a.user?.name ?? "-"} &middot; {formatDate(a.createdAt)}</p>
              </div>
            </div>
          </li>
        ))}
      </ul>
    </Section>
  );
}

function Section({ title, icon: Icon, children, action, muted }: { title: string; icon: any; children: React.ReactNode; action?: React.ReactNode; muted?: boolean; }) {
  return (
    <section>
      <header className="flex items-center justify-between mb-3">
        <h3 className={`text-sm font-semibold flex items-center gap-2 ${muted ? "text-muted-foreground" : ""}`}>
          <Icon className="h-4 w-4 text-muted-foreground" />
          {title}
        </h3>
        {action}
      </header>
      {children}
    </section>
  );
}

function StatCard({ label, value, icon: Icon, href, tone }: { label: string; value: number; icon: any; href?: string; tone?: "amber" | "neutral"; }) {
  const ring = tone === "amber" ? "border-amber-200 bg-amber-50/40" : "border-border bg-secondary/30";
  const inner = (
    <div className={`p-3 rounded-lg border ${ring} hover:bg-secondary/50 transition-colors`}>
      <div className="flex items-center gap-2 text-muted-foreground mb-1">
        <Icon className="h-3.5 w-3.5" />
        <span className="text-[11px] uppercase tracking-wide">{label}</span>
      </div>
      <p className="text-xl font-bold">{value}</p>
    </div>
  );
  return href ? <Link href={href}>{inner}</Link> : inner;
}
