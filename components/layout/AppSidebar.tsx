"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { signOut } from "next-auth/react";
import { cn } from "@/lib/utils";
import {
  LayoutDashboard,
  Building2,
  Users,
  TrendingUp,
  KanbanSquare,
  FileText,
  Megaphone,
  Target,
  Ticket,
  Timer,
  FolderKanban,
  Package,
  Tag,
  Key,
  BarChart3,
  Sparkles,
  Settings,
  LogOut,
  ChevronDown,
  ChevronRight,
  Scissors,
} from "lucide-react";
import { useState } from "react";
import { getInitials } from "@/lib/utils";
import { t, normalizeLocale, type LocaleSlug } from "@/lib/i18n";

type NavItem = {
  /** i18n-key til oversaettelse — fallback til `label` hvis ikke fundet */
  i18nKey?: string;
  label: string;
  href?: string;
  icon: React.ElementType;
  module?: string;
  children?: NavItem[];
};

/**
 * Sidebar-struktur — persona-baseret
 *
 * Sektionerne respekterer eksisterende modul-tilladelser:
 *   • section.module     — modulet skal være aktivt på tenant'en
 *   • permissions[mod].view — brugeren skal have view-tilladelse
 *
 * Eksempel: Tekniske konsulenter har typisk ikke "sales.view" og ser
 * derfor ikke SALG-sektionen (Pipeline, Tilbud, Fakturaer, Priser).
 * De ser stadig TEKNIK (Support, Projekter, Klippekort, Tid) og
 * PRODUKTER & LICENSER.
 *
 * Hvis et menupunkt har sit eget module, har det forrang over sektionens.
 */
const NAV_SECTIONS: {
  section: string;
  sectionKey?: string;
  module?: string;
  items: NavItem[];
}[] = [
  {
    section: "Overblik",         sectionKey: "nav.section.overview",
    items: [
      { i18nKey: "nav.dashboard", label: "Dashboard", href: "/dashboard", icon: LayoutDashboard },
    ],
  },
  {
    section: "Kunder",           sectionKey: "nav.section.customers",
    items: [
      { i18nKey: "nav.customers", label: "Kunder", href: "/kunder", icon: Building2 },
      { i18nKey: "nav.contacts", label: "Kontakter", href: "/contacts", icon: Users },
    ],
  },
  {
    // SALG samler hele salgs-loopet: pipeline → tilbud → faktura + priser.
    // Tekniske konsulenter ser ikke denne sektion (mangler sales.view).
    section: "Salg",             sectionKey: "nav.section.sales",
    module: "sales",
    items: [
      { i18nKey: "nav.pipeline", label: "Pipeline",  href: "/pipeline",         icon: KanbanSquare },
      { i18nKey: "nav.quotes", label: "Tilbud",    href: "/quotes",           icon: FileText     },
      { i18nKey: "nav.invoices", label: "Fakturaer", href: "/invoices",         icon: FileText     },
      { i18nKey: "nav.pricing", label: "Priser",    href: "/products/pricing", icon: Tag          },
    ],
  },
  {
    section: "Marketing",        sectionKey: "nav.section.marketing",
    module: "marketing",
    items: [
      { i18nKey: "nav.campaigns", label: "Kampagner", href: "/campaigns", icon: Megaphone },
      { i18nKey: "nav.leads", label: "Leads",     href: "/leads",     icon: Target    },
    ],
  },
  {
    // TEKNIK — den centrale "teknisk konsulent"-sektion.
    // Hver menupunkt har sit eget modul-krav, så fx Klippekort/Tid kun vises
    // hvis projekt-modulet er aktivt. Support-tickets følger support-modulet.
    section: "Teknik",           sectionKey: "nav.section.tech",
    items: [
      { i18nKey: "nav.tickets", label: "Support Tickets",  href: "/support/tickets", icon: Ticket,      module: "support"  },
      { i18nKey: "nav.projects", label: "Projekter",        href: "/projects",        icon: FolderKanban,module: "projects" },
      { i18nKey: "nav.klippekort", label: "Klippekort",       href: "/klippekort",      icon: Scissors,    module: "projects" },
      { i18nKey: "nav.time", label: "Tidsregistrering", href: "/time",            icon: Timer,       module: "projects" },
    ],
  },
  {
    // Produkter og licenser hører sammen — begge styrer hvad kunden ejer.
    section: "Produkt & Licens", sectionKey: "nav.section.products",
    items: [
      { i18nKey: "nav.products", label: "Produkter", href: "/products", icon: Package, module: "products" },
      { i18nKey: "nav.licenses", label: "Licenser",  href: "/licenses", icon: Key,     module: "licenses" },
    ],
  },
  {
    section: "Analyse",          sectionKey: "nav.section.analytics",
    items: [
      { i18nKey: "nav.reports", label: "Rapporter", href: "/reports", icon: BarChart3 },
      {
        i18nKey: "nav.forecast", label: "Forecast", href: "/forecast",
        icon: Sparkles, module: "forecast", betaBadge: true,
      },
    ],
  },
];

