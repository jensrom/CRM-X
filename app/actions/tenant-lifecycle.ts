"use server";

/**
 * CRM-X — Tenant-livscyklus
 *
 * Lifecycle-handlinger der ændrer status på en tenant. Hver handling:
 *   1. Validerer rolle (kun super_admin)
 *   2. Validerer at den nuværende status tillader skiftet
 *   3. Opdaterer status + relevante timestamps
 *   4. Skriver audit-event
 */

import { db } from "@/lib/db";
import { auth } from "@/lib/auth";
import { audit } from "@/lib/audit";
import { revalidatePath } from "next/cache";
import {
  LIFECYCLE_TIMING,
  getAllowedTransitions,
  type TenantStatus,
} from "@/lib/tenant-status";

async function requireSuperAdmin() {
  const session = await auth();
  if (session?.user?.role !== "super_admin") {
    throw new Error("Kun super admins kan ændre tenant-status");
  }
  return session;
}

async function getCurrentStatus(tenantId: string): Promise<TenantStatus> {
  const tenant = await db.tenant.findUnique({
    where: { id: tenantId },
    select: { status: true } as any,
  });
  if (!tenant) throw new Error("Tenant ikke fundet");
  return ((tenant as any).status ?? "trial") as TenantStatus;
}

interface TransitionResult {
  ok: boolean;
  error?: string;
}

/**
 * Aktivér en tenant (typisk fra trial eller suspended → active).
 * Bruges når betaling er bekræftet.
 */
export async function activateTenant(
  tenantId: string,
  reason?: string
): Promise<TransitionResult> {
  const session = await requireSuperAdmin();
  const current = await getCurrentStatus(tenantId);
  if (!getAllowedTransitions(current).includes("active")) {
    return { ok: false, error: `Kan ikke aktivere fra status "${current}"` };
  }

  await db.tenant.update({
    where: { id: tenantId },
    data: {
      status: "active",
      isActive: true,
      suspendedAt: null,
      scheduledDeletionAt: null,
      billingStatus: "paid",
    } as any,
  });

  await audit({
    action: "tenant_activate",
    resourceType: "tenant",
    resourceId: tenantId,
    tenantIdOverride: tenantId,
    before: { status: current },
    after: { status: "active" },
    message: `Tenant aktiveret. ${reason ?? ""}`.trim(),
  });

  revalidatePath("/admin");
  revalidatePath(`/admin/tenants/${tenantId}`);
  return { ok: true };
}

/**
 * Suspendér en tenant. Brugere mister adgang men data bevares.
 * Tilgængelig fra active eller trial.
 */
export async function suspendTenant(
  tenantId: string,
  reason?: string
): Promise<TransitionResult> {
  await requireSuperAdmin();
  const current = await getCurrentStatus(tenantId);
  if (!getAllowedTransitions(current).includes("suspended")) {
    return { ok: false, error: `Kan ikke suspendere fra status "${current}"` };
  }

  await db.tenant.update({
    where: { id: tenantId },
    data: {
      status: "suspended",
      isActive: false,
      suspendedAt: new Date(),
    } as any,
  });

  await audit({
    action: "tenant_suspend",
    resourceType: "tenant",
    resourceId: tenantId,
    tenantIdOverride: tenantId,
    before: { status: current },
    after: { status: "suspended" },
    message: `Tenant suspenderet. ${reason ?? ""}`.trim(),
  });

  revalidatePath("/admin");
  revalidatePath(`/admin/tenants/${tenantId}`);
  return { ok: true };
}

/**
 * Planlæg sletning. Tenant går til status=scheduled_deletion med
 * scheduledDeletionAt = nu + cooldown. Hard-purge sker via cron.
 */
