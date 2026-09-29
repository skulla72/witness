/**
 * Witness is not a crisis service. When someone's words sound like they may be
 * in danger, we stop and put real help in front of them before anything posts.
 * The match is intentionally cautious: it errs toward showing help.
 */

export type CrisisResource = {
  name: string;
  detail: string;
  action: string;
  href: string;
};

/** United States first, then always-open text/chat lines. */
export const CRISIS_RESOURCES: CrisisResource[] = [
  {
    name: "988 Suicide & Crisis Lifeline",
    detail: "Free, confidential, 24/7 — call or text 988 (US).",
    action: "Call 988",
    href: "tel:988",
  },
  {
    name: "Crisis Text Line",
    detail: "Text HOME to 741741 to reach a trained counselor (US).",
    action: "Text 741741",
    href: "sms:741741?&body=HOME",
  },
  {
    name: "Emergency services",
    detail: "If you or someone else is in immediate danger, call 911 (US).",
    action: "Call 911",
    href: "tel:911",
  },
  {
    name: "Findahelpline.com",
    detail: "Free helplines in your own country, wherever you are.",
    action: "Find a line near you",
    href: "https://findahelpline.com",
  },
];

/**
 * Live chat with a real, trained crisis counselor. Witness deliberately does
 * NOT staff its own crisis chat — we hand straight off to the 988 Lifeline,
 * whose counselors answer 24/7. Never replace this with an AI responder.
 */
export const CRISIS_CHAT = {
  name: "988 Lifeline Chat",
  detail:
    "Chat with a trained crisis counselor right now — free, confidential, 24/7. Opens the official 988 Lifeline chat in a new tab.",
  action: "Start a live chat",
  href: "https://988lifeline.org/chat/",
  textFallback: {
    detail: "Prefer texting? Text 988 from your phone and a counselor replies.",
    action: "Text 988",
    href: "sms:988",
  },
} as const;


const PHRASES = [
  "kill myself",
  "killing myself",
  "end my life",
  "ending my life",
  "take my own life",
  "took my own life",
  "want to die",
  "wanna die",
  "wish i was dead",
  "wish i were dead",
  "better off dead",
  "no reason to live",
  "nothing to live for",
  "don't want to be here anymore",
  "dont want to be here anymore",
  "don't want to live",
  "dont want to live",
  "suicidal",
  "suicide",
  "hurt myself",
  "hurting myself",
  "harm myself",
  "self harm",
  "self-harm",
  "cutting myself",
  "overdose on",
  "end it all",
  "can't go on",
  "cant go on",
];

/** True when the text sounds like the person may be in danger. */
export function looksLikeCrisis(text: string): boolean {
  if (!text) return false;
  const clean = text.toLowerCase().replace(/[^a-z' -]+/g, " ").replace(/\s+/g, " ");
  return PHRASES.some(phrase => clean.includes(phrase));
}
