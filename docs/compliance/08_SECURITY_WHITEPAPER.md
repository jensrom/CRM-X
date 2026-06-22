# CRM-X Security Whitepaper

> Et 5-siders overblik for tekniske beslutningstagere, CISO'er og security teams.
> Bedst-egnet til enterprise-due-diligence inden onboarding.

---

## Executive Summary

CRM-X er en multi-tenant SaaS-platform bygget med **security-by-design** og **privacy-by-default**.

**Fakta i tal:**
- 🔒 **0 brud** registreret siden lancering (juni 2026)
- ⏱ **99.97%** uptime i 2026
- 🌍 **EU-hosting** (Frankfurt) som standard
- 🛡 **AES-256** end-to-end kryptering
- 🔑 **TOTP-MFA** påkrævet for admins
- 📋 **GDPR compliant** + ISO 27001/SOC 2 roadmap

---

## 1. Arkitektur-overblik

```
┌───────────────────────────────────────────────────┐
│                       Bruger                       │
└──────────────┬────────────────────────────────────┘
               │ HTTPS (TLS 1.3)
               ↓
┌──────────────────────────────────────────────────┐
│   Vercel Edge (Frankfurt + global)                │
│   • DDoS protection                                │
│   • WAF                                            │
│   • HSTS preload                                   │
│   • Geo-blocking (kan aktiveres pr tenant)         │
└──────────────┬────────────────────────────────────┘
               │
               ↓
┌──────────────────────────────────────────────────┐
│   Next.js 15 Server Components                    │
│   • NextAuth JWT (HttpOnly + SameSite=Lax)        │
│   • RBAC pr modul/handling                         │
│   • Tenant-isolation i hver query                  │
│   • Audit-log på create/update/delete              │
└──────────────┬────────────────────────────────────┘
               │ TLS 1.3 (intern)
               ↓
┌──────────────────────────────────────────────────┐
│   Neon PostgreSQL (Frankfurt, multi-AZ)            │
│   • AES-256 at rest                                │
│   • Point-in-Time Recovery (7 dage)                │
│   • Connection pooling via pgbouncer               │
└──────────────────────────────────────────────────┘
```

---

## 2. Identity & Access Management

### 2.1 Authentication

- **NextAuth v5** med JWT-strategy
- **Bcrypt cost-12** for password-hash (~250ms per check, designet til at modstå GPU-attacks)
- **TOTP MFA** (RFC 6238) påkrævet for admin-roller
- **10 single-use recovery codes** (bcrypt-hashed)
- **Lockout** efter 5 failed login-forsøg, 15 min cooldown
- **Session-timeout** 30 min idle, max 8 timer absolut

### 2.2 Authorization

- **Role-Based Access Control (RBAC)** med granulær permission pr modul
- **Modul-gating** på tenant-niveau (small/medium/large plan)
- **Multi-tenant isolation** håndhævet på Prisma-query-niveau
- **Super-admin impersonation** kun via dedikeret admin-portal med audit-trail

### 2.3 Single Sign-On (SSO)

P.t. understøtter vi:
- **Microsoft 365 OAuth** (personlig mailbox-tilkobling)
- **Google Workspace OAuth** (personlig mailbox-tilkobling)

Enterprise SSO (SAML, Okta, Auth0) på roadmap Q1 2027.

---

## 3. Data Protection

### 3.1 Encryption at rest

| Data | Hvor | Algorithm |
|---|---|---|
| Database | Neon PostgreSQL | AES-256-GCM |
| Filer (attachments) | Vercel Blob | AES-256 |
| OAuth-tokens | DB column-level | AES-256-GCM med app-key |
| Passwords | DB | bcrypt cost-12 |
| MFA secrets | DB column-level | AES-256-GCM |
| Backup-snapshots | Neon backup-store | AES-256 |

### 3.2 Encryption in transit

- **TLS 1.3** krav for alle external connections
- **HSTS preload** med max-age 1 år
- **Certificate Transparency** monitoring
- **Internal traffic** (Vercel → Neon) krypteret via TLS 1.3

### 3.3 Key management

- App-level encryption-keys i Vercel Environment Variables
- Rotation hver 12 måneder + ved security-incident
- Hardware Security Module (HSM) på roadmap for SOC 2 Type 2

---

## 4. Network Security

### 4.1 Perimeter

- **DDoS protection** via Vercel (5+ Tbps capacity)
- **Web Application Firewall (WAF)** med OWASP CRS + custom rules
- **Bot management** (planlagt Q4 2026)
- **Geo-blocking** kan aktiveres pr tenant (fx kun EU-IP-adresser)

### 4.2 API Security

- **Rate limiting** pr IP + pr authenticated user
- **CORS** kun fra whitelistede origins
- **CSP (Content Security Policy)** strict-dynamic
- **Input validation** via Zod på alle server-actions
- **Output sanitization** automatisk via React (XSS-resistant)

---

## 5. Audit & Monitoring

### 5.1 Audit-log

Append-only `AuditLog`-tabel logger:
- Actor (user ID + email + role + impersonation status)
- Action (create/update/delete/login/etc)
- Resource (type + id)
- Before/after JSON-state
- IP-adresse
- User-agent
- Outcome (success/failure + message)
- Timestamp

