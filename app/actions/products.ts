"use server";

import { db } from "@/lib/db";
import { auth } from "@/lib/auth";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

async function getSession() {
  const session = await auth();
  if (!session?.user?.tenantId) throw new Error("Ikke autoriseret");
  return session;
}

// ── Hent alle produkter ─────────────────────────────────────────────────────

export async function getProducts(opts?: { search?: string; category?: string; type?: string; isActive?: boolean }) {
  const session = await auth();
  if (!session?.user?.tenantId) return [];

  const { search, category, type, isActive } = opts ?? {};

  return db.product.findMany({
    where: {
      tenantId: session.user.tenantId,
      ...(search
        ? {
            OR: [
              { name: { contains: search, mode: "insensitive" } },
              { sku: { contains: search, mode: "insensitive" } },
              { description: { contains: search, mode: "insensitive" } },
            ],
          }
        : {}),
      ...(category ? { category } : {}),
      ...(type ? { type } : {}),
      ...(isActive !== undefined ? { isActive } : {}),
    },
    include: {
      pricing: { orderBy: { interval: "asc" } },
      _count: {
        select: {
          customerProducts: true,
          licenses: true,
          tickets: true,
        },
      },
    },
    orderBy: [{ category: "asc" }, { name: "asc" }],
  });
}

// ── Hent ét produkt ──────────────────────────────────────────────────────────

export async function getProduct(id: string) {
  const session = await auth();
  if (!session?.user?.tenantId) return null;

  return db.product.findFirst({
    where: { id, tenantId: session.user.tenantId },
    include: {
      pricing: { orderBy: { interval: "asc" } },
      customerProducts: {
        where: { isActive: true },
        include: {
          company: { select: { id: true, name: true } },
        },
        orderBy: { startDate: "desc" },
      },
      licenses: {
        include: { company: { select: { id: true, name: true } } },
        orderBy: { createdAt: "desc" },
        take: 10,
      },
      _count: {
        select: { customerProducts: true, licenses: true, tickets: true },
      },
    },
  });
}

// ── Unikke kategorier ────────────────────────────────────────────────────────

export async function getProductCategories() {
  const session = await auth();
  if (!session?.user?.tenantId) return [];

  const rows = await db.product.findMany({
    where: { tenantId: session.user.tenantId, category: { not: null } },
    select: { category: true },
    distinct: ["category"],
    orderBy: { category: "asc" },
  });

  return rows.map((r) => r.category!).filter(Boolean);
}

// ── Opret produkt ────────────────────────────────────────────────────────────

export async function createProduct(formData: FormData) {
  const session = await getSession();
  const tenantId = session.user.tenantId!;

  const product = await db.product.create({
    data: {
      tenantId,
      name: formData.get("name") as string,
      description: (formData.get("description") as string) || null,
      sku: (formData.get("sku") as string) || null,
      category: (formData.get("category") as string) || null,
      type: (formData.get("type") as string) || "other",
      isActive: true,
    },
  });

  revalidatePath("/products");
  redirect(`/products/${product.id}`);
}

// ── Opdater produkt ──────────────────────────────────────────────────────────

export async function updateProduct(formData: FormData) {
  const session = await getSession();
  const id = formData.get("id") as string;
  const isActiveStr = formData.get("isActive") as string;

  await db.product.updateMany({
    where: { id, tenantId: session.user.tenantId! },
    data: {
      name: formData.get("name") as string,
      description: (formData.get("description") as string) || null,
      sku: (formData.get("sku") as string) || null,
      category: (formData.get("category") as string) || null,
      type: (formData.get("type") as string) || "other",
      isActive: isActiveStr === "true",
    },
  });

  revalidatePath("/products");
  revalidatePath(`/products/${id}`);
  redirect(`/products/${id}`);
}

// ── Slet produkt ─────────────────────────────────────────────────────────────

export async function deleteProduct(id: string) {
  const session = await getSession();

  await db.product.deleteMany({
    where: { id, tenantId: session.user.tenantId! },
  });

  revalidatePath("/products");
  redirect("/products");
}

// ── Prismodel: opret/opdater/slet ───────────────────────────────────────────

const INTERVALS = ["monthly", "quarterly", "biannual", "annual", "onetime"] as const;

export async function upsertPricing(formData: FormData) {
  const session = await getSession();
  const productId = formData.get("productId") as string;

  // Bekræft ejerskab
  const product = await db.product.findFirst({
    where: { id: productId, tenantId: session.user.tenantId! },
  });
  if (!product) throw new Error("Produkt ikke fundet");

  for (const interval of INTERVALS) {
    const raw = formData.get(`price_${interval}`) as string;
    if (raw === "" || raw === null) {
      // Slet hvis tom
      await db.productPricing.deleteMany({ where: { productId, interval } });
    } else {
      const price = parseFloat(raw);
      if (isNaN(price) || price < 0) continue;
      await db.productPricing.upsert({
        where: { productId_interval: { productId, interval } },
        create: { productId, interval, price, currency: "DKK" },
        update: { price, currency: "DKK" },
      });
    }
  }

  revalidatePath(`/products/${productId}`);
  revalidatePath("/products/pricing");
  redirect(`/products/${productId}`);
}

// ── Kundeprodukter ───────────────────────────────────────────────────────────

export async function assignProductToCompany(formData: FormData) {
  const session = await getSession();

  // Læs SaaS-felter med fornuftige defaults så gamle formularer (uden seats/intervaller) stadig virker
  const seatsRaw = formData.get("seats") as string;
  const seats = seatsRaw ? Math.max(1, parseInt(seatsRaw) || 1) : 1;
  const pricingInterval = (formData.get("pricingInterval") as string) || "monthly";
  const billingInterval = (formData.get("billingInterval") as string) || "monthly";

  await db.customerProduct.create({
    data: {
      tenantId: session.user.tenantId!,
      companyId: formData.get("companyId") as string,
      productId: formData.get("productId") as string,
      pricingId: (formData.get("pricingId") as string) || null,
      seats,
      pricingInterval,
      billingInterval,
      notes: (formData.get("notes") as string) || null,
      startDate: formData.get("startDate")
        ? new Date(formData.get("startDate") as string)
        : new Date(),
      isActive: true,
    },
  });

  const companyId = formData.get("companyId") as string;
  const productId = formData.get("productId") as string;
  revalidatePath(`/kunder/${companyId}`);
  revalidatePath(`/products/${productId}`);
  redirect(`/kunder/${companyId}`);
}

export async function removeCustomerProduct(id: string, productId: string) {
  const session = await getSession();

  await db.customerProduct.deleteMany({
    where: { id, tenantId: session.user.tenantId! },
  });

  revalidatePath(`/products/${productId}`);
}
