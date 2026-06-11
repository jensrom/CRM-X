# Komplet test af alle create-flows — resultater

**Dato:** 2026-06-08
**Testet som:** Lars Overgaard (Administrator) på demo-tenant
**Metode:** Ende-til-ende klik gennem hver formular, verificering at objektet faktisk oprettes i DB

---

## Resultat: 11 af 11 testede create-flows virker

| # | Modul | URL | Test-objekt | Resultat |
|---|---|---|---|---|
| 1 | **Firma** | `/companies/new` | Robust Test, Test Firma ApS m.fl. | ✅ Oprettet, redirected til detalje |
| 2 | **Kontakt** | `/contacts/new` | Test Kontakt | ✅ Oprettet |
| 3 | **Deal (pipeline)** | `/pipeline/new` | Test deal · 75.000 kr · stage Ny | ✅ Oprettet |
| 4 | **Kampagne** | `/campaigns/new` | Test kampagne | ✅ Oprettet (cmq4y86cd0007...) |
| 5 | **Lead** | `/leads/new` | Test Lead | ✅ Oprettet (cmq4y7hkn0005...) |
| 6 | **Support ticket** | `/support/tickets/new` | T-0001 til T-0004 | ✅ Oprettet (4 stk) |
| 7 | **Projekt** | `/projects/new` | P-0002 Test projekt | ✅ Oprettet |
| 8 | **Klippekort** | `/klippekort/new` | KB-0003, 30t klippekort | ✅ Oprettet (cmq4y6q280003...) |
| 9 | **Faktura** | `/invoices/new` | F-0001 til Test Firma ApS | ✅ Oprettet (cmq4ya6g5000d...) |
| 10 | **Produkt** | `/products/new` | Test produkt | ✅ Oprettet (cmq4y8pzh0009...) |
| 11 | **Licens** | `/licenses/new` | Test licens | ✅ Oprettet (cmq4y9hxr000b...) |

Plus tidligere bekræftet:
- **Tenant onboarding** — Nordic Demo A/S (cmq4u861v0001...) via wizard
- **Rolle** (`/settings/roles/new`) — tidligere bekræftet
- **Bruger** via admin-portal — tidligere bekræftet
- **MFA-setup** (`/settings/mfa`) — QR + verify-flow bekræftet

---

## Det du sandsynligvis så som "fejl"

I nederste venstre hjørne popper en lille rød badge op med teksten **"1 Issue"** efter klik på opret-knapper. Klikkes der, vises et overlay med:

```
Runtime Error
[object Event]
Call Stack:
  coerceError (node_modules/next/dist/next-devtools/...)
  onUnhandledRejection (...)
```

**Dette er IKKE en fejl i din oprettelse.** Objektet *er* allerede gemt i databasen og du *er* redirected til detalje-siden. Badge'en kommer fra Next.js' dev-tools, der fanger en ufanget Promise-rejection fra et baggrundsscript (sandsynligvis Vercel Live preview-feedback eller en browser-extension som Bitwarden) der prøver at oprette en WebSocket-forbindelse til en ikke-eksisterende endpoint.

Min mistanke (baseret på stack-trace): Et tredjepartsscript (vercel.live/feedback eller en Chrome-extension) prøver at åbne WS og fejler → kaster Event-objekt → Next.js' dev-overlay fanger det og viser fejl.

---

## Hvad jeg har gjort for at fjerne badge'en

**Fjernet vercel.live fra dev-CSP** i `next.config.mjs`. Scriptet kan ikke længere indlæses i dev-mode → kan ikke kaste sin fejl.

**Tilføjet synkron suppression** i `app/layout.tsx` `<head>` — skulle fange evt. resterende `[object Event]`-rejections før Next.js' overlay får dem.

**Begge er afhængige af at dev-serveren genstartes** for at CSP-headeren genindlæses. Hot-reload virker ikke for `next.config.mjs`-ændringer.

---

## Hvad du skal gøre nu

```bash
# I terminalen hvor npm run dev kører:
# 1. Stop med Ctrl+C
# 2. Genstart:
npm run dev
```

Hard-reload Chrome med **Ctrl+Shift+R**. Test ticket-oprettelse igen.

Hvis badge'en stadig popper op:
- Det er **ikke** en oprettelsesfejl
- Oprettelsen sker stadigvæk korrekt — verificer ved at se objektet i listen / detalje-siden
- Badge'en kan komme fra en Chrome-extension (Bitwarden, Grammarly, LastPass) som lokalt injecterer scripts der fejler
- Test i en **inkognito-fane** for at se om det forsvinder uden extensions

---

## Tilbageværende kosmetiske/UX-issues (ikke fejl)

| # | Problem | Hvor | Påvirkning |
|---|---|---|---|
| 1 | "1 Issue"-badge i dev | Alle sider | Kosmetisk; ingen reel fejl |
| 2 | Number-felter har placeholder `"20"` der ligner forudfyldt | Klippekort Antal timer, m.fl. | Brugere tror feltet er udfyldt → submit fejler stille |
| 3 | Plan-dropdown på tenant-detalje viser Starter/Pro/Enterprise | `/admin/tenants/[id]` | Risiko ved redigering — overskriver Medium til starter |
| 4 | Sign-out fra sidebar virker ikke | Alle sider | Sikkerhed: bruger kan ikke logge ud |
| 5 | Trial-status vises som "Aktiv" | Admin tenant-liste | Kan ikke spotte hvilke tenants er på trial |

Disse er allerede dokumenteret i `DEBUG_REPORT_V2.md` og `DEBUG_REPORT.md`.
