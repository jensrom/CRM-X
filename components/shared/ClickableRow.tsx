"use client";

import { useRouter } from "next/navigation";
import { ReactNode } from "react";
import { cn } from "@/lib/utils";

interface ClickableRowProps {
  href: string;
  children: ReactNode;
  className?: string;
}

/**
 * Bruges som <tr>-erstatning i tabeller hvor hele rækken skal være klikbar.
 *
 * Standard <Link> i hver <td> giver kun klik på selve tekst-elementer,
 * og brugere oplever at "klikke på rækken" ikke virker når de rammer
 * mellem celler. Denne komponent navigerer via useRouter når der klikkes
 * hvor som helst på rækken, mens den respekterer Cmd/Ctrl-klik til ny fane.
 */
export function ClickableRow({ href, children, className }: ClickableRowProps) {
  const router = useRouter();

  function onClick(e: React.MouseEvent<HTMLTableRowElement>) {
    // Tillad åbn-i-ny-fane (Cmd/Ctrl/middle-click)
    if (e.ctrlKey || e.metaKey || e.button === 1) {
      window.open(href, "_blank", "noopener");
      return;
    }
    // Ignorér klik på interaktive child-elements (a, button, input)
    const target = e.target as HTMLElement;
    if (target.closest("a, button, input, label, select")) return;
    router.push(href);
  }

  return (
    <tr
      onClick={onClick}
      className={cn(
        "border-b border-border last:border-0 hover:bg-secondary/40 cursor-pointer transition-colors group",
        className
      )}
    >
      {children}
    </tr>
  );
}
