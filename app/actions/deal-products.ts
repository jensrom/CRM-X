"use server";

/**
 * Deal-produkter
 * ──────────────
 * Tilbudte produkter på et pipeline-deal. Hver linje rummer alt der skal til
 * for at generere en fakturalinje senere:
 *   • produkt + antal/seats
 *   • prisinterval + faktureringsinterval
 *   • valgfri pris-override (special-pris ved forhandling)
 *   • rabat-procent
 *
 * Ved Vundet kopieres linjerne til Invoice + CustomerProduct (se markDealAsWon).
 */

import { db } from "@/lib/db";
import { auth } from "@/lib/auth";
import { revalidatePath } from "next/cache";

async function getSession() {
  const session = await auth();
  if (!session?.user?.tenantId) throw new Error("Ikke autoriseret");
  return session;
}

/** Tilføj produkt til deal. */
export async function addDealProduct(formData: FormData) {
  const session = await getSession();
  const tenantId = session.user.tenantId!;

  const dealId = formData.get("dealId") as string;
  const productId = formData.get("productId") as string;
  const seats = Math.max(1, parseInt((formData.get("seats") as string) || "1"));
  const pricingInterval = (formData.get("pricingInterval") as string) || "monthly";
  const billingInterval = (formData.get("billingInterval") as string) || "monthly";
  const overrideRaw = formData.get("unitPriceOverride") as string;
  const unitPriceOverride = overrideRaw ? parseFloat(overrideRaw) : null;
  const discountRaw = formData.get("discountPct") as string;
  const discountPct = discountRaw ? parseFloat(discountRaw) : 0;

  // Verificer ejerskab
  const [deal, product] = await Promise.all([
    db.deal.findFirst({ where: { id: dealId, tenantId } }),
    db.product.findFirst({ where: { id: productId, tenantId } }),
  ]);
  if (!deal || !product) throw new Error("Deal eller produkt ikke fundet");

  // Find næste sortOrder
  const last = await db.dealProduct.findFirst({
    where: { dealId },
    orderBy: { sortOrder: "desc" },
    select: { sortOrder: true },
  });
  const sortOrder = (last?.sortOrder ?? -1) + 1;

  await db.dealProduct.create({
    data: {
      tenantId,
      dealId,
      productId,
      seats,
      pricingInterval,
      billingInterval,
      unitPriceOverride,
      discountPct,
      sortOrder,
    },
  });

  await syncDealValue(dealId);

  revalidatePath(`/pipeline/${dealId}`);
}

/** Fjern produkt fra deal. */
export async function removeDealProduct(id: string, dealId: string) {
  const session = await getSession();
  const tenantId = session.user.tenantId!;
  await db.dealProduct.deleteMany({ where: { id, tenantId } });
  await syncDealValue(dealId);
  revalidatePath(`/pipeline/${dealId}`);
}

/**
 * Genberegn deal.value som summen af alle produkt-linjers totaler.
 * Bruger samme periode-multiplikator-logik som lib/billing-intervals.lineTotal().
 *
 * Dette opdaterer sælger-pipeline-værdier automatisk når produkter ændres.
 */
async function syncDealValue(dealId: string): Promise<void> {
  const lines = await db.dealProduct.findMany({
    where: { dealId },
    include: { product: { include: { pricing: true } } },
  });

  let total = 0;
  for (const line of lines) {
    const matchedPricing = line.product.pricing.find((p) => p.interval === line.pricingInterval)
      ?? line.product.pricing[0];
    const unitPrice = line.unitPriceOverride
      ? Number(line.unitPriceOverride)
      : matchedPricing ? Number(matchedPricing.price) : 0;
    const mult = periodMultiplier(line.pricingInterval, line.billingInterval, line.product.pricingMode);
    const subtotal = unitPrice * line.seats * mult;
    const discounted = subtotal * (1 - Number(line.discountPct) / 100);
    total += discounted;
  }

  await db.deal.update({
    where: { id: dealId },
    data: { value: total > 0 ? total : null },
  });
}

/**
 * Periode-multiplikator — duplikeret her som standalone fordi denne fil er
 * server-only og lib/billing-intervals importerer ikke noget der ikke virker
 * server-side. Hvis denne logik divergerer, er der noget galt.
 */
function periodMultiplier(pricing: string, billing: string, mode: string): number {
  if (mode === "per_unit") return 1;
  if (pricing === "onetime" || billing === "onetime") return 1;
  const MAP: Record<string, number> = { monthly: 1, quarterly: 3, biannual: 6, annual: 12 };
  const priceMonths = MAP[pricing] ?? 1;
  const billMonths = MAP[billing] ?? 1;
  if (priceMonths === 0) return 1;
  return billMonths / priceMonths;
}
