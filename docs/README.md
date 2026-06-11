# CRM-X — Komplet Dokumentation

> **CRM-X** er en multi-tenant CRM-platform bygget af Plesner Tech.
> Hver kunde får sit eget sub-domæne `kunde.plesnertech.dk` med isoleret data.

## 1. Hvad er CRM-X?

En SaaS-platform til danske konsulent- og IT-huse der kombinerer:

- **Kunder & kontakter** — firmaer, kontaktpersoner med beslutningsmandat-felt
- **Salg** — pipeline, tilbud, deals
- **Marketing** — kampagner og leads
- **Support** — tickets med tidsregistrering og status-flow
- **Projekter** — backlog, klippekort (timepuljer), klippekort-priser pr. volumen
- **Produkter & priser** — produktkatalog med abonnement/engangs-modeller
- **Licenser** — license-keys og udløbsvarsler
- **Fakturaer** — danske faktura-standarder med moms, B2B/B2C, linje-rabatter

Alt under ét tag, men hver kunde-tenant ser kun sine egne data.

## 2. Stack

| Lag | Teknologi |
|---|---|
| Frontend | Next.js 15 App Router (Server Components) |
| UI | Tailwind CSS + shadcn/ui-komponenter |
| Backend | Next.js Server Actions, Route Handlers |
| Database | PostgreSQL (Neon) via Prisma ORM |
| Auth | NextAuth v5 (Credentials provider, JWT-session) |
| MFA | TOTP (RFC 6238) |
| File storage | Vercel Blob |
| Hosting | Vercel |
| QR-koder | api.qrserver.com (whitelistet i CSP) |
| Mail | Resend |

## 3. Arkitektur — Mappestruktur

```
app/
├── (admin)/                # Super-admin portal (crmadmin.plesnertech.dk)
│   ├── layout.tsx          # Sidebar + role-gate
│   └── admin/
│       ├── page.tsx        # Dashboard
│       ├── tenants/        # Tenant-liste + detalje + onboarding
│       ├── insights/       # Aktivitet, Økonomi, System
│       └── audit/          # Audit-log
├── (tenant)/               # Kunde-CRM (kunde.plesnertech.dk)
│   ├── layout.tsx          # AppSidebar + AppTopbar + tenant-context
│   ├── dashboard/
│   ├── companies/
│   ├── contacts/
│   ├── support/tickets/
│   ├── projects/
│   ├── klippekort/
│   ├── invoices/
│   ├── products/
│   ├── leads/, campaigns/, pipeline/
│   ├── licenses/
│   ├── time/
│   └── settings/
├── api/
│   ├── auth/[...nextauth]/ # NextAuth handlers
│   ├── admin/impersonate/  # Super-admin impersonation
│   └── v1/                 # Public API (Bearer-token, Large-plan only)
├── login/                  # Login-side (alle roller bruger denne)
├── accept-invite/          # Invite-acceptance for nye brugere
└── legal/                  # Public sider: subprocessors, privacy

actions/                    # Server Actions, en pr. domæne
components/                 # React-komponenter (admin/, layout/, shared/, ...)
lib/                        # Helpers (auth, db, plans, audit, mfa, ...)
prisma/                     # schema.prisma + seed
compliance/policies/        # GDPR + ISO 27001 + SOC 2 policy-templates
docs/                       # Denne dokumentation
```

## 4. Datamodel — Hovedtabeller

- **Tenant** — én pr. kunde. Felter: `slug`, `plan`, `modules[]`, `status`, branding, faktura-konfiguration, billing-info.
- **User** — pr. tenant. Login + MFA + profilfelter (`phone`, `title`, `language`, `timezone`, `qrPreference`).
- **Role** — pr. tenant. Tre system-roller: Admin, Konsulent, Læs. Custom roller kan oprettes.
- **SuperAdmin** — global tabel. Login-konti til Plesner Techs egne medarbejdere.
- **AuditLog** — append-only. Logger logins, oprettelser, sletninger, impersonering, eksport.
- **Company / Contact / Product / Ticket / Project / HourBundle / License / Invoice** — domæne-data, alle med `tenantId` for isolation.
- **UserInvite** — token-baseret invite-flow. Klartekst-token vises kun én gang i mailen.
- **ApiToken** — Bearer-tokens til public API. Kun synlig på Large-plan.
- **BundlePricingTier** — klippekort-priser pr. tenant (timepris pr. volumen-trin).

Alle relationer cascade-sletter på `Tenant`-niveau så GDPR-sletning af en tenant er en single DB-operation.

## 5. Plan-katalog

Defineret i `lib/plans.ts`:

| Plan | Pris (USD/seat/md) | Inkluderede moduler | Default seats |
|---|---|---|---|
| Small | $10 | sales, support | 5 |
| Medium | $16 | + marketing, products | 10 |
| Large | $25 | + projects, licenses (alle 6) | 25 |

**Add-ons:** $4/seat/md pr. ekstra modul ud over plan-bundle.

