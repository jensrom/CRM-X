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

// Næste bundle-nummer pr. tenant
async function nextBundleNumber(tenantId: string): Promise<number> {
  const last = await db.hourBundle.findFirst({
    where: { tenantId },
    orderBy: { number: "desc" },
    select: { number: true },
  });
  return (last?.number ?? 0) + 1;
}

// Hent liste
export async function getHourBundles(opts?: { companyId?: string; isActive?: boolean }) {
  const session = await auth();
  if (!session?.user?.tenantId) return [];
  const tenantId = session.user.tenantId;

  return db.hourBundle.findMany({
    where: {
      tenantId,
      ...(opts?.companyId ? { companyId: opts.companyId } : {}),
      ...(opts?.isActive !== undefined ? { isActive: opts.isActive } : {}),
    },
    include: {
      company: { select: { id: true, name: true } },
      projectBundles: {
        include: {
          project: { select: { id: true, title: true, number: true } },
        },
      },
    },
    orderBy: [{ isActive: "desc" }, { purchaseDate: "desc" }],
  });
}

// Hent enkelt bundle
export async function getHourBundle(id: string) {
  const session = await auth();
  if (!session?.user?.tenantId) return null;
  const tenantId = session.user.tenantId;

  return db.hourBundle.findFirst({
    where: { id, tenantId },
    include: {
      company: { select: { id: true, name: true } },
      projectBundles: {
        include: {
          project: {
            select: {
              id: true, title: true, number: true,
              tenant: { select: { projectPrefix: true } },
            },
          },
        },
        orderBy: { addedAt: "asc" },
      },
      timeLogs: {
        include: {
          user: { select: { id: true, name: true } },
          project: { select: { id: true, title: true, number: true } },
        },
        orderBy: { date: "desc" },
      },
    },
  });
}

// Opret bundle
export async function createHourBundle(formData: FormData) {
  const session = await getSession();
  const tenantId = session.user.tenantId!;

  const number = await nextBundleNumber(tenantId);
  const price = formData.get("price") as string;
  const expiresAt = formData.get("expiresAt") as string;

  const bundle = await db.hourBundle.create({
    data: {
      tenantId,
      number,
      companyId: formData.get("companyId") as string,
      name: (formData.get("name") as string) || null,
      totalHours: parseInt(formData.get("totalHours") as string),
      price: price ? parseFloat(price) : null,
      expiresAt: expiresAt ? new Date(expiresAt) : null,
      notes: (formData.get("notes") as string) || null,
      isActive: true,
    },
  });

  revalidatePath("/klippekort");
  redirect(`/klippekort/${bundle.id}`);
}

// Opdater bundle
export async function updateHourBundle(formData: FormData) {
  const session = await getSession();
  const tenantId = session.user.tenantId!;
  const id = formData.get("id") as string;

  const price = formData.get("price") as string;
  const expiresAt = formData.get("expiresAt") as string;

  await db.hourBundle.update({
    where: { id, tenantId },
    data: {
      name: (formData.get("name") as string) || null,
      totalHours: parseInt(formData.get("totalHours") as string),
      price: price ? parseFloat(price) : null,
      expiresAt: expiresAt ? new Date(expiresAt) : null,
      notes: (formData.get("notes") as string) || null,
      isActive: formData.get("isActive") === "true",
    },
  });

  revalidatePath("/klippekort");
  revalidatePath(`/klippekort/${id}`);
  redirect(`/klippekort/${id}`);
}

// Slet bundle
export async function deleteHourBundle(id: string) {
  const session = await getSession();
  const tenantId = session.user.tenantId!;
  await db.hourBundle.deleteMany({ where: { id, tenantId } });
  revalidatePath("/klippekort");
  redirect("/klippekort");
}
