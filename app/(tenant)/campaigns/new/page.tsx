import { createCampaign } from "@/app/actions/campaigns";
import { AppTopbar } from "@/components/layout/AppTopbar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ChevronRight, Megaphone } from "lucide-react";
import Link from "next/link";

const CAMPAIGN_TYPES = [
  { value: "email",  label: "E-mail" },
  { value: "event",  label: "Event" },
  { value: "social", label: "Social media" },
  { value: "ads",    label: "Annoncer" },
  { value: "other",  label: "Andet" },
];

export default function NewCampaignPage() {
  return (
    <>
      <AppTopbar pageTitle="Ny kampagne" />
      <div className="flex items-center gap-2 text-sm text-muted-foreground mb-5">
        <Link href="/campaigns" className="hover:text-foreground transition-colors">Kampagner</Link>
        <ChevronRight className="h-3.5 w-3.5" />
        <span className="text-foreground font-medium">Ny kampagne</span>
      </div>

      <div className="max-w-xl">
        <div className="bg-card border border-border rounded-xl p-6">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-10 h-10 rounded-xl bg-purple-500/10 flex items-center justify-center">
              <Megaphone className="h-5 w-5 text-purple-600" />
            </div>
            <div>
              <h2 className="font-semibold">Ny kampagne</h2>
              <p className="text-xs text-muted-foreground">Opret en ny marketingkampagne</p>
            </div>
          </div>

          <form action={createCampaign} className="space-y-4">
            <Input name="name" label="Kampagnenavn" required placeholder="Q3 e-mail kampagne" />

            <div className="space-y-1.5">
              <label className="block text-sm font-medium text-foreground">Type</label>
              <select name="type" className="w-full px-3 py-2 rounded-lg border border-input bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring">
                <option value="">— Vælg type —</option>
                {CAMPAIGN_TYPES.map((t) => (
                  <option key={t.value} value={t.value}>{t.label}</option>
                ))}
              </select>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <Input name="startDate" label="Startdato" type="date" />
              <Input name="endDate" label="Slutdato" type="date" />
            </div>

            <Input name="budget" label="Budget (DKK)" type="number" min="0" step="100" placeholder="0" />

            <div className="space-y-1.5">
              <label className="block text-sm font-medium text-foreground">Notater</label>
              <textarea name="notes" rows={3} placeholder="Kampagnebeskrivelse, mål osv."
                className="w-full px-3 py-2 rounded-lg border border-input bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring resize-none" />
            </div>

            <div className="flex items-center gap-3 pt-2">
              <Button type="submit" size="md">Opret kampagne</Button>
              <Link href="/campaigns"><Button type="button" variant="ghost" size="md">Annuller</Button></Link>
            </div>
          </form>
        </div>
      </div>
    </>
  );
}
