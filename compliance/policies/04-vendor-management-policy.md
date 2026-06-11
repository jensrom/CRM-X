# Vendor Management Policy & Sub-processor Register

**Version:** 1.0
**Ikrafttræden:** [Udfyld dato]
**Ejer:** Jens Plesner

---

## 1. Formål

Definerer hvordan tredjepartsleverandører vurderes, godkendes og overvåges når de behandler persondata på vegne af Plesner Tech (GDPR Art. 28).

## 2. Vurderingskriterier ved ny leverandør

Før indgåelse af aftale:

- [ ] Data-behandling vurderes (kategori, omfang, hyppighed)
- [ ] DPIA gennemføres ved høj-risiko (Art. 35)
- [ ] DPA underskrives (Standard Contractual Clauses ved tredje-lands-overførsel)
- [ ] Sub-processoren skal levere SOC 2 Type II, ISO 27001 eller tilsvarende
- [ ] Data residency vurderes (EU-præference for kunde-data)
- [ ] Exit-strategi defineres (data-eksport ved opsigelse)

## 3. Sub-processor-register

Følgende er aktive sub-processors for CRM-X:

| Leverandør | Funktion | Data-kategorier | Lokation | Certificeringer | DPA-status |
|---|---|---|---|---|---|
| **Neon (Databricks)** | PostgreSQL hosting | Alle tenant-data | EU (Frankfurt) | SOC 2 Type II, ISO 27001 | [Bekræft + dato] |
| **Vercel** | Application hosting + CDN | App-trafik, build-artefakter | EU + global edge | SOC 2 Type II, ISO 27001, HIPAA | [Bekræft + dato] |
| **Resend** | Transactional email | Recipient email, indhold | EU/US | SOC 2 Type II | [Bekræft + dato] |
| **GitHub (Microsoft)** | Source code | Kildekode (ikke produktionsdata) | US | SOC 2 Type II, ISO 27001, FedRAMP | [Standard MSA] |
| **Anthropic (Claude)** | AI-assisteret udvikling | Kildekode i prompts | US | SOC 2 Type II | Enterprise data protection |

> **Forpligtelse til kunder:** Listen er bindende. Nye sub-processors annonceres med 14 dages varsel via `/legal/subprocessors`. Kunder kan gøre indsigelse og opsige aftalen før ændringen træder i kraft.

## 4. Tredje-lands-overførsler

Sub-processors udenfor EU/EØS kræver:

- **Standard Contractual Clauses (SCC)** — EU Kommisionens 2021-version
- **Transfer Impact Assessment (TIA)** — vurdering af modtagerlandets lovgivning (særligt USA: FISA 702, EO 12333)
- **Supplerende foranstaltninger** ved behov — kryptering med Plesner-controlled keys

## 5. Løbende monitorering

- **Årlig review** af alle aktive sub-processors
- **Tjek af deres seneste SOC 2-rapport** når den er tilgængelig
- **Hændelses-notifikation** — vi forventer at blive informeret om brud hos sub-processor inden 24 timer
- **Status-monitorering** — vi abonnerer på status-sider hvor det giver mening

## 6. Off-boarding af sub-processor

Ved opsigelse:

1. Bekræft data-eksport eller migration
2. Anmod om data-deletion-certifikat
3. Opdater sub-processor-listen offentligt
4. Notificer berørte kunder
5. Arkivér DPA + relevant korrespondance

## 7. Revisionshistorik

| Version | Dato | Forfatter | Ændring |
|---|---|---|---|
| 1.0 | [DATO] | Jens Plesner | Initial version |
