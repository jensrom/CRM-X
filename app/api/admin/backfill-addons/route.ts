/**
 * One-shot backfill: migrer "forecast" fra Tenant.modules → Tenant.addOns
 *
 * Koerer kun for super-admins. Logik:
 *   1. Find alle tenants hvor "forecast" er i modules
 *   2. Hvis plan = "small" → fjern fra modules, addOns forbliver tom
 *      (small kan ikke have forecast som tilkoeb)
 *   3. Ellers (medium/large) → tilfoej "forecast" til addOns + behold i modules
 *      (sidebar gater stadig paa modules)
 *
 * Trigger: GET /api/admin/backfill-addons (kraever super-admin session)
 * Resultat returneres som JSON med liste af aendrede tenants.
 */

import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";

export const dynamic = "force-dynamic";

export async function GET() {
  const session = await auth();
  if (session?.user?.role !== "super_admin") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const tenants = await db.tenant.findMany({
    select: { id: true, name: true, plan: true, modules: true, addOns: true } as any,
  });

  const changes: Array<{
    id: string;
    name: string;
    plan: string;
    action: string;
    beforeModules: string[];
    afterModules: string[];
    beforeAddOns: string[];
    afterAddOns: string[];
  }> = [];

  for (const t of tenants as any[]) {
    const hadForecast = t.modules.includes("forecast");
    const currentAddOns: string[] = t.addOns ?? [];
    if (!hadForecast && !currentAddOns.includes("forecast")) continue;

    if (t.plan === "small") {
      // Fjern forecast fra small-tenants
      const newModules = t.modules.filter((m: string) => m !== "forecast");
      const newAddOns = currentAddOns.filter((a: string) => a !== "forecast");
      if (newModules.length !== t.modules.length || newAddOns.length !== currentAddOns.length) {
        await db.tenant.update({
          where: { id: t.id },
          data: { modules: newModules, addOns: newAddOns } as any,
        });
        changes.push({
          id: t.id,
          name: t.name,
          plan: t.plan,
          action: "removed_forecast_small_plan",
          beforeModules: t.modules,
          afterModules: newModules,
          beforeAddOns: currentAddOns,
          afterAddOns: newAddOns,
        });
      }
    } else if (hadForecast && !currentAddOns.includes("forecast")) {
      // Flyt forecast fra modules → addOns (behold i modules for sidebar-gating)
      const newAddOns = [...currentAddOns, "forecast"];
      await db.tenant.update({
        where: { id: t.id },
        data: { addOns: newAddOns } as any,
      });
      changes.push({
        id: t.id,
        name: t.name,
        plan: t.plan,
        action: "migrated_forecast_to_addons",
        beforeModules: t.modules,
        afterModules: t.modules,
        beforeAddOns: currentAddOns,
        afterAddOns: newAddOns,
      });
    }
  }

  return NextResponse.json({
    ok: true,
    totalTenants: tenants.length,
    changedCount: changes.length,
    changes,
  });
}
