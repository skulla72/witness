import { createHash, timingSafeEqual } from "node:crypto";

export function matchesCronCredential(given: string, candidates: Array<string | undefined | null>) {
  const digest = (value: string) => createHash("sha256").update(value).digest();
  const supplied = digest(given);
  let valid = false;
  for (const candidate of candidates) {
    const matches = timingSafeEqual(supplied, digest(candidate ?? ""));
    valid = (Boolean(given && candidate) && matches) || valid;
  }
  return valid;
}

/** Staged rotation: new credential + previous/legacy overlap until verified. */
export async function checkScheduledCredential(given: string) {
  if (!given) return false;
  const current = process.env.LOVABLE_CRON_SECRET;
  const previous = process.env.LOVABLE_CRON_SECRET_PREVIOUS;
  if (matchesCronCredential(given, [current, previous])) return true;
  // Default keeps existing live jobs working. Explicitly disable ONLY after
  // reminders and payouts have both been checked with the replacement.
  if (process.env.WITNESS_CRON_ALLOW_LEGACY === "false") return false;
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const { data, error } = await supabaseAdmin.from("reminder_cron_key")
    .select("key").order("id").limit(1).maybeSingle();
  if (error) return false;
  return matchesCronCredential(given, [data?.key]);
}
