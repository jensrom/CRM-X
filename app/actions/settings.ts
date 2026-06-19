"use server";

import { db } from "@/lib/db";
import { auth } from "@/lib/auth";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import bcrypt from "bcryptjs";

async function getSession() {
  const session = await auth();
  if (!session?.user?.tenantId) throw new Error("Ikke autoriseret");
  return session;
}

const MODULES = ["sales", "marketing", "support", "projects", "products", "licenses"] as const;
const ACTIONS = ["view", "create", "edit", "delete"] as const;
type ModuleName = typeof MODULES[number];
type ActionName = typeof ACTIONS[number];

// Roller
export async function getRoles() {
  const session = await auth();
  if (!session?.user?.tenantId) return [];
  return db.role.findMany({
    where: { tenantId: session.user.tenantId },
    include: { _count: { select: { users: true } } },
    orderBy: [{ isSystem: "desc" }, { name: "asc" }],
  });
}

export async function getRole(id: string) {
  const session = await auth();
  if (!session?.user?.tenantId) return null;
  return db.role.findFirst({
    where: { id, tenantId: session.user.tenantId },
    include: { users: { select: { id: true, name: true, email: true, isActive: true } } },
  });
}

export async function createRole(formData: FormData) {
  const session = await getSession();
  const tenantId = session.user.tenantId!;

  const permissions: Record<string, Record<string, boolean>> = {};
  for (const mod of MODULES) {
    permissions[mod] = {};
    for (const action of ACTIONS) {
      permissions[mod][action] = formData.get(`perm_${mod}_${action}`) === "on";
    }
  }

  const role = await db.role.create({
    data: {
      tenantId,
      name: formData.get("name") as string,
      permissions,
      isSystem: false,
    },
  });

  revalidatePath("/settings/roles");
  redirect(`/settings/roles/${role.id}`);
}

export async function updateRole(formData: FormData) {
  const session = await getSession();
  const id = formData.get("id") as string;

  const permissions: Record<string, Record<string, boolean>> = {};
  for (const mod of MODULES) {
    permissions[mod] = {};
    for (const action of ACTIONS) {
      permissions[mod][action] = formData.get(`perm_${mod}_${action}`) === "on";
    }
  }

  await db.role.updateMany({
    where: { id, tenantId: session.user.tenantId! },
    data: { name: formData.get("name") as string, permissions },
  });

  revalidatePath("/settings/roles");
  revalidatePath(`/settings/roles/${id}`);
  redirect(`/settings/roles/${id}`);
}

export async function deleteRole(id: string) {
  const session = await getSession();
  await db.role.deleteMany({
    where: { id, tenantId: session.user.tenantId!, isSystem: false },
  });
  revalidatePath("/settings/roles");
  redirect("/settings/roles");
}

// Brugere i tenant
export async function getTenantUsersWithRoles() {
  const session = await auth();
  if (!session?.user?.tenantId) return [];
  return db.user.findMany({
    where: { tenantId: session.user.tenantId },
    include: { role: { select: { id: true, name: true } } },
    orderBy: { name: "asc" },
  });
}

/**
 * Henter tenant-licens-info: hvor mange aktive brugere kontra det købte loft.
 * Bruges af /settings/users header til at vise "11/50 pladser brugt".
 */
export async function getTenantLicenseInfo() {
  const session = await auth();
  if (!session?.user?.tenantId) return null;
  const tenantId = session.user.tenantId;

  const [tenant, activeUsers, totalUsers] = await Promise.all([
    db.tenant.findUnique({
      where: { id: tenantId },
      select: { maxUsers: true, plan: true },
    }),
    db.user.count({ where: { tenantId, isActive: true } }),
    db.user.count({ where: { tenantId } }),
  ]);

  if (!tenant) return null;
  return {
    activeUsers,
    totalUsers,
    maxUsers: tenant.maxUsers,
    plan: tenant.plan,
    remaining: Math.max(0, tenant.maxUsers - activeUsers),
    atCap: activeUsers >= tenant.maxUsers,
  };
}

/**
 * Opret ny bruger paa tenant.
 * Hard-guard: kun hvis aktive brugere < maxUsers.
 * Bruger faar password sendt via klartekst i form'en — i et senere step
 * skal det erstattes af invite-flow (UserInvite-tabel findes allerede).
 */
export async function createTenantUser(formData: FormData) {
  const session = await getSession();
  const tenantId = session.user.tenantId!;

  const name = ((formData.get("name") as string) || "").trim();
  const email = ((formData.get("email") as string) || "").trim().toLowerCase();
  const password = (formData.get("password") as string) || "";
  const roleId = (formData.get("roleId") as string) || null;

  if (!name) throw new Error("Navn er paakraevet");
  if (!email) throw new Error("Email er paakraevet");
  if (password.length < 8) throw new Error("Password skal vaere mindst 8 tegn");

  // License-cap guard
  const licenseInfo = await getTenantLicenseInfo();
  if (!licenseInfo) throw new Error("Kunne ikke tjekke licens");
  if (licenseInfo.atCap) {
    throw new Error(
      `Ingen frie licenser tilbage (${licenseInfo.activeUsers}/${licenseInfo.maxUsers}). ` +
      `Opgrader plan eller deaktiver en bruger foerst.`
    );
  }

  // Dublet-tjek paa email indenfor samme tenant
  const existing = await db.user.findUnique({
    where: { tenantId_email: { tenantId, email } },
    select: { id: true },
  }).catch(() => null);
  if (existing) {
    throw new Error(`En bruger med email "${email}" findes allerede.`);
  }

  const hashed = await bcrypt.hash(password, 12);
  await db.user.create({
    data: {
      tenantId,
      email,
      name,
      password: hashed,
      roleId,
      isActive: true,
    },
  });

  revalidatePath("/settings/users");
}

