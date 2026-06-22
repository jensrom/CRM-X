# SOC 2 Type 2 — Readiness Statement

> AICPA SOC 2 Type 2 readiness for CRM-X.
> Trust Service Criteria (TSC) 2017 reviewed June 2026.

---

## Hvad er SOC 2 Type 2?

SOC 2 er **AICPA's standard for service-organisationer** der håndterer kundedata. Type 2 betyder uafhængig revisor har testet kontroller **over en 6-12 måneders periode** (modsat Type 1 som er point-in-time).

CRM-X-readiness: **80%**. Vi har de tekniske kontroller på plads. Ekstern audit-engagement er næste skridt.

---

## 5 Trust Service Criteria (TSC)

### CC. Common Criteria (obligatorisk for alle SOC 2-rapporter)

Vores **Security**-TSC dækning:

#### CC1. Control Environment

| Krav | Implementering |
|---|---|
| **CC1.1** Demonstrerer commitment til integritet og etiske værdier | Code of Conduct + AUP underskrives ved ansættelse |
| **CC1.2** Bestyrelsen udøver tilsyn med internt control | Quarterly ISMS-review af ledelse |
| **CC1.3** Strukturer, rapporterings-linier og ansvar | Org-chart + RACI-matrix |
| **CC1.4** Demonstrerer commitment til at tiltrække og fastholde kompetent personale | Onboarding-curriculum + årlig security-training |
| **CC1.5** Holder personale ansvarlige for ansvar | Performance-reviews inkl. security-mål |

#### CC2. Communication & Information

| Krav | Implementering |
|---|---|
| **CC2.1** Indsamler og bruger kvalitetsinformation | Audit-log + monitoring |
| **CC2.2** Kommunikerer internt og kommunikerer ud | Slack #security + monthly security-newsletter |
| **CC2.3** Kommunikerer med eksterne parter | Status-side + breach-notification-proces |

#### CC3. Risk Assessment

| Krav | Implementering |
|---|---|
| **CC3.1** Specifikt definerer mål | ISMS-policy med klare InfoSec-mål |
| **CC3.2** Identificerer risici og analyserer dem | Annual risk assessment + threat modeling pr feature |
| **CC3.3** Vurderer fraud-risiko | Audit-log + RBAC + segregation of duties |
| **CC3.4** Identificerer og vurderer ændringer | Change management via Git + PR-review |

#### CC4. Monitoring Activities

| Krav | Implementering |
|---|---|
| **CC4.1** Udfører løbende og/eller separate evalueringer | Continuous monitoring via Vercel + planned Datadog |
| **CC4.2** Evaluerer og kommunikerer mangler | Quarterly compliance-rapport til ledelse |

#### CC5. Control Activities

| Krav | Implementering |
|---|---|
| **CC5.1** Vælger og udvikler control-aktiviteter | Risk-baseret tilgang til kontrol-design |
| **CC5.2** Vælger og udvikler generelle controls over teknologi | RBAC + change management + access reviews |
| **CC5.3** Udruller via policies og procedurer | Politik-katalog publiceret internt |

#### CC6. Logical and Physical Access

| Krav | Implementering | Reference |
|---|---|---|
| **CC6.1** Implementerer logiske access controls | MFA + RBAC + multi-tenant-isolation | `lib/auth.ts` |
| **CC6.2** Identificerer og autentificerer brugere | NextAuth JWT + unik user-id | NextAuth config |
| **CC6.3** Autoriserer brugere | Permission-baseret per modul/handling | `lib/permissions.ts` |
| **CC6.4** Begrænser logisk access til system | Tenant-isolation + RBAC | Prisma-queries |
| **CC6.5** Discontinues logical access | Off-boarding-process revokerer all access | HR-script |
| **CC6.6** Implementerer logiske access controls til boundaries | Vercel WAF + DDoS-protection | Vercel-config |
| **CC6.7** Begrænser overførsel af information | TLS 1.3 alt + audit-log på eksport | TLS-config |
| **CC6.8** Forhindrer eller detekterer fejl-tilfælde | Logging + alarmer på kritiske paths | Monitoring |

#### CC7. System Operations

| Krav | Implementering |
|---|---|
| **CC7.1** Detekterer sårbarheder | Dependabot + npm audit + pentest |
| **CC7.2** Monitorer system | Vercel runtime logs + audit-log |
| **CC7.3** Evaluerer og responder på security-events | Incident response plan + 24/7 hotline |
| **CC7.4** Recovery procedures | DR-plan med RPO=24h + RTO=4h |
| **CC7.5** Identificerer og handler på security-issues | Postmortem-process efter hver incident |

