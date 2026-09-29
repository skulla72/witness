// Personalization engine.
// A short questionnaire at the door decides which rooms of the app exist for you.
// Nothing is permanent: seasons change, and so does the app. Stored locally
// (design-first) so it can be lifted into the backend later without UI changes.

export type SeasonKey =
  | "isolation"
  | "shame"
  | "grief"
  | "addiction"
  | "fatherhood"
  | "trauma"
  | "anxiety"
  | "provision";

export type FeatureKey =
  | "confessional"
  | "notokay"
  | "wingman"
  | "fatherwound"
  | "gratitude"
  | "walk"
  | "room"
  | "giving"
  | "serve"
  | "map"
  | "ledger"
  | "bible";

export type LaneKey =
  | "recovery"
  | "fatherlessness"
  | "grief"
  | "abuse"
  | "foster"
  | "mens_mental_health"
  | "hunger";

export type ServeMode = "money" | "time" | "skills" | "capacity";

/** How someone answered the first question, so wording can be written to them. */
export type Gender = "male" | "female" | "unspecified";
export type Intensity = "quiet" | "steady" | "all_in";

/** How a person actually processes what's going on inside them. */
export type Processing = "talk" | "write" | "silence";
/** How much contact from other people they can hold right now. */
export type Contact = "rare" | "steady" | "daily";
/** When they're most likely to open the app honestly. */
export type TimeOfDay = "morning" | "midday" | "night";
/** How many people they can be honest in front of. */
export type GroupSize = "one" | "few" | "many";


export interface Season {
  key: SeasonKey;
  label: string;
  door: string; // what it sounds like in a person's own words
  unlocks: FeatureKey[];
  lanes: LaneKey[];
}

/** The eight seasons the questionnaire asks about, in plain speech. */
export const SEASONS: Season[] = [
  {
    key: "isolation",
    label: "Isolation",
    door: "I don't really have anyone to call.",
    unlocks: ["wingman", "walk", "room"],
    lanes: ["mens_mental_health"],
  },
  {
    key: "shame",
    label: "Guilt & shame",
    door: "I'm harder on myself than anyone else is.",
    unlocks: ["confessional", "notokay", "room"],
    lanes: ["mens_mental_health"],
  },
  {
    key: "grief",
    label: "Grief",
    door: "I lost someone and I'm still carrying it.",
    unlocks: ["walk", "gratitude"],
    lanes: ["grief"],
  },
  {
    key: "addiction",
    label: "Addiction",
    door: "There's something I keep going back to.",
    unlocks: ["confessional", "notokay", "wingman"],
    lanes: ["recovery"],
  },
  {
    key: "fatherhood",
    label: "Fathers & sons",
    door: "My dad wasn't there, or I'm scared I won't be.",
    unlocks: ["fatherwound", "wingman", "room"],
    lanes: ["fatherlessness", "foster"],
  },
  {
    key: "trauma",
    label: "Old damage",
    door: "Something happened to me that I've never said out loud.",
    unlocks: ["fatherwound", "confessional", "notokay"],
    lanes: ["abuse"],
  },
  {
    key: "anxiety",
    label: "It comes and goes",
    door: "Some weeks I'm fine. Some weeks I'm not.",
    unlocks: ["notokay", "gratitude"],
    lanes: ["mens_mental_health"],
  },
  {
    key: "provision",
    label: "Provision",
    door: "Work, money, keeping the lights on.",
    unlocks: ["gratitude", "serve"],
    lanes: ["hunger"],
  },
];

export const SERVE_MODES: Array<{ key: ServeMode; label: string; blurb: string }> = [
  { key: "money", label: "Give money", blurb: "Monthly or one-time, to a cause you choose." },
  { key: "time", label: "Show up", blurb: "Real shifts, real places, seats you can take." },
  { key: "skills", label: "Lend a skill", blurb: "What you already know how to do." },
  { key: "capacity", label: "Build the org", blurb: "Finance, ops, governance — pro bono." },
];

export interface Prefs {
  done: boolean;
  firstName: string;
  /** Male, female, or rather not say. Only used to write copy to the person. */
  gender: Gender;
  seasons: SeasonKey[];
  intensity: Intensity;
  /** Post without a name until you decide otherwise. */
  anonymousFirst: boolean;
  /** Opt into the private support space. */
  mensRoom: boolean;
  lanes: LaneKey[];
  serve: ServeMode[];
  /** How you process: out loud, on paper, or in silence. */
  processing: Processing;
  /** How much contact from others you want. */
  contact: Contact;
  /** When the app should reach for you. */
  timeOfDay: TimeOfDay;
  /** How many people you can be honest in front of. */
  groupSize: GroupSize;
  /** Where you're serving from right now — changeable when you travel. */
  zip: string;
  /** How far you're willing to go, in miles. */
  radius: number;
  /**
   * The first question at the door: does this person want prayer and scripture
   * in the language of the app, or the same care without it? null = never asked.
   */
  faithBased: boolean | null;

  /** Manual overrides layered on top of the season-derived set. */
  addedFeatures: FeatureKey[];
  removedFeatures: FeatureKey[];

