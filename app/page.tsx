import { headers } from "next/headers";
import { redirect } from "next/navigation";

// Root side: hvis vi er i en tenant-kontekst, ga til dashboard
// Ellers, vis CRM-X landing page (kommer i Fase 14)
export default async function RootPage() {
  const headersList = await headers();
  const tenantSlug = headersList.get("x-tenant-slug");

  if (tenantSlug) {
    redirect("/dashboard");
  }

  // Midlertidig landing page indtil Fase 14
  return (
    <div className="min-h-screen bg-background flex items-center justify-center">
      <div className="text-center space-y-4">
        <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-primary mb-2">
          <span className="text-white font-bold text-2xl">CX</span>
        </div>
        <h1 className="text-3xl font-bold text-foreground">CRM-X</h1>
        <p className="text-muted-foreground max-w-md">
          Den komplette CRM-platform til moderne konsulenthuse.
        </p>
        <a
          href="/login"
          className="inline-block mt-4 px-6 py-2.5 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 transition-colors"
        >
          Log ind
        </a>
      </div>
    </div>
  );
}
