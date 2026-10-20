import { supabase } from "@/integrations/supabase/client";
import { disablePush } from "@/lib/push";
import { setJournalAccount } from "@/lib/journal";
import { signedMediaCache } from "@/lib/signed-media-cache";

/** Device token cleanup happens while the old account is still authenticated. */
export async function signOutWitness() {
  try { await disablePush(); }
  catch { throw new Error("Could not disconnect this device's notifications. Try again before switching accounts."); }
  const { error } = await supabase.auth.signOut();
  if (error) throw error;
  signedMediaCache.setAccount(null, true);
  setJournalAccount(null);
}
