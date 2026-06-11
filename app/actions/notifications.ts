"use server";

import { db } from "@/lib/db";
import { auth } from "@/lib/auth";
import { revalidatePath } from "next/cache";

export async function getMyNotifications(take = 20) {
  const session = await auth();
  if (!session?.user?.id) return [];

  return db.notification.findMany({
    where: { userId: session.user.id },
    orderBy: { createdAt: "desc" },
    take,
  });
}

export async function getUnreadCount() {
  const session = await auth();
  if (!session?.user?.id) return 0;

  return db.notification.count({
    where: { userId: session.user.id, isRead: false },
  });
}

export async function markAsRead(id: string) {
  const session = await auth();
  if (!session?.user?.id) return;

  await db.notification.updateMany({
    where: { id, userId: session.user.id },
    data: { isRead: true, readAt: new Date() },
  });

  revalidatePath("/");
}

export async function markAllAsRead() {
  const session = await auth();
  if (!session?.user?.id) return;

  await db.notification.updateMany({
    where: { userId: session.user.id, isRead: false },
    data: { isRead: true, readAt: new Date() },
  });

  revalidatePath("/");
}

// Intern: opret notifikation til en bruger
export async function createNotification({
  tenantId,
  userId,
  type,
  title,
  message,
  linkUrl,
}: {
  tenantId: string;
  userId: string;
  type: string;
  title: string;
  message: string;
  linkUrl?: string;
}) {
  try {
    await db.notification.create({
      data: { tenantId, userId, type, title, message, linkUrl: linkUrl ?? null },
    });
  } catch {
    // Notifikationer er ikke kritiske - lad fejl passere stille
  }
}

// Tjek og opret advarsler for udløbende licenser + lave klippekort
// Kan kaldes fra session (ingen args) eller fra cron (tenantId som arg)
export async function runNotificationChecks(overrideTenantId?: string): Promise<number> {
  let tenantId: string;
  let recipientUserIds: string[];

  if (overrideTenantId) {
    // Kald fra cron: send til alle admin-brugere i tenanten
    tenantId = overrideTenantId;
    const admins = await db.user.findMany({
      where: { tenantId, isActive: true, role: { name: { in: ["admin", "super_admin"] } } },
      select: { id: true },
    });
    recipientUserIds = admins.map((u) => u.id);
    if (recipientUserIds.length === 0) return 0;
  } else {
    // Kald fra session: send kun til den aktuelle bruger
    const session = await auth();
    if (!session?.user?.tenantId || !session?.user?.id) return 0;
    tenantId = session.user.tenantId;
    recipientUserIds = [session.user.id];
  }

  const now = new Date();
  const in30 = new Date(now.getTime() + 30 * 86400000);
  let created = 0;

  // Udløbende licenser
  const expiringLicenses = await db.license.findMany({
    where: {
      tenantId,
      status: "active",
      expiresAt: { gte: now, lte: in30 },
    },
    select: { id: true, name: true, expiresAt: true, notifyDaysBefore: true },
  });

  for (const lic of expiringLicenses) {
    const days = Math.ceil((new Date(lic.expiresAt!).getTime() - now.getTime()) / 86400000);
    if (days > lic.notifyDaysBefore) continue;

    for (const userId of recipientUserIds) {
      const existing = await db.notification.findFirst({
        where: {
          tenantId,
          userId,
          type: "license_expiring",
          linkUrl: `/licenses/${lic.id}`,
          createdAt: { gte: new Date(now.getTime() - 7 * 86400000) },
        },
      });
      if (!existing) {
        await createNotification({
          tenantId,
          userId,
          type: "license_expiring",
          title: "Licens udløber snart",
          message: `${lic.name} udløber om ${days} dage`,
          linkUrl: `/licenses/${lic.id}`,
        });
        created++;
      }
    }
  }

  // Lave klippekort (< 20% resterende)
  const bundles = await db.hourBundle.findMany({
    where: { tenantId, isActive: true },
    select: { id: true, totalHours: true, usedMinutes: true, company: { select: { name: true } } },
  });

  for (const b of bundles) {
    const usedHours = b.usedMinutes / 60;
    const remaining = b.totalHours - usedHours;
    if (remaining / b.totalHours >= 0.2 || remaining <= 0) continue;

    for (const userId of recipientUserIds) {
      const existing = await db.notification.findFirst({
        where: {
          tenantId,
          userId,
          type: "bundle_low",
          linkUrl: `/klippekort/${b.id}`,
          createdAt: { gte: new Date(now.getTime() - 7 * 86400000) },
        },
      });
      if (!existing) {
        await createNotification({
          tenantId,
          userId,
          type: "bundle_low",
          title: "Klippekort snart opbrugt",
          message: `${b.company.name}: kun ${Math.round(remaining * 10) / 10}t tilbage`,
          linkUrl: `/klippekort/${b.id}`,
        });
        created++;
      }
    }
  }

  return created;
}
