"use server";

/**
 * CRM-X — Klippekort-pristabel
 *
 * Pr. tenant defineres et antal pris-tiers (volumen-trin) der bestemmer
 * timepris baseret på antal timer i klippekortet. Bruges til at auto-udfylde
 * pris-feltet i opret-formularen.
 */

import { db } from "@/lib/db";
import { auth } from "@/lib/auth";
import { audit } from "@/lib/audit";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { DEFAULT_BUNDLE_HOURLY_RATE, DEFAULT_BUNDLE_LABEL } from "@/lib/bundle-pricing-config";

async function requireAdmin() {
  const session = await auth();
  if (!session?.user?.tenantId) throw new Error("Ikke autoriseret");
  const role = (session.user.role ?? "").toLowerCase();
  if (role !== "super_admin" && role !== "admin" && role !== "administrator") {
    throw new Error("Kun administrator kan ændre klippekort-priser");
  }
  return session;
}

const tierSchema = z.object({
  minHours: z.number().int().min(1).max(10000),
  hourlyRate: z.number().min(0).max(100000),
  label: z.string().max(60).nullable().optional(),
});

export async function getBundlePricingTiers() {
  const session = await auth();
  if (!session?.user?.tenantId) return [];
  return db.bundlePricingTier.findMany({
    where: { tenantId: session.user.tenantId },
    orderBy: { minHours: "asc" },
  });
}

/**
 * Find matchende tier for et givent antal timer.
 * Falder tilbage til DEFAULT_BUNDLE_HOURLY_RATE (1300 kr/t) hvis ingen tiers er konfigureret.
 */
export async function calculateBundlePrice(hours: number): Promise<{
  hourlyRate: number;
  total: number;
  tierLabel: string | null;
  isDefault: boolean;
}> {
  if (hours <= 0) {
    return {
      hourlyRate: DEFAULT_BUNDLE_HOURLY_RATE,
      total: 0,
      tierLabel: DEFAULT_BUNDLE_LABEL,
      isDefault: true,
    };
  }
  const session = await auth();
  if (!session?.user?.tenantId) {
    return {
      hourlyRate: DEFAULT_BUNDLE_HOURLY_RATE,
      total: Math.round(DEFAULT_BUNDLE_HOURLY_RATE * hours * 100) / 100,
      tierLabel: DEFAULT_BUNDLE_LABEL,
      isDefault: true,
    };
  }

  const tiers = await db.bundlePricingTier.findMany({
    where: { tenantId: session.user.tenantId, minHours: { lte: hours } },
    orderBy: { minHours: "desc" },
    take: 1,
  });

  if (tiers.length === 0) {
    return {
      hourlyRate: DEFAULT_BUNDLE_HOURLY_RATE,
      total: Math.round(DEFAULT_BUNDLE_HOURLY_RATE * hours * 100) / 100,
      tierLabel: DEFAULT_BUNDLE_LABEL,
      isDefault: true,
    };
  }

  const tier = tiers[0];
  const rate = Number(tier.hourlyRate);
  return {
    hourlyRate: rate,
    total: Math.round(rate * hours * 100) / 100,
    tierLabel: tier.label,
    isDefault: false,
  };
}

export async function createBundlePricingTier(formData: FormData) {
  const session = await requireAdmin();
  const tenantId = session.user.tenantId!;

  const parsed = tierSchema.safeParse({
    minHours: parseInt(formData.get("minHours") as string),
    hourlyRate: parseFloat(formData.get("hourlyRate") as string),
    label: (formData.get("label") as string) || null,
  });
  if (!parsed.success) {
    throw new Error(parsed.error.issues.map((i) => i.message).join(", "));
  }

  const tier = await db.bundlePricingTier.create({
    data: {
      tenantId,
      minHours: parsed.data.minHours,
      hourlyRate: parsed.data.hourlyRate,
      label: parsed.data.label,
    },
  });

  await audit({
    action: "create",
    resourceType: "bundle_pricing_tier",
    resourceId: tier.id,
    after: { minHours: tier.minHours, hourlyRate: Number(tier.hourlyRate), label: tier.label },
    message: `Pristier oprettet: ${tier.minHours}+ timer = ${Number(tier.hourlyRate)} kr/t`,
  });

  revalidatePath("/settings/pricing");
}

export async function updateBundlePricingTier(formData: FormData) {
  const session = await requireAdmin();
  const tenantId = session.user.tenantId!;
  const id = formData.get("id") as string;

  const parsed = tierSchema.safeParse({
    minHours: parseInt(formData.get("minHours") as string),
    hourlyRate: parseFloat(formData.get("hourlyRate") as string),
    label: (formData.get("label") as string) || null,
  });
  if (!parsed.success) {
    throw new Error(parsed.error.issues.map((i) => i.message).join(", "));
  }

  await db.bundlePricingTier.update({
    where: { id, tenantId },
    data: {
      minHours: parsed.data.minHours,
      hourlyRate: parsed.data.hourlyRate,
      label: parsed.data.label,
    },
  });

  await audit({
    action: "update",
    resourceType: "bundle_pricing_tier",
    resourceId: id,
    after: parsed.data,
  });

  revalidatePath("/settings/pricing");
}

export async function deleteBundlePricingTier(id: string) {
  const session = await requireAdmin();
  const tenantId = session.user.tenantId!;

  await db.bundlePricingTier.delete({ where: { id, tenantId } });

  await audit({
    action: "delete",
    resourceType: "bundle_pricing_tier",
    resourceId: id,
  });

  revalidatePath("/settings/pricing");
}
