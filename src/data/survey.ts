// The full survey.
// This is the engine behind /setup: a declarative bank of questions grouped into
// sections. Every option carries weights toward rooms (features) and giving
// lanes, plus optional direct settings (season, rhythm, how you process, etc).
// Nothing is hardcoded in the UI — add a question here and it appears in the
// flow, scores automatically, and shows up in the "why" behind a suggestion.

import type {
  Contact,
  FeatureKey,
  Gender,
  GroupSize,
  Intensity,
  LaneKey,
  Processing,
  SeasonKey,
  ServeMode,
  TimeOfDay,
} from "@/data/personalize";

export type Answers = Record<string, string[]>;

/** Direct settings an option can set, on top of the weights it carries. */
export interface Sets {
  season?: SeasonKey;
  intensity?: Intensity;
  processing?: Processing;
  contact?: Contact;
  timeOfDay?: TimeOfDay;
  groupSize?: GroupSize;
  serve?: ServeMode;
  mensRoom?: boolean;
  gender?: Gender;
}

export interface Option {
  id: string;
  label: string;
  sub?: string;
  /** Shown with a quiet "Recommended" mark — a practice that helps most people. */
  recommended?: boolean;
  features?: Partial<Record<FeatureKey, number>>;
  lanes?: Partial<Record<LaneKey, number>>;
  sets?: Sets;
}

export interface Question {
  id: string;
  prompt: string;
  help?: string;
  /** single = pick one, multi = pick any, and "none of these" is always allowed. */
  type: "single" | "multi";
  options: Option[];
}

export interface Section {
  key: string;
  eyebrow: string;
  title: string;
  intro: string;
  questions: Question[];
}

