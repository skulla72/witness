import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

/** Everything this account holds, in one plain bundle the person can keep. */
export const exportMyData = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase, userId, claims } = context;

    const [profile, survey, gifts, orders, memberships, groups, prayerRequests] =
      await Promise.all([
        supabase.from("profiles").select("*").eq("user_id", userId).maybeSingle(),
        supabase.from("user_survey").select("*").eq("user_id", userId).maybeSingle(),
        supabase.from("donations").select("*").eq("user_id", userId),
        supabase.from("store_orders").select("*, store_order_items(*)").eq("user_id", userId),
        supabase.from("organization_members").select("*").eq("user_id", userId),
        supabase.from("group_members").select("*").eq("user_id", userId),
        supabase.from("organization_prayer_requests").select("*").eq("user_id", userId),
      ]);

    return {
      exported_at: new Date().toISOString(),
      account: { id: userId, email: (claims as { email?: string })?.email ?? null },
      profile: profile.data ?? null,
      how_this_app_is_shaped: survey.data ?? null,
      giving: gifts.data ?? [],
      orders: orders.data ?? [],
      organizations: memberships.data ?? [],
      groups: groups.data ?? [],
      prayer_requests: prayerRequests.data ?? [],
    };
  });

/** Delete this account for good. Records that must stay for money reasons keep no name. */
export const deleteMyAccount = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }): Promise<{ ok: true } | { error: string }> => {
    const { userId } = context;
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    // Gifts and orders are financial records: they stay, stripped of who gave.
    await supabaseAdmin
      .from("donations")
      .update({ user_id: null, donor_name: null, email: null, note: "" })
      .eq("user_id", userId);
    await supabaseAdmin.from("store_orders").update({ user_id: null }).eq("user_id", userId);
    await supabaseAdmin
      .from("organization_prayer_requests")
      .delete()
      .eq("user_id", userId);
    await supabaseAdmin.from("group_members").delete().eq("user_id", userId);
    await supabaseAdmin.from("organization_members").delete().eq("user_id", userId);
    await supabaseAdmin.from("user_survey").delete().eq("user_id", userId);
    await supabaseAdmin.from("profiles").delete().eq("user_id", userId);

    const { error } = await supabaseAdmin.auth.admin.deleteUser(userId);
    if (error) return { error: "We couldn't finish deleting the account. Try again." };
    return { ok: true };
  });
