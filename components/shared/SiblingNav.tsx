"use client";

/**
 * SiblingNav — Forrige/Næste pile på detalje-sider.
 *
 * Tager en liste af alle siblings (fx alle åbne tickets) og finder den nuværende.
 * Viser pile til [prev] / [next] der navigerer direkte til den anden detalje-side.
 *
 * Hvis der ikke er en prev/next (først/sidst i listen) er knappen disabled.
 *
 * Brug:
 *   <SiblingNav
 *     ids={["t1", "t2", "t3"]}
 *     currentId="t2"
 *     hrefPattern="/support/tickets/{id}"
 *   />
 */

import Link from "next/link";
import { ChevronLeft, ChevronRight } from "lucide-react";

interface Props {
  ids: string[];
  currentId: string;
  /** URL-mønster hvor {id} erstattes med næste/forrige ID */
  hrefPattern: string;
  /** Label til prev — fx "Forrige ticket" */
  prevLabel?: string;
  nextLabel?: string;
}

export function SiblingNav({
  ids,
  currentId,
  hrefPattern,
  prevLabel = "Forrige",
  nextLabel = "Næste",
}: Props) {
  const idx = ids.indexOf(currentId);
  if (idx === -1) return null;

  const prev = idx > 0 ? ids[idx - 1] : null;
  const next = idx < ids.length - 1 ? ids[idx + 1] : null;
  const position = `${idx + 1} af ${ids.length}`;

  return (
    <div className="inline-flex items-center gap-1 text-xs text-muted-foreground">
      {prev ? (
        <Link
          href={hrefPattern.replace("{id}", prev)}
          className="inline-flex items-center gap-1 px-2 py-1 rounded-md hover:bg-secondary/60 hover:text-foreground transition-colors"
          title={prevLabel}
        >
          <ChevronLeft className="h-3.5 w-3.5" />
          {prevLabel}
        </Link>
      ) : (
        <span className="inline-flex items-center gap-1 px-2 py-1 opacity-40">
          <ChevronLeft className="h-3.5 w-3.5" />
          {prevLabel}
        </span>
      )}

      <span className="px-2 tabular-nums">{position}</span>

      {next ? (
        <Link
          href={hrefPattern.replace("{id}", next)}
          className="inline-flex items-center gap-1 px-2 py-1 rounded-md hover:bg-secondary/60 hover:text-foreground transition-colors"
          title={nextLabel}
        >
          {nextLabel}
          <ChevronRight className="h-3.5 w-3.5" />
        </Link>
      ) : (
        <span className="inline-flex items-center gap-1 px-2 py-1 opacity-40">
          {nextLabel}
          <ChevronRight className="h-3.5 w-3.5" />
        </span>
      )}
    </div>
  );
}
