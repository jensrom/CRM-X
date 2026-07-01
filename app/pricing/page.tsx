import Link from "next/link";
import { headers } from "next/headers";
import { ArrowLeft, Check, Sparkles, TrendingUp, X } from "lucide-react";
import {
  PLAN_LIST,
  ADDON_LIST,
  isAddOnAvailable,
  getAddOnPricePerUser,
  detectCurrencyFromHeaders,
  formatPrice,
  type Currency,
  type PlanSlug,
} from "@/lib/plans";

export const metadata = {
  title: "Priser — CRM-X",
  description: "Vælg den plan der passer til din virksomhed. Forecast & Sales Intelligence som tilkøb fra Medium-pakken.",
};

export default async function PricingPage() {
  const headersList = await headers();
  const acceptLang = headersList.get("accept-language");
  const currency: Currency = detectCurrencyFromHeaders(acceptLang);

  return (
    <div className="min-h-screen bg-background">
      {/* Topbar */}
      <header className="border-b border-border">
        <div className="max-w-6xl mx-auto px-6 py-4 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center">
              <span className="text-white font-bold text-sm">CX</span>
            </div>
            <span className="font-semibold">CRM-X</span>
          </Link>
          <Link
            href="/login"
            className="text-sm font-medium px-4 py-2 rounded-lg bg-primary text-primary-foreground hover:bg-primary/90 transition-colors"
          >
            Log ind
          </Link>
        </div>
      </header>

      {/* Hero */}
      <section className="max-w-4xl mx-auto px-6 pt-16 pb-12 text-center">
        <h1 className="text-4xl md:text-5xl font-bold tracking-tight mb-4">
          Enkel prissætning.
          <br />
          Vokser med din virksomhed.
        </h1>
        <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
          CRM-X kombinerer pipeline, projekter, klippekort og support i én platform.
          Vælg den plan der passer til dit team — opgradér når I vokser.
        </p>
      </section>

      {/* Plan-kort */}
      <section className="max-w-6xl mx-auto px-6 pb-12">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
          {PLAN_LIST.map((plan) => {
            const isHighlighted = plan.slug === "medium";
            return (
              <div
                key={plan.slug}
                className={`relative rounded-2xl border p-6 flex flex-col ${
                  isHighlighted
                    ? "border-primary bg-primary/5 shadow-lg"
                    : "border-border bg-card"
                }`}
              >
                {isHighlighted && (
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-primary text-primary-foreground text-[10px] uppercase tracking-widest font-bold px-3 py-1 rounded-full">
                    Mest valgte
                  </div>
                )}
                <h3 className="text-xl font-bold">{plan.name}</h3>
                <p className="text-sm text-muted-foreground mt-1 mb-5">{plan.tagline}</p>

                <div className="mb-6">
                  <p className="text-4xl font-bold tabular-nums">
                    {formatPrice(plan.pricePerUserMonth[currency], currency)}
                  </p>
                  <p className="text-xs text-muted-foreground mt-1">pr. bruger / måned</p>
                  <p className="text-[11px] text-muted-foreground mt-0.5">
                    Default {plan.defaultUserSeats} bruger-licenser inkluderet
                  </p>
                </div>

                <ul className="space-y-2.5 mb-6 flex-1">
                  {plan.highlights.map((h) => (
                    <li key={h} className="text-sm flex items-start gap-2">
                      <Check className="h-4 w-4 text-emerald-600 shrink-0 mt-0.5" />
                      <span className="text-foreground/90">{h}</span>
                    </li>
                  ))}
                </ul>

                <Link
                  href="/login"
                  className={`w-full text-center py-2.5 rounded-lg text-sm font-semibold transition-colors ${
                    isHighlighted
                      ? "bg-primary text-primary-foreground hover:bg-primary/90"
                      : "bg-secondary text-foreground hover:bg-secondary/70"
                  }`}
                >
                  {plan.slug === "small" ? "Start gratis i 14 dage" : "Vælg " + plan.name}
                </Link>
              </div>
            );
          })}
        </div>
        <p className="text-center text-xs text-muted-foreground mt-6">
          Alle priser er ekskl. moms. Du kan til enhver tid skifte plan eller annullere.
          Betaling håndteres af Stripe.
        </p>
      </section>

      {/* Add-ons */}
      <section className="max-w-6xl mx-auto px-6 pb-12">
        <div className="text-center mb-10">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-violet-500/10 text-violet-600 dark:text-violet-400 text-xs font-semibold mb-4">
            <Sparkles className="h-3.5 w-3.5" />
            Tilkøb
          </div>
          <h2 className="text-3xl font-bold mb-3">Skru op for indsigterne</h2>
          <p className="text-muted-foreground max-w-2xl mx-auto">
            Avancerede moduler du kan vælge til når din pipeline har volumen nok til at analysere.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-5 max-w-4xl mx-auto">
          {ADDON_LIST.map((addon) => (
            <div key={addon.slug} className="bg-card border border-border rounded-2xl p-6">
              <div className="flex items-start gap-3 mb-4">
                <div className="w-10 h-10 rounded-xl bg-violet-500/10 text-violet-600 dark:text-violet-400 flex items-center justify-center shrink-0">
                  <TrendingUp className="h-5 w-5" />
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="text-lg font-bold">{addon.name}</h3>
                  <p className="text-sm text-muted-foreground mt-0.5">{addon.tagline}</p>
                </div>
              </div>

              <ul className="space-y-2 mb-5">
                {addon.highlights.map((h) => (
                  <li key={h} className="text-sm flex items-start gap-2">
                    <Check className="h-3.5 w-3.5 text-emerald-600 shrink-0 mt-1" />
                    <span className="text-foreground/85">{h}</span>
                  </li>
                ))}
              </ul>

              {/* Pris-matrix pr plan */}
              <div className="pt-4 border-t border-border">
                <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold mb-2">
                  Pris pr. bruger / måned
                </p>
                <div className="grid grid-cols-3 gap-2">
                  {(["small", "medium", "large"] as PlanSlug[]).map((planSlug) => {
                    const available = isAddOnAvailable(addon.slug, planSlug);
                    const price = getAddOnPricePerUser(addon.slug, planSlug, currency);
                    return (
                      <div
                        key={planSlug}
                        className={`text-center py-2 rounded-lg border ${
                          available
                            ? "border-border bg-secondary/30"
                            : "border-dashed border-border bg-secondary/10 opacity-60"
                        }`}
                      >
                        <p className="text-[10px] uppercase tracking-wide text-muted-foreground font-semibold">
                          {planSlug}
                        </p>
                        {available ? (
                          <p className="text-base font-bold tabular-nums">
                            +{formatPrice(price, currency)}
                          </p>
                        ) : (
                          <p className="text-base text-muted-foreground flex items-center justify-center h-6">
                            <X className="h-4 w-4" />
                          </p>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Sammenligning */}
      <section className="max-w-5xl mx-auto px-6 pb-16">
        <h2 className="text-2xl font-bold text-center mb-8">Sammenlign pakker</h2>
        <div className="bg-card border border-border rounded-2xl overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-secondary/40 border-b border-border">
                <th className="text-left p-4 font-semibold">Modul</th>
                {PLAN_LIST.map((p) => (
                  <th key={p.slug} className="text-center p-4 font-semibold">
                    {p.name}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {[
                { key: "sales",      label: "Pipeline, tilbud & deals" },
                { key: "support",    label: "Support tickets" },
                { key: "marketing",  label: "Kampagner & leads" },
                { key: "products",   label: "Produktkatalog & priser" },
                { key: "projects",   label: "Projekter & klippekort" },
                { key: "licenses",   label: "Licenshåndtering" },
              ].map((row, i) => (
                <tr key={row.key} className={i % 2 === 0 ? "" : "bg-secondary/10"}>
                  <td className="p-4">{row.label}</td>
                  {PLAN_LIST.map((p) => (
                    <td key={p.slug} className="p-4 text-center">
                      {(p.modules as readonly string[]).includes(row.key) ? (
                        <Check className="h-4 w-4 text-emerald-600 mx-auto" />
                      ) : (
                        <span className="text-muted-foreground/40">—</span>
                      )}
                    </td>
                  ))}
                </tr>
              ))}
              <tr className="bg-violet-500/5 border-t border-border">
                <td className="p-4 font-semibold flex items-center gap-2">
                  <Sparkles className="h-4 w-4 text-violet-600" />
                  Forecast & Sales Intelligence
                  <span className="text-[10px] uppercase tracking-wider text-violet-600 dark:text-violet-400 font-bold">Tilkøb</span>
                </td>
                {PLAN_LIST.map((p) => {
                  const available = isAddOnAvailable("forecast", p.slug);
                  const price = getAddOnPricePerUser("forecast", p.slug, currency);
                  return (
                    <td key={p.slug} className="p-4 text-center">
                      {available ? (
                        <span className="text-xs tabular-nums text-violet-600 dark:text-violet-400 font-semibold whitespace-nowrap">
                          +{formatPrice(price, currency)} / seat
                        </span>
                      ) : (
                        <X className="h-4 w-4 text-muted-foreground/40 mx-auto" />
                      )}
                    </td>
                  );
                })}
              </tr>
            </tbody>
          </table>
        </div>
      </section>

      {/* CTA */}
      <section className="max-w-3xl mx-auto px-6 pb-16 text-center">
        <h2 className="text-2xl font-bold mb-3">Klar til at komme i gang?</h2>
        <p className="text-muted-foreground mb-6">
          Alle planer starter med 14 dages gratis prøveperiode. Intet kreditkort påkrævet.
        </p>
        <div className="flex items-center justify-center gap-3">
          <Link
            href="/login"
            className="px-6 py-2.5 rounded-lg bg-primary text-primary-foreground text-sm font-semibold hover:bg-primary/90 transition-colors"
          >
            Start gratis trial
          </Link>
          <a
            href="mailto:salg@plesnertech.dk?subject=Kontakt%20om%20CRM-X"
            className="px-6 py-2.5 rounded-lg bg-secondary text-foreground text-sm font-semibold hover:bg-secondary/70 transition-colors"
          >
            Kontakt salg
          </a>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-border">
        <div className="max-w-6xl mx-auto px-6 py-6 flex items-center justify-between text-xs text-muted-foreground">
          <Link href="/" className="inline-flex items-center gap-1 hover:text-foreground transition-colors">
            <ArrowLeft className="h-3 w-3" />
            Tilbage
          </Link>
          <p>CRM-X · Drevet af Plesner Tech</p>
        </div>
      </footer>
    </div>
  );
}
