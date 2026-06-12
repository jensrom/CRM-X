/**
 * Opretter super-admin "Jens" til admin-tenanten.
 *
 *   Email:    jens@plesnertech.dk
 *   Password: Admin2026!    ← skift på første login under Indstillinger
 *
 * SuperAdmin lever i sin egen tabel (super_admins) — uafhængig af tenants.
 * Login sker via workspace="admin" og giver adgang til /admin/* portalen
 * (tenant-management, billing, audit, impersonation, mv.).
 *
 * Kør én gang:  node scripts/create-jens-admin.mjs
 */
import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const db = new PrismaClient();

const ADMIN_EMAIL = "jens@plesnertech.dk";
const ADMIN_NAME = "Jens";
const ADMIN_PASSWORD = "Admin2026!";

// Hash password med bcrypt cost 12 (samme niveau som tenant-brugere)
const hashedPassword = await bcrypt.hash(ADMIN_PASSWORD, 12);

const existing = await db.superAdmin.findUnique({
  where: { email: ADMIN_EMAIL },
});

if (existing) {
  await db.superAdmin.update({
    where: { id: existing.id },
    data: {
      name: ADMIN_NAME,
      password: hashedPassword,
    },
  });
  console.log(`✅ Super-admin opdateret (id: ${existing.id})`);
} else {
  const admin = await db.superAdmin.create({
    data: {
      email: ADMIN_EMAIL,
      name: ADMIN_NAME,
      password: hashedPassword,
    },
  });
  console.log(`✅ Super-admin oprettet (id: ${admin.id})`);
}

console.log(`\n🎉 Login klar:`);
console.log(`   Workspace: admin`);
console.log(`   Email:     ${ADMIN_EMAIL}`);
console.log(`   Password:  ${ADMIN_PASSWORD}`);
console.log(`   Adgang:    /admin/* (super-admin portal)`);
console.log(`\n⚠️  Skift password ved første login under Indstillinger.`);

await db.$disconnect();