/**
 * Aktivér/deaktivér en bruger.
 * Aktivering har license-cap guard. Deaktivering er altid tilladt.
 * Kan ikke deaktivere sig selv (ville lukke sig ude).
 */
export async function toggleUserActive(userId: string, makeActive: boolean) {
  const session = await getSession();
  const tenantId = session.user.tenantId!;

  if (userId === session.user.id && !makeActive) {
    throw new Error("Du kan ikke deaktivere dig selv.");
  }

  if (makeActive) {
    const licenseInfo = await getTenantLicenseInfo();
    if (!licenseInfo) throw new Error("Kunne ikke tjekke licens");
    if (licenseInfo.atCap) {
      throw new Error(
        `Ingen frie licenser tilbage (${licenseInfo.activeUsers}/${licenseInfo.maxUsers}). ` +
        `Opgrader plan eller deaktiver en anden bruger foerst.`
      );
    }
  }

  await db.user.updateMany({
    where: { id: userId, tenantId },
    data: { isActive: makeActive },
  });

  revalidatePath("/settings/users");
}

export async function updateUserRole(formData: FormData) {
  const session = await getSession();
  const userId = formData.get("userId") as string;
  const roleId = (formData.get("roleId") as string) || null;

  await db.user.updateMany({
    where: { id: userId, tenantId: session.user.tenantId! },
    data: { roleId },
  });

  revalidatePath("/settings/users");
}

export async function updateUserPassword(formData: FormData) {
  const session = await getSession();
  const userId = formData.get("userId") as string;
  const password = formData.get("password") as string;

  if (!password || password.length < 8) throw new Error("Password skal være mindst 8 tegn");

  const hashed = await bcrypt.hash(password, 12);
  await db.user.updateMany({
    where: { id: userId, tenantId: session.user.tenantId! },
    data: { password: hashed },
  });

  revalidatePath("/settings/users");
}

export async function updateMyProfile(formData: FormData) {
  const session = await getSession();

  const firstName = (formData.get("firstName") as string ?? "").trim();
  const lastName  = (formData.get("lastName") as string ?? "").trim();
  const name = [firstName, lastName].filter(Boolean).join(" ") || (formData.get("name") as string ?? "");
  const phone = (formData.get("phone") as string) || null;
  const title = (formData.get("title") as string) || null;

  await db.user.update({
    where: { id: session.user.id! },
    data: { name, phone, title } as any,
  });

  revalidatePath("/settings");
  redirect("/settings");
}

/**
 * Skift brugerens UI-sprog. Whitelist sikrer kun gyldige locales.
 */
export async function updateMyLanguage(language: string): Promise<void> {
  const session = await getSession();
  const ALLOWED = new Set(["da", "en", "sv", "no", "de"]);
  const normalized = ALLOWED.has(language) ? language : "da";

  await db.user.update({
    where: { id: session.user.id! },
    data: { language: normalized } as any,
  });

  revalidatePath("/settings");
  revalidatePath("/dashboard");
}

/** Opdater brugerens tema (light/dark/system) */
export async function updateMyTheme(theme: string): Promise<void> {
  const session = await getSession();
  const ALLOWED = new Set(["light", "dark", "system"]);
  const normalized = ALLOWED.has(theme) ? theme : "system";

  await db.user.update({
    where: { id: session.user.id! },
    data: { theme: normalized } as any,
  });
}

/**
 * Generer (eller regenerer) calendar-token til personlig iCal-feed.
 * Reset = invaliderer den gamle URL omgaaende.
 */
export async function regenerateCalendarToken(): Promise<void> {
  const session = await getSession();
  const arr = new Uint8Array(16);
  crypto.getRandomValues(arr);
  const token = Array.from(arr).map((b) => b.toString(16).padStart(2, "0")).join("");

  await db.user.update({
    where: { id: session.user.id! },
    data: { calendarToken: token, calendarTokenIssuedAt: new Date() } as any,
  });
  revalidatePath("/settings/calendar");
}

/** Slet calendar-token. */
export async function revokeCalendarToken(): Promise<void> {
  const session = await getSession();
  await db.user.update({
    where: { id: session.user.id! },
    data: { calendarToken: null, calendarTokenIssuedAt: null } as any,
  });
  revalidatePath("/settings/calendar");
}

// Faktura-konfiguration (tenant-niveau)
export async function updateInvoiceConfig(formData: FormData) {
  const session = await getSession();
  const tenantId = session.user.tenantId!;

  const data: Record<string, string | null> = {
    invoiceCompanyName:    (formData.get("invoiceCompanyName") as string) || null,
    invoiceAddress:        (formData.get("invoiceAddress") as string) || null,
    invoiceZipCity:        (formData.get("invoiceZipCity") as string) || null,
    invoiceCvr:            (formData.get("invoiceCvr") as string) || null,
    invoiceEan:            (formData.get("invoiceEan") as string) || null,
    invoicePhone:          (formData.get("invoicePhone") as string) || null,
    invoiceEmail:          (formData.get("invoiceEmail") as string) || null,
    invoiceFooter:         (formData.get("invoiceFooter") as string) || null,
  };

  await db.tenant.update({
    where: { id: tenantId },
    data,
  });

  revalidatePath("/settings/invoice-config");
}