**Auto-promote:** Hvis valgte moduler ⊇ næste plans bundle, opgraderes plan automatisk (det er ofte billigere end add-ons).

DKK-pris regnes via 1 USD = 6,80 DKK i `lib/plans.ts`. Skal justeres for produktion.

## 6. Tenant-livscyklus

State machine i `lib/tenant-status.ts`:

```
trial ──14d──▶ active ──suspendere──▶ suspended ──plan sletning──▶ scheduled_deletion ──60d──▶ deleted
              ▲                       │                                                          │
              └─────aktiver───────────┘                                                          │
                                                                                  cancelTenantDeletion
```

- **trial** — 14 dages gratis prøveperiode, fuld funktionalitet
- **active** — betalende kunde
- **suspended** — login blokeret, eksport stadig muligt
- **scheduled_deletion** — 60 dages cooldown, kunden kan reaktiveres
- **deleted** — hard-purge alle data + cascade på relationer

Alle overgange er audit-logget. Hard-purge kræver bekræftelse via input-frase "SLET <slug>".

## 7. Multi-tenant routing (middleware.ts)

Subdomæne → routing:

| Subdomæne | Eksempel | Routing | Bruges af |
|---|---|---|---|
| `crmadmin` | crmadmin.plesnertech.dk | `/admin/*` (rewrite) | Plesner Techs super-admins |
| `app` | app.plesnertech.dk | `/admin/*` (legacy, samme som crmadmin) | Bagudkompat |
| `<kunde-slug>` | acme.plesnertech.dk | tenant-rute + `x-tenant-slug` header | Kunde-brugere |
| `www` eller root | plesnertech.dk | Landing page | Public |

Lokalt simuleres subdomæner via `?tenant=<slug>` query parameter.

`/api/v1/*` skippes af middleware — route-handlers gør deres egen Bearer-token-validering.

## 8. Sikkerhedslag (oversigt)

1. **NextAuth JWT** — 8 timers session, opdateres hver 30 min
2. **Role-baseret access**: `super_admin` vs. `admin` vs. `konsulent` vs. `læs`
3. **MFA (TOTP)** — bcrypt-hashed recovery codes
4. **Audit-log** — 13 mdr. retention (mål 24)
5. **Rate-limit** — login + password-reset
6. **CSP** — strict, kun whitelistede CDN'er
7. **Cookies** — HttpOnly, Secure, SameSite=lax på alt sensitivt
8. **API-tokens** — SHA-256 hash, klartekst returneres kun én gang
9. **Tenant-isolation** — alle queries filtreres på `tenantId` via session

Detaljeret review: [`security.md`](./security.md).

## 9. Kom i gang lokalt

**Forudsætninger:** Node 22+, en Neon (eller lokal) PostgreSQL-database.

```bash
# 1. Installer dependencies
npm install

# 2. Sæt env vars (.env)
cp .env.example .env
# Udfyld DATABASE_URL, DIRECT_URL, NEXTAUTH_SECRET, RESEND_API_KEY

# 3. Sæt schema + seed
npx prisma db push
npx prisma generate
npm run db:seed

# 4. Start dev
npm run dev
```

**Default-konti efter seed:**

- Super admin: `jens@plesnertech.dk` / `SkiftMigStraks!`
- Demo tenant-admin: `admin@demo.dk` / `Admin2024!`

**SKIFT BEGGE PASSWORDS FØR PRODUKTION.**

## 10. Vigtige stier

- **Admin-portal:** `http://localhost:3000/admin`
- **Demo-kunde:** `http://localhost:3000/?tenant=demo` (eller direkte `/dashboard` med tenant-admin login)
- **Login:** `http://localhost:3000/login` — workspace-feltet tomt = super admin, udfyldt = tenant-slug
- **Audit-log:** `/admin/audit`
- **Sub-processors (offentlig):** `/legal/subprocessors`

## 11. Andre dokumenter

- [`admin-guide.md`](./admin-guide.md) — sådan onboarder du en ny kunde
- [`security.md`](./security.md) — sikkerheds-review og isolation-bevis
- [`../ROADMAP_BIG_SCOPE.md`](../ROADMAP_BIG_SCOPE.md) — historisk roadmap (alt færdigt)
- `../compliance/policies/` — GDPR, retention, sub-processors templates

## 12. Plesner Tech-konventioner

- **Sprog:** Hele UI er dansk. Audit-log er bevidst engelsk pga. compliance-konsistens.
- **Æ/Ø/Å:** Skal bruges korrekt — *ikke* "ae/oe/aa". Bemærk dog at danske substantiver på `-a` tager `-er` i pluralis (firmaer, fakturaer — ikke firmær/fakturær).
- **Design:** Lowkey nordisk, bløde toner. Pastel-badges, ingen skarpe farver.
- **Datoer:** Format `dd.mm.yyyy` (da-DK locale).
- **Pris-format:** kr. for DKK, $ for USD, ingen øre (rundes).
