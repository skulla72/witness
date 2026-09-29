// The gratitude journal: a private daily ritual, opt-in and reversible.
// Entries stay on the device (design-first) and are never part of the public
// wall unless someone deliberately posts them. Shame-free by design: nothing is
// required beyond one line, tracking is optional, and a missed day costs
// nothing — the app never counts what you didn't write.

import { dailyPrompts } from "@/data/seed";

/** The morning half of the ritual, plus an optional evening close. */
export interface JournalEntry {
  id: string;
  /** YYYY-MM-DD, local day. One entry per day is the ritual. */
  day: string;
  /** Three things you're grateful for. Blanks are fine. */
  grateful: string[];
  /** Three things that would make today great. */
  great: string[];
  /** One affirmation, in your own words. */
  affirmation: string;
  /** Evening: something amazing that happened. */
  amazing: string;
  /** Evening: one gentle way today could have been better. Never scored. */
  better: string;
  /** The open-ended prompt of the day, if answered. */
  reflection: string;
  prompt: string;
  created_at: string;
  updated_at: string;
}

export interface JournalState {
  /** The ritual is off until someone turns it on. */
  enabled: boolean;
  /** Where in the day the app should ask. */
  remindAt: "morning" | "evening";
  /** Streaks and the week strip. Off by default so nothing feels like a score. */
  tracking: boolean;
  entries: JournalEntry[];
}

export const DEFAULT_JOURNAL: JournalState = {
  enabled: false,
  remindAt: "morning",
  tracking: false,
  entries: [],
};

/** Gentle starters, shown as placeholders — never required. */
export const affirmationSeeds = [
  "I am held, even today.",
  "I don't have to earn this day.",
  "I can do the next small thing.",
  "I am loved before I am useful.",
  "I am not carrying this alone.",
  "Enough is enough today.",
  "I bring peace into the room I enter.",
];

const KEY = "witness.journal.v2";
const LEGACY_KEY = "witness.journal.v1";
const EVENT = "witness:journal";

let cache: JournalState | null = null;

