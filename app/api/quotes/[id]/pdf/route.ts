/**
 * GET /api/quotes/[id]/pdf
 * Genererer og downloader tilbuddet som PDF.
 */

import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { renderToBuffer } from "@react-pdf/renderer";
import { QuotePdf } from "@/components/quotes/QuotePdf";
import React from "react";

export const runtime  = "nodejs";
export const dynamic  = "force-dynamic";

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

  const quote = await db.quote.findFirst({
    where: { id, tenantId },
    include: {
      company: {
        select: { name: true, address: true, city: true, zipCode: true, orgNumber: true },
      },
      lines: { orderBy: { sortOrder: "asc" } },
      tenant: {
        select: {
          name: true, quotePrefix: true,
          invoiceCompanyName: true, invoiceAddress: true, invoiceZipCity: true,
          invoiceCvr: true, invoiceEan: true, invoicePhone: true, invoiceEmail: true,
          invoiceFooter: true,
        },
      },
    },
  });

  if (!quote) {
    return new NextResponse("Tilbud ikke fundet", { status: 404 });
  }

  const pdfQuote = {
    number:     quote.number,
    issueDate:  quote.issueDate,
    validUntil: quote.validUntil,
    status:     quote.status,
    title:      quote.title,
    notes:      quote.notes,
    vatEnabled: quote.vatEnabled,
    vatPct:     Number(quote.vatPct),
    currency:   quote.currency,
    lines: quote.lines.map((l) => ({
      description: l.description,
      quantity:    Number(l.quantity),
      unitPrice:   Number(l.unitPrice),
      discountPct: Number(l.discountPct ?? 0),
    })),
  };

  let pdfBuffer: Buffer;
  try {
    pdfBuffer = await renderToBuffer(
      React.createElement(QuotePdf, {
        quote:   pdfQuote,
        company: quote.company,
        tenant:  quote.tenant,
      }),
    );
  } catch (err: any) {
    console.error("[pdf] quote-render-fejl:", err);
    return new NextResponse(`PDF-render fejlede: ${err?.message ?? "ukendt"}`, { status: 500 });
  }

  const quoteRef = `${quote.tenant.quotePrefix ?? "Q"}-${String(quote.number).padStart(4, "0")}`;
  const filename = `Tilbud_${quoteRef}_${quote.company.name.replace(/[^a-zA-Z0-9-]/g, "_")}.pdf`;

  return new NextResponse(new Uint8Array(pdfBuffer), {
    status: 200,
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="${filename}"`,
      "Cache-Control": "no-store",
    },
  });
}
