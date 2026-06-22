"use server";

import { db } from "@/lib/db";
import { auth } from "@/lib/auth";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import bcrypt from "bcryptjs";
import { audit, redact, diff } from "@/lib/audit";
import { checkPassword, PASSWORD_POLICY } from "@/lib/password-policy";
import { z } from "zod";

async function requireSuperAdmin() {
  const session = await auth();
  if (session?.user?.role !== "super_admin") {
    await audit({
      action: "config_change",
      resourceType: "admin",
      outcome: "denied",
      message: "Non-super-admin attempted admin action",
    });
    throw new Error("Kun super admins har adgang");
  }
  return session;
}

const ALL_MODULES = ["sales", "marketing", "support", "projects", "products", "licenses"];

// --- Validation schemas ---

const slugRegex = /^[a-z0-9](?:[a-z0-9-]{0,40}[a-z0-9])?$/;
const tenantCreateSchema = z.object({
  name: z.string().min(2).max(120),
  slug: z.string().regex(slugRegex, "Slug skal være 2-42 tegn, kun a-z, 0-9, bindestreg"),
  plan: z.enum(["starter", "professional", "enterprise"]).optional(),
  maxUsers: z.number().int().min(1).max(10000),
  ticketPrefix: z.string().regex(/^[A-Z]{1,4}$/).optional(),
  projectPrefix: z.string().regex(/^[A-Z]{1,4}$/).optional(),
});

const userCreateSchema = z.object({
  tenantId: z.string().min(1),
  name: z.string().min(2).max(120),
  email: z.string().email().max(254),
  roleId: z.string().nullable(),
});

// Hent alle tenants
export async function getAdminTenants() {
  await requireSuperAdmin();
  return db.tenant.findMany({
    include: {
      _count: { select: { users: true, companies: true, tickets: true, projects: true } },
    },
    orderBy: { createdAt: "desc" },
  });
}

// Hent en enkelt tenant
export async function getAdminTenant(id: string) {
  await requireSuperAdmin();
  return db.tenant.findUnique({
    where: { id },
    include: {
      users: {
        include: { role: { select: { name: true } } },
        orderBy: { createdAt: "asc" },
      },
      roles: { orderBy: { name: "asc" } },
      _count: { select: { companies: true, tickets: true, projects: true, licenses: true } },
    },
  });
}

// Opret nyt tenant
export async function createTenant(formData: FormData) {
  await requireSuperAdmin();

  const parsed = tenantCreateSchema.safeParse({
    name: formData.get("name"),
    slug: (formData.get("slug") as string)?.toLowerCase().replace(/[^a-z0-9-]/g, ""),
    plan: formData.get("plan") || undefined,
    maxUsers: parseInt(formData.get("maxUsers") as string) || 5,
    ticketPrefix: (formData.get("ticketPrefix") as string) || undefined,
    projectPrefix: (formData.get("projectPrefix") as string) || undefined,
  });

  if (!parsed.success) {
    await audit({
      action: "tenant_create",
      resourceType: "tenant",
      outcome: "failure",
      message: `Validation failed: ${parsed.error.message}`,
    });
    throw new Error(parsed.error.issues.map((i) => i.message).join(", "));
  }

  const modules = ALL_MODULES.filter((m) => formData.get(`module_${m}`) === "on");

  const tenant = await db.tenant.create({
    data: {
      name: parsed.data.name,
      slug: parsed.data.slug,
      plan: parsed.data.plan ?? "starter",
      maxUsers: parsed.data.maxUsers,
      modules: modules.length > 0 ? modules : ["sales", "support"],
      isActive: true,
      ticketPrefix: parsed.data.ticketPrefix ?? "T",
      projectPrefix: parsed.data.projectPrefix ?? "P",
    },
  });

  // Opret standard roller automatisk
  await db.role.createMany({
    data: [
      {
        tenantId: tenant.id,
        name: "Admin",
        isSystem: true,
        permissions: { sales: { view: true, create: true, edit: true, delete: true }, marketing: { view: true, create: true, edit: true, delete: true }, support: { view: true, create: true, edit: true, delete: true }, projects: { view: true, create: true, edit: true, delete: true }, products: { view: true, create: true, edit: true, delete: true }, licenses: { view: true, create: true, edit: true, delete: true } },
      },
      {
        tenantId: tenant.id,
        name: "Konsulent",
        isSystem: true,
        permissions: { sales: { view: true, create: false, edit: false, delete: false }, support: { view: true, create: true, edit: true, delete: false }, projects: { view: true, create: false, edit: true, delete: false }, products: { view: true, create: false, edit: false, delete: false }, licenses: { view: true, create: false, edit: false, delete: false } },
      },
      {
        tenantId: tenant.id,
        name: "Læs",
        isSystem: false,
        permissions: { sales: { view: true }, support: { view: true }, projects: { view: true }, products: { view: true }, licenses: { view: true } },
      },
    ],
  });

  await audit({
    action: "tenant_create",
    resourceType: "tenant",
    resourceId: tenant.id,
    tenantIdOverride: tenant.id,
    after: { name: tenant.name, slug: tenant.slug, plan: tenant.plan, modules: tenant.modules, maxUsers: tenant.maxUsers },
    message: `Tenant "${tenant.name}" created`,
  });

  revalidatePath("/admin");
  redirect(`/admin/tenants/${tenant.id}`);
}

