/**
 * lib/blob.ts — Vercel Blob storage helper.
 *
 * Encapsulerer @vercel/blob put() + del() saa resten af app'en kan kalde
 * to simple funktioner og forblive provider-agnostisk.
 *
 * Tenancy-isolation: pathname har formen
 *   "t/{tenantId}/{scope}/{parentId}/{random}-{filename}"
 * Vercel Blob tilfoejer en uguessable suffix paa pathname, saa selv om
 * blob'en er "public" er URL'en uguessable. For ekstra sikkerhed kunne
 * vi senere bytte til /api/attachments/[id]/download proxy med auth.
 */

import { put, del } from "@vercel/blob";

const BLOB_TOKEN = process.env.BLOB_READ_WRITE_TOKEN;

export interface BlobUploadResult {
  url: string;
  pathname: string;
}

/**
 * Upload en fil til Vercel Blob storage.
 *
 * @param scope     "company" | "project" | "ticket"
 * @param parentId  ID på parent (companyId / projectId / ticketId)
 * @param file      File-objekt fra browser eller Buffer/Blob fra server
 * @param filename  Original filnavn (bruges som suffix i pathname)
 */
export async function uploadToBlob(args: {
  tenantId: string;
  scope: "company" | "project" | "ticket";
  parentId: string;
  filename: string;
  body: Blob | File | Buffer | ArrayBuffer;
  contentType?: string;
}): Promise<BlobUploadResult> {
  if (!BLOB_TOKEN) {
    throw new Error(
      "BLOB_READ_WRITE_TOKEN er ikke sat. Tilfoej Vercel Blob til projektet i Vercel Dashboard.",
    );
  }
  // Sanitize filename — kun til pathname, original filname gemmes i DB.
  const safeName = args.filename.replace(/[^\w.\-]/g, "_").slice(0, 100);
  const pathname = `t/${args.tenantId}/${args.scope}/${args.parentId}/${safeName}`;

  const result = await put(pathname, args.body as any, {
    access: "public",
    addRandomSuffix: true, // -> uguessable URL
    contentType: args.contentType,
    token: BLOB_TOKEN,
  });

  return {
    url: result.url,
    pathname: result.pathname,
  };
}

/** Slet en blob via pathname. Safe no-op hvis blob ikke findes. */
export async function deleteFromBlob(pathname: string): Promise<void> {
  if (!BLOB_TOKEN) return;
  try {
    await del(pathname, { token: BLOB_TOKEN });
  } catch (err: any) {
    // Hvis filen allerede er væk, ignorér
    if (err?.status !== 404) {
      console.warn("[blob] delete failed:", pathname, err?.message);
    }
  }
}

/** Format bytes til "1,2 MB" (dansk locale). */
export function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1).replace(".", ",")} KB`;
  if (bytes < 1024 * 1024 * 1024) {
    return `${(bytes / (1024 * 1024)).toFixed(1).replace(".", ",")} MB`;
  }
  return `${(bytes / (1024 * 1024 * 1024)).toFixed(2).replace(".", ",")} GB`;
}

/** Max-størrelse — 50 MB. Skub op hvis nødvendigt. */
export const MAX_FILE_SIZE_BYTES = 50 * 1024 * 1024;
