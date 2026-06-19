"use client";

import { useState, useTransition } from "react";
import { Plus, Trash2, Zap } from "lucide-react";
import { createRecurringInvoice } from "@/app/actions/recurring-invoices";

interface Line {
  description: string;
  quantity: number;
  unitPrice: number;
}

interface Props {
  companies: { id: string; name: string }[];
}

export function CreateRecurringForm({ companies }: Props) {
  const [isOpen, setIsOpen] = useState(false);
  const [lines, setLines] = useState<Line[]>([
    { description: "", quantity: 1, unitPrice: 0 },
  ]);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const updateLine = (idx: number, field: keyof Line, value: string | number) => {
    setLines((prev) => prev.map((l, i) => (i === idx ? { ...l, [field]: value } : l)));
  };

  const addLine = () =>
    setLines((prev) => [...prev, { description: "", quantity: 1, unitPrice: 0 }]);
  const removeLine = (idx: number) =>
    setLines((prev) => prev.filter((_, i) => i !== idx));

  const handleSubmit = (formData: FormData) => {
    setError(null);
    const validLines = lines.filter((l) => l.description.trim() && l.unitPrice > 0);
    if (validLines.length === 0) {
      setError("Tilføj mindst én linje med pris > 0");
      return;
    }
    formData.set("lineTemplate", JSON.stringify(
      validLines.map((l) => ({
        description: l.description,
        quantity: Number(l.quantity),
        unitPrice: Number(l.unitPrice),
        type: "manual",
      })),
    ));

    startTransition(async () => {
      try {
        await createRecurringInvoice(formData);
        setIsOpen(false);
        setLines([{ description: "", quantity: 1, unitPrice: 0 }]);
      } catch (e: any) {
        setError(e?.message ?? "Kunne ikke oprette");
      }
    });
  };

  const subtotal = lines.reduce(
    (s, l) => s + Number(l.quantity || 0) * Number(l.unitPrice || 0),
    0,
  );
  const total = subtotal * 1.25;

  if (!isOpen) {
    return (
      <button
        type="button"
        onClick={() => setIsOpen(true)}
        className="mb-5 w-full md:w-auto px-4 py-2 bg-primary text-primary-foreground rounded-lg text-sm font-medium hover:bg-primary/90 inline-flex items-center gap-2"
      >
        <Plus className="h-4 w-4" />
        Opret fast faktura
      </button>
    );
  }

  return (
    <div className="bg-card border border-border rounded-xl p-5 mb-6">
      <h2 className="text-sm font-semibold mb-4">Ny fast faktura</h2>
      <form action={handleSubmit} className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <div>
            <label className="text-xs font-medium text-muted-foreground mb-1 block">Kunde</label>
            <select
              name="companyId"
              required
              className="w-full px-2 py-1.5 border border-border rounded-md bg-card text-sm"
            >
              <option value="">— Vælg kunde —</option>
              {companies.map((c) => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="text-xs font-medium text-muted-foreground mb-1 block">Navn (intern)</label>
            <input
              type="text"
              name="name"
              required
              placeholder="fx ACME — månedlig SaaS"
              className="w-full px-2 py-1.5 border border-border rounded-md bg-card text-sm"
            />
          </div>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <div>
            <label className="text-xs font-medium text-muted-foreground mb-1 block">Interval</label>
            <select
              name="intervalType"
              defaultValue="monthly"
              className="w-full px-2 py-1.5 border border-border rounded-md bg-card text-sm"
            >
              <option value="monthly">Månedligt</option>
              <option value="quarterly">Kvartalsvis</option>
              <option value="yearly">Årligt</option>
            </select>
          </div>
          <div>
            <label className="text-xs font-medium text-muted-foreground mb-1 block">Første kørsel</label>
            <input
              type="date"
              name="startDate"
              required
              defaultValue={new Date().toISOString().slice(0, 10)}
              className="w-full px-2 py-1.5 border border-border rounded-md bg-card text-sm"
            />
          </div>
          <div>
            <label className="text-xs font-medium text-muted-foreground mb-1 block">Faktura-dag</label>
            <input
              type="number"
              name="dayOfMonth"
              min="1"
              max="28"
              defaultValue="1"
              className="w-full px-2 py-1.5 border border-border rounded-md bg-card text-sm"
            />
          </div>
          <div>
            <label className="text-xs font-medium text-muted-foreground mb-1 block">Forfald (dage)</label>
            <input
              type="number"
              name="dueDays"
              min="0"
              defaultValue="14"
              className="w-full px-2 py-1.5 border border-border rounded-md bg-card text-sm"
            />
          </div>
        </div>

        {/* Linjer */}
        <div>
          <label className="text-xs font-medium text-muted-foreground mb-2 block">Linjer</label>
          <div className="space-y-2">
            {lines.map((line, idx) => (
              <div key={idx} className="grid grid-cols-12 gap-2 items-center">
                <input
                  type="text"
                  placeholder="Beskrivelse"
                  value={line.description}
                  onChange={(e) => updateLine(idx, "description", e.target.value)}
                  className="col-span-6 px-2 py-1.5 border border-border rounded-md bg-card text-sm"
                />
                <input
                  type="number"
                  step="0.5"
                  min="0"
                  placeholder="Antal"
                  value={line.quantity}
                  onChange={(e) => updateLine(idx, "quantity", Number(e.target.value))}
                  className="col-span-2 px-2 py-1.5 border border-border rounded-md bg-card text-sm tabular-nums"
                />
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  placeholder="kr/stk"
                  value={line.unitPrice}
                  onChange={(e) => updateLine(idx, "unitPrice", Number(e.target.value))}
                  className="col-span-3 px-2 py-1.5 border border-border rounded-md bg-card text-sm tabular-nums"
                />
                <button
                  type="button"
                  onClick={() => removeLine(idx)}
                  disabled={lines.length === 1}
                  className="col-span-1 h-8 rounded-md hover:bg-destructive/10 flex items-center justify-center text-muted-foreground hover:text-destructive disabled:opacity-30"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            ))}
          </div>
          <button
            type="button"
            onClick={addLine}
            className="mt-2 text-xs text-primary hover:underline inline-flex items-center gap-1"
          >
            <Plus className="h-3 w-3" />
            Tilføj linje
          </button>
        </div>

        {/* Total preview */}
        <div className="flex justify-end text-sm">
          <div className="text-right">
            <p className="text-muted-foreground">Subtotal: <span className="tabular-nums font-medium text-foreground">{subtotal.toFixed(2)} kr</span></p>
            <p className="font-semibold">Total inkl. moms: <span className="tabular-nums">{total.toFixed(2)} kr</span></p>
          </div>
        </div>

        {error && (
          <div className="text-xs text-destructive bg-destructive/10 border border-destructive/30 rounded-md px-3 py-2">
            {error}
          </div>
        )}

        <div className="flex justify-end gap-2 pt-2 border-t border-border">
          <button
            type="button"
            onClick={() => setIsOpen(false)}
            className="px-3 py-1.5 text-sm hover:bg-secondary rounded-md"
          >
            Annullér
          </button>
          <button
            type="submit"
            disabled={isPending}
            className="px-4 py-1.5 bg-primary text-primary-foreground rounded-md text-sm font-medium hover:bg-primary/90 disabled:opacity-50 inline-flex items-center gap-2"
          >
            <Zap className="h-3.5 w-3.5" />
            {isPending ? "Opretter..." : "Opret fast faktura"}
          </button>
        </div>
      </form>
    </div>
  );
}