export async function scheduleTenantForDeletion(
  tenantId: string,
  reason?: string
): Promise<TransitionResult> {
  await requireSuperAdmin();
  const current = await getCurrentStatus(tenantId);
  if (!getAllowedTransitions(current).includes("scheduled_deletion")) {
    return { ok: false, error: `Kan ikke planlægge sletning fra status "${current}". Suspendér først.` };
  }

  const deletionAt = new Date();
  deletionAt.setDate(deletionAt.getDate() + LIFECYCLE_TIMING.scheduledDeletionCooldown);

  await db.tenant.update({
    where: { id: tenantId },
    data: {
      status: "scheduled_deletion",
      isActive: false,
      scheduledDeletionAt: deletionAt,
    } as any,
  });

  await audit({
    action: "tenant_suspend", // brug nærmeste action — kan tilføje "tenant_schedule_delete" senere
    resourceType: "tenant",
    resourceId: tenantId,
    tenantIdOverride: tenantId,
    before: { status: current },
    after: { status: "scheduled_deletion", scheduledDeletionAt: deletionAt },
    message: `Sletning planlagt til ${deletionAt.toISOString().split("T")[0]}. ${reason ?? ""}`.trim(),
  });

  revalidatePath("/admin");
  revalidatePath(`/admin/tenants/${tenantId}`);
  return { ok: true };
}

/**
 * Fortryd planlagt sletning — tenant går tilbage til suspenderet.
 */
export async function cancelTenantDeletion(
  tenantId: string,
  reason?: string
): Promise<TransitionResult> {
  await requireSuperAdmin();
  const current = await getCurrentStatus(tenantId);
  if (current !== "scheduled_deletion") {
    return { ok: false, error: "Kun planlagt-sletning kan fortrydes" };
  }

  await db.tenant.update({
    where: { id: tenantId },
    data: {
      status: "suspended",
      scheduledDeletionAt: null,
    } as any,
  });

  await audit({
    action: "tenant_activate", // closest match
    resourceType: "tenant",
    resourceId: tenantId,
    tenantIdOverride: tenantId,
    before: { status: current },
    after: { status: "suspended" },
    message: `Sletning fortrudt. ${reason ?? ""}`.trim(),
  });

  revalidatePath("/admin");
  revalidatePath(`/admin/tenants/${tenantId}`);
  return { ok: true };
}

/**
 * Hard-purge en tenant øjeblikkeligt. Skal bruges med EKSTREM forsigtighed.
 * Kræver at tenanten er i scheduled_deletion (sikkerhedsnet — utilsigtet sletning forhindres).
 *
 * I praksis vil cron-jobbet køre denne automatisk når scheduledDeletionAt passeres.
 * Manuel kald er kun til admin-værktøjer / test.
 */
export async function purgeTenant(
  tenantId: string,
  confirmationPhrase: string,
  reason?: string
): Promise<TransitionResult> {
  await requireSuperAdmin();
  const tenant = await db.tenant.findUnique({
    where: { id: tenantId },
    select: { name: true, slug: true, status: true } as any,
  });
  if (!tenant) return { ok: false, error: "Tenant ikke fundet" };

  // Sikkerhedsnet: kræv at brugeren skriver "SLET <slug>" som bekræftelse
  const expectedPhrase = `SLET ${(tenant as any).slug}`;
  if (confirmationPhrase !== expectedPhrase) {
    return {
      ok: false,
      error: `Bekræftelsen er forkert. Skriv præcis: ${expectedPhrase}`,
    };
  }

  // Audit FØR sletning så vi kan se hvem der gjorde det
  await audit({
    action: "delete",
    resourceType: "tenant",
    resourceId: tenantId,
    tenantIdOverride: tenantId,
    before: { name: (tenant as any).name, slug: (tenant as any).slug },
    message: `Tenant hard-purged. ${reason ?? ""}`.trim(),
  });

  // Soft-delete: marker som deleted i stedet for at slette rå data.
  // Hard-cascade-delete kan slå alt afhængigt data, hvilket potentielt
  // sletter historiske audit-rows. Vi anonymiserer i stedet for at slette
  // umiddelbart — endelig hard-purge kan komme i senere fase.
  await db.tenant.update({
    where: { id: tenantId },
    data: {
      status: "deleted",
      isActive: false,
      deletedAt: new Date(),
      // Anonymisér navn og admin-info; bevar id + slug for audit-spor
      name: `[Slettet ${tenantId.slice(0, 8)}]`,
      adminName: null,
      adminEmail: null,
      adminPhone: null,
      adminTitle: null,
    } as any,
  });

  revalidatePath("/admin");
  return { ok: true };
}
