import { AppTopbar } from "@/components/layout/AppTopbar";
import { BackButton } from "@/components/shared/BackButton";
import { PageHeader } from "@/components/shared/PageHeader";
import { ApiTokensManager } from "@/components/settings/ApiTokensManager";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { Lock } from "lucide-react";

export default async function ApiSettingsPage() {
  const session = await auth();
  const tenantId = session?.user?.tenantId;
  if (!tenantId) return null;

  // Hent tenant-plan for at tjekke om API er aktiveret
  const tenant = await db.tenant.findUnique({
    where: { id: tenantId },
    select: { plan: true, name: true },
  });

  const plan = tenant?.plan ?? "small";
  // API KUN på Large-pakke (small | medium | large)
  const hasFullApiAccess = plan === "large";

  // Hent eksisterende API-tokens — fejler stille hvis ApiToken-tabellen
  // endnu ikke er migreret (kør "npx prisma db push" for at oprette).
  const tokens = await (db as any).apiToken
    ?.findMany?.({
      where: { tenantId, isActive: true },
      orderBy: { createdAt: "desc" },
      select: {
        id: true,
        name: true,
        tokenPrefix: true,
        expiresAt: true,
        createdAt: true,
        lastUsedAt: true,
      },
    })
    .catch(() => []) ?? [];

  return (
    <>
      <AppTopbar pageTitle="API & Integrationer" />
      <BackButton href="/settings" label="Indstillinger" />

      <div className="max-w-3xl">
        <PageHeader
          title="API & Integrationer"
          description="Opret API-tokens til integration med andre systemer"
        />

        {!hasFullApiAccess && (
          <div className="mb-6 p-5 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-700 rounded-xl">
            <div className="flex items-start gap-3">
              <Lock className="h-5 w-5 text-amber-600 shrink-0 mt-0.5" />
              <div>
                <p className="text-sm font-semibold text-amber-800 dark:text-amber-300">
                  API-adgang kræver Large-pakken
                </p>
                <p className="text-sm text-amber-700 dark:text-amber-400 mt-1">
                  API-tokens og integrationer er kun tilgængeligt på Large-pakken.
                  Kontakt os for at opgradere din plan.
                </p>
              </div>
            </div>
          </div>
        )}

        <ApiTokensManager tokens={tokens} locked={!hasFullApiAccess} />

        {/* API Dokumentation */}
        <div className="mt-8 bg-card border border-border rounded-xl p-5">
          <h3 className="text-sm font-semibold mb-3">API Dokumentation</h3>
          <p className="text-sm text-muted-foreground mb-4">
            CRM-X REST API bruger Bearer-token autentificering.
            Inkluder dit API-token i headeren på alle requests.
          </p>

          <div className="space-y-4">
            <div>
              <p className="text-xs font-mono text-muted-foreground mb-1.5 uppercase">Autentificering</p>
              <div className="bg-secondary rounded-lg p-3 font-mono text-xs overflow-x-auto">
                <span className="text-violet-600">Authorization:</span>{" "}
                <span className="text-emerald-600">Bearer</span>{" "}
                <span className="text-amber-600">{"<dit-api-token>"}</span>
              </div>
            </div>

            <div>
              <p className="text-xs font-mono text-muted-foreground mb-1.5 uppercase">Basis-URL</p>
              <div className="bg-secondary rounded-lg p-3 font-mono text-xs overflow-x-auto">
                <span className="text-blue-600">https://</span>
                <span className="text-foreground">{"{dit-subdomain}"}.plesnertech.dk</span>
                <span className="text-muted-foreground">/api/v1</span>
              </div>
            </div>

            <div>
              <p className="text-xs font-mono text-muted-foreground mb-1.5 uppercase">Eksempel — hent firmaer</p>
              <div className="bg-secondary rounded-lg p-3 font-mono text-xs overflow-x-auto whitespace-pre">
{`curl -X GET \\
  https://{tenant}.plesnertech.dk/api/v1/companies \\
  -H "Authorization: Bearer <token>" \\
  -H "Content-Type: application/json"`}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3 text-xs">
              {[
                { method: "GET",    endpoint: "/api/v1/companies",     desc: "List firmaer" },
                { method: "GET",    endpoint: "/api/v1/contacts",      desc: "List kontakter" },
                { method: "GET",    endpoint: "/api/v1/invoices",      desc: "List fakturaer" },
                { method: "GET",    endpoint: "/api/v1/projects",      desc: "List projekter" },
                { method: "POST",   endpoint: "/api/v1/companies",     desc: "Opret firma" },
                { method: "POST",   endpoint: "/api/v1/invoices",      desc: "Opret faktura" },
              ].map((r) => (
                <div key={r.endpoint} className="flex items-start gap-2 p-2.5 bg-secondary/60 rounded-lg">
                  <span className={`shrink-0 font-mono font-bold ${r.method === "GET" ? "text-blue-600" : "text-emerald-600"}`}>
                    {r.method}
                  </span>
                  <div>
                    <p className="font-mono text-muted-foreground">{r.endpoint}</p>
                    <p className="text-muted-foreground/60">{r.desc}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
