"use server";

/**
 * Quote actions — tilbuds-CRUD + lifecycle.
 * ─────────────────────────────────────────
 * Status-flow:   draft → sent → accepted → (convert → Invoice)
 *                            ↘ rejected
 *                            ↘ expired (auto baseret på validUntil)
 *
 * Konvertering: når et tilbud accepteres kalder UI'en convertQuoteToInvoice
 * som kopierer linjerne over i en ny Invoice (status="draft") og laaser
 * tilbuddet (convertedToInvoiceId+convertedAt sat). Ingen data dupliceres
 * udover snapshot — tilbuddet beholdes som dokumentation.
 */

import { db } from "@/lib/db";
import { auth } from "@/lib/auth";
import { getCreatorContext } from "@/lib/creator-context";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

async function requireTenant() {
  const session = await auth();
  if (!session?.user?.tenantId) throw new Error("Ikke autoriseret");
  return session.user.tenantId;
}

async function nextQuoteNumber(tenantId: string): Promise<number> {
  const last = await db.quote.findFirst({
    where: { tenantId },
    orderBy: { number: "desc" },
    select: { number: true },
  });
  return (last?.number ?? 0) + 1;
}

// ─── Læs ────────────────────────────────────────────────────────────────

export async function getQuotes(opts?: { companyId?: string; status?: string; dealId?: string }) {
  const session = await auth();
  if (!session?.user?.tenantId) return [];
  const tenantId = session.user.tenantId;

  return db.quote.findMany({
    where: {
      tenantId,
      ...(opts?.companyId ? { companyId: opts.companyId } : {}),
      ...(opts?.status ? { status: opts.status } : {}),
      ...(opts?.dealId ? { dealId: opts.dealId } : {}),
    },
    include: {
      company: { select: { id: true, name: true } },
      deal:    { select: { id: true, title: true } },
      lines:   true,
    },
    orderBy: { createdAt: "desc" },
  });
}

export async function getQuote(id: string) {
  const session = await auth();
  if (!session?.user?.tenantId) return null;
  const tenantId = session.user.tenantId;

  return db.quote.findFirst({
    where: { id, tenantId },
    include: {
      company: { select: { id: true, name: true, address: true, city: true, zipCode: true, orgNumber: true } },
      deal:    { select: { id: true, title: true } },
      lines:   { orderBy: { sortOrder: "asc" } },
      tenant:  { select: { name: true, quotePrefix: true, invoicePrefix: true } },
    },
  });
}

// ─── Opret / opdater ────────────────────────────────────────────────────

export async function createQuote(formData: FormData) {
  const tenantId = await requireTenant();
  const { createdById, createdByImpersonatorId } = await getCreatorContext();

  const companyId = String(formData.get("companyId") ?? "");
  const dealId    = String(formData.get("dealId") ?? "") || null;
  const title     = String(formData.get("title") ?? "") || null;
  const validDays = Number(formData.get("validDays") ?? 30);
  if (!companyId) throw new Error("Vælg en kunde");

  const number = await nextQuoteNumber(tenantId);
  const validUntil = new Date(Date.now() + validDays * 24 * 60 * 60 * 1000);

  const quote = await db.quote.create({
    data: {
      tenantId, companyId, dealId, title, number, validUntil,
      createdById, createdByImpersonatorId,
    },
  });

  revalidatePath("/quotes");
  redirect(`/quotes/${quote.id}`);
}

/**
 * Genererer et tilbud fra et deal — tager DealProducts og laver QuoteLines.
 * Bruges fra Pipeline-deal-siden ("Generer tilbud fra deal"-knap).
 */
