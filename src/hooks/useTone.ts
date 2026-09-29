import { usePrefs } from "@/hooks/usePrefs";
import { say, toneFor, type Tone } from "@/lib/tone";

/** The words for this person, plus a helper for one-off lines. */
export function useTone(): Tone & { say: (faith: string, plain: string) => string } {
  const { prefs } = usePrefs();
  const tone = toneFor(prefs);
  return { ...tone, say: (f, p) => say(tone, f, p) };
}
