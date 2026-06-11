# CRM-X — Sådan får du en ny kunde i gang (komplet begynderguide)

> **Hvem er denne guide til?** Dig som ikke har sat dig ind i hvordan CRM-X virker bag kulisserne. Vi starter helt fra bunden.

---

## Først — hvad ER en "tenant"?

En **tenant** er én kundes private CRM-instans. Forestil dig CRM-X som et hus med mange separate lejligheder. Hver lejlighed har:

- Sit eget subdomain — f.eks. `acme.plesnertech.dk` for kunden Acme A/S
- Sin egen database-isolering — Acme kan aldrig se Bentes data og omvendt
- Sit eget logo, farve, brugere, kunder, projekter, fakturaer
- Sin egen plan (Small/Medium/Large) som styrer hvilke moduler de har adgang til

Når vi i daglig tale siger "kunden Acme bliver oprettet", mener vi **"vi opretter en tenant til Acme i CRM-X-platformen"**.

---

## Roller — hvem er hvem?

Der findes tre typer brugere:

| Rolle | Hvem | Hvad kan de? |
|---|---|---|
| **Super-admin** | Du, Jens — Plesner Tech | Se alle tenants, oprette nye, suspendere, slette. Logger ind via `app.plesnertech.dk/admin` eller `localhost:3000/admin` lokalt. |
| **Tenant-admin** | Kundens egen administrator | Administrerer SIN tenant: opretter brugere, ændrer roller, justerer indstillinger. Logger ind via `kundens-subdomain.plesnertech.dk`. |
| **Tenant-bruger** | Kundens medarbejdere | Bruger CRM'en til daglig: opretter firmaer, tickets, projekter. Har rolle (Admin/Konsulent/Læs) der styrer hvad de kan se. |

---

## Onboarding-flowet — kom i gang i 7 trin

### Trin 1 — Log ind som super-admin

1. Åbn `http://localhost:3000` (eller `app.plesnertech.dk` i produktion)
2. Klik **Log ind**
3. **Workspace-feltet**: LAD DEN VÆRE TOM. Tomt = super-admin login. (Hvis du skriver et subdomain her, prøver systemet at finde dig som tenant-bruger på den tenant.)
4. **Email**: `jens@plesnertech.dk`
5. **Adgangskode**: din super-admin-kode (se `.env.local` for default — skift den ved første login)
6. Klik **Log ind**

Du lander på `/admin` — Admin Portalen.

### Trin 2 — Klik "Nyt CRM site"

Øverst til højre er knappen `+ Nyt CRM site`. Klik den. Du lander på onboarding-wizarden.

### Trin 3 — Udfyld firma-stamdata (wizard-trin 1)

| Felt | Skal udfyldes? | Hvorfor |
|---|---|---|
| **Firmanavn** | ✓ påkrævet | Vises i CRM'ets sidebar, på fakturaer og overalt |
| **Subdomain (slug)** | ✓ påkrævet | Auto-foreslået fra firmanavn. **Kan ikke ændres senere** — vælg klogt! |
| CVR-nummer | Anbefalet | Bruges senere når vi kobler op til CVR-validering |
| Branche | Valgfri | Hjælper med at give bedre default-konfiguration |
| Adresse / Postnr / By | Anbefalet | Bruges på kundens fakturaer (når billing er sat op) |
| Hjemmeside | Valgfri | Vises i tenant-profilen |
| Antal medarbejdere | Valgfri | Pre-sizing-hint så vi kan foreslå rigtig licens-antal |

**Tip:** Slug'en bør være kort og genkendelig. "acme" eller "lars-larsen" frem for "lars-larsen-konsulenthus-aps".

Klik **Næste — admin-kontakt**.

### Trin 4 — Udfyld admin-kontakt (wizard-trin 2)

Dette er **den person der bliver tenant-admin** og modtager velkomstmailen.

| Felt | Skal udfyldes? |
|---|---|
| **Fulde navn** | ✓ |
| **Email** | ✓ — bliver login-emailen |
| Telefon | Valgfri |
| Stilling | Valgfri — bruges i mailens tiltale ("Hej Lars, direktør") |

Klik **Næste — plan**.

### Trin 5 — Vælg plan og licenser (wizard-trin 3)

Du ser tre plan-kort:

