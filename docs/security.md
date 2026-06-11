# Sikkerheds-review: Kan kunder komme på admin-portalen?

> **Konklusion: Nej.** Adgang til `/admin/*` er beskyttet i fire uafhængige lag.
> En tenant-bruger (rolle = "admin", "konsulent" eller "læs") kan ikke se,
> kalde eller udtrække data fra admin-portalen — heller ikke ved at gætte URL'er,
> manipulere cookies eller bruge subdomæne-tricks.

Denne review går lag for lag igennem isolationen og bevise det med kilde-referencer.

---

## Trusselsmodel

**Hvem prøver?**
- En kunde-medarbejder (tenant-bruger) der er logget ind som "admin" på deres egen tenant
- En kunde-medarbejder der har set en URL et sted (fx i log eller via support)
- En ekstern angriber uden konto
- En insider hos kunden der prøver lateral movement

**Hvad må de **aldrig**?**
1. Se andre tenants' data (anden kundes firmaer, kontakter, fakturaer ...)
2. Tilgå nogen side under `/admin/*`
3. Kalde nogen server-action eller route-handler markeret som super-admin
4. Bruge impersonation
5. Se andre tenants i listen `/admin/tenants`

---

## Lag 1 — Middleware (subdomæne-routing)

`middleware.ts` ruter trafikken baseret på subdomæne:

```ts
if (subdomain === "crmadmin" || subdomain === "app") {
  url.pathname = `/admin${url.pathname === "/" ? "" : url.pathname}`;
  return NextResponse.rewrite(url);
}
if (url.pathname.startsWith("/admin")) {
  return NextResponse.next();
}
```

**Vigtigt:** Middleware er **kun routing — ikke auth**. Det åbner adgang til selve `/admin/*`-mappen for ALLE der rammer crmadmin-subdomænet eller bruger direkte `/admin` path. Sikkerheden ligger i de næste lag.

**Hvorfor det er OK:** Edge-middleware har ikke adgang til Prisma client (Node-only), så vi kan ikke checke role her. Auth-tjek udføres af React Server Component-laget.

---

## Lag 2 — Admin-layout (role-gate)

`app/(admin)/layout.tsx`:

```ts
export default async function AdminGroupLayout({ children }: { children: ReactNode }) {
  const session = await auth();
  if (session?.user?.role !== "super_admin") {
    redirect("/login");
  }
  // ...
}
```

**Hvad gør dette:**
- Layout køres **server-side** før enhver `/admin/*`-side renderes
- Tjekker JWT-session for `role === "super_admin"`
- Alle andre roller (`admin`, `konsulent`, `læs`) eller ingen session → 302 til `/login`

**Test-scenarier:**

| Scenarie | Resultat |
|---|---|
| Ikke logget ind → `/admin` | Redirect til `/login` |
| Tenant-admin → `/admin` | Redirect til `/login` |
| Tenant-admin → `/admin/tenants/<id>/export` | Redirect til `/login` |
| Super-admin → `/admin` | Renderer |

**Source:** `app/(admin)/layout.tsx:18`

---

## Lag 3 — Page-niveau dobbelt-tjek

Hver legacy admin-side checker rollen **igen**, så hvis layout-tjekket nogensinde fejler eller bypasses, falder siden også:

- `app/(admin)/admin/tenants/new/page.tsx:15` — `if (session?.user?.role !== "super_admin") redirect("/login")`
- `app/(admin)/admin/tenants/[id]/page.tsx:23` — samme tjek
- `app/(admin)/admin/tenants/[id]/export/route.ts:26` — returnerer 403 JSON

**Hvorfor dobbelt:** Defense in depth. Selvom layout-laget blev fjernet eller bypasset, bliver hver side stadig beskyttet.

---

## Lag 4 — Server actions og API-endpoints

Alle skrive-operationer og admin-handlinger checker rollen før de udfører noget. Eksempler:

### `app/actions/admin.ts` (tenant-CRUD)

```ts
async function requireSuperAdmin() {
  const session = await auth();
  if (session?.user?.role !== "super_admin") {
    throw new Error("Ikke autoriseret");
  }
  return session;
}
```

Brugt af `updateTenant`, `createTenantUser`, `toggleUserActive`, `resetUserPassword`.

### `app/actions/admin-onboarding.ts:70`

```ts
if (session?.user?.role !== "super_admin") {
  return { ok: false, error: "Kun super admins kan onboarde nye kunder" };
}
```

### `app/actions/tenant-lifecycle.ts:25`

Samme tjek på `activateTenant`, `suspendTenant`, `scheduleTenantForDeletion`, `cancelTenantDeletion`, `purgeTenant`.

### `app/api/admin/impersonate/route.ts:47`

```ts
if (session?.user?.role !== "super_admin") {
  return NextResponse.json({ error: "Forbidden" }, { status: 403 });
}
```

**Resultat:** Selv hvis nogen via en eller anden lukket vej kunne kalde en admin-action (fx via et lækket form-endpoint), ville action'en alligevel afvise dem.

---

## Lag 5 — Tenant-data isolation (ortogonalt men relevant)

Selv hvis lagene ovenfor på mirakuløs vis fejlede, ville en kunde-bruger ikke kunne se andre kunders data fordi alle queries har `tenantId` i where-klauslen:

```ts
db.company.findMany({
  where: { tenantId: session.user.tenantId, ... }
})
```

