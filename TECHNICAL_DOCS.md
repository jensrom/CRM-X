# CRM-X — Teknisk Dokumentation

> Multi-tenant CRM-platform til nordiske konsulenthuse.
> Bygget af Plesner Tech med fokus på sales-pipeline + support-tickets + projekt-styring + klippekort-økonomi.

---

## 1. Stak og infrastruktur

| Lag | Teknologi | Version |
|---|---|---|
| Runtime | Node.js | 20.x (Vercel) |
| Framework | Next.js | 15.5.18 (App Router) |
| Sprog | TypeScript | 5.x |
| Database | PostgreSQL (Neon) | 15 |
| ORM | Prisma | 6.19 |
| Auth | NextAuth | v5 beta (JWT-strategy) |
| UI | Tailwind CSS + Radix UI | 3.4 / 1.x |
| Ikoner | Lucide React | 0.454 |
| PDF | @react-pdf/renderer | 4.1 |
| Email | Resend + MS Graph + Gmail OAuth | — |
| Stripe | Stripe Checkout + Customer Portal | 22.2 |
| File storage | Vercel Blob | 2.4 |
| Hosting | Vercel | Hobby plan |
| Cron | Vercel Cron | dagligt |

---

## 2. Arkitektur

### 2.1 Multi-tenant-model

Alle ressourcer er row-isolated via `tenantId`. Hver tabel der lagrer kunde-data har en obligatorisk `tenantId String`-kolonne med foreign key til `Tenant`.

```
Tenant 1 ─┬─ Users 1..N
          ├─ Companies 1..N ──┬─ Contacts
          │                    ├─ Tickets
          │                    ├─ Projects
          │                    ├─ HourBundles (klippekort)
          │                    ├─ Invoices + Quotes
          │                    ├─ Attachments
          │                    └─ Comments
          ├─ Deals (pipeline)
          ├─ SalesTargets
          ├─ SlaPolicies
          └─ RecurringInvoices
```

Alle server-actions starter med:

```typescript
const session = await auth();
if (!session?.user?.tenantId) throw new Error("Ikke autoriseret");
```

…og hver Prisma-query har `tenantId: session.user.tenantId` i `where`-clausen.

### 2.2 Mapper-struktur

```
app/
  (tenant)/           ← Beskyttet bag tenant-session
    dashboard/
    kunder/[id]/      ← polymorf detalje med 11 tabs
    pipeline/[id]/
    quotes/[id]/
    invoices/
      recurring/      ← faste fakturaer
      [id]/
    sales/targets/
    support/tickets/[id]/
    projects/[id]/
    klippekort/[id]/
    settings/
      sla/
      calendar/
      email/
      billing/
      audit/
  admin/              ← Super-admin (platform-niveau)
  api/
    auth/[...nextauth]/
    webhooks/         ← Stripe, Resend
    cron/             ← recurring-invoices, notifications
    calendar/[token]/ ← personlig iCal
    invoices/[id]/pdf/
    quotes/[id]/pdf/
  actions/            ← "use server"-actions

components/
  layout/             ← AppSidebar, AppTopbar, ThemeProvider
  ui/                 ← Toast, Button, Badge
  comments/           ← CommentThread, MentionTextarea
  attachments/        ← AttachmentSection (drag-drop)
  sla/                ← SlaBadge
  companies/          ← CompanyTabBar, HealthBadge
  dashboard/          ← widget-komponenter
  shared/             ← BackButton, SiblingNav, PageHeader

lib/
  auth.ts             ← NextAuth config
  db.ts               ← Prisma singleton
  health-score.ts     ← Ren beregning (0-100 score)
  sla.ts              ← Ren SLA status-beregning
  ical.ts             ← RFC 5545 generator
  mentions.ts         ← @-tag parser
  i18n.ts             ← 5 sprog
  email/              ← Resend + Graph + Gmail wrappers
  forecast/           ← Sales-funnel + velocity engine

prisma/
  schema.prisma       ← 43 modeller
```

