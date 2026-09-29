// The men's room: anonymity first, witness before advice.
// Built for guys who bottle it up — one-take video, no filters, no advice,
// and a single button for the worst hour of the night.

export type ConfessResponse = "me_too" | "scripture" | "prayer";

export interface Confession {
  id: string;
  /** No names in here. Ever. A stable animal handle instead. */
  handle: string;
  kind: "text" | "voice" | "video";
  body: string;
  duration_sec?: number;
  at: string;
  /** The only three things anyone can send back. */
  me_too: number;
  scripture: Array<{ ref: string; handle: string }>;
  prayers: number;
  /** Marked when the man himself says the weight moved. */
  lighter?: boolean;
}

const hoursAgo = (h: number) => new Date(Date.now() - h * 3600_000).toISOString();

export const confessions: Confession[] = [
  {
    id: "cf1", handle: "Grey Elk", kind: "text", at: hoursAgo(3),
    body: "I've been lying to my wife about money for eight months. Not gambling. Just stupid. I don't know how to start the sentence.",
    me_too: 34, prayers: 41, scripture: [{ ref: "James 5:16", handle: "Iron Wren" }],
  },
  {
    id: "cf2", handle: "Slow River", kind: "voice", duration_sec: 74, at: hoursAgo(9),
    body: "Voice — 1:14. About what happens after everyone goes to bed.",
    me_too: 88, prayers: 96, scripture: [{ ref: "Psalm 88", handle: "Grey Elk" }, { ref: "Isaiah 43:2", handle: "North Pine" }],
  },
  {
    id: "cf3", handle: "North Pine", kind: "text", at: hoursAgo(20),
    body: "My dad died in February and I haven't cried once. Something's wrong with me.",
    me_too: 57, prayers: 63, scripture: [{ ref: "John 11:35", handle: "Slow River" }],
  },
  {
    id: "cf4", handle: "Iron Wren", kind: "video", duration_sec: 52, at: hoursAgo(31),
    body: "One take, no retakes. I said it out loud for the first time in 22 years.",
    me_too: 210, prayers: 188, scripture: [], lighter: true,
  },
  {
    id: "cf5", handle: "Dry Creek", kind: "text", at: hoursAgo(44),
    body: "I'm 41 and I do not have one friend I could call at 2am. That's on me and I don't know how to fix it.",
    me_too: 164, prayers: 121, scripture: [{ ref: "Proverbs 18:24", handle: "Grey Elk" }],
  },
];

export const CONFESSION_RULES = [
  "No names, no photos, no profiles in this room.",
  "You may send three things back: \u201cme too\u201d, one scripture, or a recorded prayer.",
  "No advice. No fixing. No \u201cat least\u201d.",
  "What is said here does not leave here.",
];

/** The one-tap flare for the worst hour of the night. */
export interface NotOkaySignal {
  at: string;
  responders: string[]; // first names of men who answered
  answered_in_min: number;
}

export const lastNotOkay: NotOkaySignal | null = {
  at: hoursAgo(96),
  responders: ["Marcus", "James", "Ray"],
  answered_in_min: 4,
};

export const notOkayFacts = [
  "Your circle sees five words: he's up, he needs company.",
  "No reason required. You never have to explain it after.",
  "Median time to a first answer: 6 minutes.",
];

/** Wingman: one man, one week, two questions. */
export interface Wingman {
  name: string;
  photo: string;
  city: string;
  weeks_together: number;
  checked_in: boolean;
  /** The two questions. Never changes — that's the point. */
  questions: [string, string];
  his_answer?: { carried: string; hid?: string; at: string };
}

export const wingman: Wingman = {
  name: "Marcus",
  photo: "https://images.unsplash.com/photo-1531384441138-2736e62e0919?w=200&q=80&auto=format&fit=crop",
  city: "Toledo, OH",
  weeks_together: 6,
  checked_in: false,
  questions: ["What did you carry this week?", "What did you hide?"],
  his_answer: {
    carried: "My mom's diagnosis. Told everyone it was routine. It isn't.",
    hid: "That I've been sleeping in the truck some nights to avoid the house.",
    at: hoursAgo(14),
  },
};

/** The Father Wound track: eight sessions, private by default. */
export interface TrackSession {
  n: number;
  title: string;
  prompt: string;
  minutes: number;
  scripture: string;
  done: boolean;
  /** What you may choose — never are required — to share. */
  shareable: string;
}

export const fatherWound: {
  title: string;
  intro: string;
  ceiling: string;
  sessions: TrackSession[];
} = {
  title: "The Father Wound",
  intro:
    "Eight sessions, one a week, alone with a question. Your answers are private unless you choose one to bring to the room. There is no score and no streak here.",
  ceiling:
    "This is not therapy and it doesn't pretend to be. If a session opens something you can't close, a licensed counselor is one tap away — that's the healthy end of this, not a failure.",
  sessions: [
    { n: 1, title: "The last good memory", prompt: "Describe the last time you felt safe with your father — or the moment you realized you never had.", minutes: 12, scripture: "Psalm 27:10", done: true, shareable: "One sentence from it." },
    { n: 2, title: "What he taught without saying", prompt: "What rule about being a man did you learn from him that nobody ever spoke out loud?", minutes: 14, scripture: "Proverbs 4:1", done: true, shareable: "The unspoken rule." },
    { n: 3, title: "The sentence you never said", prompt: "Say it here, to the page. You don't have to send it anywhere.", minutes: 15, scripture: "Psalm 62:8", done: false, shareable: "Nothing, unless you want to." },
    { n: 4, title: "Where you became him", prompt: "Name one thing you swore you'd never do that you now do.", minutes: 15, scripture: "Ezekiel 18:14", done: false, shareable: "The one thing." },
    { n: 5, title: "The men who filled the gap", prompt: "Who showed up anyway? Coach, uncle, neighbor, boss. Name them.", minutes: 10, scripture: "1 Corinthians 4:15", done: false, shareable: "Their names, out loud." },
    { n: 6, title: "Forgiveness is not amnesia", prompt: "What would forgiving him cost you, and what would it not require of you?", minutes: 18, scripture: "Colossians 3:13", done: false, shareable: "What it would cost." },
    { n: 7, title: "The father you are becoming", prompt: "Write one specific promise to a kid — yours, or one you'll mentor.", minutes: 12, scripture: "Deuteronomy 6:7", done: false, shareable: "The promise." },
    { n: 8, title: "Say it in the room", prompt: "One take, sixty seconds, to men who've walked it. Or stay silent and still finish.", minutes: 8, scripture: "Revelation 12:11", done: false, shareable: "Your choice, entirely." },
  ],
};

export const CRISIS = [
  { label: "988 — Suicide & Crisis Lifeline", detail: "Call or text 988, 24/7", href: "tel:988" },
  { label: "SAMHSA treatment line", detail: "1-800-662-4357, free and confidential", href: "tel:18006624357" },
  { label: "Find a licensed counselor", detail: "Vetted directory, sliding scale", href: "/walk" },
];
