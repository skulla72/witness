// The care agreement both people sign before any session starts.
// Wording changes require a new version in the database
// (private.therapy_agreement_version), which asks everyone to sign again.

import { BRAND } from "@/config/brand";

export const CARE_AGREEMENT_TITLE = "Agreement for care sessions";

/** Must match private.therapy_agreement_version() in the database. */
export const CARE_AGREEMENT_VERSION = "2026-09-18";


export const CARE_AGREEMENT_INTRO =
  "Read this all the way through. A session cannot begin until both people have signed it.";

export interface AgreementClause {
  heading: string;
  body: string;
}

export const CLIENT_CLAUSES: AgreementClause[] = [
  {
    heading: `${BRAND.name} is not your provider`,
    body:
      `${BRAND.name} introduces you to a licensed provider and hosts the room. ${BRAND.name} does not provide therapy, does not supervise or employ the provider, and does not review, screen or guarantee the care you receive. Your care is between you and the provider you choose.`,
  },
  {
    heading: "Not for emergencies",
    body:
      "A session is not emergency care. If you are in danger of harming yourself or someone else, call 911 or 988 (Suicide & Crisis Lifeline) right now instead of booking or waiting for a session.",
  },
  {
    heading: "What the provider keeps",
    body:
      "The provider keeps private notes about your sessions. You cannot read them here and neither can anyone else on the team; ask your provider directly for a copy of your record.",
  },
  {
    heading: "Confidential, with legal limits",
    body:
      "Your provider keeps what you share confidential, except where the law requires disclosure: imminent danger to yourself or another person, abuse or neglect of a child, elder or dependent adult, or a court order.",
  },
  {
    heading: "Nothing is recorded",
    body:
      "Sessions happen live and are not recorded. Do not record, screenshot or share any part of a session, and do not repeat what your provider says to you outside the room.",
  },
  {
    heading: "Missed and cancelled sessions",
    body:
      "Cancel as early as you can so the time can go to someone else. Repeated missed sessions may end the arrangement with that provider.",
  },
  {
    heading: "Consent",
    body:
      `By typing your name you consent to care from the provider you booked, confirm you are 18 or older or have a guardian's consent, and release ${BRAND.name} from any claim arising from care that started here.`,
  },
];

export const THERAPIST_CLAUSES: AgreementClause[] = [
  {
    heading: "You are the licensed professional",
    body:
      `You confirm you hold a current, unrestricted licence to practise in the state where each person you see is located, that you carry your own malpractice insurance, and that you practise independently of ${BRAND.name}.`,
  },
  {
    heading: "Your records are yours",
    body:
      `Notes you write here are visible only to you. ${BRAND.name} is not your records system of record and is not a covered entity or business associate for your practice — keep your own compliant record and release it to clients on request.`,
  },
  {
    heading: "Scope and referral",
    body:
      "Only accept people whose needs fall inside your scope and licence. Refer out or escalate when care exceeds what a session here can hold, and follow your own crisis protocol.",
  },
  {
    heading: "Confidentiality and mandated reporting",
    body:
      "Hold everything shared in confidence, and follow your state's mandated reporting and duty-to-warn obligations without waiting for anyone here to tell you to.",
  },
  {
    heading: "No recording, no outside use",
    body:
      "Do not record sessions, and do not use anything a person shares here for marketing, teaching or research.",
  },
  {
    heading: "Agreement",
    body:
      `By typing your name you accept these terms, and you agree that ${BRAND.name} does not employ or supervise you and is not liable for the care you provide.`,
  },
];

export function clausesFor(party: "client" | "therapist"): AgreementClause[] {
  return party === "therapist" ? THERAPIST_CLAUSES : CLIENT_CLAUSES;
}
