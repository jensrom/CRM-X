"use client";

/**
 * AdminSidebar — sidebar til crmadmin-portal.
 *
 * Visuel parity med kunde-tenant's AppSidebar (samme nordiske palette,
 * samme indrykninger, samme typografi). Men menu-strukturen er anderledes:
 * her er det administration af kunderne, ikke arbejde i CRM-data.
 */

import Link from "next/link";
import { usePathname } from "next/navigation";
import { signOut } from "next-auth/react";
import { cn, getInitials } from "@/lib/utils";
import {
  LayoutDashboard,
  Activity,
  CircleDollarSign,
  ServerCog,
  Globe,
  Plus,
  ScrollText,
  LogOut,
  Sparkles,
  Settings,
  Users,
} from "lucide-react";

interface Props {
  user?: { name: string; email: string };
}

const NAV_SECTIONS: { section: string; items: { label: string; href: string; icon: any }[] }[] = [
  {
    section: "Oversigt",
    items: [
      { label: "Dashboard", href: "/admin", icon: LayoutDashboard },
    ],
  },
  {
    section: "Tenants",
    items: [
      { label: "Alle kunder", href: "/admin/tenants", icon: Globe },
      { label: "Onboard ny", href: "/admin/tenants/new", icon: Plus },
    ],
  },
  {
    section: "Indsigt",
    items: [
      { label: "Aktivitet", href: "/admin/insights/activity", icon: Activity },
      { label: "Økonomi", href: "/admin/insights/finance", icon: CircleDollarSign },
      { label: "System", href: "/admin/insights/system", icon: ServerCog },
    ],
  },
  {
    section: "Compliance",
    items: [
      { label: "Audit-log", href: "/admin/audit", icon: ScrollText },
    ],
  },
  {
    section: "Værktøjer",
    items: [
      { label: "AI-assistent", href: "/admin/assistant", icon: Sparkles },
    ],
  },
  {
    section: "Indstillinger",
    items: [
      { label: "Brugere", href: "/admin/settings/users", icon: Users },
    ],
  },
];

export function AdminSidebar({ user }: Props) {
  const pathname = usePathname();

  return (
    <aside className="w-64 bg-card border-r border-border flex flex-col h-screen sticky top-0">
      {/* Brand */}
      <div className="px-5 py-4 border-b border-border">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center shrink-0">
            <span className="text-primary-foreground font-bold text-sm">CX</span>
          </div>
          <div className="min-w-0">
            <p className="font-semibold text-sm leading-tight truncate">CRM-X Admin</p>
            <p className="text-[10px] text-muted-foreground uppercase tracking-wider">
              Super Admin Portal
            </p>
          </div>
        </div>
      </div>

      {/* Nav */}
      <nav className="flex-1 overflow-y-auto px-3 py-3 space-y-4">
        {NAV_SECTIONS.map((section) => (
          <div key={section.section}>
            <p className="px-2 mb-1 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground/60">
              {section.section}
            </p>
            <div className="space-y-0.5">
              {section.items.map((item) => {
                const Icon = item.icon;
                const active =
                  pathname === item.href ||
                  (item.href !== "/admin" && pathname?.startsWith(item.href));
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={cn(
                      "flex items-center gap-2.5 px-2.5 py-1.5 rounded-lg text-sm transition-colors",
                      active
                        ? "bg-primary text-primary-foreground font-medium"
                        : "text-foreground/80 hover:bg-secondary hover:text-foreground"
                    )}
                  >
                    <Icon className="h-3.5 w-3.5 shrink-0" />
                    <span className="truncate">{item.label}</span>
                  </Link>
                );
              })}
            </div>
          </div>
        ))}
      </nav>

      {/* User */}
      <div className="border-t border-border px-3 py-3">
        <div className="flex items-center gap-2.5 px-2 py-1.5 rounded-lg">
          <div className="w-8 h-8 rounded-full bg-muted text-foreground flex items-center justify-center text-xs font-semibold shrink-0">
            {user ? getInitials(user.name) : "?"}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium truncate">{user?.name ?? "Super admin"}</p>
            <p className="text-[10px] text-muted-foreground truncate">Super Admin</p>
          </div>
          <button
            onClick={() => signOut({ callbackUrl: "/login" })}
            title="Log ud"
            className="text-muted-foreground hover:text-foreground transition-colors p-1 rounded-md"
          >
            <LogOut className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>
    </aside>
  );
}