export const SECTIONS: Section[] = [
  {
    key: "season",
    eyebrow: "Part one",
    title: "Where you actually are",
    intro:
      "Answer for this month, not for your whole life. Nothing you pick here is shown to anyone, and every answer can change later.",
    questions: [
      {
        id: "gender",
        prompt: "Are you male or female?",
        help: "Only used so the app speaks to you the right way. Never shown to anyone.",
        type: "single",
        options: [
          { id: "male", label: "Male", sets: { gender: "male" } },
          { id: "female", label: "Female", sets: { gender: "female" } },
          { id: "unspecified", label: "I'd rather not specify", sets: { gender: "unspecified" } },
        ],
      },
      {
        id: "carrying",
        prompt: "What are you carrying right now?",
        help: "Pick everything that's true. Most people pick more than one.",
        type: "multi",
        options: [
          {
            id: "alone",
            label: "I don't really have anyone to call",
            sets: { season: "isolation" },
            features: { wingman: 3, walk: 2, room: 2 },
            lanes: { mens_mental_health: 2 },
          },
          {
            id: "shame",
            label: "I'm harder on myself than anyone else is",
            sets: { season: "shame" },
            features: { confessional: 3, notokay: 2, room: 2 },
            lanes: { mens_mental_health: 2 },
          },
          {
            id: "loss",
            label: "I lost someone and I'm still carrying it",
            sets: { season: "grief" },
            features: { walk: 3, gratitude: 2 },
            lanes: { grief: 3 },
          },
          {
            id: "habit",
            label: "There's something I keep going back to",
            sets: { season: "addiction" },
            features: { confessional: 3, notokay: 3, wingman: 2 },
            lanes: { recovery: 3 },
          },
          {
            id: "dad",
            label: "A parent wasn't there, or I'm scared I won't be there for someone",
            sets: { season: "fatherhood" },
            features: { fatherwound: 3, wingman: 2, room: 2 },
            lanes: { fatherlessness: 3, foster: 1 },
          },
          {
            id: "old",
            label: "Something happened to me I've never said out loud",
            sets: { season: "trauma" },
            features: { fatherwound: 2, confessional: 3, notokay: 2 },
            lanes: { abuse: 3 },
          },
          {
            id: "waves",
            label: "Some weeks I'm fine, some weeks I'm not",
            sets: { season: "anxiety" },
            features: { notokay: 2, gratitude: 2 },
            lanes: { mens_mental_health: 2 },
          },
          {
            id: "money",
            label: "Work, money, keeping the lights on",
            sets: { season: "provision" },
            features: { gratitude: 2, serve: 1 },
            lanes: { hunger: 3 },
          },
        ],
      },
      {
        id: "weight",
        prompt: "How heavy is it this week?",
        type: "single",
        options: [
          {
            id: "crisis",
            label: "Heavy. I'm barely holding it",
            sub: "We'll put the fastest door first.",
            features: { notokay: 3, wingman: 2 },
          },
          {
            id: "steady_load",
            label: "Heavy but manageable",
            features: { walk: 1, gratitude: 1 },
          },
          {
            id: "quiet_load",
            label: "Light. I'm here to build something, not survive it",
            features: { bible: 2, serve: 2, ledger: 1 },
          },
        ],
      },
      {
        id: "last_honest",
        prompt: "When did you last tell someone the truth about it?",
        type: "single",
        options: [
          { id: "never", label: "Never have", features: { confessional: 3, room: 2 } },
          { id: "years", label: "Years ago", features: { confessional: 2, wingman: 2 } },
          { id: "recent", label: "In the last month", features: { walk: 2 } },
          { id: "regular", label: "I have someone I tell everything", features: { serve: 1, walk: 1 } },
        ],
      },
      {
        id: "faith_stage",
        prompt: "Where's your faith at, honestly?",
        type: "single",
        options: [
          { id: "new", label: "New to this, or coming back", features: { bible: 3, walk: 1 } },
          { id: "dry", label: "Been at it years and it's gone dry", features: { bible: 2, gratitude: 2 } },
          { id: "steady_faith", label: "Steady", features: { gratitude: 1 } },
          { id: "angry", label: "Angry at God right now", features: { confessional: 2, walk: 2 } },
        ],
      },
    ],
  },
  {
    key: "wiring",
    eyebrow: "Part two",
    title: "How you're wired",
    intro:
      "This isn't a personality test to file you away. It decides which room the app opens with, and how loud it is.",
    questions: [
      {
        id: "processing",
        prompt: "When something's wrong, what do you actually do?",
        type: "single",
        options: [
          {
            id: "talk",
            label: "I talk it out",
            sub: "Say it to a person and it gets smaller.",
            sets: { processing: "talk" },
            features: { walk: 3, wingman: 2 },
          },
          {
            id: "write",
            label: "I write it down",
            sub: "You find the words on the page, not out loud.",
            sets: { processing: "write" },
            features: { gratitude: 3, ledger: 1 },
          },
          {
            id: "silence",
            label: "I go quiet",
            sub: "You need company more than conversation.",
            sets: { processing: "silence" },
            features: { bible: 3, walk: 1 },
          },
        ],
      },
      {
        id: "group_size",
        prompt: "How many people can you be honest in front of?",
        type: "single",
        options: [
          { id: "one", label: "One other person", sets: { groupSize: "one" }, features: { wingman: 3 } },
          { id: "few", label: "A few", sets: { groupSize: "few" }, features: { walk: 2 } },
          { id: "many", label: "A room", sub: "You'd rather be one of many than the focus.", sets: { groupSize: "many" }, features: { room: 2 } },
        ],
      },
      {
        id: "time",
        prompt: "When are you most honest?",
        type: "single",
        options: [
          { id: "morning", label: "Early", sub: "Before the day gets loud.", sets: { timeOfDay: "morning" }, features: { bible: 2 } },
          { id: "midday", label: "Middle of the day", sets: { timeOfDay: "midday" }, features: { gratitude: 1 } },
          { id: "night", label: "Late", sub: "When it's quiet and it all catches up.", sets: { timeOfDay: "night" }, features: { notokay: 2, confessional: 1 } },
        ],
      },
      {
        id: "contact",
        prompt: "How much contact do you want from other people?",
        type: "single",
        options: [
          { id: "rare", label: "Leave me be", sub: "Reach for me rarely. I'll come to you.", sets: { contact: "rare" } },
          { id: "steady", label: "Check on me weekly", sets: { contact: "steady" }, features: { walk: 1 } },
          { id: "daily", label: "Stay close", sub: "Daily contact keeps me honest.", sets: { contact: "daily" }, features: { wingman: 3 } },
        ],
      },
      {
        id: "intensity",
        prompt: "How much app do you want?",
        help: "The anti-overwhelm setting. It decides how much is on your home screen — not how much you're worth.",
        type: "single",
        options: [
          { id: "quiet", label: "Quiet", sub: "One thing a day. A candle, a name, nothing else.", sets: { intensity: "quiet" } },
          { id: "steady", label: "Steady", sub: "A few rooms. The rhythm most people keep.", sets: { intensity: "steady" } },
          { id: "all_in", label: "All in", sub: "Open every room — map, ledger, serving, all of it.", sets: { intensity: "all_in" }, features: { map: 2, ledger: 2, serve: 2 } },
        ],
      },
      {
        id: "privacy",
        prompt: "Who gets to see your name on what you post?",
        type: "single",
        options: [
          { id: "anon", label: "Nobody at first", sub: "Anonymous until you decide otherwise.", features: { confessional: 2 } },
          { id: "circle", label: "My circle only", features: { walk: 1 } },
          { id: "open", label: "I'm fine being named", features: { serve: 1 } },
        ],
      },
    ],
  },
  {
    key: "room",
    eyebrow: "Part three",
    title: "A private support space",
    intro:
      "There's a private support space for honest conversation, one-to-one check-ins, family healing, and difficult moments. It stays closed unless you open it.",
    questions: [
      {
        id: "mens_room",
        prompt: "Do you want the private support space open?",
        type: "single",
        options: [
          { id: "yes", label: "Open it", sets: { mensRoom: true }, features: { room: 4, confessional: 2, notokay: 2 } },
          { id: "later", label: "Not yet — show me the rest", sets: { mensRoom: false } },
        ],
      },
      {
        id: "hard_hour",
        prompt: "What time of day is hardest?",
        type: "single",
        options: [
          { id: "waking", label: "The minute I wake up", features: { bible: 2 } },
          { id: "commute", label: "Alone in the car", features: { walk: 1 } },
          { id: "after_work", label: "The gap between work and home", features: { wingman: 2 } },
          { id: "midnight", label: "After midnight", features: { notokay: 3, confessional: 1 } },
        ],
      },
      {
        id: "relapse",
        prompt: "When it gets bad, what would actually help in that minute?",
        type: "multi",
        options: [
          { id: "voice", label: "Hearing one familiar voice", features: { wingman: 3 } },
          { id: "say_it", label: "Saying it out loud to nobody in particular", features: { confessional: 3 } },
          { id: "presence", label: "Someone sitting with me without talking", features: { walk: 3 } },
          { id: "words", label: "Something true to read", features: { bible: 3 } },
          { id: "flare", label: "One button that gets me help fast", features: { notokay: 4 } },
        ],
      },
    ],
  },
  {
    key: "lanes",
    eyebrow: "Part four",
    title: "Where your money and hours should land",
    intro:
      "Most people give where they were broken. That's not morbid — it's the most honest generosity there is. These answers rank the lanes; you'll confirm them at the end.",
    questions: [
      {
        id: "own_story",
        prompt: "If someone had shown up for you ten years ago, what would they have brought?",
        type: "multi",
        options: [
          { id: "bed", label: "A bed away from the drinking", lanes: { recovery: 3 } },
          { id: "man", label: "A steady adult who stayed", lanes: { fatherlessness: 3 } },
          { id: "sat", label: "Someone who sat with the grief", lanes: { grief: 3 } },
          { id: "believed", label: "Somebody who believed me", lanes: { abuse: 3 } },
          { id: "home", label: "A home that didn't move me again", lanes: { foster: 3 } },
          { id: "asked", label: "One person who asked twice", lanes: { mens_mental_health: 3 } },
          { id: "rent", label: "Rent covered for one month", lanes: { hunger: 3 } },
        ],
      },
      {
        id: "cause_pull",
        prompt: "Which headline stops you scrolling?",
        type: "multi",
        options: [
          { id: "overdose", label: "Overdose deaths in your county", lanes: { recovery: 2 } },
          { id: "boys", label: "Boys growing up without a father", lanes: { fatherlessness: 2 } },
          { id: "widow", label: "A widow six months after the funeral", lanes: { grief: 2 } },
          { id: "survivor", label: "A survivor finally believed in court", lanes: { abuse: 2 } },
          { id: "foster_kid", label: "A kid moving homes for the seventh time", lanes: { foster: 2 } },
          { id: "suicide", label: "Mental health and suicide rates", lanes: { mens_mental_health: 2 } },
          { id: "eviction", label: "Evictions in your city", lanes: { hunger: 2 } },
        ],
      },
      {
        id: "give_style",
        prompt: "How do you want to give?",
        type: "multi",
        options: [
          { id: "money", label: "Money", sub: "Monthly or one-time, to a cause you choose.", sets: { serve: "money" } },
          { id: "time", label: "Show up", sub: "Real shifts, real places, seats you can take.", sets: { serve: "time" }, features: { serve: 3 } },
          { id: "skills", label: "Lend a skill", sub: "What you already know how to do.", sets: { serve: "skills" }, features: { serve: 3 } },
          { id: "capacity", label: "Build the org", sub: "Finance, ops, governance — pro bono.", sets: { serve: "capacity" }, features: { serve: 3, ledger: 1 } },
        ],
      },
      {
        id: "give_size",
        prompt: "What's realistic each month?",
        help: "No number is too small, and this is never shown to anyone.",
        type: "single",
        options: [
          { id: "none", label: "Nothing right now", sub: "Hours instead of dollars.", features: { serve: 2 } },
          { id: "small", label: "Under $25" },
          { id: "mid", label: "$25–$100" },
          { id: "large", label: "More than $100", features: { ledger: 1 } },
        ],
      },
      {
        id: "proximity",
        prompt: "Close to home, or wherever the need is worst?",
        type: "single",
        options: [
          { id: "local", label: "My city", features: { map: 1 } },
          { id: "region", label: "My region" },
          { id: "anywhere", label: "Anywhere", features: { map: 2 } },
        ],
      },
    ],
  },
  {
    key: "rhythm",
    eyebrow: "Part five",
    title: "What you'll actually keep",
    intro: "One honest answer here beats five hopeful ones. This sets the rhythm the app expects of you.",
    questions: [
      {
        id: "cadence",
        prompt: "How often will you really open this?",
        type: "single",
        options: [
          {
            id: "daily",
            label: "Every day",
            sub: "A daily gratitude ritual fits this best.",
            recommended: true,
            features: { gratitude: 2, bible: 1 },
          },
          { id: "weekly", label: "Once or twice a week", features: { walk: 1 } },
          { id: "when_bad", label: "Only when things get bad", features: { notokay: 3 } },
        ],
      },
      {
        id: "keeps",
        prompt: "Which of these would you keep for a month?",
        type: "multi",
        options: [
          { id: "candle", label: "Light a candle for one name", features: { gratitude: 1 } },
          {
            id: "thanks",
            label: "Write one thing you're thankful for",
            sub: "A private line a day. The one habit most people actually keep.",
            recommended: true,
            features: { gratitude: 3 },
          },
          { id: "verse", label: "Read one verse", features: { bible: 3 } },
          { id: "checkin", label: "Check in on one person", features: { wingman: 3 } },
          { id: "shift", label: "Work one shift a month", features: { serve: 3 } },
          { id: "record", label: "Record one video", features: { walk: 1 } },
        ],
      },
      {
        id: "quit",
        prompt: "What usually makes you quit an app like this?",
        type: "single",
        options: [
          { id: "noise", label: "Too many notifications", sets: { contact: "rare" } },
          { id: "fake", label: "It felt performative", features: { confessional: 2 } },
          { id: "alone", label: "Nobody noticed I was there", features: { wingman: 2, walk: 2 } },
          { id: "busy", label: "I just got busy", sets: { intensity: "quiet" } },
        ],
      },
    ],
  },
  {
    key: "place",
    eyebrow: "Last part",
    title: "Where you're standing",
    intro: "Only used to find shifts, groups, and churches near you. Skip it and the app still works.",
    questions: [
      {
        id: "church",
        prompt: "Are you connected to a church right now?",
        type: "single",
        options: [
          { id: "yes_church", label: "Yes, regularly" },
          { id: "sometimes", label: "On and off" },
          { id: "no_church", label: "No", features: { walk: 2 } },
          { id: "burned", label: "I left one and it hurt", features: { confessional: 2, room: 1 } },
        ],
      },
      {
        id: "travel",
        prompt: "How far will you travel to show up in person?",
        type: "single",
        options: [
          { id: "walk_dist", label: "Walking distance" },
          { id: "short", label: "Up to 15 minutes" },
          { id: "far", label: "Half an hour or more", features: { serve: 1 } },
        ],
      },
    ],
  },
];

