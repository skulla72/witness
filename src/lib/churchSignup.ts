/**
 * A church starts on the films page, writes down who they are and what they
 * need, and then has to make an account. We hold their words in the browser
 * (never on our side) so nothing has to be typed twice once they're in.
 */
const KEY = "witness.church-signup.v1";

export type ChurchSignupDraft = {
  name: string;
  city: string;
  region: string;
  lane: string;
  need: string;
};

export function saveChurchDraft(draft: ChurchSignupDraft) {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(KEY, JSON.stringify(draft));
  } catch {
    // A full or blocked store just means they retype it. Not worth a warning.
  }
}

export function readChurchDraft(): ChurchSignupDraft | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Partial<ChurchSignupDraft>;
    if (!parsed || typeof parsed.name !== "string") return null;
    return {
      name: parsed.name ?? "",
      city: typeof parsed.city === "string" ? parsed.city : "",
      region: typeof parsed.region === "string" ? parsed.region : "",
      lane: typeof parsed.lane === "string" ? parsed.lane : "",
      need: typeof parsed.need === "string" ? parsed.need : "",
    };
  } catch {
    return null;
  }
}

export function clearChurchDraft() {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.removeItem(KEY);
  } catch {
    // ignore
  }
}
