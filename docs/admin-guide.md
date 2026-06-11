# Admin-guide: Onboard et nyt kunde-site

> For Plesner Techs super-admins. Beskriver hvordan du opretter et nyt
> CRM-X site for en kunde, fra første kontakt til kunden er logget ind.

## 0. Før du starter

Du skal have:

- Adgang til `https://crmadmin.plesnertech.dk` (eller `http://localhost:3000/admin` lokalt)
- Super-admin login
- Kundens stamdata:
  - Firmanavn
  - CVR (hvis B2B-fakturering)
  - Branche
  - Antal medarbejdere
  - Adresse + telefon + hjemmeside
  - Admin-kontakt: navn, email, telefon, stilling
- Beslutning om:
  - Hvilken plan (Small / Medium / Large)
  - Hvilke moduler (default følger planen, kan tilpasses)
  - Antal bruger-licenser
  - Skal trial-perioden bruges (14 dage gratis)?
  - Skal vi sende invite-mail med det samme?

## 1. Start onboarding-wizardens 5 trin

Log ind på admin-portalen → klik **"Onboard ny kunde"** (øverst til højre på dashboard eller i sidebar under "Tenants").

```
https://crmadmin.plesnertech.dk/admin/tenants/new
```

### Trin 1 — Firma-stamdata

| Felt | Beskrivelse |
|---|---|
| Firmanavn | Vises overalt i kundens CRM. Eks: "Acme Consulting A/S" |
| Subdomain (slug) | Auto-foreslås fra firmanavn. **Kan ikke ændres senere.** Bliver `acme.plesnertech.dk` |
| CVR-nummer | 8 cifre. Kræves hvis B2B-fakturering. |
| Branche | Vælges fra dropdown |
| Adresse / postnr. / by | Bruges på fakturaer |
| Hjemmeside | Valgfrit |
| Antal medarbejdere | Bruges til prisstrategi |

**Tip:** Subdomain skal være kort, mindeværdigt og kun små bogstaver+bindestreg. Eks: `acme` bedre end `acme-consulting-as`.

→ Klik **"Næste — admin-kontakt"**

### Trin 2 — Admin-kontakt

Den person der bliver første bruger og admin på siden.

| Felt | Beskrivelse |
|---|---|
| Navn | Fuldt navn |
| Email | Modtager invite-mailen og er deres login |
| Telefon | Vises i deres profil |
| Stilling | "IT-chef", "CTO", "Adm. direktør"... |

→ Klik **"Næste — plan"**

### Trin 3 — Plan & moduler

**Vælg plan-kort:**

- **Small** ($10/seat) — basis kunde-administration
- **Medium** ($16/seat) — + marketing & produkter
- **Large** ($25/seat) — alt + projekter & licenser + API-adgang

**Antal bruger-licenser:** Standard er 5/10/25 for Small/Medium/Large. Kan overstyres.

**Modul-vælger:** Som standard valgt fra plan-bundle. Du kan tilføje ekstra moduler:

- Tilføjede ekstra-moduler får **orange tag** med +$4/seat indikator
- Hvis du krydser så mange moduler af at det dækker en højere plan, sker **auto-promote**: blå banner "Auto-opgraderet til Medium/Large" og prisen falder

**Trial-toggle:** Default ON — 14 dages gratis prøveperiode. Tenanten suspenderes automatisk ved trial-udløb hvis ikke betalt.

→ Klik **"Næste — branding"**

### Trin 4 — Branding

| Felt | Beskrivelse |
|---|---|
| Logo URL | Valgfri. Vises i sidebar og på fakturaer |
| Accent-farve | Hex-kode, fx `#2563EB`. Bruges som primær brand-farve |
| Velkomstbesked | Op til 280 tegn. Vises på første login |

Branding kan altid ændres senere af tenanten selv i deres indstillinger.

→ Klik **"Næste — bekræft"**

### Trin 5 — Bekræft & send invite

Sidste skridt viser et oversigtskort. Tjek:

- ✅ Firmanavn og slug korrekt
- ✅ Admin-email rigtig (de modtager mailen!)
- ✅ Plan og pris
- ✅ Moduler

**Send invite nu?** ON som standard. Hvis OFF kan du sende manuelt senere fra tenant-detaljen.

→ Klik **"Opret CRM-site"**

## 2. Hvad sker der bag kulisserne

Når du klikker "Opret":

1. **Atomic transaktion** opretter `Tenant` + 3 system-roller (Admin, Konsulent, Læs)
2. Hvis invite-toggle: et engangs-token genereres (SHA-256 hashes i DB)
3. Status sættes til `trial` eller `active` afhængigt af trial-valget
4. Audit-log skriver `tenant_create`-event
5. Invite-mail sendes via Resend med et magic-link til `/accept-invite?token=...`
6. Du bliver redirected til tenant-detaljen

