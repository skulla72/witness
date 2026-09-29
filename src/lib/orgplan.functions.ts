import { createServerFn } from "@tanstack/react-start";
import { assertReturnUrl } from "@/lib/returnUrl";
import {
  type StripeEnv,
  createStripeClient,
  getStripeErrorMessage,
  resolveOrCreateCustomer,
} from "@/lib/stripe.server";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { PAYMENT_CATALOG } from "@/lib/paymentCatalog";

/** Hosting a page is a service, not a charitable gift. */
const TAX_CODE = "txcd_10103001";
const UUID = /^[0-9a-fA-F-]{36}$/;

const PLANS: Record<string, { name: string; priceId: string; cents: number }> = PAYMENT_CATALOG.organization;

interface PlanInput {
  orgId: string;
  plan: string;
  returnUrl: string;
  environment: StripeEnv;
  email?: string;
}

type PlanResult = { clientSecret: string } | { error: string };

/** Starts a monthly plan for an organization. Leaders only. */
export const createPlanCheckout = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: PlanInput) => {
    data.returnUrl = assertReturnUrl(data.returnUrl);
    if (!UUID.test(data.orgId)) throw new Error("Invalid organization");
    if (!PLANS[data.plan]) throw new Error("Invalid plan");
    return data;
  })
  .handler(async ({ data, context }): Promise<PlanResult> => {
    const { supabase, userId } = context;
    const plan = PLANS[data.plan]!;

    const { data: membership } = await supabase
      .from("organization_members")
      .select("role")
      .eq("org_id", data.orgId)
      .eq("user_id", userId)
      .maybeSingle();
    if (!membership || !["owner", "leader"].includes(membership.role)) {
      return { error: "Only leaders of this organization can start a plan." };
    }

    const { data: org } = await supabase
      .from("organizations")
      .select("id, name, slug")
      .eq("id", data.orgId)
      .maybeSingle();
    if (!org) return { error: "We couldn't find that organization." };

    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: row, error: rowError } = await supabaseAdmin
      .from("org_subscriptions")
      .upsert(
        {
          org_id: data.orgId,
          plan: data.plan,
          environment: data.environment,
          status: "pending",
          price_id: plan.priceId,
          amount_cents: plan.cents,
          started_by: userId,
        },
        { onConflict: "org_id,plan,environment" },
      )
      .select("id")
      .single();
    if (rowError || !row) return { error: "We couldn't start this plan. Try again." };

    try {
      const stripe = createStripeClient(data.environment);

      // The catalog price is the source of truth; an inline price is the fallback.
      let priceId: string | null = null;
      const found = await stripe.prices.list({ lookup_keys: [plan.priceId], limit: 1 });
      priceId = found.data[0]?.id ?? null;

      const customerId = await resolveOrCreateCustomer(stripe, {
        email: data.email,
        userId,
      });

      const session = await stripe.checkout.sessions.create({
        mode: "subscription",
        ui_mode: "embedded_page",
        return_url: data.returnUrl,
        line_items: [
          priceId
            ? { quantity: 1, price: priceId }
            : {
                quantity: 1,
                price_data: {
                  currency: "usd",
                  unit_amount: plan.cents,
                  recurring: { interval: "month" as const },
                  product_data: { name: `${plan.name} — ${org.name}`, tax_code: TAX_CODE },
                },
              },
        ],
        ...(customerId
          ? { customer: customerId, customer_update: { name: "auto" as const } }
          : data.email
            ? { customer_email: data.email }
            : {}),
        subscription_data: {
          description: `${plan.name} — ${org.name}`,
          metadata: { orgPlanId: row.id, orgId: org.id, plan: data.plan },
        },
        metadata: { orgPlanId: row.id, orgId: org.id, plan: data.plan },
      });

      await supabaseAdmin
        .from("org_subscriptions")
        .update({ stripe_session_id: session.id, stripe_customer_id: customerId ?? null })
        .eq("id", row.id);

      return { clientSecret: session.client_secret ?? "" };
    } catch (error) {
      await supabaseAdmin.from("org_subscriptions").update({ status: "failed" }).eq("id", row.id);
      return { error: getStripeErrorMessage(error) };
    }
  });

/** Ends a plan at the end of the month it's paid through. Leaders only. */
export const cancelPlan = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: { planRowId: string; environment: StripeEnv }) => {
    if (!UUID.test(data.planRowId)) throw new Error("Invalid plan");
    return data;
  })
  .handler(async ({ data, context }): Promise<{ ok: true } | { error: string }> => {
    const { supabase, userId } = context;

    const { data: row } = await supabase
      .from("org_subscriptions")
      .select("id, org_id, stripe_subscription_id")
      .eq("id", data.planRowId)
      .maybeSingle();
    if (!row) return { error: "We couldn't find that plan." };

    const { data: membership } = await supabase
      .from("organization_members")
      .select("role")
      .eq("org_id", row.org_id)
      .eq("user_id", userId)
      .maybeSingle();
    if (!membership || !["owner", "leader"].includes(membership.role)) {
      return { error: "Only leaders of this organization can change a plan." };
    }

    try {
      if (row.stripe_subscription_id) {
        const stripe = createStripeClient(data.environment);
        await stripe.subscriptions.update(row.stripe_subscription_id, { cancel_at_period_end: true });
      }
      const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
      await supabaseAdmin.from("org_subscriptions").update({ status: "canceled" }).eq("id", row.id);
      return { ok: true };
    } catch (error) {
      return { error: getStripeErrorMessage(error) };
    }
  });
