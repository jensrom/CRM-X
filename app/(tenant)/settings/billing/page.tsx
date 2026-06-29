import { AppTopbar } from "@/components/layout/AppTopbar";
import { BackButton } from "@/components/shared/BackButton";
import { Button } from "@/components/ui/button";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { redirect } from "next/navigation";
import { startCheckout, openCustomerPortal, purchaseAddOn, removeAddOn } from "@/app/actions/billing";
import {
  CreditCard, CheckCircle2, AlertTriangle, Clock, ExternalLink,
  Zap, Building2, Crown, Sparkles, TrendingUp, Plus,
} from "lucide-react";
import { ADDONS, getAddOnPricePerUser, type AddOnSlug, type PlanSlug } from "@/lib/plans";

export const dynamic = "force-dynamic";

const PLANS = [
  {
    slug:     "small" as const,
    name:     "Small",
    icon:     Zap,
    accent:   "text-blue-600 bg-blue-500/10",
    maxUsers: 5,
    priceLabel:"199 kr / mdr",
    features: ["5 brugere", "Alle basismoduler", "Email-support"],
  },
  {
    slug:     "medium" as const,
    name:     "Medium",
    icon:     Building2,
    accent:   "text-violet-600 bg-violet-500/10",
    maxUsers: 25,
    priceLabel:"599 kr / mdr",
    features: ["25 brugere", "Forecast BETA", "Prioriteret support", "Custom roller"],
    recommended: true,
  },
  {
    slug:     "large" as const,
    name:     "Large",
    icon:     Crown,
    accent:   "text-amber-600 bg-amber-500/10",
    maxUsers: 100,
    priceLabel:"1.499 kr / mdr",
    features: ["100 brugere", "Alt fra Medium", "API-adgang", "Dedikeret support"],
  },
];

const STATUS_BADGES: Record<string, { label: string; tone: string; icon: any }> = {
  trial:     { label: "Prøveperiode", tone: "bg-blue-100 text-blue-700",       icon: Clock },
  paid:      { label: "Aktiv",        tone: "bg-emerald-100 text-emerald-700", icon: CheckCircle2 },
  overdue:   { label: "Forfaldne betaling", tone: "bg-amber-100 text-amber-700", icon: AlertTriangle },
  cancelled: { label: "Annulleret",   tone: "bg-slate-100 text-slate-700",     icon: AlertTriangle },
  manual:    { label: "Manuel fakturering", tone: "bg-secondary text-muted-foreground", icon: CreditCard },
};

