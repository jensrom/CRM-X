# NIS2-direktivet — Readiness Statement

> EU 2022/2555 — Network and Information Security Directive (NIS2).
> Trådt i kraft 2024. National implementation pågår.

---

## 1. Er CRM-X i scope?

NIS2 omfatter "important entities" og "essential entities" indenfor 18 sektorer.

Som **SaaS-leverandør til kritisk infrastruktur** (kunder fx i finans, energi, transport) kan vi være **important entity** afhængigt af:

1. Størrelse (>50 ansatte eller >€10M omsætning)
2. Kundeportefølje (om vi leverer til essential entities)

**Vores vurdering pr juni 2026**: Plesner Tech er foreløbig **under tærsklen**, men flere af vores enterprise-kunder kræver NIS2-readiness fra os. Vi opfylder derfor **frivilligt** de tekniske krav i Art. 21.

---

## 2. Art. 21 — Cybersikkerhedsforanstaltninger

NIS2 Art. 21(2) kræver minimum følgende foranstaltninger:

| Pkt | Krav | CRM-X implementering |
|---|---|---|
| **a** | Policies for risikoanalyse og informationssikkerhed | ISMS-policy + årlig risikovurdering |
| **b** | Incident handling | `10_INCIDENT_RESPONSE.md` + 24/7 hotline |
| **c** | Business continuity (backups, DR, crisis management) | Multi-AZ + PITR + RPO=24h/RTO=4h |
| **d** | Supply chain security | Sub-processor vetting + DPA |
| **e** | Security in network and information systems acquisition, development and maintenance | SDLC-policy + secure coding + PR-review |
| **f** | Policies and procedures to assess effectiveness | Quarterly compliance-audit |
| **g** | Basic cyber hygiene + training | Onboarding-curriculum + årlig genopfriskning |
| **h** | Policies for cryptography + encryption | TLS 1.3 + AES-256 + app-level token-encryption |
| **i** | Human resources security + access control + asset management | RBAC + tenant-isolation + access reviews |
| **j** | Multi-factor authentication eller continuous authentication | TOTP via `lib/auth.ts` |

**Dækning: 10/10** — alle punkter implementeret.

---

## 3. Art. 23 — Reporting obligations

NIS2 kræver rapportering ved **significant incidents**:

| Tidspunkt | Hvad | Til hvem |
|---|---|---|
| **Indenfor 24 timer** | Early warning notification | National CSIRT |
| **Indenfor 72 timer** | Incident notification med initial vurdering | National CSIRT |
| **Indenfor 1 måned** | Final report | National CSIRT |

### Vores proces

Vi har en intern "tier 1-2-3"-eskalering:

- **Tier 1**: Lav impact, lokal håndtering, ingen ekstern notifikation
- **Tier 2**: Medium impact, ledelse + DPO informeres, intern postmortem
- **Tier 3**: Significant incident — eskalér til CSIRT indenfor 24t

CSIRT-kontakter:
- **Danmark**: CSIRT.dk via CFCS (https://cfcs.dk)
- **EU-koordination**: ENISA CSIRT Network

---

## 4. Art. 32 — Sanctioner

Maksimum bøde for NIS2-overtrædelse:
- **Essential entity**: 10M EUR eller 2% global omsætning (det højeste)
- **Important entity**: 7M EUR eller 1.4% global omsætning

Plus personligt ansvar for ledelsen (Art. 32(6)) — CEO/CTO kan blive personligt sanktioneret.

---

## 5. Sammenligning med NIS1

| Aspekt | NIS1 (2016/1148) | NIS2 (2022/2555) |
|---|---|---|
| Scope | 7 sektorer | 18 sektorer |
| Entiteter | "Operators of essential services" | Essential + important entities |
| Tærskel | Større operatører | Alle >50 ansatte ELLER >€10M |
| Sanktioner | National rammer | Harmoniserede EU-bøder |
| Supply chain | Begrænset | Eksplicit krav |
| Personligt ansvar | Nej | Ja |

NIS2 er **markant strengere**. Selvom vi p.t. ikke er forpligtet, forbereder vi os.

---

## 6. Roadmap

| Q | Aktivitet |
|---|---|
| Q3 2026 | Formel NIS2-impact-assessment med ekstern rådgiver |
| Q4 2026 | Etabler formel relation til national CSIRT (CFCS) |
| Q1 2027 | Implementer continuous compliance-monitoring tool (fx Vanta) |
| Q2 2027 | Hvis vi krydser tærskel: officiel registrering hos national myndighed |

---

## 7. Hvad kunder bør vide

Hvis du er **essential entity** eller **important entity** under NIS2 og bruger CRM-X:

1. Du skal dokumentere CRM-X som **kritisk leverandør** i din supply chain (Art. 21(2)(d))
2. Du skal **revurdere os årligt** — vi stiller alt nødvendigt materiale til rådighed
3. Vi har **kontraktuel forpligtelse** til at informere dig om significant incidents på vores side indenfor 24 timer
4. Vi støtter dig med dokumentation til **din egen NIS2-rapportering**

Du finder vores breach-notification-template i `10_INCIDENT_RESPONSE.md`.

---

## 8. Reference

- **NIS2-direktivet**: https://eur-lex.europa.eu/eli/dir/2022/2555/oj
- **Dansk implementering**: Lov om foranstaltninger til sikring af et højt fælles cybersikkerhedsniveau (planlagt ikrafttræden 2026)
- **CFCS guidance**: https://cfcs.dk
- **ENISA NIS2 Cooperation Group**: https://www.enisa.europa.eu

---

*Dokument reviewet 22. juni 2026. Næste review efter dansk implementering af NIS2.*