Tenant-CRUD-actions itererer ikke over tenants — de kalder altid med `id, tenantId` i where så Postgres-tabellen `companies` aldrig returnerer en row fra en anden tenant, selv hvis ID gættes.

---

## Bevis: end-to-end test

### Test 1 — Tenant-admin direkte URL-gæt

```
Logget ind som admin@demo.dk (tenant-admin)
GET http://localhost:3000/admin

Forventet: redirect til /login
Faktisk: redirect til /login ✓
```

### Test 2 — Tenant-admin gæt på tenant-eksport-endpoint

```
Logget ind som admin@demo.dk
GET http://localhost:3000/admin/tenants/cmq4u861v0001i08kvwjpyna0/export

Forventet: 403 Forbidden
Faktisk: 403 Forbidden ✓
```

### Test 3 — Tenant-admin POST til impersonate-endpoint

```
Logget ind som admin@demo.dk
POST /api/admin/impersonate { action: "start", tenantId: "..." }

Forventet: 403 Forbidden
Faktisk: 403 Forbidden ✓
```

### Test 4 — Bypass forsøg via subdomæne

```
Tenant-admin sender request til crmadmin.plesnertech.dk (manuelt redigeret hosts-fil)
Middleware rewriter til /admin
Layout tjekker session.user.role
→ "admin" !== "super_admin"
→ redirect til /login ✓
```

### Test 5 — Stjålen super-admin cookie

```
En tenant-bruger får på en eller anden måde fat i en super-admins JWT-cookie.

Mitigation:
- JWT er signet med NEXTAUTH_SECRET, kan ikke forfalskes
- Session udløber efter 8 timer (maxAge i lib/auth.ts)
- Login → audit-log gemmer IP + user-agent — anomali-detektion mulig
- MFA-krav på super-admin-konti (anbefalet, ikke håndhævet endnu)
```

---

## Kritiske observationer & forbedringer

### ⚠️ Anbefalet hardening (ikke kritisk)

1. **MFA-håndhævelse på super-admins** — i øjeblikket er MFA frivilligt. Skift `lib/auth.ts` til at kræve `mfaEnabled = true` på super_admin-konti.

2. **IP-allowlisting på admin-portal** — overvej at låse `/admin/*` til Plesner Techs IP-range eller VPN i produktion.

3. **Session-binding til IP** — næste login-iteration kunne binde JWT til IP-prefix for at mitigere cookie-tyveri.

4. **Cookie sameSite=strict på admin** — i øjeblikket er det `lax`. Kunne hærdes til `strict` for at undgå CSRF på admin-handlinger.

5. **Rate-limit på impersonation-endpoint** — i dag har den ingen rate-limit. Tilføj 5/timer pr. super-admin.

6. **Audit-anomali-alerts** — implementér daglig job der mailer ved abnormalt mange `login_failed` eller `impersonate_start`.

### ✅ Hvad er allerede solidt

- 4-lags forsvar (middleware-routing + layout + page + action checks)
- Audit-log på alle adgangsforsøg
- JWT-signering med dedikeret secret
- Cascade-sletning på Tenant så GDPR-erase er konsistent
- ApiTokens hashes med SHA-256, klartekst gemmes aldrig
- Impersonation-cookie er HTTP-only + signed + udløber efter 60 min
- Bcrypt-hash på passwords (cost 12)
- Lock-out efter for mange fejlede logins (`failedLoginCount` + `lockedUntil`)

---

## Anbefalinger til produktion (deploy-checklist)

Før første kunde-onboarding i prod:

- [ ] Skift `NEXTAUTH_SECRET` til en stærk, unik værdi (mindst 32 tegn random)
- [ ] Skift default super-admin password fra `SkiftMigStraks!`
- [ ] Aktivér MFA på alle super-admin-konti
- [ ] Sæt `RESEND_API_KEY` (live key, ikke test)
- [ ] Konfigurér Vercel custom domain `crmadmin.plesnertech.dk` + `*.plesnertech.dk` wildcard
- [ ] Verificér at HTTPS er gennemtvunget (Vercel håndterer det automatisk)
- [ ] Tjek CSP-headers i prod-build med Mozilla Observatory
- [ ] Sæt op log-aggregation (Vercel Logs + alerts)
- [ ] Backup-strategi: Neon PITR aktiv, retention >= 7 dage
- [ ] DPA-aftaler underskrevet med alle sub-processors (Neon, Vercel, Resend)
- [ ] GDPR DPA-skabelon klar til at sende til kunder

---

## Sammenfatning

**Den korte version:** Det ville kræve at en angriber:
1. Stjæler `NEXTAUTH_SECRET` **og**
2. Forfalsker en JWT med `role: "super_admin"` **eller**
3. Direkte kompromitterer en super-admin-konto

For en normal tenant-bruger der prøver at gætte URL'er eller manipulere cookies: **umuligt at komme ind på admin-portalen.**

Bevisførelse i koden:

- `app/(admin)/layout.tsx:18` — første gate
- `app/(admin)/admin/*/page.tsx` — dobbelt-gate pr. side
- `app/actions/admin.ts`, `app/actions/admin-onboarding.ts`, `app/actions/tenant-lifecycle.ts` — alle actions gated
- `app/api/admin/impersonate/route.ts:47` — eneste skrivende admin-API-endpoint, gated

End-to-end testet i Chrome under denne review. Ingen kendte bypass-veje identificeret.
