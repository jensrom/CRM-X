# CRM-X — Compliance Roadmap

**Standarder i scope:** GDPR + ISO 27001 + SOC 2 (Type I → Type II)
**Status:** Pre-launch, ingen produktionsdata
**Ejer:** Jens Plesner | plesnertech.dk
**Senest opdateret:** 2026-06-03

---

## Forventningsafstemning

Disse standarder er **revisionsrammer** — ikke noget man "implementerer". Tilgangen er:

1. **Tekniske kontroller** (kode + infrastruktur) — det jeg leverer
2. **Organisatoriske kontroller** (politikker, procedurer, træning) — det Jens producerer eller får hjælp til
3. **Bevisførelse** (audit logs, screenshots, dokumenter) — løbende drift
4. **Ekstern revision** — auditor udsteder rapport/certifikat

**Tidshorisont:** Realistisk 6-12 måneder fra "klar" til første audit-rapport. Det meste af det tekniske kan stå klar i Fase 1 nedenfor.

---

## Kontrol-mapping på tværs af standarder

De tre standarder overlapper kraftigt. Tabellen viser hvor de samme kontroller dækker flere standarder samtidig.

| Kontrolområde | GDPR | ISO 27001 (A.x) | SOC 2 (TSC) | Status |
|---|---|---|---|---|
| Access control & roller | Art. 32 | A.5.15, A.9 | CC6.1, CC6.2 | Implementeret (RBAC) |
| Audit logging | Art. 30, 32 | A.8.15, A.12.4 | CC7.2, CC7.3 | I gang |
| Encryption at rest | Art. 32 | A.8.24 | CC6.7 | Neon (DB-level) |
| Encryption in transit | Art. 32 | A.8.24 | CC6.7 | Vercel TLS 1.3 |
| Backup & recovery | Art. 32 | A.8.13 | A1.2 | Neon PITR |
| Incident response | Art. 33 | A.5.24-27 | CC7.4, CC7.5 | Policy mangler |
| Vendor management | Art. 28 | A.5.19-22 | CC9.2 | DPA-templates mangler |
| Data retention | Art. 5(1)(e) | A.5.34 | C1.2 | Policy mangler |
| Right to access/erase | Art. 15-17 | A.5.34 | P5.1, P5.2 | Endpoints mangler |
| Risk assessment | DPIA Art. 35 | A.5.4, Cl. 6 | CC3.x | ROPA mangler |
| Password & MFA | Art. 32 | A.5.17, A.8.5 | CC6.1 | Delvist |
| Change management | — | A.8.32 | CC8.1 | Git workflow |
| Security awareness | Art. 39 | A.6.3 | CC2.2 | Træning mangler |
| Penetration test | Art. 32 | A.8.29 | CC4.1 | Eksternt køb |
| Business continuity | Art. 32 | A.5.29-30 | A1.2, A1.3 | Plan mangler |

---

## Fase 1 — Teknisk fundament (kode, jeg implementerer nu)

### 1.1 Audit Logging
**Dækker:** GDPR Art. 30, ISO A.8.15/A.12.4, SOC 2 CC7.2/CC7.3

- `AuditLog` tabel med `who, what, when, before, after, ipAddress, userAgent`
- `lib/audit.ts` helper kaldet fra alle CRUD server actions
- Indlejret i: bruger-CRUD, tenant-CRUD, rolle-ændringer, login-forsøg, data-eksport, sletning
- Append-only (ingen delete-rute), kun super-admin kan læse på tværs af tenants

### 1.2 Security Headers
**Dækker:** ISO A.8.23, SOC 2 CC6.7

- HSTS (max-age 1 år, includeSubDomains, preload)
- Content-Security-Policy (strict, ingen `unsafe-inline`)
- X-Frame-Options: DENY
- X-Content-Type-Options: nosniff
- Referrer-Policy: strict-origin-when-cross-origin
- Permissions-Policy (kamera/mikrofon/geolokation default off)

### 1.3 Auth-hardening
**Dækker:** GDPR Art. 32, ISO A.5.17/A.8.5, SOC 2 CC6.1

- Password-policy: min 12 tegn, kompleksitet, bcrypt cost 12+
- Rate limiting på `/login` (max 5 forsøg/15 min/IP)
- Session timeout: 8 timer absolut, 30 min idle
- MFA-hook (TOTP-ready, kan aktiveres pr. bruger eller tvinges af admin)
- Login-forsøg logges (succes + fejl) i audit log

### 1.4 GDPR Data-Subject-Rights
**Dækker:** GDPR Art. 15, 16, 17, 18, 20

- `GET /api/gdpr/export?subjectType=contact&id=...` → JSON med alle data om subjektet
- `POST /api/gdpr/erase` → soft delete → hard delete + anonymisering efter X dage
- `POST /api/gdpr/rectify` → ret oplysning, audit-logges
- Self-service for tenant-admin i Indstillinger → Compliance

### 1.5 Input-validering
**Dækker:** ISO A.8.26, SOC 2 CC6.6

- Zod-schemas på ALLE server actions (allerede god disciplin i React)
- Output-sanitization der hvor user-content vises (XSS-forsvar)

