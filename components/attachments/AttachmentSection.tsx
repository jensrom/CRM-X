"use client";

/**
 * AttachmentSection — drop-in fil-uploader + liste.
 *
 * Bruges paa kunde-, projekt- og ticket-detalje. Genbruger samme komponent
 * og forskellen er bare scope+parentId props.
 *
 * Upload-flow: bruger Vercel Blob client-direct upload via @vercel/blob/client.
 * Klient signer mod /api/attachments/upload, uploader filen direkte til blob
 * storage (bypasser server-payload-limits), og DB-row oprettes via webhook.
 *
 * Efter upload pollers vi listAttachments() en gang for at faa det friske row
 * vist (onUploadCompleted er fire-and-forget — DB-skrivning kan tage ~1s).
 */

import { useState, useRef, useTransition, useEffect, useCallback } from "react";
import { upload } from "@vercel/blob/client";
import {
  Upload,
  File as FileIcon,
  FileText,
  FileImage,
  FileSpreadsheet,
  FileArchive,
  FileVideo,
  FileAudio,
  Trash2,
  Download,
  Loader2,
} from "lucide-react";
import { listAttachments, deleteAttachment } from "@/app/actions/attachments";

interface AttachmentRow {
  id: string;
  filename: string;
  mimeType: string;
  sizeBytes: number;
  url: string;
  uploadedByName: string;
  createdAt: Date;
}

interface Props {
  scope: "company" | "project" | "ticket";
  parentId: string;
  initialAttachments: AttachmentRow[];
  /** Skjul header/titel (hvis sektionen allerede har en wrapper) */
  bare?: boolean;
}

const MAX_BYTES = 50 * 1024 * 1024;

function formatSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1).replace(".", ",")} KB`;
  if (bytes < 1024 * 1024 * 1024) {
    return `${(bytes / (1024 * 1024)).toFixed(1).replace(".", ",")} MB`;
  }
  return `${(bytes / (1024 * 1024 * 1024)).toFixed(2).replace(".", ",")} GB`;
}

function formatDate(d: Date | string): string {
  const date = typeof d === "string" ? new Date(d) : d;
  return date.toLocaleDateString("da-DK", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function iconFor(mimeType: string) {
  if (mimeType.startsWith("image/")) return FileImage;
  if (mimeType.startsWith("video/")) return FileVideo;
  if (mimeType.startsWith("audio/")) return FileAudio;
  if (mimeType.includes("pdf") || mimeType.includes("word") || mimeType.includes("text")) {
    return FileText;
  }
  if (mimeType.includes("sheet") || mimeType.includes("excel") || mimeType.includes("csv")) {
    return FileSpreadsheet;
  }
  if (mimeType.includes("zip") || mimeType.includes("archive") || mimeType.includes("rar")) {
    return FileArchive;
  }
  return FileIcon;
}

export function AttachmentSection({
  scope,
  parentId,
  initialAttachments,
  bare = false,
}: Props) {
  const [rows, setRows] = useState<AttachmentRow[]>(initialAttachments);
  const [isDragging, setIsDragging] = useState(false);
  const [uploading, setUploading] = useState<{ name: string; progress: number }[]>([]);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [, startTransition] = useTransition();

  const refresh = useCallback(async () => {
    try {
      const fresh = await listAttachments(scope, parentId);
      setRows(fresh as any);
    } catch (e) {
      console.error(e);
    }
  }, [scope, parentId]);

  const handleFiles = async (files: FileList | File[]) => {
    setError(null);
    const list = Array.from(files);
    if (list.length === 0) return;

    // Validate sizes
    for (const f of list) {
      if (f.size > MAX_BYTES) {
        setError(`"${f.name}" er over 50 MB og kan ikke uploades.`);
        return;
      }
    }

    setUploading(list.map((f) => ({ name: f.name, progress: 0 })));

    for (const file of list) {
      try {
        await upload(file.name, file, {
          access: "public",
          handleUploadUrl: "/api/attachments/upload",
          clientPayload: JSON.stringify({
            scope,
            parentId,
            filename: file.name,
            sizeBytes: file.size,
            mimeType: file.type || "application/octet-stream",
          }),
          onUploadProgress: (ev) => {
            setUploading((prev) =>
              prev.map((p) =>
                p.name === file.name ? { ...p, progress: ev.percentage } : p,
              ),
            );
          },
        });
      } catch (e: any) {
        setError(`"${file.name}" fejlede: ${e?.message ?? "Ukendt fejl"}`);
      }
    }

    setUploading([]);
    // Vent kort på at server-callback har gemt DB-rows
    setTimeout(() => refresh(), 1200);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      void handleFiles(e.dataTransfer.files);
    }
  };

  const handleDelete = (id: string) => {
    if (!confirm("Slet filen permanent?")) return;
    startTransition(async () => {
      try {
        await deleteAttachment(id);
        setRows((prev) => prev.filter((r) => r.id !== id));
      } catch (e: any) {
        setError(e?.message ?? "Sletning fejlede");
      }
    });
  };

  return (
    <div className="space-y-4">
      {!bare && (
        <div>
          <h3 className="text-sm font-semibold text-foreground">Filer</h3>
          <p className="text-xs text-muted-foreground">
            Træk filer hertil eller klik. Enhver type. Op til 50 MB pr. fil.
          </p>
        </div>
      )}

      {/* Dropzone */}
      <button
        type="button"
        onClick={() => fileInputRef.current?.click()}
        onDragOver={(e) => {
          e.preventDefault();
          setIsDragging(true);
        }}
        onDragLeave={() => setIsDragging(false)}
        onDrop={handleDrop}
        className={`w-full border-2 border-dashed rounded-lg p-6 transition-colors text-center ${
          isDragging
            ? "border-primary bg-primary/5"
            : "border-border hover:border-muted-foreground/40 bg-secondary/20"
        }`}
      >
        <Upload className="h-8 w-8 mx-auto mb-2 text-muted-foreground" />
        <p className="text-sm font-medium text-foreground">
          Træk filer hertil eller klik for at vælge
        </p>
        <p className="text-xs text-muted-foreground mt-1">
          PDF, billeder, regneark, dokumenter — enhver type
        </p>
        <input
          ref={fileInputRef}
          type="file"
          multiple
          className="hidden"
          onChange={(e) => e.target.files && handleFiles(e.target.files)}
        />
      </button>

      {/* Igangværende uploads */}
      {uploading.length > 0 && (
        <div className="space-y-2">
          {uploading.map((u) => (
            <div
              key={u.name}
              className="flex items-center gap-3 px-3 py-2 bg-secondary/30 rounded-md text-xs"
            >
              <Loader2 className="h-4 w-4 animate-spin text-primary shrink-0" />
              <span className="flex-1 truncate">{u.name}</span>
              <div className="w-20 h-1.5 bg-border rounded-full overflow-hidden">
                <div
                  className="h-full bg-primary transition-all"
                  style={{ width: `${u.progress}%` }}
                />
              </div>
              <span className="text-muted-foreground w-9 text-right">
                {u.progress}%
              </span>
            </div>
          ))}
        </div>
      )}

      {/* Fejl */}
      {error && (
        <div className="text-xs text-destructive bg-destructive/10 border border-destructive/30 rounded-md px-3 py-2">
          {error}
        </div>
      )}

      {/* Liste */}
      {rows.length === 0 ? (
        <div className="text-center py-8 text-sm text-muted-foreground">
          Ingen filer endnu.
        </div>
      ) : (
        <div className="border border-border rounded-lg overflow-hidden divide-y divide-border">
          {rows.map((row) => {
            const Icon = iconFor(row.mimeType);
            return (
              <div
                key={row.id}
                className="flex items-center gap-3 px-3 py-2.5 hover:bg-secondary/30 transition-colors"
              >
                <div className="h-9 w-9 rounded-md bg-secondary/40 flex items-center justify-center shrink-0">
                  <Icon className="h-4.5 w-4.5 text-muted-foreground" />
                </div>
                <div className="flex-1 min-w-0">
                  <a
                    href={row.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    download={row.filename}
                    className="text-sm font-medium text-foreground hover:text-primary truncate block"
                  >
                    {row.filename}
                  </a>
                  <p className="text-xs text-muted-foreground">
                    {formatSize(row.sizeBytes)} · {row.uploadedByName} ·{" "}
                    {formatDate(row.createdAt)}
                  </p>
                </div>
                <a
                  href={row.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  download={row.filename}
                  className="h-8 w-8 rounded-md hover:bg-secondary flex items-center justify-center text-muted-foreground hover:text-foreground"
                  title="Download"
                >
                  <Download className="h-4 w-4" />
                </a>
                <button
                  type="button"
                  onClick={() => handleDelete(row.id)}
                  className="h-8 w-8 rounded-md hover:bg-destructive/10 flex items-center justify-center text-muted-foreground hover:text-destructive"
                  title="Slet"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
