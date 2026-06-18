"use server";

import { db } from "@/lib/db";
import { auth } from "@/lib/auth";
import { revalidatePath } from "next/cache";
import { uploadToBlob, deleteFromBlob, MAX_FILE_SIZE_BYTES } from "@/lib/blob";

type Scope = "company" | "project" | "ticket";

async function getSession() {
  const session = await auth();
  if (!session?.user?.tenantId) throw new Error("Ikke autoriseret");
  return session;
}

/**
 * Verificer at parent (company/project/ticket) tilhoerer tenanten.
 * Returnerer parent-id hvis OK, kaster ellers fejl.
 */
async function verifyParent(
  tenantId: string,
  scope: Scope,
  parentId: string,
): Promise<void> {
  if (scope === "company") {
    const c = await db.company.findFirst({
      where: { id: parentId, tenantId },
      select: { id: true },
    });
    if (!c) throw new Error("Kunde ikke fundet");
  } else if (scope === "project") {
    const p = await db.project.findFirst({
      where: { id: parentId, tenantId },
      select: { id: true },
    });
    if (!p) throw new Error("Projekt ikke fundet");
  } else if (scope === "ticket") {
    const t = await db.ticket.findFirst({
      where: { id: parentId, tenantId },
      select: { id: true },
    });
    if (!t) throw new Error("Sag ikke fundet");
  }
}

/**
 * Liste af attachments paa en parent.
 * Returnerer normaliseret form til UI (med uploader-navn + sizes).
 */
export async function listAttachments(scope: Scope, parentId: string) {
  const session = await getSession();
  const tenantId = session.user.tenantId!;

  const where: any = { tenantId };
  if (scope === "company") where.companyId = parentId;
  else if (scope === "project") where.projectId = parentId;
  else if (scope === "ticket") where.ticketId = parentId;

  const rows = await db.attachment.findMany({
    where,
    include: { uploadedBy: { select: { id: true, name: true } } },
    orderBy: { createdAt: "desc" },
  });

  return rows.map((r) => ({
    id: r.id,
    filename: r.filename,
    mimeType: r.mimeType,
    sizeBytes: r.sizeBytes,
    url: r.storageUrl,
    uploadedByName: r.uploadedBy?.name ?? "Ukendt",
    createdAt: r.createdAt,
  }));
}

/**
 * Server-side upload via FormData.
 * Bruges af AttachmentDropzone — klient POSTer file via FormData,
 * vi pipe'r til Vercel Blob og opretter DB-row.
 *
 * Bemaerk: Next.js server actions har en payload-grænse paa ~4.5MB.
 * For større filer skal vi bygge client-direct upload (signed URL).
 */
export async function uploadAttachment(
  scope: Scope,
  parentId: string,
  formData: FormData,
) {
  const session = await getSession();
  const tenantId = session.user.tenantId!;
  const userId = session.user.id ?? null;

  const file = formData.get("file");
  if (!(file instanceof File)) throw new Error("Ingen fil i upload");
  if (file.size === 0) throw new Error("Fil er tom");
  if (file.size > MAX_FILE_SIZE_BYTES) {
    throw new Error(
      `Fil er for stor. Max 50 MB. Denne er ${(file.size / 1024 / 1024).toFixed(1)} MB.`,
    );
  }

  await verifyParent(tenantId, scope, parentId);

  const blob = await uploadToBlob({
    tenantId,
    scope,
    parentId,
    filename: file.name,
    body: file,
    contentType: file.type || "application/octet-stream",
  });

  const data: any = {
    tenantId,
    uploadedById: userId,
    filename: file.name,
    mimeType: file.type || "application/octet-stream",
    sizeBytes: file.size,
    storageProvider: "vercel_blob",
    storageUrl: blob.url,
    storagePath: blob.pathname,
  };
  if (scope === "company") data.companyId = parentId;
  else if (scope === "project") data.projectId = parentId;
  else if (scope === "ticket") data.ticketId = parentId;

  await db.attachment.create({ data });

  // Re-validate parent-siden
  if (scope === "company") revalidatePath(`/kunder/${parentId}`);
  else if (scope === "project") revalidatePath(`/projects/${parentId}`);
  else if (scope === "ticket") revalidatePath(`/tickets/${parentId}`);
}

/** Slet attachment + blob. Tenant-isoleret. */
export async function deleteAttachment(attachmentId: string) {
  const session = await getSession();
  const tenantId = session.user.tenantId!;

  const att = await db.attachment.findFirst({
    where: { id: attachmentId, tenantId },
    select: {
      id: true,
      storagePath: true,
      companyId: true,
      projectId: true,
      ticketId: true,
    },
  });
  if (!att) throw new Error("Fil ikke fundet");

  // Slet blob foerst (best-effort), saa DB-row
  await deleteFromBlob(att.storagePath);
  await db.attachment.delete({ where: { id: attachmentId } });

  if (att.companyId) revalidatePath(`/kunder/${att.companyId}`);
  else if (att.projectId) revalidatePath(`/projects/${att.projectId}`);
  else if (att.ticketId) revalidatePath(`/tickets/${att.ticketId}`);
}
