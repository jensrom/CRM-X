"use server";

import { db } from "@/lib/db";
import { auth } from "@/lib/auth";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createNotification } from "@/app/actions/notifications";
import { ACTIVE_TICKET_STATUSES_WITH_LEGACY } from "@/lib/ticket-status";
import { getCreatorContext } from "@/lib/creator-context";

// ─── Næste ticket-nummer pr. tenant ─────────────────────────────────────────
async function nextTicketNumber(tenantId: string): Promise<number> {
  const last = await db.ticket.findFirst({
    where: { tenantId },
    orderBy: { number: "desc" },
    select: { number: true },
  });
  return (last?.number ?? 0) + 1;
}

// ─── Hent liste ─────────────────────────────────────────────────────────────
export async function getTickets(opts?: {
  status?: string;
  search?: string;
  companyId?: string;
}) {
  const session = await auth();
  if (!session?.user?.tenantId) return [];
  const tenantId = session.user.tenantId;

  // Status-filter:
  //   - "open" inkluderer også legacy "new" rows (samme semantik)
  //   - "pending_customer" inkluderer legacy "pending_reply"
  // så gamle data bliver vist i de nye buckets uden migration.
  const statusFilter = (() => {
    if (!opts?.status) return undefined;
    if (opts.status === "open") return { in: ["open", "new"] as string[] };
    if (opts.status === "pending_customer") return { in: ["pending_customer", "pending_reply"] as string[] };
    return opts.status;
  })();

  return db.ticket.findMany({
    where: {
      tenantId,
      ...(statusFilter ? { status: statusFilter as any } : {}),
      ...(opts?.companyId ? { companyId: opts.companyId } : {}),
      ...(opts?.search
        ? {
            OR: [
              { title: { contains: opts.search, mode: "insensitive" } },
              { description: { contains: opts.search, mode: "insensitive" } },
            ],
          }
        : {}),
    },
    include: {
      tenant: { select: { ticketPrefix: true } },
      company: { select: { id: true, name: true } },
      contact: { select: { id: true, firstName: true, lastName: true } },
      assignedTo: { select: { id: true, name: true } },
      _count: { select: { comments: true, timeLogs: true } },
    },
    orderBy: { createdAt: "desc" },
  });
}

// ─── Hent enkelt ticket ──────────────────────────────────────────────────────
export async function getTicket(id: string) {
  const session = await auth();
  if (!session?.user?.tenantId) return null;
  const tenantId = session.user.tenantId;

  return db.ticket.findFirst({
    where: { id, tenantId },
    include: {
      tenant: { select: { ticketPrefix: true } },
      company: { select: { id: true, name: true } },
      contact: { select: { id: true, firstName: true, lastName: true } },
      assignedTo: { select: { id: true, name: true } },
      product: { select: { id: true, name: true } },
      comments: {
        include: { user: { select: { id: true, name: true } } },
        orderBy: { createdAt: "asc" },
      },
      timeLogs: {
        include: { user: { select: { id: true, name: true } } },
        orderBy: { createdAt: "desc" },
      },
    },
  });
}

// ─── Opret ticket ────────────────────────────────────────────────────────────
export async function createTicket(formData: FormData) {
  const session = await auth();
  if (!session?.user?.tenantId) throw new Error("Ikke autoriseret");
  const tenantId = session.user.tenantId;

  const number = await nextTicketNumber(tenantId);
  const contactId = formData.get("contactId") as string;
  const productId = formData.get("productId") as string;
  const assignedToId = formData.get("assignedToId") as string;

  const _creator = await getCreatorContext();

  const ticket = await db.ticket.create({
    data: {
      createdById: _creator.createdById,
      createdByImpersonatorId: _creator.createdByImpersonatorId,
      tenantId,
      number,
      title: formData.get("title") as string,
      description: formData.get("description") as string,
      companyId: formData.get("companyId") as string,
      contactId: contactId || null,
      productId: productId || null,
      assignedToId: assignedToId || null,
      status: (formData.get("status") as string) || "open",
      priority: (formData.get("priority") as string) || "normal",
    },
  });

  // Send notifikation til tildelt bruger
  if (assignedToId && assignedToId !== session.user.id) {
    const tenant = await db.tenant.findUnique({ where: { id: tenantId }, select: { ticketPrefix: true } });
    const ref = `${tenant?.ticketPrefix ?? "T"}-${String(number).padStart(4, "0")}`;
    await createNotification({
      tenantId,
      userId: assignedToId,
      type: "ticket_assigned",
      title: "Ticket tildelt dig",
      message: `${ref}: ${ticket.title}`,
      linkUrl: `/support/tickets/${ticket.id}`,
    });
  }

  revalidatePath("/support/tickets");
  redirect(`/support/tickets/${ticket.id}`);
}