---

## 3. Datamodel

### 3.1 Centrale entiteter

**Tenant**
- Multi-tenancy rod. Hver tenant har egen plan (small/medium/large), modules (sales/support/projects/...), branding, system-email konfiguration, Stripe-subscription.

**User**
- Tilhører én tenant. Har rolle (admin/user/super_admin) + role-permissions. Email-OAuth-tokens for Microsoft/Google mailbox. MFA-secret + recovery-codes. Theme + language. CalendarToken til iCal-feed.

**Company (Kunde)**
- Hovedressource for B2B-data. CVR, adresse, branche, kontakt-info. Aggregerer Contacts, Products, Licenses, Tickets, Projects, HourBundles, Invoices, Quotes, Activities, Deals, Attachments, Comments. Health-score (0-100) beregnes af 5 signaler.

**Deal (Pipeline-element)**
- Stages: new → qualified → proposal → negotiation → won/lost. Value, probability, expectedCloseDate. Append-only `DealStageHistory` til velocity-analyse.

**Quote (Tilbud)**
- Q-XXXX nummerering. Lines med produkter (SaaS / klippekort / engangsbeløb). Konverteres til Invoice ved accept — klippekort-linjer auto-opretter HourBundle.

**Invoice (Faktura)**
- F-XXXX nummerering. Status: draft → sent → paid/overdue/cancelled. PDF-render via @react-pdf/renderer. Mailto- og Resend-send-flow.

**Ticket (Support)**
- T-XXXX nummerering. Status: open/pending_customer/pending_supplier/resolved/closed. Priority: low/normal/high/critical. SLA-tracking via `firstResponseAt`, `slaResponseDueAt`, `slaResolveDueAt`.

**Project**
- P-XXXX nummerering. Linket til HourBundles via junction ProjectBundle (prioriteret rækkefølge). BacklogItem (todo/in_progress/done). TimeLog tæller mod bundles.

**HourBundle (Klippekort)**
- KB-XXXX nummerering. `totalHours` købt, `usedMinutes` brugt. Status: aktiv / opbrugt. Resterende-timer beregnes af UI.

**TimeLog (Tidsregistrering)**
- Logges på enten ticket eller project. Kan trækkes fra et bundleId. `isBillable` flag. ActiveCheckIn-tabel sporer aktiv timer-sessions.

### 3.2 Nye entiteter (2026)

**Attachment** — polymorft fil-system. tenantId + uploadedById + præcis én af companyId/projectId/ticketId. Vercel Blob storage.

**Comment** — polymorft komment-system. tenantId + authorId + en af companyId/projectId/dealId/quoteId/invoiceId. `mentionedUserIds String[]` til @-tags. Visibility-felt (team/private/external) til fremtidig kundeportal.

**SalesTarget** — målsætning pr. bruger pr. periode. Type: revenue | won_deals. Period: month | quarter | year.

**CompanyHealthSnapshot** — trend-historik for health score. Skrives ved hver recalc.

**RecurringInvoice** — auto-fakturering. intervalType (monthly/quarterly/yearly), nextRunAt, lineTemplate (Json), status (active/paused/stopped). Genererer kladde-fakturaer via cron-jobs.

**SlaPolicy** — service level agreement pr. priority. responseTimeMin + resolveTimeMin. Auto-seedes med defaults.

---

## 4. Hovedfunktioner

### 4.1 Sales-funnel (Lead → Deal → Tilbud → Faktura)

1. **Lead** oprettes (manuelt eller fra kampagne)
2. Konverteres til **Deal** med stage="new"
3. Deal kan have flere produkter (DealProduct) — disse kan blive linjer i tilbud
4. **Tilbud** genereres fra deal med valgte produkter
5. Accepteret tilbud konverteres til **Faktura** med ét klik
6. Klippekort-linjer på tilbud auto-opretter **HourBundle** på kunden i samme transaktion

### 4.2 Support-flow med SLA

