"use server";

import { db } from "@/lib/db";
import { auth } from "@/lib/auth";

export type TimeLogEntry = {
  id: string;
  date: Date;
  durationMin: number;
  description: string | null;
  isBillable: boolean;
  createdAt: Date;
  user: { id: string; name: string };
  ticket: { id: string; number: number; title: string; tenant: { ticketPrefix: string } } | null;
  project: { id: string; number: number; title: string; tenant: { projectPrefix: string } } | null;
  backlogItem: { id: string; title: string } | null;
};

const INCLUDE = {
  user: { select: { id: true, name: true } },
  ticket: {
    select: {
      id: true,
      number: true,
      title: true,
      tenant: { select: { ticketPrefix: true } },
    },
  },
  project: {
    select: {
      id: true,
      number: true,
      title: true,
      tenant: { select: { projectPrefix: true } },
    },
  },
  backlogItem: { select: { id: true, title: true } },
} as const;

export async function getMyTimeLogs(opts?: {
  from?: string;
  to?: string;
  projectId?: string;
  ticketId?: string;
  take?: number;
}): Promise<TimeLogEntry[]> {
  const session = await auth();
  if (!session?.user?.id) return [];

  const { from, to, projectId, ticketId, take = 200 } = opts ?? {};

  const rows = await db.timeLog.findMany({
    where: {
      userId: session.user.id,
      ...(from || to
        ? {
            date: {
              ...(from ? { gte: new Date(from) } : {}),
              ...(to ? { lte: new Date(to) } : {}),
            },
          }
        : {}),
      ...(projectId ? { projectId } : {}),
      ...(ticketId ? { ticketId } : {}),
    },
    include: INCLUDE,
    orderBy: [{ date: "desc" }, { createdAt: "desc" }],
    take,
  });

  return rows as unknown as TimeLogEntry[];
}

export async function getTenantTimeLogs(opts?: {
  from?: string;
  to?: string;
  userId?: string;
  take?: number;
}): Promise<TimeLogEntry[]> {
  const session = await auth();
  if (!session?.user?.tenantId) return [];

  const { from, to, userId, take = 500 } = opts ?? {};

  const rows = await db.timeLog.findMany({
    where: {
      user: { tenantId: session.user.tenantId },
      ...(from || to
        ? {
            date: {
              ...(from ? { gte: new Date(from) } : {}),
              ...(to ? { lte: new Date(to) } : {}),
            },
          }
        : {}),
      ...(userId ? { userId } : {}),
    },
    include: INCLUDE,
    orderBy: [{ date: "desc" }, { createdAt: "desc" }],
    take,
  });

  return rows as unknown as TimeLogEntry[];
}

export async function getTenantUsers() {
  const session = await auth();
  if (!session?.user?.tenantId) return [];

  return db.user.findMany({
    where: { tenantId: session.user.tenantId, isActive: true },
    select: { id: true, name: true },
    orderBy: { name: "asc" },
  });
}