// ─── Opdater ticket ──────────────────────────────────────────────────────────
export async function updateTicket(formData: FormData) {
  const session = await auth();
  if (!session?.user?.tenantId) throw new Error("Ikke autoriseret");
  const tenantId = session.user.tenantId;
  const id = formData.get("id") as string;

  const status = formData.get("status") as string;
  const contactId = formData.get("contactId") as string;
  const productId = formData.get("productId") as string;
  const assignedToId = formData.get("assignedToId") as string;

  await db.ticket.update({
    where: { id, tenantId },
    data: {
      title: formData.get("title") as string,
      description: formData.get("description") as string,
      companyId: formData.get("companyId") as string,
      contactId: contactId || null,
      productId: productId || null,
      assignedToId: assignedToId || null,
      status,
      priority: formData.get("priority") as string,
      resolvedAt: status === "resolved" ? new Date() : null,
      closedAt: status === "closed" ? new Date() : null,
    },
  });

  revalidatePath("/support/tickets");
  revalidatePath(`/support/tickets/${id}`);
  redirect(`/support/tickets/${id}`);
}

// ─── Skift status hurtigt ────────────────────────────────────────────────────
export async function updateTicketStatus(ticketId: string, status: string) {
  const session = await auth();
  if (!session?.user?.tenantId) throw new Error("Ikke autoriseret");
  const tenantId = session.user.tenantId;

  await db.ticket.update({
    where: { id: ticketId, tenantId },
    data: {
      status,
      resolvedAt: status === "resolved" ? new Date() : undefined,
      closedAt: status === "closed" ? new Date() : undefined,
    },
  });

  revalidatePath("/support/tickets");
  revalidatePath(`/support/tickets/${ticketId}`);
}

// ─── Tilføj kommentar ────────────────────────────────────────────────────────
export async function addComment(formData: FormData) {
  const session = await auth();
  if (!session?.user?.id) throw new Error("Ikke autoriseret");

  const ticketId = formData.get("ticketId") as string;
  const isInternal = formData.get("isInternal") === "true";

  await db.ticketComment.create({
    data: {
      ticketId,
      userId: session.user.id,
      content: formData.get("content") as string,
      isInternal,
    },
  });

  // SLA: marker første agent-svar hvis ikke allerede sat (kun ekstern komment tæller)
  if (!isInternal) {
    try {
      const t: any = await db.ticket.findUnique({
        where: { id: ticketId },
        select: { firstResponseAt: true, tenantId: true } as any,
      });
      if (t && !t.firstResponseAt && t.tenantId === session.user.tenantId) {
        await db.ticket.update({
          where: { id: ticketId },
          data: { firstResponseAt: new Date() } as any,
        });
      }
    } catch {}
  }

  revalidatePath(`/support/tickets/${ticketId}`);
  redirect(`/support/tickets/${ticketId}`);
}

// ─── Log tid manuelt ─────────────────────────────────────────────────────────
export async function logTime(formData: FormData) {
  const session = await auth();
  if (!session?.user?.id || !session?.user?.tenantId)
    throw new Error("Ikke autoriseret");

  const ticketId = formData.get("ticketId") as string;
  const durationMin = parseInt(formData.get("durationMin") as string);
  const dateStr = formData.get("date") as string;

  await db.timeLog.create({
    data: {
      tenantId: session.user.tenantId,
      userId: session.user.id,
      ticketId,
      date: new Date(dateStr),
      durationMin,
      description: (formData.get("description") as string) || null,
      isBillable: formData.get("isBillable") === "true",
    },
  });

  revalidatePath(`/support/tickets/${ticketId}`);
  redirect(`/support/tickets/${ticketId}`);
}

// ─── Slet ticket ─────────────────────────────────────────────────────────────
export async function deleteTicket(ticketId: string) {
  const session = await auth();
  if (!session?.user?.tenantId) throw new Error("Ikke autoriseret");
  const tenantId = session.user.tenantId;

  await db.ticket.delete({ where: { id: ticketId, tenantId } });
  revalidatePath("/support/tickets");
  redirect("/support/tickets");
}
