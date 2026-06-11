"use server";

import { db } from "@/lib/db";
import { auth } from "@/lib/auth";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createNotification } from "@/app/actions/notifications";

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

  const deal = await db.deal.create({
    data: {
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

  await db.deal.delete({ where: { id: dealId, tenantId } });
  revalidatePath("/pipeline");
  redirect("/pipeline");
}