export const ALL_QUESTIONS: Question[] = SECTIONS.flatMap(s => s.questions);
export const QUESTION_COUNT = ALL_QUESTIONS.length;

/**
 * Options whose wording is written to the person answering. The fatherless lane
 * is the clearest case: a woman should be asked about a girl whose father didn't
 * show up, a man about a boy, and someone who'd rather not say gets both.
 */
const GENDERED_OPTION_LABELS: Record<string, Record<Gender, string>> = {
  "cause_pull:boys": {
    female: "A girl: her father didn't show up",
    male: "A boy: his father didn't show up",
    unspecified: "A child whose father didn't show up",
  },
};

function genderedSections(gender: Gender): Section[] {
  return SECTIONS.map(section => ({
    ...section,
    questions: section.questions.map(question => ({
      ...question,
      options: question.options.map(option => {
        const label = GENDERED_OPTION_LABELS[`${question.id}:${option.id}`]?.[gender];
        return label ? { ...option, label } : option;
      }),
    })),
  }));
}

/** The plain-language path excludes religious questions rather than rewording them. */
export function surveySectionsFor(
  faithBased: boolean | null,
  gender: Gender = "unspecified",
): Section[] {
  const base = genderedSections(gender);
  if (faithBased !== false) return base;

  return base.flatMap(section => {
    if (section.key === "room") return [];

    const questions = section.questions
      .filter(question => question.id !== "faith_stage" && question.id !== "church")
      .map(question => ({
        ...question,
        options: question.options.filter(option => option.id !== "verse"),
      }));

    const neutralIntro = section.key === "place"
      ? "Only used to find projects, groups, and opportunities near you. Skip it and the app still works."
      : section.intro;

    return questions.length ? [{ ...section, intro: neutralIntro, questions }] : [];
  });
}

