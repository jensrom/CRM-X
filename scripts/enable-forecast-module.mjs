/**
 * Aktiver Forecast-modulet for en tenant.
 * Brug: node scripts/enable-forecast-module.mjs <tenant-slug>
 *
 * Eks. node scripts/enable-forecast-module.mjs plesner
 */
import { PrismaClient } from "@prisma/client";

const slug = process.argv[2];
if (!slug) {
  console.error("Mangler tenant-slug. Brug: node scripts/enable-forecast-module.mjs <slug>");
  process.exit(1);
}

const db = new PrismaClient();
const tenant = await db.tenant.findFirst({ where: { slug } });
if (!tenant) {
  console.error(`Ingen tenant med slug "${slug}".`);
  process.exit(1);
}

const modules = Array.from(new Set([...(tenant.modules ?? []), "forecast"]));
await db.tenant.update({
  where: { id: tenant.id },
  data: { modules },
});

console.log(`✓ Forecast-modulet aktiveret paa "${tenant.name}" (${slug})`);
console.log(`  Aktive moduler: ${modules.join(", ")}`);
await db.$disconnect();
