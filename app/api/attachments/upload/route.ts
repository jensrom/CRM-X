/**
 * /api/attachments/upload — Vercel Blob client-direct upload endpoint.
 *
 * Klient (AttachmentDropzone) bruger `upload()` fra @vercel/blob/client
 * der POSTer hertil for at faa en signed URL, uploader direkte til blob,
 * og endeligt rammer denne route igen med "upload completed" callback.
 *
 * Vi gemmer DB-row i `onUploadCompleted` baseret paa tokenPayload
 * (scope + parentId + tenantId + userId der bliver til JWT signed paa
 * onBeforeGenerateToken).
 *
 * Pattern: https://vercel.com/docs/storage/vercel-blob/client-upload
 */

import { handleUpload, type HandleUploadBody } from "@vercel/blob/client";
import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";

export const runtime = "nodejs";

interface TokenPayload {
  tenantId: string;
  userId: string | null;
  scope: "company" | "project" | "ticket";
  parentId: string;
  // Klient indberetter filename + size (Vercel Blob's callback har ikke disse)
  filename: string;
  sizeBytes: number;
  mimeType: string;
}

export async function POST(request: Request): Promise<NextResponse> {
  const body = (await request.json()) as HandleUploadBody;

  try {
    const jsonResponse = await handleUpload({
      body,
      request,
      token: process.env.BLOB_READ_WRITE_TOKEN,
      onBeforeGenerateToken: async (pathname, clientPayload) => {
        // pathname er pathname klienten kalder med — fx "filename.pdf"
        // clientPayload indeholder scope + parentId fra dropzone
        const session = await auth();
        if (!session?.user?.tenantId) {
          throw new Error("Ikke autoriseret");
        }
        const tenantId = session.user.tenantId;
        const userId = session.user.id ?? null;

        let payload: any = {};
        try {
          payload = clientPayload ? JSON.parse(clientPayload) : {};
        } catch {
          throw new Error("Ugyldig client payload");
        }
        const scope = payload.scope as "company" | "project" | "ticket";
        const parentId = payload.parentId as string;
        const filename = (payload.filename as string) || "fil";
        const sizeBytes = Number(payload.sizeBytes) || 0;
        const mimeType = (payload.mimeType as string) || "application/octet-stream";

        if (!scope || !parentId) throw new Error("Mangler scope eller parentId");
        if (!["company", "project", "ticket"].includes(scope)) {
          throw new Error("Ugyldig scope");
        }

        // Verificer at parent tilhoerer tenanten
        let parentOk = false;
        if (scope === "company") {
          parentOk = !!(await db.company.findFirst({
            where: { id: parentId, tenantId },
            select: { id: true },
          }));
        } else if (scope === "project") {
          parentOk = !!(await db.project.findFirst({
            where: { id: parentId, tenantId },
            select: { id: true },
          }));
        } else if (scope === "ticket") {
          parentOk = !!(await db.ticket.findFirst({
            where: { id: parentId, tenantId },
            select: { id: true },
          }));
        }
        if (!parentOk) throw new Error("Parent ikke fundet i din tenant");

        const tokenPayload: TokenPayload = {
          tenantId,
          userId,
          scope,
          parentId,
          filename,
          sizeBytes,
          mimeType,
        };

        return {
          allowedContentTypes: ["*/*"] as any, // accepterer enhver filtype
          maximumSizeInBytes: 50 * 1024 * 1024, // 50 MB
          tokenPayload: JSON.stringify(tokenPayload),
        };
      },
      onUploadCompleted: async ({ blob, tokenPayload }) => {
        // Skal IKKE smide fejl her — klient er allerede done.
        // Hvis DB-skrivning fejler logger vi det og giver op.
        try {
          if (!tokenPayload) return;
          const payload = JSON.parse(tokenPayload) as TokenPayload;

          const data: any = {
            tenantId: payload.tenantId,
            uploadedById: payload.userId,
            filename: payload.filename,
            mimeType: payload.mimeType ?? blob.contentType ?? "application/octet-stream",
            sizeBytes: payload.sizeBytes,
            storageProvider: "vercel_blob",
            storageUrl: blob.url,
            storagePath: blob.pathname,
          };
          if (payload.scope === "company") data.companyId = payload.parentId;
          else if (payload.scope === "project") data.projectId = payload.parentId;
          else if (payload.scope === "ticket") data.ticketId = payload.parentId;

          await db.attachment.create({ data });
        } catch (err) {
          console.error("[attachments] onUploadCompleted DB-fejl:", err);
        }
      },
    });

    return NextResponse.json(jsonResponse);
  } catch (error: any) {
    return NextResponse.json(
      { error: error?.message ?? "Upload fejlede" },
      { status: 400 },
    );
  }
}
