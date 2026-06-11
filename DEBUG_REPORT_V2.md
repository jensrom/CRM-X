# CRM-X — Debug-rapport v2 (browser-verificeret)

**Dato:** 2026-06-08
**Metode:** Manuel click-through af alle moduler + onboarding-wizard ende-til-ende
**Tenant testet:** Demo Firma A/S (eksisterende) + Nordic Demo A/S (oprettet under test)

---

## Headline

**Onboarding-wizard'en fungerer ende-til-ende — vi har nu en kunde mere i systemet.** Nordic Demo A/S blev oprettet med Medium-plan, 10 licenser, 14d trial, grøn accent-farve, velkomsthilsen — alt landede korrekt i admin-portalen.

Imidlertid er der **fem konkrete fund** der bør prioriteres. Tre er bugs, to er UX-mangler.

---

## Interessante fund

### 1. 🐞 Tenant-detalje-siden bruger gammelt plan-enum

**Hvor:** `/admin/tenants/[id]` — Plan-dropdown viser "Starter / Professional / Enterprise"

**Hvad jeg så:** Da jeg oprettede Nordic Demo A/S med Medium-plan og åbnede detalje-siden, viste Plan-dropdown'en "Starter" som default — ikke "Medium". Den faktiske plan i DB er korrekt (admin-listen viser Medium), men UI'en på detalje-siden er ikke opdateret til de nye plan-slugs.

**Konsekvens:** Hvis super-admin trykker "Gem ændringer", overskrives plan med "starter". Datatab-risiko ved hver tenant-redigering.

**Fix:** Opdater `app/(admin)/admin/tenants/[id]/page.tsx` til at bruge `PLAN_LIST` fra `lib/plans.ts`.

---

### 2. 🐞 Sign-out-flow virker ikke fra UI

**Hvor:** Klik på logud-ikonet nederst i sidebar OG `/api/auth/signout` GET-rutens "Sign out"-knap.

**Hvad jeg så:** Efter klik på "Sign out" forbliver session-cookien — `/api/auth/session` returnerer stadig samme bruger. Først da jeg manuelt POSTede til signout-callback med CSRF-token forsvandt sessionen.

**Konsekvens:** Brugere kan ikke logge ud. Sikkerhedshul på delte computere.

**Fix:** Brug `signOut({ callbackUrl: "/login" })` fra `next-auth/react` i `AppSidebar.tsx` (det er allerede koden — men noget i flow'et fungerer ikke korrekt). Skal undersøges nærmere — mistanke om at JWT-strategy + nyt cookie-navn ikke matcher.

---

### 3. 🐞 Tenant-status viser "Aktiv" selvom trial er valgt

**Hvor:** `/admin` listen og tenant-detalje

**Hvad jeg så:** Nordic Demo A/S blev oprettet med "Start med 14 dages trial" — i DB er `status = "trial"` og `trialEndsAt` sat. Men UI viser kun "● Aktiv".

**Konsekvens:** Plesner Tech kan ikke se hvilke tenants er på trial og dermed risikerer at glemme follow-up før udløb.

**Fix:** Erstat `isActive` boolean-rendering med `status`-enum-rendering. Tilføj `<TenantStatusBadge>` der viser:
- 🟢 Aktiv (status=active)
- 🟡 Trial — udløber om X dage (status=trial)
- 🟠 Suspenderet (status=suspended)
- 🔴 Til sletning (status=scheduled_deletion)

---

### 4. 🧹 Slugify giver klodset resultat for "A/S"-firmaer

**Hvor:** Onboarding-wizard trin 1

**Hvad jeg så:** "Nordic Demo A/S" → `nordic-demo-a-s`. Det er teknisk korrekt, men "a-s" suffix er ikke pænt at have i URLer der vises offentligt.

**Fix:** Smartere slugify der kender til "A/S", "ApS", "I/S", "K/S", "P/S" og stripper dem. Slug bliver så `nordic-demo`.

---

### 5. 🧹 Notifikations-klokke responderer ikke synligt

**Hvor:** Topbar højre side

**Hvad jeg så:** Klik på klokke-ikonet ser ikke ud til at åbne en dropdown. Det kan være at den åbner men er usynlig pga. z-index / animation, eller at den kun aktiveres når der er notifikationer.

**Fix:** Verificer at `NotificationBell` har korrekt dropdown-state og at den åbner selv med 0 ulæste.

---

## Hvad der overraskede positivt

Statisk debug-audit fra sidste runde overdrev manglerne. Følgende moduler er **fuldt funktionelle** modsat hvad rapporten påstod:

| Modul | Status faktisk |
|---|---|
| Tidregistrering (`/time`) | Komplet dashboard med I dag/Uge/Måned-filter, KPI'er, tabel — IKKE stub |
| Rapporter (`/reports`) | Komplet KPI-dashboard med 4 KPI-kort, 12-måneders salgs-graf, projekt-status, klippekort-aktive, support-stats — IKKE stub |
| Tilbud (`/quotes`) | KPI-strimmel + empty-state med "Gå til pipeline" CTA. Virker som intended — det er en "view af deals i tilbuds-stadie", ikke et separat modul. |
| MFA-setup (`/settings/mfa`) | QR-kode, manuel kode, konto-label, bekræft-felt — komplet end-to-end |
| Onboarding-wizard | 5-trin, klikbar progress, live pris-beregning, slug-validering, branding — **alt virker** |

---

## Ende-til-ende-test: Nordic Demo A/S onboarding

Resultat: ✅ Tenant blev oprettet, alle felter landede i DB, admin-portal viser den korrekt i listen. Audit-event for `tenant_create` blev logget.

Med `RESEND_API_KEY` ikke sat, blev invite-mailen logget til terminalen i stedet for sendt. Invite-token er stadig oprettet i DB — den kan kopieres fra terminal-output og bruges på `/accept-invite?token=...`.

---

## Prioriteret anbefaling

| Prioritet | Fix | Effort |
|---|---|---|
| Højest | #2 Sign-out — sikkerhedsproblem | 30 min |
| Høj | #1 Plan-dropdown — datatab-risiko | 15 min |
| Medium | #3 Status-badge til trial-tilstande | 1 time |
| Lav | #4 Slug "a-s"-suffix | 10 min |
| Lav | #5 Notifikations-klokke debug | 30 min |

Samlet: ~2,5 timer for at lukke alle fem fund.
