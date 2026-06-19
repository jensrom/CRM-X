/**
 * lib/sales-periods.ts — periode-helpers til salgs-maal.
 *
 * Ren funktion. Levee til client + server begge.
 */

export type PeriodType = "month" | "quarter" | "year";

/** Returnerer foerste/sidste dag i den periode der indeholder `now`. */
export function periodBounds(
  type: PeriodType,
  now: Date = new Date(),
): { start: Date; end: Date; label: string } {
  const y = now.getFullYear();
  const m = now.getMonth();
  if (type === "month") {
    const start = new Date(Date.UTC(y, m, 1));
    const end = new Date(Date.UTC(y, m + 1, 0));
    const label = start.toLocaleDateString("da-DK", {
      month: "long",
      year: "numeric",
    });
    return { start, end, label };
  }
  if (type === "quarter") {
    const qStart = Math.floor(m / 3) * 3;
    const start = new Date(Date.UTC(y, qStart, 1));
    const end = new Date(Date.UTC(y, qStart + 3, 0));
    const qNum = Math.floor(qStart / 3) + 1;
    return { start, end, label: `Q${qNum} ${y}` };
  }
  // year
  const start = new Date(Date.UTC(y, 0, 1));
  const end = new Date(Date.UTC(y, 11, 31));
  return { start, end, label: `${y}` };
}
