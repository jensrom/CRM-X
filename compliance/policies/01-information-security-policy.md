# Information Security Policy

**Virksomhed:** Plesner Tech (plesnertech.dk) — udbyder af CRM-X
**Version:** 1.0
**Ikrafttræden:** [Udfyld dato]
**Senest revideret:** [Udfyld dato]
**Ejer:** Jens Plesner, CEO/CTO
**Godkendt af:** [Navn, dato, underskrift]

---

## 1. Formål

Denne politik etablerer rammerne for informationssikkerhed i Plesner Tech og dækker udvikling, drift og leverance af CRM-X-platformen. Politikken understøtter overholdelse af GDPR, ISO 27001 og SOC 2.

## 2. Anvendelsesområde

Politikken gælder for:

- Alle medarbejdere, freelancere og konsulenter
- Alle systemer, applikationer og infrastruktur Plesner Tech kontrollerer
- Alle data behandlet af eller i CRM-X
- Sub-processors via formelle DPA-aftaler

## 3. Ledelsens commitment

Plesner Techs ledelse forpligter sig til:

- At sikre fortrolighed, integritet og tilgængelighed af kunde- og virksomhedsdata
- At afsætte ressourcer til implementering og vedligehold af sikkerhedskontroller
- Løbende forbedring gennem risiko-vurderinger, audits og hændelseslæring
- Overholdelse af gældende lovgivning og kontraktuelle forpligtelser

## 4. Sikkerhedsmål

| Område | Mål |
|---|---|
| Fortrolighed | Ingen uautoriseret adgang til kunde-data |
| Integritet | Data ændres kun af autoriserede brugere, alle ændringer kan spores |
| Tilgængelighed | 99,5% oppetid for produktion (mål, ikke SLA) |
| Compliance | Fuld overholdelse af GDPR; forberedelse på ISO 27001 + SOC 2-audit |

## 5. Roller og ansvar

| Rolle | Ansvar |
|---|---|
| CEO/CTO | Endeligt ansvar for sikkerhed, godkender politikker, ressourceallokering |
| Data Protection Officer (DPO) | [Udpeges hvis kerneaktivitet eller >250 ansatte. P.t. ikke krævet] |
| Udviklere | Sikker kodning, peer review, sårbarhedsrettelser |
| Alle medarbejdere | Følge politikker, rapportere hændelser, gennemføre sikkerhedstræning |

## 6. Centrale principper

- **Least privilege** — brugere får kun adgang til det de skal bruge
- **Defense in depth** — flere sikkerhedslag (auth, netværk, app, data)
- **Secure by default** — nye features starter med strengeste indstilling
- **Privacy by design** — persondata-beskyttelse indtænkes fra design-fase
- **Zero trust** — ingen implicit tillid baseret på netværksposition

## 7. Politik-katalog

Denne overordnede politik suppleres af:

1. Acceptable Use Policy
2. Access Control Policy
3. Cryptography Policy
4. Backup & Recovery Policy
5. Incident Response Plan
6. Vendor Management Policy
7. Data Retention & Deletion Policy
8. Change Management Policy
9. Risk Assessment / ROPA
10. DPIA-template
11. DPA-template (Plesner Tech som Processor)

## 8. Compliance og kontrol

- Politikkerne gennemgås minimum årligt eller ved væsentlige ændringer
- Risiko-vurdering opdateres minimum årligt
- Intern audit kvartalsvis
- Ekstern audit årligt (når SOC 2/ISO 27001 er aktive)
- Sikkerhedstræning af alle medarbejdere ved onboarding + årligt

## 9. Brud på politik

Brud kan resultere i:

- Mundtlig/skriftlig advarsel
- Disciplinære sanktioner
- Opsigelse
- Civil- eller strafferetslig forfølgelse ved alvorlige overtrædelser

## 10. Revisionshistorik

| Version | Dato | Forfatter | Ændring |
|---|---|---|---|
| 1.0 | [DATO] | Jens Plesner | Initial version |
