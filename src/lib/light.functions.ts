import { createServerFn } from "@tanstack/react-start";
import { assertReturnUrl } from "@/lib/returnUrl";
import {
  type StripeEnv,
  bankCheckoutExtras,
  createStripeClient,
  getStripeErrorMessage,
  resolveOrCreateCustomer,
} from "@/lib/stripe.server";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { assertLightAmountCents } from "@/lib/amounts";
import { BRAND } from "@/config/brand";
import { isPayMethod, type PayMethod } from "@/lib/fees";

export type LightFrequency = "once" | "monthly";

interface LightInput {
  amountCents: number;
  frequency: LightFrequency;
  returnUrl: string;
  environment: StripeEnv;
  email?: string;
  donorName?: string;
  note?: string;
  payMethod?: PayMethod;
}

type LightResult = { clientSecret: string } | { error: string };

/** General digital service — a gift to Witness itself is not a charitable donation. */
const TAX_CODE = "txcd_10000000";

/**
 * A gift to Witness itself — "keeping the light lit". It goes to the company
 * that runs the app, never to a nonprofit, and is never tax-deductible.
 */
export const createLightGift = createServerFn({ method: "POST" })
  .inputValidator((data: LightInput) => {
    data.returnUrl = assertReturnUrl(data.returnUrl);
    data.amountCents = assertLightAmountCents(data.amountCents);
    if (data.amountCents % 100 !== 0) throw new Error("Choose a whole-dollar amount");
    if (data.frequency !== "once" && data.frequency !== "monthly") throw new Error("Invalid gift type");
    if (data.note && data.note.length > 300) throw new Error("Note is too long");
    if (data.donorName && data.donorName.length > 80) throw new Error("Name is too long");
    if (data.payMethod !== undefined && !isPayMethod(data.payMethod)) throw new Error("Choose card or bank transfer");
    return data;
  })
  .handler(async ({ data }): Promise<LightResult> => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { getOptionalUserId } = await import("@/lib/optional-auth.server");
    // Identity comes from the verified session only — never from the request body.
    const userId = await getOptionalUserId();
    if (!userId) return { error: "Please sign in to give." };

    const payMethod: PayMethod = data.payMethod ?? "card";
    const { data: gift, error: insertError } = await supabaseAdmin
      .from("witness_gifts")
      .insert({
        user_id: userId,
        email: data.email ?? null,
        donor_name: data.donorName ?? null,
        note: data.note ?? "",
        amount_cents: data.amountCents,
        frequency: data.frequency,
        status: "pending",
        environment: data.environment,
        pay_method: payMethod,
      })
      .select("id")
      .single();
    if (insertError || !gift) return { error: "We couldn't start this gift. Try again." };

    try {
      const stripe = createStripeClient(data.environment);
      const recurring = data.frequency === "monthly";
      const customerId = await resolveOrCreateCustomer(stripe, {
        email: data.email,
        userId: userId ?? undefined,
      });
      const label = recurring ? `Monthly gift — ${BRAND.name}` : `Gift — ${BRAND.name}`;

      const session = await stripe.checkout.sessions.create({
        mode: recurring ? "subscription" : "payment",
        ui_mode: "embedded_page",
        return_url: data.returnUrl,
        payment_method_types: payMethod === "bank" ? ["us_bank_account"] : ["card"],
        ...bankCheckoutExtras(payMethod),
        line_items: [
          {
            quantity: 1,
            price_data: {
              currency: "usd",
              unit_amount: data.amountCents,
              ...(recurring ? { recurring: { interval: "month" as const } } : {}),
              product_data: {
                name: label,
                description: `Keeps ${BRAND.name} running — servers, storage and support. This is a gift to the company behind the app, not a charitable donation, so it isn't tax-deductible.`,
                tax_code: TAX_CODE,
              },
            },
          },
        ],
        ...(customerId
          ? { customer: customerId, customer_update: { name: "auto" as const } }
          : data.email
            ? { customer_email: data.email }
            : {}),
        ...(recurring
          ? {
              subscription_data: {
                description: label,
                metadata: {
                  witnessGiftId: gift.id,
                  ...(userId ? { userId } : {}),
                },
              },
            }
          : {
              payment_intent_data: {
                description: label,
                ...(data.email ? { receipt_email: data.email } : {}),
                // Kept on file for signed-in givers, so next time is one tap.
                ...(customerId && userId ? { setup_future_usage: "off_session" as const } : {}),
              },
            }),
        metadata: {
          witnessGiftId: gift.id,
          frequency: data.frequency,
          ...(userId ? { userId } : {}),
        },
      });

      await supabaseAdmin
        .from("witness_gifts")
        .update({ stripe_session_id: session.id, stripe_customer_id: customerId ?? null })
        .eq("id", gift.id);

      return { clientSecret: session.client_secret ?? "" };
    } catch (error) {
      await supabaseAdmin.from("witness_gifts").update({ status: "failed" }).eq("id", gift.id);
      return { error: getStripeErrorMessage(error) };
    }
  });

/** Everything you've given to keep the light lit. Private — only you see it. */
export const myLightGifts = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase } = context;
    const { data } = await supabase
      .from("witness_gifts")
      .select("id, amount_cents, frequency, status, created_at, canceled_at, current_period_end, stripe_subscription_id, environment")
      .order("created_at", { ascending: false })
      .limit(20);
    return data ?? [];
  });

/** Stop a monthly gift to Witness. Only the person who started it can. */
export const cancelMonthlyLight = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: { giftId: string; environment: StripeEnv }) => {
    if (!/^[0-9a-fA-F-]{36}$/.test(data.giftId)) throw new Error("Invalid gift");
    return data;
  })
  .handler(async ({ data, context }): Promise<{ ok: true } | { error: string }> => {
    const { supabase, userId } = context;
    const { data: gift } = await supabase
      .from("witness_gifts")
      .select("id, user_id, stripe_subscription_id, environment")
      .eq("id", data.giftId)
      .maybeSingle();
    if (!gift || gift.user_id !== userId) return { error: "We couldn't find that gift." };
    if (!gift.stripe_subscription_id) return { error: "That gift isn't a monthly one." };

    try {
      const stripe = createStripeClient(data.environment);
      await stripe.subscriptions.cancel(gift.stripe_subscription_id);
      const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
      await supabaseAdmin
        .from("witness_gifts")
        .update({ canceled_at: new Date().toISOString() })
        .eq("stripe_subscription_id", gift.stripe_subscription_id)
        .eq("environment", gift.environment);
      await supabaseAdmin
        .from("witness_gifts")
        .update({ status: "canceled" })
        .eq("stripe_subscription_id", gift.stripe_subscription_id)
        .eq("environment", gift.environment)
        .in("status", ["pending", "past_due"]);
      return { ok: true };
    } catch (error) {
      return { error: getStripeErrorMessage(error) };
    }
  });
