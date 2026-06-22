# ISO/IEC 27001:2022 — Annex A Controls Mapping

> Hvordan CRM-X opfylder hver kontrol i ISO 27001:2022 Annex A.
> Bruges af interne ISMS-koordinatorer + eksterne auditorer.

---

## Forklaring

ISO 27001:2022 har **93 Annex A controls** opdelt i 4 temaer:

- **A.5** Organizational controls (37)
- **A.6** People controls (8)
- **A.7** Physical controls (14)
- **A.8** Technological controls (34)

Vi er en **SaaS-leverandør**, så A.7 (fysiske kontroller) er primært outsourced til vores datacentre (Neon AWS Frankfurt + Vercel global).

---

## A.5 Organizational controls

| ID | Kontrol | Implementering | Evidens |
|---|---|---|---|
| **A.5.1** | Policies for information security | ISMS-politik godkendt af ledelse | `policies/ISMS_Policy.pdf` |
| **A.5.2** | Information security roles and responsibilities | RACI-matrix i `00_CERTIFICATIONS_OVERVIEW.md` | RACI-doc |
| **A.5.3** | Segregation of duties | Dev/Ops/Audit roller adskilt | Org-chart |
| **A.5.4** | Management responsibilities | Quarterly ISMS-review af CTO + Founder | Mødedokumentation |
| **A.5.5** | Contact with authorities | DPA registreret hos Datatilsynet | DPA-bevis |
| **A.5.6** | Contact with special interest groups | Medlem af ISC2 + CSA | Medlemsbeviser |
| **A.5.7** | Threat intelligence | Daglige feeds fra CISA + ENISA + NVD | Threat-feed-log |
| **A.5.8** | Information security in project management | Security-review gate i hver release | Release-checklist |
| **A.5.9** | Inventory of information and other associated assets | Asset-register i `lib/db.ts` + datamodel | Prisma schema |
| **A.5.10** | Acceptable use of information assets | AUP underskrives af alle medarbejdere | Onboarding-doc |
| **A.5.11** | Return of assets | Off-boarding-checklist | HR-doc |
| **A.5.12** | Classification of information | 4 niveauer: Public/Internal/Confidential/Restricted | Data-classification-policy |
| **A.5.13** | Labelling of information | UI viser visibility-flag på dokumenter | App-screenshots |
| **A.5.14** | Information transfer | TLS + DPA-aftaler med modtagere | Sub-processor-liste |
| **A.5.15** | Access control | RBAC pr modul + permissions (view/create/edit/delete) | Role-config |
| **A.5.16** | Identity management | NextAuth + unik User-id pr person | NextAuth config |
| **A.5.17** | Authentication information | Password + MFA + recovery codes | `lib/auth.ts` |
| **A.5.18** | Access rights | Periodisk review pr 90 dage | Access-review-log |
| **A.5.19** | Information security in supplier relationships | Hver sub-processor reviewet før godkendelse | Vendor-assessment-form |
| **A.5.20** | Addressing information security within supplier agreements | DPA + sub-processor-aftaler underskrives | DPA-templates |
| **A.5.21** | Managing information security in the ICT supply chain | SBOM genereret automatisk + npm audit | CI/CD-log |
| **A.5.22** | Monitoring, review and change management of supplier services | Quarterly vendor-review | Review-log |
| **A.5.23** | Information security for use of cloud services | Cloud Security Policy underskrevet | Policy-doc |
| **A.5.24** | Information security incident management planning | `10_INCIDENT_RESPONSE.md` | Incident plan |
| **A.5.25** | Assessment and decision on information security events | SOC trænes til triage | SOC playbook |
| **A.5.26** | Response to information security incidents | 24/7 hotline + 4-timer MTTR-mål | SLA-doc |
| **A.5.27** | Learning from information security incidents | Blameless postmortem efter hver hændelse | Postmortem-arkiv |
| **A.5.28** | Collection of evidence | Audit-log + chain-of-custody | Audit-log-DB |
| **A.5.29** | Information security during disruption | DR-plan med RPO=24h + RTO=4h | BCP-doc |
| **A.5.30** | ICT readiness for business continuity | Neon multi-AZ + Vercel edge | Arkitektur-diagram |
| **A.5.31** | Legal, statutory, regulatory and contractual requirements | Compliance-register | Register |
| **A.5.32** | Intellectual property rights | Kun licenseret 3rd party-software | License-inventory |
| **A.5.33** | Protection of records | Audit-log append-only + immutable backups | DB-config |
| **A.5.34** | Privacy and protection of personal information | Privacy by Design + GDPR-compliance | `04_GDPR_COMPLIANCE.md` |
| **A.5.35** | Independent review of information security | Årlig pentest + ekstern ISO audit | Pentest-rapport |
| **A.5.36** | Compliance with policies, rules and standards | Quarterly compliance-audit | Audit-rapport |
| **A.5.37** | Documented operating procedures | Runbooks i `docs/operations/` | Runbook-folder |

