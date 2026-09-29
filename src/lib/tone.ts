// The words the app uses with you.
// The first question at the door decides this: faith-based keeps prayer and
// scripture language; plain is its own experience — same care, no religious
// wording, no Bible, no verses, and no church listings.

import type { Prefs } from "@/data/personalize";

export interface Tone {
  faith: boolean;
  /** "prayer" / "hope" */
  ask: string;
  /** "Prayer" / "Hopes" — tab and section headings. */
  askTab: string;
  /** "A Prayer" / "A Hope" */
  askTitle: string;
  /** "prayers" / "hopes" */
  asks: string;
  /** "answered" / "came through" */
  answered: string;
  /** "Answered" / "Came through" — headings. */
  answeredTitle: string;
  /** Who someone is asking. */
  praying: string;
  /** Short action label shown beneath a person's image. */
  standAction: string;
  /** "pray for" / "stand with" */
  prayFor: string;
  /** "prayed for you" / "is standing with you" */
  prayedForYou: string;
  /** "Pray for Someone" / "Encourage Someone" */
  prayForSomeone: string;
  /** "Post Prayer" / "Post Hope" */
  postAsk: string;
  /** Feature flags */
  showBible: boolean;
  showVerses: boolean;
  churchFirst: boolean;
}

const FAITH: Tone = {
  faith: true,
  ask: "prayer",
  askTab: "Prayer",
  askTitle: "A Prayer",
  asks: "prayers",
  answered: "answered",
  answeredTitle: "Answered",
  praying: "praying with you",
  standAction: "I'm praying",
  prayFor: "pray for",
  prayedForYou: "prayed for you",
  prayForSomeone: "Pray for Someone",
  postAsk: "Post Prayer",
  showBible: true,
  showVerses: true,
  churchFirst: true,
};

const PLAIN: Tone = {
  faith: false,
  ask: "hope",
  askTab: "Hopes",
  askTitle: "A Hope",
  asks: "hopes",
  answered: "came through",
  answeredTitle: "Came through",
  praying: "standing with you",
  standAction: "Stand with them",
  prayFor: "stand with",
  prayedForYou: "is standing with you",
  prayForSomeone: "Encourage Someone",
  postAsk: "Post Hope",
  showBible: false,
  showVerses: false,
  churchFirst: false,
};

/** Faith wording unless the person explicitly asked for plain. */
export function toneFor(prefs: Pick<Prefs, "faithBased">): Tone {
  return prefs.faithBased === false ? PLAIN : FAITH;
}

/** Pick between a faith line and its plain counterpart. */
export function say(tone: Tone, faith: string, plain: string): string {
  return tone.faith ? faith : plain;
}

/** Keep older faith-category posts neutral when viewed in the plain experience. */
export function categoryForTone(category: string, tone: Pick<Tone, "faith">): string {
  if (tone.faith) return category;
  if (category === "Faith") return "Personal";
  if (category === "Salvation") return "New beginnings";
  return category;
}
