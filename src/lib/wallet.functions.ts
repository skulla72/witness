import { assertGiftAmountCents } from "@/lib/amounts";
/**
 * Saved ways to give — a card or a bank account kept on file, so a repeat
 * giver can give again with one tap.
 *
 * Nothing sensitive lives here: the card and bank details stay with the
 * payment provider. All Witness ever holds is a reference, plus the last four
 * digits so a person can tell their own accounts apart.
 */
import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import {
  type StripeEnv,
  createStripeClient,
  getStripeErrorMessage,
} from "@/lib/stripe.server";
import { BRAND } from "@/config/brand";
import { coverageFeeCents, paymentBreakdown, type PayMethod } from "@/lib/fees";
import type Stripe from "stripe";

export interface SavedMethod {
  id: string;
  kind: PayMethod;
  /** "Visa" or the bank's name. */
  label: string;
  last4: string;
  /** Cards only: "04/28". */
  expires?: string;
}

const UUID = /^[0-9a-fA-F-]{36}$/;
const SLUG = /^[a-z0-9-]{1,60}$/;
const PM_ID = /^pm_[a-zA-Z0-9_]+$/;
/** Charitable donations — not a taxable good or service. */
const TAX_CODE = "txcd_90000001";

/** The payer record already on file for this person, if there is one. */
async function findCustomer(stripe: Stripe, userId: string): Promise<string | undefined> {
  if (!/^[a-zA-Z0-9_-]+$/.test(userId)) return undefined;
  const found = await stripe.customers.search({
    query: `metadata['userId']:'${userId}'`,
    limit: 1,
  });
  return found.data[0]?.id;
}

function describe(pm: Stripe.PaymentMethod): SavedMethod | null {
  if (pm.card) {
    const brand = pm.card.brand.charAt(0).toUpperCase() + pm.card.brand.slice(1);
    return {
      id: pm.id,
      kind: "card",
      label: brand,
      last4: pm.card.last4,
      expires: `${String(pm.card.exp_month).padStart(2, "0")}/${String(pm.card.exp_year).slice(-2)}`,
    };
  }
  if (pm.us_bank_account) {
    return {
      id: pm.id,
      kind: "bank",
      label: pm.us_bank_account.bank_name ?? "Bank account",
      last4: pm.us_bank_account.last4 ?? "",
    };
  }
  return null;
}

/** Everything this person has chosen to keep on file. */
export const listSavedMethods = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: { environment: StripeEnv }) => data)
  .handler(async ({ data, context }): Promise<{ methods: SavedMethod[] } | { error: string }> => {
    try {
      const stripe = createStripeClient(data.environment);
      const customerId = await findCustomer(stripe, context.userId);
      if (!customerId) return { methods: [] };
      const [cards, banks] = await Promise.all([
        stripe.paymentMethods.list({ customer: customerId, type: "card", limit: 10 }),
        stripe.paymentMethods.list({ customer: customerId, type: "us_bank_account", limit: 10 }),
      ]);
      const methods = [...cards.data, ...banks.data]
        .map(describe)
        .filter((m): m is SavedMethod => m !== null);
      return { methods };
    } catch (error) {
      return { error: getStripeErrorMessage(error) };
    }
  });

/** Take a card or bank account off file. Only the person it belongs to can. */
export const removeSavedMethod = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: { methodId: string; environment: StripeEnv }) => {
    if (!PM_ID.test(data.methodId)) throw new Error("Invalid payment method");
    return data;
  })
  .handler(async ({ data, context }): Promise<{ ok: true } | { error: string }> => {
    try {
      const stripe = createStripeClient(data.environment);
      const customerId = await findCustomer(stripe, context.userId);
      if (!customerId) return { error: "There's nothing saved on your account." };
      const pm = await stripe.paymentMethods.retrieve(data.methodId);
      const owner = typeof pm.customer === "string" ? pm.customer : pm.customer?.id;
      if (owner !== customerId) return { error: "That isn't yours to remove." };
      await stripe.paymentMethods.detach(data.methodId);
      return { ok: true };
    } catch (error) {
      return { error: getStripeErrorMessage(error) };
    }
  });

interface GiveNowInput {
  orgSlug: string;
  amountCents: number;
  methodId: string;
  environment: StripeEnv;
  note?: string;
  donorName?: string;
  needId?: string;
  coverFees?: boolean;
  tip?: boolean;
}

type GiveNowResult =
  | { status: "paid" | "pending"; donationId: string; chargedCents: number }
  | { error: string };

/**
 * One tap: give again with something already on file. No screens, no typing.
 * A bank gift comes back as "pending" — banks take a few business days, and we
 * never show it as given until the money actually clears.
 */
