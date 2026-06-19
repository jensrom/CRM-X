"use server";

/**
 * Comments — polymorft kommentar-system.
 *
 * Scope = "company" | "project" | "deal" | "quote" | "invoice".
 * Praecis én parent-FK saettes ud fra scope.
 */

import { db } from "@/lib/db";
import { auth } from "@/lib/auth";
import { revalidatePath } from "next/cache";
import { extractMentionedUserIds, bodyToPlain } from "@/lib/mentions";

export type CommentScope = "company" | "project" | "deal" | "quote" | "invoice";

async function getSession() {
  const session = await auth();
  if (!session?.user?.tenantId) throw new Error("Ikke autoriseret");
  return session;
}

/** Verificer at parent tilhoerer tenanten. */
async function verifyParent(
  tenantId: string,
  scope: CommentScope,
  parentId: string,
): Promise<void> {
  if (scope === "company") {
    const c = await db.company.findFirst({ where: { id: parentId, tenantId }, select: { id: true } });
    if (!c) throw new Error("Kunde ikke fundet");
  } else if (scope === "project") {
    const p = await db.project.findFirst({ where: { id: parentId, tenantId }, select: { id: true } });
    if (!p) throw new Error("Projekt ikke fundet");
  } else if (scope === "deal") {
    const d = await db.deal.findFirst({ where: { id: parentId, tenantId }, select: { id: true } });
    if (!d) throw new Error("Deal ikke fundet");
  } else if (scope === "quote") {
    const q = await db.quote.findFirst({ where: { id: parentId, tenantId }, select: { id: true } });
    if (!q) throw new Error("Tilbud ikke fundet");
  } else if (scope === "invoice") {
    const i = await db.invoice.findFirst({ where: { id: parentId, tenantId }, select: { id: true } });
    if (!i) throw new Error("Faktura ikke fundet");
  }
}

function revalidateScope(scope: CommentScope, parentId: string) {
  switch (scope) {
    case "company": revalidatePath(`/kunder/${parentId}`); break;
    case "project": revalidatePath(`/projects/${parentId}`); break;
    case "deal":    revalidatePath(`/pipeline/${parentId}`); break;
    case "quote":   revalidatePath(`/quotes/${parentId}`); break;
    case "invoice": revalidatePath(`/invoices/${parentId}`); break;
  }
}

/** Hent alle comments paa parent — nyeste foerst. */
export async function listComments(scope: CommentScope, parentId: string) {
  const session = await getSession();
  const tenantId = session.user.tenantId!;

  const where: any = { tenantId };
  if (scope === "company") where.companyId = parentId;
  else if (scope === "project") where.projectId = parentId;
  else if (scope === "deal") where.dealId = parentId;
  else if (scope === "quote") where.quoteId = parentId;
  else if (scope === "invoice") where.invoiceId = parentId;

  const rows = await db.comment.findMany({
    where,
    include: { author: { select: { id: true, name: true, email: true } } },
    orderBy: { createdAt: "desc" },
  });

  return rows.map((r) => ({
    id: r.id,
    body: r.body,
    authorId: r.authorId,
    authorName: r.author?.name ?? "Ukendt",
    authorEmail: r.author?.email ?? "",
    createdAt: r.createdAt,
    editedAt: r.editedAt,
    isMine: r.authorId === session.user.id,
  }));
}

