"use client";

/**
 * MobileSidebarShell — context + UI til mobil-sidebar drawer
 * ─────────────────────────────────────────────────────────
 * Bruges som wrapper i tenant-layout. Den exposer en useSidebar hook saa
 * AppSidebar kan reagere paa open-state, og leverer en MobileMenuButton
 * der kan placeres i topbar.
 *
 * Adfaerd:
 *   • >= 768px (md): sidebar er altid synlig, hamburger skjult
 *   • < 768px: sidebar er drawer (skjult som default), hamburger viser
 *   • Backdrop bag drawer lukker den
 *   • Navigation til ny side lukker automatisk (router-listener)
 *   • Escape lukker drawer
 *   • Body-scroll-lock naar drawer er aaben
 */

import {
  createContext, useContext, useState, useEffect,
  type ReactNode,
} from "react";
import { usePathname } from "next/navigation";
import { Menu, X } from "lucide-react";

interface SidebarContextValue {
  open: boolean;
  setOpen: (v: boolean) => void;
}

const SidebarContext = createContext<SidebarContextValue | null>(null);

export function useSidebar(): SidebarContextValue {
  const ctx = useContext(SidebarContext);
  if (!ctx) return { open: false, setOpen: () => {} }; // fail-safe hvis brugt udenfor provider
  return ctx;
}

interface ProviderProps {
  children: ReactNode;
}

export function MobileSidebarProvider({ children }: ProviderProps) {
  const [open, setOpen] = useState(false);
  const pathname = usePathname();

  // Luk drawer naar man navigerer til ny side
  useEffect(() => {
    setOpen(false);
  }, [pathname]);

  // Body-scroll-lock + Escape naar drawer er aabent
  useEffect(() => {
    if (!open) return;
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    window.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = prevOverflow;
      window.removeEventListener("keydown", onKey);
    };
  }, [open]);

  return (
    <SidebarContext.Provider value={{ open, setOpen }}>
      {children}
      {/* Backdrop — kun synlig paa mobile naar drawer er aaben */}
      {open && (
        <div
          className="fixed inset-0 bg-black/40 backdrop-blur-sm z-[35] md:hidden"
          onClick={() => setOpen(false)}
          aria-hidden="true"
        />
      )}
    </SidebarContext.Provider>
  );
}

/**
 * Hamburger-knap — kun synlig paa mobile (< 768px).
 * Placeres i topbar.
 */
export function MobileMenuButton() {
  const { setOpen } = useSidebar();
  return (
    <button
      type="button"
      onClick={() => setOpen(true)}
      className="md:hidden -ml-1 p-2 rounded-lg hover:bg-secondary/50 transition-colors shrink-0"
      aria-label="Åbn menu"
    >
      <Menu className="h-5 w-5 text-foreground" />
    </button>
  );
}

/**
 * Close-knap — kun synlig paa mobile, placeres i sidebar.
 */
export function MobileSidebarCloseButton() {
  const { setOpen } = useSidebar();
  return (
    <button
      type="button"
      onClick={() => setOpen(false)}
      className="md:hidden absolute top-3 right-3 p-1.5 rounded-lg hover:bg-white/10 transition-colors text-white/60 hover:text-white"
      aria-label="Luk menu"
    >
      <X className="h-4 w-4" />
    </button>
  );
}

/**
 * Sidebar-wrapper der haandterer transform paa mobile.
 * Wrapper det reelle <AppSidebar/> indhold.
 */
export function ResponsiveSidebar({ children }: { children: ReactNode }) {
  const { open } = useSidebar();
  return (
    <div
      className={`
        fixed top-0 left-0 h-screen z-40
        transition-transform duration-200 ease-out
        md:translate-x-0
        ${open ? "translate-x-0" : "-translate-x-full"}
      `}
      style={{ width: "var(--sidebar-width)" }}
    >
      {children}
    </div>
  );
}
