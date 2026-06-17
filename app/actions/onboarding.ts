"use server";

/**
 * Onboarding-actions
 * ──────────────────
 * Gemmer hvert trin og marker'er onboarding som faerdig.
 *
 * Sikkerheds-aftaler:
 *   • Kun admin-roller maa updatere tenant
 *   • Felter valideres og tomme strings konverteres til null
 *   • Skip / complete saetter onboardingCompletedAt
 */

import { db } from "@/lib/db";
import { auth } from "@/lib/auth";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

async function requireAdmin() {
  const session = await auth();
  if (!session?.user?.tenantId) throw new Error("Ikke autoriseret");
  const role = (session.user.role ?? "").toLowerCase();
  if (!["admin", "administrator", "super_admin"].includes(role)) {
    throw new Error("Kun administrator kan ændre onboarding");
  }
  return { session, tenantId: session.user.tenantId };
}

/** Trin 2 — firma-stamdata */
export async function saveCompanyStep(formData: FormData) {
  const { tenantId } = await requireAdmin();

  await db.tenant.update({
    where: { id: tenantId },
    data: {
      cvr:        String(formData.get("cvr") ?? "") || null,
      industry:   String(formData.get("industry") ?? "") || null,
      address:    String(formData.get("address") ?? "") || null,
      zipCode:    String(formData.get("zipCode") ?? "") || null,
      city:       String(formData.get("city") ?? "") || null,
      website:    String(formData.get("website") ?? "") || null,
      employeeCount: String(formData.get("employeeCount") ?? "") || null,
      onboardingStep: "branding",
    },
  });

  revalidatePath("/onboarding");
  redirect("/onboarding/branding");
}

/** Trin 3 — branding + faktura-afsender */
export async function saveBrandingStep(formData: FormData) {
  const { tenantId } = await requireAdmin();

  await db.tenant.update({
    where: { id: tenantId },
    data: {
      logoUrl:          String(formData.get("logoUrl") ?? "") || null,
      accentColor:      String(formData.get("accentColor") ?? "") || null,
      welcomeMessage:   String(formData.get("welcomeMessage") ?? "") || null,
      invoiceCompanyName: String(formData.get("invoiceCompanyName") ?? "") || null,
      invoiceAddress:     String(formData.get("invoiceAddress") ?? "") || null,
      invoiceZipCity:     String(formData.get("invoiceZipCity") ?? "") || null,
      invoiceCvr:         String(formData.get("invoiceCvr") ?? "") || null,
      invoicePhone:       String(formData.get("invoicePhone") ?? "") || null,
      invoiceEmail:       String(formData.get("invoiceEmail") ?? "") || null,
      onboardingStep:     "team",
    },
  });

  revalidatePath("/onboarding");
  redirect("/onboarding/team");
}

/** Trin 4 — inviter team (selvstaendig action, kun marker step) */
export async function markTeamStepDone() {
  const { tenantId } = await requireAdmin();

  await db.tenant.update({
    where: { id: tenantId },
    data: { onboardingStep: "done" },
  });

  await completeOnboarding();
}

/** Marker onboarding som faerdig — bruges af "Faerdig"-knap og skip */
export async function completeOnboarding() {
  const { tenantId } = await requireAdmin();

  await db.tenant.update({
    where: { id: tenantId },
    data: {
      onboardingCompletedAt: new Date(),
      onboardingStep:        "done",
    },
  });

  revalidatePath("/dashboard");
  redirect("/dashboard");
}

/** Spring hele wizard'en over */
export async function skipOnboarding() {
  await completeOnboarding();
}
