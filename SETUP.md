# CRM-X — Setup Guide
## Kom i gang på 10 minutter

---

## Trin 1: Klon og installer

```bash
# Klon projektet
git clone https://github.com/[din-bruger]/crm-x.git
cd crm-x

# Installer dependencies
npm install
```

---

## Trin 2: Opret database (Neon)

1. Gå til **neon.tech** → Opret gratis konto
2. Opret nyt projekt → Kald det `crm-x`
3. Kopiér **Connection string** (PostgreSQL URL)

---

## Trin 3: Konfigurér miljøvariabler

```bash
# Kopiér eksempel-filen
cp .env.example .env.local
```

Åbn `.env.local` og udfyld:

```
DATABASE_URL="din-neon-connection-string"
AUTH_SECRET="kør: openssl rand -base64 32"
NEXT_PUBLIC_ROOT_DOMAIN="plesnertech.dk"
```

---

## Trin 4: Opret database-tabeller

```bash
# Push schema til database
npm run db:push

# Generér Prisma client
npm run db:generate

# Seed med demo-data
npm run db:seed
```

---

## Trin 5: Start development server

```bash
npm run dev
```

Åbn **http://localhost:3000**

---

## Login

**Demo CRM (tilføj `?tenant=demo` i URL):**
- Email: `admin@demo.dk`
- Adgangskode: `Demo1234!`

**Super Admin:**
- URL: `http://localhost:3000/admin`
- Email: `jens@plesnertech.dk`
- Adgangskode: `SkiftMigStraks!`

---

## Trin 6: Deploy til Vercel

1. Push kode til GitHub
2. Gå til **vercel.com** → Import Git Repository
3. Tilføj environment variables (fra `.env.local`)
4. Deploy!

### DNS konfiguration (Simply)
Tilføj i Simply DNS-indstillinger:
```
Type: CNAME
Navn: *
Værdi: cname.vercel-dns.com
```

### Vercel Domain
I Vercel → Project → Settings → Domains:
```
Tilføj: *.plesnertech.dk
```

---

## Projektstruktur

```
crm-x/
├── app/
│   ├── (admin)/          # Super admin portal
│   ├── (auth)/           # Login sider
│   └── (tenant)/         # CRM tenant app
├── components/
│   └── layout/           # Sidebar, Topbar
├── lib/
│   ├── auth.ts           # NextAuth konfiguration
│   ├── db.ts             # Prisma client
│   ├── tenant.ts         # Tenant resolution
│   └── utils.ts          # Hjælpefunktioner
├── prisma/
│   ├── schema.prisma     # Database schema
│   └── seed.ts           # Demo data
└── middleware.ts          # Multi-tenant routing
```
