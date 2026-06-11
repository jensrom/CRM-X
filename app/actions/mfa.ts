"use server";

/**
 * CRM-X — MFA Server Actions
 *
 * Flow:
 *   1. beginMfaSetup() — genererer secret + QR-URL, gemmer ENC-secret i DB (men ikke aktiveret)
 *   2. confirmMfaSetup(code) — verificer at brugeren faktisk har scannet QR'en,
 *      aktiver MFA og udlevér recovery codes (vises én gang)
 *   3. disableMfa(currentPassword) — fjern MFA efter password-bekræftelse
 */

import { db } from "@/lib/db";
import { auth } from "@/lib/auth";
import bcrypt from "bcryptjs";
import { revalidatePath } from "next/cache";
import {
  generateMfaSecret,
  buildOtpauthUrl,
  verifyTotp,
  generateRecoveryCodes,
  encryptSecret,
  decryptSecret,
} from "@/lib/mfa";
import { audit } from "@/lib/audit";

export interface MfaSetupResult {
  secret: string;      // base32 — vises kun i UI som backup hvis QR ikke kan scannes
  otpauthUrl: string;  // bruges til QR-kode
  accountLabel: string;
}

/** Trin 1: start MFA-setup. Brugeren scanner QR. Endnu IKKE aktiveret. */
export async function beginMfaSetup(): Promise<MfaSetupResult> {
  const session = await auth();
  if (!session?.user?.id) throw new Error("Ikke autoriseret");

  const user = await db.user.findUnique({
    where: { id: session.user.id },
    select: { id: true, email: true, name: true, mfaEnabled: true, tenant: { select: { slug: true } } },
  });
  if (!user) throw new Error("Bruger ikke fundet");
  if (user.mfaEnabled) throw new Error("MFA er allerede aktiveret");

  const secret = generateMfaSecret();
  const accountLabel = `${user.tenant.slug}/${user.email}`;
  const otpauthUrl = buildOtpauthUrl(secret, accountLabel);

  // Gem krypteret secret men hold mfaEnabled = false indtil confirmMfaSetup
  await db.user.update({
    where: { id: user.id },
    data: {
      mfaSecret: encryptSecret(secret),
      mfaEnabled: false,
      mfaEnrolledAt: null,
    } as any,
  });

  await audit({
    action: "mfa_enable",
    resourceType: "user",
    resourceId: user.id,
    message: "MFA setup initiated (secret generated, not yet activated)",
  });

  return { secret, otpauthUrl, accountLabel };
}

/** Trin 2: brugeren indtaster 6-cifret kode. Hvis OK → aktiver MFA + udlevér recovery codes. */
export async function confirmMfaSetup(code: string): Promise<{ recoveryCodes: string[] }> {
  const session = await auth();
  if (!session?.user?.id) throw new Error("Ikke autoriseret");

  const user = await db.user.findUnique({
    where: { id: session.user.id },
    select: { id: true, mfaSecret: true, mfaEnabled: true } as any,
  });
  if (!user || !(user as any).mfaSecret) throw new Error("Ingen MFA-setup i gang. Start forfra.");
  if ((user as any).mfaEnabled) throw new Error("MFA er allerede aktiveret");

  const secret = decryptSecret((user as any).mfaSecret as string);
  if (!verifyTotp(secret, code)) {
    await audit({
      action: "mfa_enable",
      resourceType: "user",
      resourceId: user.id,
      outcome: "failure",
      message: "Bad TOTP code at confirmation",
    });
    throw new Error("Forkert kode. Tjek tiden på din enhed og prøv igen.");
  }

  const { plain, hashes } = generateRecoveryCodes();

  await db.user.update({
    where: { id: user.id },
    data: {
      mfaEnabled: true,
      mfaEnrolledAt: new Date(),
      mfaRecoveryCodes: hashes,
    } as any,
  });

  await audit({
    action: "mfa_enable",
    resourceType: "user",
    resourceId: user.id,
    message: "MFA activated (TOTP confirmed, recovery codes issued)",
  });

  revalidatePath("/settings");
  return { recoveryCodes: plain };
}

/** Deaktiver MFA — kræver re-bekræftelse af adgangskoden. */
export async function disableMfa(currentPassword: string): Promise<void> {
  const session = await auth();
  if (!session?.user?.id) throw new Error("Ikke autoriseret");

  const user = await db.user.findUnique({
    where: { id: session.user.id },
    select: { id: true, password: true, mfaEnabled: true } as any,
  });
  if (!user || !(user as any).mfaEnabled) throw new Error("MFA er ikke aktiveret");

  const valid = await bcrypt.compare(currentPassword, (user as any).password);
  if (!valid) {
    await audit({
      action: "mfa_disable",
      resourceType: "user",
      resourceId: user.id,
      outcome: "denied",
      message: "Bad password at MFA disable",
    });
    throw new Error("Forkert adgangskode");
  }

  await db.user.update({
    where: { id: user.id },
    data: {
      mfaEnabled: false,
      mfaSecret: null,
      mfaRecoveryCodes: null,
      mfaEnrolledAt: null,
    } as any,
  });

  await audit({
    action: "mfa_disable",
    resourceType: "user",
    resourceId: user.id,
    message: "MFA disabled by user",
  });

  revalidatePath("/settings");
}

/** Probe: skal login-formularen vise MFA-felt for denne tenant+email-kombination? */
export async function userHasMfa(tenantSlug: string, email: string): Promise<boolean> {
  // Hint, ikke en autoritativ sikkerheds-grænse — bruges KUN til UI-flow.
  // Selve auth-check'et er stadig i lib/auth.ts.
  try {
    const tenant = await db.tenant.findUnique({
      where: { slug: tenantSlug, isActive: true },
      select: { id: true },
    });
    if (!tenant) return false;
    const user = await db.user.findUnique({
      where: { tenantId_email: { tenantId: tenant.id, email } },
      select: { mfaEnabled: true } as any,
    });
    return ((user as any)?.mfaEnabled) === true;
  } catch {
    return false;
  }
}
