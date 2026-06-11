import { getCampaigns } from "@/app/actions/campaigns";
import { AppTopbar } from "@/components/layout/AppTopbar";
import { PageHeader } from "@/components/shared/PageHeader";
import { Button } from "@/components/ui/button";
import { Megaphone, Plus, Users, CalendarDays, CircleDot } from "lucide-react";
import Link from "next/link";
import { formatDate, formatCurrency } from "@/lib/utils";

const STATUS_STYLE: Record<string, { label: string; dot: string; bg: string }> = {
  draft:     { label: "Kladde",    dot: "bg-slate-400",   bg: "bg-slate-100 text-slate-700" },
  active:    { label: "Aktiv",     dot: "bg-emerald-500", bg: "bg-emerald-100 text-emerald-700" },
  completed: { label: "Afsluttet", dot: "bg-blue-500",    bg: "bg-blue-100 text-blue-700" },
  paused:    { label: "Pause",     dot: "bg-amber-500",   bg: "bg-amber-100 text-amber-700" },
  cancelled: { label: "Annulleret",dot: "bg-red-400",     bg: "bg-red-100 text-red-700" },
};

const TYPE_LABEL: Record<string, string> = {
  email:  "E-mail",
  event:  "Event",
  social: "Social",
  ads:    "Annoncer",
  other:  "Andet",
};

export default async function CampaignsPage() {
  const campaigns = await getCampaigns();

  const active    = campaigns.filter((c) => c.status === "active");
  const draft     = campaigns.filter((c) => c.status === "draft");
  const completed = campaigns.filter((c) => c.status === "completed");
  const other     = campaigns.filter((c) => !["active","draft","completed"].includes(c.status));

  return (
    <>
      <AppTopbar pageTitle="Kampagner" />
      <PageHeader
        title="Kampagner"
        description={`${campaigns.length} kampagner i alt`}
        actions={
          <a href="/campaigns/new">
            <Button size="sm"><Plus className="h-3.5 w-3.5" /> Ny kampagne</Button>
          </a>
        }
      />

      {campaigns.length === 0 ? (
        <div className="bg-card border border-border rounded-xl p-16 text-center">
          <Megaphone className="h-10 w-10 text-muted-foreground mx-auto mb-4" />
          <p className="font-semibold mb-1">Ingen kampagner endnu</p>
          <p className="text-sm text-muted-foreground mb-4">Opret din første kampagne for at tracke leads og resultater.</p>
          <a href="/campaigns/new">
            <Button size="sm"><Plus className="h-3.5 w-3.5" /> Opret kampagne</Button>
          </a>
        </div>
      ) : (
        <div className="space-y-6">
          {active.length > 0 && <CampaignGroup title="Aktive" campaigns={active} />}
          {draft.length > 0  && <CampaignGroup title="Kladder" campaigns={draft} />}
          {completed.length > 0 && <CampaignGroup title="Afsluttede" campaigns={completed} />}
          {other.length > 0  && <CampaignGroup title="Øvrige" campaigns={other} />}
        </div>
      )}
    </>
  );
}

function CampaignGroup({ title, campaigns }: { title: string; campaigns: Awaited<ReturnType<typeof getCampaigns>> }) {
  return (
    <div>
      <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-3">{title}</p>
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
        {campaigns.map((c) => {
          const s = STATUS_STYLE[c.status] ?? STATUS_STYLE.draft;
          return (
            <Link key={c.id} href={`/campaigns/${c.id}`}>
              <div className="bg-card border border-border rounded-xl p-4 hover:border-primary/40 hover:shadow-sm transition-all group">
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-center gap-2.5">
                    <div className="w-9 h-9 rounded-lg bg-purple-500/10 flex items-center justify-center shrink-0">
                      <Megaphone className="h-4 w-4 text-purple-600" />
                    </div>
                    <div>
                      <p className="font-semibold text-sm group-hover:text-primary transition-colors leading-tight">
                        {c.name}
                      </p>
                      {c.type && (
                        <p className="text-xs text-muted-foreground">{TYPE_LABEL[c.type] ?? c.type}</p>
                      )}
                    </div>
                  </div>
                  <span className={`text-xs px-2 py-0.5 rounded-full font-medium shrink-0 ${s.bg}`}>
                    {s.label}
                  </span>
                </div>

                <div className="flex items-center gap-4 text-xs text-muted-foreground">
                  <span className="flex items-center gap-1">
                    <Users className="h-3 w-3" />
                    {c._count.leads} leads
                  </span>
                  {c.budget && (
                    <span>{formatCurrency(Number(c.budget))}</span>
                  )}
                  {c.startDate && (
                    <span className="flex items-center gap-1">
                      <CalendarDays className="h-3 w-3" />
                      {formatDate(c.startDate)}
                    </span>
                  )}
                </div>
              </div>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