export async function createQuoteFromDeal(dealId: string) {
  const tenantId = await requireTenant();
  const { createdById, createdByImpersonatorId } = await getCreatorContext();

  const deal = await db.deal.findFirst({
    where: { id: dealId, tenantId },
    include: {
      products: { include: { product: { include: { pricing: true } } } },
    },
  });
  if (!deal) throw new Error("Deal ikke fundet");

  const number = await nextQuoteNumber(tenantId);

  // Beregn linje-priser fra dealProducts (samme logik som vundet-flow)
  const lines = deal.products.map((dp, idx) => {
    const pricing = dp.product.pricing.find((p) => p.interval === dp.pricingInterval);
    const baseUnitPrice = dp.unitPriceOverride
      ? Number(dp.unitPriceOverride)
      : Number(pricing?.price ?? 0);
    const seats = dp.seats ?? 1;
    return {
      description: dp.product.name + (seats > 1 ? ` (${seats} pladser)` : ""),
      quantity: seats,
      unitPrice: baseUnitPrice,
      discountPct: Number(dp.discountPct ?? 0),
      type: "product",
      productId: dp.productId,
      sortOrder: idx,
    };
  });

  const quote = await db.quote.create({
    data: {
      tenantId,
      companyId: deal.companyId,
      dealId: deal.id,
      number,
      title: deal.title,
      validUntil: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
      createdById,
      createdByImpersonatorId,
      lines: { create: lines },
    },
  });

  revalidatePath("/quotes");
  revalidatePath(`/pipeline/${dealId}`);
  return quote.id;
}

export async function updateQuote(id: string, formData: FormData) {
  const tenantId = await requireTenant();

  const title      = String(formData.get("title") ?? "") || null;
  const notes      = String(formData.get("notes") ?? "") || null;
  const validUntilRaw = String(formData.get("validUntil") ?? "");
  const vatEnabled = String(formData.get("vatEnabled") ?? "true") === "true";
  const vatPct     = Number(formData.get("vatPct") ?? 25);

  await db.quote.updateMany({
    where: { id, tenantId, status: { in: ["draft", "sent"] } },
    data: {
      title, notes,
      validUntil: validUntilRaw ? new Date(validUntilRaw) : undefined,
      vatEnabled, vatPct,
    },
  });

  revalidatePath(`/quotes/${id}`);
}

// ─── Linjer ─────────────────────────────────────────────────────────────

export async function upsertQuoteLine(quoteId: string, formData: FormData) {
  const tenantId = await requireTenant();

  // Sikkerheds-tjek: tilhører tilbuddet denne tenant, og er det redigerbart?
  const quote = await db.quote.findFirst({
    where: { id: quoteId, tenantId },
    select: { status: true },
  });
  if (!quote) throw new Error("Tilbud ikke fundet");
  if (!["draft", "sent"].includes(quote.status)) {
    throw new Error("Tilbuddet er låst — kan ikke redigeres");
  }

  const lineId      = String(formData.get("lineId") ?? "") || null;
  const description = String(formData.get("description") ?? "");
  const quantity    = Number(formData.get("quantity") ?? 1);
  const unitPrice   = Number(formData.get("unitPrice") ?? 0);
  const discountPct = Number(formData.get("discountPct") ?? 0);
  const type        = String(formData.get("type") ?? "manual");

  if (lineId) {
    await db.quoteLine.update({
      where: { id: lineId },
      data: { description, quantity, unitPrice, discountPct, type },
    });
  } else {
    const lastSort = await db.quoteLine.findFirst({
      where: { quoteId },
      orderBy: { sortOrder: "desc" },
      select: { sortOrder: true },
    });
    await db.quoteLine.create({
      data: {
        quoteId, description, quantity, unitPrice, discountPct, type,
        sortOrder: (lastSort?.sortOrder ?? 0) + 1,
      },
    });
  }

  revalidatePath(`/quotes/${quoteId}`);
}

export async function deleteQuoteLine(lineId: string, quoteId: string) {
  const tenantId = await requireTenant();
  const quote = await db.quote.findFirst({
    where: { id: quoteId, tenantId },
    select: { status: true },
  });
  if (!quote || !["draft", "sent"].includes(quote.status)) {
    throw new Error("Tilbuddet kan ikke redigeres");
  }
  await db.quoteLine.delete({ where: { id: lineId } });
  revalidatePath(`/quotes/${quoteId}`);
}

