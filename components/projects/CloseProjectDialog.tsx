"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Lock, Receipt, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { closeProject } from "@/app/actions/projects";

interface Props {
  projectId: string;
}

export function CloseProjectDialog({ projectId }: Props) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  async function handleClose(createInvoice: boolean) {
    setLoading(true);
    const fd = new FormData();
    fd.append("projectId", projectId);
    fd.append("createInvoice", createInvoice ? "true" : "false");
    await closeProject(fd);
    // Redirect sker server-side; men i tilfælde af createInvoice navigerer vi til faktura
    setLoading(false);
    setOpen(false);
  }

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium
                   bg-destructive/10 text-destructive hover:bg-destructive/20 transition-colors"
      >
        <Lock className="h-3.5 w-3.5" />
        Luk projekt
      </button>

      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm">
          <div className="bg-card border border-border rounded-2xl shadow-xl w-full max-w-sm mx-4 p-6">
            <div className="flex items-start justify-between mb-4">
              <div className="w-10 h-10 rounded-xl bg-amber-500/10 flex items-center justify-center">
                <Lock className="h-5 w-5 text-amber-600" />
              </div>
              <button onClick={() => setOpen(false)} className="text-muted-foreground hover:text-foreground">
                <X className="h-4 w-4" />
              </button>
            </div>

            <h3 className="font-semibold text-base mb-1">Luk projekt?</h3>
            <p className="text-sm text-muted-foreground mb-5 leading-relaxed">
              Projektet låses og der kan ikke tastes mere ind på det.
              Vil du oprette en faktura baseret på projektets timer og linjer?
            </p>

            <div className="space-y-2">
              <Button
                className="w-full"
                onClick={() => handleClose(true)}
                disabled={loading}
              >
                <Receipt className="h-4 w-4" />
                Luk og opret faktura
              </Button>
              <Button
                variant="ghost"
                className="w-full"
                onClick={() => handleClose(false)}
                disabled={loading}
              >
                Luk uden faktura
              </Button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
