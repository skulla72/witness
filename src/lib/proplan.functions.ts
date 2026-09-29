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

/** Carrying a page is a service, not a charitable gift. */
const TAX_CODE = "txcd_10103001";
const UUID = /^[0-9a-fA-F-]{36}$/;

const PRO_PLAN = PAYMENT_CATALOG.professional.page;

interface StartInput {
  proId: string;
  returnUrl: string;
  environment: StripeEnv;
  email?: string;
}

type StartResult = { clientSecret: string } | { error: string };

export interface ProBillingLine {
  id: string;
  status: string;
  amountCents: number;
  currentPeriodEnd: string | null;
}

export interface ProBillingCharge {
  id: string;
  amountCents: number;
  status: string;
  paidAt: string | null;
  url: string | null;
}

export interface ProBillingSummary {
  line: ProBillingLine | null;
  monthlyCents: number;
  charges: ProBillingCharge[];
  chargesNote: string | null;
}

/** Starts the small monthly fee that keeps a professional page active. Owner only. */
export const startProPlan = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: StartInput) => {
    data.returnUrl = assertReturnUrl(data.returnUrl);
    if (!UUID.test(data.proId)) throw new Error("Invalid page");
    return data;
  })
  .handler(async ({ data, context }): Promise<StartResult> => {
    const { supabase, userId } = context;

    const { data: pro } = await supabase
      .from("pro_profiles")
      .select("id, display_name, user_id")
      .eq("id", data.proId)
      .maybeSingle();
    if (!pro) return { error: "We couldn't find that page." };
    if (pro.user_id !== userId) return { error: "Only the person who owns this page can pay for it." };

    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: row, error: rowError } = await supabaseAdmin
      .from("pro_subscriptions")
      .upsert(
        {
          pro_id: pro.id,
          user_id: userId,
          plan: "pro_page",
          environment: data.environment,
          status: "pending",
          price_id: PRO_PLAN.priceId,
          amount_cents: PRO_PLAN.cents,
        },
        { onConflict: "pro_id,plan,environment" },
      )
      .select("id")
      .single();
    if (rowError || !row) return { error: "We couldn't start this. Try again." };

    try {
      const stripe = createStripeClient(data.environment);

      const found = await stripe.prices.list({ lookup_keys: [PRO_PLAN.priceId], limit: 1 });
      const priceId = found.data[0]?.id ?? null;

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
                  unit_amount: PRO_PLAN.cents,
                  recurring: { interval: "month" as const },
                  product_data: { name: PRO_PLAN.name, tax_code: TAX_CODE },
                },
              },
        ],
        ...(customerId
          ? { customer: customerId, customer_update: { name: "auto" as const } }
          : data.email
            ? { customer_email: data.email }
            : {}),
        subscription_data: {
          description: `${PRO_PLAN.name} — ${pro.display_name}`,
          metadata: { proPlanId: row.id, proId: pro.id, plan: "pro_page" },
        },
        metadata: { proPlanId: row.id, proId: pro.id, plan: "pro_page" },
      });

      await supabaseAdmin
        .from("pro_subscriptions")
        .update({ stripe_session_id: session.id, stripe_customer_id: customerId ?? null })
        .eq("id", row.id);

      return { clientSecret: session.client_secret ?? "" };
    } catch (error) {
      await supabaseAdmin.from("pro_subscriptions").update({ status: "failed" }).eq("id", row.id);
      return { error: getStripeErrorMessage(error) };
    }
  });

/** Ends the fee at the end of the month already paid for. Owner only. */
export const cancelProPlan = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: { planRowId: string; environment: StripeEnv }) => {
    if (!UUID.test(data.planRowId)) throw new Error("Invalid plan");
    return data;
  })
  .handler(async ({ data, context }): Promise<{ ok: true } | { error: string }> => {
    const { supabase, userId } = context;

    const { data: row } = await supabase
      .from("pro_subscriptions")
      .select("id, user_id, stripe_subscription_id")
      .eq("id", data.planRowId)
      .maybeSingle();
    if (!row) return { error: "We couldn't find that." };
    if (row.user_id !== userId) return { error: "Only the person who owns this page can change it." };

    try {
      if (row.stripe_subscription_id) {
        const stripe = createStripeClient(data.environment);
        await stripe.subscriptions.update(row.stripe_subscription_id, {
          cancel_at_period_end: true,
        });
      }
      const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
      await supabaseAdmin.from("pro_subscriptions").update({ status: "canceled" }).eq("id", row.id);
      return { ok: true };
    } catch (error) {
      return { error: getStripeErrorMessage(error) };
    }
  });

/** What a professional pays each month, and what has already been charged. Owner only. */
export const proBilling = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: { proId: string; environment: StripeEnv }) => {
    if (!UUID.test(data.proId)) throw new Error("Invalid page");
    return data;
  })
  .handler(async ({ data, context }): Promise<ProBillingSummary | { error: string }> => {
    const { supabase, userId } = context;

    const { data: pro } = await supabase
      .from("pro_profiles")
      .select("id, user_id")
      .eq("id", data.proId)
      .maybeSingle();
    if (!pro || pro.user_id !== userId) {
      return { error: "Only the person who owns this page can see its payments." };
    }

    const { data: rows } = await supabase
      .from("pro_subscriptions")
      .select("id, status, amount_cents, current_period_end, stripe_subscription_id")
      .eq("pro_id", data.proId)
      .eq("environment", data.environment)
      .order("created_at", { ascending: false });

    const row = (rows ?? []).find(r => r.status !== "pending" && r.status !== "failed") ?? null;
    const live = row && (row.status === "active" || row.status === "past_due");

    let charges: ProBillingCharge[] = [];
    let chargesNote: string | null = null;

    if (row?.stripe_subscription_id) {
      try {
        const stripe = createStripeClient(data.environment);
        const list = await stripe.invoices.list({
          subscription: row.stripe_subscription_id,
          limit: 12,
        });
        charges = list.data.map(inv => ({
          id: inv.id ?? "",
          amountCents: inv.amount_paid ?? 0,
          status: inv.status ?? "unknown",
          paidAt: inv.created ? new Date(inv.created * 1000).toISOString() : null,
          url: inv.hosted_invoice_url ?? null,
        }));
      } catch (error) {
        chargesNote = getStripeErrorMessage(error);
      }
    }

    return {
      line: row
        ? {
            id: row.id,
            status: row.status,
            amountCents: row.amount_cents ?? 0,
            currentPeriodEnd: row.current_period_end ?? null,
          }
        : null,
      monthlyCents: live ? (row.amount_cents ?? 0) : 0,
      charges,
      chargesNote,
    };
  });