- **Small ($10/bruger/md)** — Firmaer, kontakter, aktiviteter, support, tidregistrering
- **Medium ($16/bruger/md)** — Small + marketing + produkter & priser + pipeline
- **Large ($25/bruger/md)** — Alt + projekter + licenser + API (på sigt) + custom branding

Klik på den plan kunden har købt. Moduler-listen opdaterer sig automatisk.

**Antal bruger-licenser**: Sæt det antal kunden har betalt for. Du kan altid opgradere senere.

**Trial-toggle**: Default tændt — 14 dages gratis prøveperiode. Sluk hvis kunden allerede har betalt.

**Avanceret**: Klik for at se modul-toggles hvis du vil afvige fra plan-standarden (sjældent nødvendigt).

Klik **Næste — branding**.

### Trin 6 — Branding (wizard-trin 4) — kan skippes

Helt valgfrit. Du kan klikke **Skip** i højre hjørne eller udfylde:

- **Logo URL** — vil blive vist i kundens sidebar i stedet for "CX". Indtast en URL eller spring over — kunden kan altid uploade senere.
- **Accent-farve** — 6 prædefinerede valg (Nordisk blå er default)
- **Velkomsthilsen** — vises på dashboardet ved første login. Maks 280 tegn. Et personligt touch der gør at kunden føler sig velkommen.

Klik **Næste — bekræft**.

### Trin 7 — Bekræft og opret (wizard-trin 5)

Du ser et resumé af alt det du har udfyldt — firma, admin-kontakt, plan, branding, pris/md.

**Vigtig checkbox nederst: "Send velkomstmail med invite-link nu"**

- **Tændt (default)** — så snart du klikker Opret, sender systemet en venlig velkomstmail til admin-kontakten. De får et link der gælder i 7 dage, og kan sætte deres egen adgangskode.
- **Slukket** — tenanten oprettes men ingen mail sendes. Du skal selv kontakte dem med credentials. Sluk hvis du vil sende invite på et andet tidspunkt.

Tonen på mailen vælges automatisk:
- **Warm** (emoji + hjertelig) for Small og Medium
- **Professional** (rolig + voksen) for Large

Klik **Opret tenant**. Spinner. Du lander på tenant-detalje-siden.

---

## Hvad sker der i kulissen ved klik?

Når du trykker Opret, kører systemet følgende i én database-transaktion:

