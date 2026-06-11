import { AppTopbar } from "@/components/layout/AppTopbar";
import { PageHeader } from "@/components/shared/PageHeader";
import { BackButton } from "@/components/shared/BackButton";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Scissors, Plus, Trash2, Info } from "lucide-react";
import {
  getBundlePricingTiers,
  createBundlePricingTier,
  deleteBundlePricingTier,
} from "@/app/actions/bundle-pricing";
import { auth } from "@/lib/auth";
import { formatCurrency } from "@/lib/utils";

export const metadata = { title: "Klippekort-priser — CRM-X" };

export default async function PricingPage() {
  const [session, tiers] = await Promise.all([auth(), getBundlePricingTiers()]);

  const role = (session?.user?.role ?? "").toLowerCase();
  const canEdit =
    role === "super_admin" || role === "admin" || role === "administrator";

  async function handleDelete(id: string) {
    "use server";
    await deleteBundlePricingTier(id);
  }

  return (
    <>
      <AppTopbar pageTitle="Klippekort-priser" />
      <BackButton href="/settings" label="Indstillinger" />
      <PageHeader
        title="Klippekort-priser"
        description="Definer timepris pr. volumen-trin. Bruges til at auto-udfylde pris ved oprettelse af nye klippekort."
      />

      <div className="max-w-3xl space-y-5">
        {/* Forklaring */}
        <div className="bg-secondary/40 border border-border rounded-xl p-4 flex items-start gap-3">
          <Info className="h-4 w-4 text-muted-foreground shrink-0 mt-0.5" />
          <div className="text-xs text-muted-foreground leading-relaxed">
            <p className="mb-1">
              Hver række er et <strong>volumen-trin</strong>: når en kunde køber X timer
              eller flere, gælder denne timepris. Systemet vælger automatisk det højeste
              matchende trin.
            </p>
            <p>
              Eksempel: <span className="font-mono">1 t → 850 kr/t</span>,{" "}
              <span className="font-mono">21 t → 800 kr/t</span>,{" "}
              <span className="font-mono">51 t → 750 kr/t</span>. Et 30-timers klippekort
              vil bruge 800 kr/t = 24.000 kr.
            </p>
          </div>
        </div>

        {/* Pris-tabel */}
        <div className="bg-card border border-border rounded-xl overflow-hidden">
          <div className="px-5 py-3.5 border-b border-border flex items-center gap-2">
            <Scissors className="h-4 w-4 text-emerald-600" />
            <h2 className="text-sm font-semibold">Pris-trin</h2>
            <span className="ml-auto text-xs text-muted-foreground">
              {tiers.length} trin defineret
            </span>
          </div>

          {tiers.length === 0 ? (
            <div className="px-5 py-10 text-center">
              <p className="text-sm text-muted-foreground">
                Ingen pris-trin endnu. Tilføj det første nedenfor.
              </p>
            </div>
          ) : (
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border bg-secondary/30 text-xs uppercase tracking-wide text-muted-foreground">
                  <th className="text-left px-5 py-2.5 font-semibold w-32">Fra antal timer</th>
                  <th className="text-left px-5 py-2.5 font-semibold w-32">Pris/time</th>
                  <th className="text-left px-5 py-2.5 font-semibold">Etikette</th>
                  <th className="text-right px-5 py-2.5 font-semibold w-24">Handling</th>
                </tr>
              </thead>
              <tbody>
                {tiers.map((tier) => (
                  <tr key={tier.id} className="border-b border-border last:border-0 hover:bg-secondary/30">
                    <td className="px-5 py-3 tabular-nums font-medium">
                      {tier.minHours}+ t
                    </td>
                    <td className="px-5 py-3 tabular-nums">
                      {formatCurrency(Number(tier.hourlyRate))}
                    </td>
                    <td className="px-5 py-3 text-muted-foreground">
                      {tier.label || <span className="text-muted-foreground/60">—</span>}
                    </td>
                    <td className="px-5 py-3 text-right">
                      {canEdit && (
                        <form action={async () => { "use server"; await handleDelete(tier.id); }}>
                          <button
                            type="submit"
                            className="text-destructive/70 hover:text-destructive transition-colors p-1 rounded"
                            title="Slet trin"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        </form>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        {/* Tilføj nyt trin — kun admin */}
        {canEdit ? (
          <div className="bg-card border border-border rounded-xl p-5">
            <h3 className="text-sm font-semibold mb-3">Tilføj pris-trin</h3>
            <form action={createBundlePricingTier} className="grid grid-cols-1 sm:grid-cols-4 gap-3 items-end">
              <Input
                name="minHours"
                label="Fra antal timer *"
                type="number"
                min="1"
                step="1"
                required
                placeholder="1"
              />
              <Input
                name="hourlyRate"
                label="Pris/time (DKK) *"
                type="number"
                min="0"
                step="50"
                required
                placeholder="850"
              />
              <Input
                name="label"
                label="Etikette (valgfri)"
                placeholder="fx Standard, Volumen"
              />
              <Button type="submit" size="md">
                <Plus className="h-4 w-4" />
                Tilføj trin
              </Button>
            </form>
          </div>
        ) : (
          <div className="bg-card border border-border rounded-xl p-4 text-xs text-muted-foreground">
            Kun administratorer kan ændre pris-trin.
          </div>
        )}
      </div>
    </>
  );
}