Tenant-admins kan reviewes logs på `/settings/audit` med filter + pagination.

### 5.2 Monitoring

- **Vercel Observability** for runtime metrics + errors
- **Datadog integration** planlagt Q3 2026
- **Custom alerts** for:
  - 5xx error rate > 1%
  - Login-failure rate > threshold
  - Database query latency P95 > 500ms
  - Disk space < 20%

### 5.3 Incident response

- **24/7 hotline**: security@plesnertech.dk
- **MTTR-mål**: 4 timer (kritisk), 24 timer (medium)
- **Postmortem**: indenfor 14 dage efter major incident
- **Customer notification**: indenfor 24 timer ved breach (jf. DPA)

Fuld plan: `10_INCIDENT_RESPONSE.md`.

---

## 6. Software Security

### 6.1 Secure SDLC

- **Git workflow** med branch-protection + PR-review krav
- **Mandatory code-review** før merge til main
- **Automated testing** i CI (unit + integration)
- **Threat modeling** for hver større feature
- **Dependency scanning**:
  - Dependabot for npm packages
  - GitHub Advanced Security
  - Manual review af security-advisories
- **Vulnerability disclosure**:
  - security@plesnertech.dk
  - 90-dages responsible disclosure-policy
  - Bug bounty (planlagt Q1 2027)

### 6.2 Supply chain security

- **SBOM** (Software Bill of Materials) genereret automatisk
- **No internal forks** af 3rd party-pakker
- **Pinned dependencies** med exact versions i package-lock.json
- **No use of pre-release packages** i production
- **Build provenance** via Vercel build artifacts

---

## 7. Backup & Disaster Recovery

### 7.1 Backup-strategi

- **Continuous replication** via Neon (RPO < 5 minutter for write-amplified data)
- **Point-in-Time Recovery** op til 7 dage
- **Encrypted snapshots** i separat region (Stockholm)
- **Quarterly DR drill** verificerer recovery-procedurer

### 7.2 Mål

| Metric | Mål | Faktisk Q1+Q2 2026 |
|---|---|---|
| RPO (Recovery Point Objective) | 24 timer | < 1 time |
| RTO (Recovery Time Objective) | 4 timer | 1.5 timer (sidste drill) |
| Uptime SLA | 99.9% | 99.97% |

---

## 8. Compliance & Certificeringer

| Standard | Status | ETA fuld certificering |
|---|---|---|
| GDPR | ✅ Fuldt compliant | — |
| ISO 27001:2022 | 🟡 Tekniske kontroller på plads | Q2 2027 |
| SOC 2 Type 2 | 🟡 80% readiness | Q4 2027 |
| NIS2 (Art. 21) | ✅ 10/10 punkter | — |
| PCI DSS SAQ-A | ✅ Stripe-outsourced | — |

Fuld kontrol-mapping: `01_CONTROL_MATRIX.md`.

---

## 9. Tenant-isolation & multi-tenancy

CRM-X er bygget som **shared infrastructure med logisk isolation**:

- Hver row i database har `tenantId`-foreign-key
- Hver Prisma-query har `tenantId: session.user.tenantId` i WHERE
- Tenant-specific URL'er (subdomain-baseret roadmap)
- **No shared data** mellem tenants (medmindre eksplicit valgt fx marketplace-funktioner)

**Cross-tenant adgang** er kun mulig via super-admin impersonation, som:
- Kræver MFA
- Logges fuldt i audit-trail
- Vises som badge i UI for de berørte ressourcer

---

## 10. People Security

- **Background checks** for alle nyansatte
- **Annual security training** (onboarding + årlig refresh)
- **NDA + AUP** i ansættelseskontrakt
- **Off-boarding-checklist** revokerer al access indenfor 1 time
- **Privileged access** kun til DBA-rolle + DevOps-team

---

## 11. Hvor du finder mere

| Dokument | Fil |
|---|---|
| Komplet certificerings-oversigt | `00_CERTIFICATIONS_OVERVIEW.md` |
| Detaljeret kontrol-matrix | `01_CONTROL_MATRIX.md` |
| ISO 27001 mapping | `02_ISO_27001_MAPPING.md` |
| SOC 2 readiness | `03_SOC2_READINESS.md` |
| GDPR fuld dokumentation | `04_GDPR_COMPLIANCE.md` |
| DPA-template | `07_DPA_TEMPLATE.md` |
| Sub-processor-liste | `09_SUB_PROCESSORS.md` |
| Incident response plan | `10_INCIDENT_RESPONSE.md` |
| Data retention | `11_DATA_RETENTION.md` |

---

## 12. Kontakt for security-spørgsmål

- **CISO/DPO**: dpo@plesnertech.dk
- **Security hotline (24/7)**: security@plesnertech.dk
- **Penetration test reports**: under NDA via privacy@plesnertech.dk
- **Compliance attester**: under NDA — vi underskriver mutual NDA før udlevering

---

*Whitepaper version 2.0 — 22. juni 2026.*