1. Ticket oprettes med priority (low/normal/high/critical)
2. SLA-policy lookup ud fra priority → beregner `slaResponseDueAt` + `slaResolveDueAt`
3. Når en agent skriver første **eksterne** kommentar sættes `firstResponseAt` automatisk
4. UI viser badge i farve-kode: met / ok / warning / breach
5. Dashboard-widget viser top-5 tickets i SLA-fare
6. Ved breach kan team eskalere (notifikations-system)

### 4.3 Klippekort-økonomi

- Konsulenthuse sælger pre-paid time-pakker
- HourBundle har `totalHours` købt og `usedMinutes` brugt
- TimeLog mod ticket/project kan trække fra et bundleId
- Et projekt kan have flere bundles i prioriteret rækkefølge (ProjectBundle)
- BundlePricingTier definerer timer-tærskler → kr/time (volumen-rabat)
- Dashboard advarer ved <20% restende
- Kalender-feed påminder om fornyelse

### 4.4 Forecast & analytics (BETA)

- DealStageHistory append-loggør stage-skifter
- ForecastSnapshot lagrer dagligt pipeline-status
- `lib/forecast/` har 5 analyser:
  - Funnel: konvertering pr. stage
  - Velocity: gennemsnitlig tid pr. stage
  - Revenue: forventet/konservativ/best case 6 mdr frem
  - Win rate over tid
  - What-if-simulator

### 4.5 Customer Health Score

`lib/health-score.ts` beregner 0-100 score fra 5 vægtede signaler:

| Signal | Vægt | Logik |
|---|---|---|
| Engagement | 25% | Dage siden sidste kontakt (ticket/aktivitet/email) |
| Support | 25% | Åbne kritiske tickets straffer hårdt |
| Klippekort | 20% | Resterende timer / total |
| Licenser | 15% | Aktive vs nyligt udløbne |
| Betaling | 15% | Forfaldne fakturaer + beløbs-andel |

Klassificering:
- 80-100: Sund (grøn)
- 60-79: OK (blå)
- 40-59: Opmærksomhed (gul)
- 0-39: Risiko (rød)

Snapshot lagres ved hver recalc → trend-graf mulig.

### 4.6 Multi-channel email

`lib/email/` har 3 providers:
- **Resend** — system-mails fra verificeret tenant-domæne
- **Microsoft Graph** — personlige mails fra brugerens M365-mailbox
- **Google Gmail** — personlige mails fra brugerens Workspace-mailbox

OAuth-tokens lagres krypteret i `User.emailAccessToken/RefreshToken`. EmailLog tracker alle udsendte mails med status (sent/delivered/opened/clicked/bounced/complained) opdateret via Resend webhook.

Som fallback har vi **mailto**-knap der åbner brugerens lokale mailklient og logger åbningen.

### 4.7 Recurring invoices (faste fakturaer)

- Admin opretter RecurringInvoice med lineTemplate
- Cron-job `/api/cron/recurring-invoices` rammer dagligt 06:00 UTC
- Henter alle `status="active"` + `nextRunAt <= now`
- Genererer kladde-faktura med korrekt nummer + nextRunAt bumpes
- Dashboard-banner advarer brugeren om at sende kladderne

Vigtigt: vi opretter **kladder, ikke auto-sender**. Brugeren skal aktivt sende. Vi er ikke et auto-charge-system.

### 4.8 Personlig iCal-feed

Hver bruger får en privat URL (`/api/calendar/[token].ics`) der returnerer RFC 5545 iCalendar:

- 🎫 Åbne tickets tildelt brugeren (deadline = updatedAt + 7 dage)
- 📁 Aktive projekter (deadline = endDate)
- 💰 Ubetalte fakturaer (deadline = dueDate)
- ✂️ Klippekort under 20% (påmindelse 7 dage frem)

Hver event har stabil UID for deduplikation. Kalender-klienter (Google/Outlook/Apple) poller hver 1-24 timer.

### 4.9 Polymorf comment-system med @-mentions