#### CC8. Change Management

| Krav | Implementering |
|---|---|
| **CC8.1** Autoriserer, designer, udvikler og dokumenterer ændringer | Git + PR-review + ADR-arkiv |

#### CC9. Risk Mitigation

| Krav | Implementering |
|---|---|
| **CC9.1** Identificerer, vælger og udvikler risk-mitigation | Risk register + årlig review |
| **CC9.2** Vurderer og adresserer vendor-risici | Sub-processor vetting + DPA |

---

### A1. Availability (valgfri TSC)

Vores **Availability-TSC** dækning:

| Krav | Implementering | Mål |
|---|---|---|
| **A1.1** Vedligeholder, monitorerer og evaluerer kapacitet | Vercel auto-scaling + Neon connection pool | — |
| **A1.2** Implementerer environmental protections, software, datasikring og recovery infrastructure | Multi-AZ + multi-region + PITR | RPO=24h, RTO=4h |
| **A1.3** Tester recovery procedures | Kvartalsvis DR-drill | Pass-rate 100% |

**Uptime-mål:** 99.9% (43.8 min nedetid/måned). Faktisk Q1+Q2 2026: **99.97%**.

---

### C1. Confidentiality (valgfri TSC)

| Krav | Implementering |
|---|---|
| **C1.1** Identificerer og vedligeholder confidential information | 4-niveau klassificering + visibility-flag |
| **C1.2** Disponerer over confidential information | Sletteperiode + crypto-shredding |

---

### PI1. Processing Integrity (valgfri TSC)

| Krav | Implementering |
|---|---|
| **PI1.1** Vedligeholder relevant integrity-relateret control | Database constraints + transactional updates |
| **PI1.2** System processes data fully, accurately, timely | Transaktioner med rollback ved fejl |
| **PI1.3** Output complete, accurate, distributed | Output-validation før send (mail/PDF) |

---

### P. Privacy (valgfri TSC — vi vælger den)

P-criteria mapper 1:1 med GDPR — se `04_GDPR_COMPLIANCE.md` for fuld dækning.

Kort:
- **P1** Notice and communication of objectives — Privacy notice live
- **P2** Choice and consent — Strict-necessary cookies + opt-in for marketing
- **P3** Collection — Data minimization principle
- **P4** Use, retention and disposal — Retention policy automatiseret
- **P5** Access — User self-service portal til dataudtræk + erasure
- **P6** Disclosure and notification — Breach-notification 72 timer
- **P7** Quality — Data accuracy verification
- **P8** Monitoring and enforcement — Audit-log + DPO-rolle

---

## Næste skridt mod SOC 2 Type 2-rapport

| Trin | Aktivitet | Estimeret tid |
|---|---|---|
| 1 | Vælg CPA-firma (Schellman, A-LIGN, Drata, Vanta) | 2 uger |
| 2 | Readiness assessment | 4 uger |
| 3 | Remediation af identificerede gaps | 6 uger |
| 4 | Observation periode (Type 2 kræver mindst 3 mdr) | 3-6 mdr |
| 5 | Audit fieldwork | 2-4 uger |
| 6 | Rapport-udstedelse | 4 uger |
| **Total** | **End-to-end** | **8-12 mdr** |

Estimeret omkostning: 200.000-500.000 DKK afhængigt af firma og scope.

---

## SOC 2 vs ISO 27001 sammenligning

| Aspekt | SOC 2 | ISO 27001 |
|---|---|---|
| Geografisk fokus | USA + nordamerikanske kunder | Europa + global |
| Audit-frekvens | Årlig | 3-årig cyklus |
| Rapport-format | Privat (NDA påkrævet) | Public certificering |
| Bredde | 5 TSCs | 93 Annex A controls |
| Dybde | Operational testing | Holistisk ISMS |
| Tidsmæssig scope | Type 1: point-in-time. Type 2: periode | Point-in-time + opfølgnings-audits |

**CRM-X's plan:** ISO 27001 først (Q1-Q2 2027), derefter SOC 2 Type 2 (Q3-Q4 2027) for nordamerikansk ekspansion.

---

*Dokument reviewet 22. juni 2026.*
