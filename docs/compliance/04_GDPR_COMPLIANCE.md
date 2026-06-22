# GDPR — Fuld Compliance Dokumentation

> EU 2016/679 General Data Protection Regulation.
> CRM-X som **databehandler** for vores kunder (= dataansvarlige).

---

## 1. Rolle-afklaring

CRM-X er **databehandler** (Art. 4(8)). Vores kunder er **dataansvarlige** (Art. 4(7)). Det betyder:

- **Kunden bestemmer** hvilken persondata der behandles og til hvilket formål
- **CRM-X behandler** på vegne af kunden, efter instruks i DPA
- **Kunden er ansvarlig** for at indhente samtykke fra slutbrugere
- **CRM-X stiller** tekniske og organisatoriske foranstaltninger til rådighed

---

## 2. Records of Processing (Art. 30)

### 2.1 Som databehandler — på vegne af kunder

| Aktivitet | Persondata | Retsgrundlag | Modtagere | Retention |
|---|---|---|---|---|
| Kunde-administration | Navn, e-mail, telefon, titel, adresse | Kontrakt (kundens lovlige interesse) | Kunden + sub-processorer | Kontrakts-løbetid + 30 dage |
| Support-tickets | Navn, e-mail, fritekst-beskrivelse | Kontrakt | Kunden | Kontrakts-løbetid + 30 dage |
| Faktura-information | Navn, CVR, adresse, betalings-info | Lovlig forpligtelse (regnskabsloven) | Kunden + skattemyndighed | 5 år (DK regnskabslov) |
| Time-tracking | Brugerens log-data | Kontrakt | Kunden | Kontrakts-løbetid + 30 dage |
| Audit-log | Bruger-id, IP, user-agent, handling | Kontrakt + lovlig interesse | Kunden | 2 år |

### 2.2 Som dataansvarlig — for vores egne kunder

| Aktivitet | Persondata | Retsgrundlag | Modtagere | Retention |
|---|---|---|---|---|
| Salgs-CRM | Navn, e-mail, virksomhed | Lovlig interesse (sales) | Plesner Tech personale | Indtil kontrakt eller opt-out |
| Kunde-administration | Kontaktpersoner hos kunde-tenants | Kontrakt | Plesner Tech | Kontrakts-løbetid + 5 år |
| Marketing (newsletter) | E-mail | Samtykke (opt-in) | Resend (sub-processor) | Indtil opt-out |
| Support | Bruger-spørgsmål + svar | Kontrakt | Plesner Tech support-team | 2 år |
| Cookies (strict-necessary) | Session-cookies | Lovlig interesse | — | Session |

---

## 3. GDPR-rettigheder (kapitel 3)

| Artikel | Rettighed | CRM-X implementation |
|---|---|---|
| **Art. 15** | Indsigtsret | Bruger kan downloade alle egne data fra `/settings/profile` |
| **Art. 16** | Berigtigelse | Bruger kan opdatere egne data + admin kan rette på kundens vegne |
| **Art. 17** | Sletning ("ret til at blive glemt") | `/settings/compliance` → "Slet alle mine data" + audit-trail |
| **Art. 18** | Begrænsning af behandling | Tenant kan suspendere bruger uden at slette |
| **Art. 19** | Underretningspligt | Audit-log notificerer relevante parter |
| **Art. 20** | Dataportabilitet | JSON-bundle download af alle relevante data |
| **Art. 21** | Indsigelse | Marketing-mails har one-click unsubscribe |
| **Art. 22** | Automatiske afgørelser | Vi laver ingen profilering eller automatiske afgørelser |

---

## 4. Tekniske og organisatoriske foranstaltninger (Art. 32)

### 4.1 Krypteringsmæssige foranstaltninger

| Hvor | Hvad | Hvordan |
|---|---|---|
| In transit | TLS 1.3 | Vercel + Neon |
| At rest (DB) | AES-256 | Neon storage encryption |
| At rest (filer) | AES-256 | Vercel Blob encryption |
| At rest (tokens) | App-level AES-256-GCM | `EMAIL_TOKEN_KEY` |
| Passwords | bcrypt cost-12 | `lib/auth.ts` |
| MFA secrets | App-level AES-256-GCM | Pre-DB |

### 4.2 Konfidentialitet og integritet

- Multi-faktor autentificering (TOTP)
- Multi-tenant data-isolation
- Role-based access control (RBAC)
- Audit-log af alle CRUD-operationer
- Session-timeout efter 30 min idle

### 4.3 Availability

- Neon multi-AZ + Point-in-Time-Recovery (7 dage)
- Vercel global edge + multi-region failover
- Uptime mål: 99.9% (faktisk: 99.97% i 2026)
- DR-plan: RPO=24h, RTO=4h

### 4.4 Reguleret testning

- Årlig penetrationstest af eksternt firma
- Quarterly internt security review
- Continuous monitoring af dependencies (Dependabot)

---

## 5. Privacy by Design & Default (Art. 25)

### 5.1 By Design

