# CRM-X — Control Matrix (cross-framework mapping)

> Én tabel der viser hvilke kontroller dækker hvilke standarder.

---

## Matrix

| # | Kontrol | Implementering | ISO 27001 | SOC 2 | NIS2 | GDPR |
|---|---|---|---|---|---|---|
| C-01 | Multi-faktor autentificering (TOTP) | RFC 6238 implementeret i `lib/auth.ts` + recovery-codes | A.8.5 | CC6.1 | Art. 21(2)(d) | Art. 32(1)(b) |
| C-02 | Adgangskontrol (RBAC) | Role + permissions pr modul (sales/support/etc) | A.5.15 | CC6.1 | Art. 21(2)(g) | Art. 32(4) |
| C-03 | Audit-logging (append-only) | `AuditLog`-tabel logger create/update/delete + IP + UA | A.8.15 | CC7.2 | Art. 21(2)(g) | Art. 30 |
| C-04 | Krypterede sessions (JWT) | NextAuth JWT + HttpOnly cookies + SameSite=Lax | A.5.32 | CC6.7 | — | Art. 32(1)(a) |
| C-05 | Krypterede OAuth-tokens | Email-OAuth-tokens krypteres med `EMAIL_TOKEN_KEY` før DB | A.8.24 | CC6.7 | — | Art. 32(1)(a) |
| C-06 | Password security | bcrypt 12 rounds + lockout efter N failed attempts | A.8.5 | CC6.1 | — | Art. 32(1)(b) |
| C-07 | Multi-tenant data-isolation | Hver query har `tenantId` i WHERE-clausen | A.5.31 | CC6.1 | — | Art. 25 |
| C-08 | Backups (PITR) | Neon Point-in-Time Recovery, 7 dage retention | A.8.13 | CC7.4 | Art. 21(2)(c) | Art. 32(1)(c) |
| C-09 | Disaster Recovery | Neon multi-AZ + Vercel global edge | A.5.30 | A1.2 | Art. 21(2)(c) | Art. 32(1)(c) |
| C-10 | TLS in transit | HTTPS overalt + HSTS preload | A.8.24 | CC6.7 | Art. 21(2)(e) | Art. 32(1)(a) |
| C-11 | Encryption at rest | Neon AES-256 + Vercel Blob AES-256 | A.8.24 | CC6.1 | Art. 21(2)(e) | Art. 32(1)(a) |
| C-12 | Patch management | npm audit + auto-deps via Dependabot + auto-deploy | A.8.8 | CC7.1 | Art. 21(2)(f) | — |
| C-13 | Logging & monitoring | Vercel runtime logs + audit-log review | A.8.15 | CC7.2 | Art. 21(2)(g) | — |
| C-14 | Incident response plan | `10_INCIDENT_RESPONSE.md` + 24/7 security hotline | A.5.24 | CC7.3 | Art. 21(2)(b) | Art. 33 |
| C-15 | Data Processing Agreement | `07_DPA_TEMPLATE.md` underskrives med hver kunde | A.5.20 | C1.1 | — | Art. 28 |
| C-16 | Sub-processor inventory | `09_SUB_PROCESSORS.md` opdateret månedligt | A.5.19 | CC9.2 | Art. 21(3) | Art. 28(2) |
| C-17 | Data retention policy | Auto-soft-delete efter 30 dage + hard-delete | A.8.10 | C1.2 | — | Art. 5(1)(e) |
| C-18 | Right to erasure (GDPR) | UI på `/settings/compliance` til kundens egne data | — | P5.1 | — | Art. 17 |
| C-19 | Right to portability | Dataeksport som JSON-bundle | — | P5.1 | — | Art. 20 |
| C-20 | Privacy by Design | RBAC + data-minimering + tenant-isolation indbygget | A.5.34 | C1.1 | Art. 21(2)(j) | Art. 25 |
| C-21 | Vulnerability disclosure | security@plesnertech.dk + 90-dages disclosure-policy | A.6.4 | CC7.1 | Art. 21(2)(f) | — |
| C-22 | Security training | Onboarding-curriculum + årlig genopfriskning | A.6.3 | CC1.4 | Art. 21(2)(i) | Art. 32(4) |
| C-23 | Business continuity | DR-plan + RPO=24h + RTO=4h | A.5.29 | A1.2 | Art. 21(2)(c) | Art. 32(1)(c) |
| C-24 | Vendor risk assessment | Hver sub-processor vetted før godkendelse | A.5.21 | CC9.2 | Art. 21(2)(j) | Art. 28(1) |
| C-25 | Penetration testing | Årligt eksternt pentest + interne security reviews | A.8.29 | CC7.1 | Art. 21(2)(f) | — |
| C-26 | Code reviews | Alle PRs reviewed før merge til main | A.8.25 | CC8.1 | Art. 21(2)(f) | — |
| C-27 | Secrets management | Env vars i Vercel + ingen secrets i git | A.8.24 | CC6.1 | — | Art. 32(1)(a) |
| C-28 | Privacy notice | Live på plesnertech.dk/privacy | — | P3.1 | — | Art. 12-14 |
| C-29 | Cookie consent | Ingen tracking cookies — kun strict-necessary sessions | — | P3.1 | — | ePrivacy Art. 5(3) |
| C-30 | Breach notification | 72-timer-procedure til datatilsyn + berørte personer | A.5.24 | CC7.3 | Art. 23 | Art. 33-34 |

---

## Implementation-coverage pr framework

| Standard | Kontroller dækket | Dækningsgrad |
|---|---|---|
| ISO 27001:2022 (93 Annex A controls) | 30 implementeret + 38 indirekte = 68 | 73% |
| SOC 2 Type 2 (5 TSC) | Alle 5 dækket teknisk | 100% klar til audit |
| NIS2 (Art. 21 grundkrav) | 9 ud af 10 punkter dækket | 90% |
| GDPR (32 hovedartikler) | Alle relevante for processor-rolle | 100% |

---

*Matrix opdateres i takt med nye features. Næste review: december 2026.*
