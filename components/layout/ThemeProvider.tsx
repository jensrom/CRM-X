"use client";

/**
 * ThemeProvider — toggler `dark` class paa <html> baseret paa user preference
 * eller system-preference. Persisterer i localStorage.
 *
 * Initial theme loades fra props (server-side fra session.user.theme), saa
 * vi undgaar flash-of-light-mode ved fuld page-load.
 */

import { useEffect } from "react";

type Theme = "light" | "dark" | "system";

interface Props {
  initialTheme?: Theme;
  children: React.ReactNode;
}

export function ThemeProvider({ initialTheme = "system", children }: Props) {
  useEffect(() => {
    const stored = localStorage.getItem("theme") as Theme | null;
    const theme = stored ?? initialTheme;
    applyTheme(theme);

    // Lyt efter system-skifte hvis user har valgt "system"
    if (theme === "system") {
      const mq = window.matchMedia("(prefers-color-scheme: dark)");
      const handler = () => applyTheme("system");
      mq.addEventListener("change", handler);
      return () => mq.removeEventListener("change", handler);
    }
  }, [initialTheme]);

  return <>{children}</>;
}

export function applyTheme(theme: Theme) {
  const root = document.documentElement;
  const isDark =
    theme === "dark" ||
    (theme === "system" && window.matchMedia("(prefers-color-scheme: dark)").matches);
  root.classList.toggle("dark", isDark);
  localStorage.setItem("theme", theme);
}
