/**
 * CSV-helper — bygger CSV-strenge med korrekt escaping.
 * Bruger BOM + UTF-8 saa Excel aabner med korrekte tegn (æ, ø, å).
 */

export function escapeCsv(value: any): string {
  if (value === null || value === undefined) return "";
  const s = String(value);
  // Hvis indeholder komma, citation, nylinje → wrap i quotes og escape quotes
  if (/[",\n\r]/.test(s)) {
    return `"${s.replace(/"/g, '""')}"`;
  }
  return s;
}

export function toCsv(headers: string[], rows: any[][]): string {
  const lines = [
    headers.map(escapeCsv).join(","),
    ...rows.map((r) => r.map(escapeCsv).join(",")),
  ];
  // UTF-8 BOM saa Excel aabner med rette tegn
  return "﻿" + lines.join("\r\n");
}
