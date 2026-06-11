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

export async function getCampaigns(opts?: { status?: string; type?: string }) {
  const session = await auth();
  if (!session?.user?.tenantId) return [];
  const { status, type } = opts ?? {};
  return db.campaign.findMany({
    where: {
      tenantId: session.user.tenantId,
      ...(status ? { status } : {}),
      ...(type ? { type } : {}),
    },
    include: { _count: { select: { leads: true } } },
    orderBy: { createdAt: "desc" },
  });
}

export async function getCampaign(id: string) {
  const session = await auth();
  if (!session?.user?.tenantId) return null;
  return db.campaign.findFirst({
    where: { id, tenantId: session.user.tenantId },
    include: {
      leads: {
        orderBy: { createdAt: "desc" },
        take: 50,
      },
      _count: { select: { leads: true } },
    },
  });
}

export async function createCampaign(formData: FormData) {
  const session = await getSession();
  const campaign = await db.campaign.create({
    data: {
      tenantId: session.user.tenantId!,
      name: formData.get("name") as string,
      type: (formData.get("type") as string) || null,
      status: "draft",
      startDate: formData.get("startDate") ? new Date(formData.get("startDate") as string) : null,
      endDate: formData.get("endDate") ? new Date(formData.get("endDate") as string) : null,
      budget: formData.get("budget") ? parseFloat(formData.get("budget") as string) : null,
      notes: (formData.get("notes") as string) || null,
    },
  });
  revalidatePath("/campaigns");
  redirect(`/campaigns/${campaign.id}`);
}

export async function updateCampaign(formData: FormData) {
  const session = await getSession();
  const id = formData.get("id") as string;
  await db.campaign.updateMany({
    where: { id, tenantId: session.user.tenantId! },
    data: {
      name: formData.get("name") as string,
      type: (formData.get("type") as string) || null,
      status: formData.get("status") as string,
      startDate: formData.get("startDate") ? new Date(formData.get("startDate") as string) : null,
      endDate: formData.get("endDate") ? new Date(formData.get("endDate") as string) : null,
      budget: formData.get("budget") ? parseFloat(formData.get("budget") as string) : null,
      notes: (formData.get("notes") as string) || null,
    },
  });
  revalidatePath("/campaigns");
  revalidatePath(`/campaigns/${id}`);
  redirect(`/campaigns/${id}`);
}

export async function deleteCampaign(id: string) {
  const session = await getSession();
  await db.campaign.deleteMany({ where: { id, tenantId: session.user.tenantId! } });
  revalidatePath("/campaigns");
  redirect("/campaigns");
}
