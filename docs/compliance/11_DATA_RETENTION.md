# Data Retention Policy

> Hvor længe CRM-X opbevarer forskellige typer data, og hvordan sletning sker.
> Compliant med GDPR Art. 5(1)(e) + Art. 17 + dansk regnskabslov + bogføringsloven.

---

## 1. Princip: Storage Limitation

GDPR Art. 5(1)(e) kræver at persondata "ikke opbevares i en form, der gør det muligt at identificere de registrerede i et længere tidsrum end nødvendigt".

CRM-X har derfor klar retention-policy + automatiseret sletning hvor muligt.

---

## 2. Retention-perioder pr. data-type

### 2.1 Tenant-data (CRM-X som databehandler)

| Datatype | Retention-periode | Begrundelse | Sletning |
|---|---|---|---|
| Aktive tenant-data | Kontrakts-løbetid | Nødvendig for service-levering | Manuel — bruges dagligt |
| Suspenderet tenant | 30 dage efter suspension | Mulighed for genaktivering | Auto-deletion efter 30 dage |
| Opsagt tenant | 30 dage efter opsigelse | Mulighed for data-eksport | Hard-delete efter 30 dage |
| Backups | 7 dage (Neon PITR) + 30 dage encrypted snapshots | DR + compliance | Auto-rolling |
| Audit-log | 2 år | Compliance + investigations | Auto-archive til kold storage efter 2 år |
| Email-log | 2 år | Audit + delivery verification | Auto-deletion efter 2 år |

### 2.2 Brugerdata (CRM-X som dataansvarlig)

| Datatype | Retention | Begrundelse |
|---|---|---|
| Bruger-konto (aktiv) | Kontrakts-løbetid + 30 dage | Service-levering |
| Bruger-konto (slettet) | Soft-delete 30 dage → hard-delete | Mulighed for fortrydelse |
| Login-historik | 90 dage | Security analyse |
| MFA-secret | Indtil deaktivering | Funktion |
| OAuth-tokens | Indtil revokation eller udløb | Funktion |

### 2.3 Faktura- og betalingsdata

| Datatype | Retention | Begrundelse |
|---|---|---|
| Fakturaer | **5 år** efter regnskabsårets udløb | DK Bogføringsloven § 9 |
| Betalingshistorik | 5 år | Bogføringsloven |
| Stripe-customer-id | Indtil opsigelse + 5 år | Bogføringsloven |

**Bemærk**: Dette **overstyrer** GDPR-sletteret (Art. 17(3)(b)) — lovlig opbevaring er undtagelse.

### 2.4 Marketing-data

| Datatype | Retention | Begrundelse |
|---|---|---|
| Newsletter-abonnement | Indtil opt-out | Samtykke kan trækkes når som helst |
| Marketing-cookies | Ingen — vi sætter dem ikke | Privacy-by-default |
| Sales-CRM kontakter | 24 mdr efter sidste interaktion | Lovlig interesse — automatisk re-vurdering |

### 2.5 Support-data

| Datatype | Retention | Begrundelse |
|---|---|---|
| Support-tickets (åbne) | Indefinitely | Service-levering |
| Support-tickets (lukkede) | 2 år | Knowledge base + statistics |
| Kommentarer | Sammen med parent-objekt | Datakonsistens |

### 2.6 Compliance-data

| Datatype | Retention | Begrundelse |
|---|---|---|
| Audit-log | 2 år online + 5 år arkiv | Compliance + investigations |
| Breach-rapporter | 10 år | Reguleringsmæssig dokumentation |
| Pentest-rapporter | 5 år | Auditor-evidens |
| DPA-aftaler | Kontrakts-løbetid + 10 år | Juridisk dokumentation |

---

## 3. Slette-procedure

### 3.1 Soft-delete (rolligt)

Når en bruger eller admin sletter en ressource:

1. Marker som `deletedAt = now()` (audit-trail bevares)
2. UI viser **ikke** længere ressourcen
3. Tenant-admin kan **genoprette** indenfor 30 dage
4. Efter 30 dage: hard-delete

### 3.2 Hard-delete

Efter retention-perioden:

