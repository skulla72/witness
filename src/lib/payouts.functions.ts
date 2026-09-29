import { createServerFn } from "@tanstack/react-start";
import { assertReturnUrl } from "@/lib/returnUrl";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { type StripeEnv, getStripeErrorMessage } from "@/lib/stripe.server";

const UUID = /^[0-9a-fA-F-]{36}$/;

export interface PayoutState {
  connected: boolean;
  status: "none" | "onboarding" | "in_review" | "ready";
  payoutsEnabled: boolean;
  blockedReason: string | null;
  owedCents: number;
  paidCents: number;
  connectAvailable: boolean;
}

type Owner = { orgId?: string | undefined; userId?: string | undefined };

async function guard(
  scope: { orgId?: string | undefined },
  userId: string,
): Promise<{ owner: Owner } | { error: string }> {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  if (!scope.orgId) return { owner: { userId } };
  const { data: member } = await supabaseAdmin
    .from("organization_members")
    .select("role")
    .eq("org_id", scope.orgId)
    .eq("user_id", userId)
    .in("role", ["owner", "leader"])
    .maybeSingle();
  if (!member) return { error: "Only an owner or leader can set up where money lands." };
  return { owner: { orgId: scope.orgId } };
}

/** What's owed and what's already gone out, for one organization or one person. */
export const payoutState = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: { orgId?: string; environment: StripeEnv }) => {
    if (data.orgId && !UUID.test(data.orgId)) throw new Error("Invalid organization");
    return data;
  })
  .handler(async ({ data, context }): Promise<PayoutState | { error: string }> => {
    const allowed = await guard({ orgId: data.orgId }, context.userId);
    if ("error" in allowed) return allowed;
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { findAccount } = await import("@/lib/payouts.server");
    const account = await findAccount(allowed.owner, data.environment);

    let owedCents = 0;
    if (allowed.owner.orgId) {
      const { data: rows } = await supabaseAdmin
        .from("donations")
        .select("recipient_cents")
        .eq("org_id", allowed.owner.orgId)
        .eq("environment", data.environment)
        .eq("status", "paid")
        .neq("payout_status", "paid");
      owedCents = (rows ?? []).reduce((total, r) => total + (r.recipient_cents ?? 0), 0);
    } else {
      const { data: rows } = await supabaseAdmin
        .from("job_funds")
        .select("worker_balance_cents")
        .eq("worker_id", context.userId)
        .eq("environment", data.environment)
        .neq("payout_status", "paid");
      owedCents = (rows ?? []).reduce((total, r) => total + (r.worker_balance_cents ?? 0), 0);
    }

    let paidQuery = supabaseAdmin
      .from("payout_transfers")
      .select("amount_cents")
      .eq("environment", data.environment)
      .eq("status", "paid");
    paidQuery = allowed.owner.orgId
      ? paidQuery.eq("org_id", allowed.owner.orgId)
      : paidQuery.eq("user_id", context.userId);
    const { data: paidRows } = await paidQuery;

    return {
      connected: !!account,
      status: (account?.status as PayoutState["status"]) ?? "none",
      payoutsEnabled: account?.payouts_enabled ?? false,
      blockedReason: account?.disabled_reason ?? null,
      owedCents,
      paidCents: (paidRows ?? []).reduce((total, r) => total + (r.amount_cents ?? 0), 0),
      connectAvailable: true,
    };
  });

/** Opens the provider's own setup so a recipient can add their bank account. */
export const startPayoutSetup = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: { orgId?: string; returnUrl: string; environment: StripeEnv }) => {
    data.returnUrl = assertReturnUrl(data.returnUrl);
    if (data.orgId && !UUID.test(data.orgId)) throw new Error("Invalid organization");
    return data;
  })
  .handler(async ({ data, context }): Promise<{ url: string } | { error: string }> => {
    const allowed = await guard({ orgId: data.orgId }, context.userId);
    if ("error" in allowed) return allowed;
    const { ensureAccount, onboardingLink, isConnectUnavailable, CONNECT_OFF_MESSAGE } =
      await import("@/lib/payouts.server");

    try {
      const {
        data: { user },
      } = await context.supabase.auth.getUser();

      // Prefill everything we already know so the setup screens stay short.
      let details: {
        name?: string;
        url?: string;
        phone?: string;
        city?: string;
        state?: string;
      } = {};
      if (allowed.owner.orgId) {
        const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
        const { data: org } = await supabaseAdmin
          .from("organizations")
          .select("name, website, contact_phone, city, region")
          .eq("id", allowed.owner.orgId)
          .maybeSingle();
        if (org) {
          details = {
            ...(org.name ? { name: org.name } : {}),
            ...(org.website ? { url: org.website } : {}),
            ...(org.contact_phone ? { phone: org.contact_phone } : {}),
            ...(org.city ? { city: org.city } : {}),
            ...(org.region ? { state: org.region } : {}),
          };
        }
      }

      const account = await ensureAccount(
        { ...allowed.owner, email: user?.email ?? undefined, ...details },
        data.environment,
        context.userId,
      );
      const url = await onboardingLink(account.stripe_account_id, data.environment, {
        returnUrl: data.returnUrl,
        refreshUrl: data.returnUrl,
      });
      return { url };
    } catch (error) {
      if (isConnectUnavailable(error)) return { error: CONNECT_OFF_MESSAGE };
      return { error: getStripeErrorMessage(error) };
    }
  });

/**
 * Called when someone comes back from setup: refreshes their state and sends
 * anything already owed to them.
 */
export const finishPayoutSetup = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: { orgId?: string; environment: StripeEnv }) => {
    if (data.orgId && !UUID.test(data.orgId)) throw new Error("Invalid organization");
    return data;
  })
  .handler(
    async ({ data, context }): Promise<{ ready: boolean; paidCents: number } | { error: string }> => {
      const allowed = await guard({ orgId: data.orgId }, context.userId);
      if ("error" in allowed) return allowed;
      const { findAccount, syncAccount, runDuePayouts, isConnectUnavailable, CONNECT_OFF_MESSAGE } =
        await import("@/lib/payouts.server");

      try {
        const existing = await findAccount(allowed.owner, data.environment);
        if (!existing) return { ready: false, paidCents: 0 };
        const fresh = await syncAccount(existing.stripe_account_id, data.environment);
        if (!fresh?.payouts_enabled) return { ready: false, paidCents: 0 };
        const run = await runDuePayouts(data.environment, allowed.owner);
        return { ready: true, paidCents: run.paidCents };
      } catch (error) {
        if (isConnectUnavailable(error)) return { error: CONNECT_OFF_MESSAGE };
        return { error: getStripeErrorMessage(error) };
      }
    },
  );
