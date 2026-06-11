/**
 * CRM-X — Test brugere seed
 * Tilføjer realistiske testbrugere med forskellige roller til demo-tenanten.
 *
 * Kør med: npx tsx prisma/seed-test-users.ts
 *
 * Alle test-brugere har password: Test1234!
 */

import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const db = new PrismaClient();

const TEST_PASSWORD = "Test1234!";

const TEST_USERS = [
  {
    email: "sarah.nielsen@demo.dk",
    name: "Sarah Nielsen",
    role: "Konsulent",
    avatar: null,
  },
  {
    email: "thomas.pedersen@demo.dk",
    name: "Thomas Pedersen",
    role: "Konsulent",
    avatar: null,
  },
  {
    email: "mads.andersen@demo.dk",
    name: "Mads Andersen",
    role: "Sælger",
    avatar: null,
  },
  {
    email: "maja.christensen@demo.dk",
    name: "Maja Christensen",
    role: "Marketing",
    avatar: null,
  },
  {
    email: "lars.overgaard@demo.dk",
    name: "Lars Overgaard",
    role: "Administrator",
    avatar: null,
  },
];

async function main() {
  console.log("👥 Opretter test-brugere...\n");

  // Find demo-tenant
  const tenant = await db.tenant.findUnique({ where: { slug: "demo" } });
  if (!tenant) {
    console.error("❌ Demo-tenant ikke fundet. Kør først: npm run db:seed");
    process.exit(1);
  }

  const hashedPassword = await bcrypt.hash(TEST_PASSWORD, 12);

  let created = 0;
  let skipped = 0;

  for (const u of TEST_USERS) {
    // Find rollen
    const role = await db.role.findUnique({
      where: { tenantId_name: { tenantId: tenant.id, name: u.role } },
    });

    if (!role) {
      console.warn(`⚠️  Rolle "${u.role}" ikke fundet — springer over ${u.name}`);
      continue;
    }

    // Tjek om brugeren allerede eksisterer
    const existing = await db.user.findUnique({
      where: { tenantId_email: { tenantId: tenant.id, email: u.email } },
    });

    if (existing) {
      console.log(`ℹ️  Springer over (eksisterer): ${u.email}`);
      skipped++;
      continue;
    }

    await db.user.create({
      data: {
        tenantId: tenant.id,
        email: u.email,
        name: u.name,
        password: hashedPassword,
        roleId: role.id,
        isActive: true,
      },
    });

    console.log(`✅ ${u.name.padEnd(22)} ${u.email.padEnd(30)} [${u.role}]`);
    created++;
  }

  console.log(`\n✨ Færdig! ${created} oprettet, ${skipped} sprunget over.`);
  console.log("\nLogin (alle bruger password: Test1234!):");
  console.log("─".repeat(55));

  for (const u of TEST_USERS) {
    console.log(`  ${u.name.padEnd(22)} ${u.email.padEnd(30)} → ${u.role}`);
  }

  console.log("\nHusk: subdomain = demo  (http://localhost:3000?tenant=demo)");
}

main()
  .catch((e) => {
    console.error("❌ Fejl:", e);
    process.exit(1);
  })
  .finally(async () => {
    await db.$disconnect();
  });
