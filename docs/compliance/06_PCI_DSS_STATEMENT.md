# PCI DSS — Statement of Applicability

> PCI DSS v4.0 — Payment Card Industry Data Security Standard.
> CRM-X som SaaS-platform der **outsourcer** kortbetalingen til Stripe.

---

## 1. Vores PCI DSS-scope: SAQ-A

CRM-X kvalificerer til **SAQ-A** (Self-Assessment Questionnaire A) — den enkleste compliance-niveau for merchants der har **fully outsourced** kortdata-håndtering.

**Hvad SAQ-A betyder:**
- Vi gemmer **aldrig** kortnumre, CVV eller magnetstribe-data
- Al kortbetaling går direkte via **Stripe Checkout** (PCI DSS Level 1 Service Provider)
- Vores systemer modtager kun **tokeniserede references** (`stripeSubscriptionId`, `stripeCustomerId`)
- Vi har ingen "Cardholder Data Environment" (CDE)

---

## 2. Hvordan kortbetaling virker

```
[Bruger]
    ↓ (klikker "Opgrader")
[CRM-X /api/billing/checkout]
    ↓ (opretter Stripe Checkout Session)
[Stripe Checkout]  ← bruger taster kortdata her, IKKE i CRM-X
    ↓ (success/cancel)
[CRM-X /api/webhooks/stripe]  ← modtager kun subscription-event
    ↓ (gemmer stripeSubscriptionId)
[CRM-X DB]
```

CRM-X **ser aldrig** kortdata. Hvis du laver `console.log` på vores backend ser du kun Stripe-IDs som `sub_1234567890`.

---

## 3. Stripe's PCI DSS Level 1

Stripe Inc. er certificeret **PCI DSS Level 1 Service Provider** — det højeste niveau.

| Attestation | Status | Reference |
|---|---|---|
| PCI DSS Level 1 SAQ-D | ✅ | https://stripe.com/docs/security/stripe |
| PCI DSS Annual Validation | ✅ Q4 2025 | AOC tilgængelig under NDA |
| SOC 1 Type 2 | ✅ | — |
| SOC 2 Type 2 | ✅ | — |
| ISO 27001 | ✅ | — |

Stripe stiller deres **Attestation of Compliance (AOC)** til rådighed under NDA hvis dine egne auditors skal verificere.

---

## 4. CRM-X's SAQ-A-tjekliste

| Krav | Implementering |
|---|---|
| **2.1** No vendor-supplied defaults for system passwords | ✅ NextAuth genererer unik secret pr installation |
| **2.2** Develop config standards | ✅ Vercel + Neon konfiguration documented |
| **8.2** Secure authentication for non-consumer users | ✅ MFA på admin-accounts |
| **9.5** Physical security of media | ✅ Outsourced til Vercel/Neon datacentre |
| **12.8** Maintain list of service providers | ✅ `09_SUB_PROCESSORS.md` |
| **12.9** Service providers acknowledge their security responsibilities | ✅ Stripe DPA underskrevet |

Resterende SAQ-A-krav (>20 stk) er enten N/A fordi vi ikke håndterer kortdata eller automatisk opfyldt via vores ISO/SOC 2-kontroller.

---

## 5. Hvad kunder bør vide

Hvis du bruger CRM-X til at modtage betalinger fra dine egne kunder:

1. **CRM-X faktura-modul** er kun til **invoicing** (faktura-generering + email-send)
2. Vi tilbyder **ikke** payment-acceptering for din egne kunders kort
3. Du skal selv have en payment processor (Stripe, MobilePay, GLS-link, e-conomic etc.)
4. CRM-X integrerer via "Stripe Customer Portal" — dine kunder betaler via Stripe direkte

For **subscription-betaling af CRM-X-platformen** (small/medium/large plan) bruger vi Stripe — så vi er **din leverandør**, og du modtager kvittering direkte fra Stripe.

---

## 6. Roadmap

P.t. ingen planer om at flytte til SAQ-D eller højere niveau. Hvis vi en dag tilbyder eget payment-modul (fx native MobilePay-integration), revurderer vi compliance-scope.

---

## 7. Kontakt for PCI-spørgsmål

- **CRM-X PCI-koordinator**: privacy@plesnertech.dk
- **Stripe support**: https://support.stripe.com

---

*Dokument reviewet 22. juni 2026.*
