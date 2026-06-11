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

export async function getLicenses(opts?: {
  companyId?: string;
  productId?: string;
  status?: string;
}) {
  const session = await auth();
  if (!session?.user?.tenantId) return [];

  const { companyId, productId, status } = opts ?? {};

  return db.license.findMany({
    where: {
      tenantId: session.user.tenantId,
      ...(companyId ? { companyId } : {}),
      ...(productId ? { productId } : {}),
      ...(status ? { status } : {}),
    },
    include: {
      company: { select: { id: true, name: true } },
      product: { select: { id: true, name: true, sku: true } },
      files: { select: { id: true, name: true, size: true, uploadedAt: true } },
    },
    orderBy: [{ expiresAt: "asc" }, { createdAt: "desc" }],
  });
}

export async function getLicense(id: string) {
  const session = await auth();
  if (!session?.user?.tenantId) return null;

  return db.license.findFirst({
    where: { id, tenantId: session.user.tenantId },
    include: {
      company: { select: { id: true, name: true } },
      product: { select: { id: true, name: true, sku: true } },
      files: { orderBy: { uploadedAt: "desc" } },
    },
  });
}

export async function createLicense(formData: FormData) {
  const session = await getSession();

  const expiresAtRaw = formData.get("expiresAt") as string;
  const notifyDays = parseInt(formData.get("notifyDaysBefore") as string) || 30;

  const license = await db.license.create({
    data: {
      tenantId: session.user.tenantId!,
      companyId: formData.get("companyId") as string,
      productId: (formData.get("productId") as string) || null,
      name: formData.get("name") as string,
      licenseKey: (formData.get("licenseKey") as string) || null,
      notes: (formData.get("notes") as string) || null,
      expiresAt: expiresAtRaw ? new Date(expiresAtRaw) : null,
      status: "active",
      notifyDaysBefore: notifyDays,
    },
  });

  revalidatePath("/licenses");
  redirect(`/licenses/${license.id}`);
}

export async function updateLicense(formData: FormData) {
  const session = await getSession();
  const id = formData.get("id") as string;

  const expiresAtRaw = formData.get("expiresAt") as string;
  const notifyDays = parseInt(formData.get("notifyDaysBefore") as string) || 30;

  await db.license.updateMany({
    where: { id, tenantId: session.user.tenantId! },
    data: {
      name: formData.get("name") as string,
      productId: (formData.get("productId") as string) || null,
      licenseKey: (formData.get("licenseKey") as string) || null,
      notes: (formData.get("notes") as string) || null,
      expiresAt: expiresAtRaw ? new Date(expiresAtRaw) : null,
      status: formData.get("status") as string,
      notifyDaysBefore: notifyDays,
    },
  });

  revalidatePath("/licenses");
  revalidatePath(`/licenses/${id}`);
  redirect(`/licenses/${id}`);
}

export async function deleteLicense(id: string) {
  const session = await getSession();

  await db.license.deleteMany({
    where: { id, tenantId: session.user.tenantId! },
  });

  revalidatePath("/licenses");
  redirect("/licenses");
}

// Days until expiry — negative = already expired
function daysUntilExpiry(expiresAt: Date | null): number | null {
  if (!expiresAt) return null;
  const now = new Date();
  return Math.ceil((expiresAt.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
}
