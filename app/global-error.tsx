"use client";

/**
 * Global error boundary — fanges af Next.js når der opstår en uventet
 * client-side exception. Viser brugeren en konkret besked og retry-knap
 * i stedet for "Application error: a client-side exception has occurred".
 */

import { useEffect } from "react";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("[global-error]", error);
  }, [error]);

  return (
    <html lang="da">
      <body style={{
        margin: 0,
        minHeight: "100vh",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        background: "#F8FAFC",
        fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
        padding: "1rem",
      }}>
        <div style={{
          maxWidth: 480,
          background: "#FFFFFF",
          border: "1px solid #E2E8F0",
          borderRadius: 16,
          padding: 32,
          boxShadow: "0 4px 24px rgba(15,23,42,0.06)",
        }}>
          <div style={{
            width: 48,
            height: 48,
            borderRadius: 12,
            background: "rgba(239,68,68,0.1)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            marginBottom: 16,
          }}>
            <span style={{ fontSize: 24 }}>⚠</span>
          </div>
          <h1 style={{
            fontSize: 20,
            fontWeight: 700,
            color: "#0F172A",
            margin: "0 0 8px 0",
          }}>
            Noget gik galt
          </h1>
          <p style={{
            fontSize: 14,
            color: "#475569",
            lineHeight: 1.6,
            margin: "0 0 16px 0",
          }}>
            Der opstod en uventet fejl. Det kan ofte løses ved at hard-reloade
            siden (<kbd style={{ background: "#F1F5F9", padding: "2px 6px", borderRadius: 4 }}>Ctrl+Shift+R</kbd>).
          </p>
          <details style={{
            background: "#F8FAFC",
            border: "1px solid #E2E8F0",
            borderRadius: 8,
            padding: 12,
            marginBottom: 16,
            fontSize: 12,
          }}>
            <summary style={{ cursor: "pointer", color: "#475569" }}>Tekniske detaljer</summary>
            <pre style={{
              overflow: "auto",
              margin: "8px 0 0 0",
              fontFamily: "ui-monospace, SFMono-Regular, monospace",
              fontSize: 11,
              color: "#334155",
              whiteSpace: "pre-wrap",
              wordBreak: "break-word",
            }}>
              {error.message || "Ukendt fejl"}
              {error.digest && `\n\nDigest: ${error.digest}`}
            </pre>
          </details>
          <div style={{ display: "flex", gap: 8 }}>
            <button
              onClick={() => reset()}
              style={{
                flex: 1,
                background: "#2563EB",
                color: "#FFFFFF",
                border: "none",
                padding: "10px 16px",
                borderRadius: 8,
                fontWeight: 600,
                cursor: "pointer",
                fontSize: 14,
              }}
            >
              Prøv igen
            </button>
            <button
              onClick={() => (window.location.href = "/dashboard")}
              style={{
                flex: 1,
                background: "#FFFFFF",
                color: "#1E293B",
                border: "1px solid #E2E8F0",
                padding: "10px 16px",
                borderRadius: 8,
                fontWeight: 500,
                cursor: "pointer",
                fontSize: 14,
              }}
            >
              Til dashboard
            </button>
          </div>
        </div>
      </body>
    </html>
  );
}
