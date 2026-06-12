import { NextRequest, NextResponse } from "next/server";

export const config = {
  matcher: [
    /*
     * Match alle paths undtagen:
     * - _next/static (statiske filer)
     * - _next/image (image optimization)
     * - favicon.ico
     * - public filer
     */
    "/((?!_next/static|_next/image|favicon.ico|.*\\..*|api/auth).*)",
  ],
};

export default function middleware(req: NextRequest) {
  const url = req.nextUrl.clone();
  const hostname = req.headers.get("host") || "";

  // Hent root domæne fra env (plesnertech.dk)
  const rootDomain = process.env.NEXT_PUBLIC_ROOT_DOMAIN || "plesnertech.dk";

  // Lokalt development: localhost:3000
  const isLocalhost =
    hostname === "localhost:3000" || hostname === "127.0.0.1:3000";

  // Ekstraher subdomain
  let subdomain: string | null = null;

  // Vercel preview/prod-aliaser (fx crm-x-eight.vercel.app) er IKKE tenant-slugs —
  // selv hvis NEXT_PUBLIC_ROOT_DOMAIN er fejlagtigt sat til "vercel.app" må vi ikke
  // tolke deployment-aliasset som en kunde-slug. Behandl som rod-domæne.
  const isVercelAlias = hostname.endsWith(".vercel.app");

  if (isLocalhost) {
    // Lokalt: brug query param ?tenant=xxx for at simulere subdomain
    subdomain = url.searchParams.get("tenant");
  } else if (isVercelAlias) {
    // Vercel-alias → ingen tenant fra hostnavnet. Brug evt. ?tenant=xxx i URL.
    subdomain = url.searchParams.get("tenant");
  } else {
    // Produktion: ekstraher subdomain fra hostname
    // fx "firma1.plesnertech.dk" → subdomain = "firma1"
    if (hostname.endsWith(`.${rootDomain}`)) {
      subdomain = hostname.replace(`.${rootDomain}`, "");
    }
  }

  // --- API v1 ---
  // /api/v1/* håndteres af route-handlers selv (Bearer-token via lib/api-auth).
  // Vi skipper subdomain-rewrite så pathname bevares 1:1.
  if (url.pathname.startsWith("/api/v1")) {
    return NextResponse.next();
  }

  // --- Admin portal ---
  // To indgange begge ender i /admin gruppen:
  //   1. crmadmin.plesnertech.dk (officielt — bruges af super_admins i prod)
  //   2. app.plesnertech.dk (legacy — bevares for bagudkompat)
  //   3. localhost?tenant=crmadmin (lokal udvikling)
  // Direkte /admin pathname kører som er.
  if (subdomain === "crmadmin" || subdomain === "app") {
    url.pathname = `/admin${url.pathname === "/" ? "" : url.pathname}`;
    return NextResponse.rewrite(url);
  }
  if (url.pathname.startsWith("/admin")) {
    return NextResponse.next();
  }

  // --- www eller root domæne ---
  if (!subdomain || subdomain === "www") {
    // Landing page
    return NextResponse.next();
  }

  // --- Tenant CRM ---
  // Indsæt tenant slug som header — læses i server components
  const response = NextResponse.rewrite(new URL(url.pathname, req.url));
  response.headers.set("x-tenant-slug", subdomain);
  return response;
}
