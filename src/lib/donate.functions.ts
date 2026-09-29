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
import { BRAND } from "@/config/brand";
import {
  WITNESS_TIP_CENTS,
  coverageFeeCents,
  isPayMethod,
  paymentBreakdown,
  type PayMethod,
} from "@/lib/fees";

export type GiftFrequency = "once" | "monthly";

interface DonationInput {
  orgSlug: string;
  amountCents: number;
  frequency: GiftFrequency;
  returnUrl: string;
  environment: StripeEnv;
  email?: string;
  donorName?: string;
  note?: string;
  /** Optional: designate the gift to one need on the board (must belong to this org). */
  needId?: string;
  /** Giver adds the Witness fee and processing on top, so the nonprofit keeps the full amount. */
  coverFees?: boolean;
  /** Card or bank transfer (ACH). */
  payMethod?: PayMethod;
  /** Giver adds a small gift to Witness itself ("keeping the light lit"). Never tax-deductible. */
  tip?: boolean;
}

type DonationResult = { clientSecret: string } | { error: string };

const SLUG = /^[a-z0-9-]{1,60}$/;
const UUID = /^[0-9a-fA-F-]{36}$/;
/** Charitable donations — not a taxable good or service. */
const TAX_CODE = "txcd_90000001";

export const createNonprofitDonation = createServerFn({ method: "POST" })
  .inputValidator((data: DonationInput) => {
    data.returnUrl = assertReturnUrl(data.returnUrl);
    if (!SLUG.test(data.orgSlug)) throw new Error("Invalid nonprofit");
    assertGiftAmountCents(data.amountCents);
    if (data.frequency !== "once" && data.frequency !== "monthly") {
      throw new Error("Invalid gift type");
    }
    if (data.needId && !UUID.test(data.needId)) throw new Error("Invalid need");
    if (data.note && data.note.length > 300) throw new Error("Note is too long");
    if (data.donorName && data.donorName.length > 80) throw new Error("Name is too long");
    if (data.payMethod !== undefined && !isPayMethod(data.payMethod)) {
      throw new Error("Choose card or bank transfer");
    }
    return data;
  })
  .handler(async ({ data }): Promise<DonationResult> => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { getOptionalUserId } = await import("@/lib/optional-auth.server");
    // Identity comes from the verified session only — never from the request body.
    const userId = await getOptionalUserId();
    if (!userId) return { error: "Please sign in to give." };

    const { data: org } = await supabaseAdmin
      .from("organizations")
      .select("id, name, slug")
      .eq("slug", data.orgSlug)
      .maybeSingle();
    if (!org) return { error: "We couldn't find that nonprofit." };

    const { data: profile } = await supabaseAdmin
      .from("nonprofit_profiles")
      .select("lane, accepting")
      .eq("org_id", org.id)
      .maybeSingle();
    if (!profile) return { error: "This organization isn't set up to receive gifts yet." };
    if (!profile.accepting) return { error: "This nonprofit has paused receiving gifts." };
    const { data: givingPlan } = await supabaseAdmin
      .from("org_subscriptions")
      .select("id")
      .eq("org_id", org.id)
      .eq("plan", "page_giving")
      .eq("environment", data.environment)
      .in("status", ["active", "past_due"])
      .limit(1)
      .maybeSingle();
    if (!givingPlan) return { error: "This organization isn't set up to receive gifts yet." };

    // A gift can be designated to one need — only if that need really belongs
    // to this org and is still taking gifts. Otherwise it's a plain gift.
    let needId: string | null = null;
    let needTitle: string | null = null;
    if (data.needId) {
      const { data: need } = await supabaseAdmin
        .from("needs")
        .select("id, title, org_id, status")
        .eq("id", data.needId)
        .maybeSingle();
      if (!need || need.org_id !== org.id) return { error: "That need doesn't belong to this organization." };
      if (need.status === "completed" || need.status === "closed") {
        return { error: "That need is already taken care of. Thank you — give to the organization instead." };
      }
      needId = need.id;
      needTitle = need.title;
    }

    // Witness keeps 2%. The giver can add that and processing on top, so the
    // nonprofit keeps the full amount they meant to give.
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

    const { data: donation, error: insertError } = await supabaseAdmin
      .from("donations")
      .insert({
        org_id: org.id,
        lane: profile.lane,
        user_id: userId,
        email: data.email ?? null,
        donor_name: data.donorName ?? null,
        note: data.note ?? "",
        amount_cents: data.amountCents,
        frequency: data.frequency,
        status: "pending",
        environment: data.environment,
        need_id: needId,
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
    if (insertError || !donation) return { error: "We couldn't start this gift. Try again." };

    try {
      const stripe = createStripeClient(data.environment);
      const recurring = data.frequency === "monthly";
      // One saved payer record per person, so a repeat giver keeps one history.
      const customerId = await resolveOrCreateCustomer(stripe, {
        email: data.email,
        userId: userId ?? undefined,
      });
      const label = recurring
        ? `Monthly gift — ${org.name}`
        : needTitle
          ? `Gift — ${needTitle} (${org.name})`
          : `Gift — ${org.name}`;

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
                description: needTitle
                  ? `Designated to "${needTitle}" through ${org.name}, who pays the bill.${feeNote}${tipNote}`
                  : `Designated to ${org.name}.${feeNote}${tipNote}`,
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
                  donationId: donation.id,
                  orgSlug: org.slug,
                  ...(userId ? { userId } : {}),
                },
              },
            }
          : {
              payment_intent_data: {
                description: label,
                // Stripe emails the receipt for this gift.
                ...(data.email ? { receipt_email: data.email } : {}),
                // Signed-in givers keep this way of giving on file, so next
                // time is one tap. The details stay with the provider.
                ...(customerId && userId ? { setup_future_usage: "off_session" as const } : {}),
              },
            }),
        metadata: {
          donationId: donation.id,
          orgSlug: org.slug,
          lane: profile.lane,
          frequency: data.frequency,
          ...(userId ? { userId } : {}),
        },
      });

      await supabaseAdmin
        .from("donations")
        .update({ stripe_session_id: session.id, stripe_customer_id: customerId ?? null })
        .eq("id", donation.id);

      return { clientSecret: session.client_secret ?? "" };
    } catch (error) {
      await supabaseAdmin
        .from("donations")
        .update({ status: "failed" })
        .eq("id", donation.id);
      return { error: getStripeErrorMessage(error) };
    }
  });

