/**
 * CRM-X Database Seed
 * Kør med: npm run db:seed
 *
 * Opretter:
 * 1. Super Admin bruger
 * 2. Demo tenant (demo.plesnertech.dk)
 * 3. Standard roller
 * 4. Demo admin bruger
 */

import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const db = new PrismaClient();

async function main() {
  console.log("🌱 Starter CRM-X seed...\n");

  // --- 1. Super Admin ---
  const superAdminEmail =
    process.env.SUPER_ADMIN_EMAIL || "jens@plesnertech.dk";
  const superAdminPassword =
    process.env.SUPER_ADMIN_PASSWORD || "SkiftMigStraks!";

  const existingAdmin = await db.superAdmin.findUnique({
    where: { email: superAdminEmail },
  });

  if (!existingAdmin) {
    await db.superAdmin.create({
      data: {
        email: superAdminEmail,
        name: "Jens Plesner",
        password: await bcrypt.hash(superAdminPassword, 12),
      },
    });
    console.log(`✅ Super admin oprettet: ${superAdminEmail}`);
  } else {
    console.log(`ℹ️  Super admin eksisterer allerede: ${superAdminEmail}`);
  }

  // --- 2. Demo Tenant ---
  const existingTenant = await db.tenant.findUnique({
    where: { slug: "demo" },
  });

  let tenant = existingTenant;

  if (!tenant) {
    tenant = await db.tenant.create({
      data: {
        name: "Demo Firma A/S",
        slug: "demo",
        modules: ["sales", "marketing", "support", "projects", "products", "licenses"],
        plan: "large",
        maxUsers: 50,
      },
    });
    console.log(`✅ Demo tenant oprettet: demo.plesnertech.dk`);
  } else {
    console.log(`ℹ️  Demo tenant eksisterer allerede`);
  }

  // --- 3. Standard Roller ---
  const defaultRoles = [
    {
      name: "Administrator",
      isSystem: true,
      permissions: {
        sales: { view: true, create: true, edit: true, delete: true },
        marketing: { view: true, create: true, edit: true, delete: true },
        support: { view: true, create: true, edit: true, delete: true },
        projects: { view: true, create: true, edit: true, delete: true },
        products: { view: true, create: true, edit: true, delete: true },
        licenses: { view: true, create: true, edit: true, delete: true },
      },
    },
    {
      name: "Sælger",
      isSystem: true,
      permissions: {
        sales: { view: true, create: true, edit: true, delete: false },
        marketing: { view: true, create: false, edit: false, delete: false },
        support: { view: false, create: false, edit: false, delete: false },
        projects: { view: false, create: false, edit: false, delete: false },
        products: { view: true, create: false, edit: false, delete: false },
        licenses: { view: false, create: false, edit: false, delete: false },
      },
    },
    {
      name: "Konsulent",
      isSystem: true,
      permissions: {
        sales: { view: false, create: false, edit: false, delete: false },
        marketing: { view: false, create: false, edit: false, delete: false },
        support: { view: true, create: true, edit: true, delete: false },
        projects: { view: true, create: true, edit: true, delete: false },
        products: { view: true, create: false, edit: false, delete: false },
        licenses: { view: true, create: false, edit: false, delete: false },
      },
    },
    {
      name: "Marketing",
      isSystem: true,
      permissions: {
        sales: { view: true, create: false, edit: false, delete: false },
        marketing: { view: true, create: true, edit: true, delete: false },
        support: { view: false, create: false, edit: false, delete: false },
        projects: { view: false, create: false, edit: false, delete: false },
        products: { view: true, create: false, edit: false, delete: false },
        licenses: { view: false, create: false, edit: false, delete: false },
      },
    },
  ];

  for (const roleData of defaultRoles) {
    const existing = await db.role.findUnique({
      where: { tenantId_name: { tenantId: tenant!.id, name: roleData.name } },
    });

    if (!existing) {
      await db.role.create({
        data: {
          tenantId: tenant!.id,
          ...roleData,
          permissions: roleData.permissions as any,
        },
      });
      console.log(`✅ Rolle oprettet: ${roleData.name}`);
    }
  }

  // --- 4. Demo Admin Bruger ---
  const adminRole = await db.role.findUnique({
    where: { tenantId_name: { tenantId: tenant!.id, name: "Administrator" } },
  });

  const existingUser = await db.user.findUnique({
    where: {
      tenantId_email: { tenantId: tenant!.id, email: "admin@demo.dk" },
    },
  });

  if (!existingUser && adminRole) {
    await db.user.create({
      data: {
        tenantId: tenant!.id,
        email: "admin@demo.dk",
        name: "Demo Admin",
        password: await bcrypt.hash("Demo1234!", 12),
        roleId: adminRole.id,
      },
    });
    console.log(`✅ Demo bruger oprettet: admin@demo.dk / Demo1234!`);
  }

  // --- 5. Demo data: Firmaer ---
  const lars = await db.company.findFirst({
    where: { tenantId: tenant!.id, name: "Lars Larsen A/S" },
  });

  if (!lars) {
    const company = await db.company.create({
      data: {
        tenantId: tenant!.id,
        name: "Lars Larsen A/S",
        orgNumber: "87654321",
        phone: "12345678",
        email: "info@larslarsen.dk",
        address: "Blahblah Vej 42",
        city: "Aarhus",
        zipCode: "8000",
      },
    });

    // Opret afdelinger
    const dept1 = await db.department.create({
      data: {
        tenantId: tenant!.id,
        companyId: company.id,
        name: "Produktion",
      },
    });

    const dept2 = await db.department.create({
      data: {
        tenantId: tenant!.id,
        companyId: company.id,
        name: "Facility",
      },
    });

    console.log(`✅ Demo firma oprettet: Lars Larsen A/S med 2 afdelinger`);
  }

  console.log("\n✨ Seed færdig!\n");
  console.log("Login info:");
  console.log(`  Super Admin: ${superAdminEmail} / ${superAdminPassword}`);
  console.log(`  Demo CRM:    admin@demo.dk / Demo1234!`);
  console.log(`               (subdomain: demo)`);
}

main()
  .catch((e) => {
    console.error("❌ Seed fejlede:", e);
    process.exit(1);
  })
  .finally(async () => {
    await db.$disconnect();
  });