---

## A.6 People controls

| ID | Kontrol | Implementering | Evidens |
|---|---|---|---|
| **A.6.1** | Screening | Background-check af alle nyansatte | HR-policy |
| **A.6.2** | Terms and conditions of employment | NDA + AUP i ansættelses-kontrakt | Kontrakt-template |
| **A.6.3** | Information security awareness, education and training | Onboarding-curriculum + årlig genopfriskning | LMS-log |
| **A.6.4** | Disciplinary process | Politik for håndtering af security-overtrædelser | HR-policy |
| **A.6.5** | Responsibilities after termination or change of employment | Off-boarding-checklist sikrer revokation | HR-policy |
| **A.6.6** | Confidentiality or non-disclosure agreements | NDA underskrevet af alle | NDA-arkiv |
| **A.6.7** | Remote working | VPN + zero-trust + MFA | Remote-work-policy |
| **A.6.8** | Information security event reporting | Anonym kanal + Slack #security | Reporting-channels |

---

## A.7 Physical controls (primært outsourced)

| ID | Kontrol | Implementering | Evidens |
|---|---|---|---|
| **A.7.1** | Physical security perimeters | Outsourced til Neon (AWS) + Vercel | Sub-processor-SOC 2 |
| **A.7.2** | Physical entry | AWS + Vercel datacenter-attestationer | SOC 2-reports |
| **A.7.3** | Securing offices, rooms and facilities | Kontor med keycard + alarm | Site-audit |
| **A.7.4** | Physical security monitoring | CCTV + access logs | Surveillance-log |
| **A.7.5** | Protecting against physical and environmental threats | Datacenter-attestationer | SOC 2-reports |
| **A.7.6** | Working in secure areas | Server-rum kun for autoriseret personale | Access-list |
| **A.7.7** | Clear desk and clear screen | Skærmlås efter 5 min + clean-desk-policy | Policy + checks |
| **A.7.8** | Equipment siting and protection | Devices krypteret + remote-wipe | MDM-config |
| **A.7.9** | Security of assets off-premises | BYOD-policy + krypteret USB-stick | Policy |
| **A.7.10** | Storage media | Krypteret SSDs + sikker bortskaffelse | Bortskaffelses-log |
| **A.7.11** | Supporting utilities | Datacenter UPS + dieselgenerator | SOC 2-reports |
| **A.7.12** | Cabling security | Datacenter-ansvar | SOC 2-reports |
| **A.7.13** | Equipment maintenance | Datacenter-ansvar | SOC 2-reports |
| **A.7.14** | Secure disposal or re-use of equipment | Crypto-shredding før genbrug/bortskaffelse | Bortskaffelses-log |

---

## A.8 Technological controls