// Opdater tenant
export async function updateTenant(formData: FormData) {
  await requireSuperAdmin();
  const id = formData.get("id") as string;
  const modules = ALL_MODULES.filter((m) => formData.get(`module_${m}`) === "on");

  const before = await db.tenant.findUnique({ where: { id } });
  if (!before) throw new Error("Tenant ikke fundet");

  const after = await db.tenant.update({
    where: { id },
    data: {
      name: formData.get("name") as string,
      plan: formData.get("plan") as string,
      maxUsers: parseInt(formData.get("maxUsers") as string) || 5,
      isActive: formData.get("isActive") === "true",
      modules,
      ticketPrefix: (formData.get("ticketPrefix") as string) || "T",
      projectPrefix: (formData.get("projectPrefix") as string) || "P",
    },
  });

  const changes = diff(
    { name: before.name, plan: before.plan, maxUsers: before.maxUsers, isActive: before.isActive, modules: before.modules },
    { name: after.name, plan: after.plan, maxUsers: after.maxUsers, isActive: after.isActive, modules: after.modules }
  );

  if (changes) {
    await audit({
      action: "update",
      resourceType: "tenant",
      resourceId: id,
      tenantIdOverride: id,
      before: changes.before,
      after: changes.after,
      message: `Tenant "${after.name}" updated`,
    });

    // Hvis modules ændret — log som separat module_change-event for søgbarhed
    if (JSON.stringify(before.modules) !== JSON.stringify(after.modules)) {
      await audit({
        action: "module_change",
        resourceType: "tenant",
        resourceId: id,
        tenantIdOverride: id,
        before: { modules: before.modules },
        after: { modules: after.modules },
      });
    }
    // Active-toggle
    if (before.isActive !== after.isActive) {
      await audit({
        action: after.isActive ? "tenant_activate" : "tenant_suspend",
        resourceType: "tenant",
        resourceId: id,
        tenantIdOverride: id,
      });
    }
  }

  revalidatePath("/admin");
  revalidatePath(`/admin/tenants/${id}`);
  redirect(`/admin/tenants/${id}`);
}