export default async function BillingPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string; addOnOk?: string; addOnError?: string }>;
}) {
  const session = await auth();
  if (!session?.user?.tenantId) redirect("/login");

  const role = (session.user.role ?? "").toLowerCase();
  const isAdmin = ["admin", "administrator", "super_admin"].includes(role);

  const tenant = await db.tenant.findFirst({
    where: { id: session.user.tenantId },
    select: {
      name: true, plan: true, maxUsers: true,
      billingStatus: true, billingCurrency: true,
      trialEndsAt: true, currentPeriodEnd: true,
      stripeCustomerId: true, stripeSubscriptionId: true,
      addOns: true,
    } as any,
  }) as any;
  if (!tenant) redirect("/dashboard");

  const sp = await searchParams;
  const statusBadge = STATUS_BADGES[tenant.billingStatus] ?? STATUS_BADGES.trial;
  const StatusIcon = statusBadge.icon;

  const userCount = await db.user.count({
    where: { tenantId: session.user.tenantId, isActive: true },
  });

  return (
    <>
      <AppTopbar pageTitle="Billing" />
      <BackButton href="/settings" />

      <div className="max-w-4xl space-y-5">
        <header>
          <h1 className="text-2xl font-semibold mb-1">Billing & abonnement</h1>
          <p className="text-sm text-muted-foreground">
            Administrer din pakke, opdater betalingsmetode og se kvitteringer.
          </p>
        </header>

        {/* Status-banner efter checkout */}
        {sp.status === "success" && (
          <div className="bg-emerald-50 border border-emerald-200 rounded-xl px-4 py-3 flex items-start gap-3">
            <CheckCircle2 className="h-4 w-4 text-emerald-700 mt-0.5 shrink-0" />
            <p className="text-sm text-emerald-900">
              Tak! Dit abonnement er aktiveret. Det kan tage et minut før status opdaterer her.
            </p>
          </div>
        )}
        {sp.status === "cancelled" && (
          <div className="bg-amber-50 border border-amber-200 rounded-xl px-4 py-3 flex items-start gap-3">
            <AlertTriangle className="h-4 w-4 text-amber-700 mt-0.5 shrink-0" />
            <p className="text-sm text-amber-900">
              Checkout blev afbrudt. Ingen ændringer er foretaget.
            </p>
          </div>
        )}
        {sp.addOnOk && (
          <div className="bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-300 dark:border-emerald-800 rounded-xl px-4 py-3 flex items-start gap-3">
            <CheckCircle2 className="h-4 w-4 text-emerald-700 dark:text-emerald-400 mt-0.5 shrink-0" />
            <p className="text-sm text-emerald-900 dark:text-emerald-200">{sp.addOnOk}</p>
          </div>
        )}
        {sp.addOnError && (
          <div className="bg-rose-50 dark:bg-rose-950/30 border border-rose-300 dark:border-rose-800 rounded-xl px-4 py-3 flex items-start gap-3">
            <AlertTriangle className="h-4 w-4 text-rose-700 dark:text-rose-400 mt-0.5 shrink-0" />
            <p className="text-sm text-rose-900 dark:text-rose-200">{sp.addOnError}</p>
          </div>
        )}

        {/* Nuværende plan */}
        <section className="bg-card border border-border rounded-xl p-6">
          <div className="flex items-start justify-between mb-4">
            <div>
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-1">Nuværende plan</p>
              <div className="flex items-center gap-3">
                <h2 className="text-xl font-bold capitalize">{tenant.plan}</h2>
                <span className={`inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full font-medium ${statusBadge.tone}`}>
                  <StatusIcon className="h-3 w-3" />
                  {statusBadge.label}
                </span>
              </div>
            </div>
            {isAdmin && tenant.stripeCustomerId && (
              <form action={openCustomerPortal}>
                <Button type="submit" size="sm" variant="outline">
                  Administrer i Stripe
                  <ExternalLink className="h-3 w-3" />
                </Button>
              </form>
            )}
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 pt-4 border-t border-border text-xs">
            <Stat label="Brugere"  value={`${userCount} / ${tenant.maxUsers}`} />
            <Stat label="Valuta"   value={tenant.billingCurrency} />
            {tenant.trialEndsAt && tenant.billingStatus === "trial" && (
              <Stat label="Prøve slutter" value={new Date(tenant.trialEndsAt).toLocaleDateString("da-DK")} />
            )}
            {tenant.currentPeriodEnd && (
              <Stat label="Næste betaling" value={new Date(tenant.currentPeriodEnd).toLocaleDateString("da-DK")} />
            )}
          </div>
        </section>

        {/* Aktive tilkoeb (named add-ons som Forecast) */}
        {(tenant.addOns ?? []).length > 0 && (
          <section className="bg-card border border-border rounded-xl p-6">
            <div className="flex items-center gap-2 mb-4">
              <Plus className="h-4 w-4 text-primary" />
              <h2 className="text-sm font-semibold">Aktive tilkøb</h2>
            </div>
            <div className="space-y-3">
              {(tenant.addOns as string[]).map((slug) => {
                const addon = ADDONS[slug as AddOnSlug];
                if (!addon) return null;
                const planSlug = (tenant.plan ?? "small") as PlanSlug;
                const pricePerUser = getAddOnPricePerUser(addon.slug, planSlug, tenant.billingCurrency as any);
                const monthlyTotal = pricePerUser * (tenant.maxUsers ?? 0);
                return (
                  <div key={slug} className="flex items-start gap-3 p-4 rounded-lg bg-secondary/30 border border-border">
                    <div className="w-9 h-9 rounded-lg bg-primary/10 text-primary flex items-center justify-center shrink-0">
                      <TrendingUp className="h-4 w-4" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-baseline justify-between gap-2 mb-1">
                        <p className="text-sm font-semibold">{addon.name}</p>
                        <p className="text-sm font-bold text-primary tabular-nums whitespace-nowrap">
                          +{pricePerUser} kr/seat/md
                        </p>
                      </div>
                      <p className="text-xs text-muted-foreground mb-2">{addon.tagline}</p>
                      <div className="flex items-baseline justify-between gap-2 pt-2 border-t border-border/60">
                        <span className="text-[11px] text-muted-foreground tabular-nums">
                          {tenant.maxUsers} brugere × {pricePerUser} kr
                        </span>
                        <span className="text-xs font-semibold tabular-nums">
                          {monthlyTotal.toLocaleString("da-DK")} kr / md
                        </span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
            {isAdmin && (
              <div className="mt-4 flex flex-wrap gap-2">
                {(tenant.addOns as string[]).map((slug) => (
                  <form key={`remove-${slug}`} action={removeAddOn.bind(null, slug)}>
                    <Button type="submit" size="sm" variant="outline">
                      Fjern {ADDONS[slug as AddOnSlug]?.name ?? slug}
                    </Button>
                  </form>
                ))}
              </div>
            )}
          </section>
        )}

        {/* Tilkoebsmuligheder — vis kun add-ons der IKKE allerede er aktive,
             og kun hvis admin + planen tillader add-ons */}
        {isAdmin && tenant.plan !== "small" && (
          (() => {
            const activeSlugs = new Set<string>(tenant.addOns ?? []);
            const available = Object.values(ADDONS).filter(
              (a) => !activeSlugs.has(a.slug)
            );
            if (available.length === 0) return null;
            return (
              <section className="bg-card border border-border rounded-xl p-6">
                <div className="flex items-center gap-2 mb-4">
                  <Sparkles className="h-4 w-4 text-violet-600" />
                  <h2 className="text-sm font-semibold">Tilkøbsmuligheder</h2>
                </div>
                <div className="space-y-3">
                  {available.map((addon) => {
                    const planSlug = (tenant.plan ?? "small") as PlanSlug;
                    const price = getAddOnPricePerUser(addon.slug, planSlug, tenant.billingCurrency as any);
                    const monthlyTotal = price * (tenant.maxUsers ?? 0);
                    return (
                      <div key={addon.slug} className="flex items-start gap-3 p-4 rounded-lg border border-dashed border-border hover:border-violet-300 dark:hover:border-violet-700 transition-colors">
                        <div className="w-9 h-9 rounded-lg bg-violet-500/10 text-violet-600 dark:text-violet-400 flex items-center justify-center shrink-0">
                          <TrendingUp className="h-4 w-4" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-baseline justify-between gap-2 mb-1">
                            <p className="text-sm font-semibold">{addon.name}</p>
                            <p className="text-sm font-bold text-violet-600 dark:text-violet-400 tabular-nums whitespace-nowrap">
                              +{price} kr/seat/md
                            </p>
                          </div>
                          <p className="text-xs text-muted-foreground mb-3">{addon.tagline}</p>
                          <ul className="space-y-1 mb-3">
                            {addon.highlights.map((h) => (
                              <li key={h} className="text-[11px] flex items-start gap-1.5 text-muted-foreground">
                                <CheckCircle2 className="h-3 w-3 text-emerald-600 shrink-0 mt-0.5" />
                                {h}
                              </li>
                            ))}
                          </ul>
                          <div className="flex items-center justify-between gap-2 pt-2 border-t border-border/60">
                            <span className="text-[11px] text-muted-foreground tabular-nums">
                              {tenant.maxUsers} brugere × {price} kr = <strong className="text-foreground">{monthlyTotal.toLocaleString("da-DK")} kr/md</strong>
                            </span>
                            <form action={purchaseAddOn.bind(null, addon.slug)}>
                              <Button type="submit" size="sm">
                                Tilkøb
                              </Button>
                            </form>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
                <p className="text-[11px] text-muted-foreground mt-4 px-1">
                  {tenant.stripeSubscriptionId
                    ? "Beløb opkræves pro-rata på din næste faktura."
                    : "Tilkøb aktiveres straks. Du fakturerer ved overgang til betalt plan."}
                </p>
              </section>
            );
          })()
        )}

        {/* Plan-valg */}
        {isAdmin && (
          <section>
            <div className="flex items-center gap-2 mb-3">
              <Sparkles className="h-4 w-4 text-violet-600" />
              <h2 className="text-sm font-semibold">
                {tenant.stripeSubscriptionId ? "Skift plan" : "Vælg abonnement"}
              </h2>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              {PLANS.map((p) => {
                const isCurrent = tenant.plan === p.slug;
                const Icon = p.icon;
                return (
                  <div
                    key={p.slug}
                    className={`bg-card border-2 rounded-xl p-5 flex flex-col ${
                      isCurrent
                        ? "border-primary"
                        : p.recommended
                          ? "border-violet-300"
                          : "border-border"
                    }`}
                  >
                    {p.recommended && !isCurrent && (
                      <span className="text-[10px] font-semibold uppercase tracking-wide text-violet-700 bg-violet-50 border border-violet-200 rounded-full px-2 py-0.5 self-start mb-2">
                        Anbefalet
                      </span>
                    )}
                    {isCurrent && (
                      <span className="text-[10px] font-semibold uppercase tracking-wide text-primary bg-primary/10 border border-primary/20 rounded-full px-2 py-0.5 self-start mb-2">
                        Din plan
                      </span>
                    )}

                    <div className={`w-9 h-9 rounded-xl ${p.accent} flex items-center justify-center mb-3`}>
                      <Icon className="h-4 w-4" />
                    </div>
                    <h3 className="text-base font-bold">{p.name}</h3>
                    <p className="text-sm text-muted-foreground mb-3">{p.priceLabel}</p>

                    <ul className="space-y-1.5 mb-4 flex-1">
                      {p.features.map((f) => (
                        <li key={f} className="text-xs flex items-start gap-1.5">
                          <CheckCircle2 className="h-3 w-3 text-emerald-600 mt-0.5 shrink-0" />
                          <span>{f}</span>
                        </li>
                      ))}
                    </ul>

                    {!isCurrent && (
                      <form action={startCheckout.bind(null, p.slug)}>
                        <Button type="submit" size="sm" className="w-full">
                          {tenant.stripeSubscriptionId ? "Skift hertil" : "Vælg"}
                        </Button>
                      </form>
                    )}
                  </div>
                );
              })}
            </div>
          </section>
        )}

        {/* Info-footer */}
        <p className="text-xs text-muted-foreground px-1">
          Betalinger håndteres af Stripe. CRM-X gemmer ikke kort-detaljer.
          Du kan til enhver tid annullere via "Administrer i Stripe"-knappen — adgangen
          forbliver til slutningen af din betalingsperiode.
        </p>
      </div>
    </>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-[10px] uppercase tracking-wide text-muted-foreground">{label}</p>
      <p className="text-sm font-semibold tabular-nums mt-0.5">{value}</p>
    </div>
  );
}
