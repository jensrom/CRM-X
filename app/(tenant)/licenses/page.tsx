import { getLicenses } from "@/app/actions/licenses";
import { AppTopbar } from "@/components/layout/AppTopbar";
import { PageHeader } from "@/components/shared/PageHeader";
import { EmptyState } from "@/components/shared/EmptyState";
import { Button } from "@/components/ui/button";
import { Key, Plus, Building2, Package, CalendarDays, AlertTriangle, CheckCircle2, Clock, XCircle } from "lucide-react";
import Link from "next/link";
import { formatDate } from "@/lib/utils";

function daysUntil(expiresAt: Date | null): number | null {
  if (!expiresAt) return null;
  return Math.ceil((new Date(expiresAt).getTime() - Date.now()) / 86400000);
}

function ExpiryBadge({ expiresAt, status }: { expiresAt: Date | null; status: string }) {
  if (status === "cancelled") {
    return <span className="text-xs px-2 py-0.5 rounded-full bg-secondary text-muted-foreground">Annulleret</span>;
  }
  if (!expiresAt) {
    return <span className="text-xs px-2 py-0.5 rounded-full bg-secondary text-muted-foreground">Ingen udløb</span>;
  }
  const days = daysUntil(expiresAt);
  if (days === null) return null;
  if (days < 0) {
    return <span className="text-xs px-2 py-0.5 rounded-full bg-destructive/15 text-destructive font-medium">Udløbet</span>;
  }
  if (days <= 30) {
    return <span className="text-xs px-2 py-0.5 rounded-full bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400 font-medium">{days}d tilbage</span>;
  }
  return <span className="text-xs px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400">{formatDate(expiresAt)}</span>;
}

export default async function LicensesPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string }>;
}) {
  const sp = await searchParams;
  const filterStatus = sp.status;
  const licenses = await getLicenses({ status: filterStatus });

  const active = licenses.filter((l) => l.status === "active");
  const expiringSoon = active.filter((l) => {
    const d = daysUntil(l.expiresAt);
    return d !== null && d >= 0 && d <= 30;
  });
  const expired = licenses.filter((l) => {
    if (l.status === "expired") return true;
    const d = daysUntil(l.expiresAt);
    return d !== null && d < 0;
  });
  const other = licenses.filter(
    (l) => l.status === "pending_renewal" || l.status === "cancelled"
  );

  const STATUS_TABS = [
    { key: undefined, label: "Alle", count: licenses.length },
    { key: "active", label: "Aktive", count: active.length },
  ];

  return (
    <>
      <AppTopbar pageTitle="Licenser" />

      <PageHeader
        title="Licenser"
        description={`${active.length} aktive licenser${expiringSoon.length > 0 ? ` — ${expiringSoon.length} udløber snart` : ""}`}
        actions={
          <a href="/licenses/new">
            <Button size="md">
              <Plus className="h-4 w-4" />
              Ny licens
            </Button>
          </a>
        }
      />

      {/* Varsel om udløbende licenser */}
      {expiringSoon.length > 0 && (
        <div className="mb-5 bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-800 rounded-xl p-4 flex items-start gap-3">
          <AlertTriangle className="h-4 w-4 text-amber-600 shrink-0 mt-0.5" />
          <div>
            <p className="text-sm font-medium text-amber-800 dark:text-amber-300">
              {expiringSoon.length} licens{expiringSoon.length > 1 ? "er" : ""} udløber inden for 30 dage
            </p>
            <p className="text-xs text-amber-700 dark:text-amber-400 mt-0.5">
              {expiringSoon.map((l) => l.name).join(", ")}
            </p>
          </div>
        </div>
      )}

      {licenses.length === 0 ? (
        <EmptyState
          icon={Key}
          title="Ingen licenser"
          description="Tilføj din første licens for at holde styr på udløb og nøgles."
          action={
            <a href="/licenses/new">
              <Button size="sm"><Plus className="h-3.5 w-3.5" />Ny licens</Button>
            </a>
          }
        />
      ) : (
        <div className="space-y-6">
          {/* Udløbne */}
          {expired.length > 0 && (
            <Section title={`Udløbet / Kræver fornyelse (${expired.length})`} muted>
              <Grid>
                {expired.map((l) => <LicenseCard key={l.id} license={l} />)}
              </Grid>
            </Section>
          )}

          {/* Aktive (udløber snart — vis først) */}
          {expiringSoon.length > 0 && (
            <Section title={`Udløber snart (${expiringSoon.length})`}>
              <Grid>
                {expiringSoon.map((l) => <LicenseCard key={l.id} license={l} />)}
              </Grid>
            </Section>
          )}

          {/* Resten aktive */}
          {(() => {
            const rest = active.filter((l) => !expiringSoon.includes(l));
            if (rest.length === 0) return null;
            return (
              <Section title={expiringSoon.length > 0 || expired.length > 0 ? `Aktive (${rest.length})` : undefined}>
                <Grid>
                  {rest.map((l) => <LicenseCard key={l.id} license={l} />)}
                </Grid>
              </Section>
            );
          })()}

          {/* Andre statuser */}
          {other.length > 0 && (
            <Section title={`Andre (${other.length})`} muted>
              <Grid>
                {other.map((l) => <LicenseCard key={l.id} license={l} />)}
              </Grid>
            </Section>
          )}
        </div>
      )}
    </>
  );
}

