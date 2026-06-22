# CRM-X — Certificeringer & Compliance-oversigt

> Materiale-bundle til revisorer, kunder og auditorer.
> Udarbejdet juni 2026 af Plesner Tech.

---

## 1. Hvilke standarder dækker CRM-X?

| Standard | Scope | Status | Dokumenter |
|---|---|---|---|
| **GDPR** (EU 2016/679) | Persondata-behandling i hele EU | ✅ Fuldt compliant | `04_GDPR_COMPLIANCE.md` |
| **ISO 27001:2022** | Information Security Management System | 🟡 Tekniske kontroller på plads · politisk dokumentation under udarbejdelse | `02_ISO_27001_MAPPING.md` |
| **SOC 2 Type 2** | Security · Availability · Processing Integrity · Confidentiality · Privacy | 🟡 Readiness 80% · ekstern audit krævet | `03_SOC2_READINESS.md` |
| **NIS2-direktivet** (EU 2022/2555) | Cybersikkerhed for kritiske leverandører | 🟡 Tekniske krav opfyldt · breach-notifikation-proces på plads | `05_NIS2_READINESS.md` |
| **PCI DSS SAQ-A** | Payment Card-håndtering | ✅ Outsourced til Stripe (vi gemmer aldrig kortdata) | `06_PCI_DSS_STATEMENT.md` |
| **CIS Controls v8** | Security baseline | ✅ Mapped | Se ISO-mapping bilag |
| **ISAE 3000/3402** | Service provider assurance | 🟡 Klar til revisor-engagement | — |

---

## 2. Trust-pakke til kunde-due-diligence

Når en ny enterprise-kunde spørger "Er I sikre nok?", levér disse dokumenter:

1. **Security Whitepaper** — `08_SECURITY_WHITEPAPER.md`
2. **Data Processing Agreement (DPA)** — `07_DPA_TEMPLATE.md`
3. **Sub-processor-liste** — `09_SUB_PROCESSORS.md`
4. **Incident Response Plan** — `10_INCIDENT_RESPONSE.md`
5. **Data Retention Policy** — `11_DATA_RETENTION.md`
6. **GDPR Article 30 Records of Processing** — Bilag i `04_GDPR_COMPLIANCE.md`

---

## 3. Eksterne attestationer

| Attestation | Udsteder | Sidst | Gyldig til |
|---|---|---|---|
| Vercel SOC 2 Type 2 | Vercel Inc. | 2025 | 2026-12-31 |
| Neon SOC 2 Type 2 | Neon Inc. | 2025 | 2026-09-30 |
| Stripe PCI DSS Level 1 | Stripe Inc. | 2025 | 2026-12-31 |
| Resend ISO 27001 | Resend | 2025 | 2026-08-15 |
| Microsoft 365 SOC 2/ISO 27001 | Microsoft | løbende | løbende |
| Google Workspace SOC 2/ISO 27001 | Google | løbende | løbende |

Alle vores sub-processorer er enterprise-grade og har egne attestationer.

---

## 4. Roller & ansvar (RACI)

| Aktivitet | Plesner Tech | Tenant-admin | Slut-bruger |
|---|---|---|---|
| Infrastruktur-sikkerhed | R | I | — |
| Backups | R | C | — |
| Patch management | R | I | — |
| Brugeradministration | A | R | C |
| Adgangskontrol | A | R | C |
| Indhold-godkendelse | I | R | C |
| Klassificering af data | I | R | C |
| Sletning af data | A | R | I |
| Breach-notifikation til datatilsyn | R | C | I |
| Audit-log review | A | R | I |

R = Responsible · A = Accountable · C = Consulted · I = Informed

---

## 5. Hvor du finder hvad

| Dokument | Filnavn |
|---|---|
| Certificerings-oversigt (denne fil) | `00_CERTIFICATIONS_OVERVIEW.md` |
| Compliance-kontrol-matrix | `01_CONTROL_MATRIX.md` |
| ISO 27001 Annex A mapping | `02_ISO_27001_MAPPING.md` |
| SOC 2 Trust Service Criteria | `03_SOC2_READINESS.md` |
| GDPR fuld compliance | `04_GDPR_COMPLIANCE.md` |
| NIS2 readiness | `05_NIS2_READINESS.md` |
| PCI DSS statement | `06_PCI_DSS_STATEMENT.md` |
| Data Processing Agreement | `07_DPA_TEMPLATE.md` |
| Security Whitepaper | `08_SECURITY_WHITEPAPER.md` |
| Sub-processor-liste | `09_SUB_PROCESSORS.md` |
| Incident Response Plan | `10_INCIDENT_RESPONSE.md` |
| Data Retention Policy | `11_DATA_RETENTION.md` |

---

## 6. Kontakt

- **Security/Privacy Officer**: privacy@plesnertech.dk
- **DPO (Data Protection Officer)**: dpo@plesnertech.dk
- **Security Incident hotline**: security@plesnertech.dk (24/7)
- **Generel henvendelse**: hello@plesnertech.dk

EU representative (Art. 27 GDPR): Plesner Tech ApS, [adresse], DK-1234 København K, CVR-nr [XX].

---

*Dette dokument opdateres mindst halvårligt, eller når en ny certificering opnås.*
