/**
 * GET /api/pipeline/export
 * Eksporter alle deals som CSV til Excel.
 */

import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { toCsv } from "@/lib/csv";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  const session = await auth();
  if (!session?.user?.tenantId) {
    return new NextResponse("Ikke autoriseret", { status: 401 });
  }
  const tenantId = session.user.tenantId;

  const deals = await db.deal.findMany({
    where: { tenantId },
    include: {
      company:    { select: { name: true, orgNumber: true } },
      assignedTo: { select: { name: true, email: true } },
    },
    orderBy: { createdAt: "desc" },
  });

  const headers = [
    "Titel", "Kunde", "CVR", "Stadie", "Værdi", "Valuta",
    "Sandsynlighed %", "Vægtet værdi", "Forventet lukke", "Lukket",
    "Tildelt", "Oprettet",
  ];

  const rows = deals.map((d) => {
    const value = d.value ? Number(d.value) : 0;
    const weighted = value * (d.probability / 100);
    return [
      d.title,
      d.company.name,
      d.company.orgNumber ?? "",
      d.stage,
      value.toFixed(2),
      d.currency,
      d.probability,
      weighted.toFixed(2),
      d.expectedCloseDate ? d.expectedCloseDate.toISOString().slice(0, 10) : "",
      d.closedAt ? d.closedAt.toISOString().slice(0, 10) : "",
      d.assignedTo?.name ?? "",
      d.createdAt.toISOString().slice(0, 10),
    ];
  });

  const csv = toCsv(headers, rows);
  const filename = `pipeline_${new Date().toISOString().slice(0, 10)}.csv`;

  return new NextResponse(csv, {
    status: 200,
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="${filename}"`,
      "Cache-Control": "no-store",
    },
  });
}
