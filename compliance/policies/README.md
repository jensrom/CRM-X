# Compliance Policies — CRM-X

Disse dokumenter udgør Plesner Techs sikkerheds- og compliance-rammeværk for CRM-X-platformen.

## Status: Templates til udfyldelse

Dokumenterne her er **udkast**. De skal:

1. Læses igennem af Jens (og evt. ekstern rådgiver)
2. Udfyldes med konkrete oplysninger ([DATO], adresser, CVR osv.)
3. Versioneres og dateres
4. Godkendes formelt (underskrift fra ledelsen)
5. Distribueres internt og lagres i et versions-kontrolleret system (Git er fint)
6. Revideres **mindst årligt** eller når der sker væsentlige ændringer

## Filer

| # | Fil | Formål |
|---|---|---|
| 01 | `01-information-security-policy.md` | Overordnet sikkerheds-politik (ledelses-niveau) |
| 02 | `02-incident-response-plan.md` | Procedure ved sikkerheds-hændelser, inkl. GDPR Art. 33-anmeldelse |
| 03 | `03-data-retention-policy.md` | Hvor længe vi gemmer hvad, og hvordan vi sletter |
| 04 | `04-vendor-management-policy.md` | Sub-processor-register og leverandør-due-diligence |
| 05 | `05-ropa-record-of-processing.md` | GDPR Art. 30 — fortegnelse over behandlingsaktiviteter |
| 06 | `06-dpa-template-customer.md` | DPA-skabelon der vedlægges kunde-kontrakter |

## Mangler stadig (skal produceres):

- [ ] Acceptable Use Policy (medarbejder-rettet)
- [ ] Access Control Policy (RBAC-regler, JML-process)
- [ ] Cryptography Policy
- [ ] Backup & Recovery Policy + restore-runbook
- [ ] Change Management Policy
- [ ] DPIA-template
- [ ] Asset Inventory (hvad ejer vi af systemer, hvor er data)
- [ ] Business Continuity Plan

## Anbefalet næste skridt

1. Jens læser igennem og afklarer åbne `[DATO]`/`[Indsæt _______]` felter
2. Beslut om I køber en ISO 27001/SOC 2-konsulent ind til at fuldføre policy-suite (anbefales — ofte 30-50k for fuld pakke)
3. Når policy-pakken er færdig: gennemfør første intern audit
4. Når intern audit er ren: kontakt eksternt revisor for Type I-audit
