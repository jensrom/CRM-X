# Data Retention & Deletion Policy

**Version:** 1.0
**Ikrafttræden:** [Udfyld dato]
**Ejer:** Jens Plesner

---

## 1. Formål

Definerer hvor længe forskellige datakategorier opbevares i CRM-X, og hvordan sletning sker. Understøtter GDPR Art. 5(1)(e) (opbevaringsbegrænsning).

## 2. Princip

Data opbevares **kun så længe formålet kræver det**. Når formålet ophører, anonymiseres eller slettes data inden for de tidsrammer der er defineret nedenfor.

## 3. Retention-skema

### 3.1 Kunde-data (tenant-data)

| Datakategori | Opbevaringsperiode | Begrundelse | Slettelogik |
|---|---|---|---|
| Aktive firma-records | Indtil tenant slettes | Drift af CRM | Cascade ved tenant-deletion |
| Aktive kontakter | Indtil sletning af tenant eller subjekt-anmodning | Drift af CRM | Cascade |
| Soft-deleted kontakter | 30 dage | "Regret"-vindue + audit-spor | `purgeAnonymizedContacts()` cron |
| Tickets | Indtil tenant slettes eller 7 år (regnskabs-relevans) | Drift + bogføringsloven | Manuel pr. tenant |
| Tidsregistreringer | 7 år | Bogføringsloven §10 | Manuel pr. tenant |
| Fakturaer | 5 år (10 år ved fast ejendom) | Bogføringsloven §10 | Manuel pr. tenant |
| Filer (licenser, vedhæftninger) | Som tilknyttet objekt | — | Cascade |

### 3.2 Bruger-data (Plesner Techs medarbejdere + tenant-brugere)

| Datakategori | Opbevaringsperiode | Begrundelse |
|---|---|---|
| Aktiv bruger-konto | Indtil deaktivering | Adgang |
| Deaktiveret bruger | 12 måneder, derefter anonymiseres | Audit-spor + lønregnskab |
| Login-historik | 13 måneder | Sikkerheds-monitoring |

### 3.3 Sikkerhed og compliance

| Datakategori | Opbevaringsperiode | Begrundelse |
|---|---|---|
| Audit logs | 13 måneder (mål: 24 mdr.) | SOC 2 + ISO 27001 + forensics |
| Backup (Neon PITR) | 7 dage (starter), 30 dage (pro) | Disaster recovery |
| Failed login attempts | 13 måneder | Brute-force detektion |
| GDPR-anmodninger (eksport, sletning) | 5 år | Dokumentation af lovlig behandling |

### 3.4 Marketing & samtykke

| Datakategori | Opbevaringsperiode | Begrundelse |
|---|---|---|
| Cookie-samtykke | 12 måneder (re-prompt) | ePrivacy |
| Nyhedsbrev-abonnement | Indtil afmelding | Samtykke |
| Lead-data uden konvertering | 24 måneder | Salgs-pipeline |

## 4. Sletningsmetoder

- **Soft delete** — `isActive = false` + PII anonymiseres. Bevarer relationelle forbindelser.
- **Hard delete** — DB-row fjernes. Triggered af cron eller manuel admin-handling.
- **Anonymisering** — overskriver PII-felter med pseudonymer mens record bevares.

## 5. Tenant-offboarding

Når en kunde-tenant opsiger:

1. **Dag 0** — tenant suspenderes (læs-adgang for kunden til export).
2. **Dag 0-30** — kunden kan eksportere alle data via Compliance-portal.
3. **Dag 30** — tenant flyttes til soft-deleted state.
4. **Dag 90** — hard delete af tenant og alle relaterede records.
5. **Undtagelse** — data der falder under bogføringslovens 5/7/10-årskrav opbevares i et separat, isoleret arkiv.

## 6. Lovbestemte undtagelser

Data kan opbevares længere end ovenfor hvis:

- **Bogføringsloven** — fakturaer, regnskabsmateriale (5 år, 10 år for fast ejendom)
- **Aftaleloven** — kontrakter (forældelse efter 3-10 år)
- **Verserende sag** — data omfattet af legal hold
- **Datatilsynet eller domstol** — pålagt at opbevare

## 7. Kontrol og audit

- Retention-jobs logges i audit-log
- Kvartalsvis stikprøve-kontrol af om sletninger sker som planlagt
- Årlig review af retention-perioder mod ændret lovgivning

## 8. Revisionshistorik

| Version | Dato | Forfatter | Ændring |
|---|---|---|---|
| 1.0 | [DATO] | Jens Plesner | Initial version |
