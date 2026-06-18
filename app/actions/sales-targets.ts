"use server";

/**
 * Sales targets — salgs-maal pr. bruger pr. periode.
 *
 * Maal = aftalt revenue eller antal vundne deals i en periode.
 * Progress = SUM af Deal.value (eller COUNT) hvor stage="won" og
 * closedAt indenfor periode og assignedToId=user.
 *
 * Admin kan saette maal. Bruger ser deres egen progress + leaderboard.
 */

import { db } from "@/lib/db";
import { auth } from "@/lib/auth";
import { revalidatePath } from "next/cache";

type PeriodType = "month" | "quarter" | "year";
type TargetType = "revenue" | "won_deals";

async function getSession() {
  const session = await auth();
  if (!session?.user?.tenantId) throw new Error("Ikke autoriseret");
  return session;
}

/** Returnerer foerste/sidste dag i den periode der indeholder `now`. */
export function periodBounds(
  type: PeriodType,
  now: Date = new Date(),
): { start: Date; end: Date; label: string } {
  const y = now.getFullYear();
  const m = now.getMonth();
  if (type === "month") {
    const start = new Date(Date.UTC(y, m, 1));
    const end = new Date(Date.UTC(y, m + 1, 0));
    const label = start.toLocaleDateString("da-DK", {
      month: "long",
      year: "numeric",
    });
    return { start, end, label };
  }
  if (type === "quarter") {
    const qStart = Math.floor(m / 3) * 3;
    const start = new Date(Date.UTC(y, qStart, 1));
    const end = new Date(Date.UTC(y, qStart + 3, 0));
    const qNum = Math.floor(qStart / 3) + 1;
    return { start, end, label: `Q${qNum} ${y}` };
  }
  // year
  const start = new Date(Date.UTC(y, 0, 1));
  const end = new Date(Date.UTC(y, 11, 31));
  return { start, end, label: `${y}` };
}

/** Liste over alle maal for tenant (admin-view). */
export async function listSalesTargets(
  periodStart?: Date,
): Promise<any[]> {
  const session = await getSession();
  const tenantId = session.user.tenantId!;

  const where: any = { tenantId };
  if (periodStart) where.periodStart = periodStart;

  return db.salesTarget.findMany({
    where,
    include: { user: { select: { id: true, name: true, email: true } } },
    orderBy: [{ periodStart: "desc" }, { targetAmount: "desc" }],
  });
}

/**
 * Saet eller opdater et maal (upsert).
 * Admin-action: kan saette maal for hvilken som helst bruger i tenanten.
 */
export async function upsertSalesTarget(formData: FormData) {
  const session = await getSession();
  const tenantId = session.user.tenantId!;
  const createdById = session.user.id ?? null;

  const userId = (formData.get("userId") as string) || null;
  const periodType = ((formData.get("periodType") as string) || "month") as PeriodType;
  const targetType = ((formData.get("targetType") as string) || "revenue") as TargetType;
  const targetAmount = Number(formData.get("targetAmount") ?? 0);
  const periodStartStr = (formData.get("periodStart") as string) || "";

  if (!targetAmount || targetAmount <= 0) {
    throw new Error("Maalbelob skal vaere positivt");
  }
  if (!periodStartStr) {
    throw new Error("Periode skal vaelges");
  }

  // periodStart kommer som "YYYY-MM" (month-input) eller "YYYY-MM-DD"
  let parsedStart: Date;
  if (/^\d{4}-\d{2}$/.test(periodStartStr)) {
    parsedStart = new Date(`${periodStartStr}-01T00:00:00Z`);
  } else {
    parsedStart = new Date(periodStartStr);
  }
  const { start, end } = periodBounds(periodType, parsedStart);

  // Validate userId tilhoerer tenant
  if (userId) {
    const u = await db.user.findFirst({
      where: { id: userId, tenantId },
      select: { id: true },
    });
    if (!u) throw new Error("Bruger findes ikke i din tenant");
  }

  await db.salesTarget.upsert({
    where: {
      tenantId_userId_periodStart_targetType: {
        tenantId,
        userId: userId ?? "",
        periodStart: start,
        targetType,
      },
    } as any,
    create: {
      tenantId,
      userId,
      periodType,
      periodStart: start,
      periodEnd: end,
      targetType,
      targetAmount,
      createdById,
    },
    update: {
      targetAmount,
      periodEnd: end,
    },
  });

  revalidatePath("/sales/targets");
  revalidatePath("/dashboard");
}

