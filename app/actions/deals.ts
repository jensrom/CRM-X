"use server";

import { db } from "@/lib/db";
import { auth } from "@/lib/auth";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createNotification } from "@/app/actions/notifications";
import { getCreatorContext } from "@/lib/creator-context";

export async function getDeals(stage?: string) {
  const session = await auth();
  if (!session?.user?.tenantId) return [];
  const tenantId = session.user.tenantId;

  return db.deal.findMany({
    where: {
      tenantId,
      ...(stage ? { stage } : {}),
    },
    include: {
      company: { select: { id: true, name: true } },
      assignedTo: { select: { id: true, name: true } },
    },
    orderBy: { createdAt: "desc" },
  });
}

export async function getDeal(id: string) {
  const session = await auth();
  if (!session?.user?.tenantId) return null;
  const tenantId = session.user.tenantId;

  return db.deal.findFirst({
    where: { id, tenantId },
    include: {
      company: { select: { id: true, name: true } },
      assignedTo: { select: { id: true, name: true } },
      activities: { orderBy: { createdAt: "desc" }, take: 10 },
      products: {
        include: {
          product: { include: { pricing: true } },
        },
        orderBy: { sortOrder: "asc" },
      },
      invoices: {
        select: { id: true, number: true, status: true, issueDate: true },
        orderBy: { issueDate: "desc" },
      },
    },
  });
}

export async function getPipelineStats() {
  const session = await auth();
  if (!session?.user?.tenantId) return null;
  const tenantId = session.user.tenantId;

  const [activeDeals, wonAgg, lostCount] = await Promise.all([
    db.deal.findMany({
      where: { tenantId, stage: { notIn: ["won", "lost"] } },
      select: { value: true, stage: true },
    }),
    db.deal.aggregate({
      where: { tenantId, stage: "won" },
      _sum: { value: true },
      _count: true,
    }),
    db.deal.count({ where: { tenantId, stage: "lost" } }),
  ]);

  const totalPipeline = activeDeals.reduce(
    (sum, d) => sum + (d.value ? Number(d.value) : 0),
    0
  );

  return {
    activeCount: activeDeals.length,
    totalPipeline,
    wonCount: wonAgg._count,
    wonValue: Number(wonAgg._sum.value ?? 0),
    lostCount,
  };
}

export async function createDeal(formData: FormData) {
  const session = await auth();
  if (!session?.user?.tenantId) throw new Error("Ikke autoriseret");
  const tenantId = session.user.tenantId;

  const valueStr = formData.get("value") as string;
  const probStr = formData.get("probability") as string;
  const closeDateStr = formData.get("expectedCloseDate") as string;
  const assignedToId = formData.get("assignedToId") as string;
  const contactId = formData.get("contactId") as string;

  const _creator = await getCreatorContext();

  const deal = await db.deal.create({
    data: {
      createdById: _creator.createdById,
      createdByImpersonatorId: _creator.createdByImpersonatorId,
      tenantId,
      title: formData.get("title") as string,
      companyId: formData.get("companyId") as string,
      contactId: contactId || null,
      assignedToId: assignedToId || null,
      value: valueStr ? parseFloat(valueStr) : null,
      currency: "DKK",
      stage: (formData.get("stage") as string) || "new",
      probability: probStr ? parseInt(probStr) : 0,
      expectedCloseDate: closeDateStr ? new Date(closeDateStr) : null,
      notes: (formData.get("notes") as string) || null,
    },
  });

  revalidatePath("/pipeline");
  redirect(`/pipeline/${deal.id}`);
}

export async function updateDealStage(dealId: string, stage: string) {
  const session = await auth();
  if (!session?.user?.tenantId) throw new Error("Ikke autoriseret");
  const tenantId = session.user.tenantId;

  await db.deal.update({
    where: { id: dealId, tenantId },
    data: { stage },
  });

  // Notifikation ved won
  if (stage === "won") {
    try {
      const session2 = await auth();
      const deal = await db.deal.findFirst({
        where: { id: dealId },
        select: { title: true, assignedToId: true, tenantId: true },
      });
      if (deal?.assignedToId && session2?.user?.tenantId) {
        await createNotification({
          tenantId: deal.tenantId,
          userId: deal.assignedToId,
          type: "deal_won",
          title: "Deal vundet!",
          message: deal.title,
          linkUrl: `/pipeline/${dealId}`,
        });
      }
    } catch {}
  }

  revalidatePath("/pipeline");
}

export async function updateDeal(formData: FormData) {
  const session = await auth();
  if (!session?.user?.tenantId) throw new Error("Ikke autoriseret");
  const tenantId = session.user.tenantId;
  const id = formData.get("id") as string;

  const valueStr = formData.get("value") as string;
  const probStr = formData.get("probability") as string;
  const closeDateStr = formData.get("expectedCloseDate") as string;
  const assignedToId = formData.get("assignedToId") as string;
  const contactId = formData.get("contactId") as string;
  const lostReason = formData.get("lostReason") as string;
  const stage = formData.get("stage") as string;

  await db.deal.update({
    where: { id, tenantId },
    data: {
      title: formData.get("title") as string,
      companyId: formData.get("companyId") as string,
      contactId: contactId || null,
      assignedToId: assignedToId || null,
      value: valueStr ? parseFloat(valueStr) : null,
      stage,
      probability: probStr ? parseInt(probStr) : 0,
      expectedCloseDate: closeDateStr ? new Date(closeDateStr) : null,
      notes: (formData.get("notes") as string) || null,
      lostReason: lostReason || null,
      closedAt:
        stage === "won" || stage === "lost" ? new Date() : null,
    },
  });

  revalidatePath("/pipeline");
  revalidatePath(`/pipeline/${id}`);
  redirect(`/pipeline/${id}`);
}