// Opret bruger på et tenant
export async function createTenantUser(formData: FormData) {
  const session = await requireSuperAdmin();

  const tenantId = (formData.get("tenantId") as string) || "";

  /**
   * Hjælper: redirect med pæn fejlbesked i stedet for at throw.
   * Throw'er en Server Components-fejl → "Noget gik galt" — frustrerende for admins.
   */
  const failWith = (msg: string) => {
    if (tenantId) {
      redirect(
        `/admin/tenants/${tenantId}?userError=${encodeURIComponent(msg)}`,
      );
    }
    redirect("/admin/tenants?error=" + encodeURIComponent(msg));
  };

  const parsed = userCreateSchema.safeParse({
    tenantId,
    name: formData.get("name"),
    email: formData.get("email"),
    roleId: (formData.get("roleId") as string) || null,
  });
  if (!parsed.success) {
    failWith(parsed.error.issues.map((i) => i.message).join(", "));
    return; // unreachable — failWith redirects
  }

  // Default skal opfylde PASSWORD_POLICY (min 12 tegn + 3 karakterklasser).
  const password =
    (formData.get("password") as string) || "Velkommen2026!";

  // Håndhæv password-policy også for første-gangs-password
  const pwCheck = checkPassword(password, {
    email: parsed.data.email,
    name: parsed.data.name,
  });
  if (!pwCheck.ok) {
    await audit({
      action: "create",
      resourceType: "user",
      tenantIdOverride: parsed.data.tenantId,
      outcome: "failure",
      message: `Password policy: ${pwCheck.errors.join("; ")}`,
    });
    failWith("Password: " + pwCheck.errors.join(", "));
    return;
  }

  // Tjek email-dublet i samme tenant — ellers throw fra Prisma unique constraint
  const existing = await db.user.findFirst({
    where: { tenantId: parsed.data.tenantId, email: parsed.data.email },
    select: { id: true },
  }).catch(() => null);
  if (existing) {
    failWith(`En bruger med email "${parsed.data.email}" findes allerede.`);
    return;
  }

  const hashed = await bcrypt.hash(password, PASSWORD_POLICY.bcryptCost);

  let user;
  try {
    user = await db.user.create({
      data: {
        tenantId: parsed.data.tenantId,
        name: parsed.data.name,
        email: parsed.data.email,
        password: hashed,
        roleId: parsed.data.roleId,
        isActive: true,
        passwordChangedAt: new Date(),
      } as any,
    });
  } catch (e: any) {
    await audit({
      action: "create",
      resourceType: "user",
      tenantIdOverride: parsed.data.tenantId,
      outcome: "failure",
      message: `DB-fejl: ${e?.message ?? String(e)}`,
    }).catch(() => {});
    failWith(`Kunne ikke oprette bruger: ${e?.message ?? "ukendt fejl"}`);
    return;
  }

  await audit({
    action: "create",
    resourceType: "user",
    resourceId: user.id,
    tenantIdOverride: parsed.data.tenantId,
    after: redact({
      name: user.name,
      email: user.email,
      roleId: user.roleId,
      isActive: user.isActive,
    }),
    message: "User created by super admin",
  }).catch(() => {});

  revalidatePath(`/admin/tenants/${parsed.data.tenantId}`);
  redirect(
    `/admin/tenants/${parsed.data.tenantId}?userCreated=${encodeURIComponent(user.email)}`,
  );
}

// Deaktiver/aktiver bruger
export async function toggleUserActive(userId: string, tenantId: string, active: boolean) {
  await requireSuperAdmin();
  const before = await db.user.findUnique({
    where: { id: userId },
    select: { isActive: true, email: true },
  });
  await db.user.update({ where: { id: userId }, data: { isActive: active } });

  await audit({
    action: "update",
    resourceType: "user",
    resourceId: userId,
    tenantIdOverride: tenantId,
    before: { isActive: before?.isActive },
    after: { isActive: active },
    message: `User ${active ? "activated" : "deactivated"} (${before?.email})`,
  });

  revalidatePath(`/admin/tenants/${tenantId}`);
}

// Nulstil brugerens password
export async function resetUserPassword(formData: FormData) {
  await requireSuperAdmin();
  const userId = formData.get("userId") as string;
  const tenantId = formData.get("tenantId") as string;
  const password = formData.get("password") as string;

  const user = await db.user.findUnique({
    where: { id: userId },
    select: { email: true, name: true },
  });
  if (!user) throw new Error("Bruger ikke fundet");

  const pwCheck = checkPassword(password, { email: user.email, name: user.name });
  if (!pwCheck.ok) {
    await audit({
      action: "password_change",
      resourceType: "user",
      resourceId: userId,
      tenantIdOverride: tenantId,
      outcome: "failure",
      message: `Password policy violated at admin reset: ${pwCheck.errors.join("; ")}`,
    });
    throw new Error(pwCheck.errors.join(", "));
  }

  const hashed = await bcrypt.hash(password, PASSWORD_POLICY.bcryptCost);
  await db.user.update({
    where: { id: userId },
    data: { password: hashed, passwordChangedAt: new Date(), failedLoginCount: 0, lockedUntil: null } as any,
  });

  await audit({
    action: "password_change",
    resourceType: "user",
    resourceId: userId,
    tenantIdOverride: tenantId,
    message: "Password reset by super admin",
  });

  revalidatePath(`/admin/tenants/${tenantId}`);
  redirect(`/admin/tenants/${tenantId}`);
}