// ─── Lifecycle ──────────────────────────────────────────────────────────

export async function sendQuote(id: string) {
  const tenantId = await requireTenant();
  await db.quote.updateMany({
    where: { id, tenantId, status: "draft" },
    data: { status: "sent", sentAt: new Date() },
  });
  revalidatePath(`/quotes/${id}`);
}

export async function acceptQuote(id: string) {
  const tenantId = await requireTenant();
  await db.quote.updateMany({
    where: { id, tenantId, status: { in: ["draft", "sent"] } },
    data: { status: "accepted", acceptedAt: new Date() },
  });
  revalidatePath(`/quotes/${id}`);
}

export async function rejectQuote(id: string, formData: FormData) {
  const tenantId = await requireTenant();
  const reason = String(formData.get("reason") ?? "") || null;
  await db.quote.updateMany({
    where: { id, tenantId, status: { in: ["draft", "sent"] } },
    data: { status: "rejected", rejectedAt: new Date(), rejectedReason: reason },
  });
  revalidatePath(`/quotes/${id}`);
}

/**
 * Konverter et accepteret tilbud til en faktura.
 * Snapshot-kopierer linjer, binder Quote.convertedToInvoiceId.
 */
export async function convertQuoteToInvoice(id: string) {
  const tenantId = await requireTenant();
  const { createdById, createdByImpersonatorId } = await getCreatorContext();

  const quote = await db.quote.findFirst({
    where: { id, tenantId },
    include: { lines: { orderBy: { sortOrder: "asc" } } },
  });
  if (!quote) throw new Error("Tilbud ikke fundet");
  if (quote.status !== "accepted") {
    throw new Error("Kun accepterede tilbud kan konverteres til faktura");
  }
  if (quote.convertedToInvoiceId) {
    redirect(`/invoices/${quote.convertedToInvoiceId}`);
  }

  // Næste faktura-nummer
  const lastInv = await db.invoice.findFirst({
    where: { tenantId },
    orderBy: { number: "desc" },
    select: { number: true },
  });
  const invoiceNumber = (lastInv?.number ?? 0) + 1;

  const result = await db.$transaction(async (tx) => {
    const invoice = await tx.invoice.create({
      data: {
        tenantId,
        companyId: quote.companyId,
        dealId: quote.dealId ?? undefined,
        number: invoiceNumber,
        status: "draft",
        vatEnabled: quote.vatEnabled,
        vatPct: quote.vatPct,
        customerType: quote.customerType,
        notes: quote.notes,
        createdById,
        createdByImpersonatorId,
        lines: {
          create: quote.lines.map((l) => ({
            description: l.description,
            quantity:    l.quantity,
            unitPrice:   l.unitPrice,
            discountPct: l.discountPct,
            type:        l.type,
            sortOrder:   l.sortOrder,
            productId:   l.productId,
          })),
        },
      },
    });

    await tx.quote.update({
      where: { id: quote.id },
      data: {
        convertedToInvoiceId: invoice.id,
        convertedAt: new Date(),
      },
    });

    return invoice;
  });

  revalidatePath("/invoices");
  revalidatePath("/quotes");
  redirect(`/invoices/${result.id}`);
}

export async function deleteQuote(id: string) {
  const tenantId = await requireTenant();
  const quote = await db.quote.findFirst({
    where: { id, tenantId },
    select: { status: true, convertedToInvoiceId: true },
  });
  if (!quote) throw new Error("Tilbud ikke fundet");
  if (quote.convertedToInvoiceId) {
    throw new Error("Tilbuddet er konverteret til faktura og kan ikke slettes");
  }
  await db.quote.delete({ where: { id } });
  revalidatePath("/quotes");
  redirect("/quotes");
}
