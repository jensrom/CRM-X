/**
 * Backfill createdById på legacy data.
 *
 * For hver tenant: find første aktive admin (eller den foerste bruger).
 * Sæt createdById paa alle rows hvor det er NULL — saa CreatorBadge viser
 * et navn i stedet for "ukendt".
 *
 * Koer en gang: node scripts/backfill-createdby.mjs
 * Idempotent: ramme rows der allerede har createdById sat overspringes.
 */
import { PrismaClient } from "@prisma/client";

const db = new PrismaClient();

const MODELS = [
  { name: "company",    table: "Company"    },
  { name: "lead",       table: "Lead"       },
  { name: "deal",       table: "Deal"       },
  { name: "project",    table: "Project"    },
  { name: "hourBundle", table: "HourBundle" },
  { name: "ticket",     table: "Ticket"     },
];

const tenants = await db.tenant.findMany({ select: { id: true, name: true } });
console.log(`Backfilling paa ${tenants.length} tenants...`);

let totalUpdated = 0;

for (const tenant of tenants) {
  // Find foerste admin (eller hvis ingen, foerste aktive bruger)
  const fallbackUser = await db.user.findFirst({
    where: { tenantId: tenant.id, isActive: true },
    select: { id: true, name: true, role: { select: { name: true } } },
    orderBy: [
      { role: { isSystem: "desc" } },   // System-roller (Admin) foerst
      { createdAt: "asc" },              // Ellers ældste aktive
    ],
  });

  if (!fallbackUser) {
    console.log(`  ⚠ ${tenant.name}: ingen aktive brugere — springer over`);
    continue;
  }

  console.log(`\n[${tenant.name}] fallback: ${fallbackUser.name} (${fallbackUser.role?.name ?? "ingen rolle"})`);

  for (const m of MODELS) {
    const result = await db[m.name].updateMany({
      where: { tenantId: tenant.id, createdById: null },
      data: { createdById: fallbackUser.id },
    });
    if (result.count > 0) {
      console.log(`  ✓ ${m.table}: ${result.count} rows opdateret`);
      totalUpdated += result.count;
    }
  }
}

console.log(`\n🎉 Faerdig — ${totalUpdated} rows backfilled paa tværs af alle tenants.`);
await db.$disconnect();
