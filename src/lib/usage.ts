// Quiet usage clock.
// Counts only seconds the app is actually open and visible, so the feedback
// invitation shows up after real use — not after an hour of a background tab.

const KEY = "witness.usage.v1";
const EVENT = "witness:usage";

export interface Usage {
  /** Seconds the app has been open and visible. */
  seconds: number;
  /** Separate visits, counted once each. */
  sessions: number;
  /** When the current visit was counted, so a reload isn't a new visit. */
  sessionAt: number | null;
  /** True once this person has shared an answer or a first ask. */
  milestone: boolean;
  /** Feedback invitations already answered or dismissed, by id. */
  answered: string[];
  /** When the invitation was last set aside, so we can wait before asking again. */
  snoozedAt: number | null;
}

const EMPTY: Usage = {
  seconds: 0,
  sessions: 0,
  sessionAt: null,
  milestone: false,
  answered: [],
  snoozedAt: null,
};

export function readUsage(): Usage {
  if (typeof window === "undefined") return EMPTY;
  try {
    const raw = window.localStorage.getItem(KEY);
    return raw ? { ...EMPTY, ...(JSON.parse(raw) as Partial<Usage>) } : EMPTY;
  } catch {
    return EMPTY;
  }
}

export function writeUsage(next: Partial<Usage>): Usage {
  const merged = { ...readUsage(), ...next };
  if (typeof window !== "undefined") {
    try {
      window.localStorage.setItem(KEY, JSON.stringify(merged));
    } catch {
      /* storage unavailable */
    }
    window.dispatchEvent(new Event(EVENT));
  }
  return merged;
}

export function subscribeUsage(fn: () => void) {
  if (typeof window === "undefined") return () => {};
  window.addEventListener(EVENT, fn);
  return () => window.removeEventListener(EVENT, fn);
}

/** Ask after a few separate visits… */
export const FEEDBACK_AFTER_SESSIONS = 3;
/** …unless they hit a milestone first, which is the better moment to ask. */
export const SNOOZE_SECONDS = 60 * 60 * 24 * 3;
/** A visit is over after this long away. */
const SESSION_GAP_SECONDS = 60 * 30;

/** Count this visit once. Call on app start. */
export function markSession(): Usage {
  const usage = readUsage();
  const fresh = !usage.sessionAt || Date.now() - usage.sessionAt > SESSION_GAP_SECONDS * 1000;
  if (!fresh) return usage;
  return writeUsage({ sessions: usage.sessions + 1, sessionAt: Date.now() });
}

/** They shared a first ask or an answer — the moment worth asking about. */
export function markMilestone(): Usage {
  return writeUsage({ milestone: true });
}

/** Is the quiet feedback invitation due? */
export function feedbackDue(surveyId: string): boolean {
  const usage = readUsage();
  if (usage.answered.includes(surveyId)) return false;
  if (usage.snoozedAt && Date.now() - usage.snoozedAt < SNOOZE_SECONDS * 1000) return false;
  return usage.milestone || usage.sessions >= FEEDBACK_AFTER_SESSIONS;
}
