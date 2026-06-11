"use client";

import { useEffect } from "react";
import { Button } from "@/components/ui/button";
import { AlertTriangle, RotateCw } from "lucide-react";
import Link from "next/link";

/**
 * Klippekort-specifik error-boundary. Viser konkret fejl i stedet for
 * Next.js' default "Application error".
 */
export default function KlippekortError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("[klippekort/error]", error);
  }, [error]);

  return (
    <div className="max-w-xl mx-auto py-12">
      <div className="bg-card border border-destructive/30 rounded-xl p-8 text-center">
        <div className="w-12 h-12 mx-auto rounded-xl bg-destructive/10 flex items-center justify-center mb-4">
          <AlertTriangle className="h-6 w-6 text-destructive" />
        </div>
        <h1 className="text-lg font-bold mb-2">Klippekort kunne ikke indlæses</h1>
        <p className="text-sm text-muted-foreground mb-6">
          Der opstod en fejl da klippekort skulle hentes. Prøv at genindlæse siden,
          eller hard-reload med <kbd className="bg-secondary px-1.5 py-0.5 rounded text-xs">Ctrl+Shift+R</kbd>.
        </p>

        <details className="text-left bg-secondary/40 rounded-lg p-3 mb-6">
          <summary className="cursor-pointer text-xs text-muted-foreground">Tekniske detaljer</summary>
          <pre className="mt-2 text-[11px] font-mono text-foreground/80 whitespace-pre-wrap break-all">
            {error.message || "Ukendt fejl"}
            {error.digest && `\n\nDigest: ${error.digest}`}
          </pre>
        </details>

        <div className="flex gap-2 justify-center">
          <Button onClick={() => reset()} size="md">
            <RotateCw className="h-4 w-4" />
            Prøv igen
          </Button>
          <Link href="/dashboard">
            <Button variant="ghost" size="md">Til dashboard</Button>
          </Link>
        </div>
      </div>
    </div>
  );
}
