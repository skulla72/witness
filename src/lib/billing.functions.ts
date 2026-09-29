import { createServerFn } from "@tanstack/react-start";
import {
  type StripeEnv,
  createStripeClient,
  getStripeErrorMessage,
} from "@/lib/stripe.server";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

const UUID = /^[0-9a-fA-F-]{36}$/;

export interface BillingLine {
  id: string;
  plan: string;
  status: string;
  amountCents: number;
  currentPeriodEnd: string | null;
  hasSubscription: boolean;
}

export interface BillingCharge {
  id: string;
  amountCents: number;
  status: string;
  paidAt: string | null;
  url: string | null;
}

export interface BillingSummary {
  lines: BillingLine[];
  monthlyCents: number;
  nextChargeAt: string | null;
  charges: BillingCharge[];
  chargesNote: string | null;
}

/** What an organization owes each month, and what has already been charged. Leaders only. */
export const orgBilling = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: { orgId: string; environment: StripeEnv }) => {
    if (!UUID.test(data.orgId)) throw new Error("Invalid organization");
    return data;
  })
  .handler(async ({ data, context }): Promise<BillingSummary | { error: string }> => {
    const { supabase, userId } = context;

    const { data: membership } = await supabase
      .from("organization_members")
      .select("role")
      .eq("org_id", data.orgId)
      .eq("user_id", userId)
      .maybeSingle();
    if (!membership || !["owner", "leader"].includes(membership.role)) {
      return { error: "Only leaders of this organization can see billing." };
    }

    const { data: rows } = await supabase
      .from("org_subscriptions")
      .select("id, plan, status, amount_cents, current_period_end, stripe_subscription_id")
      .eq("org_id", data.orgId)
      .eq("environment", data.environment)
      .order("created_at", { ascending: false });

    const live = (rows ?? []).filter(r => r.status === "active" || r.status === "past_due");

    const lines: BillingLine[] = (rows ?? [])
      .filter(r => r.status !== "pending" && r.status !== "failed")
      .map(r => ({
        id: r.id,
        plan: r.plan,
        status: r.status,
        amountCents: r.amount_cents ?? 0,
        currentPeriodEnd: r.current_period_end ?? null,
        hasSubscription: !!r.stripe_subscription_id,
      }));

    const monthlyCents = live.reduce((sum, r) => sum + (r.amount_cents ?? 0), 0);
    const ends = live
      .map(r => r.current_period_end)
      .filter((d): d is string => !!d)
      .sort();
    const nextChargeAt = ends[0] ?? null;

    let charges: BillingCharge[] = [];
    let chargesNote: string | null = null;
    const subIds = live.map(r => r.stripe_subscription_id).filter((s): s is string => !!s);

    if (subIds.length) {
      try {
        const stripe = createStripeClient(data.environment);
        const lists = await Promise.all(
          subIds.map(id => stripe.invoices.list({ subscription: id, limit: 12 })),
        );
        charges = lists
          .flatMap(l => l.data)
          .map(inv => ({
            id: inv.id ?? "",
            amountCents: inv.amount_paid ?? 0,
            status: inv.status ?? "unknown",
            paidAt: inv.created ? new Date(inv.created * 1000).toISOString() : null,
            url: inv.hosted_invoice_url ?? null,
          }))
          .sort((a, b) => (b.paidAt ?? "").localeCompare(a.paidAt ?? ""))
          .slice(0, 12);
      } catch (error) {
        chargesNote = getStripeErrorMessage(error);
      }
    }

    return { lines, monthlyCents, nextChargeAt, charges, chargesNote };
  });
