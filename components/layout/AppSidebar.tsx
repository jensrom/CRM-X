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
  Settings,
  LogOut,
  ChevronDown,
  ChevronRight,
  Scissors,
} from "lucide-react";
import { useState } from "react";
import { getInitials } from "@/lib/utils";

type NavItem = {
  label: string;
  href?: string;
  icon: React.ElementType;
  module?: string;
  children?: NavItem[];
};

const NAV_SECTIONS: {
  section: string;
  module?: string;
  items: NavItem[];
}[] = [
  {
    section: "Overblik",
    items: [
      { label: "Dashboard", href: "/dashboard", icon: LayoutDashboard },
    ],
  },
  {
    section: "Kunder",
    items: [
      { label: "Firmaer", href: "/companies", icon: Building2 },
      { label: "Kontakter", href: "/contacts", icon: Users },
    ],
  },
  {
    section: "Salg",
    module: "sales",
    items: [
      { label: "Pipeline", href: "/pipeline", icon: KanbanSquare },
      { label: "Tilbud", href: "/quotes", icon: FileText },
    ],
  },
  {
    section: "Marketing",
    module: "marketing",
    items: [
      { label: "Kampagner", href: "/campaigns", icon: Megaphone },
      { label: "Leads", href: "/leads", icon: Target },
    ],
  },
  {
    section: "Teknik",
    module: "support",
    items: [
      { label: "Support Tickets", href: "/support/tickets", icon: Ticket },
    ],
  },
  {
    section: "Projekter",
    module: "projects",
    items: [
      { label: "Projekter",      href: "/projects",    icon: FolderKanban },
      { label: "Klippekort",     href: "/klippekort",  icon: Scissors     },
      { label: "Tidsregistrering",href: "/time",        icon: Timer        },
      { label: "Fakturaer",      href: "/invoices",    icon: FileText     },
    ],
  },
  {
    section: "Produkter",
    module: "products",
    items: [
      { label: "Produkter", href: "/products", icon: Package },
      { label: "Priser", href: "/products/pricing", icon: Tag },
    ],
  },
  {
    section: "Licenser",
    module: "licenses",
    items: [
      { label: "Licenser", href: "/licenses", icon: Key },
    ],
  },
  {
    section: "Analyse",
    items: [
      { label: "Rapporter", href: "/reports", icon: BarChart3 },
    ],
  },
];

interface AppSidebarProps {
  modules: string[];
  userName: string;
  userEmail: string;
  userRole: string;
  permissions: Record<string, Record<string, boolean>>;
}

export function AppSidebar({
  modules,
  userName,
  userEmail,
  userRole,
  permissions,
}: AppSidebarProps) {
  const pathname = usePathname();

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
          // Skjul hele sektionen hvis modul ikke er aktivt ELLER bruger ikke har rettighed
          if (!hasModuleAccess(section.module)) return null;
          if (!hasPermission(section.module)) return null;

          return (
            <div key={section.section} className="mb-4">
              {/* Sektionsoverskrift */}
              <p className="px-3 mb-1 text-[10px] font-semibold uppercase tracking-widest text-white/30">
                {section.section}
              </p>

              {section.items.map((item) => (
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
                  <span className="truncate">{item.label}</span>
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
          <span>Indstillinger</span>
        </Link>

        {/* User info */}
        <div className="flex items-center gap-3 px-3 py-2 mt-1 rounded-md">
          {/* Avatar */}
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
            title="Log ud"
          >
            <LogOut className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>
    </aside>
  );
}