`Comment`-tabel har 5 mulige parents (Company/Project/Deal/Quote/Invoice). `mentionedUserIds String[]` til at huske @-tags.

`MentionTextarea` (klient-komponent) har type-ahead picker:
- Detekterer `@` ved cursor
- 150ms debounce på fuzzy-search blandt tenant-brugere
- ↑↓ navigerer, Enter/Tab indsætter `@[Navn](userId)`-markup
- Render i CommentThread viser tags som primary-chips

Hver gang nogen tagges → notifikation oprettes via Notification-tabel med deep-link tilbage til komment-konteksten.

### 4.10 Filer (polymorf)

`Attachment`-tabel kan hænge på Company/Project/Ticket. Bruger Vercel Blob med client-direct upload (bypasser 4.5MB Vercel-payload-limit).

`/api/attachments/upload` bruger `handleUpload` pattern: klient signer mod endpoint → uploader direkte til blob → server-callback opretter DB-row.

AttachmentSection (klient) har:
- Drag-and-drop dropzone
- Multi-file upload med live progress-bar
- Type-specifikt ikon (image/video/PDF/regneark/arkiv)
- 50MB max pr fil

---

## 5. Cron-jobs (`vercel.json`)

```json
{
  "crons": [
    { "path": "/api/cron/notifications", "schedule": "0 7 * * *" },
    { "path": "/api/cron/recurring-invoices", "schedule": "0 6 * * *" }
  ]
}
```

- **07:00 UTC**: Notifikationer — daglige påmindelser om SLA-breach, klippekort <20%, forfaldne fakturaer
- **06:00 UTC**: Recurring invoices — genererer kladde-fakturaer

Beskyttet med `CRON_SECRET` Bearer-token.

---

## 6. Compliance & sikkerhed

### 6.1 Audit-log

`AuditLog`-tabel logger alle væsentlige handlinger:
- Actor: tenant-bruger eller super-admin
- Action: create/update/delete/login/etc
- Resource: type + id
- Before/after JSON-state
- IP + user-agent
- Outcome: success/failure

UI på `/settings/audit` med filtre + pagination.

### 6.2 MFA (TOTP)

- RFC 6238-compatible
- ISO 27001 A.8.5 + SOC 2 CC6.1 + GDPR Art. 32 kompatibilitet
- Secret krypteres på app-laget før save
- 10 single-use recovery-codes (bcrypt-hashed)

### 6.3 Password security

- bcrypt 12 rounds
- Failed-login-counter + lockout
- Password-changed-tracker (tvinger re-login)
- Lifecycle audit-logges

### 6.4 GDPR & compliance

`/settings/compliance` har:
- Dataeksport (alle tenant-data som JSON-bundle)
- Kunde-anmodning-håndtering
- Sletning af persondata med audit-trail
- Sletteperiode (30 dage soft-delete før hard-delete)

### 6.5 Multi-tenant-isolation

- Hver query har `tenantId`-clausule i where
- Foreign keys håndhæves på DB-niveau
- Cascade-delete fra Tenant ved tenant-sletning
- Cross-tenant adgang umulig uden super-admin-impersonation

### 6.6 Super-admin impersonation

Super-admin kan agere på en tenants vegne. Ved oprettelse logges:
- `createdById` = tenant-brugeren der "udførtes som"
- `createdByImpersonatorId` = super_admin
- Audit-log markerer eksplicit impersonation

CreatorBadge i UI viser begge.

---

## 7. Server-actions (kritiske patterns)

### 7.1 Form-actions

```typescript
"use server";

export async function createX(formData: FormData) {
  const session = await getSession();  // tenant-check
  // ... parse formData
  await db.x.create({ data: { tenantId: session.user.tenantId, ... } });
  revalidatePath("/x");
}
```

### 7.2 Bound actions

```tsx
<form action={deleteX.bind(null, id)}>
  <button type="submit">Slet</button>
</form>
```

### 7.3 Krav: Alle exports i "use server"-fil SKAL være async

