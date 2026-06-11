# Super-admin Tenant-administration — Implementeringsplan

**Scope:** Udvidelse af `/admin`-portalen så Plesner Tech kan administrere alle CRM-X-kunder fra ét sted.
**Billing-strategi:** Eksternt (Economic / Stripe Checkout-link). CRM-X aktiverer tenanten ved manuel bekræftelse.
**Brugerflow:** Hybrid — tenant-admin vælger pr. bruger om de skal have invite-link eller manuelt-sat password.

---

## Nuværende tilstand

Det er allerede bygget:
- `/admin` — tenant-liste (KPI'er + tabel)
- `/admin/tenants/new` — opret tenant (manuelt felt-baseret)
- `/admin/tenants/[id]` — tenant-detalje
- `/admin/tenants/[id]/users` — bruger-administration på tenant
- Server actions: `createTenant`, `updateTenant`, `createTenantUser`, `toggleUserActive`, `resetUserPassword`
- Schema: `Tenant` (slug, modules, plan, maxUsers, prefixes, isActive)
- Auto-oprettelse af 3 system-roller ved tenant-create

Det der ikke virker / mangler:
- Ingen onboarding-wizard — alt er ét stort form
- Ingen suspension eller sletning (kun toggle af isActive)
- Ingen billing-tracking (plan-feltet er kun cosmetic)
- Ingen invite-flow — brugere oprettes med fast password
- Ingen super-admin dashboard på tværs af tenants
- Ingen impersonation / support-værktøjer
- Sub-processors er hardcoded i `app/legal/subprocessors/page.tsx`

---

## Fase 1 — Tenant-livscyklus (3-4 dage)

Det fundamentale: at oprette, suspendere, slette og logge tenant-state.

### 1.1 Onboarding-wizard
- Multi-step form (4 trin): Firma → Admin-kontakt → Moduler & plan → Bekræftelse
- State persistes i URL-params så side-reload ikke mister data
- Pre-validering pr. trin (slug-availability, email-format)
- Bekræftelses-skærm med klart resumé før commit

### 1.2 Tenant-tilstande
- Status-felt udvides fra `isActive: boolean` til enum: `active | trial | suspended | scheduled_deletion | deleted`
- UI-badges + farver pr. status
- Automatiske handlinger:
  - Trial → active når billing bekræftet
  - Active → suspended ved manuel handling
  - Suspended → scheduled_deletion efter 30 dage (cron)
  - Scheduled_deletion → deleted efter yderligere 60 dage (90 dage total)
  - Dataeksport tilgængelig hele cooldown-perioden

### 1.3 Audit på alle tenant-handlinger
- `tenant_create`, `tenant_suspend`, `tenant_activate`, `tenant_schedule_delete`, `tenant_purge`, `module_change`, `plan_change`
- Spores allerede delvis via lib/audit.ts — udvid i admin.ts

### 1.4 Data-eksport pr. tenant
- "Eksportér alle tenant-data som ZIP" — JSON pr. tabel
- Tilgængelig for super-admin før hard-delete
- Tilgængelig for tenant-admin (allerede dækket i compliance-portal)

**Leverancer:** Onboarding-wizard | Status-flow | Soft+hard delete med cooldown | Audit-events

---

## Fase 2 — Bruger-management 2.0 (2-3 dage)

Den hybride model: invite-link ELLER manuel password.

### 2.1 Invite-token-system
- Ny tabel `UserInvite { token, email, tenantId, roleId, expiresAt, usedAt }`
- Tokens er 32-bytes random, hash i DB (kun token + email kan bruges)
- Default udløb: 7 dage
- Endpoint: `/accept-invite?token=...` → sætter password + valgfri MFA → log ind

### 2.2 Bulk-invite via CSV
- Upload `name,email,role` CSV
- Forhåndsvis hvor mange invites der sendes
- Sender én batch e-mails via Resend
- Logger batch-event i audit

### 2.3 License-cap håndhævelse
- Block oprettelse hvis `aktive brugere ≥ maxUsers`
- UI viser counter: "12/50 brugere brugt"
- Når maxUsers nås, vises "Opgrader plan" CTA

### 2.4 MFA-tvang pr. tenant
- Tenant-konfiguration: `mfaRequired: boolean`
- Hvis true: brugere uden MFA tvinges til at sætte det op næste login
- UI i admin: "Tving MFA for denne tenant"

### 2.5 Bruger-audit
- Når en super-admin ændrer en tenant-bruger → audit + email-notifikation til tenant-admin
- Transparency-rapport pr. tenant

**Leverancer:** Invite-flow | CSV-bulk | License-cap | MFA-tvang | Audit + notifikation

---

## Fase 3 — Billing-light (2 dage)

Ekstern billing, men intern tracking så vi ved hvem der har betalt.

### 3.1 Plan-katalog
- Ny tabel `Plan { id, name, slug, pricePerMonth, includedModules, maxUsers, isPublic }`
- Plans: Starter / Professional / Enterprise (justérbar fra UI)
- Tenant-form: vælg plan → moduler + maxUsers fyldes automatisk (kan overrides)

### 3.2 Billing-status
- Nyt felt: `Tenant.billingStatus: 'paid' | 'overdue' | 'trial' | 'cancelled'`
- Nyt felt: `Tenant.nextInvoiceDue: DateTime`
- Manuel handling: "Marker som betalt" sætter `paid` + flytter `nextInvoiceDue` frem
- Cron-job: tjekker dagligt om nogen er overdue, sender mail-påmindelse

### 3.3 Stripe Checkout-link (valgfri integration)
- Hvis Stripe API-nøgle sat: generér checkout-link pr. tenant
- Webhook ved `checkout.session.completed` → auto-marker som paid
- Hvis Stripe ikke sat: pure manuel mode

### 3.4 Faktura-historik
- `TenantInvoice { tenantId, amount, dueDate, paidDate, externalUrl }`
- Link til ekstern faktura (Economic/Stripe-dashboard)
- Eksport som CSV til regnskab

**Leverancer:** Plan-katalog | Billing-status pr. tenant | Stripe-link valgfri | Manuel faktura-tracking

---

## Fase 4 — Super-admin dashboard (1-2 dage)

Plesner Tech skal kunne se hele forretningen på én side.

### 4.1 KPI-strimmel
- Antal aktive tenants
- Antal brugere på tværs
- MRR-estimat (sum af plan-priser)
- Tenants i trial / overdue / suspended

### 4.2 Modul-fordeling
- Hvor mange tenants bruger hvilke moduler (donut/bar)
- Hjælper produktbeslutninger

### 4.3 Aktivitets-feed
- Sidste 30 events: nye tenants, plan-skift, suspensions, brugere oprettet
- Klik → linker til relevant tenant-detalje

### 4.4 Cross-tenant søgning
- Søg på: firma-navn, slug, admin-email
- Returnerer resultater på tværs af alle tenants
- Hurtig genvej til den rette tenant-side

### 4.5 Statistik over tid
- Trend-grafer: tenants over tid, brugere over tid, MRR over tid
- Recharts (allerede importeret)

**Leverancer:** Ny `/admin` overview-page | Modul-stats | Aktivitets-feed | Cross-tenant search

---

## Fase 5 — Support-værktøjer (1-2 dage)

Det Plesner Tech har brug for når en kunde ringer.

### 5.1 Impersonation
- Knap "Log ind som tenant-admin (read-only)"
- Genererer en kort-lived session (max 1 time) med flag `impersonating: true`
- Tydelig banner i UI: "Du er logget ind som [bruger] på vegne af Plesner Tech support"
- Ingen write-handlinger tilladt under impersonation
- Audit-event på både start og slut

### 5.2 Tenant-snapshot
- "Eksportér konfiguration" — kun struktur (ikke kunde-data), bruges til at debugge fejl
- Inkluderer: moduler, roller, brugere, integrations-konfig

### 5.3 Support-noter pr. tenant
- Internal notes der kun super-admin ser
- Tidsstemplet, kan ikke redigeres bagefter (audit-trail)
- Eks: "Kunde rapporterer fejl i klippekort — venter på fix i version 1.2"

### 5.4 Status-flag
- Per-tenant flag: "Premium support", "Forventer rampe-up", "VIP — escalate fejl"
- Vises på liste-view som badges

**Leverancer:** Impersonation | Konfig-snapshot | Support-noter | Status-flag

---

## Fase 6 — Compliance & sub-processors-management (1 dag)

### 6.1 Sub-processors fra database
- Schema: `SubProcessor { name, service, dataCategories, location, certifications, website, addedAt }`
- Admin UI: tilføj/rediger/fjern sub-processors
- `/legal/subprocessors` læser fra DB i stedet for hardcoded liste
- Versionering: hver ændring øger `version`

### 6.2 Tenant-notifikation ved ændring
- Når sub-processor tilføjes/fjernes → 14-dages varsel-email til alle tenant-admins
- E-mail indeholder diff: hvad ændres, hvad betyder det for tenanten
- Audit-event pr. notifikation sendt

### 6.3 DPA-versionering
- `DPA { version, effectiveFrom, contentMarkdown }`
- `TenantDPAAcceptance { tenantId, dpaVersion, acceptedAt, acceptedBy }`
- Når ny DPA-version: vis i admin-portal hvem der har/ikke har accepteret
- Tenant-admin ser banner indtil de accepterer

**Leverancer:** Dynamisk sub-processor-liste | Auto-notifikation | DPA-versionering

---

## Fase 7 — Hærdning af super-admin selv (1 dag)

### 7.1 MFA-tvang for super-admin
- Alle super-admin konti SKAL have MFA aktiveret
- Force-onboarding ved login hvis ikke

### 7.2 Granular adgang
- I dag er der kun "super_admin"-rolle. Tilføj:
  - `super_admin_full` — alt
  - `super_admin_support` — read + impersonation (ikke create/delete)
  - `super_admin_billing` — billing-handlinger
  - `super_admin_audit` — kun audit-view
- Schema: udvid `SuperAdmin` med `role` enum

### 7.3 IP-allowlist (valgfri)
- Konfigurérbar liste af tilladte IP'er for super-admin-login
- For Plesner Techs eget kontor/VPN
- Slå fra hvis lokationen er meget mobil

### 7.4 Session-hardening
- Super-admin sessions max 1 time idle, 4 timer absolut
- Re-auth påkrævet før destructive actions (tenant delete, password reset)

**Leverancer:** Tvunget MFA | Roller pr. super-admin | IP-allowlist | Re-auth gates

---

## Anbefalet rækkefølge

| Fase | Indhold | Dage | Værdi |
|---|---|---|---|
| 1 | Tenant-livscyklus + onboarding-wizard | 3-4 | Højest — pengene starter her |
| 2 | Bruger-management 2.0 (invite-flow) | 2-3 | Højest — kunde-forventning |
| 3 | Billing-light | 2 | Høj — sikrer du får betalt |
| 7 | Super-admin hærdning | 1 | Høj — beskytter platformen |
| 4 | Super-admin dashboard | 1-2 | Medium — kvalitet over kvantitet |
| 6 | Sub-processors-management | 1 | Medium — vigtig for compliance når kunder vokser |
| 5 | Support-værktøjer | 1-2 | Lavere — bygges når du har ramt 5+ kunder |

**Samlet estimat:** 11-15 dages effektivt udviklingsarbejde.

---

## Fælles komponenter på tværs af faser

Mens vi bygger, bør disse komponenter ekstraheres til genbrug:

- `<TenantStatusBadge />` — visuel indikator
- `<TenantSearchInput />` — cross-tenant søg
- `<AdminAuditLink />` — link til audit-events for et objekt
- `<ConfirmDestructive />` — bekræftelses-modal med "skriv X for at bekræfte"
- `<EmptyState />` — er der allerede; kan udvides med super-admin variant
- `<MultiStepForm />` — wizard-state-machine til onboarding

---

## Låste beslutninger (2026-06-04)

| Område | Valg |
|---|---|
| Plan-katalog | **Small** $10/u/md (Core+Support), **Medium** $16/u/md (+Marketing+Produkter), **Large** $25/u/md (+Projekter+Licenser+API på sigt) |
| Trial-længde | 14 dage standard |
| Onboarding-felter | Firma (navn, slug, CVR, branche, adresse, hjemmeside, størrelse), Admin (navn, email, telefon, stilling), Plan (pakke, brugere, trial), Branding (logo, farve, velkomst) |
| Invite-tone | Mix: warm til Small/Medium, professional til Large |
| Valuta | USD + DKK med auto-detektion fra Accept-Language |
| Branding-trin | Med fra start, skip-knap synlig |
| MFA for tenant-admin | Tvungen (implementeres i Fase 7) |

## Status — Fase 1.1 (færdig 2026-06-04)

**Implementeret:**
- Schema: `Tenant` udvidet med status, trial, billing, kontakt, adresse, branding-felter
- Schema: ny `UserInvite`-tabel (token-hash, status, tone, expiry)
- `lib/plans.ts` — Small/Medium/Large som single source of truth + valuta-helper + trial-beregning
- `lib/invite-mail.ts` — to mail-toner (warm + professional), plain text + HTML, Resend-integration
- `components/shared/MultiStepForm.tsx` — generisk wizard-shell
- `components/admin/onboarding/` — 5 trin-komponenter (Company, AdminContact, Plan, Branding, Confirm)
- `app/actions/admin-onboarding.ts` — `createTenantFromWizard` + slug-availability-check
- `app/actions/invite.ts` — `validateInviteToken` + `acceptInvite` med password-policy + audit
- `app/accept-invite/page.tsx` — modtager-side med live password-rules + auto-login

**For at teste:**
```bash
npx prisma db push    # schema-update
npx prisma generate
# Genstart dev
```
Naviger til `/admin/tenants/new` som super-admin og kør wizard'en igennem.

**Næste fase:** Fase 1.2-1.4 — tenant-tilstande (suspend/delete-flow), audit på lifecycle-events, eksport pr. tenant.
