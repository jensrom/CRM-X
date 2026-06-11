"use client";

/**
 * Suppresses spurious "[object Event]"-style errors that bubble up from
 * third-party scripts (Vercel Live, browser extensions, etc.) and that
 * Next.js' dev-overlay otherwise displays as a misleading "Runtime Error".
 *
 * Only active in development. Real React errors are NOT suppressed —
 * we only swallow ufangede Event-objects der ikke er reelle Error-instances.
 */

import { useEffect } from "react";

export function DevErrorSuppressor() {
  useEffect(() => {
    if (process.env.NODE_ENV === "production") return;

    function isNoiseEvent(e: unknown): boolean {
      // Et reelt JS-Error har stack og message.
      if (e instanceof Error) return false;
      // Event-objekter fra fetch/WebSocket/CSP-violations: stringify giver "[object Event]"
      if (typeof e === "object" && e !== null && Object.prototype.toString.call(e) === "[object Event]") {
        return true;
      }
      return false;
    }

    function onError(ev: ErrorEvent) {
      if (isNoiseEvent(ev.error) || (ev.message && ev.message.includes("[object Event]"))) {
        ev.preventDefault();
        ev.stopImmediatePropagation();
        console.debug("[DevErrorSuppressor] swallowed noisy error event:", ev);
        return false;
      }
    }

    function onUnhandledRejection(ev: PromiseRejectionEvent) {
      if (isNoiseEvent(ev.reason)) {
        ev.preventDefault();
        console.debug("[DevErrorSuppressor] swallowed noisy promise rejection:", ev.reason);
      }
    }

    window.addEventListener("error", onError, true);
    window.addEventListener("unhandledrejection", onUnhandledRejection, true);
    return () => {
      window.removeEventListener("error", onError, true);
      window.removeEventListener("unhandledrejection", onUnhandledRejection, true);
    };
  }, []);

  return null;
}
