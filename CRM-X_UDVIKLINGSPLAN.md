# CRM-X — Komplet Udviklingsplan
**Projekt:** CRM-X | Konsulenthus Platform  
**Ejer:** Jens Plesner / plesnertech.dk  
**Version:** 1.1 | Oprettet: 2026-05-27 | Opdateret: 2026-05-27  
**Status:** Fase 1 — I gang

---

> **Sessionskontinuitet:** Dette dokument er kilden til sandhed for hele projektet.  
> Genoptag altid her. Hver sektion har en statuskode: `[ ]` Ikke startet · `[~]` I gang · `[x]` Færdig.

---

## INDHOLDSFORTEGNELSE

1. [Projektoverblik](#1-projektoverblik)
2. [Tech Stack & Arkitektur](#2-tech-stack--arkitektur)
3. [Multi-tenant Arkitektur](#3-multi-tenant-arkitektur)
4. [Database Design](#4-database-design)
5. [Moduloversigt](#5-moduloversigt)
6. [Fase 1 — Fundament & Infrastruktur](#fase-1--fundament--infrastruktur)
7. [Fase 2 — Core CRM](#fase-2--core-crm)
8. [Fase 3 — Salgsmodul](#fase-3--salgsmodul)
9. [Fase 4 — Marketingmodul](#fase-4--marketingmodul)
10. [Fase 5 — Support Portal](#fase-5--support-portal)
11. [Fase 6 — Projekter & Klippekort](#fase-6--projekter--klippekort)
12. [Fase 7 — Produktstyring](#fase-7--produktstyring)
13. [Fase 8 — Licenshåndtering](#fase-8--licenshåndtering)
14. [Fase 9 — Administrator Portal](#fase-9--administrator-portal)
15. [Fase 10 — Rettigheder & Roller](#fase-10--rettigheder--roller)
16. [Fase 11 — KPI & Dashboards](#fase-11--kpi--dashboards)
17. [Fase 12 — Notifikationer](#fase-12--notifikationer)
18. [Fase 13 — Deploy & DNS](#fase-13--deploy--dns)
19. [Fase 14 — plesnertech.dk Karriereprofil](#fase-14--plesnertedk-karriereprofil)
20. [Adgangskrav](#adgangskrav)
21. [Tidshorisont](#tidshorisont)
22. [Åbne beslutninger](#åbne-beslutninger)

---

## 1. PROJEKTOVERBLIK

CRM-X er en cloud-baseret, multi-tenant CRM-platform bygget specifikt til konsulenthuse.

**Inspirationskilde:** SuperOffice — let, nordisk, overskueligt layout.

### Kerneprincipper
- **Multi-tenant SaaS:** Hver kundeoprettet af admin får sit eget subdomain (`kunde.plesnertech.dk`)
- **Modulært:** Salg, Teknik (Support/Projekter), Marketing kan købes/aktiveres separat
- **Rettighedsstyret:** Venstre menu og funktioner vises udelukkende baseret på brugerrettigheder
- **Nordisk design:** Hvide/grå/blå-grå toner, rolige farver, luftigt layout, ingen støj

### Platformens URL-struktur
| URL | Formål |
|---|---|
| `www.plesnertech.dk` | Landing page / marketing for CRM-X |
| `www.plesnertech.dk/jens-karriereprofil` | Jens' nuværende karriereprofil (flyttes hertil) |
| `app.plesnertech.dk/admin` | Super-admin portal (opret/administrer tenants) |
| `[kundenavn].plesnertech.dk` | Kundens eget CRM-instance |

> **Note:** `www.plesnertech.dk` bruges til landing page for CRM-X produktet. Jens' nuværende karriereprofil flyttes til `/jens-karriereprofil`.

---

## 2. TECH STACK & ARKITEKTUR

### Frontend
- **Framework:** Next.js 14+ (App Router)
- **Sprog:** TypeScript
- **Styling:** Tailwind CSS + shadcn/ui komponentbibliotek
- **State management:** Zustand (global) + React Query (server state)
- **Ikoner:** Lucide React

### Backend
- **API:** Next.js API Routes + tRPC (type-safe end-to-end)
- **Auth:** NextAuth.js v5 (email/password + evt. SSO)
- **Filer/uploads:** Vercel Blob Storage
- **Email:** Resend (notifikationer, invitations)

### Database
- **Primær DB:** PostgreSQL via **Neon** (serverless, gratis tier tilgængeligt)
- **ORM:** Prisma
- **Multi-tenancy:** `tenant_id` på alle tabeller (row-level isolation)

### Hosting & Infrastructure
- **Hosting:** Vercel (Next.js native, wildcard subdomains)
- **Wildcard domain:** `*.plesnertech.dk` → Vercel deployment
- **CI/CD:** GitHub → Vercel auto-deploy on push to `main`
- **Secrets:** Vercel Environment Variables

### Fil-lagring
- Vercel Blob (licenser, vedhæftninger på tickets)

---

## 3. MULTI-TENANT ARKITEKTUR

### Koncept
Én enkelt Next.js applikation håndterer ALLE kunders CRM-instances.

```
Request: lars-larsen.plesnertech.dk
  → Vercel wildcard routing
  → Next.js middleware: læser subdomain → finder tenant "lars-larsen" i DB
  → Loader tenant-specifikke data
  → Renderer CRM for den tenant
```

### Middleware (next.js middleware.ts)
```
*.plesnertech.dk → extract subdomain → inject tenantId i request headers
admin.plesnertech.dk → admin portal (særskilt layout og rettigheder)
www.plesnertech.dk → marketing landing page
```

### Database isolation
- Alle tabeller har `tenant_id UUID NOT NULL`
- Alle queries filtrerer automatisk på `tenant_id` via Prisma middleware
- Ingen tenant kan tilgå en anden tenants data

### Tenant oprettelse (fra admin portal)
1. Admin udfylder kundedata i admin portal
2. System opretter `Tenant` record i DB med unikt `slug` (= subdomain)
3. Vercel wildcard routing håndterer automatisk det nye subdomain
4. Ingen manuel DNS-konfiguration pr. kunde

---

## 4. DATABASE DESIGN

### Kerne-tabeller (forenklet oversigt)

```
Tenants              → Alle CRM-instances (én pr. kunde)
Users                → Brugere (tilknyttet tenant)
Roles                → Admin, Manager, Sales, Tech, Marketing
RolePermissions      → Hvilke moduler/features en rolle har adgang til

Companies            → Firmaer/kunder i CRM
Contacts             → Kontaktpersoner (tilknyttet Company)
Departments          → Afdelinger under Company (evt. med egen afdelingsleder)

Products             → Produktkatalog (pr. tenant)
ProductPricing       → Priser pr. interval (månedlig, kvartalsvis, halvårlig, årlig)
CustomerProducts     → Hvilke produkter et firma har købt (m. afdelingsleder)

Tickets              → Support tickets
TicketTimeLog        → Tidregistrering på tickets

Projects             → Klippekort-projekter
ProjectBacklog       → Backlog items på projekt
ProjectTimeLog       → Check-ind/ud registrering (person, dato, tid, produkt)
HourBundles          → Salg af klippekort (antal timer, forbrug, saldo)

Licenses             → Licenser pr. kunde pr. produkt
LicenseFiles         → Filer tilknyttet licens

Campaigns            → Marketing kampagner
Leads                → Leads i pipeline

Activities           → Opfølgninger, møder, opkald (fælles)
Notes                → Noter på Company/Contact/Ticket/Project
```

---

## 5. MODULOVERSIGT

### Modulpakker

| Pakke | Indhold | Målgruppe |
|---|---|---|
| **Core** | Firmaer, kontakter, aktiviteter, noter | Alle |
| **Salg** | Pipeline, tilbud, deals, KPI | Sælgere |
| **Marketing** | Kampagner, leads, nyhedsbreve | Marketing-team |
| **Teknik** | Support tickets, projekter, klippekort, tidregistrering | Konsulenter/teknikere |
| **Produkter** | Produktkatalog, priser, kundeprodukter | Alle (konfigurerbar) |
| **Licenser** | Licenshåndtering, filer, udløbsnotifikationer | Admin/teknik |
| **Admin** | Brugeradmin, roller, systemindstillinger | Tenant-admin |

### Venstre menu — struktur
```
🏠 Dashboard
━━━━━━━━━━━━━━━━━ SALG (hvis rettighed)
📊 Pipeline
🤝 Deals
📋 Tilbud
━━━━━━━━━━━━━━━━━ MARKETING (hvis rettighed)
📢 Kampagner
🎯 Leads
━━━━━━━━━━━━━━━━━ TEKNIK (hvis rettighed)
🎫 Support Tickets
⏱️  Projekter & Klippekort
━━━━━━━━━━━━━━━━━ KUNDER
🏢 Firmaer
👤 Kontakter
━━━━━━━━━━━━━━━━━ PRODUKTER (hvis rettighed)
📦 Produkter
💰 Priser
━━━━━━━━━━━━━━━━━ LICENSER (hvis rettighed)
🔑 Licenser
━━━━━━━━━━━━━━━━━
⚙️  Indstillinger
```

---

## FASE 1 — FUNDAMENT & INFRASTRUKTUR
**Status:** `[ ]` | **Estimat:** 5–7 dage

### Opgaver
- [ ] 1.1 Opret GitHub repository (`crm-x`)
- [ ] 1.2 Initialisér Next.js 14 projekt med TypeScript
- [ ] 1.3 Konfigurér Tailwind CSS + shadcn/ui
- [ ] 1.4 Opsæt Prisma + Neon PostgreSQL
- [ ] 1.5 Opsæt NextAuth.js (email/password)
- [ ] 1.6 Multi-tenant middleware (subdomain detection)
- [ ] 1.7 Grundlæggende layout: sidebar, topbar, main area
- [ ] 1.8 Design tokens: farvepalette, typografi (nordisk stil)
- [ ] 1.9 Deploy til Vercel (initial)
- [ ] 1.10 Konfigurér wildcard DNS på plesnertech.dk

### Design tokens (nordisk stil)
```
Primær:     #2563EB (rolig blå)
Accent:     #0EA5E9 (lysere blå)
Baggrund:   #F8FAFC (næsten hvid)
Surface:    #FFFFFF
Border:     #E2E8F0
Text:       #1E293B (næsten sort)
Text-muted: #64748B
Success:    #10B981
Warning:    #F59E0B
Error:      #EF4444
```

---

## FASE 2 — CORE CRM
**Status:** `[ ]` | **Estimat:** 7–10 dage

### Firmaer (Companies)
- [ ] 2.1 Firmaoversigt (liste + søgning + filtrering)
- [ ] 2.2 Firma-detaljeside: stamdata, kontakter, aktiviteter, noter, produkter
- [ ] 2.3 Afdelinger under firma med afdelingsleder-relation
- [ ] 2.4 Opret/rediger/arkiver firma

### Kontakter (Contacts)
- [ ] 2.5 Kontaktoversigt (tilknyttet firma eller standalone)
- [ ] 2.6 Kontakt-detaljeside: stamdata, tilknyttet firma, afdeling, rolle
- [ ] 2.7 Opret/rediger/slet kontakt

### Aktiviteter (Activities)
- [ ] 2.8 Aktivitetsoversigt og kalendervisning
- [ ] 2.9 Typer: møde, opkald, e-mail, opgave, opfølgning
- [ ] 2.10 Tilknytning til firma, kontakt, ticket eller projekt

### Eksempel: Lars Larsen scenariet
```
Firma: Lars Larsen A/S
  ├── Afdeling: Produktion (Afdelingsleder: Lars Jr.)
  │     └── Produkt: Hugos SuperSoftware
  └── Afdeling: Facility (Afdelingsleder: Karen)
        └── Produkt: Bentes CMMS Løsning
```

---

## FASE 3 — SALGSMODUL
**Status:** `[ ]` | **Estimat:** 5–7 dage

- [ ] 3.1 Pipeline Kanban-board (stages: Ny, Kvalificeret, Tilbud sendt, Vundet, Tabt)
- [ ] 3.2 Deal-kort med firma, kontakt, beløb, sandsynlighed, deadline
- [ ] 3.3 Tilbudsmodul (opret tilbud → tilknyt produkter → send)
- [ ] 3.4 Salgs-KPI dashboard: total pipeline, win rate, gns. deal-størrelse
- [ ] 3.5 Aktivitets-feed pr. deal

---

## FASE 4 — MARKETINGMODUL
**Status:** `[ ]` | **Estimat:** 4–5 dage

- [ ] 4.1 Lead-register med status (Ny, Kontaktet, Kvalificeret, Konverteret)
- [ ] 4.2 Kampagneoversigt (navn, type, dato, status, tilknyttede leads)
- [ ] 4.3 Konvertering: Lead → Kontakt/Firma
- [ ] 4.4 Marketing KPI: leads pr. kilde, konverteringsrate

---

## FASE 5 — SUPPORT PORTAL
**Status:** `[ ]` | **Estimat:** 7–9 dage

### Ticket system
- [ ] 5.1 Ticketoversigt med filtrering (status, prioritet, produkt, kunde)
- [ ] 5.2 Opret ticket: titel, beskrivelse, produkt, prioritet, kontakt, afdeling
- [ ] 5.3 Ticket-detaljeside:
  - Tråd-kommunikation (intern + ekstern)
  - Statusflow: Ny → Under behandling → Afventer svar → Løst → Lukket
  - Prioritet: Lav / Normal / Høj / Kritisk
  - Tilknyttet produkt
  - Tilknyttet kunde/afdeling/kontakt
  - Assigned to (konsulent)
- [ ] 5.4 Tidregistrering på ticket (person, dato, varighed, beskrivelse, fakturerbar ja/nej)
- [ ] 5.5 Ticket-KPI: gns. løsningstid, åbne tickets pr. konsulent, tickets pr. produkt

---

## FASE 6 — PROJEKTER & KLIPPEKORT
**Status:** `[ ]` | **Estimat:** 9–12 dage

### Klippekort-salg
- [ ] 6.1 HourBundle: opret salg af timepakke (antal timer, pris, dato, tilknyttet firma)
- [ ] 6.2 Saldo-visning pr. firma: Købt / Forbrugt / Resterende

### Projekter
- [ ] 6.3 Projektoversigt (liste + kanban)
- [ ] 6.4 Projekt-detaljeside:
  - Kundetilknytning
  - Valg af 1+ produkter (KPI-formål)
  - Tilknyttet HourBundle (klippekort)
  - Beskrivelse, start/slutdato, status
- [ ] 6.5 Backlog (backlog items med prioritet, estimat, status)
- [ ] 6.6 Check-ind/ud system:
  - Bruger klikker "Start tid" → vælger projekt + evt. backlog item
  - Aktivt check-in vises i topbar
  - "Stop tid" → logger tid (person, dato, start, slut, varighed, produkt, backlog item)
- [ ] 6.7 Tidlinje-visning: hvem har logget hvad hvornår
- [ ] 6.8 Projekt-KPI: timer brugt pr. produkt, pr. person, vs. klippekort-saldo

---

## FASE 7 — PRODUKTSTYRING
**Status:** `[ ]` | **Estimat:** 4–5 dage

- [ ] 7.1 Produktkatalog: navn, beskrivelse, kategori, SKU, aktiv/inaktiv
- [ ] 7.2 Prisoversigt pr. produkt:
  - Månedlig pris
  - Kvartalspris
  - Halvårspris
  - Årspris
  - Engangsbeløb
- [ ] 7.3 Tilknyt produkt til firma + afdeling + afdelingsleder (kontakt)
- [ ] 7.4 Produkt-dashboard: antal kunder pr. produkt, ARR-estimat

---

## FASE 8 — LICENSHÅNDTERING
**Status:** `[ ]` | **Estimat:** 4–6 dage

- [ ] 8.1 Licensoversigt pr. firma
- [ ] 8.2 Opret licens:
  - Tilknyttet produkt
  - Licensnøgle (tekst-felt, krypteret lagring)
  - Beskrivelse / noter
  - Udløbsdato (valgfri)
  - Status: Aktiv / Udløbet / Afventer fornyelse
- [ ] 8.3 Fil-upload på licens (PDF, .lic-filer, certifikater etc.)
- [ ] 8.4 Notifikation ved udløb (X dage før udløb — konfigurerbart)
- [ ] 8.5 Licens-log: hvem oprettede/redigerede hvornår

---

## FASE 9 — ADMINISTRATOR PORTAL
**Status:** `[ ]` | **Estimat:** 6–8 dage

**URL:** `app.plesnertech.dk/admin`  
**Adgang:** Kun super-admin (Jens + evt. andre)

- [ ] 9.1 Login til admin portal (separat auth fra tenant-login)
- [ ] 9.2 Tenant-oversigt: alle CRM-instances, status, oprettelsesdato
- [ ] 9.3 Opret ny tenant:
  - Firmanavn
  - Slug (= subdomain, valideres for unikhed)
  - Kontaktperson + email
  - Valg af aktive moduler/pakker
  - Antal bruger-licenser
  - Auto-generér: subdomain, admin-bruger, velkomst-email
- [ ] 9.4 Rediger tenant: aktiver/deaktiver moduler, skift licens-antal
- [ ] 9.5 Slet/suspender tenant (beholder data i X dage)
- [ ] 9.6 Global brugeroversigt (alle brugere på tværs af tenants)
- [ ] 9.7 System-log / audit trail

---

## FASE 10 — RETTIGHEDER & ROLLER
**Status:** `[ ]` | **Estimat:** 4–5 dage

### Roller (pr. tenant, konfigurerbare)
| Rolle | Standard adgang |
|---|---|
| Tenant Admin | Alt |
| Sales Manager | Salg + Core |
| Sælger | Salg + Core (begrænset) |
| Konsulent | Teknik + Core |
| Marketing | Marketing + Core |
| Read-Only | Kun se, ikke redigere |

- [ ] 10.1 Rolleoprettelse og -redigering pr. tenant
- [ ] 10.2 Modul-permissions: Vis/Skjul pr. modul i venstre menu
- [ ] 10.3 Feature-permissions: Opret, Rediger, Slet, Eksporter
- [ ] 10.4 Brugeroprettelse: email, navn, rolle, aktiv/inaktiv
- [ ] 10.5 Licenstæller: maks. aktive brugere = købt licens-antal

---

## FASE 11 — KPI & DASHBOARDS
**Status:** `[ ]` | **Estimat:** 5–6 dage

- [ ] 11.1 Personligt dashboard (ved login): mine opgaver, mine tickets, mine projekter
- [ ] 11.2 Salgs-dashboard: pipeline, win/loss, deals denne måned
- [ ] 11.3 Teknik-dashboard: åbne tickets, projektstatus, klippekort-saldi
- [ ] 11.4 Marketing-dashboard: leads, kampagner, konverteringer
- [ ] 11.5 Produkt-dashboard: forbrug pr. produkt, tidregistrering pr. produkt
- [ ] 11.6 Eksport til CSV/Excel

---

## FASE 12 — NOTIFIKATIONER
**Status:** `[ ]` | **Estimat:** 3–4 dage

- [ ] 12.1 In-app notifikationer (klokke-ikon i topbar)
- [ ] 12.2 Email notifikationer (Resend):
  - Ny ticket oprettet
  - Ticket assignet til dig
  - Licens udløber om X dage
  - Klippekort under Y timer tilbage
  - Ny bruger inviteret
- [ ] 12.3 Notifikationsindstillinger pr. bruger (hvad vil jeg have besked om?)

---

## FASE 13 — DEPLOY & DNS
**Status:** `[ ]` | **Estimat:** 2–3 dage

- [ ] 13.1 DNS: Tilføj wildcard CNAME `*.plesnertech.dk → cname.vercel-dns.com`
- [ ] 13.2 Vercel: Tilføj `*.plesnertech.dk` som custom domain
- [ ] 13.3 SSL: Automatisk via Vercel (wildcard certifikat)
- [ ] 13.4 Environment variables konfigureret i Vercel
- [ ] 13.5 Production deploy pipeline testet
- [ ] 13.6 Staging environment opsat (`staging.plesnertech.dk`)

---

## FASE 14 — PLESNERTECH.DK KARRIEREPROFIL
**Status:** `[ ]` | **Estimat:** 1–2 dage

- [ ] 14.1 Afklar: er plesnertech.dk i dag på Simply/WordPress?
- [ ] 14.2 Beslut: skal CRM-X landing page erstatte nuværende forside?
- [ ] 14.3 Flyt karriereprofil til `/jens-karriereprofil` på eksisterende platform
- [ ] 14.4 Opret ny forside der præsenterer CRM-X som produkt

> **Afhænger af svar fra Jens om nuværende opsætning på plesnertech.dk**

---

## ADGANGSKRAV

For at komme i gang har jeg brug for følgende:

### 1. GitHub
- Adgang til at oprette et nyt repository (offentligt eller privat)
- Invite `claude-bot` eller del credentials midlertidigt, ELLER: Jens opretter repo og giver mig indhold til at push

**Alternativ:** Jeg genererer alle filer → Jens opretter repo og pusher selv.

### 2. Vercel
- Vercel konto tilknyttet GitHub
- Jens skal: Gå til Vercel → Settings → Domains → Tilføj `*.plesnertech.dk`
- Ingen direkte adgang nødvendig — jeg leverer konfigurationsfiler

### 3. Neon (Database)
- Opret gratis konto på neon.tech
- Opret nyt projekt "crm-x"
- Del `DATABASE_URL` connection string (gemmes i Vercel env vars)
- **Aldrig del dette offentligt**

### 4. plesnertech.dk DNS (Simply)
- Log ind på Simply → Domæner → plesnertech.dk → DNS-indstillinger
- Tilføj: `CNAME *.plesnertech.dk → cname.vercel-dns.com`
- Jeg leverer præcise DNS-records

### 5. Resend (Email)
- Gratis konto på resend.com
- Verificer domænet `plesnertech.dk`
- Del API-nøgle (gemmes i Vercel env vars)

### 6. plesnertech.dk — nuværende site
- Bekræft: er det Simply + WordPress?
- Hvad er på forsiden i dag? (karriereprofil?)
- Vil du have CRM-X marketing landing page som ny forside?

### Hvad jeg IKKE har brug for
- Dine personlige passwords
- Adgang til Simply direkte
- Adgang til Vercel direkte (jeg genererer config-filer)

---

## TIDSHORISONT

### Forudsætninger
- 1 udvikler (AI-assisteret workflow)
- Ca. 4–6 timer effektivt arbejde pr. dag
- Jens er tilgængelig til godkendelse og afklaringer

| Fase | Indhold | Estimat | Kumulativ |
|---|---|---|---|
| Fase 1 | Fundament & infrastruktur | 5–7 dage | Uge 1 |
| Fase 2 | Core CRM | 7–10 dage | Uge 2–3 |
| Fase 3 | Salgsmodul | 5–7 dage | Uge 3–4 |
| Fase 4 | Marketingmodul | 4–5 dage | Uge 4–5 |
| Fase 5 | Support Portal | 7–9 dage | Uge 5–6 |
| Fase 6 | Projekter & Klippekort | 9–12 dage | Uge 7–8 |
| Fase 7 | Produktstyring | 4–5 dage | Uge 9 |
| Fase 8 | Licenshåndtering | 4–6 dage | Uge 9–10 |
| Fase 9 | Administrator Portal | 6–8 dage | Uge 10–11 |
| Fase 10 | Rettigheder & Roller | 4–5 dage | Uge 11–12 |
| Fase 11 | KPI & Dashboards | 5–6 dage | Uge 12–13 |
| Fase 12 | Notifikationer | 3–4 dage | Uge 13 |
| Fase 13 | Deploy & DNS | 2–3 dage | Uge 14 |
| Fase 14 | Karriereprofil flytning | 1–2 dage | Uge 14 |

**Samlet estimat: 14–16 uger til MVP (fuldt funktionel platform)**

### Milestone plan
- **Uge 3:** Live prototype med Core CRM på subdomain
- **Uge 6:** Support portal funktionel
- **Uge 9:** Projekter + Klippekort + Produkter live
- **Uge 12:** Licenser + Admin portal + Rettigheder live
- **Uge 14:** Fuldt deployed, DNS konfigureret, klar til første rigtige tenant

---

## ÅBNE BESLUTNINGER

| # | Spørgsmål | Valg |
|---|---|---|
| A | Er plesnertech.dk i dag WordPress på Simply? | ✅ JA |
| B | Skal `www.plesnertech.dk` have ny CRM-X landing page som forside? | ✅ JA — karriereprofil → `/jens-karriereprofil` |
| C | Skal licenshåndtering være en separat tilkøbspakke? | ✅ JA — separat add-on |
| D | Ønskes integration til e-mail (Outlook/Gmail)? | ⏳ Ikke afklaret |
| E | Skal kunder selv kunne logge ind og se tickets? | ❌ NEJ — ikke i scope |
| F | Ønskes fakturamodul / regnskabsintegration? | ✅ JA — e-conomic el. lign. på sigt |
| G | Mobilapp på sigt? | ⏳ Ikke afklaret |
| H | Dashboards opdelt pr. Salg, Projekter, Support med forretningsoverblik | ✅ JA — kritisk krav |

---

*Dokument sidst opdateret: 2026-05-27*  
*Næste session: Start altid med at læse dette dokument og marker fasers status*
