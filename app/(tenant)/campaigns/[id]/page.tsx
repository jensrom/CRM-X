import { getCampaign, updateCampaign, deleteCampaign } from "@/app/actions/campaigns";
import { AppTopbar } from "@/components/layout/AppTopbar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { notFound } from "next/navigation";
import Link from "next/link";
import { ChevronRight, Megaphone, Users, Trash2, User, Mail, Phone, Building2 } from "lucide-react";
import { formatDate, formatCurrency } from "@/lib/utils";
import { BackButton } from "@/components/shared/BackButton";

const CAMPAIGN_TYPES = [
  { value: "email", label: "E-mail" }, { value: "event", label: "Event" },
  { value: "social", label: "Social media" }, { value: "ads", label: "Annoncer" },
  { value: "other", label: "Andet" },
];

const STATUSES = [
  { value: "draft", label: "Kladde" }, { value: "active", label: "Aktiv" },
  { value: "paused", label: "Pause" }, { value: "completed", label: "Afsluttet" },
  { value: "cancelled", label: "Annulleret" },
];

const LEAD_STATUS_STYLE: Record<string, string> = {
  new:       "bg-slate-100 text-slate-700",
  contacted: "bg-blue-100 text-blue-700",
  qualified: "bg-violet-100 text-violet-700",
  converted: "bg-emerald-100 text-emerald-700",
  lost:      "bg-red-100 text-red-700",
};
const LEAD_STATUS_LABEL: Record<string, string> = {
  new: "Ny", contacted: "Kontaktet", qualified: "Kvalificeret", converted: "Konverteret", lost: "Tabt",
};

export default async function CampaignDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const campaign = await getCampaign(id);
  if (!campaign) notFound();

  async function handleDelete() {
    "use server";
    await deleteCampaign(id);
  }

  return (
    <>
      <AppTopbar pageTitle={campaign.name} />

      <BackButton href="/campaigns" label="Kampagner" />
      <div className="flex items-center gap-2 text-sm text-muted-foreground mb-5">
        <Link href="/campaigns" className="hover:text-foreground transition-colors">Kampagner</Link>
        <ChevronRight className="h-3.5 w-3.5" />
        <span className="text-foreground font-medium">{campaign.name}</span>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        <div className="xl:col-span-1 space-y-4">
          <div className="bg-card border border-border rounded-xl p-4">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-xl bg-purple-500/10 flex items-center justify-center shrink-0">
                <Megaphone className="h-5 w-5 text-purple-600" />
              </div>
              <div>
                <p className="font-semibold">{campaign.name}</p>
                {campaign.type && <p className="text-xs text-muted-foreground">{CAMPAIGN_TYPES.find(t => t.value === campaign.type)?.label ?? campaign.type}</p>}
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3 text-center p-3 bg-secondary/50 rounded-lg">
              <div><p className="text-xl font-bold">{campaign._count.leads}</p><p className="text-xs text-muted-foreground">Leads</p></div>
              <div>
                <p className="text-xl font-bold">
                  {campaign.budget ? formatCurrency(Number(campaign.budget)) : "—"}
                </p>
                <p className="text-xs text-muted-foreground">Budget</p>
              </div>
            </div>
            {campaign.startDate && (
              <div className="mt-3 text-xs text-muted-foreground space-y-1">
                <p>Start: {formatDate(campaign.startDate)}</p>
                {campaign.endDate && <p>Slut: {formatDate(campaign.endDate)}</p>}
              </div>
            )}
            {campaign.notes && (
              <p className="mt-3 text-sm text-muted-foreground leading-relaxed">{campaign.notes}</p>
            )}
          </div>
        </div>

        <div className="xl:col-span-2 space-y-5">
          <div className="bg-card border border-border rounded-xl p-5">
            <h3 className="text-sm font-semibold mb-4">Rediger kampagne</h3>
            <form action={updateCampaign} className="space-y-4">
              <input type="hidden" name="id" value={campaign.id} />
              <Input name="name" label="Kampagnenavn" defaultValue={campaign.name} required />
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="block text-sm font-medium text-foreground">Type</label>
                  <select name="type" defaultValue={campaign.type ?? ""} className="w-full px-3 py-2 rounded-lg border border-input bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring">
                    <option value="">— Ingen —</option>
                    {CAMPAIGN_TYPES.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
                  </select>
                </div>
                <div className="space-y-1.5">
                  <label className="block text-sm font-medium text-foreground">Status</label>
                  <select name="status" defaultValue={campaign.status} className="w-full px-3 py-2 rounded-lg border border-input bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring">
                    {STATUSES.map(s => <option key={s.value} value={s.value}>{s.label}</option>)}
                  </select>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <Input name="startDate" label="Startdato" type="date" defaultValue={campaign.startDate ? new Date(campaign.startDate).toISOString().split("T")[0] : ""} />
                <Input name="endDate" label="Slutdato" type="date" defaultValue={campaign.endDate ? new Date(campaign.endDate).toISOString().split("T")[0] : ""} />
              </div>
              <Input name="budget" label="Budget (DKK)" type="number" defaultValue={campaign.budget ? String(campaign.budget) : ""} />
              <div className="space-y-1.5">
                <label className="block text-sm font-medium text-foreground">Notater</label>
                <textarea name="notes" rows={3} defaultValue={campaign.notes ?? ""} className="w-full px-3 py-2 rounded-lg border border-input bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring resize-none" />
              </div>
              <div className="flex items-center justify-between pt-2">
                <Button type="submit" size="md">Gem ændringer</Button>
                                  <Button type="submit" formAction={handleDelete} variant="ghost" size="sm" className="text-destructive hover:text-destructive hover:bg-destructive/10">
                    <Trash2 className="h-3.5 w-3.5" /> Slet kampagne
                  </Button>
              </div>
            </form>
          </div>

          {campaign.leads.length > 0 && (
            <div className="bg-card border border-border rounded-xl p-5">
              <h3 className="text-sm font-semibold flex items-center gap-2 mb-4">
                <Users className="h-4 w-4 text-muted-foreground" /> Leads ({campaign.leads.length})
              </h3>
              <div className="space-y-2">
                {campaign.leads.map((lead) => (
                  <Link key={lead.id} href={`/leads/${lead.id}`} className="flex items-center gap-3 p-2.5 rounded-lg hover:bg-secondary/50 transition-colors">
                    <div className="w-8 h-8 rounded-full bg-secondary flex items-center justify-center shrink-0">
                      <User className="h-3.5 w-3.5 text-muted-foreground" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium">{lead.firstName} {lead.lastName}</p>
                      <p className="text-xs text-muted-foreground truncate">{lead.company ?? lead.email ?? "—"}</p>
                    </div>
                    <span className={`text-xs px-2 py-0.5 rounded-full shrink-0 ${LEAD_STATUS_STYLE[lead.status] ?? "bg-secondary text-muted-foreground"}`}>
                      {LEAD_STATUS_LABEL[lead.status] ?? lead.status}
                    </span>
                  </Link>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </>
  );
}
