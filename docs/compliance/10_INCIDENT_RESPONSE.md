# Incident Response Plan

> CRM-X's procedure for håndtering af security incidents og data breaches.
> Compatible med GDPR Art. 33-34, NIS2 Art. 23, ISO 27001 A.5.24-27.

---

## 1. Definitioner

| Term | Betydning |
|---|---|
| **Incident** | Enhver hændelse der kan kompromittere fortrolighed, integritet eller tilgængelighed af data eller systemer |
| **Data Breach** | Et incident der involverer uautoriseret adgang til persondata (GDPR Art. 4(12)) |
| **Significant Incident** | Et incident der opfylder NIS2-tærsklen for rapportering til CSIRT |
| **Postmortem** | Blameless analyse efter incident er afsluttet |

---

## 2. Severity-klassificering

| Tier | Severity | Eksempel | MTTR-mål | Eskalering |
|---|---|---|---|---|
| **P0** | Kritisk | Aktiv data breach, fuldt prod-nedbrud, kortdata-eksponering | < 1 time | CEO + CTO + DPO + jurister |
| **P1** | Høj | Single-tenant data-eksponering, MFA bypass, kritisk sårbarhed in-the-wild | < 4 timer | CTO + DPO |
| **P2** | Medium | Service-degradation, lateral movement-forsøg, mislykket DDoS | < 24 timer | On-call + CTO |
| **P3** | Lav | Suspicious activity uden påvist impact, single-user lockout | < 72 timer | On-call |

---

## 3. Response-procedure

### 3.1 Detection (0 - 15 min)

**Hvem detekterer:**
- Automated monitoring (Vercel logs, alarmer)
- Bruger-rapport (security@plesnertech.dk)
- Sub-processor-notifikation (Vercel/Neon/Stripe)
- Threat intelligence feed
- Penetrationtest-fund

**Hvad gør den first responder:**
1. Acknowledg via Slack #security indenfor 5 min
2. Forsøg initial klassificering (tier P0-P3)
3. Eskalér til Incident Commander (IC) hvis P0 eller P1

### 3.2 Triage (15 - 60 min)

**Incident Commander (typisk CTO eller designated on-call):**
1. Bekræft severity-klassificering
2. Etablér war-room (Slack channel + Google Meet)
3. Tildel roller:
   - **Communications Lead**: kunde + ekstern kommunikation
   - **Technical Lead**: investigation + remediation
   - **Documentation Lead**: live timeline + evidence preservation
4. Notificér ledelse + DPO afhængigt af tier

### 3.3 Containment (1 - 4 timer)

**Mål: stop blødning indenfor 4 timer for P0/P1.**

Standard tools:
- Revokér kompromitterede credentials (force password reset, invalidate JWT)
- Isolér berørte tenants (suspend status)
- Aktivér WAF-regler mod identificerede angreb
- Disable compromised features / endpoints
- Failover til DR-region hvis primær region er ramt

### 3.4 Eradication (4 - 24 timer)

- Identificér root cause via log-analyse + threat hunting
- Fjern persistensmekanismer (web shells, backdoors)
- Patch sårbarheden (eller deploy workaround)
- Rotér secrets der kunne være eksponeret
- Verify cleanup via second-look review

### 3.5 Recovery (4 - 72 timer)

- Restorer berørte data fra backup hvis nødvendigt
- Re-enable tenants
- Verify integritet af recovery
- Monitor for re-compromise i 72 timer

### 3.6 Lessons learned (1 - 14 dage)

- Blameless postmortem med alle involverede
- Dokumentér timeline, beslutninger, fund
- Identificér forbedringer (process, tools, training)
- Sæt ansvarlige for hver action item
- Publicer postmortem internt + extern (anonymized) hvor relevant

---

## 4. Notifikations-matrix

### 4.1 GDPR Art. 33 — Notifikation til Tilsynsmyndighed

**Hvornår**: Indenfor **72 timer** efter at vi (eller vores kunde) er klar over en data breach der involverer persondata.

**Hvem notificerer**: Den dataansvarlige (kunden). Vi som databehandler informerer kunden indenfor **24 timer** så de kan opfylde deres forpligtelse.

**Indhold** (Art. 33(3)):
- Karakter af bruddet + kategorier og omtrentligt antal berørte personer + records
- Kontaktoplysninger til DPO
- Sandsynlige konsekvenser
- Iværksatte / foreslåede foranstaltninger

### 4.2 GDPR Art. 34 — Notifikation til de Registrerede

**Hvornår**: Uden ugrundet ophold, hvis bruddet sandsynligvis medfører høj risiko for de registreredes rettigheder.

