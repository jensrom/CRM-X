"use server";

/**
 * Lead-aktivitetslog
 * ──────────────────
 * Hver lead får sin egen tidslinje af hændelser:
 *   • opkald, møder, e-mails, opgaver, opfølgninger, frie noter
 *   • valgfri due-date (fx "vi følger op i morgen")
 *   • brugeren bag aktiviteten + tidsstempel
 *
 * Data ligger i den eksisterende Activity-tabel (samme model bruges af kunde-
 * og kontakt-aktiviteter). Vi tilføjer kun et leadId-felt og en relation —
 * det giver os ét konsistent UI-pattern på tværs af CRM'et.
 */

import { db } from "@/lib/db";
import { auth } from "@/lib/auth";
import { revalidatePath } from "next/cache";

async function getSession() {
  const session = await auth();
  if (!session?.user?.tenantId || !session?.user?.id) {
    throw new Error("Ikke autoriseret");
  }
  return session;
}

/** Tilladte typer — holder strings styrede så vi kan style ikoner pr. type. */
const ALLOWED_TYPES = new Set([
  "call",
  "meeting",
  "email",
  "task",
  "followup",
  "note",
]);

export type LeadActivityType =
  | "call"
  | "meeting"
  | "email"
  | "task"
  | "followup"
  | "note";

/** Henter alle aktiviteter for ét lead — nyeste først. */
export async function getLeadActivities(leadId: string) {
  const session = await auth();
  if (!session?.user?.tenantId) return [];

  return db.activity.findMany({
    where: { leadId, tenantId: session.user.tenantId },
    include: { user: { select: { id: true, name: true } } },
    orderBy: { createdAt: "desc" },
  });
}

/**
 * Opretter en aktivitet på et lead.
 * Forventer FormData med: leadId, type, subject, description?, dueDate?
 */
export async function createLeadActivity(formData: FormData) {
  const session = await getSession();
  const tenantId = session.user.tenantId!;
  const userId = session.user.id!;

  const leadId = formData.get("leadId") as string;
  const type = formData.get("type") as string;
  const subject = (formData.get("subject") as string)?.trim();
  const description = (formData.get("description") as string)?.trim() || null;
  const dueDateStr = formData.get("dueDate") as string;

  if (!leadId || !subject) {
    throw new Error("Mangler leadId eller emne");
  }
  if (!ALLOWED_TYPES.has(type)) {
    throw new Error(`Ukendt aktivitetstype: ${type}`);
  }

  // Verificer at leadet hører til denne tenant — beskytter mod cross-tenant
  // skrivninger hvis nogen har manipuleret formularen.
  const lead = await db.lead.findFirst({
    where: { id: leadId, tenantId },
    select: { id: true },
  });
  if (!lead) throw new Error("Lead ikke fundet");

  await db.activity.create({
    data: {
      tenantId,
      userId,
      type,
      subject,
      description,
      dueDate: dueDateStr ? new Date(dueDateStr) : null,
      leadId,
    },
  });

  revalidatePath(`/leads/${leadId}`);
}

/** Markerer en aktivitet som fuldført (sætter completedAt). */
export async function completeLeadActivity(activityId: string, leadId: string) {
  const session = await getSession();
  const tenantId = session.user.tenantId!;

  await db.activity.updateMany({
    where: { id: activityId, tenantId, leadId },
    data: { completedAt: new Date() },
  });

  revalidatePath(`/leads/${leadId}`);
}

/** Sletter en aktivitet. */
export async function deleteLeadActivity(activityId: string, leadId: string) {
  const session = await getSession();
  const tenantId = session.user.tenantId!;

  await db.activity.deleteMany({
    where: { id: activityId, tenantId, leadId },
  });

  revalidatePath(`/leads/${leadId}`);
}
