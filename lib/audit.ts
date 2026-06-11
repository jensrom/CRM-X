/**
 * CRM-X — Audit Log helper
 *
 * Compliance:
 *   - GDPR Art. 30 (Records of processing activities)
 *   - ISO 27001 A.8.15 (Logging), A.12.4 (Event logging)
 *   - SOC 2 CC7.2 (System monitoring), CC7.3 (Response to security events)
 *
 * Brug:
 *   await audit({ action: "create", resourceType: "company", resourceId: c.id, after: c });
 *
 * Logs er append-only — der findes ingen funktion til at slette eller opdatere dem.
 * Sletning sker udelukkende via retention-job (default: 13 mdr.).
 */
import { db } from "@/lib/db";
import { headers } from "next/headers";

/**
 * Lazy import af auth() for at undgå cirkulær import med lib/auth.ts.
 * (lib/auth.ts importerer audit, og audit ville importere auth → cycle).
 * Inde i NextAuth's `authorize()` callback er top-level imports tilbage
 * undefined ved første call — så lazy-import er en hård nødvendighed.
 */
async function getSessionSafe() {
  try {
    const { auth } = await import("@/lib/auth");
    return await auth().catch(() => null);
  } catch {
    return null;
  }
}

export type AuditAction =
  | "login_success"
  | "login_failed"
  | "logout"
  | "password_change"
  | "password_reset_requested"
  | "mfa_enable"
  | "mfa_disable"
  | "create"
  | "update"
  | "delete"
  | "soft_delete"
  | "restore"
  | "export"
  | "erase"           // GDPR Art. 17 (right to be forgotten)
  | "rectify"         // GDPR Art. 16 (right to rectification)
  | "access_request"  // GDPR Art. 15 (right of access)
  | "role_change"
  | "permission_change"
  | "tenant_create"
  | "tenant_suspend"
  | "tenant_activate"
  | "module_change"
  | "consent_given"
  | "consent_withdrawn"
  | "config_change";

export type AuditOutcome = "success" | "failure" | "denied";

export interface AuditEvent {
  action: AuditAction;
  resourceType: string;
  resourceId?: string | null;
  before?: unknown;
  after?: unknown;
  outcome?: AuditOutcome;
  message?: string;
  // Overrides — bruges kun når caller har info, sessionen ikke har
  // (fx login_failed hvor sessionen endnu ikke er etableret)
  actorIdOverride?: string | null;
  actorEmailOverride?: string | null;
  tenantIdOverride?: string | null;
}

/**
 * Skriver et audit event. Fejler stille — audit-fejl må aldrig blokere brugerens handling.
 *
 * IP og User-Agent læses fra request-headers via Next.js `headers()`.
 * Hvis kaldet sker udenfor en request (fx cron), bliver disse null.
 */
/**
 * Tjekker om alle aktør-felter er angivet som overrides.
 * Hvis ja, springer vi auth()-opslaget over — vigtigt inde i auth-flowet
 * hvor `auth()` ville være en re-entrance der kan hænge eller fejle.
 */
function hasFullActorOverride(e: AuditEvent): boolean {
  return (
    e.actorIdOverride !== undefined ||
    e.actorEmailOverride !== undefined ||
    e.tenantIdOverride !== undefined
  );
}

export async function audit(event: AuditEvent): Promise<void> {
  try {
    // Spring auth()-opslag over når caller har leveret override-felter.
    // Det forhindrer re-entrance i auth-flowet og er hurtigere generelt.
    const session = hasFullActorOverride(event)
      ? null
      : await getSessionSafe();

    let ipAddress: string | null = null;
    let userAgent: string | null = null;
    try {
      const h = await headers();
      // Vercel sætter x-forwarded-for. Tag første værdi (klientens reelle IP).
      const xff = h.get("x-forwarded-for");
      ipAddress = xff?.split(",")[0]?.trim() ?? h.get("x-real-ip") ?? null;
      userAgent = h.get("user-agent");
    } catch {
      // Udenfor request-kontekst (fx cron job)
    }

    await db.auditLog.create({
      data: {
        tenantId:
          event.tenantIdOverride !== undefined
            ? event.tenantIdOverride
            : session?.user?.tenantId ?? null,
        actorId:
          event.actorIdOverride !== undefined
            ? event.actorIdOverride
            : session?.user?.id ?? null,
        actorEmail:
          event.actorEmailOverride !== undefined
            ? event.actorEmailOverride
            : session?.user?.email ?? null,
        actorRole: session?.user?.role ?? null,
        action: event.action,
        resourceType: event.resourceType,
        resourceId: event.resourceId ?? null,
        before: event.before === undefined ? undefined : (event.before as object),
        after: event.after === undefined ? undefined : (event.after as object),
        ipAddress,
        userAgent,
        outcome: event.outcome ?? "success",
        message: event.message ?? null,
      },
    });
  } catch (err) {
    // Audit-fejl må ALDRIG kaste videre — det ville give brugeren en dårlig oplevelse
    // og potentielt skjule den oprindelige fejl. I produktion bør dette monitoreres
    // via separat error-tracking (Sentry).
    console.error("[audit] Failed to write audit log:", err);
  }
}

/**
 * Hjælper til at sammenligne to objekter og kun gemme ændrede felter.
 * Reducerer storage og gør audit-log lettere at læse.
 */
export function diff<T extends Record<string, unknown>>(
  before: T,
  after: T
): { before: Partial<T>; after: Partial<T> } | null {
  const beforeDelta: Partial<T> = {};
  const afterDelta: Partial<T> = {};
  let hasChanges = false;
  for (const key of Object.keys(after) as (keyof T)[]) {
    if (JSON.stringify(before[key]) !== JSON.stringify(after[key])) {
      beforeDelta[key] = before[key];
      afterDelta[key] = after[key];
      hasChanges = true;
    }
  }
  return hasChanges ? { before: beforeDelta, after: afterDelta } : null;
}

/**
 * Fjerner følsomme felter fra objekt før det gemmes i audit-log.
 * Vi vil ALDRIG gemme passwords, tokens, eller licens-nøgler i klartekst.
 */
const SENSITIVE_KEYS = new Set([
  "password",
  "passwordHash",
  "token",
  "refreshToken",
  "apiKey",
  "secret",
  "licenseKey",
  "encryptionKey",
]);

export function redact<T extends Record<string, unknown>>(obj: T | null | undefined): Partial<T> | null {
  if (!obj) return null;
  const cleaned: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(obj)) {
    if (SENSITIVE_KEYS.has(key)) {
      cleaned[key] = "[REDACTED]";
    } else {
      cleaned[key] = value;
    }
  }
  return cleaned as Partial<T>;
}