- **Data minimization**: kun nødvendige felter i schema
- **Pseudonymization**: bruger-ID som proxy, ikke navn
- **Purpose limitation**: tenant kan ikke se andre tenants' data
- **Lagrings-minimization**: retention policy med auto-deletion

### 5.2 By Default

- **Strict-necessary cookies only** — ingen tracking-cookies
- **Newsletter opt-in** — ingen pre-checked boxes
- **Privacy-friendly defaults** på bruger-indstillinger
- **No third-party data sharing** uden eksplicit DPA

---

## 6. Breach-notifikation (Art. 33-34)

### 6.1 Tidsfrister

- **Til datatilsyn** (Art. 33): inden 72 timer efter opdagelse
- **Til berørte personer** (Art. 34): "uden ugrundet ophold" hvis høj risiko

### 6.2 Vores proces

Se `10_INCIDENT_RESPONSE.md` for fuld plan. Kort:

1. **Detektion** via monitoring eller bruger-rapport
2. **Triage** indenfor 1 time af DPO + CTO
3. **Containment** indenfor 4 timer
4. **Notifikation til kunden** (som dataansvarlig) indenfor 24 timer
5. **Kunden notificerer Datatilsynet** indenfor 72 timer (vores forpligtelse: at give dem info i tide)
6. **Post-incident review** og blameless postmortem indenfor 14 dage

### 6.3 Breach-eksempler vi forbereder os på

- Phishing der kompromitterer admin-konto → MFA + recovery
- SQL injection eller XSS → input-validation + CSP
- Supply chain-attack via npm package → Dependabot + SBOM
- Sub-processor breach (fx Resend) → kontraktuel notifikation indenfor 24t
- Insider threat → audit-log + segregation of duties

---

## 7. Internationale overførsler (Kapitel 5)

CRM-X opererer fra **EU (Frankfurt)** med disse undtagelser:

| Sub-processor | Lokation | Garantier |
|---|---|---|
| Vercel | USA + global edge | Standard Contractual Clauses (SCC) 2021/914 |
| Stripe | USA + IE | SCC + dual-binding mellem EU og US |
| Microsoft Graph | EU/USA | SCC + EU-US Data Privacy Framework |
| Google Workspace | EU/USA | SCC + EU-US Data Privacy Framework |
| Resend | USA | SCC + DPA |

**Kerne-data forbliver i EU** (Neon Frankfurt + Vercel Frankfurt-edge).

---

## 8. Data Protection Officer (DPO)

| Rolle | Detaljer |
|---|---|
| **Navn** | Jens Rommedahl (acting DPO) |
| **E-mail** | dpo@plesnertech.dk |
| **Telefon** | +45 [TBD] |
| **Adresse** | Plesner Tech ApS, [adresse], 1234 København K |

DPO-rolle påkrævet fordi vi behandler data systematisk og storskala (Art. 37(1)(b)).

---

## 9. Tilsynsmyndighed

For tenants i Danmark er **Datatilsynet** lead supervisory authority:

| Detalje | Værdi |
|---|---|
| Navn | Datatilsynet |
| Web | https://www.datatilsynet.dk |
| Adresse | Carl Jacobsens Vej 35, 2500 Valby |
| Telefon | +45 33 19 32 00 |

For EU-tenants gælder One-Stop-Shop princip (Art. 56).

---

## 10. Tjekliste for kunder (dataansvarlige)

Som vores kunde har **du** disse forpligtelser:

- [ ] Underskriv DPA før produktion-brug (`07_DPA_TEMPLATE.md`)
- [ ] Opret intern Records of Processing for din egen brug
- [ ] Indhent samtykke / dokumentér retsgrundlag for slutbrugere
- [ ] Implementér egen privacy notice der inkluderer CRM-X som processor
- [ ] Definér intern retention-politik
- [ ] Træn dine medarbejdere i sikker brug af platformen
- [ ] Review sub-processor-listen og giv besked om indsigelser indenfor 30 dage
- [ ] Test breach-notifikations-proces sammen med CRM-X

---

## 11. Tjekliste for CRM-X (databehandler)

Som databehandler har vi:

- [x] DPA-template klar (`07_DPA_TEMPLATE.md`)
- [x] Sub-processor-inventory opdateret (`09_SUB_PROCESSORS.md`)
- [x] Tekniske foranstaltninger dokumenteret (`02_ISO_27001_MAPPING.md`)
- [x] Breach-notification-proces (`10_INCIDENT_RESPONSE.md`)
- [x] Records of Processing (denne fil)
- [x] DPO udpeget
- [x] Privacy notice live (plesnertech.dk/privacy)
- [x] Kunde-portal til datatudtræk + sletning
- [x] Standard Contractual Clauses underskrevet med USA-sub-processorer
- [ ] Årlig DPIA-review (Q4 2026)

---

## 12. Bilag

### A. Privacy notice (live på plesnertech.dk)
### B. Cookie notice (kun strict-necessary)
### C. DPIA for CRM-X (Q3 2026 review planlagt)
### D. Sub-processor approval-formular
### E. Breach-notification-template

---

*Dokument reviewet 22. juni 2026. Næste review: december 2026.*
