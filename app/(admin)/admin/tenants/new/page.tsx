import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import Link from "next/link";
import { headers } from "next/headers";
import { detectCurrencyFromHeaders } from "@/lib/plans";
import { OnboardingWizard } from "@/components/admin/onboarding/OnboardingWizard";

export const metadata = {
  title: "Onboard ny kunde — CRM-X Admin",
};

export default async function NewTenantPage() {
  const session = await auth();
  if (session?.user?.role !== "super_admin") redirect("/login");

  const h = await headers();
  const currency = detectCurrencyFromHeaders(h.get("accept-language"));

  return (
    <div className="min-h-screen bg-background">
      <header className="bg-card border-b border-border px-6 py-3 flex items-center gap-4 sticky top-0 z-10">
        <Link
          href="/admin"
          className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
        >
          <ArrowLeft className="h-4 w-4" />
          Admin Portal
        </Link>
        <span className="text-muted-foreground/40">/</span>
        <span className="text-sm font-medium">Onboard ny kunde</span>
      </header>

      <main className="p-6 max-w-4xl mx-auto">
        <div className="mb-8">
          <h1 className="text-2xl font-bold mb-1">Velkommen ny CRM-X kunde 🌱</h1>
          <p className="text-muted-foreground text-sm">
            Vi sætter et nyt CRM-instance op på 2 minutter — udfyld i fem hurtige trin.
          </p>
        </div>

        <OnboardingWizard defaultCurrency={currency} />
      </main>
    </div>
  );
}