export async function deleteDeal(dealId: string) {
  const session = await auth();
  if (!session?.user?.tenantId) throw new Error("Ikke autoriseret");
  const tenantId = session.user.tenantId;
  await db.deal.deleteMany({ where: { id: dealId, tenantId } });
  revalidatePath("/pipeline");
  redirect("/pipeline");
}

/**
 * Markér deal som Vundet + generér faktura + tilkobl produkter på kunden.
 *
 * Flow:
 *   1. Sæt deal.stage = "won", closedAt = nu
 *   2. For hvert DealProduct: opret InvoiceLine + sørg for at en aktiv
 *      CustomerProduct findes (idempotent — overskriver ikke eksisterende)
 *   3. Opret Invoice i status="draft" så sælger kan justere før udsendelse
 *
 * Returnerer { invoiceId } — UI'en bruger den til at navigere til fakturaen.
 *
 * Idempotent på Invoice-niveau: hvis deal allerede har en draft-faktura,
 * smider vi en fejl så vi ikke duplikerer. Brugeren får besked om at åbne
 * den eksisterende.
 */
export async function markDealAsWon(dealId: string): Promise<{ invoiceId: string }> {
  const session = await auth();
  if (!session?.user?.tenantId) throw new Error("Ikke autoriseret");
  const tenantId = session.user.tenantId;

  const deal = await db.deal.findFirst({
    where: { id: dealId, tenantId },
    include: {
      products: { include: { product: { include: { pricing: true } } } },
      invoices: { where: { status: { not: "cancelled" } }, select: { id: true } },
    },
  });
  if (!deal) throw new Error("Deal ikke fundet");

  if (deal.products.length === 0) {
    throw new Error("Tilføj produkter til dealen før den kan markeres som Vundet.");
  }
  if (deal.invoices.length > 0) {
    throw new Error("Der findes allerede en faktura for denne deal. Åbn den i stedet for at generere en ny.");
  }

  // Næste faktura-nummer pr. tenant
  const last = await db.invoice.findFirst({
    where: { tenantId },
    orderBy: { number: "desc" },
    select: { number: true },
  });
  const number = (last?.number ?? 0) + 1;

  // Periode-multiplikator-helper (samme logik som deal-products.ts)
  const periodMult = (pricing: string, billing: string, mode: string): number => {
    if (mode === "per_unit") return 1;
    if (pricing === "onetime" || billing === "onetime") return 1;
    const MAP: Record<string, number> = { monthly: 1, quarterly: 3, biannual: 6, annual: 12 };
    return (MAP[billing] ?? 1) / (MAP[pricing] ?? 1);
  };

  // Byg invoice-linjer + customer-product-data fra deal-produkter
  const invoiceLines = deal.products.map((dp, idx) => {
    const matchedPricing = dp.product.pricing.find((p) => p.interval === dp.pricingInterval)
      ?? dp.product.pricing[0];
    const baseUnitPrice = dp.unitPriceOverride
      ? Number(dp.unitPriceOverride)
      : matchedPricing ? Number(matchedPricing.price) : 0;
    const mult = periodMult(dp.pricingInterval, dp.billingInterval, dp.product.pricingMode);
    const effectiveUnitPrice = baseUnitPrice * mult;

    return {
      description: `${dp.product.name}${dp.seats > 1 ? ` (${dp.seats} pladser)` : ""}`,
      quantity: dp.seats,
      unitPrice: effectiveUnitPrice,
      discountPct: Number(dp.discountPct),
      type: "product",
      productId: dp.productId,
      sortOrder: idx,
    };
  });

  // Transaktion: faktura + customer-products + deal-state
  const result = await db.$transaction(async (tx) => {
    const invoice = await tx.invoice.create({
      data: {
        tenantId,
        companyId: deal.companyId,
        dealId: deal.id,
        number,
        status: "draft",
        dueDate: new Date(Date.now() + 30 * 86400000),
        notes: `Genereret fra Vundet deal: ${deal.title}`,
        lines: { create: invoiceLines },
      },
    });

    // For hvert deal-produkt: opret CustomerProduct hvis den ikke findes aktiv
    for (const dp of deal.products) {
      const existing = await tx.customerProduct.findFirst({
        where: {
          tenantId,
          companyId: deal.companyId,
          productId: dp.productId,
          isActive: true,
        },
      });
      if (!existing) {
        await tx.customerProduct.create({
          data: {
            tenantId,
            companyId: deal.companyId,
            productId: dp.productId,
            seats: dp.seats,
            pricingInterval: dp.pricingInterval,
            billingInterval: dp.billingInterval,
            startDate: new Date(),
            notes: `Tilkoblet via Vundet deal "${deal.title}"`,
            isActive: true,
          },
        });
      }
    }

    // Marker deal som vundet
    await tx.deal.update({
      where: { id: deal.id },
      data: { stage: "won", closedAt: new Date() },
    });

    return invoice;
  });

  // Notifikation til ejer
  if (deal.assignedToId) {
    try {
      await createNotification({
        tenantId,
        userId: deal.assignedToId,
        type: "deal_won",
        title: "Deal vundet — faktura klar",
        message: `${deal.title} — F-${String(number).padStart(4, "0")}`,
        linkUrl: `/invoices/${result.id}`,
      });
    } catch {}
  }

  revalidatePath("/pipeline");
  revalidatePath(`/pipeline/${dealId}`);
  revalidatePath(`/companies/${deal.companyId}`);
  revalidatePath("/invoices");

  return { invoiceId: result.id };
}
