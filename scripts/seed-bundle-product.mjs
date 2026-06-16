/**
 * Opretter et standard "Klippekort"-produkt paa en tenant.
 *
 *   • Type: bundle
 *   • Prismodel: per_hour_bundle (timer x pris/time)
 *   • Listepris: 1.300 kr/time
 *
 * Brug: node scripts/seed-bundle-product.mjs <tenant-slug>
 * Eks:  node scripts/seed-bundle-product.mjs demo
 *
 * Idempotent: hvis et klippekort-produkt allerede findes oprettes ikke et nyt.
 */
import { PrismaClient } from "@prisma/client";

const slug = process.argv[2];
if (!slug) {
  console.error("Mangler tenant-slug. Brug: node scripts/seed-bundle-product.mjs <slug>");
  process.exit(1);
}

const db = new PrismaClient();
const tenant = await db.tenant.findFirst({ where: { slug } });
if (!tenant) {
  console.error(`Ingen tenant med slug "${slug}".`);
  process.exit(1);
}

// Tjek om der allerede er et klippekort-produkt
const existing = await db.product.findFirst({
  where: { tenantId: tenant.id, type: "bundle" },
});
if (existing) {
  console.log(`Klippekort-produkt findes allerede: "${existing.name}" (${existing.id})`);
  console.log(`Springer over.`);
  await db.$disconnect();
  process.exit(0);
}

const product = await db.product.create({
  data: {
    tenantId: tenant.id,
    name: "Klippekort",
    description: "Pre-paid timer der traekkes fra som arbejdet udfoeres.",
    sku: "KLIP-STD",
    category: "Service",
    type: "bundle",
    pricingMode: "per_hour_bundle",
    isActive: true,
    pricing: {
      create: [
        { interval: "onetime", price: 1300, currency: "DKK" },
      ],
    },
  },
});

console.log(`✓ Oprettede klippekort-produkt "${product.name}" paa "${tenant.name}"`);
console.log(`  Listepris: 1.300 kr/time`);
console.log(`  Type: bundle · pricingMode: per_hour_bundle`);
await db.$disconnect();
