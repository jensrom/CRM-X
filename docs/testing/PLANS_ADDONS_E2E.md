# E2E Test — Plans & Add-ons

Komplet manuel test-checklist for plan-katalog + Forecast-add-on flow.
Køres efter hver release der ændrer `lib/plans.ts`, `prisma/schema.prisma`
eller billing/onboarding-koden.

---

## Forudsætninger

- Super-admin-login klar (`jens@plesnertech.dk`)
- Mindst 1 testbar tenant pr plan (small / medium / large)
- Stripe i test-mode (sk_test_... + whsec_...)
- Browser med dark-mode + light-mode toggle

---

## Sektion 1 — Plan-katalog (lib/plans.ts)

| # | Test | Forventet |
|---|---|---|
| 1.1 | `getPlan("small")` | Returnerer PLANS.small |
| 1.2 | `getPlan("starter")` (legacy) | Returnerer PLANS.small via LEGACY_PLAN_MAP |
| 1.3 | `isAddOnAvailable("forecast", "small")` | `false` |
| 1.4 | `isAddOnAvailable("forecast", "medium")` | `true` |
| 1.5 | `isAddOnAvailable("forecast", "large")` | `true` |
| 1.6 | `getAddOnPricePerUser("forecast", "small", "DKK")` | `0` |
| 1.7 | `getAddOnPricePerUser("forecast", "medium", "DKK")` | `82` |
| 1.8 | `getAddOnPricePerUser("forecast", "large", "DKK")` | `54` |
| 1.9 | `calculatePlanPrice("medium", [...], 10, "DKK", ["forecast"])` | monthlyTotal = (109+82) × 10 = 1910 kr |
| 1.10 | `calculatePlanPrice("small", [...], 5, "DKK", ["forecast"])` | namedAddOns = [] (stripped), monthlyTotal = 68 × 5 = 340 kr |

---

## Sektion 2 — Admin tenant-detalje (super-admin portal)

Naviger til `/admin/tenants/<tenantId>`:

| # | Plan | Forventet |
|---|---|---|
| 2.1 | Small-tenant | Plan-dropdown viser "Small — 68 kr/seat/md", Forecast-checkbox er disabled med "Kræver Medium+" |
| 2.2 | Medium-tenant | Plan-dropdown viser "Medium — 109 kr/seat/md", Forecast-checkbox aktiv med "+82 kr/seat/md" |
| 2.3 | Large-tenant | Plan-dropdown viser "Large — 170 kr/seat/md", Forecast-checkbox aktiv med "+54 kr/seat/md" |
| 2.4 | Skift Small → Medium med Forecast aktiveret | Gem → tenant.addOns = ["forecast"], modules indeholder "forecast" |
| 2.5 | Skift Medium → Small med Forecast aktiveret | Gem → addOns auto-stripped til [], modules ikke længere "forecast" |
| 2.6 | Toggle Forecast af på Medium | Gem → modules.includes("forecast") = false, sidebar fjerner Forecast |

---

## Sektion 3 — Onboarding wizard (super-admin)

Naviger til `/admin/tenants/new` og gennemgå wizard:

| # | Trin | Forventet |
|---|---|---|
| 3.1 | Vælg Small i plan-kort | Forecast-add-on i "Tilkøbsmoduler"-sektion er disabled |
| 3.2 | Vælg Medium | Forecast-add-on aktiv, viser "+82 kr/seat/md" |
| 3.3 | Toggle Forecast on/off | Pris-preview opdaterer (basis + 82 kr/seat hvis on) |
| 3.4 | Vælg Large + Forecast | Pris-preview: (170 + 54) × seats = 224 × seats |
| 3.5 | ConfirmStep | Viser "Tilkøb: forecast" hvis valgt |
| 3.6 | Færdiggør wizard | Tenant oprettes med addOns=["forecast"], modules inkluderer "forecast" |

---

## Sektion 4 — Sidebar gating (kunde-tenant)

Log ind som tenant-admin:

| # | Plan + addOns | Forventet |
|---|---|---|
| 4.1 | Small uden Forecast | Forecast-menupunkt SKJULT i sidebar |
| 4.2 | Medium + Forecast | Forecast-menupunkt SYNLIG i sidebar med BETA-badge |
| 4.3 | Medium uden Forecast | Forecast-menupunkt SKJULT |
| 4.4 | Direkte URL `/forecast` på tenant uden Forecast | "Forecast ikke aktiveret" placeholder (eller redirect) |

---

## Sektion 5 — Stripe checkout (kunde-tenant)

Som tenant-admin på `/settings/billing`:

| # | Test | Forventet |
|---|---|---|
| 5.1 | `startCheckout("small")` | 1 line_item på Stripe, ingen add-ons |
| 5.2 | `startCheckout("medium", ["forecast"])` | 2 line_items: plan + forecast-add-on |
| 5.3 | `startCheckout("small", ["forecast"])` | 1 line_item (forecast filtrered fra) |
| 5.4 | Gennemfør checkout på Medium + Forecast | Stripe-fakturaen viser begge linjer separat |
| 5.5 | Webhook efter checkout | `tenant.addOns = ["forecast"]`, `tenant.modules` indeholder "forecast" |
| 5.6 | Customer Portal → fjern Forecast subscription item | Webhook opdaterer `tenant.addOns = []`, modules fjerner "forecast" |

---

## Sektion 6 — Backfill (engangs)

| # | Test | Forventet |
|---|---|---|
| 6.1 | `GET /api/admin/backfill-addons` som non-super-admin | 403 Forbidden |
| 6.2 | `GET /api/admin/backfill-addons` som super-admin | JSON med liste af migrerede tenants |
| 6.3 | Small-tenant der havde "forecast" i modules | `addOns=[]`, modules ikke længere "forecast" |
| 6.4 | Medium-tenant med "forecast" i modules | `addOns=["forecast"]`, modules uændret |

---

## Sektion 7 — Pris-konsistens

| # | Sted | Forventet |
|---|---|---|
| 7.1 | `/admin/tenants/<id>` add-on label | "+82 kr/seat/md" på Medium |
| 7.2 | Onboarding wizard add-on label | "+82 kr/seat/md" på Medium |
| 7.3 | Pricing-side (hvis eksisterer) | Konsistent med ovenstående |
| 7.4 | Stripe-faktura | Beløb = pris-beregner output |

---

## Sektion 8 — Edge cases

| # | Test | Forventet |
|---|---|---|
| 8.1 | Tenant med legacy plan "starter" | Vises som Small i admin, alle gates fungerer |
| 8.2 | Tenant med modules=["sales","forecast"] men addOns=[] | Backfill flytter forecast til addOns hvis plan ≥ medium |
| 8.3 | Slet Forecast modul direkte i admin uden at fjerne addOn | Næste sync renormaliserer fra addOns |
| 8.4 | Stripe webhook med ukendt price-id | Default plan = "small", addOns = [] |

---

## Quick-smoke efter hver deploy

3 hurtige checks før release approves:

1. **Admin tenant-page** loader uden fejl (alle 3 plans)
2. **Onboarding wizard** kan completes til ende (uden faktisk at oprette)
3. **Sidebar** på en kendt Medium+Forecast-tenant viser Forecast-menupunkt

Hvis disse 3 består — fortsæt med ovenstående sektioner ved næste ændring der rører lib/plans.ts.
