import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/integrations/supabase/types";

type Admin = SupabaseClient<Database>;

/** Can this person run the job on this need — the poster, the church leader, or an admin? */
export async function canManageNeed(admin: Admin, needId: string, userId: string): Promise<boolean> {
  const { data: need } = await admin
    .from("needs")
    .select("posted_by, org_id")
    .eq("id", needId)
    .maybeSingle();
  if (!need) return false;
  if (need.posted_by === userId) return true;
  if (need.org_id) {
    const { data: member } = await admin
      .from("organization_members")
      .select("role")
      .eq("org_id", need.org_id)
      .eq("user_id", userId)
      .in("role", ["owner", "leader"])
      .maybeSingle();
    if (member) return true;
  }
  return isAdmin(admin, userId);
}

export async function isAdmin(admin: Admin, userId: string): Promise<boolean> {
  const { data } = await admin
    .from("user_roles")
    .select("role")
    .eq("user_id", userId)
    .eq("role", "admin")
    .maybeSingle();
  return !!data;
}

/** Witness's share of a pooled job, rounded down to the cent. */
export function feeCents(raisedCents: number, bps: number): number {
  return Math.floor((raisedCents * bps) / 10_000);
}
