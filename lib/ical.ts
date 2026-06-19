/**
 * lib/ical.ts — RFC 5545 iCalendar generator.
 *
 * Ren funktion: events[] → VCALENDAR string. Korrekt escaping af kommaer,
 * semikolon, backslash + line-folding ved 75 char (CRLF + space).
 *
 * Bruges af /api/calendar/[token].ics. iCal-klienter (Google, Outlook,
 * Apple Calendar) pollen URLen ca. hver 1-24 timer.
 *
 * Hvert event har en stabil UID saa klient kan deduplikere mellem polls.
 */

export interface ICalEvent {
  uid: string;             // Stabil ID. Format: "<type>-<id>@crm-x"
  start: Date;             // UTC. Hvis isAllDay=true bruges kun dato
  end?: Date;              // Default = start + 1 time
  isAllDay?: boolean;
  summary: string;         // Kort titel — "F-1234 forfalder" / "Levér til ACME"
  description?: string;    // Detaljer — bløde linjeskift via \n
  location?: string;       // Kunde-navn etc.
  url?: string;            // Direkte link tilbage i CRM-X
  // Klassificering — "BUSY" eller "FREE". Default BUSY.
  busy?: boolean;
}

/** Escape en string til iCal text-felt (RFC 5545 §3.3.11). */
function escapeText(s: string): string {
  return s
    .replace(/\\/g, "\\\\")
    .replace(/;/g, "\\;")
    .replace(/,/g, "\\,")
    .replace(/\r?\n/g, "\\n");
}

/** Format en Date til UTC iCal-stempel: YYYYMMDDTHHMMSSZ */
function toUtcStamp(d: Date): string {
  const pad = (n: number) => String(n).padStart(2, "0");
  return (
    d.getUTCFullYear().toString() +
    pad(d.getUTCMonth() + 1) +
    pad(d.getUTCDate()) +
    "T" +
    pad(d.getUTCHours()) +
    pad(d.getUTCMinutes()) +
    pad(d.getUTCSeconds()) +
    "Z"
  );
}

/** Format en Date til all-day VALUE=DATE: YYYYMMDD */
function toDateStamp(d: Date): string {
  const pad = (n: number) => String(n).padStart(2, "0");
  return (
    d.getUTCFullYear().toString() +
    pad(d.getUTCMonth() + 1) +
    pad(d.getUTCDate())
  );
}

/**
 * Linje-folding: hver linje skal vaere max 75 oktetter.
 * Vi splitter ved 73 chars og praefixerer fortsattelses-linje med " ".
 * RFC 5545 §3.1: CRLF som separator.
 */
function fold(line: string): string {
  const limit = 73;
  if (line.length <= limit) return line;
  const parts: string[] = [];
  let i = 0;
  while (i < line.length) {
    if (i === 0) {
      parts.push(line.slice(i, i + limit));
      i += limit;
    } else {
      parts.push(" " + line.slice(i, i + limit - 1));
      i += limit - 1;
    }
  }
  return parts.join("\r\n");
}

/** Tilfoej en property-linje med folding. */
function prop(key: string, value: string): string {
  return fold(`${key}:${value}`);
}

/** Konverter ét event til VEVENT-blok. */
function eventToBlock(ev: ICalEvent, now: Date): string[] {
  const lines: string[] = [];
  lines.push("BEGIN:VEVENT");
  lines.push(prop("UID", ev.uid));
  lines.push(prop("DTSTAMP", toUtcStamp(now)));

  if (ev.isAllDay) {
    lines.push(fold(`DTSTART;VALUE=DATE:${toDateStamp(ev.start)}`));
    // All-day end er typisk +1 dag (exclusive). Hvis end ikke angivet, bruger vi start.
    const end = ev.end ?? new Date(ev.start.getTime() + 24 * 60 * 60 * 1000);
    lines.push(fold(`DTEND;VALUE=DATE:${toDateStamp(end)}`));
  } else {
    lines.push(prop("DTSTART", toUtcStamp(ev.start)));
    const end = ev.end ?? new Date(ev.start.getTime() + 60 * 60 * 1000);
    lines.push(prop("DTEND", toUtcStamp(end)));
  }

  lines.push(prop("SUMMARY", escapeText(ev.summary)));
  if (ev.description) lines.push(prop("DESCRIPTION", escapeText(ev.description)));
  if (ev.location)    lines.push(prop("LOCATION", escapeText(ev.location)));
  if (ev.url)         lines.push(prop("URL", ev.url));
  lines.push(prop("TRANSP", ev.busy === false ? "TRANSPARENT" : "OPAQUE"));
  lines.push("END:VEVENT");
  return lines;
}

/** Konverter en liste af events til komplet VCALENDAR-string. */
export function generateICal(args: {
  events: ICalEvent[];
  calendarName: string;     // X-WR-CALNAME — vises som kalendernavnet i klienten
  calendarDescription?: string;
  /** Standard refresh interval (klient hint). PT1H = hver time. */
  refreshHours?: number;
}): string {
  const now = new Date();
  const refresh = `PT${args.refreshHours ?? 1}H`;

  const lines: string[] = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//CRM-X//Calendar Feed//DA",
    "CALSCALE:GREGORIAN",
    "METHOD:PUBLISH",
    fold(`X-WR-CALNAME:${escapeText(args.calendarName)}`),
    args.calendarDescription
      ? fold(`X-WR-CALDESC:${escapeText(args.calendarDescription)}`)
      : "X-WR-CALDESC:CRM-X events",
    `X-PUBLISHED-TTL:${refresh}`,
    `REFRESH-INTERVAL;VALUE=DURATION:${refresh}`,
  ];

  for (const ev of args.events) {
    lines.push(...eventToBlock(ev, now));
  }

  lines.push("END:VCALENDAR");
  // RFC 5545 kraever CRLF som linje-separator
  return lines.join("\r\n") + "\r\n";
}
