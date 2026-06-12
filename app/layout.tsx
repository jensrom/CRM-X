import type { Metadata } from "next";
import "./globals.css";
import { CookieBanner } from "@/components/shared/CookieBanner";

// Slå static prerender fra på root-niveau. Vi læser session + DB overalt.
export const dynamic = "force-dynamic";
export const revalidate = 0;

export const metadata: Metadata = {
  title: {
    default: "CRM-X — Konsulenthus Platform",
    template: "%s | CRM-X",
  },
  description:
    "Den komplette CRM-platform til moderne konsulenthuse. Salg, support, projekter og licenshåndtering i ét samlet system.",
  metadataBase: new URL(
    process.env.NEXT_PUBLIC_APP_URL || "https://plesnertech.dk"
  ),
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const isDev = process.env.NODE_ENV !== "production";
  return (
    <html lang="da">
      <head>
        {isDev && (
          <script
            // Synkront inline-script: filtrér spurious "[object Event]" fra dev-overlay
            // FØR React mounter, ellers fanger Next.js fejlen først.
            // Ægte Error-instances går igennem som normalt.
            dangerouslySetInnerHTML={{
              __html: `
                (function() {
                  function isNoise(e) {
                    if (e instanceof Error) return false;
                    if (typeof e === "object" && e !== null && Object.prototype.toString.call(e) === "[object Event]") return true;
                    return false;
                  }
                  window.addEventListener("error", function(ev) {
                    if (isNoise(ev.error) || (ev.message && (ev.message.indexOf("[object Event]") !== -1 || ev.message === "Event"))) {
                      ev.preventDefault();
                      ev.stopImmediatePropagation();
                      return false;
                    }
                  }, true);
                  window.addEventListener("unhandledrejection", function(ev) {
                    if (isNoise(ev.reason)) {
                      ev.preventDefault();
                    }
                  }, true);
                })();
              `,
            }}
          />
        )}
      </head>
      <body>
        {children}
        <CookieBanner />
      </body>
    </html>
  );
}
