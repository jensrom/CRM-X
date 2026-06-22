# Sub-processor Liste

> Aktuelle sub-databehandlere CRM-X anvender til at levere platformen.
> Opdateres månedligt. Ændringer notificeres pr. e-mail til tenant-admins med 30 dages varsel.

---

## Hvordan denne liste virker

CRM-X bruger udvalgte sub-processorer til hosting, betaling, mail og analyse. Hver sub-processor:

1. Er **kontraktligt forpligtet** via DPA
2. Har **egen certificering** (SOC 2, ISO 27001, eller tilsvarende)
3. Er **vetted** før ibrugtagning
4. **Reviewes årligt** for fortsat egnethed

---

## Kerne-infrastruktur (kritiske sub-processorer)

| Sub-processor | Funktion | Lokation | Persondata behandlet | Sikkerheds-attest |
|---|---|---|---|---|
| **Vercel Inc.** | Application hosting + edge network | USA (HQ), Frankfurt + global edge | Alle session-data, request-logs | SOC 2 Type 2, ISO 27001 |
| **Neon Inc.** | PostgreSQL-hosting | EU (Frankfurt) | Hele applikations-databasen | SOC 2 Type 2 |
| **Stripe Inc.** | Payment processing (subscription-betaling af CRM-X) | USA + IE | Tenant-admin's faktura-email + Stripe-customer-id | PCI DSS Level 1, SOC 1+2 Type 2, ISO 27001 |
| **GitHub Inc.** | Source code repository | USA (Microsoft-owned) | Ingen tenant-data — kun source code | SOC 1+2 Type 2, ISO 27001 |

---

## E-mail & kommunikation

| Sub-processor | Funktion | Lokation | Persondata | Attest |
|---|---|---|---|---|
| **Resend Inc.** | Transaktionelle e-mails (faktura, password reset, etc.) | USA | Modtager-email + email-indhold | ISO 27001, GDPR-compliant |
| **Microsoft Corp. (Graph API)** | Brugerens personlige mail-sending fra M365 | EU eller USA (afhænger af bruger-tenant) | OAuth-tokens (krypteret) | SOC 1+2+3, ISO 27001/17/18, GDPR-compliant |
| **Google LLC (Gmail API)** | Brugerens personlige mail-sending fra Workspace | EU eller USA (afhænger af bruger-tenant) | OAuth-tokens (krypteret) | SOC 1+2+3, ISO 27001/17/18, GDPR-compliant |

---

## Storage

| Sub-processor | Funktion | Lokation | Persondata | Attest |
|---|---|---|---|---|
| **Vercel Blob** | Fil-upload storage (attachments) | USA + global edge | Filer uploaded af brugere | SOC 2 Type 2 (Vercel) |

---

## Observability & Monitoring

| Sub-processor | Funktion | Lokation | Persondata | Attest |
|---|---|---|---|---|
| **Vercel Analytics** | Page-view metrics (anonymiserede) | USA | Anonymiseret traffic-data | SOC 2 Type 2 |
| **Sentry** (planlagt) | Error-tracking | Vælges EU-region ved opsætning | Stack traces (kan indeholde context) | SOC 2 Type 2, ISO 27001 |
| **Datadog** (planlagt) | APM + logs | EU-region | Application logs (PII redacted) | SOC 2 Type 2, ISO 27001 |

---

## Endnu **IKKE** i brug (men på roadmap)

| Sub-processor | Funktion | Status |
|---|---|---|
| Anthropic (Claude API) | AI-tilbudsgenerator | Q4 2026 — kræver tenant opt-in |
| HubSpot/Salesforce API | Import-funktion | Q1 2027 |
| Twilio | SMS-notifikationer | Q2 2027 |

---

## Internationale overførsler

CRM-X behandler primært data i **EU (Frankfurt)**. Hvor sub-processorer er i USA eller andre tredjelande, anvendes:

1. **Standard Contractual Clauses (SCC) 2021/914** — alle USA-sub-processorer
2. **EU-US Data Privacy Framework** (DPF) — hvor sub-processoren er certificeret (Microsoft, Google)
3. **Yderligere foranstaltninger** efter Schrems II:
   - Kryptering at rest + in transit (AES-256 + TLS 1.3)
   - Pseudonymisering hvor relevant
   - Audit-rights kontraktligt sikret

---

## Tilføjelse eller udskiftning af sub-processorer

Plesner Tech følger denne proces:

1. **Vetting** — security + privacy review af ny leverandør
2. **DPA-underskrivelse** med ny leverandør
3. **Risk assessment** — opdater intern risikoregister
4. **Skriftlig notifikation** til alle tenant-admins via e-mail (mindst 30 dages varsel)
5. **Indsigelsesperiode** — tenant kan gøre indsigelse indenfor 30 dage
6. **Implementation** efter periode

Hvis en tenant gør indsigelse mod en ny sub-processor, har vi to muligheder:
- Tilbyde alternativ leverandør (hvor muligt)
- Tilbyde tenant at opsige Hovedaftalen uden afgift

---

## Indsigelse mod en sub-processor

Skriv til **privacy@plesnertech.dk** med:
- Tenant-navn + admin-bekræftelse
- Hvilken sub-processor + begrundelse
- Forslag til alternativ løsning

Vi svarer indenfor 5 hverdage.

---

## Audit-historik (sidste 12 mdr)

| Dato | Ændring | Notifikations-e-mail sendt |
|---|---|---|
| 2026-06-22 | Initial offentliggørelse af denne liste | Ja, til alle aktive tenants |
| — | — | — |

---

*Liste opdateret 22. juni 2026. Næste planlagte review: 22. juli 2026.*
