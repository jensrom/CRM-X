"use server";

/**
 * Recurring invoices — auto-generation af tilbagevendende fakturaer.
 *
 * Driftsmodel:
 *   1. Cron-job rammer /api/cron/recurring-invoices dagligt
 *   2. Endpoint kalder runDueRecurring()
 *   3. Hver RecurringInvoice med status="active" og nextRunAt <= now
 *      genererer ny Invoice (status="draft") + opdaterer nextRunAt
 *   4. Bruger faar notifikation: "X nye kladde-fakturaer venter"
 *
 * Vigtigt: vi laver KLADDE-fakturaer, ikke automatisk sendte.
 * Bruger skal aktivt sende dem — vi er ikke et "auto-charge"-system.
 */

import { db } from "@/lib/db";
import { auth } from "@/lib/auth";
import { revalidatePath } from "next/cache";

type IntervalType = "monthly" | "quarterly" | "yearly";

interface LineTemplateItem {
  description: string;
  quantity: number;
  unitPrice: number;
  type?: string;
  productId?: string | null;
  seats?: number | null;
  discountPct?: number;
}

async function getSession() {
  const session = await auth();
  if (!session?.user?.tenantId) throw new Error("Ikke autoriseret");
  return session;
}

/**
 * Beregn naeste nextRunAt baseret paa current + interval.
 * Bevarer dayOfMonth saa fakturaer kommer paa samme dag hver maaned.
 */
export function calcNextRunAt(
  current: Date,
  intervalType: IntervalType,
  dayOfMonth: number,
): Date {
  const next = new Date(current);
  if (intervalType === "monthly") next.setUTCMonth(next.getUTCMonth() + 1);
  else if (intervalType === "quarterly") next.setUTCMonth(next.getUTCMonth() + 3);
  else if (intervalType === "yearly") next.setUTCFullYear(next.getUTCFullYear() + 1);
  // Saet dag til dayOfMonth (med 28 som maks for at undgaa Feb-issues)
  const safeDay = Math.min(28, Math.max(1, dayOfMonth));
  next.setUTCDate(safeDay);
  return next;
}

/** Liste over alle recurring invoices i tenanten. */
export async function listRecurringInvoices() {
  const session = await getSession();
  const tenantId = session.user.tenantId!;

  return db.recurringInvoice.findMany({
    where: { tenantId },
    include: { company: { select: { id: true, name: true } } },
    orderBy: [{ status: "asc" }, { nextRunAt: "asc" }],
  });
}

/** Hent én recurring invoice. */
export async function getRecurringInvoice(id: string) {
  const session = await getSession();
  const tenantId = session.user.tenantId!;
  return db.recurringInvoice.findFirst({
    where: { id, tenantId },
    include: { company: true },
  });
}

/** Opret ny recurring invoice. */
export async function createRecurringInvoice(formData: FormData) {
  const session = await getSession();
  const tenantId = session.user.tenantId!;
  const createdById = session.user.id ?? null;

  const companyId = (formData.get("companyId") as string) || "";
  const name = ((formData.get("name") as string) || "").trim();
  const intervalType = ((formData.get("intervalType") as string) || "monthly") as IntervalType;
  const dayOfMonth = Number(formData.get("dayOfMonth") ?? 1);
  const dueDays = Number(formData.get("dueDays") ?? 14);
  const startDateStr = (formData.get("startDate") as string) || "";

  if (!companyId || !name || !startDateStr) {
    throw new Error("Kunde, navn og startdato er paakraevet");
  }

  // Verificer kunde tilhoerer tenant
  const company = await db.company.findFirst({
    where: { id: companyId, tenantId },
    select: { id: true },
  });
  if (!company) throw new Error("Kunde ikke fundet");

  // Linjer kommer som JSON-string i formData (klient pakker dem)
  const lineTemplateRaw = formData.get("lineTemplate") as string | null;
  let lineTemplate: LineTemplateItem[] = [];
  if (lineTemplateRaw) {
    try {
      lineTemplate = JSON.parse(lineTemplateRaw);
    } catch {
      throw new Error("Ugyldig linje-skabelon");
    }
  }
  if (lineTemplate.length === 0) {
    throw new Error("Mindst én linje skal tilfoejes");
  }

  await db.recurringInvoice.create({
    data: {
      tenantId,
      companyId,
      name,
      intervalType,
      dayOfMonth,
      dueDays,
      nextRunAt: new Date(startDateStr),
      lineTemplate: lineTemplate as any,
      createdById,
      currency: (formData.get("currency") as string) || "DKK",
      notes: (formData.get("notes") as string) || null,
    },
  });

  revalidatePath("/invoices/recurring");
}

