import { getLicense, updateLicense, deleteLicense } from "@/app/actions/licenses";
import { getProducts } from "@/app/actions/products";
import { AppTopbar } from "@/components/layout/AppTopbar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { notFound } from "next/navigation";
import Link from "next/link";
import {
  Key, ChevronRight, Building2, Package, CalendarDays,
  AlertTriangle, CheckCircle2, Pencil, Trash2, FileText, Download
} from "lucide-react";
import { formatDate } from "@/lib/utils";
import { BackButton } from "@/components/shared/BackButton";

function daysUntil(expiresAt: Date | null): number | null {
  if (!expiresAt) return null;
  return Math.ceil((new Date(expiresAt).getTime() - Date.now()) / 86400000);
}

const STATUS_OPTIONS = [
  { value: "active",           label: "Aktiv" },
  { value: "expired",          label: "Udløbet" },
  { value: "pending_renewal",  label: "Afventer fornyelse" },
  { value: "cancelled",        label: "Annulleret" },
];

export default async function LicenseDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const [license, products] = await Promise.all([
    getLicense(id),
    getProducts({ isActive: true }),
  ]);
  if (!license) notFound();

  const days = daysUntil(license.expiresAt);
  const isExpired = days !== null && days < 0;
  const isWarn = days !== null && days >= 0 && days <= 30;

  const expiresVal = license.expiresAt
    ? new Date(license.expiresAt).toISOString().split("T")[0]
    : "";

  async function handleDelete() {
    "use server";
    await deleteLicense(id);
  }

  return (
    <>
      <AppTopbar pageTitle={license.name} />


      <BackButton href="/licenses" label="Licenser" />
      {/* Breadcrumb */}
      <div className="flex items-center gap-2 text-sm text-muted-foreground mb-5">
        <Link href="/licenses" className="hover:text-foreground transition-colors">Licenser</Link>
        <ChevronRight className="h-3.5 w-3.5" />
        <span className="text-foreground font-medium">{license.name}</span>
      </div>

      {/* Udløbsadvarsel */}
      {isExpired && (
        <div className="mb-5 bg-destructive/10 border border-destructive/30 rounded-xl p-4 flex items-center gap-3">
          <AlertTriangle className="h-4 w-4 text-destructive shrink-0" />
          <p className="text-sm text-destructive font-medium">
            Denne licens er udløbet ({Math.abs(days!)} dage siden)
          </p>
        </div>
      )}
      {isWarn && !isExpired && (
        <div className="mb-5 bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-800 rounded-xl p-4 flex items-center gap-3">
          <AlertTriangle className="h-4 w-4 text-amber-600 shrink-0" />
          <p className="text-sm text-amber-800 dark:text-amber-300 font-medium">
            Licensen udløber om {days} dage
          </p>
        </div>
      )}

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">

        {/* VENSTRE */}
        <div className="xl:col-span-1 space-y-4">

          {/* Status-kort */}
          <div className="bg-card border border-border rounded-xl p-5">
            <div className="flex items-start justify-between mb-4">
              <div className="flex items-center gap-3">
                <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${
                  isExpired ? "bg-destructive/10" : isWarn ? "bg-amber-500/10" : "bg-primary/10"
                }`}>
                  <Key className={`h-5 w-5 ${isExpired ? "text-destructive" : isWarn ? "text-amber-600" : "text-primary"}`} />
                </div>
                <div>
                  <h2 className="font-semibold text-sm">{license.name}</h2>
                  <p className="text-xs text-muted-foreground capitalize">{license.status.replace("_", " ")}</p>
                </div>
              </div>
            </div>

            {license.licenseKey && (
              <div className="mb-4 p-3 bg-secondary rounded-lg">
                <p className="text-xs text-muted-foreground mb-1">Licens-noegel</p>
                <p className="font-mono text-xs break-all">{license.licenseKey}</p>
              </div>
            )}

            <div className="space-y-2.5 text-sm">
              <div className="flex items-center gap-2 text-muted-foreground">
                <Building2 className="h-3.5 w-3.5 shrink-0" />
                <Link href={`/kunder/${license.company.id}`} className="text-primary hover:underline">
                  {license.company.name}
                </Link>
              </div>
              {license.product && (
                <div className="flex items-center gap-2 text-muted-foreground">
                  <Package className="h-3.5 w-3.5 shrink-0" />
                  <Link href={`/products/${license.product.id}`} className="text-primary hover:underline">
                    {license.product.name}
                  </Link>
                </div>
              )}
              {license.expiresAt ? (
                <div className={`flex items-center gap-2 ${isExpired ? "text-destructive" : isWarn ? "text-amber-600" : "text-muted-foreground"}`}>
                  <CalendarDays className="h-3.5 w-3.5 shrink-0" />
                  Udløber {formatDate(license.expiresAt)}
                  {days !== null && !isExpired && <span className="text-xs">({days}d)</span>}
                </div>
              ) : (
                <div className="flex items-center gap-2 text-muted-foreground">
                  <CheckCircle2 className="h-3.5 w-3.5 shrink-0 text-emerald-500" />
                  Ingen udløbsdato
                </div>
              )}
              <div className="flex items-center gap-2 text-muted-foreground">
                <CalendarDays className="h-3.5 w-3.5 shrink-0" />
                Oprettet {formatDate(license.createdAt)}
              </div>
            </div>

            {license.notes && (
              <div className="mt-4 pt-4 border-t border-border">
                <p className="text-xs text-muted-foreground leading-relaxed">{license.notes}</p>
              </div>
            )}
          </div>

          {/* Filer */}
          {license.files.length > 0 && (
            <div className="bg-card border border-border rounded-xl p-4">
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-3 flex items-center gap-1.5">
                <FileText className="h-3.5 w-3.5" /> Vedlagte filer ({license.files.length})
              </p>
              <div className="space-y-2">
                {license.files.map((f) => (
                  <a
                    key={f.id}
                    href={f.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center justify-between p-2 rounded-lg hover:bg-secondary transition-colors group"
                  >
                    <div className="flex items-center gap-2 min-w-0">
                      <FileText className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                      <span className="text-sm truncate">{f.name}</span>
                    </div>
                    <Download className="h-3.5 w-3.5 text-muted-foreground group-hover:text-primary transition-colors shrink-0" />
                  </a>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* HOJRE */}
        <div className="xl:col-span-2">
          <div className="bg-card border border-border rounded-xl p-5">
            <h3 className="text-sm font-semibold flex items-center gap-2 mb-5">
              <Pencil className="h-4 w-4 text-muted-foreground" /> Rediger licens
            </h3>

            <form action={updateLicense} className="space-y-4">
              <input type="hidden" name="id" value={license.id} />

              <Input name="name" label="Navn" defaultValue={license.name} required />

              <div className="space-y-1.5">
                <label className="block text-sm font-medium text-foreground">Produkt</label>
                <select
                  name="productId"
                  defaultValue={license.product?.id ?? ""}
                  className="w-full px-3 py-2 rounded-lg border border-input bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                >
                  <option value="">Intet produkt tilknyttet</option>
                  {products.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name}{p.sku ? ` (${p.sku})` : ""}
                    </option>
                  ))}
                </select>
              </div>

              <Input
                name="licenseKey"
                label="Licens-noegel"
                defaultValue={license.licenseKey ?? ""}
                placeholder="XXXXX-XXXXX-XXXXX-XXXXX"
              />

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="block text-sm font-medium text-foreground">Status</label>
                  <select
                    name="status"
                    defaultValue={license.status}
                    className="w-full px-3 py-2 rounded-lg border border-input bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                  >
                    {STATUS_OPTIONS.map((o) => (
                      <option key={o.value} value={o.value}>{o.label}</option>
                    ))}
                  </select>
                </div>
                <div className="space-y-1.5">
                  <label className="block text-sm font-medium text-foreground">Notificer X dage før</label>
                  <select
                    name="notifyDaysBefore"
                    defaultValue={String(license.notifyDaysBefore)}
                    className="w-full px-3 py-2 rounded-lg border border-input bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                  >
                    <option value="7">7 dage</option>
                    <option value="14">14 dage</option>
                    <option value="30">30 dage</option>
                    <option value="60">60 dage</option>
                    <option value="90">90 dage</option>
                  </select>
                </div>
              </div>

              <Input
                name="expiresAt"
                label="Udløbsdato"
                type="date"
                defaultValue={expiresVal}
              />

              <div className="space-y-1.5">
                <label className="block text-sm font-medium text-foreground">Noter</label>
                <textarea
                  name="notes"
                  rows={3}
                  defaultValue={license.notes ?? ""}
                  className="w-full px-3 py-2 rounded-lg border border-input bg-background text-sm
                             focus:outline-none focus:ring-2 focus:ring-ring resize-none"
                />
              </div>

              <div className="flex items-center justify-between pt-2">
                <Button type="submit" size="md">Gem ændringer</Button>
                                  <Button type="submit" formAction={handleDelete}
                    variant="ghost"
                    size="sm"
                    className="text-destructive hover:text-destructive hover:bg-destructive/10"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                    Slet licens
                  </Button>
              </div>
            </form>
          </div>
        </div>
      </div>
    </>
  );
}
