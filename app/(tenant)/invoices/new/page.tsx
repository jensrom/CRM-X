import { AppTopbar } from "@/components/layout/AppTopbar";
import { PageHeader } from "@/components/shared/PageHeader";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { createInvoice } from "@/app/actions/invoices";
import { getCompanies } from "@/app/actions/companies";
import { getProjects } from "@/app/actions/projects";
import { ArrowLeft } from "lucide-react";
import Link from "next/link";

export default async function NewInvoicePage() {
  const [companies, projects] = await Promise.all([
    getCompanies(),
    getProjects({}),
  ]);

  const today = new Date();
  const due30 = new Date(today.getTime() + 30 * 86400000).toISOString().split("T")[0];

  return (
    <>
      <AppTopbar pageTitle="Ny faktura" />

      <div className="max-w-2xl">
        <PageHeader
          title="Ny faktura"
          actions={
            <Link href="/invoices">
              <Button variant="ghost" size="sm">
                <ArrowLeft className="h-4 w-4" />Tilbage
              </Button>
            </Link>
          }
        />

        <form action={createInvoice} className="space-y-5">
          <div className="bg-card border border-border rounded-xl p-5 space-y-4">
            <h3 className="text-sm font-semibold">Fakturadetaljer</h3>

            <div className="space-y-1.5">
              <label className="block text-sm font-medium text-foreground">
                Firma <span className="text-destructive">*</span>
              </label>
              <select
                name="companyId"
                required
                className="w-full px-3 py-2 rounded-lg border border-input bg-background text-sm
                           focus:outline-none focus:ring-2 focus:ring-ring"
              >
                <option value="">— Vælg firma —</option>
                {companies.map((c) => (
                  <option key={c.id} value={c.id}>{c.name}</option>
                ))}
              </select>
            </div>

            <div className="space-y-1.5">
              <label className="block text-sm font-medium text-foreground">
                Tilknyt projekt <span className="text-muted-foreground text-xs">(valgfrit)</span>
              </label>
              <select
                name="projectId"
                className="w-full px-3 py-2 rounded-lg border border-input bg-background text-sm
                           focus:outline-none focus:ring-2 focus:ring-ring"
              >
                <option value="">— Ingen —</option>
                {projects.map((p) => (
                  <option key={p.id} value={p.id}>{p.title}</option>
                ))}
              </select>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label className="block text-sm font-medium text-foreground">Kundetype</label>
                <select
                  name="customerType"
                  defaultValue="B2B"
                  className="w-full px-3 py-2 rounded-lg border border-input bg-background text-sm
                             focus:outline-none focus:ring-2 focus:ring-ring"
                >
                  <option value="B2B">B2B (erhverv) — kræver CVR</option>
                  <option value="B2C">B2C (privatperson)</option>
                </select>
              </div>
              <Input
                name="dueDate"
                label="Betalingsfrist"
                type="date"
                defaultValue={due30}
              />
            </div>

            <label className="flex items-center gap-2 text-sm cursor-pointer pt-1">
              <input
                type="checkbox"
                name="vatEnabled"
                value="true"
                defaultChecked
                className="rounded border-input h-4 w-4"
              />
              Tilføj dansk moms (25%)
            </label>

            <div className="space-y-1.5">
              <label className="block text-sm font-medium text-foreground">Noter</label>
              <textarea
                name="notes"
                rows={3}
                placeholder="Interne noter eller besked til kunden..."
                className="w-full px-3 py-2 rounded-lg border border-input bg-background text-sm
                           placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring resize-none"
              />
            </div>
          </div>

          <p className="text-xs text-muted-foreground px-1">
            Fakturaen oprettes som kladde. Du tilføjer linjer på næste side.
          </p>

          <div className="flex items-center gap-3 pt-2">
            <Button type="submit" size="lg">Opret faktura</Button>
            <Link href="/invoices">
              <Button type="button" variant="ghost" size="lg">Annuller</Button>
            </Link>
          </div>
        </form>
      </div>
    </>
  );
}
