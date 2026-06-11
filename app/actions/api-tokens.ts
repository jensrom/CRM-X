"use server";

/**
 * CRM-X — API token server actions
 *
 * Compliance:
 *   - Tokens hashes med SHA-256 før lagring (klartekst returneres kun én gang).
 *   - Token-format: "crm_" + 40 base32-tegn (~200 bits entropy).
 *   - Tilgang gated på Large-plan (samme tjek som /settings/api-siden).
 *   - Alle create/revoke audit-logges.
 */

import { db } from "@/lib/db";
import { auth } from "@/lib/auth";
import { audit } from "@/lib/audit";
import { revalidatePath } from "next/cache";
import crypto from "node:crypto";

const TOKEN_BYTES = 30; // 30 bytes → 48 base32-tegn; vi trimmer til 40
const TOKEN_PREFIX = "crm_";

function generateRawToken(): string {
  const raw = crypto.randomBytes(TOKEN_BYTES).toString("base64url").slice(0, 40);
  return `${TOKEN_PREFIX}${raw}`;
}

function hashToken(token: string): string {
  return crypto.createHash("sha256").update(token).digest("hex");
}

/**
 * Tjek om brugerens tenant må bruge API.
 * Pre-launch: kun Large har adgang.
 */
async function assertApiAccess(tenantId: string): Promise<void> {
  const tenant = await db.tenant.findUnique({
    where: { id: tenantId },
    select: { plan: true },
  });
  if (tenant?.plan !== "large") {
    throw new Error("API-adgang kræver Large-pakken");
  }
}

export interface CreateTokenInput {
  name: string;
  expiresAt?: string | null; // ISO-dato eller null for permanent
  scopes?: string[];
}

export interface CreateTokenResult {
  ok: boolean;
  /** Klartekst-token — returneres KUN én gang. */
  token?: string;
  tokenId?: string;
  error?: string;
}

export async function createApiToken(input: CreateTokenInput): Promise<CreateTokenResult> {
  const session = await auth();
  if (!session?.user?.tenantId) return { ok: false, error: "Ikke autoriseret" };
  const tenantId = session.user.tenantId;

  try {
    await assertApiAccess(tenantId);
  } catch (err: any) {
    return { ok: false, error: err.message };
  }

  const name = input.name?.trim();
  if (!name || name.length < 2) {
    return { ok: false, error: "Token-navn skal være mindst 2 tegn" };
  }

  const raw = generateRawToken();
  const tokenHash = hashToken(raw);
  const tokenPrefix = raw.slice(-4);

  const expiresAt = input.expiresAt ? new Date(input.expiresAt) : null;
  if (expiresAt && expiresAt < new Date()) {
    return { ok: false, error: "Udløbsdatoen skal være i fremtiden" };
  }

  const token = await (db as any).apiToken.create({
    data: {
      tenantId,
      name,
      tokenHash,
      tokenPrefix,
      scopes: input.scopes ?? ["read"],
      expiresAt,
      createdById: session.user.id ?? null,
    },
  });

  await audit({
    tenantId,
    actorId: session.user.id ?? null,
    actorEmail: session.user.email ?? null,
    action: "create",
    resourceType: "api_token",
    resourceId: token.id,
    message: `API-token "${name}" oprettet`,
  });

  revalidatePath("/settings/api");
  return { ok: true, token: raw, tokenId: token.id };
}

export async function revokeApiToken(tokenId: string): Promise<{ ok: boolean; error?: string }> {
  const session = await auth();
  if (!session?.user?.tenantId) return { ok: false, error: "Ikke autoriseret" };
  const tenantId = session.user.tenantId;

  // Soft-revoke (bevarer audit-trail)
  const existing = await (db as any).apiToken.findFirst({
    where: { id: tokenId, tenantId },
  });
  if (!existing) return { ok: false, error: "Token findes ikke" };

  await (db as any).apiToken.update({
    where: { id: tokenId },
    data: { isActive: false },
  });

  await audit({
    tenantId,
    actorId: session.user.id ?? null,
    actorEmail: session.user.email ?? null,
    action: "delete",
    resourceType: "api_token",
    resourceId: tokenId,
    message: `API-token "${existing.name}" tilbagekaldt`,
  });

  revalidatePath("/settings/api");
  return { ok: true };
}

/**
 * Verificér Bearer-token og returnér tenantId hvis gyldig.
 * Brugt af middleware på /api/v1/*-routes.
 */
export async function verifyApiToken(rawToken: string): Promise<{ tenantId: string; tokenId: string; scopes: string[] } | null> {
  if (!rawToken?.startsWith(TOKEN_PREFIX)) return null;
  const hash = hashToken(rawToken);

  const token = await (db as any).apiToken.findUnique({
    where: { tokenHash: hash },
    select: {
      id: true,
      tenantId: true,
      scopes: true,
      isActive: true,
      expiresAt: true,
    },
  });

  if (!token || !token.isActive) return null;
  if (token.expiresAt && new Date(token.expiresAt) < new Date()) return null;

  // Fire-and-forget update af lastUsedAt
  (db as any).apiToken.update({
    where: { id: token.id },
    data: { lastUsedAt: new Date() },
  }).catch(() => { /* don't block on telemetry */ });

  return {
    tenantId: token.tenantId,
    tokenId: token.id,
    scopes: token.scopes ?? ["read"],
  };
}