interface AppSidebarProps {
  modules: string[];
  userName: string;
  userEmail: string;
  userRole: string;
  permissions: Record<string, Record<string, boolean>>;
  locale?: string | null;
}

export function AppSidebar({
  modules,
  userName,
  userEmail,
  userRole,
  permissions,
  locale,
}: AppSidebarProps) {
  const pathname = usePathname();
  const loc: LocaleSlug = normalizeLocale(locale);

  const isActive = (href: string) => {
    if (href === "/dashboard") return pathname === "/dashboard";
    return pathname.startsWith(href);
  };

  const hasModuleAccess = (module?: string) => {
    if (!module) return true;
    return modules.includes(module);
  };

  const hasPermission = (module?: string) => {
    if (!module) return true;
    return permissions?.[module]?.view !== false;
  };

  return (
    <aside
      className="fixed left-0 top-0 h-screen flex flex-col z-30"
      style={{
        width: "var(--sidebar-width)",
        background: "hsl(var(--sidebar-bg))",
        borderRight: "1px solid hsl(var(--sidebar-border))",
      }}
    >
      {/* Logo */}
      <div className="flex items-center gap-3 px-5 py-4 border-b border-white/10">
        <div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center shrink-0">
          <span className="text-white font-bold text-sm">CX</span>
        </div>
        <div className="min-w-0">
          <p className="text-white font-semibold text-sm leading-tight truncate">
            CRM-X
          </p>
          <p className="text-white/50 text-xs truncate">Plesner Tech</p>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 overflow-y-auto py-4 px-2">
        {NAV_SECTIONS.map((section) => {
          // Sektions-niveau gating: hvis sektionen kraever et modul, skal det
          // baade vaere aktivt paa tenant og brugeren skal have view-tilladelse.
          if (!hasModuleAccess(section.module)) return null;
          if (!hasPermission(section.module)) return null;

          // Filtrér items: hvert item kan ogsaa kraeve sit eget modul.
          // Dette goer at fx "Klippekort" forsvinder hvis projekt-modulet
          // ikke er aktivt, selv om TEKNIK-sektionen vises.
          const visibleItems = section.items.filter((item) => {
            if (!hasModuleAccess(item.module)) return false;
            if (!hasPermission(item.module)) return false;
            return true;
          });

          // Hvis sektionen ender med 0 synlige items, skjul den helt.
          if (visibleItems.length === 0) return null;

          return (
            <div key={section.section} className="mb-4">
              {/* Sektionsoverskrift */}
              <p className="px-3 mb-1 text-[10px] font-semibold uppercase tracking-widest text-white/30">
                {section.sectionKey ? t(section.sectionKey, loc) : section.section}
              </p>

              {visibleItems.map((item) => (
                <Link
                  key={item.href}
                  href={item.href || "#"}
                  className={cn(
                    "nav-item mb-0.5",
                    isActive(item.href || "")
                      ? "bg-primary text-white"
                      : "text-white/60 hover:text-white hover:bg-white/8"
                  )}
                >
                  <item.icon
                    className={cn(
                      "h-4 w-4 shrink-0",
                      isActive(item.href || "") ? "text-white" : "text-white/50"
                    )}
                  />
                  <span className="truncate">{item.i18nKey ? t(item.i18nKey, loc) : item.label}</span>
                  {(item as any).betaBadge && (
                    <span className="ml-auto text-[9px] uppercase font-semibold tracking-wide px-1.5 py-0.5 rounded-full bg-violet-500/20 text-violet-200 border border-violet-400/30">
                      Beta
                    </span>
                  )}
                </Link>
              ))}
            </div>
          );
        })}
      </nav>

      {/* Bottom: Settings + User */}
      <div className="border-t border-white/10 p-2">
        <Link
          href="/settings"
          className={cn(
            "nav-item mb-1",
            pathname.startsWith("/settings")
              ? "bg-primary text-white"
              : "text-white/60 hover:text-white hover:bg-white/8"
          )}
        >
          <Settings className="h-4 w-4 shrink-0 text-white/50" />
          <span>{t("nav.settings", loc)}</span>
        </Link>

        {/* User info */}
        <div className="flex items-center gap-3 px-3 py-2 mt-1 rounded-md">
          <div className="w-8 h-8 rounded-full bg-primary/80 flex items-center justify-center shrink-0">
            <span className="text-white text-xs font-medium">
              {getInitials(userName)}
            </span>
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-white text-xs font-medium truncate">{userName}</p>
            <p className="text-white/40 text-[11px] truncate">{userRole}</p>
          </div>
          <button
            onClick={() => signOut({ callbackUrl: "/login" })}
            className="text-white/30 hover:text-white/70 transition-colors p-1 rounded"
            title={t("nav.logout", loc)}
          >
            <LogOut className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>
    </aside>
  );
}