Ren-funktioner (uden DB) skal placeres i `lib/` og importeres separat. Eksempel:

- `lib/sales-periods.ts` har `periodBounds()` (ren funktion)
- `app/actions/sales-targets.ts` importerer den

Hvis du forsøger at exportere en non-async funktion fra en `"use server"`-fil får du build-fejl: *"Server Actions must be async functions"*.

---

## 8. UI-system

### 8.1 Tailwind + CSS-variabler

Theme-tokens i `app/globals.css`:

```css
:root {
  --background: 0 0% 100%;
  --foreground: 222 47% 11%;
  --card: 0 0% 100%;
  --border: 220 13% 91%;
  --primary: 221 83% 53%;
  ...
}

.dark {
  --background: 222 47% 11%;
  --foreground: 210 40% 96%;
  --card: 217 33% 17%;
  ...
}
```

ThemeProvider toggler `.dark`-class på `<html>` baseret på User.theme (light/dark/system).

### 8.2 Komponent-bibliotek

- **Button** — class-variance-authority-baseret variant-system
- **Badge** — farve-varianter (success/warning/danger/...)
- **Toast** — Radix Toast wrapper med success/error/info varianter
- **EmptyState** — ikon + titel + description + CTA
- **PageHeader** — title + description + actions
- **BackButton** — smart "husk hvor jeg kom fra" via ?from-param + document.referrer
- **SiblingNav** — Forrige/Næste pile på detalje-sider
- **CreatorBadge** — tag der viser hvem der oprettede ressourcen + impersonation

### 8.3 Mobil-strategi

- `<md` (768px): Sidebar bliver overlay-drawer med MobileMenuButton
- Tabs med `overflow-x-auto` horisontal scroll
- Touch-target min 44x44 px
- Forms staker vertikalt på mobile

---

## 9. Deployment

### 9.1 Vercel-konfiguration

```json
{
  "framework": "nextjs",
  "buildCommand": "prisma generate && next build",
  "installCommand": "npm ci",
  "regions": ["fra1"]  // Frankfurt = nordisk-tæt
}
```

### 9.2 Env vars (production)

| Var | Formål |
|---|---|
| `DATABASE_URL` | Neon pooled connection (Prisma queries) |
| `DIRECT_URL` | Neon direct (Prisma migrations) |
| `NEXTAUTH_SECRET` | JWT signing |
| `NEXTAUTH_URL` | OAuth callback URL |
| `EMAIL_TOKEN_KEY` | Krypterer OAuth-tokens i DB |
| `GOOGLE_CLIENT_ID/SECRET` | Gmail OAuth |
| `MICROSOFT_CLIENT_ID/SECRET` | Graph OAuth |
| `RESEND_API_KEY` | System-email |
| `RESEND_FROM_ADDRESS` | Fallback fra-adresse |
| `STRIPE_SECRET_KEY` | Stripe API |
| `STRIPE_WEBHOOK_SECRET` | Webhook-signering |
| `STRIPE_PRICE_SMALL/MEDIUM/LARGE` | Price-IDs |
| `BLOB_READ_WRITE_TOKEN` | Vercel Blob storage |
| `CRON_SECRET` | Cron-endpoint auth |
| `NEXT_PUBLIC_APP_URL` | Public URL for iCal-events |

### 9.3 Deploy-flow

```powershell
git push                  # Auto-deploy via Vercel hook
npx prisma db push        # Schema-sync mod prod-DB
```

Vercel kører på `main`-branch. Hver commit trigger ny deployment. PR-deployments får preview-URL.

### 9.4 Force-dynamic på tenant-pages

Tenant-pages skal IKKE prerendres ved build (de kræver session + DB). Alle pages i `app/(tenant)/` har:

```typescript
export const dynamic = "force-dynamic";
export const revalidate = 0;
```

eller layout-niveau:

```typescript
// app/(tenant)/layout.tsx
export const dynamic = "force-dynamic";
export const revalidate = 0;
```

Glemmer du det får du `Failed to fetch` ved build.

---

