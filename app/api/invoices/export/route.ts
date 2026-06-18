/**
 * GET /api/invoices/export
 * Eksporter alle fakturaer som CSV til Excel.
 */

import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { toCsv } from "@/lib/csv";

export const runtime  = "nodejs";
export const dynamic  = "force-dynamic";

export async function GET() {
  const session = await auth();
  if (!session?.user?.tenantId) {
    return new NextResponse("Ikke autoriseret", { status: 401 });
  }
  const tenantId = session.user.tenantId;

  const invoices = await db.invoice.findMany({
    where: { tenantId },
    include: {
      company: { select: { name: true, orgNumber: true } },
      lines:   true,
      tenant:  { select: { invoicePrefix: true } },
    },
    orderBy: { createdAt: "desc" },
  });

  const headers = [
    "Nummer", "Kunde", "CVR", "Status", "Udstedt", "Forfald",
    "Subtotal", "Moms", "Total", "Valuta", "Linjer",
  ];

  const rows = invoices.map((inv) => {
    const subtotal = inv.lines.reduce((s, l) => {
      const base = Number(l.quantity) * Number(l.unitPrice);
      const disc = Number(l.discountPct ?? 0);
      return s + (l.isCredit ? -base * (1 - disc / 100) : base * (1 - disc / 100));
    }, 0);
    const vat = inv.vatEnabled ? subtotal * Number(inv.vatPct) / 100 : 0;
    const total = subtotal + vat;
    const ref = `${inv.tenant.invoicePrefix ?? "F"}-${String(inv.number).padStart(4, "0")}`;
    return [
      ref,
      inv.company.name,
      inv.company.orgNumber ?? "",
      inv.status,
      inv.issueDate.toISOString().slice(0, 10),
      inv.dueDate ? inv.dueDate.toISOString().slice(0, 10) : "",
      subtotal.toFixed(2),
      vat.toFixed(2),
      total.toFixed(2),
      inv.currency,
      inv.lines.length,
    ];
  });

  const csv = toCsv(headers, rows);
  const filename = `fakturaer_${new Date().toISOString().slice(0, 10)}.csv`;

  return new NextResponse(csv, {
    status: 200,
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="${filename}"`,
      "Cache-Control": "no-store",
    },
  });
}
