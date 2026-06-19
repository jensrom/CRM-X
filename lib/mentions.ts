/**
 * lib/mentions.ts — parsing af @-mentions i komment-body.
 *
 * Format: `@[Navn](userId)` — picker'en indsætter dette markup,
 * og parser finder alle saadanne tags og returnerer userId-array.
 *
 * Render-funktionen splitter samme markup tilbage i text-segmenter +
 * mention-segmenter saa UI kan vise dem som chips.
 */

const MENTION_RE = /@\[([^\]]+)\]\(([a-zA-Z0-9_-]+)\)/g;

export interface ParsedMention {
  name: string;
  userId: string;
}

/** Returnerer unike userIds fra body. */
export function extractMentionedUserIds(body: string): string[] {
  const ids = new Set<string>();
  let m: RegExpExecArray | null;
  // Reset lastIndex for global regex
  MENTION_RE.lastIndex = 0;
  while ((m = MENTION_RE.exec(body)) !== null) {
    ids.add(m[2]);
  }
  return Array.from(ids);
}

/** Splitter body i alternerende text- og mention-segmenter — bruges af render. */
export type Segment =
  | { type: "text"; value: string }
  | { type: "mention"; name: string; userId: string };

export function splitBody(body: string): Segment[] {
  const segments: Segment[] = [];
  let cursor = 0;
  MENTION_RE.lastIndex = 0;
  let m: RegExpExecArray | null;
  while ((m = MENTION_RE.exec(body)) !== null) {
    if (m.index > cursor) {
      segments.push({ type: "text", value: body.slice(cursor, m.index) });
    }
    segments.push({ type: "mention", name: m[1], userId: m[2] });
    cursor = m.index + m[0].length;
  }
  if (cursor < body.length) {
    segments.push({ type: "text", value: body.slice(cursor) });
  }
  return segments;
}

/** Renderer body som "plain text" til notifikationer (uden markup). */
export function bodyToPlain(body: string): string {
  return body.replace(MENTION_RE, (_full, name) => `@${name}`);
}