### 1.6 Krypterede felter (field-level)
**Dækker:** GDPR Art. 32, ISO A.8.24, SOC 2 CC6.1

- Licensnøgler krypteres i app-laget med AES-256-GCM
- Krypteringsnøgle i Vercel KV/env (rotation-rutine dokumenteret)

### 1.7 Cookie-banner + samtykke
**Dækker:** GDPR Art. 6, 7, ePrivacy

- Banner på marketing-landing (`www.plesnertech.dk`)
- "Decline non-essential" som default-fokuseret knap
- Samtykke logges
- I CRM (`*.plesnertech.dk`) er kun strictly-necessary cookies → ingen banner krævet

---

## Fase 2 — Organisatoriske dokumenter (templates jeg leverer, Jens udfylder)

Disse er **ikke** noget kode kan løse. Hver auditor vil se underskrevne politikker.

1. **Information Security Policy** — overordnet (1-side, ledelsens commitment)
2. **Acceptable Use Policy** — for medarbejdere
3. **Access Control Policy** — hvem får adgang til hvad, hvornår
4. **Cryptography Policy** — hvad krypteres, hvordan
5. **Backup & Recovery Policy** — RPO, RTO, test-rutine
6. **Incident Response Plan** — fra opdagelse til lukning + 72-timers GDPR-notifikation
7. **Vendor Management Policy** — sub-processors-liste, DPA'er på plads
8. **Data Retention & Deletion Policy** — hvor længe gemmes hvad
9. **Change Management Policy** — kode-changes via PR + review
10. **Risk Assessment / ROPA** (Record of Processing Activities) — GDPR Art. 30
11. **DPIA-template** — bruges når nye features behandler følsomme data
12. **DPA-template** — bruges når Jens er Processor for sine kunder

Templates leveres i `compliance/policies/` — Jens udfylder, lederen underskriver, dato + version.

---

## Fase 3 — Sub-processor-aftaler (skal indhentes)

GDPR Art. 28 kræver skriftlig DPA med hver sub-processor:

| Leverandør | Funktion | DPA-status | Vurdering |
|---|---|---|---|
| Neon | Database hosting (EU) | Skal hentes | Vurder DPA + SCC for evt. US-transfer |
| Vercel | Hosting (EU region fra1) | Skal hentes | Vurder DPA + SCC |
| Resend | Transactional email | Skal hentes | EU-data residency? |
| GitHub | Source code | Skal hentes | Standard MSA |
| OpenAI/Anthropic | (Hvis AI bruges) | Skal hentes | Vurder data-flow |

**Sub-processors-liste** skal være offentligt tilgængelig (typisk `/legal/subprocessors`) og kunder skal kunne abonnere på ændringer (14-dages varsel).

---

## Fase 4 — Drift & bevisførelse (løbende)

For at en auditor kan udstede en rapport, skal de kunne se **at kontrollerne fungerer over tid**:

- Audit-logs gemt 12+ mdr.
- Access reviews kvartalsvis (hvem har stadig brug for hvilken adgang?)
- Vulnerability scanning månedligt (fx Snyk, GitHub Dependabot)
- Penetration test årligt (eksternt firma)
- Backup-restore test halvårligt
- Incident-response-øvelse årligt
- Sikkerhedstræning af medarbejdere ved onboarding + årligt
- Risiko-vurdering opdateres minimum årligt

---

## Fase 5 — Ekstern revision

**SOC 2 Type I** (~3-6 mdr. fra readiness):
- Beskriver kontrollerne på et tidspunkt
- Lettere indgang
- Pris-indikation: 30-60.000 kr.

**SOC 2 Type II** (~6-12 mdr. fra Type I):
- Tester at kontrollerne fungerer over en periode (typisk 6 mdr.)
- Det din kunde reelt vil have
- Pris-indikation: 80-150.000 kr.

**ISO 27001-certificering** (~6-12 mdr. fra readiness):
- Akkrediteret certificeringsorgan (DNV, Bureau Veritas, BSI)
- Stage 1 (dokumentation) + Stage 2 (implementering)
- Surveillance audits årligt, recertifikation hvert 3. år
- Pris-indikation: 50-100.000 kr. initial + årlige opfølgningsaudits

**GDPR**: Ingen "certificering" — løbende compliance er kravet. Datatilsynet kan auditere.

**Anbefalet rækkefølge for plesnertech.dk-kunder:**
1. GDPR-foundation (kritisk dag 1)
2. ISO 27001 (bredere anerkendt i DK/EU)
3. SOC 2 Type I → Type II (kun hvis kunder i Norden/US specifikt kræver det)

---

## Næste skridt

1. Jeg implementerer Fase 1 (kode) — alt landes som PR'er du kan reviewe
2. Jeg leverer Fase 2-templates — du sætter dem på papir
3. Du indhenter Fase 3 DPA'er
4. Vi bygger Fase 4-rutinerne ind i kalenderen
5. Når Fase 1-4 er på plads → kontakt revisor for Fase 5

Forventet implementerings-tid for Fase 1: 3-5 dages effektivt udviklingsarbejde.