**OBS:** Klartekst-token findes kun i mailen. Hvis kunden mister mailen, må du tilbagekalde og oprette nyt invite.

## 3. Kunden's første login (deres flow)

Kunden modtager en mail med:
- Velkomst-besked tilpasset planen (warm for Small/Medium, professional for Large)
- Magic-link der udløber efter 7 dage
- Forventede priser og næste skridt

Når de klikker linket:

1. **Accept-invite-siden** lader dem sætte password
2. Konto oprettes som tenant-admin med rolle "Admin"
3. De redirectes til `acme.plesnertech.dk/dashboard`
4. Klippekort-pristabel ligger tom (de opretter selv senere under indstillinger)

## 4. Efter onboarding — hvad skal du gøre

På tenant-detalje-siden (`/admin/tenants/<id>`) kan du:

- **Justere site-indstillinger** — firmanavn, plan, moduler, maxUsers
- **Oprette flere brugere** direkte fra admin (de får default-password `CrmX2024!`)
- **Skifte status** via Status & livscyklus-panelet (Aktivér / Suspender / Planlæg sletning / Eksportér)
- **Eksportere data** — GDPR Art. 20 JSON-dump af alle kundens data
- **Logge ind som tenant-admin** (impersonation, 60 min, audit-logget — se næste sektion)

## 5. Impersonation — fejlsøg som kunden

På tenant-detaljen klik **"Log ind som tenant-admin"** (gul knap øverst til højre).

- En signed HTTP-only cookie sættes (60 min levetid)
- Du redirectes til kundens `/dashboard`
- **Gult banner i toppen** viser at du impersonerer + tæller minutter ned
- Klik **"Afslut session"** i banneret for at vende tilbage

**Hver impersonation logges** i audit-log med `impersonate_start` og `impersonate_stop`. Inkluderer tenant-ID, super-admin-email og varighed.

**Brug ikke impersonation til at lave ændringer på kundens vegne uden samtykke.**

## 6. Trial-håndtering

Kunder på trial får automatisk en advarsel ved:

- 7 dage tilbage
- 3 dage tilbage
- 1 dag tilbage

Ved udløb skifter status til `suspended` (manuel job i `lib/tenant-status.ts` LIFECYCLE_TIMING).

**For at konvertere:** På tenant-detaljen → Status & livscyklus → "Aktivér (betalt)" knap → angiv begrundelse → status skifter til `active`.

## 7. Suspendering & sletning

**Suspender** = midlertidig pause:
- Login blokeres
- Eksport stadig muligt
- Kan reaktiveres uden cooldown

**Planlæg sletning** = 60 dages cooldown:
- Kunden får advarsel
- Data er stadig intakt
- "Fortryd"-knap fungerer i hele perioden

**Hard-purge** (kun fra `scheduled_deletion`):
- Kræver bekræftelsesfrase "SLET <slug>" indtastet
- Cascade-sletter alt tenant-data
- Kan ikke fortrydes

## 8. Almindelige fejl

| Fejl | Hvad gør du |
|---|---|
| "Subdomain er allerede taget" | Vælg et andet slug; brug fx `acme-as` eller `acme2` |
| "B2B-faktura kræver kundens CVR" | Tilføj CVR på firmaet eller skift faktura til B2C |
| "Tenant har ingen aktive brugere" (impersonation) | Opret en bruger på tenant-detaljen først |
| Invite-mail kommer ikke frem | Tjek Resend logs; tilbagekald og send nyt invite |

## 9. Checkliste — nyt tenant-site på 5 minutter

- [ ] Indhent stamdata fra kunden
- [ ] Bekræft slug-valg med kunden
- [ ] Trin 1 i wizard: stamdata
- [ ] Trin 2: admin-kontakt
- [ ] Trin 3: plan + moduler + seats
- [ ] Trin 4: branding (kan udelades — kunden gør selv)
- [ ] Trin 5: bekræft + send invite
- [ ] Verificér i `/admin/tenants` at tenant er listet
- [ ] Spørg kunden om de har modtaget invite-mailen
- [ ] Klar — kunden er live

## 10. Plan-ændringer og billing-status

Plan kan ændres når som helst fra tenant-detaljen. Bemærk:

- **Down-grade** (Large → Medium) — fjerner moduler der ikke er i den nye plans bundle
- **Up-grade** — tilføjer moduler automatisk
- Billing-status (`billingStatus`) styres separat og kan være `paid`, `overdue`, `trial`, `cancelled`, `manual`

For nu opdateres billing manuelt. Stripe-integration kommer i Fase 3.