**Hvem notificerer**: Den dataansvarlige (kunden). Vi assisterer med kommunikations-template.

**Hvornår IKKE påkrævet** (Art. 34(3)):
- Hvis vi har implementeret tekniske foranstaltninger der gør data ulæselige (fx kryptering)
- Hvis vi har truffet efterfølgende foranstaltninger der forhindrer høj risiko
- Hvis det ville kræve uforholdsmæssig indsats — så er offentlig kommunikation acceptabel

### 4.3 NIS2 Art. 23 — Notifikation til CSIRT

**Hvornår** (hvis vi krydser NIS2-tærsklen):

| Tidspunkt | Hvad |
|---|---|
| Indenfor 24 timer | Early warning til national CSIRT |
| Indenfor 72 timer | Incident notification med initial vurdering |
| Indenfor 1 måned | Final report |

**Hvem**: Tværfagligt team af CTO + DPO + Comms.

### 4.4 Sub-processor notification

- **Stripe**: PCI-relaterede breaches notificeres til Stripe indenfor 24 timer
- **Vercel/Neon**: Hosting-relaterede breaches notificeres til support
- **Resend/Microsoft/Google**: E-mail-relaterede breaches indenfor 24 timer

---

## 5. Kommunikation til kunder

### 5.1 Mistanke om incident (P2-P3)

Intet kunde-notification medmindre kunden er direkte berørt.

### 5.2 Bekræftet single-tenant incident

- E-mail til berørt tenant-admin indenfor **24 timer**
- Forslag til mitigation (force password reset, audit log review)
- Status-page opdatering hvis offentligt synligt

### 5.3 Bekræftet multi-tenant incident

- **Status-page** opdateres indenfor 30 min af bekræftelse (https://status.crm-x.dk)
- E-mail til alle tenant-admins indenfor **24 timer**
- Post-incident-report indenfor **5 hverdage**

### 5.4 Eksempel notification-template

```
Emne: [VIGTIGT] Security Incident hos CRM-X — handling påkrævet

Kære [Tenant-admin],

Vi skriver for at informere dig om en security incident der har påvirket
[din tenant / din konto / specifikke ressourcer].

Hvad skete:
[Kort beskrivelse, ingen tekniske detaljer der kunne hjælpe en angriber]

Hvad vi har gjort:
- [Liste over containment-actions]

Hvad du bør gøre:
- [Konkrete handlinger til admin]

Tidslinje:
- [Detektion]: [tidspunkt]
- [Containment]: [tidspunkt]
- [Status nu]: [tidspunkt]

Spørgsmål? Skriv til dpo@plesnertech.dk eller ring +45 [TBD] (24/7).

Mvh,
Plesner Tech Security Team
```

---

## 6. Kontakter under incident

| Rolle | Kontakt | Tilgængelighed |
|---|---|---|
| **CISO/DPO** | dpo@plesnertech.dk · +45 [TBD] | 24/7 for P0/P1 |
| **CTO** | cto@plesnertech.dk · +45 [TBD] | 24/7 for P0 |
| **CEO** | ceo@plesnertech.dk · +45 [TBD] | P0 only |
| **Security hotline** | security@plesnertech.dk | 24/7 monitoring |
| **Legal counsel** | [Lawyer firma] | 24/7 for P0 |
| **PR/Communications** | [PR firma] | 24/7 for P0 |
| **National CSIRT (DK)** | CFCS, +45 33 91 00 24 | 24/7 |
| **Datatilsynet** | dt@datatilsynet.dk, +45 33 19 32 00 | Mon-Fri 9-16 |

---

## 7. Tools brugt under incident

- **Slack** — coordination + #security channel
- **Google Meet** — real-time war-room calls
- **Notion** — incident log + timeline
- **GitHub Security Advisories** — coordinated disclosure
- **Vercel** — runtime logs + deployment rollback
- **Neon Console** — DB-state + point-in-time recovery
- **1Password** — emergency secret-rotation

---

## 8. Drills & training

- **Quarterly DR drill** verificerer restore fra backup
- **Annual table-top exercise** for security team
- **Annual full incident drill** med ekstern observer
- **Bi-annual phishing simulation** for alle ansatte

---

## 9. Post-incident reporting

Indenfor 14 dage efter incident publiceres:

1. **Intern postmortem** (deltaljeret, blameless)
2. **Customer-facing summary** (hvad skete, hvad vi har gjort)
3. **Public disclosure** (hvis significant og kunder allerede er informeret)
4. **Action items** med ansvarlige + deadlines
5. **Knowledge base update** så lignende incidents undgås

---

*Plan version 1.5 — 22. juni 2026. Næste review: oktober 2026 (efter Q3 DR drill).*
