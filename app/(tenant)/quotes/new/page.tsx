import { AppTopbar } from "@/components/layout/AppTopbar";
import { BackButton } from "@/components/shared/BackButton";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { getCompanies } from "@/app/actions/companies";
import { createQuote } from "@/app/actions/quotes";
import { FileSignature } from "lucide-react";

export default async function NewQuotePage() {
  const companies = await getCompanies();

  return (
    <>
      <AppTopbar pageTitle="Nyt tilbud" />
      <BackButton href="/quotes" />

      <div className="max-w-2xl">
        <header className="mb-6 flex items-center gap-3">
          <div className="h-10 w-10 rounded-xl bg-violet-500/10 flex items-center justify-center">
            <FileSignature className="h-5 w-5 text-violet-600" />
          </div>
          <div>
            <h1 className="text-xl font-semibold">Nyt tilbud</h1>
            <p className="text-sm text-muted-foreground">
              Opret et tomt tilbud — tilføj linjer på næste side.
            </p>
          </div>
        </header>

        <form action={createQuote} className="bg-card border border-border rounded-xl p-6 space-y-5">
          <div>
            <label className="block text-sm font-medium mb-1.5">Kunde</label>
            <select
              name="companyId"
              required
              className="w-full h-10 px-3 rounded-lg border border-border bg-background text-sm"
              defaultValue=""
            >
              <option value="" disabled>Vælg kunde …</option>
              {companies.map((c: any) => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium mb-1.5">Emne (valgfrit)</label>
            <Input name="title" placeholder="fx. Implementering af CRM modul Q3" />
            <p className="text-xs text-muted-foreground mt-1">
              Vises på tilbuddet og i listen — gør det nemmere at finde igen.
            </p>
          </div>

          <div>
            <label className="block text-sm font-medium mb-1.5">Gyldig i (dage)</label>
            <Input
              name="validDays"
              type="number"
              min="1"
              max="365"
              defaultValue="30"
              className="w-32"
            />
            <p className="text-xs text-muted-foreground mt-1">
              Standardgyldighed er 30 dage fra i dag.
            </p>
          </div>

          <div className="flex items-center justify-end gap-2 pt-2 border-t border-border">
            <Button type="submit">Opret tilbud</Button>
          </div>
        </form>
      </div>
    </>
  );
}