## 10. Plan-tiers (SaaS-pakker) + Add-ons

### Plan-pakker

| Pakke | Default seats | Pris/seat/md (DKK) | Pris/seat/md (USD) | Inkluderede moduler |
|---|---|---|---|---|
| **Small** | 5 | 68 kr | $10 | sales, support |
| **Medium** | 10 | 109 kr | $16 | + marketing, products |
| **Large** | 25 | 170 kr | $25 | + projects, licenses |

Single source of truth: `lib/plans.ts` — `PLANS`-katalog.

### Named add-ons (tilkøb)

Add-ons sælges separat oven på en plan. Pris er **plan-afhængig** så større kunder får volumen-rabat:

| Add-on | Small | Medium | Large |
|---|---|---|---|
| **Forecast & Sales Intelligence** | ❌ Ikke tilgængelig | +82 kr ($12) /seat/md | +54 kr ($8) /seat/md |

Filosofi: Small kan ikke vælge Forecast fordi feature kræver data-volumen (deals, leads) der typisk ikke eksisterer på lille plan.

Single source of truth: `lib/plans.ts` — `ADDONS`-katalog.

**Datamodel:**
- `Tenant.modules: String[]` — alle aktive features (inkl. add-ons auto-merget for sidebar-gating)
- `Tenant.addOns: String[]` — kun tilkøbte add-ons (bruges af billing)

**Validering:**
- `lib/plans.ts:isAddOnAvailable(slug, plan)` — UI-gating
- `app/actions/admin.ts:sanitizeAddOns()` — server-side strip ved Small
- `app/actions/admin.ts:mergeAddOnsIntoModules()` — auto-sync til modules

### Stripe-integration

Stripe Checkout opretter subscription med plan-linje + valgfri add-on-linjer:

```
Subscription items:
  • CRM-X Medium plan       → 109 kr/seat × 10 seats = 1090 kr/md
  • Forecast add-on          → 82 kr/seat × 10 seats =  820 kr/md
  Total                                              = 1910 kr/md
```

`app/actions/billing.ts:startCheckout(plan, addOns)` bygger line_items.
`app/api/webhooks/stripe/route.ts:syncSubscription()` detekterer add-on price-ids og opdaterer `Tenant.addOns` automatisk.

**Required Stripe env-vars:**
- `STRIPE_PRICE_SMALL`, `STRIPE_PRICE_MEDIUM`, `STRIPE_PRICE_LARGE` — plan-priser
- `STRIPE_PRICE_FORECAST_MEDIUM`, `STRIPE_PRICE_FORECAST_LARGE` — Forecast add-on priser (Small har ingen)

### Backfill (engangs)

`GET /api/admin/backfill-addons` (super-admin only) migrerer eksisterende tenants:
- Small-tenants med `forecast` i modules → fjernes (kan ikke have add-on)
- Medium/Large med `forecast` → flyttes til addOns-array

License-cap håndhæves i UI (`/settings/users`) + ved invite-flow.

---

## 11. i18n (5 sprog)

`lib/i18n.ts` har keys for sidebar + globale labels. Brugere kan vælge sprog under `/settings`.

| Kode | Sprog |
|---|---|
| da | Dansk (default) |
| en | English |
| sv | Svenska |
| no | Norsk |
| de | Deutsch |

Tenant har default-sprog. User kan override på personligt niveau.

---

## 12. Performance-noter

### 12.1 Database-indexer

Hver Prisma-model har `@@index([tenantId, ...])` på de mest brugte queries:

```prisma
@@index([tenantId, status, nextRunAt])  // RecurringInvoice cron
@@index([tenantId, createdAt])           // AuditLog filter
@@index([userId, isRead])                // Notification poll
@@index([tenantId, companyId, createdAt]) // Comment liste
```

### 12.2 Polling-pattern

Aktive widgets poller hver 60 sekunder:
- NotificationBell
- TimerWidget (aktiv check-in)

Brug af WebSockets undgået for at holde Vercel-omkostninger nede.

