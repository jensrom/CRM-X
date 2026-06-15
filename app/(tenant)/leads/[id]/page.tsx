import { getLead, updateLead, deleteLead, convertLeadToCompany } from "@/app/actions/leads";
import { getCampaigns } from "@/app/actions/campaigns";
import { getLeadActivities } from "@/app/actions/lead-activities";
import { AppTopbar } from "@/components/layout/AppTopbar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { notFound } from "next/navigation";
import Link from "next/link";
import { ChevronRight, Target, Trash2, ArrowRight, Building2 } from "lucide-react";
import { BackButton } from "@/components/shared/BackButton";
import { LeadActivityTimeline } from "@/components/leads/LeadActivityTimeline";
import { CreatorBadge } from "@/components/shared/CreatorBadge";

const STATUSES = [
  { value: "new", label: "Ny" }, { value: "contacted", label: "Kontaktet" },
  { value: "qualified", label: "Kvalificeret" }, { value: "converted", label: "Konverteret" },
  { value: "lost", label: "Tabt" },
];
const SOURCES = [
  { value: "web", label: "Web/hjemmeside" }, { value: "referral", label: "Anbefaling" },
  { value: "event", label: "Event/messe" }, { value: "cold-call", label: "Cold call" },
  { value: "other", label: "Andet" },
];
const STATUS_BADGE: Record<string, string> = {
  new: "bg-slate-100 text-slate-700", contacted: "bg-blue-100 text-blue-700",
  qualified: "bg-violet-100 text-violet-700", converted: "bg-emerald-100 text-emerald-700",
  lost: "bg-red-100 text-red-700",
};

export default async function LeadDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const [lead, campaigns, activities] = await Promise.all([
    getLead(id),
    getCampaigns(),
    getLeadActivities(id),
  ]);
  if (!lead) notFound();

  async function handleDelete() {
    "use server";
    await deleteLead(id);
  }

  const isConverted = lead.status === "converted";

  return (
    <>
      <AppTopbar pageTitle={`${lead.firstName} ${lead.lastName}`} />

      <BackButton href="/leads" label="Leads" />
      <div className="flex items-center gap-2 text-sm text-muted-foreground mb-5">
        <Link href="/leads" className="hover:text-foreground transition-colors">Leads</Link>
        <ChevronRight className="h-3.5 w-3.5" />
        <span className="text-foreground font-medium">{lead.firstName} {lead.lastName}</span>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        <div className="xl:col-span-1">
          <div className="bg-card border border-border rounded-xl p-4">
            <div className="flex items-start justify-between mb-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-orange-500/10 flex items-center justify-center shrink-0">
                  <Target className="h-5 w-5 text-orange-600" />
                </div>
                <div>
                  <p className="font-semibold">{lead.firstName} {lead.lastName}</p>
                  {lead.jobTitle && <p className="text-xs text-muted-foreground">{lead.jobTitle}</p>}
                  <div className="mt-1">
                    <CreatorBadge
                      createdById={(lead as any).createdById}
                      createdByImpersonatorId={(lead as any).createdByImpersonatorId}
                      createdAt={lead.createdAt}
                    />
                  </div>
                </div>
              </div>
              <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${STATUS_BADGE[lead.status] ?? "bg-secondary text-muted-foreground"}`}>
                {STATUSES.find(s => s.value === lead.status)?.label ?? lead.status}
              </span>
            </div>
            <div className="space-y-2 text-sm">
              {lead.company && <p className="flex items-center gap-2 text-muted-foreground"><Building2 className="h-3.5 w-3.5" />{lead.company}</p>}
              {lead.email   && <p className="text-muted-foreground">{lead.email}</p>}
              {lead.phone   && <p className="text-muted-foreground">{lead.phone}</p>}
              {lead.campaign && <p className="text-muted-foreground text-xs mt-2">Kampagne: <Link href={`/campaigns/${lead.campaign.id}`} className="hover:text-primary">{lead.campaign.name}</Link></p>}
            </div>
            {lead.notes && <p className="mt-3 text-sm text-muted-foreground leading-relaxed border-t border-border pt-3">{lead.notes}</p>}

            {!isConverted && (
              <form action={convertLeadToCompany} className="mt-4">
                <input type="hidden" name="leadId" value={lead.id} />
                <Button type="submit" size="sm" className="w-full">
                  <ArrowRight className="h-3.5 w-3.5" /> Konverter til kunde
                </Button>
              </form>
            )}
            {isConverted && lead.convertedCompanyId && (
              <div className="mt-4 p-3 bg-emerald-50 rounded-lg border border-emerald-200">
                <p className="text-xs text-emerald-700 font-medium">Konverteret til kunde</p>
                <Link href={`/kunder/${lead.convertedCompanyId}`} className="text-xs text-emerald-600 hover:underline">
                  Se kunde
                </Link>
              </div>
            )}
          </div>
        </div>

        <div className="xl:col-span-2 space-y-5">
          {/* Aktivitetslog — opkald, møder, opfølgninger, frie noter */}
          <LeadActivityTimeline leadId={lead.id} activities={activities as any} />

          <div className="bg-card border border-border rounded-xl p-5">
            <h3 className="text-sm font-semibold mb-4">Rediger lead</h3>
            <form action={updateLead} className="space-y-4">
              <input type="hidden" name="id" value={lead.id} />
              <div className="grid grid-cols-2 gap-4">
                <Input name="firstName" label="Fornavn" defaultValue={lead.firstName} required />
                <Input name="lastName" label="Efternavn" defaultValue={lead.lastName} required />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <Input name="email" label="E-mail" type="email" defaultValue={lead.email ?? ""} />
                <Input name="phone" label="Telefon" defaultValue={lead.phone ?? ""} />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <Input name="company" label="Kunde" defaultValue={lead.company ?? ""} />
                <Input name="jobTitle" label="Jobtitel" defaultValue={lead.jobTitle ?? ""} />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="block text-sm font-medium text-foreground">Status</label>
                  <select name="status" defaultValue={lead.status} className="w-full px-3 py-2 rounded-lg border border-input bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring">
                    {STATUSES.map(s => <option key={s.value} value={s.value}>{s.label}</option>)}
                  </select>
                </div>
                <div className="space-y-1.5">
                  <label className="block text-sm font-medium text-foreground">Kilde</label>
                  <select name="source" defaultValue={lead.source ?? ""} className="w-full px-3 py-2 rounded-lg border border-input bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring">
                    <option value="">— Ingen —</option>
                    {SOURCES.map(s => <option key={s.value} value={s.value}>{s.label}</option>)}
                  </select>
                </div>
              </div>
              {campaigns.length > 0 && (
                <div className="space-y-1.5">
                  <label className="block text-sm font-medium text-foreground">Kampagne</label>
                  <select name="campaignId" defaultValue={lead.campaignId ?? ""} className="w-full px-3 py-2 rounded-lg border border-input bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring">
                    <option value="">— Ingen —</option>
                    {campaigns.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                  </select>
                </div>
              )}
              <div className="space-y-1.5">
                <label className="block text-sm font-medium text-foreground">Notater</label>
                <textarea name="notes" rows={3} defaultValue={lead.notes ?? ""} className="w-full px-3 py-2 rounded-lg border border-input bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring resize-none" />
              </div>
              <div className="flex items-center justify-between pt-2">
                <Button type="submit" size="md">Gem ændringer</Bu