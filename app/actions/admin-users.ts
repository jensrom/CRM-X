"use server";

/**
 * Super-admin user management — kun adgang for super_admin.
 *
 * Disse actions er IKKE multi-tenant — vi haandterer kun SuperAdmin-tabellen
 * (platform-niveau brugere).
 */

import { db } from "@/lib/db";
import { auth } from "@/lib/auth";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import bcrypt from "bcryptjs";
import { audit } from "@/lib/audit";
import { checkPassword, PASSWORD_POLICY } from "@/lib/password-policy";

async function requireSuperAdmin() {
  const session = await auth();
  if (session?.user?.role !== "super_admin") {
    throw new Error("Kun super-admins har adgang");
  }
  return session;
}

export async function listSuperAdmins() {
  await requireSuperAdmin();
  return db.superAdmin.findMany({
    orderBy: { createdAt: "asc" },
    select: { id: true, email: true, name: true, createdAt: true, updatedAt: true },
  });
}

/**
 * Opret en ny super-admin.
 * Bruger pæn fejl-redirect i stedet for throw.
 */
export async function createSuperAdmin(formData: FormData) {
  await requireSuperAdmin();

  const email = ((formData.get("email") as string) || "").trim().toLowerCase();
  const name = ((formData.get("name") as string) || "").trim();
  const password = (formData.get("password") as string) || "";

  const failWith = (msg: string) =>
    redirect(`/admin/settings/users?error=${encodeURIComponent(msg)}`);

  if (!email || !name) {
    failWith("Email og navn er paakraevet");
  }
  if (!/^\S+@\S+\.\S+$/.test(email)) {
    failWith("Ugyldig email-adresse");
  }

  const pwCheck = checkPassword(password, { email, name });
  if (!pwCheck.ok) {
    failWith("Password: " + pwCheck.errors.join(", "));
  }

  const existing = await db.superAdmin.findUnique({ where: { email } });
  if (existing) {
    failWith(`En super-admin med email "${email}" findes allerede`);
  }

  const hashed = await bcrypt.hash(password, PASSWORD_POLICY.bcryptCost);

  const created = await db.superAdmin.create({
    data: { email, name, password: hashed },
    select: { id: true, email: true },
  });

  await audit({
    action: "create",
    resourceType: "super_admin",
    resourceId: created.id,
    after: { email: created.email },
    message: "Super-admin oprettet",
  }).catch(() => {});

  revalidatePath("/admin/settings/users");
  redirect(`/admin/settings/users?created=${encodeURIComponent(email)}`);
}

/**
 * Reset password for en super-admin.
 */
export async function resetSuperAdminPassword(formData: FormData) {
  await requireSuperAdmin();

  const id = (formData.get("id") as string) || "";
  const password = (formData.get("password") as string) || "";

  const failWith = (msg: string) =>
    redirect(`/admin/settings/users?error=${encodeURIComponent(msg)}`);

  if (!id) failWith("Mangler super-admin ID");

  const sa = await db.superAdmin.findUnique({ where: { id } });
  if (!sa) failWith("Super-admin ikke fundet");

  const pwCheck = checkPassword(password, { email: sa!.email, name: sa!.name });
  if (!pwCheck.ok) {
    failWith("Password: " + pwCheck.errors.join(", "));
  }

  const hashed = await bcrypt.hash(password, PASSWORD_POLICY.bcryptCost);

  await db.superAdmin.update({
    where: { id },
    data: { password: hashed },
  });

  await audit({
    action: "password_reset",
    resourceType: "super_admin",
    resourceId: id,
    message: "Super-admin password nulstillet",
  }).catch(() => {});

  revalidatePath("/admin/settings/users");
  redirect(`/admin/settings/users?passwordReset=${encodeURIComponent(sa!.email)}`);
}

/**
 * Slet en super-admin.
 * Kan IKKE slette sig selv.
 */
export async function deleteSuperAdmin(id: string) {
  const session = await requireSuperAdmin();

  const failWith = (msg: string) =>
    redirect(`/admin/settings/users?error=${encodeURIComponent(msg)}`);

  // Sikkerhed: ingen kan slette sig selv
  if (session.user.id === id) {
    failWith("Du kan ikke slette dig selv");
  }

  // Sikkerhed: ikke den sidste super-admin
  const totalAdmins = await db.superAdmin.count();
  if (totalAdmins <= 1) {
    failWith("Kan ikke slette den sidste super-admin");
  }

  const sa = await db.superAdmin.findUnique({ where: { id } });
  if (!sa) failWith("Super-admin ikke fundet");

  await db.superAdmin.delete({ where: { id } });

  await audit({
    action: "delete",
    resourceType: "super_admin",
    resourceId: id,
    before: { email: sa!.email, name: sa!.name },
    message: "Super-admin slettet",
  }).catch(() => {});

  revalidatePath("/admin/settings/users");
  redirect(`/admin/settings/users?deleted=${encodeURIComponent(sa!.email)}`);
}