1. **Cryptographic erasure** af krypterede felter (token-rotation gør krypterede data ulæselige)
2. **Database DELETE** med cascade
3. **Backup-rotation** sikrer at slettede data forsvinder fra backups indenfor 7 dage
4. **Audit-log entry** dokumenterer sletningen

### 3.3 Right to erasure (GDPR Art. 17)

Den registrerede kan anmode om sletning:

- **Via self-service**: `/settings/profile` → "Slet alle mine data"
- **Via tenant-admin**: Admin kan slette på brugerens vegne
- **Via privacy@plesnertech.dk**: Inden 30 dage besvarer vi anmodningen

Undtagelser hvor vi **ikke** kan slette:
- Lovlig forpligtelse (regnskab, retstvister)
- Berettigede interesser der overstiger den registreredes interesser
- Defense of legal claims

---

## 4. Sletning af tenant ved opsigelse

```
Dag 0    Tenant opsiges
         ↓
Dag 1-30 Tenant suspenderes (read-only adgang for dataeksport)
         ↓
Dag 30   Hard-delete af alle tenant-data
         ↓
Dag 37   Backups roteret væk
         ↓
Dag 45   Audit-log opdateret med sletnings-bekræftelse
         ↓
Dag 60   Bekræftelse sendt til tenant-admin's sidst kendte e-mail
```

**Undtagelse**: Fakturaer + betalingsdata opbevares 5 år efter regnskabsårets udløb (DK lovgivning).

---

## 5. Backups og retention

| Backup-type | Retention | Lokation |
|---|---|---|
| Neon PITR | 7 dage continuous | Frankfurt (encrypted) |
| Daily snapshots | 30 dage | Frankfurt (encrypted) |
| Weekly archives | 90 dage | Stockholm (encrypted secondary region) |
| Annual archives | 7 år | Cold storage (kun for legal/compliance) |

Slettede data forsvinder fra alle backup-tiers via rolling delete.

---

## 6. Tenant data export

Inden hard-delete kan tenant downloade alle deres data:

- **JSON-bundle** med alle entiteter
- **CSV-eksporter** af tabeller (fakturaer, pipeline, tickets)
- **PDF-eksport** af fakturaer + tilbud
- **Komplet attachment-arkiv** som ZIP

Tilgængelig via `/settings/compliance` → "Eksportér alle mine data".

---

## 7. Automatiseret sletning — implementering

| Job | Hyppighed | Kører |
|---|---|---|
| Soft-delete-to-hard-delete sweep | Daglig 03:00 UTC | `/api/cron/data-retention` |
| Audit-log archive (>2 år) | Månedligt | Manuel + automated review |
| Backup rotation | Continuous | Neon-managed |
| Suspended tenant cleanup | Daglig | Cron-job |
| Inactive user reminder | Månedlig | E-mail efter 6 mdr inaktivitet |
| Inactive user deactivation | Manuel | Efter 12 mdr inaktivitet |

---

## 8. Retention vs Sletteret balance

Når retention-krav (fx 5 års fakturadata) kolliderer med sletteret (Art. 17):

1. **Vi pseudonymiserer** persondata hvor muligt (faktura-modtagers navn → "Slettet bruger")
2. Vi beholder **kun de minimum-felter** loven kræver (CVR, beløb, dato — ikke navn/email hvis ikke nødvendigt)
3. Vi dokumenterer beslutningen i audit-log

---

## 9. Tenant-konfiguration

Tenants kan **strammere** retention-perioder end vores defaults:

- Custom retention pr. data-type
- Custom slettering-tidsplaner
- Custom dataeksport-formater

Konfigureres via `/settings/compliance` (admin only).

---

## 10. Tabeller med retention-felter i schema

| Model | Felt | Beskrivelse |
|---|---|---|
| Tenant | `scheduledDeletionAt` | Planlagt hard-delete-dato |
| Tenant | `deletedAt` | Hard-delete tidsstempel |
| Tenant | `suspendedAt` | Suspension-start |
| User | `lastLogin` | Bruges til inaktivitets-detection |
| AuditLog | `createdAt` | Bruges til archive-policy |

---

*Policy version 1.3 — 22. juni 2026. Næste review: december 2026.*
