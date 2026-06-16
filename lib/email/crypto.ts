/**
 * Symmetric encryption til OAuth-tokens + Resend API-keys.
 *
 * Vi bruger AES-256-GCM (auth-enkryptering: confidentiality + integrity).
 * Master-key tages fra env EMAIL_TOKEN_KEY (32 random bytes base64-encoded).
 *
 * Hvis EMAIL_TOKEN_KEY ikke er sat, falder vi tilbage til UDOKUMENTERET
 * lagring (klartekst) — det er KUN til lokal udvikling. Vi advarer ogsaa.
 *
 * Generer en stærk nøgle med:
 *   node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"
 */

import crypto from "node:crypto";

const ALG = "aes-256-gcm";
const IV_LEN = 12;   // recommended for GCM
const TAG_LEN = 16;

let warnedAboutMissingKey = false;

function getKey(): Buffer | null {
  const raw = process.env.EMAIL_TOKEN_KEY;
  if (!raw) {
    if (!warnedAboutMissingKey) {
      console.warn("[email/crypto] EMAIL_TOKEN_KEY ikke sat — tokens lagres i klartekst (KUN til lokal dev)");
      warnedAboutMissingKey = true;
    }
    return null;
  }
  const buf = Buffer.from(raw, "base64");
  if (buf.length !== 32) {
    throw new Error(`EMAIL_TOKEN_KEY skal vaere 32 bytes (base64). Faktisk: ${buf.length}`);
  }
  return buf;
}

export function encrypt(plaintext: string): string {
  const key = getKey();
  if (!key) return `plain:${plaintext}`; // fallback til dev

  const iv = crypto.randomBytes(IV_LEN);
  const cipher = crypto.createCipheriv(ALG, key, iv);
  const ciphertext = Buffer.concat([cipher.update(plaintext, "utf8"), cipher.final()]);
  const tag = cipher.getAuthTag();
  // Format: iv|tag|ciphertext, alt base64
  return [iv.toString("base64"), tag.toString("base64"), ciphertext.toString("base64")].join(".");
}

export function decrypt(encrypted: string): string {
  if (encrypted.startsWith("plain:")) {
    return encrypted.slice(6);
  }
  const key = getKey();
  if (!key) throw new Error("EMAIL_TOKEN_KEY ikke sat — kan ikke dekryptere lagrede tokens");

  const [ivB64, tagB64, ctB64] = encrypted.split(".");
  if (!ivB64 || !tagB64 || !ctB64) throw new Error("Ugyldigt token-format");

  const iv = Buffer.from(ivB64, "base64");
  const tag = Buffer.from(tagB64, "base64");
  const ct = Buffer.from(ctB64, "base64");

  const decipher = crypto.createDecipheriv(ALG, key, iv);
  decipher.setAuthTag(tag);
  const plaintext = Buffer.concat([decipher.update(ct), decipher.final()]);
  return plaintext.toString("utf8");
}
