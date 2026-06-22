# Data Processing Agreement (DPA)

> Standard databehandleraftale mellem Plesner Tech (databehandler) og Kunden (dataansvarlig).
> Underskrives **før** produktion-brug af CRM-X.
> Compliant med GDPR Art. 28 + EU Standard Contractual Clauses 2021/914.

---

## DATABEHANDLERAFTALE

**vedrørende behandling af persondata**

mellem

**Plesner Tech ApS**
CVR-nr [XX]
[Adresse]
DK-[postnr] [by]
("Databehandleren")

og

**[KUNDENS NAVN]**
CVR-nr [XX]
[Adresse]
[Postnr] [by]
("Den Dataansvarlige")

(tilsammen "Parterne")

---

## 1. Baggrund og formål

1.1 Den Dataansvarlige har indgået aftale med Databehandleren om brug af CRM-X-platformen ("Hovedaftalen").

1.2 Som led i levering af Hovedaftalen behandler Databehandleren persondata på vegne af Den Dataansvarlige.

1.3 Denne Databehandleraftale fastlægger Parternes forpligtelser i henhold til GDPR Art. 28.

---

## 2. Definitioner

Termer skrevet med stort har samme betydning som i GDPR (EU 2016/679).

- **Persondata**: enhver oplysning om en identificeret eller identificerbar fysisk person
- **Behandling**: enhver operation udført på persondata
- **Den Registrerede**: den fysiske person hvis persondata behandles
- **Sub-databehandler**: tredjepart der behandler persondata på vegne af Databehandleren

---

## 3. Behandlingens art og formål

3.1 **Formål**: Levering af CRM-X-platformen (kunde-, salgs-, projekt- og support-administration).

3.2 **Behandlingens art**:
- Indsamling
- Lagring
- Strukturering
- Anvendelse
- Videregivelse til sub-databehandlere (jf. punkt 8)
- Sletning

3.3 **Typer af persondata**:
- Identifikationsoplysninger (navn, e-mail, telefon, titel)
- Erhvervsmæssige oplysninger (arbejdsplads, stillingsbetegnelse)
- Tekniske oplysninger (IP-adresse, browser, log-data)
- Indhold som Den Dataansvarlige indtaster (kunde-noter, ticket-beskrivelser, kommentarer)
- Faktura- og betalingsoplysninger

3.4 **Kategorier af registrerede**:
- Den Dataansvarliges medarbejdere (brugere af platformen)
- Den Dataansvarliges kunder og kontakter
- Den Dataansvarliges samarbejdspartnere

3.5 **Behandlingen omfatter ikke** særlige kategorier af persondata (Art. 9) eller persondata om straffedomme (Art. 10), medmindre Den Dataansvarlige aktivt indtaster dem (Databehandleren har ingen tekniske begrænsninger her).

---

## 4. Databehandlerens forpligtelser

4.1 **Instrukstilknytning**: Databehandleren må kun behandle persondata efter dokumenteret instruks fra Den Dataansvarlige. Denne Databehandleraftale udgør den primære instruks.

4.2 **Konfidentialitet**: Databehandleren sikrer at personer der har adgang til persondata er underlagt tavshedspligt.

4.3 **Tekniske og organisatoriske foranstaltninger** (Art. 32):
- Kryptering in transit (TLS 1.3) og at rest (AES-256)
- Multi-faktor autentificering for administratorer
- Multi-tenant data-isolation
- Audit-logging af alle handlinger
- Multi-AZ backups med Point-in-Time-Recovery
- Årlig ekstern penetrationstest
- Yderligere detaljer: `02_ISO_27001_MAPPING.md`

4.4 **Bistand til Den Dataansvarlige**: Databehandleren stiller relevante tekniske og organisatoriske foranstaltninger til rådighed til:
- Opfyldelse af de Registreredes rettigheder (Art. 12-22)
- Anmeldelse af sikkerhedsbrud (Art. 33-34)
- DPIA og forudgående høring (Art. 35-36)
- Sikring af behandlingen (Art. 32)

4.5 **Slet eller returner**: Ved Hovedaftalens ophør sletter eller returnerer Databehandleren al persondata efter Den Dataansvarliges valg, inkl. eksisterende kopier. Sletning sker indenfor 30 dage, medmindre EU eller national lovgivning kræver opbevaring.

4.6 **Audit-ret**: Den Dataansvarlige har ret til at gennemføre audits og inspektioner, hvilket Databehandleren bistår med. Audit kan udføres af Den Dataansvarlige eller en uafhængig tredjepart godkendt af Databehandleren. Hyppighed: max 1 gang årligt, medmindre der er begrundet mistanke om brud.

---

## 5. Den Dataansvarliges forpligtelser

5.1 Den Dataansvarlige sikrer at behandlingen har et lovligt retsgrundlag (Art. 6).

5.2 Den Dataansvarlige informerer de Registrerede om behandlingen via egen privacy notice.

