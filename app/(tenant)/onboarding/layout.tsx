/**
 * Onboarding-layout
 * ─────────────────
 * Centreret container med progress-bar + skip-link i toppen.
 * Sidebar/topbar er bevidst SKJULT i onboarding for at give fokus.
 *
 * Adgangskontrol:
 *   • Kun admin-roller maa se onboarding (super_admin, admin, administrator)
 *   • Hvis onboarding allerede er faerdig → redirect til /dashboard
 */

import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { redirect } from "next/navigation";
import { Sparkles } from "lucide-react";
import { skipOnboarding } from "@/app/actions/onboarding";

export const dynamic = "force-dynamic";

export default async function OnboardingLayout({ children }: { children: React.ReactNode }) {
  const session = await auth();
  if (!session?.user?.tenantId) redirect("/login");

  const role = (session.user.role ?? "").toLowerCase();
  if (!["admin", "administrator", "super_admin"].includes(role)) {
    redirect("/dashboard");
  }

  const tenant = await db.tenant.findFirst({
    where: { id: session.user.tenantId },
    select: { name: true, onboardingCompletedAt: true },
  });
  if (tenant?.onboardingCompletedAt) {
    redirect("/dashboard");
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-secondary/30 to-background">
      {/* Top-strip med skip */}
      <div className="border-b border-border bg-card/70 backdrop-blur">
        <div className="max-w-3xl mx-auto px-6 py-3 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-violet-500 to-emerald-500 flex items-center justify-center">
              <Sparkles className="h-3.5 w-3.5 text-white" />
            </div>
            <p className="text-sm font-semibold">Velkommen til CRM-X</p>
            <p className="text-xs text-muted-foreground hidden sm:block">· {tenant?.name}</p>
          </div>
          <form action={skipOnboarding}>
            <button
              type="submit"
              className="text-xs text-muted-foreground hover:text-foreground transition-colors"
            >
              Spring opsætning over
            </button>
          </form>
        </div>
      </div>

      <main className="max-w-3xl mx-auto px-6 py-10">
        {children}
      </main>
    </div>
  );
}