/** Slet et maal. */
export async function deleteSalesTarget(id: string) {
  const session = await getSession();
  const tenantId = session.user.tenantId!;
  await db.salesTarget.deleteMany({ where: { id, tenantId } });
  revalidatePath("/sales/targets");
}

/**
 * Beregn progress for en saet [bruger, periode, type] mod tenantens deals.
 * Returnerer {achieved, percent}. achieved er revenue (DKK) eller antal vundne deals.
 */
async function calcProgress(args: {
  tenantId: string;
  userId: string | null;
  periodStart: Date;
  periodEnd: Date;
  targetType: TargetType;
}): Promise<{ achieved: number; count: number }> {
  const where: any = {
    tenantId: args.tenantId,
    stage: "won",
    closedAt: { gte: args.periodStart, lte: args.periodEnd },
  };
  if (args.userId) where.assignedToId = args.userId;

  if (args.targetType === "won_deals") {
    const count = await db.deal.count({ where });
    return { achieved: count, count };
  }

  // revenue
  const wonDeals = await db.deal.findMany({
    where,
    select: { value: true },
  });
  const achieved = wonDeals.reduce(
    (sum, d) => sum + Number(d.value ?? 0),
    0,
  );
  return { achieved, count: wonDeals.length };
}

/**
 * Hent maal + progress for den indloggede bruger (nuvaerende maaned).
 * Returnerer null hvis ingen maal er sat.
 */
export async function getMyCurrentTarget() {
  const session = await getSession();
  const tenantId = session.user.tenantId!;
  const userId = session.user.id!;
  const { start, end, label } = periodBounds("month");

  const target = await db.salesTarget.findFirst({
    where: {
      tenantId,
      userId,
      periodStart: start,
      targetType: "revenue",
    },
  });
  if (!target) return null;

  const progress = await calcProgress({
    tenantId,
    userId,
    periodStart: start,
    periodEnd: end,
    targetType: "revenue",
  });

  const targetAmount = Number(target.targetAmount);
  return {
    label,
    targetAmount,
    achieved: progress.achieved,
    count: progress.count,
    percent: targetAmount > 0 ? Math.min(100, Math.round((progress.achieved / targetAmount) * 100)) : 0,
    currency: target.currency,
  };
}

/**
 * Leaderboard: alle brugere med revenue-maal i indevaerende maaned,
 * sorteret efter progress %.
 */
export async function getCurrentLeaderboard() {
  const session = await getSession();
  const tenantId = session.user.tenantId!;
  const { start, end, label } = periodBounds("month");

  const targets = await db.salesTarget.findMany({
    where: {
      tenantId,
      periodStart: start,
      targetType: "revenue",
      userId: { not: null },
    },
    include: { user: { select: { id: true, name: true, email: true } } },
  });

  const rows = await Promise.all(
    targets.map(async (t) => {
      const prog = await calcProgress({
        tenantId,
        userId: t.userId,
        periodStart: start,
        periodEnd: end,
        targetType: "revenue",
      });
      const targetAmount = Number(t.targetAmount);
      return {
        userId: t.userId!,
        userName: t.user?.name ?? "—",
        targetAmount,
        achieved: prog.achieved,
        wonDeals: prog.count,
        percent: targetAmount > 0
          ? Math.round((prog.achieved / targetAmount) * 100)
          : 0,
        currency: t.currency,
      };
    }),
  );

  rows.sort((a, b) => b.percent - a.percent);
  return { label, rows };
}

/**
 * Hent alle maal + progress for en bestemt periode.
 * Bruges af admin-side til at vise oversigt.
 */
export async function listTargetsWithProgress(
  periodStart: Date,
  periodEnd: Date,
) {
  const session = await getSession();
  const tenantId = session.user.tenantId!;

  const targets = await db.salesTarget.findMany({
    where: { tenantId, periodStart },
    include: { user: { select: { id: true, name: true, email: true } } },
    orderBy: [{ userId: "asc" }],
  });

  return Promise.all(
    targets.map(async (t) => {
      const prog = await calcProgress({
        tenantId,
        userId: t.userId,
        periodStart,
        periodEnd,
        targetType: t.targetType as TargetType,
      });
      const targetAmount = Number(t.targetAmount);
      return {
        id: t.id,
        userId: t.userId,
        userName: t.user?.name ?? "Hele teamet",
        periodType: t.periodType,
        targetType: t.targetType,
        targetAmount,
        achieved: prog.achieved,
        wonDeals: prog.count,
        currency: t.currency,
        percent: targetAmount > 0
          ? Math.round((prog.achieved / targetAmount) * 100)
          : 0,
      };
    }),
  );
}