/** Pause / resume / stop en recurring. */
export async function setRecurringStatus(id: string, status: "active" | "paused" | "stopped") {
  const session = await getSession();
  const tenantId = session.user.tenantId!;
  await db.recurringInvoice.updateMany({
    where: { id, tenantId },
    data: { status },
  });
  revalidatePath("/invoices/recurring");
}

/** Slet en recurring (ingen genereret faktura paavirkes). */
export async function deleteRecurring(id: string) {
  const session = await getSession();
  const tenantId = session.user.tenantId!;
  await db.recurringInvoice.deleteMany({ where: { id, tenantId } });
  revalidatePath("/invoices/recurring");
}

/**
 * Generer EN faktura fra en recurring. Bruges af cron + manuel "kør nu".
 * Returnerer nye invoice ID.
 */
export async function runRecurringInvoice(id: string): Promise<string> {
  const ri = await db.recurringInvoice.findUnique({
    where: { id },
    include: { tenant: { select: { id: true } } },
  });
  if (!ri) throw new Error("Recurring invoice ikke fundet");
  if (ri.status !== "active") throw new Error("Recurring er ikke aktiv");

  // Beregn faktura-nummer
  const lastInvoice = await db.invoice.findFirst({
    where: { tenantId: ri.tenantId },
    orderBy: { number: "desc" },
    select: { number: true },
  });
  const nextNumber = (lastInvoice?.number ?? 0) + 1;

  const now = new Date();
  const dueDate = new Date(now.getTime() + ri.dueDays * 24 * 60 * 60 * 1000);

  const lines = (ri.lineTemplate as any) as LineTemplateItem[];

  const invoice = await db.invoice.create({
    data: {
      tenantId: ri.tenantId,
      companyId: ri.companyId,
      number: nextNumber,
      status: "draft",
      issueDate: now,
      dueDate,
      currency: ri.currency,
      notes: ri.notes,
      vatEnabled: ri.vatEnabled,
      vatPct: ri.vatPct,
      customerType: ri.customerType,
      createdById: ri.createdById,
      lines: {
        create: lines.map((l, idx) => ({
          description: l.description,
          quantity: l.quantity,
          unitPrice: l.unitPrice,
          discountPct: l.discountPct ?? 0,
          type: l.type ?? "manual",
          productId: l.productId ?? null,
          seats: l.seats ?? null,
          sortOrder: idx,
        })),
      },
    },
  });

  // Opdater recurring: bump nextRunAt, lastRunAt, runCount
  const nextRun = calcNextRunAt(ri.nextRunAt, ri.intervalType as IntervalType, ri.dayOfMonth);
  await db.recurringInvoice.update({
    where: { id: ri.id },
    data: {
      lastRunAt: now,
      nextRunAt: nextRun,
      runCount: { increment: 1 },
    },
  });

  return invoice.id;
}

/**
 * Cron-batch: koer alle recurring der er forfaldne. Returnerer summary.
 */
export async function runDueRecurring(): Promise<{
  total: number;
  succeeded: number;
  failed: number;
  generatedInvoiceIds: string[];
}> {
  const now = new Date();
  const due = await db.recurringInvoice.findMany({
    where: { status: "active", nextRunAt: { lte: now } },
    select: { id: true },
  });

  const generatedInvoiceIds: string[] = [];
  let failed = 0;
  for (const r of due) {
    try {
      const invoiceId = await runRecurringInvoice(r.id);
      generatedInvoiceIds.push(invoiceId);
    } catch (e) {
      console.error("[recurring] run failed for", r.id, e);
      failed++;
    }
  }

  return {
    total: due.length,
    succeeded: generatedInvoiceIds.length,
    failed,
    generatedInvoiceIds,
  };
}

/** Manuel "Kør nu" — bruger har action-knap paa /invoices/recurring. */
export async function runRecurringNow(id: string) {
  const session = await getSession();
  const tenantId = session.user.tenantId!;

  // Bekraft at id tilhoerer tenanten
  const ri = await db.recurringInvoice.findFirst({
    where: { id, tenantId },
    select: { id: true },
  });
  if (!ri) throw new Error("Ikke fundet");

  await runRecurringInvoice(id);
  revalidatePath("/invoices/recurring");
  revalidatePath("/invoices");
}