### 12.3 Server Components default

Hver page-fil er en Server Component (RSC). Client Components får `"use client"`-direktiv. Det betyder:
- Mindre JS sendt til klient
- Direkte DB-adgang fra render-fasen
- Sub-second initial load

---

## 13. Kendte begrænsninger

- **Mobile responsive** er funktionelt OK men kunne polishes (touch-targets, drawer-animationer)
- **Cmd+K globalsøg** kan kollidere med browser-genvejen i nogle browsere — alternativ: `/` i søgefelt
- **Vercel Cron** på Hobby-plan kører kun dagligt — for hyppigere kør skal Pro-plan
- **Real-time updates** (kollab på samme deal) ikke implementeret — polling i stedet
- **Multi-currency** ikke implementeret — alle priser i DKK eller tenant.billingCurrency
- **Mobile app** ikke implementeret — PWA-manifest mangler

---

## 14. Roadmap

### 14.1 Kortere sigt (1-2 uger)

- [ ] Kundeportal (eksternt login for kunden)
- [ ] Multi-currency på deals (DKK/EUR/USD/SEK/NOK)
- [ ] Bulk-actions på pipeline (flyt N deals)
- [ ] PWA med offline support
- [ ] Recharts v3 migration

### 14.2 Mellemlang sigt (1-3 mdr)

- [ ] AI-tilbuds-generator via Anthropic API
- [ ] Webhooks for tenants (deal won, ticket created, etc)
- [ ] Drip-email-kampagner
- [ ] Sales-leaderboard med animationer
- [ ] Avanceret rapport-generator

### 14.3 Vision

- [ ] Microsoft Azure-app registrering (kræver Azure-konto)
- [ ] Salesforce-/HubSpot-import
- [ ] Native mobil-apps (iOS/Android)
- [ ] White-label-tilpasning pr. tenant

---

## 15. Filer pr feature

| Feature | Hovedfil | Helpers |
|---|---|---|
| Auth | `lib/auth.ts` | `middleware.ts` |
| DB | `lib/db.ts` | `prisma/schema.prisma` |
| Sales targets | `app/actions/sales-targets.ts` | `lib/sales-periods.ts` |
| Health score | `app/actions/health-score.ts` | `lib/health-score.ts` |
| SLA | `app/actions/sla.ts` | `lib/sla.ts` |
| Recurring | `app/actions/recurring-invoices.ts` | `app/api/cron/recurring-invoices/route.ts` |
| Comments | `app/actions/comments.ts` | `lib/mentions.ts` |
| iCal | `app/api/calendar/[token]/route.ts` | `lib/ical.ts` |
| Attachments | `app/api/attachments/upload/route.ts` | `lib/blob.ts` |
| Forecast | `lib/forecast/*` | `app/(tenant)/forecast/` |
| Email | `lib/email/*` | `app/api/webhooks/resend/` |
| Stripe | `lib/stripe.ts` + `app/api/webhooks/stripe/` | `app/actions/billing.ts` |
| Audit | `lib/audit.ts` | `app/(tenant)/settings/audit/` |

---

## 16. Test-credentials (demo-tenant)

```
Workspace: demo
Email: erik@novotek.com
Password: Demo2026!
URL: https://crm-x-eight.vercel.app
```

Demo-tenanten har 10 kunder, 14 tickets, 9 deals, 6 fakturaer, 10 klippekort, 10 projekter — fyldt med realistisk data via `prisma/seed-demo.mjs`.

---

## 17. Support & ejerskab

- **Repository**: https://github.com/jensrom/CRM-X
- **Vercel project**: jensroms-projects/crm-x
- **Database**: Neon (project: crm-x, region: eu-central-1)
- **Domæne**: crm-x-eight.vercel.app (custom domæne kan tilføjes)
- **Maintainer**: Jens Rommedahl (Plesner Tech)

---

*Sidst opdateret: 22. juni 2026 — 159 implementerede tasks, alt deployed til Vercel-prod.*
