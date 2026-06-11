# CRM-X — Komplet Debug-rapport

**Dato:** 2026-06-04
**Metode:** Statisk audit (kode-niveau) + runtime-verificering i browser
**Scope:** Alle moduler, alle routes, alle server actions

---

## Executive summary

CRM-X er **byggemæssigt sundt og funktionelt**. De grundlæggende CRUD-flows i alle hovedmoduler virker (verificeret i browser: firma, kontakt, deal, ticket, projekt, klippekort). Compliance-laget (audit, MFA, GDPR-endpoints, security headers, cookie-banner) er på plads.

Der er **ingen kritiske crash-bugs** lige nu. Til gengæld er der:
- **3 moduler med ufærdig detaljevisning** (Quotes, Licenses, Products)
- **3 moduler med manglende delete-action** (Contacts, Klippekort-edit, Tenants)
- **Et UX-mønster der vildleder** (placeholders i number-felter ligner forudfyldte værdier)
- **Et tavst-fejl-mønster** (`updateMany`/`deleteMany` → ingen fejl hvis intet findes)
- **Settings/MFA, Compliance, Audit er funktionelle** men kan polishes (real-time søgning, filtre)

Anbefaling: Færdiggør CRUD-huller, ret tavse fejl, før der bygges nye features oven på.

---

## Verificering: hvad virker faktisk lige nu

Browser-testet ende-til-ende:

| Modul | Liste | Opret | Detalje | Resultat |
|---|---|---|---|---|
| Firmaer | ✓ | ✓ | ✓ | OK |
| Kontakter | ✓ | ✓ | ✓ | OK |
| Pipeline / Deals | ✓ | ✓ | ✓ | OK |
| Support tickets | ✓ | ✓ (T-0002) | ✓ | OK |
| Projekter | ✓ | ✓ (P-0002) | ✓ | OK |
| Klippekort | ✓ | ✓ (KB-0002) | ✓ | OK |
| Sub-processors-side | ✓ | — | — | OK |
| Cookie-banner | ✓ | — | — | OK |
| Audit-log-side | ✓ | (auto) | — | OK |
| Compliance-portal | ✓ | — | — | OK |
| Admin-portal | ✓ | (testet før) | ✓ | OK |

---

## Crash-risici og tavse fejl

### 1. `updateMany`/`deleteMany` i stedet for `update`/`delete`

**Hvor:** `leads.ts`, `campaigns.ts`, `licenses.ts`, `products.ts`, `settings.ts`, `invoices.ts`, `hour-bundles.ts`

**Vigtig præcisering:** Multi-tenant-isolationen er **IKKE** kompromitteret — alle id-felter er `cuid()` som er globalt unikke. Risikoen for at ramme en anden tenants record er nul.

**Den faktiske bug:** `updateMany({where: {id, tenantId}})` returnerer `{count: 0}` hvis row ikke findes — i stedet for at kaste en fejl. Det betyder:
- Slet/opdater af et ikke-eksisterende objekt → tavst nul-resultat
- Brugeren får "success", ingenting skete
- Ingen audit-event om at noget gik galt

**Fix:** Skift til `update`/`delete` (kaster P2025 ved miss) ELLER tjek `result.count > 0` og kast egen fejl.

**Impact:** Lav (sikkerhed), Medium (UX/observability).

### 2. `session.user.modules` uden default-guard

**Hvor:** `app/(tenant)/dashboard/page.tsx:74`

```ts
const modules = session?.user?.modules ?? []; // ← bør tilføjes
```

Hvis sessionsstrukturen ændres (fx en gammel session uden modules), crasher dashboardet på `.includes()`. **Fix:** En linje.

### 3. Login-audit-events skrives ikke (kendt fra task #27)

Mistanke: NextAuth's `authorize()`-context har constraints der gør at `db.auditLog.create` ikke når DB. Audit-tabellen modtager fint events fra alle andre steder. Bug er afgrænset, ikke katastrofal.

---

## Manglende funktionalitet pr. modul

CRUD-matrix på tværs af alle moduler:

