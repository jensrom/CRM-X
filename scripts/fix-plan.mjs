import { PrismaClient } from "@prisma/client";

const db = new PrismaClient();
const r = await db.tenant.updateMany({
  where: { plan: { in: ["enterprise", "professional", "business", "starter"] } },
  data: { plan: "large" },
});
console.log(`Updated ${r.count} tenant(s) with legacy plan-slugs to "large"`);
await db.$disconnect();
