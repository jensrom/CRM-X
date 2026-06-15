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
  redirect("/settings/users");
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
 * Skift brugerens UI-sprog.
 * Gemmer User.language (ISO 639-1) som læses i sessionen ved næste request.
 * Hvis brugeren vælger et sprog der ikke findes i vores i18n-bibliotek,
 * normaliserer vi til "da" som fallback.
 */
export async function updateMyLanguage(language: string): Promise<void> {
  const session = await getSession();
  const ALLOWED = new Set(["da", "en"]);
  const normalized = ALLOWED.has(language) ? language : "da";

  await db.user.update({
    where: { id: session.user.id! },
    data: { language: normalized } as any,
  });

  revalidatePath("/settings");
  revalidatePath("/dashboard");
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

  await (db.tenant as any).update({
    where: { id: tenantId },
    data,
  });

  revalidatePath("/settings/invoice-config");
  redirect("/settings/invoice-config");
}