/** Stop a monthly gift. Only the giver who started it can. */
export const cancelMonthlyGift = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: { donationId: string; environment: StripeEnv }) => {
    if (!/^[0-9a-fA-F-]{36}$/.test(data.donationId)) throw new Error("Invalid gift");
    return data;
  })
  .handler(async ({ data, context }): Promise<{ ok: true } | { error: string }> => {
    const { supabase, userId } = context;
    const { data: gift } = await supabase
      .from("donations")
      .select("id, user_id, stripe_subscription_id, environment")
      .eq("id", data.donationId)
      .maybeSingle();
    if (!gift || gift.user_id !== userId) return { error: "We couldn't find that gift." };
    if (!gift.stripe_subscription_id) return { error: "That gift isn't a monthly one." };

    try {
      const stripe = createStripeClient(data.environment);
      // Stops right away, as the giver expects. The gifts already given stay
      // on the record — only the recurring arrangement ends.
      await stripe.subscriptions.cancel(gift.stripe_subscription_id);
      const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
      await supabaseAdmin
        .from("donations")
        .update({ canceled_at: new Date().toISOString() })
        .eq("stripe_subscription_id", gift.stripe_subscription_id)
        .eq("environment", gift.environment);
      // A gift that never collected is simply cancelled; gifts already given
      // keep their paid record so the ledger still adds up.
      await supabaseAdmin
        .from("donations")
        .update({ status: "canceled" })
        .eq("stripe_subscription_id", gift.stripe_subscription_id)
        .eq("environment", gift.environment)
        .in("status", ["pending", "past_due"]);
      return { ok: true };
    } catch (error) {
      return { error: getStripeErrorMessage(error) };
    }
  });