export function findOption(qid: string, oid: string) {
  return ALL_QUESTIONS.find(q => q.id === qid)?.options.find(o => o.id === oid);
}

export interface Scored<K extends string> {
  key: K;
  score: number;
  /** The answers that pushed this up, in the person's own words. */
  reasons: string[];
}

export interface SurveyResult {
  features: Scored<FeatureKey>[];
  lanes: Scored<LaneKey>[];
  seasons: SeasonKey[];
  serve: ServeMode[];
  intensity: Intensity;
  processing: Processing;
  contact: Contact;
  timeOfDay: TimeOfDay;
  groupSize: GroupSize;
  gender: Gender;
  mensRoom: boolean;
  anonymousFirst: boolean;
  answered: number;
}

/** Turn raw answers into ranked room and lane suggestions, with the "why". */
export function scoreSurvey(answers: Answers): SurveyResult {
  const features = new Map<FeatureKey, Scored<FeatureKey>>();
  const lanes = new Map<LaneKey, Scored<LaneKey>>();
  const seasons: SeasonKey[] = [];
  const serve: ServeMode[] = [];
  const sets: Sets = {};
  let answered = 0;

  const bump = <K extends string>(
    map: Map<K, Scored<K>>,
    key: K,
    weight: number,
    reason: string,
  ) => {
    const cur = map.get(key) ?? { key, score: 0, reasons: [] };
    cur.score += weight;
    if (!cur.reasons.includes(reason)) cur.reasons.push(reason);
    map.set(key, cur);
  };

  for (const q of ALL_QUESTIONS) {
    const picked = answers[q.id] ?? [];
    if (picked.length) answered += 1;
    for (const oid of picked) {
      const opt = q.options.find(o => o.id === oid);
      if (!opt) continue;
      const reason = opt.label;
      for (const [k, w] of Object.entries(opt.features ?? {})) {
        bump(features, k as FeatureKey, w as number, reason);
      }
      for (const [k, w] of Object.entries(opt.lanes ?? {})) {
        bump(lanes, k as LaneKey, w as number, reason);
      }
      if (opt.sets?.season && !seasons.includes(opt.sets.season)) seasons.push(opt.sets.season);
      if (opt.sets?.serve && !serve.includes(opt.sets.serve)) serve.push(opt.sets.serve);
      const { season: _s, serve: _v, ...rest } = opt.sets ?? {};
      Object.assign(sets, rest);
    }
  }

  const rank = <K extends string>(m: Map<K, Scored<K>>) =>
    [...m.values()].sort((a, b) => b.score - a.score || a.key.localeCompare(b.key));

  return {
    features: rank(features),
    lanes: rank(lanes),
    seasons,
    serve: serve.length ? serve : ["money"],
    intensity: sets.intensity ?? "steady",
    processing: sets.processing ?? "write",
    contact: sets.contact ?? "steady",
    timeOfDay: sets.timeOfDay ?? "night",
    groupSize: sets.groupSize ?? "few",
    gender: sets.gender ?? "unspecified",
    mensRoom: sets.mensRoom ?? false,
    anonymousFirst: (answers["privacy"] ?? []).includes("anon"),
    answered,
  };
}

/** Rooms strong enough to open on their own. */
export function suggestedFeatures(r: SurveyResult, cutoff = 3): FeatureKey[] {
  return r.features.filter(f => f.score >= cutoff).map(f => f.key);
}

/** The lanes worth putting in front of someone, best first. */
export function suggestedLanesFromSurvey(r: SurveyResult, max = 3): LaneKey[] {
  return r.lanes.filter(l => l.score > 0).slice(0, max).map(l => l.key);
}
