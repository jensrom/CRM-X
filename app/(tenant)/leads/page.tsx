import { getLeads } from "@/app/actions/leads";
import { getCampaigns } from "@/app/actions/campaigns";
import { AppTopbar } from "@/components/layout/AppTopbar";
import { PageHeader } from "@/components/shared/PageHeader";
import { Button } from "@/components/ui/button";
import { Target, Plus, Building2, Mail, Phone, Megaphone } from "lucide-react";
import Link from "next/link";
import { formatDate } from "@/lib/utils";

const STATUS_COLS = [
  { key: "new",       label: "Nye",          bg: "bg-slate-50 dark:bg-slate-900/40 border-slate-200 dark:border-slate-800",       dot: "bg-slate-400",   badge: "bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300" },
  { key: "contacted", label: "Kontaktet",     bg: "bg-blue-50 dark:bg-blue-950/30 border-blue-200 dark:border-blue-900",            dot: "bg-blue-500",    badge: "bg-blue-100 dark:bg-blue-900/50 text-blue-700 dark:text-blue-300" },
  { key: "qualified", label: "Kvalificerede", bg: "bg-violet-50 dark:bg-violet-950/30 border-violet-200 dark:border-violet-900",    dot: "bg-violet-500",  badge: "bg-violet-100 dark:bg-violet-900/50 text-violet-700 dark:text-violet-300" },
  { key: "converted", label: "Konverteret",   bg: "bg-emerald-50 dark:bg-emerald-950/30 border-emerald-200 dark:border-emerald-900",dot: "bg-emerald-500", badge: "bg-emerald-100 dark:bg-emerald-900/50 text-emerald-700 dark:text-emerald-300" },
  { key: "lost",      label: "Tabte",         bg: "bg-red-50 dark:bg-rose-950/30 border-red-200 dark:border-rose-900",              dot: "bg-red-400",     badge: "bg-red-100 dark:bg-rose-900/50 text-red-700 dark:text-rose-300" },
];

const SOURCE_LABEL: Record<string, string> = {
  web: "Web", referral: "Anbefaling", event: "Event", "cold-call": "Cold call", other: "Andet",
};

export default async function LeadsPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string; campaignId?: string }>;
}) {
  const sp = await searchParams;
  const [leads, campaigns] = await Promise.all([
    getLeads({ status: sp.status, campaignId: sp.campaignId }),
    getCampaigns(),
  ]);

  const grouped = STATUS_COLS.map((col) => ({
    ...col,
    leads: leads.filter((l) => l.status === col.key),
  }));

  return (
    <>
      <AppTopbar pageTitle="Leads" />
      <PageHeader
        title="Leads"
        description={`${leads.length} leads`}
        actions={
          <a href="/leads/new">
            <Button size="sm"><Plus className="h-3.5 w-3.5" /> Nyt lead</Button>
          </a>
        }
      />

      {/* Kampagnefilter */}
      {campaigns.length > 0 && (
        <div className="flex flex-wrap gap-2 mb-5">
          <Link href="/leads" className={`px-3 py-1 rounded-lg text-xs font-medium border transition-colors ${!sp.campaignId ? "bg-primary text-primary-foreground border-primary" : "bg-card border-border hover:border-primary/40"}`}>
            Alle kampagner
          </Link>
          {campaigns.map((c) => (
            <Link key={c.id} href={`/leads?campaignId=${c.id}`}
              className={`px-3 py-1 rounded-lg text-xs font-medium border transition-colors ${sp.campaignId === c.id ? "bg-primary text-primary-foreground border-primary" : "bg-card border-border hover:border-primary/40"}`}>
              {c.name}
            </Link>
          ))}
        </div>
      )}

      {leads.length === 0 ? (
        <div className="bg-card border border-border rounded-xl p-16 text-center">
          <Target className="h-10 w-10 text-muted-foreground mx-auto mb-4" />
          <p className="font-semibold mb-1">Ingen leads endnu</p>
          <p className="text-sm text-muted-foreground mb-4">Tilføj leads manuelt eller via en kampagne.</p>
          <a href="/leads/new"><Button size="sm"><Plus className="h-3.5 w-3.5" /> Opret lead</Button></a>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-3 xl:grid-cols-5 gap-4 overflow-x-auto">
          {grouped.map((col) => (
            <div key={col.key} className={`rounded-xl border ${col.bg} p-3 min-w-[200px]`}>
              <div className="flex items-center gap-2 mb-3">
                <span className={`w-2 h-2 rounded-full ${col.dot}`} />
                <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">{col.label}</span>
                <span className="ml-auto text-xs text-muted-foreground">{col.leads.length}</span>
              </div>
              <div className="space-y-2">
                {col.leads.map((lead) => (
                  <Link key={lead.id} href={`/leads/${lead.id}`}>
                    <div className="bg-card border border-border rounded-lg p-3 hover:border-primary/40 hover:shadow-sm transition-all">
                      <p className="text-sm font-medium leading-tight">{lead.firstName} {lead.lastName}</p>
                      {lead.company && (
                        <p className="text-xs text-muted-foreground mt-0.5 flex items-center gap-1">
                          <Building2 className="h-3 w-3" />{lead.company}
                        </p>
                      )}
                      {lead.campaign && (
                        <p className="text-xs text-muted-foreground mt-1 flex items-center gap-1">
                          <Megaphone className="h-3 w-3" />{lead.campaign.name}
                        </p>
                      )}
                      {lead.source && (
                        <p cla