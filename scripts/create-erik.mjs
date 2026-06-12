/**
 * Opretter brugeren Erik (erik@novotek.com / Demo2026!) på demo-tenanten
 * med fuld Admin-rolle. Kør én gang: node scripts/create-erik.mjs
 */
import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const db = new PrismaClient();

const TENANT_SLUG = "demo";
const USER_EMAIL = "erik@novotek.com";
const USER_NAME = "Erik";
const USER_PASSWORD = "Demo2026!";
const USER_PHONE = "+45 60 00 00 00";
const USER_TITLE = "Admin";

// Fuld Admin-permissions — adgang til alt
const FULL_PERMISSIONS = {
  sales:     { view: true, create: true, edit: true, delete: true },
  marketing: { view: true, create: true, edit: true, delete: true },
  support:   { view: true, create: true, edit: true, delete: true },
  projects:  { view: true, create: true, edit: true, delete: true },
  products:  { view: true, create: true, edit: true, delete: true },
  licenses:  { view: true, create: true, edit: true, delete: true },
};

const tenant = await db.tenant.findUnique({ where: { slug: TENANT_SLUG } });
if (!tenant) {
  console.error(`❌ Tenant "${TENANT_SLUG}" findes ikke. Kør først 'npm run db:seed-demo'.`);
  process.exit(1);
}
console.log(`✅ Tenant fundet: ${tenant.name}`);

// Sørg for at Admin-rollen findes med fulde rettigheder
let adminRole = await db.role.findFirst({
  where: { tenantId: tenant.id, name: "Admin" },
});
if (!adminRole) {
  adminRole = await db.role.create({
    data: {
      tenantId: tenant.id,
      name: "Admin",
      isSystem: true,
      permissions: FULL_PERMISSIONS,
    },
  });
  console.log("✅ Admin-rolle oprettet med fulde rettigheder");
} else {
  // Sørg for at permissions er komplette
  adminRole = await db.role.update({
    where: { id: adminRole.id },
    data: { permissions: FULL_PERMISSIONS },
  });
  console.log("✅ Admin-rolle opdateret til fulde rettigheder");
}

// Hash password
const hashedPassword = await bcrypt.hash(USER_PASSWORD, 12);

// Opret eller opdatér Erik
const existing = await db.user.findUnique({
  where: { tenantId_email: { tenantId: tenant.id, email: USER_EMAIL } },
});

if (existing) {
  await db.user.update({
    where: { id: existing.id },
    data: {
      name: USER_NAME,
      password: hashedPassword,
      roleId: adminRole.id,
      phone: USER_PHONE,
      title: USER_TITLE,
      isActive: true,
    },
  });
  console.log(`✅ Erik opdateret (id: ${existing.id})`);
} else {
  const user = await db.user.create({
    data: {
      tenantId: tenant.id,
      email: USER_EMAIL,
      name: USER_NAME,
      password: hashedPassword,
      roleId: adminRole.id,
      phone: USER_PHONE,
      title: USER_TITLE,
      isActive: true,
    },
  });
  console.log(`✅ Erik oprettet (id: ${user.id})`);
}

console.log(`\n🎉 Login klar:`);
console.log(`   Workspace: demo`);
console.log(`   Email:     ${USER_EMAIL}`);
console.log(`   Password:  ${USER_PASSWORD}`);
console.log(`   Rolle:     Admin (fuld adgang til alle moduler)`);

await db.$disconnect();
