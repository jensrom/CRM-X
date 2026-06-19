"use client";

/**
 * MentionTextarea — wrapped textarea med @ type-ahead picker.
 *
 * Naar bruger skriver "@" startes en søgning. Op/ned-piler navigerer i
 * forslags-dropdown'en. Enter eller Tab indsætter `@[Navn](userId)` ved
 * cursor og lukker picker.
 *
 * Brug:
 *   <MentionTextarea name="body" value={x} onChange={setX} ... />
 */

import {
  useEffect,
  useRef,
  useState,
  type ChangeEvent,
  type KeyboardEvent,
} from "react";
import { searchUsersForMention } from "@/app/actions/mentions";

interface UserItem {
  id: string;
  name: string;
  email: string;
}

interface Props {
  name?: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  rows?: number;
  maxLength?: number;
  className?: string;
}

export function MentionTextarea({
  name,
  value,
  onChange,
  placeholder,
  rows = 3,
  maxLength = 5000,
  className = "",
}: Props) {
  const taRef = useRef<HTMLTextAreaElement>(null);
  const [mentionStart, setMentionStart] = useState<number | null>(null);
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<UserItem[]>([]);
  const [selectedIdx, setSelectedIdx] = useState(0);
  const [debounceTimer, setDebounceTimer] = useState<NodeJS.Timeout | null>(null);

  // Sluk picker hvis cursor flytter væk eller man trykker uden for
  useEffect(() => {
    return () => {
      if (debounceTimer) clearTimeout(debounceTimer);
    };
  }, [debounceTimer]);

  /** Søger users — debounce 150ms. */
  const triggerSearch = (q: string) => {
    if (debounceTimer) clearTimeout(debounceTimer);
    const t = setTimeout(async () => {
      const rows = await searchUsersForMention(q);
      setResults(rows);
      setSelectedIdx(0);
    }, 150);
    setDebounceTimer(t);
  };

  const handleChange = (e: ChangeEvent<HTMLTextAreaElement>) => {
    const v = e.target.value;
    onChange(v);

    const cursorPos = e.target.selectionStart;
    // Find sidste "@" før cursoren, hvor der ikke er space eller anden @ imellem
    const before = v.slice(0, cursorPos);
    const atIdx = before.lastIndexOf("@");
    if (atIdx === -1) {
      setMentionStart(null);
      setResults([]);
      return;
    }
    const after = before.slice(atIdx + 1);
    // Stop hvis der er space, newline eller @-tag-syntax inkluderet
    if (/[\s\n]/.test(after) || after.includes("[")) {
      setMentionStart(null);
      setResults([]);
      return;
    }
    // I gang med at skrive @query
    setMentionStart(atIdx);
    setQuery(after);
    triggerSearch(after);
  };

  const insertMention = (user: UserItem) => {
    if (mentionStart === null || !taRef.current) return;
    const ta = taRef.current;
    const before = value.slice(0, mentionStart);
    const after = value.slice(ta.selectionStart);
    const tag = `@[${user.name}](${user.id}) `;
    const next = before + tag + after;
    onChange(next);
    setMentionStart(null);
    setResults([]);
    // Sæt cursor efter den indsatte tag
    setTimeout(() => {
      const newPos = before.length + tag.length;
      ta.focus();
      ta.setSelectionRange(newPos, newPos);
    }, 0);
  };

  const handleKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (results.length === 0 || mentionStart === null) return;
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setSelectedIdx((i) => Math.min(i + 1, results.length - 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setSelectedIdx((i) => Math.max(i - 1, 0));
    } else if (e.key === "Enter" || e.key === "Tab") {
      e.preventDefault();
      insertMention(results[selectedIdx]);
    } else if (e.key === "Escape") {
      setMentionStart(null);
      setResults([]);
    }
  };

  return (
    <div className="relative">
      <textarea
        ref={taRef}
        name={name}
        value={value}
        onChange={handleChange}
        onKeyDown={handleKeyDown}
        rows={rows}
        placeholder={placeholder}
        maxLength={maxLength}
        className={className || "w-full px-3 py-2 border border-border rounded-lg bg-card text-sm resize-y focus:outline-none focus:ring-2 focus:ring-ring"}
      />

      {/* Dropdown */}
      {mentionStart !== null && results.length > 0 && (
        <div className="absolute z-20 mt-1 left-0 right-0 max-w-sm bg-card border border-border rounded-lg shadow-lg overflow-hidden">
          {results.map((u, idx) => (
            <button
              key={u.id}
              type="button"
              onMouseDown={(e) => {
                // mouseDown (ikke click) saa textarea ikke mister focus foer insertion
                e.preventDefault();
                insertMention(u);
              }}
              onMouseEnter={() => setSelectedIdx(idx)}
              className={`w-full text-left px-3 py-2 text-sm flex items-center justify-between gap-2 ${
                idx === selectedIdx ? "bg-primary/10 text-primary" : "hover:bg-secondary/40"
              }`}
            >
              <div className="flex items-center gap-2 min-w-0">
                <div className="h-6 w-6 rounded-full bg-primary/10 text-primary flex items-center justify-center text-[10px] font-semibold shrink-0">
                  {u.name.split(" ").slice(0, 2).map((p) => p[0]?.toUpperCase()).join("")}
                </div>
                <div className="min-w-0">
                  <p className="font-medium truncate">{u.name}</p>
                  <p className="text-xs text-muted-foreground truncate">{u.email}</p>
                </div>
              </div>
            </button>
          ))}
          <div className="px-3 py-1.5 text-[10px] text-muted-foreground bg-secondary/30 border-t border-border">
            ↑↓ vælg · Enter/Tab indsæt · Esc luk
          </div>
        </div>
      )}
    </div>
  );
}
