# Databehandleraftale (DPA) — Plesner Tech som Processor

**Mellem**

- **Dataansvarlig (kunden):** [Kundenavn], CVR [_______]
- **Databehandler (Plesner Tech):** CVR [_______]

**Effektivt fra:** [Dato]
**Gælder så længe** der består et abonnements- eller serviceforhold mellem parterne.

---

## 1. Formål

Denne aftale regulerer Plesner Techs behandling af persondata på vegne af kunden, der bruger CRM-X. Aftalen indgås i overensstemmelse med GDPR Art. 28.

## 2. Definitioner

Termer som "personoplysninger", "behandling", "registrerede" m.fl. har samme betydning som i GDPR.

## 3. Karakteren af behandlingen

| Felt | Værdi |
|---|---|
| **Genstand** | Levering af CRM-tjenester via CRM-X SaaS-platformen |
| **Varighed** | Aftalens løbetid + 90 dage off-boarding |
| **Natur og formål** | Lagring, organisering, søgning, visning, eksport af kundens CRM-data |
| **Kategorier af persondata** | Navne, kontaktoplysninger, kommunikation, evt. licensnøgler — som kunden vælger at indlæse |
| **Kategorier af registrerede** | Kundens kunder, leads, kontakter, egne medarbejdere |
| **Særlige kategorier (Art. 9)** | Ingen — kunden må IKKE indlæse helbreds-, religion-, politiske eller andre særlige kategori-data uden særskilt aftale |

## 4. Databehandlerens forpligtelser

Plesner Tech forpligter sig til at:

1. Behandle persondata **udelukkende efter dokumenteret instruks fra kunden** (denne aftale + kundens brug af platformen).
2. Sikre at personer med adgang har fortrolighedsforpligtelse.
3. Iværksætte tekniske og organisatoriske foranstaltninger der opfylder Art. 32, herunder:
   - Kryptering i transit (TLS 1.2+) og at rest (AES-256)
   - Multi-tenant isolation
   - Adgangskontrol med RBAC
   - Audit logging af alle handlinger i 13 måneder
   - Regelmæssig backup (Neon PITR, 7-30 dage afhængig af plan)
4. Hjælpe kunden med at opfylde anmodninger fra registrerede (Art. 15-22).
5. Hjælpe kunden med at opfylde Art. 32-36 (sikkerhed, hændelser, DPIA).
6. Slette eller returnere alle persondata ved aftalens ophør, jf. punkt 10.
7. Stille al nødvendig information til rådighed for at dokumentere overholdelse.

## 5. Sub-processors

Plesner Tech anvender følgende sub-processors:

- Neon (Databricks) — DB hosting, EU
- Vercel — Application hosting, EU edge
- Resend — Transactional email
- GitHub — Source code
- Anthropic — AI-assisteret udvikling (med data protection)

Kunden giver hermed **generel forhåndsgodkendelse** til disse sub-processors. Plesner Tech vil:

- Vedligeholde en aktuel liste på `/legal/subprocessors`
- Give 14 dages varsel om tilføjelse eller udskiftning
- Give kunden mulighed for at gøre indsigelse og opsige aftalen før ændringen

## 6. Tredje-lands-overførsler

Ved overførsel udenfor EU/EØS anvendes EU Kommisionens **Standard Contractual Clauses** (2021-version) samt supplerende foranstaltninger som krævet efter Schrems II-dommen.

## 7. Brud på persondatasikkerheden

Plesner Tech notificerer kunden **uden ugrundet ophold og senest 24 timer** efter konstatering af brud. Notifikationen indeholder:

- Beskrivelse af bruddet
- Berørte kategorier og antal
- Sandsynlige konsekvenser
- Allerede iværksatte foranstaltninger

Kunden er selv ansvarlig for evt. anmeldelse til Datatilsynet efter Art. 33.

## 8. Audit

Kunden har ret til at:

- Anmode om Plesner Techs seneste SOC 2/ISO 27001-rapport (når tilgængelig) — udleveres med fortrolighedsforpligtelse
- Gennemføre audit (egen eller godkendt revisor) med 30 dages varsel, højst 1 gang årligt, mod betaling af rimelige omkostninger
- Stille spørgsmål skriftligt og forvente svar inden 15 arbejdsdage

## 9. Bistand til kunden

| Anmodning | Frist |
|---|---|
| Eksport af kundens data (Art. 20) | Inden 7 dage via selvbetjenings-funktion |
| Sletning (Art. 17) | Inden 7 dage |
| Berigtigelse (Art. 16) | Inden 7 dage |
| Information til DPIA (Art. 35) | Inden 30 dage |

## 10. Aftalens ophør

Ved aftalens ophør:

1. **Dag 0** — adgang suspenderes for nye operationer; læseadgang bevares
2. **Dag 0-30** — kunden eksporterer alle data via Compliance-portalen
3. **Dag 30** — kundens data flyttes til soft-deleted state
4. **Dag 90** — alle kundens persondata slettes endegyldigt
5. Sletnings-certifikat udstedes på anmodning

Undtagelse: data omfattet af lovkrav (bogføringsloven m.fl.) bevares i isoleret arkiv i den lovbestemte periode.

## 11. Ændringer

Ændringer kræver skriftlig accept af begge parter, dog kan opdateret sub-processor-liste tilføjes ensidigt efter punkt 5.

## 12. Lovvalg og værneting

Dansk ret. Værneting er [Plesner Techs hjemting].

---

**For Kunden** (dataansvarlig)

Navn: _______________________
Titel: _______________________
Dato: _______________________
Underskrift: _______________________

**For Plesner Tech** (databehandler)

Navn: Jens Plesner
Titel: CEO
Dato: _______________________
Underskrift: _______________________
