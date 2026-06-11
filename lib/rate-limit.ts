/**
 * CRM-X — Rate Limiting
 *
 * Compliance:
 *   - GDPR Art. 32 (Security)
 *   - ISO 27001 A.8.20 (Network security)
 *   - SOC 2 CC6.6 (Logical access — boundary protection)
 *
 * In-memory implementation. Egnet til single-instance dev og lav-trafik prod.
 * Ved horizontal scaling (multi-instance på Vercel) bør dette skiftes til
 * Upstash Redis eller Vercel KV — interface'et er bevidst holdt simpelt.
 */

interface Bucket {
  count: number;
  resetAt: number;
}

const buckets = new Map<string, Bucket>();

/**
 * Periodisk oprydning af udløbne buckets så Map ikke vokser uendeligt.
 * I serverless-miljø ryddes hukommelsen alligevel mellem invocations,
 * men dette holder dev-server slank.
 */
setInterval(() => {
  const now = Date.now();
  for (const [key, bucket] of buckets) {
    if (bucket.resetAt < now) buckets.delete(key);
  }
}, 60_000).unref?.();

export interface RateLimitResult {
  ok: boolean;
  remaining: number;
  resetAt: number;
  retryAfterSeconds?: number;
}

/**
 * Token-bucket rate limit.
 *
 * @param key   Unik nøgle, fx `login:${ip}` eller `password-reset:${email}`
 * @param limit Max requests i vinduet
 * @param windowMs Vinduets længde i ms
 */
export function rateLimit(
  key: string,
  limit: number,
  windowMs: number
): RateLimitResult {
  const now = Date.now();
  const existing = buckets.get(key);

  if (!existing || existing.resetAt < now) {
    buckets.set(key, { count: 1, resetAt: now + windowMs });
    return { ok: true, remaining: limit - 1, resetAt: now + windowMs };
  }

  if (existing.count >= limit) {
    return {
      ok: false,
      remaining: 0,
      resetAt: existing.resetAt,
      retryAfterSeconds: Math.ceil((existing.resetAt - now) / 1000),
    };
  }

  existing.count++;
  return {
    ok: true,
    remaining: limit - existing.count,
    resetAt: existing.resetAt,
  };
}

// Standard-policies — ét sted at justere
export const LIMITS = {
  login: { limit: 5, windowMs: 15 * 60 * 1000 },          // 5 forsøg / 15 min / IP
  passwordReset: { limit: 3, windowMs: 60 * 60 * 1000 },  // 3 / time / email
  apiGeneral: { limit: 100, windowMs: 60 * 1000 },        // 100 / min / bruger
  gdprExport: { limit: 5, windowMs: 60 * 60 * 1000 },     // 5 eksport / time / bruger
} as const;
