/**
 * scripts/setup-super-admin.ts
 *
 * Opretter eller nulstiller en super-admin konto.
 *
 * Bruges paa prod naar du har brug for super-admin-adgang
 * uden at koere hele seed-scriptet.
 *
 * Brug:
 *   npx tsx scripts/setup-super-admin.ts [email] [password] [name]
 *
 * Eller med env-vars:
 *   SUPER_ADMIN_EMAIL=admin@x.dk SUPER_ADMIN_PASSWORD=Foo123! npx tsx scripts/setup-super-admin.ts
 *
 * Hvis konto findes opdateres password. Hvis ikke, oprettes ny.
 */

import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const db = new PrismaClient();

async function main() {
  const email =
    process.argv[2] ||
    process.env.SUPER_ADMIN_EMAIL ||
    "jens@plesnertech.dk";
  const password =
    process.argv[3] ||
    process.env.SUPER_ADMIN_PASSWORD ||
    "AdminPlesner2026!";
  const name =
    process.argv[4] ||
    process.env.SUPER_ADMIN_NAME ||
    "Plesner Admin";

  if (password.length < 10) {
    throw new Error(
      "Password skal vaere mindst 10 tegn. Du angav: " + password.length,
    );
  }

  const hashedPassword = await bcrypt.hash(password, 12);

  const existing = await db.superAdmin.findUnique({ where: { email } });

  if (existing) {
    await db.superAdmin.update({
      where: { email },
      data: { password: hashedPassword, name },
    });
    console.log("\n✅ Super-admin OPDATERET:");
  } else {
    await db.superAdmin.create({
      data: { email, password: hashedPassword, name },
    });
    console.log("\n✅ Super-admin OPRETTET:");
  }

  console.log("");
  console.log("   Email:    " + email);
  console.log("   Password: " + password);
  console.log("   Navn:     " + name);
  console.log("");
  console.log("Login-flow:");
  console.log("   1. Aabn https://crm-x-eight.vercel.app/login");
  console.log("   2. Lad 'Workspace'-feltet vaere TOMT (= Super Admin login)");
  console.log("   3. Indtast email + password");
  console.log("   4. Du redirectes til /admin");
  console.log("");
  console.log("⚠️  Skift password efter foerste login via /admin");
  console.log("");
}

main()
  .catch((err) => {
    console.error("FEJL:", err);
    process.exit(1);
  })
  .finally(async () => {
    await db.$disconnect();
  });
