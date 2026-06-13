import { createLead } from "@/app/actions/leads";
import { getCampaigns } from "@/app/actions/campaigns";
import { AppTopbar } from "@/components/layout/AppTopbar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ChevronRight, Target } from "lucide-react";
import Link from "next/link";

const SOURCES = [
  { value: "web", label: "Web/hjemmeside" }, { value: "referral", label: "Anbefaling" },
  { value: "event", label: "Event/messe" }, { value: "cold-call", label: "Cold call" },
  { value: "other", label: "Andet" },
];

export default async function NewLeadPage() {
  const campaigns = await getCampaigns({ status: "active" });

  return (
    <>
      <AppTopbar pageTitle="Nyt lead" />
      <div className="flex items-center gap-2 text-sm text-muted-foreground mb-5">
        <Link href="/leads" className="hover:text-foreground transition-colors">Leads</Link>
        <ChevronRight className="h-3.5 w-3.5" />
        <span className="text-foreground font-medium">Nyt lead</span>
      </div>

      <div className="max-w-xl">
        <div className="bg-card border border-border rounded-xl p-6">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-10 h-10 rounded-xl bg-orange-500/10 flex items-center justify-center">
              <Target className="h-5 w-5 text-orange-600" />
            </div>
            <div>
              <h2 className="font-semibold">Nyt lead</h2>
              <p className="text-xs text-muted-foreground">Tilføj et nyt potentielt lead</p>
            </div>
          </div>

          <form action={createLead} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <Input name="firstName" label="Fornavn" required placeholder="Anders" />
              <Input name="lastName" label="Efternavn" required placeholder="Hansen" />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <Input name="email" label="E-mail" type="email" placeholder="a@kunde.dk" />
              <Input name="phone" label="Telefon" placeholder="+45 12 34 56 78" />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <Input name="company" label="Kunde" placeholder="Kunde A/S" />
              <Input name="jobTitle" label="Jobtitel" placeholder="Indkobschef" />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label className="block text-sm font-medium text-foreground">Kilde</label>
                <select name="source" className="w-full px-3 py-2 rounded-lg border border-input bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring">
                  <option value="">— Vælg kilde —</option>
                  {SOURCES.map(s => <option key={s.value} value={s.value}>{s.label}</option>)}
                </select>
              </div>
              {campaigns.length > 0 && (
                <div className="space-y-1.5">
                  <label className="block text-sm font-medium text-foreground">Kampagne</label>
                  <select name="campaignId" className="w-full px-3 py-2 rounded-lg border border-input bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring">
                    <option value="">— Ingen —</option>
                    {campaigns.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                  </select>
                </div>
              )}
            </div>
            <div className="space-y-1.5">
              <label className="block text-sm font-medium text-foreground">Notater</label>
              <textarea name="notes" rows={3} placeholder="Hvad er interesset? Potentiale?"
                className="w-full px-3 py-2 rounded-lg border border-input bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring resize-none" />
            </div>
            <div className="flex items-center gap-3 pt-2">
              <Button type="submit" size="md">Opret lead</Button>
              <Link href="/leads"><Button type="button" variant="ghost" size="md">Annuller</Button></Link>
            </div>
          </form>
        </div>
      </div>
    </>
  );
}