/** Tilfoej ny kommentar. */
export async function addComment(
  scope: CommentScope,
  parentId: string,
  formData: FormData,
) {
  const session = await getSession();
  const tenantId = session.user.tenantId!;
  const authorId = session.user.id ?? null;

  const body = ((formData.get("body") as string) || "").trim();
  if (!body) throw new Error("Kommentar maa ikke vaere tom");
  if (body.length > 5000) throw new Error("Kommentar er for lang (max 5000 tegn)");

  await verifyParent(tenantId, scope, parentId);

  // Parse @-mentions
  const mentionedIds = extractMentionedUserIds(body);
  // Validere at de naevnte brugere tilhoerer samme tenant
  let validMentions: { id: string; name: string }[] = [];
  if (mentionedIds.length > 0) {
    validMentions = await db.user.findMany({
      where: { id: { in: mentionedIds }, tenantId },
      select: { id: true, name: true },
    });
  }

  const data: any = {
    tenantId,
    authorId,
    body,
    mentionedUserIds: validMentions.map((u) => u.id),
  };
  if (scope === "company") data.companyId = parentId;
  else if (scope === "project") data.projectId = parentId;
  else if (scope === "deal") data.dealId = parentId;
  else if (scope === "quote") data.quoteId = parentId;
  else if (scope === "invoice") data.invoiceId = parentId;

  await db.comment.create({ data });

  // Notify mentioned users (undtaget forfatter)
  if (validMentions.length > 0) {
    const authorName = session.user.name ?? "En kollega";
    const linkPath =
      scope === "company" ? `/kunder/${parentId}` :
      scope === "project" ? `/projects/${parentId}` :
      scope === "deal"    ? `/pipeline/${parentId}` :
      scope === "quote"   ? `/quotes/${parentId}` :
                            `/invoices/${parentId}`;
    const preview = bodyToPlain(body).slice(0, 160);

    await db.notification.createMany({
      data: validMentions
        .filter((u) => u.id !== authorId)
        .map((u) => ({
          tenantId,
          userId: u.id,
          type: "mention",
          title: `${authorName} nævnte dig`,
          message: preview,
          linkUrl: linkPath,
          isRead: false,
        })),
    });
  }

  revalidateScope(scope, parentId);
}

/** Rediger egen kommentar. */
export async function editComment(commentId: string, body: string) {
  const session = await getSession();
  const tenantId = session.user.tenantId!;
  const userId = session.user.id!;

  const trimmed = body.trim();
  if (!trimmed) throw new Error("Kommentar maa ikke vaere tom");

  const c = await db.comment.findFirst({
    where: { id: commentId, tenantId, authorId: userId },
    select: { id: true, companyId: true, projectId: true, dealId: true, quoteId: true, invoiceId: true },
  });
  if (!c) throw new Error("Kommentar ikke fundet eller ikke din");

  // Re-parse mentions ved redigering (ny notifikation hvis nye)
  const newMentioned = extractMentionedUserIds(trimmed);
  const validMentions = newMentioned.length > 0
    ? await db.user.findMany({
        where: { id: { in: newMentioned }, tenantId },
        select: { id: true },
      }).then((u) => u.map((x) => x.id))
    : [];

  await db.comment.update({
    where: { id: commentId },
    data: { body: trimmed, editedAt: new Date(), mentionedUserIds: validMentions } as any,
  });

  if (c.companyId) revalidatePath(`/kunder/${c.companyId}`);
  else if (c.projectId) revalidatePath(`/projects/${c.projectId}`);
  else if (c.dealId) revalidatePath(`/pipeline/${c.dealId}`);
  else if (c.quoteId) revalidatePath(`/quotes/${c.quoteId}`);
  else if (c.invoiceId) revalidatePath(`/invoices/${c.invoiceId}`);
}

/** Slet egen kommentar (admin kan slette alle). */
export async function deleteComment(commentId: string) {
  const session = await getSession();
  const tenantId = session.user.tenantId!;
  const userId = session.user.id;
  const role = session.user.role;
  const isAdmin = role === "admin" || role === "super_admin";

  const where: any = { id: commentId, tenantId };
  if (!isAdmin) where.authorId = userId;

  const c = await db.comment.findFirst({
    where,
    select: { id: true, companyId: true, projectId: true, dealId: true, quoteId: true, invoiceId: true },
  });
  if (!c) throw new Error("Kommentar ikke fundet eller ikke din");

  await db.comment.delete({ where: { id: commentId } });

  if (c.companyId) revalidatePath(`/kunder/${c.companyId}`);
  else if (c.projectId) revalidatePath(`/projects/${c.projectId}`);
  else if (c.dealId) revalidatePath(`/pipeline/${c.dealId}`);
  else if (c.quoteId) revalidatePath(`/quotes/${c.quoteId}`);
  else if (c.invoiceId) revalidatePath(`/invoices/${c.invoiceId}`);
}