export function todayKey(d = new Date()) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(
    d.getDate(),
  ).padStart(2, "0")}`;
}

function blankEntry(day: string): JournalEntry {
  return {
    id: `j_${day}_${Math.random().toString(36).slice(2, 8)}`,
    day,
    grateful: ["", "", ""],
    great: ["", "", ""],
    affirmation: "",
    amazing: "",
    better: "",
    reflection: "",
    prompt: promptFor(day).text,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };
}

function normalize(e: Partial<JournalEntry> & { text?: string; day?: string }): JournalEntry {
  const day = e.day ?? todayKey();
  const base = blankEntry(day);
  const three = (v: unknown) => {
    const arr = Array.isArray(v) ? v.map(x => String(x ?? "")) : [];
    return [arr[0] ?? "", arr[1] ?? "", arr[2] ?? ""];
  };
  return {
    ...base,
    ...e,
    grateful: three(e.grateful ?? (e.text ? [e.text] : [])),
    great: three(e.great),
    affirmation: e.affirmation ?? "",
    amazing: e.amazing ?? "",
    better: e.better ?? "",
    reflection: e.reflection ?? "",
    id: e.id ?? base.id,
    day,
  };
}

export function readJournal(): JournalState {
  if (cache) return cache;
  if (typeof window === "undefined") return DEFAULT_JOURNAL;
  try {
    const raw =
      window.localStorage.getItem(KEY) ?? window.localStorage.getItem(LEGACY_KEY) ?? null;
    if (!raw) {
      cache = DEFAULT_JOURNAL;
    } else {
      const parsed = JSON.parse(raw) as Partial<JournalState>;
      cache = {
        ...DEFAULT_JOURNAL,
        ...parsed,
        entries: (parsed.entries ?? []).map(e => normalize(e)),
      };
    }
  } catch {
    cache = DEFAULT_JOURNAL;
  }
  return cache;
}

export function writeJournal(next: Partial<JournalState>) {
  const merged = { ...readJournal(), ...next };
  cache = merged;
  if (typeof window !== "undefined") {
    try {
      window.localStorage.setItem(KEY, JSON.stringify(merged));
    } catch {
      /* storage unavailable — the ritual still works for this session */
    }
    window.dispatchEvent(new Event(EVENT));
  }
  return merged;
}

export function subscribeJournal(fn: () => void) {
  if (typeof window === "undefined") return () => {};
  window.addEventListener(EVENT, fn);
  return () => window.removeEventListener(EVENT, fn);
}

/** Deterministic prompt for a given day, so it never changes under you. */
export function promptFor(day: string) {
  let sum = 0;
  for (const ch of day) sum += ch.charCodeAt(0);
  return dailyPrompts[sum % dailyPrompts.length];
}

/** Deterministic affirmation starter for the day. */
export function affirmationFor(day: string) {
  let sum = 1;
  for (const ch of day) sum += ch.charCodeAt(0) * 3;
  return affirmationSeeds[sum % affirmationSeeds.length];
}

export function entryFor(state: JournalState, day: string) {
  return state.entries.find(e => e.day === day);
}

/** Today's entry, or a blank one to type into. */
export function draftFor(state: JournalState, day = todayKey()): JournalEntry {
  return entryFor(state, day) ?? blankEntry(day);
}

const clean = (s: string, max = 240) => s.trim().slice(0, max);

/** True once anything at all is written. One line counts. */
export function hasAnything(e: JournalEntry) {
  return [...e.grateful, ...e.great, e.affirmation, e.amazing, e.better, e.reflection].some(
    v => v.trim().length > 0,
  );
}

/** Save (or update) a day. Nothing is required; empty saves are ignored. */
export function saveEntry(entry: JournalEntry) {
  const state = readJournal();
  const day = entry.day || todayKey();
  const existing = entryFor(state, day);
  const next: JournalEntry = {
    ...entry,
    id: existing?.id ?? entry.id,
    day,
    grateful: entry.grateful.map(v => clean(v)),
    great: entry.great.map(v => clean(v)),
    affirmation: clean(entry.affirmation, 160),
    amazing: clean(entry.amazing),
    better: clean(entry.better),
    reflection: clean(entry.reflection, 600),
    created_at: existing?.created_at ?? new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };
  if (!hasAnything(next)) return state;
  const entries = [next, ...state.entries.filter(e => e.day !== day)].sort((a, b) =>
    a.day < b.day ? 1 : -1,
  );
  return writeJournal({ entries });
}

export function removeEntry(id: string) {
  const state = readJournal();
  return writeJournal({ entries: state.entries.filter(e => e.id !== id) });
}

/** Consecutive days written, counting back from today (or yesterday). */
export function journalStreak(state: JournalState) {
  const days = new Set(state.entries.map(e => e.day));
  if (days.size === 0) return 0;
  const start = new Date();
  if (!days.has(todayKey(start))) start.setDate(start.getDate() - 1);
  let count = 0;
  const cursor = new Date(start);
  while (days.has(todayKey(cursor))) {
    count += 1;
    cursor.setDate(cursor.getDate() - 1);
  }
  return count;
}

/** Last 7 days, oldest first: whether something was written. */
export function lastSevenDays(state: JournalState) {
  const days = new Set(state.entries.map(e => e.day));
  const out: Array<{ day: string; written: boolean; label: string }> = [];
  const labels = ["S", "M", "T", "W", "T", "F", "S"];
  for (let i = 6; i >= 0; i--) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    const key = todayKey(d);
    out.push({ day: key, written: days.has(key), label: labels[d.getDay()] });
  }
  return out;
}

/** A single line to show elsewhere in the app. */
export function entrySummary(e: JournalEntry) {
  return (
    e.grateful.find(v => v.trim()) || e.affirmation || e.amazing || e.reflection || ""
  );
}

export function prettyDay(day: string) {
  const [y, m, d] = day.split("-").map(Number);
  const date = new Date(y, (m ?? 1) - 1, d ?? 1);
  if (day === todayKey()) return "Today";
  const yest = new Date();
  yest.setDate(yest.getDate() - 1);
  if (day === todayKey(yest)) return "Yesterday";
  return date.toLocaleDateString(undefined, { month: "short", day: "numeric" });
}
