import { createServerFn } from "@tanstack/react-start";
import { requireExistingPrivilegedReader } from "./reader-capability.server";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { SUBSCRIPTION_TABLES, subscriptionKind, stopOwnSession, performOwnRecurringStop, StopRecordUpdateError, type RecurringStopRecord, type StopItem, type SubscriptionKind } from "./own-controls";

const uuid = (value: string) => {
  if (!/^[0-9a-fA-F-]{36}$/.test(value)) throw new Error("Invalid item.");
};
export const listOwnStops = createServerFn({ method: "GET" }).middleware([requireSupabaseAuth])
  .inputValidator((data: { accountId: string }) => { uuid(data.accountId); return data; })
  .handler(async ({ context, data }): Promise<{ items: StopItem[]; errors: string[] }> => {
    const { supabase, userId } = context;
    if (data.accountId !== userId) throw new Error("Account changed. Reload controls for the current account.");
    const items: StopItem[] = [];
    const errors: string[] = [];
    const { data: sessions, error } = await supabase.from("therapy_sessions")
      .select("id,status,starts_at,client_id,therapist_id")
      .or(`client_id.eq.${userId},therapist_id.eq.${userId}`).in("status", ["booked", "in_progress"]);
    if (error) errors.push("Session controls could not be loaded. Retry or contact support.");
    else for (const row of sessions ?? []) {
      if ([row.client_id, row.therapist_id].includes(userId))
        items.push({ id: row.id, kind: "session", status: row.status, startsAt: row.starts_at });
    }
    await Promise.all((Object.keys(SUBSCRIPTION_TABLES) as SubscriptionKind[]).map(async kind => {
      const table = SUBSCRIPTION_TABLES[kind];
      let query = supabase.from(table)
        .select(kind === "organization" || kind === "professional" ? "id,status" : "id,status,canceled_at")
        .not("stripe_subscription_id", "is", null);
      if (kind === "organization") {
        const { data: memberships, error } = await supabase.from("organization_members")
          .select("org_id").eq("user_id", userId).in("role", ["owner", "leader"]);
        if (error) { errors.push("Organization stop controls could not be loaded."); return; }
        const ids = (memberships ?? []).map(row => row.org_id);
        if (!ids.length) return;
        query = query.in("org_id", ids);
      } else query = query.filter("user_id", "eq", userId);
      const { data, error } = await query;
      if (error) { errors.push(`${kind} stop controls could not be loaded. Retry or contact support.`); return; }
      const rows = data as unknown as Array<{ id: string; status: string; canceled_at?: string | null }>;
      for (const row of rows ?? []) if (!["canceled", "cancelled"].includes(row.status) && !row.canceled_at)
        items.push({ id: row.id, kind, status: row.status });
    }));
    return { items, errors };
  });

export const stopOwnItem = createServerFn({ method: "POST" }).middleware([requireSupabaseAuth])
  .inputValidator((data: { id: string; kind: string; accountId: string }) => {
    uuid(data.id);
    uuid(data.accountId);
    if (data.kind !== "session") subscriptionKind(data.kind);
    return data;
  })
  .handler(async ({ data, context }): Promise<{ ok: true; message: string } | { error: string }> => {
    const { supabase, userId } = context;
    try {
      if (data.accountId !== userId) throw new Error("Account changed. Reload controls.");
      if (data.kind === "session") {
        await stopOwnSession(userId, data.id, async () => {
          const { data: row, error } = await supabase.from("therapy_sessions")
            .select("id,client_id,therapist_id,status").eq("id", data.id).maybeSingle();
          if (error) throw new Error("Session ownership could not be checked. Please retry.");
          return row;
        }, async () => {
          const { data: changed, error } = await supabase.from("therapy_sessions")
            .update({ status: "cancelled" }).eq("id", data.id)
            .in("status", ["booked", "in_progress"]).select("id").maybeSingle();
          if (error || !changed) throw new Error("Cancellation was not confirmed. Refresh and retry; records have not been deleted.");
        });
        return { ok: true, message: "Session cancellation confirmed. Existing records remain." };
      }
      const kind = subscriptionKind(data.kind);
      const table = SUBSCRIPTION_TABLES[kind];
      const { data: raw, error } = await supabase.from(table)
        .select(kind === "organization" ? "id,org_id,status,environment,stripe_subscription_id" : "id,user_id,status,environment,stripe_subscription_id")
        .eq("id", data.id).maybeSingle();
      if (error || !raw) throw new Error("Recurring item ownership could not be checked. Please retry.");
      const row = raw as unknown as RecurringStopRecord;
      let managers: string[] = [];
      if (row.org_id) {
        const { data: membership, error } = await supabase.from("organization_members")
          .select("role").eq("org_id", row.org_id).eq("user_id", userId).maybeSingle();
        if (error) throw new Error("Organization authorization could not be checked. Retry.");
        if (membership && ["owner", "leader"].includes(membership.role)) managers = [userId];
      }
      const periodEnd = kind === "professional" || kind === "organization";
      await performOwnRecurringStop(userId, row, managers, async canonical => {
        // Acquire existing dependencies BEFORE touching the provider. No new permissions/keys.
        requireExistingPrivilegedReader();
        const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
        const { createStripeClient } = await import("./stripe.server");
        const stripe = createStripeClient(canonical.environment);
        return {
          stop: async () => {
            const subscription = await stripe.subscriptions.retrieve(canonical.stripe_subscription_id);
            if (subscription.status === "canceled") return;
            if (periodEnd) {
              if (!subscription.cancel_at_period_end) await stripe.subscriptions.update(subscription.id, { cancel_at_period_end: true });
            } else await stripe.subscriptions.cancel(subscription.id);
          },
          save: async () => {
            const saved = kind === "professional" || kind === "organization"
              ? await supabaseAdmin.from(SUBSCRIPTION_TABLES[kind]).update({ status: "canceled" }).eq("id", canonical.id).select("id").maybeSingle()
              : await supabaseAdmin.from(SUBSCRIPTION_TABLES[kind])
                .update(canonical.status === "paid" ? { canceled_at: new Date().toISOString() } : { status: "canceled" }).eq("id", canonical.id).select("id").maybeSingle();
            return !saved.error && !!saved.data;
          },
        };
      });
      return { ok: true, message: periodEnd ? "Renewal stopped at the end of the current billing period. Existing records and prior charges remain." : "Recurring gift stopped. Existing records and prior gifts remain." };
    } catch (error) {
      if (error instanceof StopRecordUpdateError) return { error: error.message };
      // No provider bodies/credentials or internal error messages to the browser/logs.
      return { error: "The stop could not be confirmed. Retry loading your controls or contact support@witnessmovement.com. Authentication, ownership or an existing backend/payment dependency may be unavailable." };
    }
  });
