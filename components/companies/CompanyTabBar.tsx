"use client";

/**
 * Tab-bar til kunde-detalje
 * BEVIDST <a> i stedet for next/link Link:
 * I App Router med force-dynamic + searchParams-only-href har Link en bug
 * hvor klik strippe ?tab= og sender brugeren tilbage til base-URL.
 * Full-navigation via <a> løser det — siden re-rendres alligevel pr. tab.
 */

import { useSearchParams, usePathname } from "next/navigation";
import {
  Eye,
  Package,
  Key,
  FolderKanban,
  Ticket as TicketIcon,
  Scissors,
  FileSignature,
  Receipt,
  Activity,
  Paperclip,
  MessageCircle,
} from "lucide-react";

export type CompanyTabKey =
  | "overblik"
  | "produkter"
  | "licenser"
  | "projekter"
  | "tickets"
  | "klippekort"
  | "tilbud"
  | "fakturaer"
  | "aktivitet"
  | "filer"
  | "kommentarer";

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
    tilbud: number;
    fakturaer: number;
    aktivitet: number;
    filer?: number;
    kommentarer?: number;
  };
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
    { key: "tilbud",     label: "Tilbud",     icon: FileSignature,count: counts.tilbud },
    { key: "fakturaer",  label: "Fakturaer",  icon: Receipt,      count: counts.fakturaer },
    { key: "aktivitet",  label: "Aktivitet",  icon: Activity,     count: counts.aktivitet },
    { key: "filer",      label: "Filer",      icon: Paperclip,    count: counts.filer ?? 0 },
    { key: "kommentarer", label: "Kommentarer", icon: MessageCircle, count: counts.kommentarer ?? 0 },
  ];

  return (
    <div className="border-b border-border -mx-6 px-6 mb-6 overflow-x-auto scrollbar-thin">
      <nav className="flex items-center gap-1 min-w-max">
        {tabs.map((t) => {
          const isActive = activeTab === t.key;
          const Icon = t.icon;
          const href = t.key === "overblik" ? path : `${path}?tab=${t.key}`;

          return (
            <a
              key={t.key}
              href={href}
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
            </a>
          );
        })}
      </nav>
    </div>
  );
}