function Section({ title, children, muted }: { title?: string; children: React.ReactNode; muted?: boolean }) {
  return (
    <div>
      {title && (
        <h2 className={`text-xs font-semibold uppercase tracking-wide mb-3 ${muted ? "text-muted-foreground/60" : "text-muted-foreground"}`}>
          {title}
        </h2>
      )}
      {children}
    </div>
  );
}

function Grid({ children }: { children: React.ReactNode }) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
      {children}
    </div>
  );
}

type LicenseRow = Awaited<ReturnType<typeof getLicenses>>[0];

function LicenseCard({ license: l }: { license: LicenseRow }) {
  const days = daysUntil(l.expiresAt);
  const isExpired = days !== null && days < 0;
  const isWarn = days !== null && days >= 0 && days <= 30;

  return (
    <Link
      href={`/licenses/${l.id}`}
      className={`bg-card border rounded-xl p-5 hover:shadow-sm transition-all group block ${
        isExpired
          ? "border-destructive/30 hover:border-destructive/50"
          : isWarn
          ? "border-amber-300/50 hover:border-amber-400"
          : "border-border hover:border-primary/40"
      }`}
    >
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-center gap-2.5">
          <div className={`w-9 h-9 rounded-lg flex items-center justify-center shrink-0 ${
            isExpired ? "bg-destructive/10" : isWarn ? "bg-amber-500/10" : "bg-primary/10"
          }`}>
            <Key className={`h-4 w-4 ${isExpired ? "text-destructive" : isWarn ? "text-amber-600" : "text-primary"}`} />
          </div>
          <div className="min-w-0">
            <p className="text-sm font-semibold group-hover:text-primary transition-colors truncate">
              {l.name}
            </p>
            {l.licenseKey && (
              <p className="text-xs text-muted-foreground font-mono truncate">
                {l.licenseKey.length > 20 ? l.licenseKey.slice(0, 20) + "..." : l.licenseKey}
              </p>
            )}
          </div>
        </div>
        <ExpiryBadge expiresAt={l.expiresAt} status={l.status} />
      </div>

      <div className="space-y-1.5 text-xs text-muted-foreground">
        <div className="flex items-center gap-1.5">
          <Building2 className="h-3 w-3 shrink-0" />
          {l.company.name}
        </div>
        {l.product && (
          <div className="flex items-center gap-1.5">
            <Package className="h-3 w-3 shrink-0" />
            {l.product.name}
          </div>
        )}
        {l.expiresAt && (
          <div className="flex items-center gap-1.5">
            <CalendarDays className="h-3 w-3 shrink-0" />
            Udløber {formatDate(l.expiresAt)}
          </div>
        )}
      </div>

      {l.files.length > 0 && (
        <div className="mt-3 pt-3 border-t border-border text-xs text-muted-foreground">
          {l.files.length} fil{l.files.length > 1 ? "er" : ""} vedlagt
        </div>
      )}
    </Link>
  );
}