5.3 Den Dataansvarlige sikrer at de instrukser der gives til Databehandleren er i overensstemmelse med GDPR.

5.4 Den Dataansvarlige er ansvarlig for at klassificere og minimere persondata der indtastes i platformen.

---

## 6. Tekniske og organisatoriske foranstaltninger

Detaljeret beskrivelse findes i Bilag A.

Sammenfattet:
- **Adgangskontrol**: RBAC + MFA + session-timeout
- **Logning**: Audit-log af alle CRUD + login-events
- **Kryptering**: TLS 1.3 + AES-256
- **Backup**: PITR 7 dage + multi-AZ
- **Sletning**: Soft-delete 30 dage + hard-delete med crypto-shredding
- **Test**: Årlig pentest + quarterly internt review

---

## 7. Brud på persondatasikkerheden

7.1 Databehandleren underretter Den Dataansvarlige **uden ugrundet ophold** og senest **24 timer** efter opdagelse af brud.

7.2 Underretningen skal indeholde:
- Beskrivelse af bruddets karakter
- Kategorier og omtrentligt antal berørte Registrerede
- Kategorier og omtrentligt antal berørte poster af persondata
- Sandsynlige konsekvenser
- Iværksatte eller foreslåede foranstaltninger
- Kontaktoplysninger til DPO

7.3 Den Dataansvarlige er ansvarlig for at anmelde brud til Tilsynsmyndigheden indenfor 72 timer (Art. 33) og evt. de Registrerede (Art. 34).

7.4 Yderligere detaljer i `10_INCIDENT_RESPONSE.md`.

---

## 8. Anvendelse af sub-databehandlere

8.1 Databehandleren anvender sub-databehandlere som angivet i Bilag B (`09_SUB_PROCESSORS.md`).

8.2 Databehandleren sikrer at sub-databehandlere underlægges samme forpligtelser som denne aftale via skriftlig kontrakt.

8.3 **Tilføjelse eller udskiftning af sub-databehandlere**:
- Databehandleren giver mindst **30 dages forudgående skriftligt varsel** via e-mail til Den Dataansvarliges DPO/admin
- Den Dataansvarlige kan gøre **indsigelse** indenfor varslet
- Ved indsigelse forhandler Parterne en løsning; hvis ingen enighed kan Den Dataansvarlige opsige Hovedaftalen med varsel

8.4 Databehandleren forbliver ansvarlig over for Den Dataansvarlige for sub-databehandlernes overholdelse.

---

## 9. Internationale overførsler

9.1 Persondata behandles primært i **EU/EØS** (Frankfurt-region).

9.2 Hvor overførsel til tredjeland sker (fx Stripe USA), anvender Databehandleren:
- **EU Standard Contractual Clauses (SCC) 2021/914**
- **Yderligere foranstaltninger** efter Schrems II (kryptering, pseudonymisering, audit-rights)
- **Adequacy-beslutninger** hvor relevante (fx EU-US Data Privacy Framework)

9.3 Detaljeret oversigt i Bilag B.

---

## 10. Ikrafttræden og varighed

10.1 Denne Databehandleraftale træder i kraft samtidigt med Hovedaftalen.

10.2 Aftalen varer så længe Hovedaftalen er i kraft og 30 dage derefter (sletteperioden).

10.3 Sletning udføres senest 30 dage efter Hovedaftalens ophør, medmindre lovgivning kræver opbevaring (fx regnskabsloven 5 år).

---

## 11. Ansvar og misligholdelse

11.1 Hver Part er ansvarlig for skader påført den anden Part som følge af misligholdelse af denne Aftale.

11.2 Erstatningsansvaret er begrænset til **direkte tab** og maksimalt **det fakturerede beløb i de seneste 12 måneder** under Hovedaftalen.

11.3 Begrænsningen gælder ikke ved grov uagtsomhed eller forsæt.

---

## 12. Tvister og lovvalg

12.1 Aftalen er underlagt **dansk ret**.

12.2 Tvister afgøres ved **Københavns Byret** som første instans.

---

## 13. Ændringer

Ændringer skal være skriftlige og underskrevet af begge Parter.

---

## 14. Underskrifter

**For Plesner Tech ApS**

Dato: _________________

Navn: _________________

Stilling: _________________

Underskrift: _________________

---

**For [KUNDENS NAVN]**

Dato: _________________

Navn: _________________

Stilling: _________________

Underskrift: _________________

---

## Bilag A — Tekniske og organisatoriske foranstaltninger

Se `02_ISO_27001_MAPPING.md`.

## Bilag B — Sub-databehandlere

Se `09_SUB_PROCESSORS.md`.

## Bilag C — Beskrivelse af behandlingsaktiviteter

Se Records of Processing i `04_GDPR_COMPLIANCE.md` punkt 2.

---

*Template version 1.2 — 22. juni 2026. Næste review: december 2026.*
