/**
 * CRM-X — MFA (TOTP, RFC 6238)
 *
 * Compliance:
 *   - ISO 27001 A.8.5 (Secure authentication)
 *   - SOC 2 CC6.1 (Logical access)
 *   - GDPR Art. 32 (Security of processing)
 *
 * Implementation uden eksterne dependencies:
 *   - Base32-encode/decode af shared secret
 *   - HMAC-SHA1 baseret TOTP-generering
 *   - 30-sekunders vinduer med ±1 step drift-tolerance
 *
 * Secrets bør krypteres med en master-key inden de gemmes i DB.
 * Brug `encryptSecret`/`decryptSecret` herfra ved DB-skrivning/læsning.
 */

import crypto from "node:crypto";

const BASE32_ALPHABET = "ABCDEFGHIJKLMNOPQRSTUVWXYZ234567";

/** Generér en ny 20-byte (160-bit) TOTP secret som base32-streng. */
export function generateMfaSecret(): string {
  const bytes = crypto.randomBytes(20);
  return base32Encode(bytes);
}

/**
 * Returnér otpauth:// URL der kan kodes som QR.
 *
 * Format: otpauth://totp/CRM-X:{user}?secret=...&issuer=CRM-X
 */
export function buildOtpauthUrl(secret: string, accountLabel: string, issuer = "CRM-X"): string {
  const enc = encodeURIComponent;
  return `otpauth://totp/${enc(issuer)}:${enc(accountLabel)}?secret=${secret}&issuer=${enc(issuer)}&algorithm=SHA1&digits=6&period=30`;
}

/** Verificér en 6-cifret TOTP-kode med ±1 step drift-tolerance. */
export function verifyTotp(secret: string, code: string, window = 1): boolean {
  if (!secret || !code) return false;
  const cleaned = code.replace(/\s/g, "");
  if (!/^\d{6}$/.test(cleaned)) return false;

  const counter = Math.floor(Date.now() / 1000 / 30);
  for (let offset = -window; offset <= window; offset++) {
    const generated = generateTotp(secret, counter + offset);
    if (timingSafeEqualStr(generated, cleaned)) return true;
  }
  return false;
}

/**
 * Generér 10 recovery-codes (8 tegn hver). Returnér klartekst-koder OG hashes.
 * Klartekst vises ÉN gang til brugeren ved setup — derefter er kun hashes i DB.
 */
export function generateRecoveryCodes(): { plain: string[]; hashes: string[] } {
  const plain: string[] = [];
  const hashes: string[] = [];
  for (let i = 0; i < 10; i++) {
    const code = randomBase32(8);
    plain.push(code);
    // Brug SHA-256 her — bcrypt er overkill for 64-bit tilfældigt indhold
    // og recovery codes bruges sjældent.
    hashes.push(crypto.createHash("sha256").update(code).digest("hex"));
  }
  return { plain, hashes };
}

/** Tjek om en recovery-code matcher en af de gemte hashes. */
export function consumeRecoveryCode(submitted: string, hashes: string[]): { ok: boolean; remaining: string[] } {
  const cleaned = submitted.replace(/\s|-/g, "").toUpperCase();
  const hash = crypto.createHash("sha256").update(cleaned).digest("hex");
  const idx = hashes.indexOf(hash);
  if (idx === -1) return { ok: false, remaining: hashes };
  // Engangs-brug: fjern den brugte hash
  const remaining = [...hashes.slice(0, idx), ...hashes.slice(idx + 1)];
  return { ok: true, remaining };
}

// --- Encryption-at-rest for shared secret ---
//
// Secret krypteres med AES-256-GCM og en master-key fra env (MFA_ENCRYPTION_KEY).
// Format: iv (12 bytes) || tag (16 bytes) || ciphertext, base64-kodet.

function getMasterKey(): Buffer {
  const raw = process.env.MFA_ENCRYPTION_KEY;
  if (!raw) {
    throw new Error("MFA_ENCRYPTION_KEY env var er ikke sat. Generer med: openssl rand -base64 32");
  }
  const key = Buffer.from(raw, "base64");
  if (key.length !== 32) {
    throw new Error("MFA_ENCRYPTION_KEY skal være 32 bytes (base64 af 32 bytes random)");
  }
  return key;
}

export function encryptSecret(plaintext: string): string {
  const key = getMasterKey();
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv("aes-256-gcm", key, iv);
  const ct = Buffer.concat([cipher.update(plaintext, "utf8"), cipher.final()]);
  const tag = cipher.getAuthTag();
  return Buffer.concat([iv, tag, ct]).toString("base64");
}

export function decryptSecret(encoded: string): string {
  const key = getMasterKey();
  const buf = Buffer.from(encoded, "base64");
  const iv = buf.subarray(0, 12);
  const tag = buf.subarray(12, 28);
  const ct = buf.subarray(28);
  const decipher = crypto.createDecipheriv("aes-256-gcm", key, iv);
  decipher.setAuthTag(tag);
  return Buffer.concat([decipher.update(ct), decipher.final()]).toString("utf8");
}

// --- Internals ---

function generateTotp(secret: string, counter: number): string {
  const key = base32Decode(secret);
  const counterBuf = Buffer.alloc(8);
  counterBuf.writeBigUInt64BE(BigInt(counter));
  const hmac = crypto.createHmac("sha1", key).update(counterBuf).digest();
  const offset = hmac[hmac.length - 1] & 0xf;
  const bin =
    ((hmac[offset] & 0x7f) << 24) |
    ((hmac[offset + 1] & 0xff) << 16) |
    ((hmac[offset + 2] & 0xff) << 8) |
    (hmac[offset + 3] & 0xff);
  return String(bin % 1_000_000).padStart(6, "0");
}

function base32Encode(buf: Buffer): string {
  let bits = 0;
  let value = 0;
  let output = "";
  for (const byte of buf) {
    value = (value << 8) | byte;
    bits += 8;
    while (bits >= 5) {
      bits -= 5;
      output += BASE32_ALPHABET[(value >>> bits) & 0x1f];
    }
  }
  if (bits > 0) output += BASE32_ALPHABET[(value << (5 - bits)) & 0x1f];
  return output;
}

function base32Decode(s: string): Buffer {
  const cleaned = s.toUpperCase().replace(/=+$/, "").replace(/\s+/g, "");
  const out: number[] = [];
  let bits = 0;
  let value = 0;
  for (const ch of cleaned) {
    const idx = BASE32_ALPHABET.indexOf(ch);
    if (idx < 0) throw new Error("Invalid base32 character: " + ch);
    value = (value << 5) | idx;
    bits += 5;
    if (bits >= 8) {
      bits -= 8;
      out.push((value >>> bits) & 0xff);
    }
  }
  return Buffer.from(out);
}

function randomBase32(length: number): string {
  let s = "";
  const buf = crypto.randomBytes(length);
  for (const b of buf) s += BASE32_ALPHABET[b % 32];
  return s;
}

function timingSafeEqualStr(a: string, b: string): boolean {
  const aBuf = Buffer.from(a);
  const bBuf = Buffer.from(b);
  if (aBuf.length !== bBuf.length) return false;
  return crypto.timingSafeEqual(aBuf, bBuf);
}