  /** Every raw survey answer, keyed by question id. Drives the "why" behind suggestions. */
  answers: Record<string, string[]>;
}


export const DEFAULT_PREFS: Prefs = {
  done: false,
  firstName: "",
  gender: "unspecified",
  seasons: [],
  intensity: "steady",
  anonymousFirst: true,
  mensRoom: false,
  lanes: [],
  serve: ["money"],
  processing: "write",
  contact: "steady",
  timeOfDay: "night",
  groupSize: "few",
  zip: "",
  radius: 25,
  faithBased: null,

  addedFeatures: [],
  removedFeatures: [],
  answers: {},
};


export const PROCESSING_OPTIONS: Array<{ key: Processing; label: string; sub: string }> = [
  { key: "talk", label: "I talk it out", sub: "Say it to a person and it gets smaller." },
  { key: "write", label: "I write it down", sub: "You find the words on the page, not out loud." },
  { key: "silence", label: "I go quiet", sub: "You need company more than conversation." },
];

export const CONTACT_OPTIONS: Array<{ key: Contact; label: string; sub: string }> = [
  { key: "rare", label: "Leave me be", sub: "Reach for me rarely. I'll come to you." },
  { key: "steady", label: "Check on me weekly", sub: "One steady nudge, not a stream." },
  { key: "daily", label: "Stay close", sub: "Daily contact keeps me honest." },
];

export const TIME_OPTIONS: Array<{ key: TimeOfDay; label: string; sub: string }> = [
  { key: "morning", label: "Early", sub: "Before the day gets loud." },
  { key: "midday", label: "Middle of the day", sub: "A break in the noise." },
  { key: "night", label: "Late", sub: "When it's quiet and it all catches up." },
];

export const GROUP_SIZE_OPTIONS: Array<{ key: GroupSize; label: string; sub: string }> = [
  { key: "one", label: "One other person", sub: "One person who knows the whole thing." },
  { key: "few", label: "A few", sub: "Three or four faces, same ones each week." },
  { key: "many", label: "A room", sub: "You'd rather be one of many than the focus." },
];


const KEY = "witness.prefs.v2";
const EVENT = "witness:prefs";

let cache: Prefs | null = null;

export function readPrefs(): Prefs {
  if (cache) return cache;
  if (typeof window === "undefined") return DEFAULT_PREFS;
  try {
    const raw = window.localStorage.getItem(KEY);
    cache = raw ? { ...DEFAULT_PREFS, ...(JSON.parse(raw) as Partial<Prefs>) } : DEFAULT_PREFS;
  } catch {
    cache = DEFAULT_PREFS;
  }
  return cache;
}

export function writePrefs(next: Partial<Prefs>) {
  const merged = { ...readPrefs(), ...next };
  cache = merged;
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

export function subscribePrefs(fn: () => void) {
  if (typeof window === "undefined") return () => {};
  window.addEventListener(EVENT, fn);
  return () => window.removeEventListener(EVENT, fn);
}

/** Rooms that only make sense inside the faith framing. */
export const FAITH_ONLY_FEATURES: FeatureKey[] = ["bible", "confessional"];

/** Always-on rooms. Everything else is earned by an answer in the survey. */
const BASE_FEATURES: FeatureKey[] = ["gratitude", "walk", "giving", "bible"];

/** Which rooms exist for this person right now. */
export function activeFeatures(p: Prefs): FeatureKey[] {
  const set = new Set<FeatureKey>(BASE_FEATURES);
  for (const s of SEASONS) {
    if (p.seasons.includes(s.key)) s.unlocks.forEach(f => set.add(f));
  }
  if (p.mensRoom) {
    set.add("room");
    set.add("confessional");
    set.add("notokay");
  }
  if (p.serve.some(m => m !== "money")) set.add("serve");
  // How someone processes decides which room gets the front door.
  if (p.processing === "talk") set.add("walk");
  if (p.processing === "write") set.add("gratitude");
  if (p.processing === "silence") set.add("bible");
  if (p.contact === "daily") set.add("wingman");
  if (p.intensity === "all_in") {
    set.add("map");
    set.add("ledger");
    set.add("serve");
  }

  p.addedFeatures.forEach(f => set.add(f));
  p.removedFeatures.forEach(f => set.delete(f));
  // Someone who asked for it plain doesn't get the faith-only rooms.
  if (p.faithBased === false) {
    FAITH_ONLY_FEATURES.forEach(f => set.delete(f));
  }
  return [...set];
}

export function hasFeature(p: Prefs, f: FeatureKey) {
  return activeFeatures(p).includes(f);
}

/** Lanes suggested by the seasons someone named, in their own order. */
export function suggestedLanes(p: Prefs): LaneKey[] {
  const out: LaneKey[] = [];
  for (const key of p.seasons) {
    const s = SEASONS.find(x => x.key === key);
    s?.lanes.forEach(l => {
      if (!out.includes(l)) out.push(l);
    });
  }
  return out;
}

/** How many optional home modules to render. Quiet means quiet. */
export function moduleBudget(p: Prefs) {
  return p.intensity === "quiet" ? 2 : p.intensity === "steady" ? 4 : 99;
}
