import { NextRequest, NextResponse } from "next/server";
import { runNotificationChecks } from "@/app/actions/notifications";
import { db } from "@/lib/db";

// Vercel Cron: kores dagligt kl. 07:00 UTC
// Kald manuelt: GET /api/cron/notifications?secret=CRON_SECRET

export async function GET(req: NextRequest) {
  // Beskyt endepunktet med secret header (sat af Vercel Cron automatisk)
  const authHeader = req.headers.get("authorization");
  const cronSecret = process.env.CRON_SECRET;

  if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    // Hent alle aktive tenants
    const tenants = await db.tenant.findMany({
      where: { isActive: true },
      select: { id: true, name: true },
    });

    let total = 0;
    const errors: string[] = [];

    for (const tenant of tenants) {
      try {
        const count = await runNotificationChecks(tenant.id);
        total += count;
      } catch (err) {
        errors.push(`${tenant.name}: ${err instanceof Error ? err.message : "ukendt fejl"}`);
      }
    }

    return NextResponse.json({
      ok: true,
      tenantsProcessed: tenants.length,
      notificationsSent: total,
      errors: errors.length > 0 ? errors : undefined,
      timestamp: new Date().toISOString(),
    });
  } catch (err) {
    console.error("[cron/notifications]", err);
    return NextResponse.json(
      { error: "Intern fejl", details: err instanceof Error ? err.message : "ukendt" },
      { status: 500 }
    );
  }
}
