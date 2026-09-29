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
import { assertGiftAmountCents } from "@/lib/amounts";
import {
  WITNESS_TIP_CENTS,
  coverageFeeCents,
  isPayMethod,
  paymentBreakdown,
  type PayMethod,
} from "@/lib/fees";
import { BRAND } from "@/config/brand";

export type FundFrequency = "once" | "monthly";

interface FundInput {
  scope: "all" | "lane";
  lane?: string;
  amountCents: number;
  frequency: FundFrequency;
  returnUrl: string;
  environment: StripeEnv;
  email?: string;
  donorName?: string;
  note?: string;
  /** Giver adds the Witness fee and processing on top, so the nonprofits keep the full amount. */
  coverFees?: boolean;
  /** Card or bank transfer (ACH). */
  payMethod?: PayMethod;
  /** Giver adds a small gift to Witness itself ("keeping the light lit"). Never tax-deductible. */
  tip?: boolean;
}

type FundResult = { clientSecret: string } | { error: string };

/** Charitable donations — not a taxable good or service. */
const TAX_CODE = "txcd_90000001";

export const createFundGift = createServerFn({ method: "POST" })
  .inputValidator((data: FundInput) => {
    data.returnUrl = assertReturnUrl(data.returnUrl);
    if (data.scope !== "all" && data.scope !== "lane") throw new Error("Invalid choice");
    if (data.scope === "lane" && !/^[a-z_]{2,40}$/.test(data.lane ?? "")) throw new Error("Invalid lane");
    assertGiftAmountCents(data.amountCents);
    if (data.frequency !== "once" && data.frequency !== "monthly") throw new Error("Invalid gift type");
    if (data.note && data.note.length > 300) throw new Error("Note is too long");
    if (data.donorName && data.donorName.length > 80) throw new Error("Name is too long");
    if (data.payMethod !== undefined && !isPayMethod(data.payMethod)) {
      throw new Error("Choose card or bank transfer");
    }
    return data;
  })
  .handler(async ({ data }): Promise<FundResult> => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { getOptionalUserId } = await import("@/lib/optional-auth.server");
    // Identity comes from the verified session only — never from the request body.
    const userId = await getOptionalUserId();
    if (!userId) return { error: "Please sign in to give." };

    let q = supabaseAdmin
      .from("nonprofit_profiles")
      .select("org_id, lane")
      .eq("accepting", true);
    if (data.scope === "lane") q = q.eq("lane", data.lane!);
    const { data: profiles } = await q;
    const count = profiles?.length ?? 0;
    if (count < 2) {
      return {
        error:
          data.scope === "lane"
            ? "This lane doesn't have enough nonprofits receiving gifts yet. Give to one of them directly instead."
            : "There aren't enough nonprofits receiving gifts yet.",
      };
    }

    // Witness keeps 2%. The giver can add that and processing on top, so the
    // nonprofits keep the full amount they meant to give.
    const payMethod: PayMethod = data.payMethod ?? "card";
    const coverFees = data.coverFees === true;
    const tip = data.tip === true;
    const feeCents = coverFees ? coverageFeeCents(data.amountCents, payMethod) : 0;
    const split = paymentBreakdown(data.amountCents, coverFees, payMethod, tip);
    const witnessFee = split.witnessFeeCents;
    const tipCents = split.witnessGiftCents;
    const charged = split.chargedCents;
    const feeNote = coverFees
      ? ` You're covering the ${BRAND.name} fee and processing, so the full amount goes on.`
      : ` A small part helps keep ${BRAND.name} running; the rest goes on, minus payment processing.`;
    const tipNote = tip ? ` Includes a $${(WITNESS_TIP_CENTS / 100).toFixed(0)} gift to ${BRAND.name} itself — keeping the light lit.` : "";

    const { data: fund, error: insertError } = await supabaseAdmin
      .from("fund_gifts")
      .insert({
        user_id: userId,
        email: data.email ?? null,
        donor_name: data.donorName ?? null,
        note: data.note ?? "",
        scope: data.scope,
        lane: data.scope === "lane" ? data.lane! : null,
        amount_cents: data.amountCents,
        frequency: data.frequency,
        status: "pending",
        org_count: count,
        environment: data.environment,
        fees_covered: coverFees,
        fee_cents: feeCents,
        witness_fee_cents: witnessFee,
        pay_method: payMethod,
        tip_cents: tipCents,
        charged_cents: charged,
        processing_fee_cents: split.processingFeeCents,
        recipient_cents: split.recipientCents,
        payout_status: "awaiting_setup",
      })
      .select("id")
      .single();
    if (insertError || !fund) return { error: "We couldn't start this gift. Try again." };

    try {
      const stripe = createStripeClient(data.environment);
      const recurring = data.frequency === "monthly";
      const customerId = await resolveOrCreateCustomer(stripe, {
        email: data.email,
        userId: userId ?? undefined,
      });
      const where = data.scope === "lane" ? `${count} nonprofits in one lane` : `all ${count} nonprofits`;
      const label = recurring ? `Monthly gift — split across ${where}` : `Gift — split across ${where}`;

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
              unit_amount: charged,
              ...(recurring ? { recurring: { interval: "month" as const } } : {}),
              product_data: {
                name: label,
                description: `Divided evenly between ${where}.${feeNote}${tipNote}`,
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
                  fundGiftId: fund.id,
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
          fundGiftId: fund.id,
          scope: data.scope,
          ...(data.scope === "lane" ? { lane: data.lane! } : {}),
          frequency: data.frequency,
          ...(userId ? { userId } : {}),
        },
      });

      await supabaseAdmin
        .from("fund_gifts")
        .update({ stripe_session_id: session.id, stripe_customer_id: customerId ?? null })
        .eq("id", fund.id);

      return { clientSecret: session.client_secret ?? "" };
    } catch (error) {
      await supabaseAdmin.from("fund_gifts").update({ status: "failed" }).eq("id", fund.id);
      return { error: getStripeErrorMessage(error) };
    }
  });

/** Stop a monthly spread-out gift. Only the giver who started it can. */
export const cancelMonthlyFund = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: { fundGiftId: string; environment: StripeEnv }) => {
    if (!/^[0-9a-fA-F-]{36}$/.test(data.fundGiftId)) throw new Error("Invalid gift");
    return data;
  })
  .handler(async ({ data, context }): Promise<{ ok: true } | { error: string }> => {
    const { supabase, userId } = context;
    const { data: fund } = await supabase
      .from("fund_gifts")
      .select("id, user_id, stripe_subscription_id, environment")
      .eq("id", data.fundGiftId)
      .maybeSingle();
    if (!fund || fund.user_id !== userId) return { error: "We couldn't find that gift." };
    if (!fund.stripe_subscription_id) return { error: "That gift isn't a monthly one." };

    try {
      const stripe = createStripeClient(data.environment);
      await stripe.subscriptions.cancel(fund.stripe_subscription_id);
      const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
      await supabaseAdmin
        .from("fund_gifts")
        .update({ canceled_at: new Date().toISOString() })
        .eq("id", fund.id);
      await supabaseAdmin
        .from("fund_gifts")
        .update({ status: "canceled" })
        .eq("id", fund.id)
        .in("status", ["pending", "past_due"]);
      return { ok: true };
    } catch (error) {
      return { error: getStripeErrorMessage(error) };
    }
  });