| ID | Kontrol | Implementering | Evidens |
|---|---|---|---|
| **A.8.1** | User endpoint devices | MDM + krypterede disks + auto-lock | MDM-console |
| **A.8.2** | Privileged access rights | Just-in-time-access + audit-log | Access-log |
| **A.8.3** | Information access restriction | Tenant-isolation + RBAC | Prisma queries |
| **A.8.4** | Access to source code | Git med PR-review + branch-protection | GitHub-config |
| **A.8.5** | Secure authentication | MFA (TOTP) + password complexity | `lib/auth.ts` |
| **A.8.6** | Capacity management | Vercel auto-scaling + Neon connection pooling | Vercel-config |
| **A.8.7** | Protection against malware | Sandboxed runtime (Vercel Edge) + npm audit | Build-log |
| **A.8.8** | Management of technical vulnerabilities | Dependabot + monthly CVE-review | Dependabot-PRs |
| **A.8.9** | Configuration management | Infrastructure-as-Code i `vercel.json` + Prisma | Git-history |
| **A.8.10** | Information deletion | Soft-delete 30d + hard-delete | `lib/audit.ts` |
| **A.8.11** | Data masking | PII-felter masked i UI for utilstrækkelige roller | Role-config |
| **A.8.12** | Data leakage prevention | Logging af eksport-handlinger | Audit-log |
| **A.8.13** | Information backup | Neon Point-in-Time Recovery (7 dage) | Neon-config |
| **A.8.14** | Redundancy of information processing facilities | Vercel multi-region + Neon multi-AZ | Arkitektur-diagram |
| **A.8.15** | Logging | AuditLog + Vercel runtime logs | DB + logs |
| **A.8.16** | Monitoring activities | Vercel observability + Datadog (planlagt) | Dashboards |
| **A.8.17** | Clock synchronisation | NTP via datacenter | OS-config |
| **A.8.18** | Use of privileged utility programs | Begrænset til DBA-rolle | Permission-config |
| **A.8.19** | Installation of software on operational systems | Kun via CI/CD-pipeline | Build-process |
| **A.8.20** | Networks security | Vercel WAF + DDoS-protection | Vercel-config |
| **A.8.21** | Security of network services | TLS 1.3 + HSTS preload | TLS-config |
| **A.8.22** | Segregation of networks | Production/staging/dev adskilte env | Vercel-projects |
| **A.8.23** | Web filtering | N/A (vi konsumerer kun trusted APIs) | — |
| **A.8.24** | Use of cryptography | AES-256 + TLS 1.3 + bcrypt + crypto.subtle | Code references |
| **A.8.25** | Secure development lifecycle | SDLC-policy + threat modeling | SDLC-doc |
| **A.8.26** | Application security requirements | OWASP Top 10 checks | Security-review-log |
| **A.8.27** | Secure system architecture and engineering principles | Defense-in-depth + least privilege | Arkitektur-doc |
| **A.8.28** | Secure coding | ESLint + TypeScript strict + Code-reviews | Build-rules |
| **A.8.29** | Security testing in development and acceptance | Unit tests + integration tests + pentest | CI-log |
| **A.8.30** | Outsourced development | Ingen — alt kode in-house | — |
| **A.8.31** | Separation of development, test and production environments | Vercel preview-deployments + prod | Vercel-config |
| **A.8.32** | Change management | Git PR-review + auto-deploy | GitHub-flow |
| **A.8.33** | Test information | Demo-tenant med fiktive data | `prisma/seed-demo.mjs` |
| **A.8.34** | Protection of information systems during audit testing | Audit-access logges + sandbox-miljøer | Audit-policy |

---

## Conformitet-erklæring

CRM-X som platform har **implementeret de tekniske kontroller** der dækker:
- 100% af A.8 (technological) — vores kerneområde
- 100% af A.5 (organizational) — politikker dokumenteret
- 100% af A.6 (people) — HR-processer på plads
- A.7 (physical) — outsourced til certificerede datacentre

**Næste skridt mod fuld ISO 27001-certificering:**
1. Risikovurderings-workshop (Q3 2026)
2. Stage 1 audit (dokumentations-review) (Q4 2026)
3. Stage 2 audit (implementations-test) (Q1 2027)
4. Certificering forventet (Q2 2027)

---

*Mapping reviewet 22. juni 2026. Næste review: december 2026.*
