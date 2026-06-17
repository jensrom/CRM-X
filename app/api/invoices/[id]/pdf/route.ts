/**
 * GET /api/invoices/[id]/pdf
 * Genererer og downloader fakturaen som PDF.
 *
 * Sikkerheds-aftaler:
 *   • Krav login (auth())
 *   • Faktura skal vaere paa samme tenant som brugeren — ellers 404
 *   • PDF returneres som attachment med Content-Disposition saa browser tilbyder Save As
 *
 * Runtime: nodejs (ikke edge) fordi @react-pdf/renderer bruger Node APIs.
 */

import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { renderToBuffer } from "@react-pdf/renderer";
import { InvoicePdf } from "@/components/invoices/InvoicePdf";
import React from "react";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;

  const session = await auth();
  if (!session?.user?.tenantId) {
    return new NextResponse("Ikke autoriseret", { status: 401 });
  }
  const tenantId = session.user.tenantId;

  const invoice = await db.invoice.findFirst({
    where: { id, tenantId },
    include: {
      company: {
        select: { name: true, address: true, city: true, zipCode: true, orgNumber: true },
      },
      lines: { orderBy: { sortOrder: "asc" } },
      tenant: {
        select: {
          name: true, invoicePrefix: true,
          invoiceCompanyName: true, invoiceAddress: true, invoiceZipCity: true,
          invoiceCvr: true, invoiceEan: true, invoicePhone: true, invoiceEmail: true,
          invoiceFooter: true,
        },
      },
    },
  });

  if (!invoice) {
    return new NextResponse("Faktura ikke fundet", { status: 404 });
  }

  // Serialiser Decimal → number til PDF-komponenten
  const pdfInvoice = {
    number:     invoice.number,
    issueDate:  invoice.issueDate,
    dueDate:    invoice.dueDate,
    status:     invoice.status,
    notes:      invoice.notes,
    vatEnabled: invoice.vatEnabled,
    vatPct:     Number(invoice.vatPct),
    currency:   invoice.currency,
    lines: invoice.lines.map((l) => ({
      description: l.description,
      quantity:    Number(l.quantity),
      unitPrice:   Number(l.unitPrice),
      discountPct: Number(l.discountPct ?? 0),
      isCredit:    l.isCredit,
    })),
  };

  let pdfBuffer: Buffer;
  try {
    pdfBuffer = await renderToBuffer(
      React.createElement(InvoicePdf, {
        invoice: pdfInvoice,
        company: invoice.company,
        tenant:  invoice.tenant,
      }),
    );
  } catch (err: any) {
    console.error("[pdf] render-fejl:", err);
    return new NextResponse(`PDF-render fejlede: ${err?.message ?? "ukendt"}`, { status: 500 });
  }

  const invoiceRef = `${invoice.tenant.invoicePrefix}-${String(invoice.number).padStart(4, "0")}`;
  const filename = `Faktura_${invoiceRef}_${invoice.company.name.replace(/[^a-zA-Z0-9-]/g, "_")}.pdf`;

  return new NextResponse(new Uint8Array(pdfBuffer), {
    status: 200,
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="${filename}"`,
      "Cache-Control": "no-store",
    },
  });
}