export const giveNowWithSavedMethod = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: GiveNowInput) => {
    if (!SLUG.test(data.orgSlug)) throw new Error("Invalid nonprofit");
    if (!PM_ID.test(data.methodId)) throw new Error("Invalid payment method");
    data.amountCents = assertGiftAmountCents(data.amountCents);
    if (data.needId && !UUID.test(data.needId)) throw new Error("Invalid need");
    if (data.note && data.note.length > 300) throw new Error("Note is too long");
    if (data.donorName && data.donorName.length > 80) throw new Error("Name is too long");
    return data;
  })
  .handler(async ({ data, context }): Promise<GiveNowResult> => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const userId = context.userId;

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

    let needId: string | null = null;
    let needTitle: string | null = null;
    if (data.needId) {
      const { data: need } = await supabaseAdmin
        .from("needs")
        .select("id, title, org_id, status")
        .eq("id", data.needId)
        .maybeSingle();
      if (!need || need.org_id !== org.id) {
        return { error: "That need doesn't belong to this organization." };
      }
      if (need.status === "completed" || need.status === "closed") {
        return { error: "That need is already taken care of. Give to the organization instead." };
      }
      needId = need.id;
      needTitle = need.title;
    }

    let stripe: Stripe;
    let customerId: string | undefined;
    let payMethod: PayMethod = "card";
    let email: string | null = null;
    try {
      stripe = createStripeClient(data.environment);
      customerId = await findCustomer(stripe, userId);
      if (!customerId) return { error: "You don't have anything saved to give with yet." };
      const pm = await stripe.paymentMethods.retrieve(data.methodId);
      const owner = typeof pm.customer === "string" ? pm.customer : pm.customer?.id;
      if (owner !== customerId) return { error: "That isn't a way of giving on your account." };
      payMethod = pm.us_bank_account ? "bank" : "card";
      const customer = await stripe.customers.retrieve(customerId);
      email = "deleted" in customer ? null : (customer.email ?? null);
    } catch (error) {
      return { error: getStripeErrorMessage(error) };
    }

    const coverFees = data.coverFees === true;
    const tip = data.tip === true;
    const feeCents = coverFees ? coverageFeeCents(data.amountCents, payMethod) : 0;
    const split = paymentBreakdown(data.amountCents, coverFees, payMethod, tip);

    const { data: donation, error: insertError } = await supabaseAdmin
      .from("donations")
      .insert({
        org_id: org.id,
        lane: profile.lane,
        user_id: userId,
        email,
        donor_name: data.donorName ?? null,
        note: data.note ?? "",
        amount_cents: data.amountCents,
        frequency: "once",
        status: "pending",
        environment: data.environment,
        need_id: needId,
        fees_covered: coverFees,
        fee_cents: feeCents,
        witness_fee_cents: split.witnessFeeCents,
        pay_method: payMethod,
        tip_cents: split.witnessGiftCents,
        charged_cents: split.chargedCents,
        processing_fee_cents: split.processingFeeCents,
        recipient_cents: split.recipientCents,
        payout_status: "awaiting_setup",
        stripe_customer_id: customerId,
      })
      .select("id")
      .single();
    if (insertError || !donation) return { error: "We couldn't start this gift. Try again." };

    try {
      const label = needTitle
        ? `Gift — ${needTitle} (${org.name})`
        : `Gift — ${org.name}`;
      const intent = await stripe.paymentIntents.create(
        {
          amount: split.chargedCents,
          currency: "usd",
          customer: customerId,
          payment_method: data.methodId,
          confirm: true,
          off_session: true,
          description: label,
          statement_descriptor_suffix: BRAND.name.slice(0, 22),
          ...(email ? { receipt_email: email } : {}),
          metadata: {
            donationId: donation.id,
            orgSlug: org.slug,
            lane: profile.lane,
            frequency: "once",
            userId,
            taxCode: TAX_CODE,
          },
        },
        { idempotencyKey: `one-tap-gift-${donation.id}` },
      );

      const paid = intent.status === "succeeded";
      const settling = intent.status === "processing" || intent.status === "requires_capture";
      if (!paid && !settling) {
        await supabaseAdmin.from("donations").update({ status: "failed" }).eq("id", donation.id);
        return {
          error:
            payMethod === "card"
              ? "Your bank wants to check this one. Give with the full screen instead, just this once."
              : "That bank account needs confirming again. Use the full screen instead, just this once.",
        };
      }

      await supabaseAdmin
        .from("donations")
        .update({
          status: paid ? "paid" : "pending",
          stripe_payment_intent_id: intent.id,
        })
        .eq("id", donation.id);

      if (paid) {
        try {
          const { runDuePayouts } = await import("@/lib/payouts.server");
          await runDuePayouts(data.environment, { orgId: org.id });
        } catch (error) {
          console.error("Automatic payout pass failed:", error);
        }
      }

      return {
        status: paid ? "paid" : "pending",
        donationId: donation.id,
        chargedCents: split.chargedCents,
      };
    } catch (error) {
      await supabaseAdmin.from("donations").update({ status: "failed" }).eq("id", donation.id);
      return { error: getStripeErrorMessage(error) };
    }
  });