1. Opretter `Tenant`-record med alle felter
2. Opretter 3 standard-roller (Admin, Konsulent, Læs)
3. Hvis "send invite" var tændt: opretter `UserInvite`-token (32 bytes random, hash'es med SHA-256 før gemt)
4. Hvis Resend API-nøgle er sat: sender velkomstmail
   - Hvis ikke sat: logger mailens indhold til server-terminal (du kan kopiere invite-URL'en derfra)
5. Skriver `tenant_create`-event i audit-log

---

## Hvis du IKKE har sat Resend op endnu

Når du har oprettet tenanten, åbn din terminal hvor `npm run dev` kører. Find linjen der ligner:

```
[invite-mail] RESEND_API_KEY not set — would have sent:
  To: anna@nordicdemo.dk
  Subject: Velkommen til CRM-X, Anna! 🌱
  Invite URL: http://localhost:3000/accept-invite?token=AbCdEfGh123...
```

Kopier invite-URL'en. Send den manuelt til kunden via Slack/mail. Eller åbn den selv i en inkognito-fane for at se hvordan kundens accept-flow ser ud.

---

## Sådan accepterer kunden invitet

1. De klikker linket fra mailen → lander på `/accept-invite?token=...`
2. De ser velkomstsiden med deres firmanavn
3. De udfylder deres fulde navn (pre-udfyldt fra det du indtastede) + ny adgangskode (mindst 12 tegn, 3 af 4 karakterklasser)
4. Live policy-feedback fortæller dem om kodeordet er stærkt nok
5. De klikker **Aktivér min konto og log ind**
6. Systemet opretter `User`-recorden, marker `UserInvite` som accepteret, og logger dem automatisk ind
7. De lander på `/dashboard` i deres egen CRM

**Linket virker i 7 dage.** Hvis det udløber, kan du sende et nyt fra tenant-detalje-siden (kommer i Fase 2 — for nu skal du oprette tenanten igen eller manuelt nulstille token).

---

## Når kunden er logget ind — hvad ser de?

1. **Sidebar** — kun de moduler der er i deres plan vises. Small har færre menupunkter end Large.
2. **Topbar** — søgefelt og notifikationsklokke (begge funktioner under udvikling)
3. **Dashboard** — KPI-kort baseret på deres data (firmaer, tickets, deals, timer)
4. **Velkomsthilsen** — den du skrev i wizard'en vises ved første login

---

## Daglige super-admin-opgaver

| Opgave | Hvor | Hvordan |
|---|---|---|
| Se alle kunder | `/admin` | Liste med navn, subdomain, plan, moduler, antal brugere, status, oprettelses-dato |
| Åbn én kundes detaljer | Klik "Administrer" på linjen | Site-indstillinger, brugere, statistik |
| Tilføj bruger til en kunde | Tenant-detalje → "Opret bruger" form | Sætter password manuelt — invite-flowet er kun ved onboarding lige nu |
| Aktivér/deaktivér bruger | Tenant-detalje → bruger-liste | Toggle |
| Reset password | Tenant-detalje → bruger-linje | Knap |
| Ændre kundens plan/moduler | Tenant-detalje → "Gem ændringer" | **OBS: Plan-dropdown er buggy lige nu — bruger gammelt enum (Starter/Pro/Enterprise). Brug listen i stedet for redigering. Bug rettes næste runde.** |

---

## Ting der IKKE virker endnu (men du har set):

- **Logud-knap** i sidebar virker ikke korrekt — du skal lukke browser eller bruge inkognito for at skifte konto (bug i sign-out flow, fix kommer)
- **Tenant-status viser "Aktiv" selv om trial er valgt** — alle nye trial-kunder ligner aktive. Vi får trial-badges i næste runde.
- **Email-afsendelse** kræver `RESEND_API_KEY` — uden den logges mailen kun til terminal
- **Billing** — der er ikke nogen automatisk fakturering eller Stripe-integration endnu. Du sender selv fakturaer udenom (Economic/Dinero) og markerer tenanten som betalt i admin (i fremtidige Fase 3).

---

## Almindelige fejl

**"Subdomain er allerede taget"**
→ Vælg et andet slug. Det skal være unikt på tværs af alle kunder.

**"Slug skal være 2-42 tegn, kun a-z, 0-9, bindestreg"**
→ Slug må kun indeholde små bogstaver, tal og bindestreger. Æ/Ø/Å bliver til a/o/a automatisk.

**Mailen ankommer ikke til kunden**
→ Tjek 1) at `RESEND_API_KEY` er sat i `.env.local` 2) at afsender-emailen er verificeret hos Resend 3) at modtagerens spam-filter ikke har fanget den

**Kunden får "Linket virker ikke"**
→ Invite udløber efter 7 dage. Opret tenanten igen (slet den gamle først via DB indtil delete-flow er klar) eller bed kunden manuelt få oprettet adgang.

---

## Næste skridt for dig som ny

1. Prøv at oprette en testtenant — kald den "test" og brug din egen email som admin. Gennemfør hele flowet inkl. accept-invite. Det er den hurtigste måde at forstå systemet.
2. Slet test-tenanten manuelt via Prisma Studio (`npx prisma studio` → tab `tenants` → slet rækken) når du er færdig — der er ikke et slet-flow i UI endnu.
3. Når du har sat Resend op, lav samme test og bekræft at mailen ankommer i din indbakke med korrekt branding.
4. Skriv en lille intern checkliste for dig selv: hvad spørger du kunden om før du sætter dem op? (firmanavn, CVR, hvilken plan, hvor mange brugere, admin-kontakt-info).

---

## Hvor henvender man sig?

- **Tekniske spørgsmål om CRM-X**: Direkte til Jens Plesner — det er din platform
- **Spørgsmål fra dine kunder**: De bør gå via en support-kanal du opretter (kunne være CRM-X's egen support-modul ironisk nok)
- **Compliance/GDPR-spørgsmål**: Se `compliance/policies/` og `COMPLIANCE_ROADMAP.md` i repo'et

---

*Guide skrevet 2026-06-08. Når Fase 2-7 af tenant-administration er bygget, opdateres denne.*
