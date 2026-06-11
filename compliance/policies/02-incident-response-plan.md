# Incident Response Plan

**Version:** 1.0
**Ikrafttræden:** [Udfyld dato]
**Ejer:** Jens Plesner

---

## 1. Formål

Definerer processen for opdagelse, håndtering, kommunikation og læring af sikkerhedshændelser i CRM-X. Understøtter GDPR Art. 33 (72-timers anmeldelse til Datatilsynet) og Art. 34 (kommunikation til registrerede).

## 2. Hændelses-klassifikation

| Severity | Definition | Eksempler | Respons-tid |
|---|---|---|---|
| **P0 — Kritisk** | Aktivt databrud, fuld nedetid, betalingsstop | DB kompromitteret, ransomware, alle tenants nede | < 15 min |
| **P1 — Høj** | Partial outage, mistanke om databrud, kritisk sårbarhed | Én tenant nede, RCE-sårbarhed opdaget | < 1 time |
| **P2 — Mellem** | Funktionalitet nedsat, ingen data-eksponering | Login fejler for nogle brugere, sub-processor nede | < 4 timer |
| **P3 — Lav** | Mindre fejl eller bekymring | Cosmetic bugs, lav-risiko sårbarheds-rapport | < 1 arbejdsdag |

## 3. Faser

### 3.1 Detektion
Kanaler hvor hændelser opdages:

- Monitoring/alarmer (Vercel, Neon, Sentry)
- Kunde-rapportering via support
- Medarbejder-observation
- Bug bounty / responsible disclosure
- Sub-processor-notifikation

### 3.2 Triage (første 30 minutter)

1. **Bekræft hændelsen** — er det reelt eller falsk alarm?
2. **Klassificer severity** — P0-P3
3. **Aktiver respons-team** — [Liste over kontakter, telefon-numre]
4. **Etabler kommunikations-kanal** — dedikeret Slack-channel: `#incident-YYYYMMDD-shortname`
5. **Udnævn Incident Commander** — én person der koordinerer

### 3.3 Inddæmning

| Hændelse | Inddæmning |
|---|---|
| Kompromitterede credentials | Roter password, invalider alle sessions, audit log-review |
| Aktiv exploit | Tag tjeneste offline om nødvendigt, roll-back, deploy hotfix |
| Data-eksfiltration | Bloker outbound, fryselsmodus, kontakt Neon for query-logs |
| Sub-processor-brud | Følg deres anbefaling, vurder vores eksponering |

### 3.4 Udryddelse

- Find root cause via logs, audit-trail
- Patch sårbarhed eller fjern angrebsfod
- Verificer at angrebet ikke har persisterende baghoveder

### 3.5 Genopretning

- Genstart tjenester
- Verificer integritet (audit log + data-sammenligning)
- Gradvis fuld trafik

### 3.6 Notifikation

**Til Datatilsynet (GDPR Art. 33):**
- **Tidsfrist:** 72 timer fra opdagelse
- **Form:** datatilsynet.dk → digital anmeldelse
- **Indhold:** beskrivelse af brud, antal berørte, kategori af data, sandsynlige konsekvenser, allerede iværksatte foranstaltninger
- **Hvornår:** ved brud der "sandsynligvis indebærer en risiko for fysiske personers rettigheder og friheder"
- **Ikke nødvendigt:** hvis bruddet er usandsynligt at give risiko

**Til registrerede (GDPR Art. 34):**
- **Hvornår:** brud der "sandsynligvis vil indebære en høj risiko"
- **Hvordan:** direkte kommunikation til berørte personer
- **Indhold:** klart sprog, beskrivelse, kontakt-info, foranstaltninger

**Til kunder (kontraktuelt):**
- Inden 24 timer hvis tenant er berørt
- Status-updates min. dagligt indtil løsning

### 3.7 Post-mortem

- Inden 5 arbejdsdage fra løsning
- Blameless post-mortem
- Dokumentér: tidslinje, root cause, hvad gik godt, hvad gik dårligt, action items
- Action items i [issue tracker] med ejer og deadline

## 4. Kontakter

| Rolle | Navn | Telefon | E-mail |
|---|---|---|---|
| Incident Commander (primær) | [Jens Plesner] | [Tlf] | jens@plesnertech.dk |
| Incident Commander (backup) | [Udpeges] | | |
| Sub-processor: Neon | Support | | support@neon.tech |
| Sub-processor: Vercel | Support | | https://vercel.com/help |
| Sub-processor: Resend | Support | | support@resend.com |
| Datatilsynet | | +45 33 19 32 00 | dt@datatilsynet.dk |
| Politiet (cyber) | | 114 | |

## 5. Træning og test

- Tabletop-øvelse minimum årligt
- Genopretningstest (restore fra backup) halvårligt
- Nye medarbejdere onboardet i denne plan inden første uge

## 6. Revisionshistorik

| Version | Dato | Forfatter | Ændring |
|---|---|---|---|
| 1.0 | [DATO] | Jens Plesner | Initial version |
