/**
 * Nulstil password for en specifik bruger
 * Kør: npx tsx prisma/reset-password.ts <email> <nyt-password>
 *
 * Eksempel:
 *   npx tsx prisma/reset-password.ts mads.andersen@demo.dk Test1234!
 */

import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const db = new PrismaClient();

async function main() {
  const email = process.argv[2];
  const newPassword = process.argv[3];

  if (!email || !newPassword) {
    console.error("Brug: npx tsx prisma/reset-password.ts <email> <password>");
    process.exit(1);
  }

  const hashed = await bcrypt.hash(newPassword, 12);

  // Find brugeren på tværs af alle tenants
  const users = await db.user.findMany({
    where: { email },
    include: { tenant: { select: { slug: true, name: true } } },
  });

  if (users.length === 0) {
    console.error(`❌ Ingen bruger fundet med email: ${email}`);
    process.exit(1);
  }

  for (const user of users) {
    await db.user.update({
      where: { id: user.id },
      data: { password: hashed },
    });
    console.log(`✅ Password nulstillet: ${user.name} (${user.tenant.name} — ${user.tenant.slug})`);
  }
}

main()
  .catch((e) => {
    console.error("❌ Fejl:", e.message);
    process.exit(1);
  })
  .finally(() => db.$disconnect());
