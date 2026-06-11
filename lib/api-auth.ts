/**
 * CRM-X — API v1 Bearer-token auth helper
 *
 * Brug i hver /api/v1/* route-handler:
 *
 *   import { authenticateApiRequest } from "@/lib/api-auth";
 *
 *   export async function GET(req: Request) {
 *     const auth = await authenticateApiRequest(req);
 *     if (auth.error) return auth.error;
 *     // auth.tenantId og auth.scopes er nu tilgængelige
 *   }
 *
 * Returnerer enten et godkendt context-objekt eller en færdig NextResponse
 * med 401/403, så route-handleren bare kan returnere den direkte.
 */

import { NextResponse } from "next/server";
import { verifyApiToken } from "@/app/actions/api-tokens";

export type AuthResult =
  | { ok: true; tenantId: string; tokenId: string; scopes: string[]; error?: never }
  | { ok: false; error: NextResponse; tenantId?: never; tokenId?: never; scopes?: never };

function unauthorized(message: string): NextResponse {
  return NextResponse.json(
    { error: "unauthorized", message },
    { status: 401, headers: { "WWW-Authenticate": 'Bearer realm="api"' } }
  );
}

function forbidden(message: string): NextResponse {
  return NextResponse.json({ error: "forbidden", message }, { status: 403 });
}

export async function authenticateApiRequest(req: Request, requiredScope: "read" | "write" = "read"): Promise<AuthResult> {
  const header = req.headers.get("authorization");
  if (!header) return { ok: false, error: unauthorized("Manglende Authorization-header") };

  const match = /^Bearer\s+(.+)$/i.exec(header.trim());
  if (!match) return { ok: false, error: unauthorized("Forventet 'Bearer <token>'") };

  const token = match[1];
  const verified = await verifyApiToken(token);
  if (!verified) return { ok: false, error: unauthorized("Ugyldig eller udløbet token") };

  if (!verified.scopes.includes(requiredScope) && !verified.scopes.includes("write")) {
    return { ok: false, error: forbidden(`Token mangler scope: ${requiredScope}`) };
  }

  return { ok: true, tenantId: verified.tenantId, tokenId: verified.tokenId, scopes: verified.scopes };
}
