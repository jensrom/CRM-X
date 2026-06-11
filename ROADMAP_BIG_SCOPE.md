# Roadmap — Stort scope fra 2026-06-09

Du sendte 12 store features i én besked. Jeg har gjort #1 nu (Æ/Ø/Å).
Resten skal vi prioritere — hver feature er fra ½ time til 2 dages arbejde.

---

## ✅ Gjort i denne runde

### 1. Æ/Ø/Å gennemgang
**38 filer ændret, ~129 matches.** Mapping over 100+ danske ord der havde
ASCII-stavning (aabne→åbne, soeg→søg, naeste→næste, vaelg→vælg, foerst→først,
m.fl.). Verb-bøjninger og navneord dækket. Komment-tekst i `compliance/policies/`
også opdateret.

**Mangler stadig** (manuelle reviews):
- Audit-log strenge i `lib/audit.ts` (bevidst engelsk pga. compliance)
- Schema-kommentarer i `prisma/schema.prisma` (engelsk for konsistens)
- Ord der ikke er på min mapping — send mig konkrete eksempler hvis du ser dem

---

## 📋 Resterende 11 features (du skal prioritere)

### 2. CSV-import + skabelon for firmaer
**Effort:** ½ dag
- Skabelon-fil (.csv) der downloades fra UI: kolonner Navn, CVR, Branche,
  Adresse, Postnr, By, Tlf, Email, Hjemmeside, Notater
- Upload-form med preview, fejl-rapportering, batch-commit
- "Spring duplikater over" eller "opdater eksisterende"-toggle

