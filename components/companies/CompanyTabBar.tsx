"use client";

/**
 * Tab-bar til kunde-detalje
 * ─────────────────────────
 * Viser horisontal navigation mellem kundens "verdener":
 *   Overblik · Produkter · Licenser · Projekter · Tickets · Klippekort · Fakturaer · Aktivitet
 *
 * Lowkey nordisk: bløde understreger, antal-tællere i bløde toner,
 * scroll-snap til mobil. Tab-state synces til URL'en (?tab=) så hver
 * tab er bookmarkbar og deler-bar.
 */

import Link from "next/link";
import { useSearchParams, usePathname } from "next/navigation";
import {
  Eye,
  Package,
  Key,
  FolderKanban,
  Ticket as TicketIcon,
  Scissors,
  Receipt,
  Activity,
} from "lucide-react";

export type CompanyTabKey =
  | "overblik"
  | "produkter"
  | "licenser"
  | "projekter"
  | "tickets"
  | "klippekort"
  | "fakturaer"
  | "aktivitet";

interface TabDef {
  key: CompanyTabKey;
  label: string;
  icon: any;
  count?: number;
}

interface Props {
  counts: {
    produkter: number;
    licenser: number;
    projekter: number;
    tickets: number;
    klippekort: number;
    fakturaer: number;
    aktivitet: number;
  };
  /** Hvis sat: pege Links til denne pathname i stedet for at læse usePathname() */
  basePath?: string;
}

export function CompanyTabBar({ counts, basePath }: Props) {
  const searchParams = useSearchParams();
  const pathname = usePathname();
  const path = basePath ?? pathname;

  const activeTab = (searchParams.get("tab") as CompanyTabKey) || "overblik";

  const tabs: TabDef[] = [
    { key: "overblik",   label: "Overblik",   icon: Eye },
    { key: "produkter",  label: "Produkter",  icon: Package,      count: counts.produkter },
    { key: "licenser",   label: "Licenser",   icon: Key,          count: counts.licenser },
    { key: "projekter",  label: "Projekter",  icon: FolderKanban, count: counts.projekter },
    { key: "tickets",    label: "Tickets",    icon: TicketIcon,   count: counts.tickets },
    { key: "klippekort", label: "Klippekort", icon: Scissors,     count: counts.klippekort },
    { key: "fakturaer",  label: "Fakturaer",  icon: Receipt,      count: counts.fakturaer },
    { key: "aktivitet",  label: "Aktivitet",  icon: Activity,     count: counts.aktivitet },
  ];

  return (
    <div className="border-b border-border -mx-6 px-6 mb-6 overflow-x-auto scrollbar-thin">
      <nav className="flex items-center gap-1 min-w-max">
        {tabs.map((t) => {
          const isActive = activeTab === t.key;
          const Icon = t.icon;
          // Tab-link bevarer URL-pathnamen men sætter ?tab=<key>.
          // For "overblik" rydder vi tab-paramen, så URL'en bliver ren.
          const href =
            t.key === "overblik" ? path : `${path}?tab=${t.key}`;

          return (
            <Link
              key={t.key}
              href={href}
              scroll={false}
              className={`relative flex items-center gap-2 px-3.5 py-2.5 text-sm font-medium rounded-t-lg transition-colors ${
                isActive
                  ? "text-foreground"
                  : "text-muted-foreground hover:text-foreground hover:bg-secondary/40"
              }`}
            >
              <Icon className="h-3.5 w-3.5" />
              {t.label}
              {typeof t.count === "number" && t.count > 0 && (
                <span
                  className={`text-[10px] tabular-nums px-1.5 py-0.5 rounded-full ${
                    isActive
                      ? "bg-primary/10 text-primary"
                      : "bg-secondary text-muted-foreground"
                  }`}
                >
                  {t.count}
                </span>
              )}
              {isActive && (
                <span className="absolute inset-x-2 -bottom-px h-0.5 bg-primary rounded-full" />
              )}
            </Link>
          );
        })}
      </nav>
    </div>
  );
}