| Modul | Liste | Detalje | Opret | Rediger | Slet | Komplethed |
|---|---|---|---|---|---|---|
| Firmaer | ✓ | ✓ | ✓ | ✓ | ✓ | 5/5 |
| Kontakter | ✓ | ✓ | ✓ | ✓ | ✗ | 4/5 |
| Pipeline / Deals | ✓ | ✓ | ✓ | ✓ | ✓ | 5/5 |
| Tilbud (Quotes) | ✓ | ✗ | ✗ | ✗ | ✗ | 1/5 |
| Kampagner | ✓ | ✓ | ✓ | ✓ | ✓ | 5/5 |
| Leads | ✓ | ✓ | ✓ | ✓ | ✓ | 5/5 |
| Support tickets | ✓ | ✓ | ✓ | ✓ | ✓ | 5/5 |
| Projekter | ✓ | ✓ | ✓ | ✓ | ✓ | 5/5 |
| Tidregistrering | (stub) | — | (via projekt/ticket) | — | — | 1/5 |
| Klippekort | ✓ | ✓ | ✓ | (kun via detalje) | ✓ | 4/5 |
| Licenser | ✓ | (modal) | ✓ | ✗ | ✗ | 2/5 |
| Fakturaer | ✓ | ✓ | ✓ | ✓ | ✓ | 5/5 |
| Produkter | ✓ | ✓ | ✓ | (via detalje) | ✗ | 3/5 |
| Rapporter | (stub) | — | — | — | — | 0/5 |
| Indstillinger / Brugere | ✓ | — | (via /admin) | ✓ | ✗ | 3/5 |
| Indstillinger / Roller | ✓ | ✓ | ✓ | ✓ | ✗ | 4/5 |
| Indstillinger / MFA | ✓ | — | (setup-flow) | ✓ | (disable) | 4/5 |
| Compliance & GDPR | ✓ | — | (export/erase) | — | — | OK til formål |
| Audit-log | ✓ | — | (auto) | — | — | OK til formål |
| Admin / Tenants | ✓ | ✓ | ✓ | ✓ | ✗ | 4/5 |

**Quick wins (≤2 timer hver):**
- Quotes: byg `quotes/new/page.tsx` + `quotes/[id]/page.tsx` (kan genbruge deal-actions)
- Kontakter: tilføj `deleteContact()` action + slet-knap i detalje
- Klippekort: dediker `klippekort/[id]/edit/page.tsx`
- Tenants: tilføj soft-delete + bekræftelses-modal i admin

**Lidt større opgaver:**
- Produkter: detalje-side findes nu, men edit er kun inline — separat edit-route hjælper på UX
- Tidregistrering: byg global `/time`-side med uge-/månedsvisning + filtre
- Rapporter: defineres som scope (mange muligheder; aftal med Jens)

---

## Polish-mangler

- **Number-felt placeholders** (`placeholder="20"`, `placeholder="0"`) ligner forudfyldte værdier → brugere submitter med tomt felt → tavs fejl. Vurder enten `defaultValue` eller `placeholder="fx 20"`.
- **PageHeader-prop-mismatch** (`action` vs `actions`) er rettet på de sider TS flaggede — men siderne bruger nu både `actions={}` og inline buttons. Konsistens-pass anbefales.
- **Form submit-disabled state** mangler. Hurtige dobbelt-klik kan oprette dubletter.
- **Tom-states** mangler eksplicit på `/time`, `/reports`, produkter-detaljer uden priser.
- **404-side** er Next.js' default. CRM-X-styled 404 ville signalere kvalitet.
- **Loading-states** mangler. Server actions kan tage tid; ingen `useFormStatus`-feedback synligt.
- **Søg i topbaren** (med ⌘K-hint) er ikke-funktionelt placeholder.

---

## Schema-kode-drift

- `InvoiceLine.timeLogId` og `InvoiceLine.productId` er i schema men aldrig brugt i actions. Enten skal fakturering kunne hente fra timelogs/produkter (smart!), eller felterne kan fjernes.
- Ingen fundne kode→schema mismatch efter sidste schema-update.

---

## Sikkerhed / compliance — status

| Område | Status |
|---|---|
| Multi-tenant data-isolation | ✓ (cuid + tenantId i alle queries) |
| TLS 1.3, AES-256 at rest | ✓ (Vercel + Neon) |
| Audit log | ✓ (med kendt bug i login-flow) |
| Rate limiting | ✓ (in-memory, klar til Upstash) |
| Password policy | ✓ (12 tegn, 3-af-4-klasser) |
| MFA (TOTP) | ✓ (setup-flow virker) |
| Security headers (HSTS, CSP, COOP, CORP, X-Frame-DENY) | ✓ |
| Cookie consent | ✓ (privacy-by-default) |
| GDPR export/erase | ✓ (via admin) |
| Sub-processors-side | ✓ |

---

## Anbefalet rækkefølge

**Først (≤ ½ dag):**
1. Guard `modules` i dashboard (1 linje)
2. Skift `updateMany`/`deleteMany` til `update`/`delete` med try/catch P2025
3. Fjern vildlende number-placeholders

**Derefter (1-2 dage):**
4. Byg manglende detalje-sider (Quotes, Licenses)
5. Tilføj manglende delete-actions (Contacts, Tenants)
6. Loading-states + disabled-submit-knapper

**Når compliance-lag skal udvides (1 dag):**
7. Fix login-audit-bug (NextAuth-context)
8. Tilføj audit-events til alle CRUD-actions

**Som separat projekt:**
9. Tenant-administration (se separat plan)
10. Rapporter-modul (kræver scope-aftale)
