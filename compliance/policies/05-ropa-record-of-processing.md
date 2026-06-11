# ROPA — Record of Processing Activities (GDPR Art. 30)

**Version:** 1.0
**Ikrafttræden:** [Udfyld dato]
**Ejer:** Jens Plesner

---

## Identifikation af dataansvarlig

| Felt | Værdi |
|---|---|
| Navn | Plesner Tech |
| Adresse | [Indsæt forretningsadresse] |
| CVR | [Indsæt CVR] |
| Kontakt | jens@plesnertech.dk |
| DPO | [Ikke udpeget — vurderes ved >250 ansatte eller kerneaktivitet involverer systematisk overvågning] |

---

## Behandling #1 — Kunde-konti (Plesner Techs egne kunder)

| Felt | Værdi |
|---|---|
| **Formål** | Levering af CRM-X SaaS-tjeneste, support, fakturering |
| **Retsgrundlag** | Kontrakt (Art. 6(1)(b)) |
| **Kategorier af registrerede** | Konto-administratorer, kontaktpersoner hos kunde |
| **Kategorier af personoplysninger** | Navn, e-mail, telefon, firma-tilknytning, IP-adresse, login-tidspunkter |
| **Modtagere** | Plesner Tech-medarbejdere (need-to-know), sub-processors (Neon, Vercel, Resend) |
| **Tredje-lands-overførsler** | Via Resend, GitHub, Anthropic (SCC + supplerende foranstaltninger) |
| **Opbevaringsperiode** | Indtil kundeforhold ophører + 12 mdr. til regnskab |
| **Tekniske foranstaltninger** | Kryptering, RBAC, audit log, MFA-mulighed |
| **Organisatoriske foranstaltninger** | Adgangskontrol, fortrolighedserklæringer |

---

## Behandling #2 — Tenant-data (data CRM-X-kunder lægger ind på deres CRM)

| Felt | Værdi |
|---|---|
| **Formål** | Behandling på vegne af tenant — vi er **Processor**, ikke Controller |
| **Retsgrundlag** | DPA mellem Plesner Tech og hver tenant (Art. 28) |
| **Kategorier af registrerede** | Tenants kunder, leads, kontakter, medarbejdere |
| **Kategorier af personoplysninger** | Navn, kontaktoplysninger, virksomhedsoplysninger, aktivitets-data, evt. licensdata |
| **Modtagere** | Tenants egne brugere, Plesner Techs sub-processors |
| **Opbevaringsperiode** | Bestemmes af tenant — Plesner Tech følger tenants instruks |
| **Tekniske foranstaltninger** | Multi-tenant isolation via `tenantId`, kryptering, audit log |

---

## Behandling #3 — Hjemmesidebesøg og marketing

| Felt | Værdi |
|---|---|
| **Formål** | Markedsføring af CRM-X, lead-generation |
| **Retsgrundlag** | Samtykke (Art. 6(1)(a)) ved nyhedsbrev / cookies / Legitim interesse (Art. 6(1)(f)) ved basis-analytics |
| **Kategorier af registrerede** | Hjemmesidebesøgende, nyhedsbreve-abonnenter |
| **Kategorier af personoplysninger** | E-mail, IP, browser, samtykke-historik |
| **Modtagere** | Resend (nyhedsbreve), evt. analytics-leverandør |
| **Opbevaringsperiode** | Indtil samtykke trækkes tilbage |

---

## Behandling #4 — Medarbejder-administration

| Felt | Værdi |
|---|---|
| **Formål** | HR, lønudbetaling, sikkerheds-administration |
| **Retsgrundlag** | Ansættelseskontrakt + lovkrav |
| **Kategorier af registrerede** | Egne medarbejdere, freelancere |
| **Kategorier af personoplysninger** | Navn, CPR (lønudb.), bankoplysninger, adresse |
| **Opbevaringsperiode** | Ansættelse + 5 år (bogføringsloven) |

---

## Behandling #5 — Sikkerheds-logs og audit-trail

| Felt | Værdi |
|---|---|
| **Formål** | Detektering og forebyggelse af sikkerhedshændelser, audit |
| **Retsgrundlag** | Legitim interesse (Art. 6(1)(f)) + Art. 32 (sikkerhed) |
| **Kategorier af registrerede** | Alle brugere af CRM-X |
| **Kategorier af personoplysninger** | Bruger-ID, e-mail, IP, User-Agent, handlinger |
| **Opbevaringsperiode** | 13 måneder (mål 24 mdr.) |

---

## Risiko-vurdering — sammenfattende

| Behandling | Risiko-niveau | DPIA påkrævet? |
|---|---|---|
| #1 Kunde-konti | Lav | Nej |
| #2 Tenant-data | Mellem (afhænger af tenants brug) | Ja — pr. tenant ved særlige use cases |
| #3 Marketing | Lav | Nej |
| #4 Medarbejdere | Lav-Mellem | Nej (standard HR) |
| #5 Sikkerheds-logs | Lav | Nej |

---

## Revisionshistorik

| Version | Dato | Forfatter | Ændring |
|---|---|---|---|
| 1.0 | [DATO] | Jens Plesner | Initial version |
