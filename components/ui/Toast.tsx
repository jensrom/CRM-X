"use client";

/**
 * Toast — let toast-system med Radix Toast.
 *
 * Brug:
 *   1. <ToastProvider> i tenant-layout (allerede gjort)
 *   2. `const { showToast } = useToast()` i client-komponent
 *   3. showToast({ title, description, variant: "success" | "error" | "info" })
 */

import {
  Provider,
  Root,
  Title,
  Description,
  Close,
  Viewport,
} from "@radix-ui/react-toast";
import { createContext, useContext, useState, type ReactNode } from "react";
import { CheckCircle2, XCircle, Info, X } from "lucide-react";

type Variant = "success" | "error" | "info";

interface ToastMessage {
  id: string;
  title: string;
  description?: string;
  variant: Variant;
}

interface ToastContextValue {
  showToast: (msg: Omit<ToastMessage, "id">) => void;
}

const ToastContext = createContext<ToastContextValue>({ showToast: () => {} });

export function useToast() {
  return useContext(ToastContext);
}

const ICONS: Record<Variant, any> = {
  success: CheckCircle2,
  error: XCircle,
  info: Info,
};

const COLORS: Record<Variant, string> = {
  success: "border-emerald-500/40 bg-emerald-50 dark:bg-emerald-950/30 text-emerald-900 dark:text-emerald-200",
  error:   "border-rose-500/40 bg-rose-50 dark:bg-rose-950/30 text-rose-900 dark:text-rose-200",
  info:    "border-blue-500/40 bg-blue-50 dark:bg-blue-950/30 text-blue-900 dark:text-blue-200",
};

const ICON_COLORS: Record<Variant, string> = {
  success: "text-emerald-600 dark:text-emerald-400",
  error:   "text-rose-600 dark:text-rose-400",
  info:    "text-blue-600 dark:text-blue-400",
};

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<ToastMessage[]>([]);

  const showToast = (msg: Omit<ToastMessage, "id">) => {
    const id = String(Date.now() + Math.random());
    setToasts((prev) => [...prev, { ...msg, id }]);
  };

  return (
    <ToastContext.Provider value={{ showToast }}>
      <Provider swipeDirection="right" duration={4000}>
        {children}
        {toasts.map((t) => {
          const Icon = ICONS[t.variant];
          return (
            <Root
              key={t.id}
              className={`flex items-start gap-3 rounded-xl border p-4 shadow-lg ${COLORS[t.variant]} data-[state=open]:animate-in data-[state=open]:slide-in-from-right-full data-[state=closed]:animate-out data-[state=closed]:fade-out`}
              onOpenChange={(open) => {
                if (!open) setToasts((prev) => prev.filter((x) => x.id !== t.id));
              }}
            >
              <Icon className={`h-5 w-5 shrink-0 mt-0.5 ${ICON_COLORS[t.variant]}`} />
              <div className="flex-1 min-w-0">
                <Title className="text-sm font-semibold">{t.title}</Title>
                {t.description && (
                  <Description className="text-xs mt-0.5 opacity-90">{t.description}</Description>
                )}
              </div>
              <Close className="rounded-md p-1 hover:bg-black/5 dark:hover:bg-white/5 transition-colors">
                <X className="h-3.5 w-3.5" />
              </Close>
            </Root>
          );
        })}
        <Viewport className="fixed bottom-4 right-4 z-50 flex w-full max-w-sm flex-col gap-2 outline-none" />
      </Provider>
    </ToastContext.Provider>
  );
}
