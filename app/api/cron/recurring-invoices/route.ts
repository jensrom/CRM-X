/**
 * /api/cron/recurring-invoices — daglig cron der genererer forfaldne fakturaer.
 *
 * Vercel Cron rammer denne hver dag kl. 06:00 UTC.
 * Authentication: Vercel sender header "Authorization: Bearer <CRON_SECRET>"
 * naar de aktiverer cronjob. Vi tjekker secret matcher.
 *
 * Returnerer JSON summary: { total, succeeded, failed, generatedInvoiceIds }.
 */

import { NextResponse } from "next/server";
import { runDueRecurring } from "@/app/actions/recurring-invoices";

export const runtime = "nodejs";
// Disable response caching — vi vil have frisk DB-query hver gang
export const dynamic = "force-dynamic";

function isAuthorized(request: Request): boolean {
  const header = request.headers.get("authorization");
  const secret = process.env.CRON_SECRET;
  if (!secret) return false;
  // Tillad enten Bearer <secret> eller raw secret som query-param
  if (header === `Bearer ${secret}`) return true;
  const url = new URL(request.url);
  if (url.searchParams.get("secret") === secret) return true;
  return false;
}

export async function GET(request: Request) {
  if (!isAuthorized(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const result = await runDueRecurring();
    console.log("[cron/recurring-invoices]", result);
    return NextResponse.json({ ok: true, ...result });
  } catch (err: any) {
    console.error("[cron/recurring-invoices] FAILED", err);
    return NextResponse.json(
      { ok: false, error: err?.message ?? "Cron-job fejlede" },
      { status: 500 },
    );
  }
}