### 3. CSV-import for kontakter med firma-link
**Effort:** ½ dag (bygger oven på #2)
- Skabelon: Fornavn, Efternavn, Email, Telefon, Stilling, **FirmaCVR** eller **FirmaNavn**
- Lookup på CVR først, derefter navn-match for at finde firma
- Rapporterer hvilke kontakter ikke kunne mappes (oprettes uden firma)

### 4. Kontakt-felter udvidet
**Effort:** ½ dag
- **Primær** (krævet): Fornavn, Efternavn, Email, Telefon, Stilling
- **Sekundær** (valgfri): Mobil, LinkedIn, Fødselsdag, Foretrukken kontaktform,
  Sprog, Beskrivelse, Tags
- **Dropdown:** Beslutningsmandat — Ingen / Påvirker / Beslutter / Underskriver
- Filtrering i kontakt-liste på beslutningsmandat

### 5. Produkt-type
**Effort:** 1-2 timer
- Felt `productType` på Product: SaaS / Software-licens / Hardware /
  Konsulentydelse / Tilbehør / Andet
- Vises som tag på produkt-kort og filterbar i liste

### 6. Faktura: rabat pr. linje
**Effort:** 2-3 timer
- `discountPercent` eller `discountAmount` pr. `InvoiceLine`
- UI: rabat-felt pr. linje (% eller kr.)
- Subtotal pr. linje + total med rabat

### 7. Faktura: dansk standard + moms + B2B/B2C
**Effort:** 1 dag
- Felter på Invoice: `customerType` (B2B/B2C), `vatRate` (default 25%)
- Linje-niveau: ex moms / inkl moms toggle
- Total-blok: Subtotal, Rabat, Moms (25%), Total
- B2B kræver kunde-CVR; B2C behøver ikke
- PDF-eksport følger dansk standard (fakturadato, forfaldsdato,
  betalingsbetingelser, CVR, fakturanummer, leveringsdato hvis relevant)

### 8. Firma: invoice-mail-felt
**Effort:** 1 time
- `invoiceEmail` på Company (separat fra `email`)
- Faktura-send bruger denne mail som modtager
- Vises i firma-detalje med "Send faktura til denne adresse"-indikator

### 9. QR-koder på tickets/projekter/klippekort/fakturaer
**Effort:** ½ dag
- QR-genereres on-demand (ingen lagring) — encoder full URL til detalje-siden
- Bruger-præference (i indstillinger): `qrPreference` = `hidden` (default) eller `visible`
- Hvis hidden: lille QR-ikon i toppen af detalje-siden → klik viser modal
- Hvis visible: QR vises altid + download-knap
- Ingen ekstra DB-felter — alt udregnet from objekt-id + base URL

### 10. Indstillinger: dybere fane-struktur + tilbageknapper
**Effort:** ½ dag
- **Faktura-konfiguration** (ny fane): logo, betalingsbetingelser, faktura-tekst,
  bank-info, default moms-sats, default valuta
- **Min profil** udvidet: Fornavn, Efternavn, Email, Telefon, Stilling,
  Beskrivelse, Sprog, Tidszone, QR-præference
- Tilbageknap på ALLE settings-undersider (de fleste har det allerede via
  `BackButton` — manglende sider får det)

### 11. API-tokens (kun Large-pakke)
**Effort:** 1 dag
- Schema: `ApiToken` tabel med `tenantId`, `name`, `tokenHash`, `scopes`,
  `expiresAt`, `lastUsedAt`, `createdById`
- UI under Indstillinger → "API & Integrationer" (kun synlig på Large-plan)
- Generer token: vises ÉN gang i klartekst, derefter kun navn + sidste-4-cifre
- Tilbagekald-knap
- API-dokumentationsside (Markdown-baseret med eksempler i curl/Python/JS)
- Middleware: tjek `Authorization: Bearer <token>` for `/api/v1/*`-routes

### 12. Ticket-status udvidet
**Effort:** 2-3 timer
- Nye statuses: Ny / **Åben** / **Afventer kunde** / **Afventer leverandør** /
  Løst eller Lukket (slået sammen til én)
- Migration: gamle statuses mappes (`pending_reply` → `awaiting_customer`)
- Badge-farver pr. status

### 13. Projekt-status + faktura-prompt
**Effort:** 3-4 timer
- Statuses: **Aktiv** / **Afventer** / **Lukket**
- Når lukket: alle redigerings-felter låses, "Genåbn"-knap erstatter
- Ved lukning: dialog "Generer faktura af de ufakturerede timer?" → ja går til
  /invoices/new pre-udfyldt med projektets ufakturerede timelogs

### 14. Admin-tenant (DET STORE)
**Effort:** 3-5 dage
- Subdomain: `crmadmin.plesnertech.dk` (middleware-routing)
- Komplet visuel parity med kunde-tenant (samme sidebar-stil, komponenter)
- Dashboard udelukkende over kunder (ikke kunde-data): MRR, churn, antal
  tenants, modul-fordeling, support-tickets på tværs (når support-tier indføres)
- Tenant-profil-side: alle data om kunden uden at læse kundens data
- **Impersonation:** "Log ind som tenant-admin" — short-lived session (1 time),
  read-only-flag, tydelig banner i UI, audit-spor
- Dashboard-kategorier: **Aktivitet** (logins, oprettelser),
  **Økonomi** (MRR, fakturaer, betalinger), **System** (errors, deploys)

---

## Min anbefaling — fase-opdeling

**Fase A — Quick wins (½ dag)** — alle hurtige men spændt over UX-irritation:
- #5 Produkt-type
- #8 Firma invoice-mail
- #10 Tilbageknapper i settings
- #12 Ticket-status udvidet

**Fase B — Forretningsværdi (1-2 dage)**:
- #4 Kontakt-felter udvidet + beslutningsmandat
- #6 Faktura linje-rabat
- #7 Dansk faktura + moms + B2B/B2C
- #13 Projekt-lukning + faktura-prompt

**Fase C — Import & skalering (1 dag)**:
- #2 CSV-import firmaer
- #3 CSV-import kontakter

**Fase D — Polish & avanceret (1-2 dage)**:
- #9 QR-koder
- #11 API-tokens (Large-only)

**Fase E — Admin-tenant** (separat projekt):
- #14 Komplet admin-tenant

---

## Hvad jeg vil have fra dig

Vælg én af disse rækkefølger — så går jeg i gang:

1. **"Kør Fase A nu"** — alle quick wins færdige på 1-2 timer
2. **"Kør Fase A + B"** — bygges over flere iterationer
3. **"Spring til Admin-tenant"** — start på #14 nu, resten venter
4. **"Anden rækkefølge"** — du fortæller hvad der er vigtigst

Imens kan du teste at Æ/Ø/Å-fix virker rundt om i systemet —
hard-reload og kig i sidebars, formularer, dashboard-tekster.
