# Deploy til Vercel — Trin for trin

> Denne guide tager dig fra "kode på din maskine" til en kørende
> CRM-X på `https://plesnertech.dk` med kunde-subdomæner.

## 0. Forudsætninger

- GitHub-konto (kode skal pushes hertil først)
- Vercel-konto (gratis Hobby duer til test, Pro anbefales til prod)
- Neon-konto med en database (DATABASE_URL parat)
- Domænet `plesnertech.dk` registreret hos en DNS-leverandør (DanDomain, Simply, Cloudflare...)
- Resend-konto med verifieret afsender-domæne

## 1. Push koden til GitHub

Hvis du ikke allerede har et repo:

```bash
cd "D:\Claude Test\CRM-X\CRM-X"
git init
git add .
git commit -m "Initial commit — CRM-X klar til deploy"

# Opret nyt repo på github.com (privat anbefales)
git remote add origin git@github.com:plesner-tech/crm-x.git
git branch -M main
git push -u origin main
```

**Tjek `.gitignore` har:**
- `node_modules/`
- `.next/`
- `.env`
- `.env.local`
- `.env.*.local`

`.env.example` SKAL commitedes — den er skabelonen.

## 2. Forbered Neon-database

På [neon.tech](https://neon.tech):

1. Opret nyt projekt: **crm-x-prod** (region Frankfurt, eu-central-1)
2. Under "Connection Details" — kopier **to** strings:
   - **Pooled connection string** (med `?pgbouncer=true&connect_timeout=15`) → bliver `DATABASE_URL`
   - **Direct connection string** (uden pooler) → bliver `DIRECT_URL`
3. Aktivér PITR backup under "Settings" (Pro plan giver 30 dages restore)

**Kør første migration:**

På din lokale maskine, med Neon-credentials i `.env.local`:

```bash
npx prisma db push        # Opret alle tabeller
npx prisma generate       # Klient til dev
npm run db:seed           # Seed super-admin + demo tenant
```

## 3. Importér til Vercel

På [vercel.com/new](https://vercel.com/new):

1. **Import Git Repository** → vælg `plesner-tech/crm-x`
2. Framework: **Next.js** (auto-detekteres)
3. Build command: lader vi som er (`vercel.json` overstyrer til `prisma generate && next build`)
4. Root directory: `./` (default)
5. **Klik IKKE Deploy endnu** — env vars først

## 4. Sæt environment variables i Vercel

Under **Project Settings → Environment Variables** tilføj alle disse (Production + Preview + Development):

| Navn | Værdi | Note |
|---|---|---|
| `DATABASE_URL` | (pooled Neon string) | Runtime queries |
| `DIRECT_URL` | (direct Neon string) | Prisma migrations |
| `NEXTAUTH_SECRET` | (32 bytes random) | `openssl rand -base64 32` |
| `AUTH_SECRET` | (samme som ovenfor) | Bagudkompat |
| `NEXTAUTH_URL` | `https://plesnertech.dk` | Produktion |
| `RESEND_API_KEY` | (live Resend key) | Mail-afsendelse |
| `RESEND_FROM_EMAIL` | `noreply@plesnertech.dk` | Skal være verifieret |
| `NEXT_PUBLIC_ROOT_DOMAIN` | `plesnertech.dk` | Subdomæne-routing |
| `NEXT_PUBLIC_APP_URL` | `https://plesnertech.dk` | QR-koder + links |
| `SUPER_ADMIN_EMAIL` | `jens@plesnertech.dk` | Seed-konto |
| `SUPER_ADMIN_PASSWORD` | (stærkt password — IKKE default!) | Seed-konto |
| `MFA_ENCRYPTION_KEY` | (32 bytes random base64) | TOTP-secrets |
| `BLOB_READ_WRITE_TOKEN` | (kommer fra Vercel Storage) | Se trin 6 |

**KRITISK:** Genér unikke værdier for `NEXTAUTH_SECRET`, `SUPER_ADMIN_PASSWORD` og `MFA_ENCRYPTION_KEY`. Brug **aldrig** default-værdier i prod.

## 5. Første deploy

Klik **Deploy**.

Bygge-output skulle vise:
```
✔ Generated Prisma Client (v6.x.x) to node_modules/@prisma/client
✔ Compiled successfully
✔ Building... done
```

Hvis Prisma fejler med "binary not found", verificér at `schema.prisma` har:

```prisma
generator client {
  provider      = "prisma-client-js"
  binaryTargets = ["native", "debian-openssl-3.0.x", "rhel-openssl-3.0.x"]
}
```

(Allerede sat — se `prisma/schema.prisma:5`.)

## 6. Vercel Blob (fil-upload)

Under **Storage → Create Database → Blob**:

1. Opret en Blob store, navngiv den `crm-x-files`
2. Vercel sætter automatisk `BLOB_READ_WRITE_TOKEN` ind på dit projekt
3. Re-deploy hvis env'en kom efter første build

## 7. Custom domain + wildcard subdomæner

Under **Project Settings → Domains** tilføj:

1. `plesnertech.dk` (apex) — landing/login
2. `*.plesnertech.dk` (wildcard) — alle kunde-tenants + crmadmin

**DNS-records hos din registrar:**

| Type | Navn | Værdi |
|---|---|---|
| A | `@` | `76.76.21.21` (Vercel anycast) |
| CNAME | `*` | `cname.vercel-dns.com` |

**Vigtig:** Wildcard SSL kan tage op til 24 timer at provisione hos Vercel. Indtil da fejler nye subdomæner.

Verificér efter provisioneringen:

- `https://plesnertech.dk` → landing
- `https://crmadmin.plesnertech.dk` → admin login
- `https://demo.plesnertech.dk` → kunde-demo (efter seed)

## 8. Post-deploy verification

```
✅ https://plesnertech.dk → renderer landing-side uden fejl
✅ https://plesnertech.dk/login → workspace + email + password
✅ Login som super_admin på crmadmin → /admin dashboard
✅ /admin/tenants viser demo-tenant
✅ /admin/audit viser dit login-event
✅ Opret test-tenant via wizard → kommer i listen
✅ Modtag invite-mail (tjek Resend logs)
✅ Test impersonation — banner vises, audit logges
✅ Eksporter test-tenant → JSON downloades
✅ /api/v1/companies med Bearer-token → 200 + data
✅ Sub-processors public-side renderer på /legal/subprocessors
```

## 9. Hardening efter første deploy

I rækkefølge:

1. **Skift super-admin password** via admin-UI (ikke kun env)
2. **Aktivér MFA på super-admin** — admin-portal → indstillinger → MFA
3. **IP-allowlisting på crmadmin** — Vercel Pro har Firewall, sæt regel der kun accepterer Plesner Techs IP-range
4. **Skift trial-length** hvis I vil have anden periode (kode: `lib/plans.ts:TRIAL_LENGTH_DAYS`)
5. **Sæt op log-aggregation** — Vercel Logs → Datadog/Logflare integration
6. **Aktivér Vercel DDoS Protection** under Project Settings
7. **Tilføj sikkerheds-monitoring** — opsæt mailalert ved `> 50 failed_logins / time`
8. **Stripe-integration** for billing (i Fase 3, ikke i nuværende kode)

## 10. Cron jobs

`vercel.json` har én cron registreret:

```json
"crons": [
  { "path": "/api/cron/notifications", "schedule": "0 7 * * *" }
]
```

Daglig kl. 07:00 UTC checker den for licens-udløb, klippekort-advarsler osv. Tilføj flere ved behov:

| Sti | Schedule | Formål |
|---|---|---|
| `/api/cron/notifications` | `0 7 * * *` | Daglige advarsler (✓ aktiv) |
| `/api/cron/trial-expiry` | `0 8 * * *` | Suspender udløbne trials |
| `/api/cron/scheduled-deletion` | `0 9 * * *` | Hard-purge tenants efter 60d cooldown |
| `/api/cron/retention` | `0 3 * * 0` | Slet audit-rows > 13 mdr. |

**Bemærk:** Vercel Hobby-tier har max 2 crons. Pro tillader 40.

## 11. Hvad gør jeg ved fejl i prod?

| Fejl | Hvor kigger jeg | Hvad gør jeg |
|---|---|---|
| 500 på login | Vercel Logs (Functions) | Tjek `lib/auth.ts` errors |
| Prisma "binary not found" | Build logs | Tilføj `binaryTargets` (allerede sat) |
| Mail kommer ikke frem | Resend dashboard | Verificér afsender-domæne |
| Subdomæne giver 404 | Vercel Domains | Vent på SSL-provisionering, tjek DNS |
| "Kunde kan se admin" | `docs/security.md` | Det kan de ikke — verificér med test 1-5 |

## 12. Rollback

Hvis et deploy går galt:

1. Vercel Dashboard → Deployments
2. Find den sidste grønne deployment
3. Klik **"..." → Promote to Production**

Database-rollback (hvis schema-ændring brød noget):
1. Neon Dashboard → Branching
2. Restore til seneste PITR-snapshot
3. Re-deploy app

**Anbefalet workflow:** Brug Vercel Preview Deployments + Neon Branching for hver PR — så test du schema-ændringer i en isoleret kopi.

## 13. Klar-til-deploy checkliste

- [ ] Kode pushed til private GitHub repo
- [ ] `.gitignore` blokerer `.env` og `.env.local`
- [ ] Neon prod-database oprettet med PITR
- [ ] Resend setup med verifieret afsender
- [ ] DNS A + CNAME peger på Vercel
- [ ] Alle env vars sat i Vercel
- [ ] `prisma db push` kørt mod prod-database
- [ ] `npm run db:seed` kørt mod prod (med ANDET password end default)
- [ ] Første deploy bygger uden fejl
- [ ] Custom domain + wildcard provisionet (vent 24t)
- [ ] Post-deploy verification i sektion 8 gennemført
- [ ] MFA aktiveret på super-admin
- [ ] Sikkerhed-review (`docs/security.md`) gennemlæst af én anden

Når alle ✅: I kan onboarde første rigtige kunde.
