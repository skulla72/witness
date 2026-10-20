import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/integrations/supabase/types";

export async function finishAccountDeletion(client: SupabaseClient<Database>, userId: string, preflight: boolean) {
  // Deliberately use the API rather than auth.admin.deleteUser: all relational
  // cleanup and financial anonymization must commit in one DB transaction.
  const result = await client.rpc("witness_delete_account", { target_user: userId, preflight });
  if (result.error) throw new Error("Account deletion is unavailable or blocked.");
}
