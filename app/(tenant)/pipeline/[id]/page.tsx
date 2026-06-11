import { getDeal } from "@/app/actions/deals";
import { AppTopbar } from "@/components/layout/AppTopbar";
import { Button } from "@/components/ui/button";
import { StageSwitcher } from "@/components/pipeline/StageSwitcher";
import { notFound } from "next/navigation";
import Link from "next/link";
import {
  Building2, Calendar, Target, User, Pencil,
  ChevronRight, Clock, Percent, FileText
} from "lucide-react";
import { formatCurrency, formatDate, DEAL_STAGES } from "@/lib/utils";
import { BackButton } from "@/components/shared/BackButton";

export default async function DealDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const deal = await getDeal(id);
  if (!deal) notFound();

  const stageMeta = DEAL_STAGES[deal.stage as keyof typeof DEAL_STAGES];

  return (
    <>
      <AppTopbar pageTitle={deal.title} />


      <BackButton href="/pipeline" label="Pipeline" />
      {/* Breadcrumb */}
      <div className="flex items-center gap-2 text-sm text-muted-foreground mb-5">
        <Link href="/pipeline" className="hover:text-foreground transition-colors">Pipeline</Link>
        <ChevronRight className="h-3.5 w-3.5" />
        <span className="text-foreground font-medium truncate max-w-xs">{deal.title}</span>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">

        {/* VENSTRE: Deal-kort */}
        <div className="xl:col-span-1 space-y-4">
          <div className="bg-card border border-border rounded-xl p-5">
            <div className="flex items-start justify-between mb-4">
              <div>
                <h2 className="font-semibold text-foreground text-base leading-snug">{deal.title}</h2>
                {deal.value && (
                  <p className="text-2xl font-bold text-primary mt-1">
                    {formatCurrency(Number(deal.value))}
                  </p>
                )}
              </div>
              <Link href={`/pipeline/${deal.id}/edit`}>
                <Button variant="ghost" size="sm"><Pencil className="h-3.5 w-3.5" /></Button>
              </Link>
            </div>

            {/* Stage-switcher */}
            <div className="mb-4">
              <p className="text-xs text-muted-foreground font-medium mb-1.5">Stage</p>
              <StageSwitcher dealId={deal.id} currentStage={deal.stage as any} />
            </div>

            <div className="space-y-2.5">
              {deal.company && (
                <div className="flex items-center gap-2.5 text-sm">
                  <Building2 className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                  <Link href={`/companies/${deal.company.id}`} className="text-primary hover:underline">
                    {deal.company.name}
                  </Link>
                </div>
              )}
              {deal.assignedTo && (
                <div className="flex items-center gap-2.5 text-sm">
                  <User className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                  <span>{deal.assignedTo.name}</span>
                </div>
              )}
              {deal.expectedCloseDate && (
                <div className="flex items-center gap-2.5 text-sm">
                  <Calendar className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                  <span>Lukkes {formatDate(deal.expectedCloseDate)}</span>
                </div>
              )}
              {deal.probability > 0 && (
                <div className="flex items-center gap-2.5 text-sm">
                  <Percent className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                  <div className="flex-1">
                    <div className="flex items-center justify-between mb-0.5">
                      <span className="text-xs text-muted-foreground">Sandsynlighed</span>
                      <span className="text-xs font-semibold">{deal.probability}%</span>
                    </div>
                    <div className="h-1.5 bg-secondary rounded-full overflow-hidden">
                      <div
                        className="h-full bg-primary rounded-full transition-all"
                        style={{ width: `${deal.probability}%` }}
                      />
                    </div>
                  </div>
                </div>
              )}
            </div>

            {deal.notes && (
              <div className="mt-4 pt-4 border-t border-border">
                <p className="text-xs text-muted-foreground font-medium mb-1 flex items-center gap-1.5">
                  <FileText className="h-3.5 w-3.5" /> Noter
                </p>
                <p className="text-sm whitespace-pre-wrap">{deal.notes}</p>
              </div>
            )}

            {deal.lostReason && (
              <div className="mt-4 pt-4 border-t border-border">
                <p className="text-xs text-muted-foreground font-medium mb-1">Tabt-årsag</p>
                <p className="text-sm text-red-600">{deal.lostReason}</p>
              </div>
            )}
          </div>

          {/* Datoer */}
          <div className="bg-card border border-border rounded-xl p-4 space-y-2">
            <p className="text-xs text-muted-foreground font-medium">Tidslinje</p>
            <div className="space-y-1.5 text-xs text-muted-foreground">
              <p>Oprettet: {formatDate(deal.createdAt)}</p>
              {deal.closedAt && <p>Lukket: {formatDate(deal.closedAt)}</p>}
            </div>
          </div>
        </div>

        {/* HØJRE: Aktiviteter */}
        <div className="xl:col-span-2 space-y-5">
          <div className="bg-card border border-border rounded-xl overflow-hidden">
            <div className="px-5 py-3.5 border-b border-border">
              <h3 className="text-sm font-semibold flex items-center gap-2">
                <Clock className="h-4 w-4 text-muted-foreground" />
                Aktiviteter ({deal.activities.length})
              </h3>
            </div>
            {deal.activities.length === 0 ? (
              <p className="px-5 py-8 text-sm text-muted-foreground text-center">
                Ingen aktiviteter endnu.
              </p>
            ) : (
              <div className="divide-y divide-border">
                {deal.activities.map((act) => (
                  <div key={act.id} className="flex items-start gap-3 px-5 py-3">
                    <div>
                      <p className="text-sm font-medium">{act.subject}</p>
                      <p className="text-xs text-muted-foreground">{formatDate(act.createdAt)}</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </>
  );
}
