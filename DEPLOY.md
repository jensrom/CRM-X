# CRM-X Deploy Guide — plesnertech.dk

## 1. Prisma db:push (SKAL koeres paa din maskine)

```bash
npx prisma db push
npx prisma generate
```

De nye tabeller/felter der tilfojes:
- `hour_bundles`: number, name, @@unique([tenantId, number])
- `project_bundles`: ny junction-tabel
- `time_logs`: bundleId, deductedFromBundle
- `invoices` + `invoice_lines`: nye tabeller
- `tenants`: bundlePrefix, invoicePrefix
- Fjernet: `projects.hourBundleId`

---

## 2. Vercel — Environment Variables

Tilfoej disse i Vercel Dashboard → Project → Settings → Environment Variables:

| Variable                        | Value                                |
|---------------------------------|--------------------------------------|
| DATABASE_URL                    | postgresql://...?pgbouncer=true      |
| DIRECT_URL                      | postgresql://... (uden pgbouncer)    |
| AUTH_SECRET                     | openssl rand -base64 32              |
| NEXTAUTH_URL                    | https://app.plesnertech.dk           |
| NEXT_PUBLIC_ROOT_DOMAIN         | plesnertech.dk                       |
| NEXT_PUBLIC_APP_URL             | https://app.plesnertech.dk           |
| RESEND_API_KEY                  | re_xxxx                              |
| RESEND_FROM_EMAIL               | noreply@plesnertech.dk               |
| CRON_SECRET                     | openssl rand -base64 32              |

---

## 3. Vercel — Domains

I Vercel Dashboard → Project → Settings → Domains:

1. Tilfoej: `plesnertech.dk`
2. Tilfoej: `*.plesnertech.dk` (wildcard)
3. Tilfoej: `app.plesnertech.dk` (admin portal)

---

## 4. Simply.com DNS

Log ind paa Simply.com → Domains → plesnertech.dk → DNS

Tilfoej disse records:

```
Type   Navn        Vaerdi                          TTL
-----  ----------  ------------------------------  -------
CNAME  *           cname.vercel-dns.com            3600
CNAME  www         cname.vercel-dns.com            3600
A      @           76.76.21.21                     3600
```

> Wildcard `*` daekker alle subdomaener: firma1.plesnertech.dk, firma2.plesnertech.dk osv.

---

## 5. Vercel Build Settings

Allerede konfigureret i `vercel.json`:
- Build: `prisma generate && next build`
- Region: Frankfurt (fra1) — taettest paa DK
- Cron: `/api/cron/notifications` kl. 07:00 UTC dagligt

---

## 6. Initial Seed (foerste gang)

```bash
npx prisma db seed
```

Dette opretter super-admin brugeren fra `.env.local`:
- Email: `SUPER_ADMIN_EMAIL`
- Password: `SUPER_ADMIN_PASSWORD`

Skift kodeord straks via `/admin`.

---

## 7. Opret foerste tenant

1. Ga til `https://app.plesnertech.dk/admin`
2. Log ind som super admin
3. Klik "Nyt firma" → udfyld slug (fx `demo`)
4. Ga til `https://demo.plesnertech.dk`

---

## 8. Lokal udvikling

```bash
# Start dev server
npm run dev

# Simuler tenant lokalt (ingen subdomain lokalt)
http://localhost:3000?tenant=demo

# Database
npm run db:studio    # Prisma Studio GUI
npm run db:push      # Synkroniser schema
```
