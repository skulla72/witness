import { createFileRoute } from "@tanstack/react-router";
import { createClient } from "@supabase/supabase-js";
import type { Database } from "@/integrations/supabase/types";
import { type StripeEnv, createStripeClient, verifyWebhook } from "@/lib/stripe.server";
import { paymentBreakdown, type PayMethod } from "@/lib/fees";

let _supabase: ReturnType<typeof createClient<Database>> | null = null;
function getSupabase() {
  if (!_supabase) {
    _supabase = createClient<Database>(
      process.env['SUPABASE_URL']!,
      process.env['SUPABASE_SERVICE_ROLE_KEY']!,
    );
  }
  return _supabase;
}

const idOf = (value: any): string | null =>
  typeof value === "string" ? value : (value?.id ?? null);

/** Where the subscription lives on an invoice differs by provider version. */
function invoiceSubscriptionId(invoice: any): string | null {
  return (
    idOf(invoice?.subscription) ??
    idOf(invoice?.parent?.subscription_details?.subscription) ??
    idOf(invoice?.lines?.data?.[0]?.parent?.subscription_item_details?.subscription) ??
    null
  );
}

function shippingFrom(session: any) {
  const details = session?.collected_information?.shipping_details ?? session?.shipping_details;
  return {
    shipping_name: details?.name ?? session?.customer_details?.name ?? null,
    shipping_address: details?.address ?? session?.customer_details?.address ?? null,
  };
}

async function markOrder(session: any, env: StripeEnv, status: string) {
  const orderId = session?.metadata?.orderId;
  if (!orderId) return;
  const email = session.customer_details?.email ?? session.customer_email ?? null;
  const paymentIntentId = idOf(session.payment_intent);

  await getSupabase()
    .from("store_orders")
    .update({
      status,
      amount_cents: session.amount_total ?? 0,
      currency: session.currency ?? "usd",
      tax_cents: session.total_details?.amount_tax ?? 0,
      shipping_cents: session.total_details?.amount_shipping ?? 0,
      email,
      stripe_session_id: session.id,
      ...(paymentIntentId ? { stripe_payment_intent_id: paymentIntentId } : {}),
      ...(idOf(session.customer) ? { stripe_customer_id: idOf(session.customer) } : {}),
      ...shippingFrom(session),
      updated_at: new Date().toISOString(),
    })
    .eq("id", orderId)
    .eq("environment", env);

  // Guests type their email at checkout, so attach it to the payment now and
  // the provider sends them the receipt that doubles as order confirmation.
  if (status === "paid" && email && paymentIntentId) {
    try {
      const stripe = createStripeClient(env);
      const intent = await stripe.paymentIntents.retrieve(paymentIntentId);
      if (!intent.receipt_email) {
        await stripe.paymentIntents.update(paymentIntentId, { receipt_email: email });
      }
    } catch (e) {
      console.error("Could not attach receipt email:", e);
    }
  }
}

/** A neighbor's chip-in toward a hired job. Witness holds it until the work is confirmed. */
async function markJobContribution(session: any, env: StripeEnv, status: string) {
  const contributionId = session?.metadata?.jobContributionId;
  if (!contributionId) return;
  const email = session.customer_details?.email ?? session.customer_email ?? null;
  const paymentIntentId = idOf(session.payment_intent);

  await getSupabase()
    .from("job_contributions")
    .update({
      status,
      amount_cents: session.amount_total ?? undefined,
      ...(email ? { email } : {}),
      stripe_session_id: session.id,
      ...(paymentIntentId ? { stripe_payment_intent_id: paymentIntentId } : {}),
      ...(idOf(session.customer) ? { stripe_customer_id: idOf(session.customer) } : {}),
      updated_at: new Date().toISOString(),
    })
    .eq("id", contributionId)
    .eq("environment", env);
}

/** Nonprofit gifts: the checkout session carries the donation row id. */
async function markDonation(session: any, env: StripeEnv, status: string) {
  const donationId = session?.metadata?.donationId;
  if (!donationId) return;
  await getSupabase()
    .from("donations")
    .update({
      status,
      charged_cents: session.amount_total ?? undefined,
      currency: session.currency ?? "usd",
      email: session.customer_details?.email ?? session.customer_email ?? null,
      stripe_session_id: session.id,
      stripe_subscription_id: idOf(session.subscription),
      ...(idOf(session.customer) ? { stripe_customer_id: idOf(session.customer) } : {}),
      updated_at: new Date().toISOString(),
    })
    .eq("id", donationId)
    .eq("environment", env);
}

/**
 * A one-tap gift given with a card or bank account already on file: there is no
 * checkout session, so the payment itself carries the donation row id. Bank
 * gifts land here days later, when the money really clears.
 */
async function markDonationPayment(intent: any, env: StripeEnv, status: string) {
  const donationId = intent?.metadata?.donationId;
  if (!donationId) return;
  await getSupabase()
    .from("donations")
    .update({
      status,
      charged_cents: intent.amount ?? undefined,
      currency: intent.currency ?? "usd",
      stripe_payment_intent_id: intent.id,
      ...(idOf(intent.customer) ? { stripe_customer_id: idOf(intent.customer) } : {}),
      updated_at: new Date().toISOString(),
    })
    .eq("id", donationId)
    .eq("environment", env);
}


/* -------------------------------------------------------------------------
 * Gifts spread evenly across many nonprofits: one charge, many equal shares.
 * ----------------------------------------------------------------------- */

/** Even split to the cent; leftover cents go to the first organizations. */
function splitCents(total: number, count: number): number[] {
  const base = Math.floor(total / count);
  const extra = total - base * count;
  return Array.from({ length: count }, (_, i) => base + (i < extra ? 1 : 0));
}

/** Whoever is set up and still receiving gifts, in a stable order. */
async function fundRecipients(scope: string, lane: string | null) {
  let q = getSupabase().from("nonprofit_profiles").select("org_id, lane").eq("accepting", true);
  if (scope === "lane" && lane) q = q.eq("lane", lane);
  const { data } = await q;
  return (data ?? []).slice().sort((a, b) => a.org_id.localeCompare(b.org_id));
}

/**
 * Write one ordinary gift row per nonprofit so leader dashboards, lane totals
 * and receipts keep working untouched. Keyed on the payment so a repeated
 * notification can't double-count.
 */
async function writeFundShares(
  fund: {
    id: string;
    scope: string;
    lane: string | null;
    user_id: string | null;
    email: string | null;
    donor_name: string | null;
    note: string | null;
    frequency: string;
    stripe_customer_id: string | null;
  },
  recipientCents: number,
  env: StripeEnv,
  keys: { sessionId?: string | null; invoiceId?: string | null; subscriptionId?: string | null; receiptUrl?: string | null },
) {
  const supabase = getSupabase();
  let existing = supabase.from("donations").select("id").eq("fund_gift_id", fund.id).limit(1);
  existing = keys.invoiceId
    ? existing.eq("stripe_invoice_id", keys.invoiceId)
    : existing.eq("stripe_session_id", keys.sessionId ?? "");
  const { data: already } = await existing;
  if (already && already.length > 0) return;

  const recipients = await fundRecipients(fund.scope, fund.lane);
  if (recipients.length === 0) return;
  const shares = splitCents(recipientCents, recipients.length);

  const { error } = await supabase.from("donations").insert(
    recipients.map((r, i) => ({
      org_id: r.org_id,
      lane: r.lane,
      user_id: fund.user_id,
      email: fund.email,
      donor_name: fund.donor_name,
      note: fund.note ?? "",
      amount_cents: shares[i] ?? 0,
      frequency: fund.frequency,
      status: "paid",
      environment: env,
      fund_gift_id: fund.id,
      ...(keys.sessionId ? { stripe_session_id: keys.sessionId } : {}),
      ...(keys.invoiceId ? { stripe_invoice_id: keys.invoiceId } : {}),
      ...(keys.subscriptionId ? { stripe_subscription_id: keys.subscriptionId } : {}),
      ...(fund.stripe_customer_id ? { stripe_customer_id: fund.stripe_customer_id } : {}),
      ...(keys.receiptUrl ? { receipt_url: keys.receiptUrl } : {}),
    })),
  );
  if (error) console.error("Fund share insert failed:", error.message);
}

async function loadFund(id: string, env: StripeEnv) {
  const { data } = await getSupabase()
    .from("fund_gifts")
    .select("id, scope, lane, user_id, email, donor_name, note, frequency, stripe_customer_id, amount_cents, fees_covered, pay_method, tip_cents, recipient_cents")
    .eq("id", id)
    .eq("environment", env)
    .maybeSingle();
  return data;
}

/** The spread-out gift's own checkout session finished. */
async function markFundGift(session: any, env: StripeEnv, status: string) {
  const fundGiftId = session?.metadata?.fundGiftId;
  if (!fundGiftId) return;
  const email = session.customer_details?.email ?? session.customer_email ?? null;
  const subscriptionId = idOf(session.subscription);

  await getSupabase()
    .from("fund_gifts")
    .update({
      status,
      charged_cents: session.amount_total ?? undefined,
      currency: session.currency ?? "usd",
      email,
      stripe_session_id: session.id,
      stripe_subscription_id: subscriptionId,
      ...(idOf(session.customer) ? { stripe_customer_id: idOf(session.customer) } : {}),
      updated_at: new Date().toISOString(),
    })
    .eq("id", fundGiftId)
    .eq("environment", env);

  if (status !== "paid") return;
  const fund = await loadFund(fundGiftId, env);
  if (!fund) return;
  await writeFundShares(fund, fund.recipient_cents, env, {
    sessionId: session.id,
    subscriptionId,
  });
}

/** A monthly spread-out gift renewed: split it again for this month. */
async function recordFundRenewal(invoice: any, env: StripeEnv) {
  const subscriptionId = invoiceSubscriptionId(invoice);
  if (!subscriptionId || invoice.billing_reason === "subscription_create") return false;

  const { data: fund } = await getSupabase()
    .from("fund_gifts")
    .select("id, scope, lane, user_id, email, donor_name, note, frequency, stripe_customer_id, amount_cents, fees_covered, pay_method, tip_cents, recipient_cents")
    .eq("stripe_subscription_id", subscriptionId)
    .eq("environment", env)
    .maybeSingle();
  if (!fund) return false;

  const periodEnd = invoice.lines?.data?.[0]?.period?.end ?? invoice.period_end ?? null;
  await getSupabase()
    .from("fund_gifts")
    .update({
      status: "paid",
      receipt_url: invoice.hosted_invoice_url ?? null,
      current_period_end: periodEnd ? new Date(periodEnd * 1000).toISOString() : null,
      updated_at: new Date().toISOString(),
    })
    .eq("id", fund.id);

  const split = paymentBreakdown(
    fund.amount_cents,
    fund.fees_covered,
    fund.pay_method as PayMethod,
    fund.tip_cents > 0,
  );
  await getSupabase().from("fund_gifts").update({
    charged_cents: invoice.amount_paid ?? split.chargedCents,
    processing_fee_cents: split.processingFeeCents,
    witness_fee_cents: split.witnessFeeCents,
    recipient_cents: split.recipientCents,
  }).eq("id", fund.id);
  await writeFundShares(fund, split.recipientCents, env, {
    invoiceId: invoice.id,
    subscriptionId,
    receiptUrl: invoice.hosted_invoice_url ?? null,
  });
  return true;
}

/** Keep the spread-out gift's own record in step with its subscription. */
async function syncFundSubscription(subscription: any, env: StripeEnv, patch: Record<string, unknown>) {
  if (!subscription?.id) return;
  await getSupabase()
    .from("fund_gifts")
    .update({ ...patch, updated_at: new Date().toISOString() })
    .eq("stripe_subscription_id", subscription.id)
    .eq("environment", env);
}



/**
 * A monthly gift renewed: record it as its own gift so the ledger adds up.
 * Keyed on the invoice so a repeated notification can't double-count.
 */
async function recordRenewal(invoice: any, env: StripeEnv) {
  const subscriptionId = invoiceSubscriptionId(invoice);
  if (!subscriptionId || invoice.billing_reason === "subscription_create") return;

  const supabase = getSupabase();
  const { data: first } = await supabase
    .from("donations")
    .select("org_id, lane, user_id, email, donor_name, note, stripe_customer_id, amount_cents, fees_covered, pay_method, tip_cents")
    .eq("stripe_subscription_id", subscriptionId)
    .eq("environment", env)
    .order("created_at", { ascending: true })
    .limit(1)
    .maybeSingle();
  if (!first) return;

  const periodEnd =
    invoice.lines?.data?.[0]?.period?.end ?? invoice.period_end ?? null;

  const split = paymentBreakdown(
    first.amount_cents,
    first.fees_covered,
    first.pay_method as PayMethod,
    first.tip_cents > 0,
  );
  const { error } = await supabase.from("donations").insert({
    org_id: first.org_id,
    lane: first.lane,
    user_id: first.user_id,
    email: invoice.customer_email ?? first.email,
    donor_name: first.donor_name,
    note: first.note,
    amount_cents: first.amount_cents,
    charged_cents: invoice.amount_paid ?? split.chargedCents,
    processing_fee_cents: split.processingFeeCents,
    witness_fee_cents: split.witnessFeeCents,
    recipient_cents: split.recipientCents,
    fees_covered: first.fees_covered,
    pay_method: first.pay_method,
    tip_cents: first.tip_cents,
    payout_status: "awaiting_setup",
    currency: invoice.currency ?? "usd",
    frequency: "monthly",
    status: "paid",
    stripe_subscription_id: subscriptionId,
    stripe_invoice_id: invoice.id,
    stripe_customer_id: first.stripe_customer_id ?? idOf(invoice.customer),
    receipt_url: invoice.hosted_invoice_url ?? null,
    current_period_end: periodEnd ? new Date(periodEnd * 1000).toISOString() : null,
    environment: env,
  });
  // A duplicate invoice id means we already recorded this renewal.
  if (error && !error.message.includes("duplicate")) {
    console.error("Renewal insert failed:", error.message);
  }
}

/** A renewal that didn't collect: the monthly gift is behind, not given. */
async function markRenewalFailed(invoice: any, env: StripeEnv) {
  const subscriptionId = invoiceSubscriptionId(invoice);
  if (!subscriptionId) return;
  await getSupabase()
    .from("donations")
    .update({ status: "past_due", updated_at: new Date().toISOString() })
    .eq("stripe_subscription_id", subscriptionId)
    .eq("environment", env)
    .in("status", ["pending", "paid"]);
}

async function markSubscriptionGifts(subscription: any, env: StripeEnv, status: string) {
  const periodEnd =
    subscription.items?.data?.[0]?.current_period_end ?? subscription.current_period_end ?? null;
  await getSupabase()
    .from("donations")
    .update({
      status,
      ...(periodEnd
        ? { current_period_end: new Date(periodEnd * 1000).toISOString() }
        : {}),
      updated_at: new Date().toISOString(),
    })
    .eq("stripe_subscription_id", subscription.id)
    .eq("environment", env)
    .eq("status", "pending");
}

/** The monthly arrangement ended. Gifts already given keep their record. */
async function endMonthlyGift(subscription: any, env: StripeEnv) {
  const supabase = getSupabase();
  await supabase
    .from("donations")
    .update({ canceled_at: new Date().toISOString(), updated_at: new Date().toISOString() })
    .eq("stripe_subscription_id", subscription.id)
    .eq("environment", env)
    .is("canceled_at", null);
  await supabase
    .from("donations")
    .update({ status: "canceled" })
    .eq("stripe_subscription_id", subscription.id)
    .eq("environment", env)
    .in("status", ["pending", "past_due"]);
}

/** Keep the paid-through date current so givers see when the next gift is due. */
async function syncSubscription(subscription: any, env: StripeEnv) {
  const periodEnd =
    subscription.items?.data?.[0]?.current_period_end ?? subscription.current_period_end ?? null;
  if (!periodEnd) return;
  await getSupabase()
    .from("donations")
    .update({
      current_period_end: new Date(periodEnd * 1000).toISOString(),
      updated_at: new Date().toISOString(),
    })
    .eq("stripe_subscription_id", subscription.id)
    .eq("environment", env);
}

/** Money sent back: reflect it on the order or the gift it belongs to. */
async function recordRefund(charge: any, env: StripeEnv) {
  const paymentIntentId = idOf(charge.payment_intent);
  if (!paymentIntentId) return;
  const refunded = charge.amount_refunded ?? 0;
  const fully = refunded >= (charge.amount ?? 0);
  const supabase = getSupabase();

  await supabase
    .from("store_orders")
    .update({
      refunded_cents: refunded,
      ...(fully ? { status: "refunded", fulfillment: "canceled" } : {}),
      updated_at: new Date().toISOString(),
    })
    .eq("stripe_payment_intent_id", paymentIntentId)
    .eq("environment", env);

  await supabase
    .from("job_contributions")
    .update({
      refunded_cents: refunded,
      ...(fully ? { status: "refunded" } : {}),
      updated_at: new Date().toISOString(),
    })
    .eq("stripe_payment_intent_id", paymentIntentId)
    .eq("environment", env);

  const invoiceId = idOf(charge.invoice);
  if (invoiceId) {
    await supabase
      .from("donations")
      .update({
        refunded_cents: refunded,
        ...(fully ? { status: "refunded" } : {}),
        updated_at: new Date().toISOString(),
      })
      .eq("stripe_invoice_id", invoiceId)
      .eq("environment", env);
  }
}

/** A church or nonprofit started a monthly plan at checkout. */
async function markOrgPlan(session: any, env: StripeEnv, status: string) {
  const planRowId = session.metadata?.orgPlanId;
  if (!planRowId) return;
  await getSupabase()
    .from("org_subscriptions")
    .update({
      status,
      stripe_subscription_id: idOf(session.subscription),
      stripe_customer_id: idOf(session.customer),
      updated_at: new Date().toISOString(),
    })
    .eq("id", planRowId)
    .eq("environment", env);
}

/** Keeps a plan's state and paid-through date current across renewals. */
async function syncOrgPlan(subscription: any, env: StripeEnv, patch: Record<string, unknown>) {
  if (!subscription?.id) return;
  const periodEnd =
    subscription.items?.data?.[0]?.current_period_end ?? subscription.current_period_end ?? null;
  await getSupabase()
    .from("org_subscriptions")
    .update({
      ...(periodEnd ? { current_period_end: new Date(periodEnd * 1000).toISOString() } : {}),
      ...patch,
      updated_at: new Date().toISOString(),
    })
    .eq("stripe_subscription_id", subscription.id)
    .eq("environment", env);
}

/** A professional started the small monthly fee for their page. */
async function markProPlan(session: any, env: StripeEnv, status: string) {
  const planRowId = session.metadata?.proPlanId;
  if (!planRowId) return;
  await getSupabase()
    .from("pro_subscriptions")
    .update({
      status,
      stripe_subscription_id: idOf(session.subscription),
      stripe_customer_id: idOf(session.customer),
      updated_at: new Date().toISOString(),
    })
    .eq("id", planRowId)
    .eq("environment", env);
}

/** Keeps a professional's page fee current across renewals. */
async function syncProPlan(subscription: any, env: StripeEnv, patch: Record<string, unknown>) {
  if (!subscription?.id) return;
  const periodEnd =
    subscription.items?.data?.[0]?.current_period_end ?? subscription.current_period_end ?? null;
  await getSupabase()
    .from("pro_subscriptions")
    .update({
      ...(periodEnd ? { current_period_end: new Date(periodEnd * 1000).toISOString() } : {}),
      ...patch,
      updated_at: new Date().toISOString(),
    })
    .eq("stripe_subscription_id", subscription.id)
    .eq("environment", env);
}

/** A gift to Witness itself — "keeping the light lit". */
async function markWitnessGift(session: any, env: StripeEnv, status: string) {
  const giftId = session?.metadata?.witnessGiftId;
  if (!giftId) return;
  await getSupabase()
    .from("witness_gifts")
    .update({
      status,
      amount_cents: session.amount_total ?? undefined,
      currency: session.currency ?? "usd",
      email: session.customer_details?.email ?? session.customer_email ?? null,
      stripe_session_id: session.id,
      stripe_subscription_id: idOf(session.subscription),
      ...(idOf(session.customer) ? { stripe_customer_id: idOf(session.customer) } : {}),
      updated_at: new Date().toISOString(),
    })
    .eq("id", giftId)
    .eq("environment", env);
}

/** A monthly gift to Witness renewed: record this month as its own row. */
async function recordWitnessRenewal(invoice: any, env: StripeEnv) {
  const subscriptionId = invoiceSubscriptionId(invoice);
  if (!subscriptionId || invoice.billing_reason === "subscription_create") return false;

  const supabase = getSupabase();
  const { data: first } = await supabase
    .from("witness_gifts")
    .select("user_id, email, donor_name, note, stripe_customer_id, pay_method")
    .eq("stripe_subscription_id", subscriptionId)
    .eq("environment", env)
    .order("created_at", { ascending: true })
    .limit(1)
    .maybeSingle();
  if (!first) return false;

  const periodEnd = invoice.lines?.data?.[0]?.period?.end ?? invoice.period_end ?? null;
  const { error } = await supabase.from("witness_gifts").insert({
    user_id: first.user_id,
    email: invoice.customer_email ?? first.email,
    donor_name: first.donor_name,
    note: first.note ?? "",
    amount_cents: invoice.amount_paid ?? 0,
    currency: invoice.currency ?? "usd",
    frequency: "monthly",
    status: "paid",
    stripe_subscription_id: subscriptionId,
    stripe_invoice_id: invoice.id,
    stripe_customer_id: first.stripe_customer_id ?? idOf(invoice.customer),
    receipt_url: invoice.hosted_invoice_url ?? null,
    current_period_end: periodEnd ? new Date(periodEnd * 1000).toISOString() : null,
    environment: env,
    pay_method: first.pay_method,
  });
  if (error && !error.message.includes("duplicate")) {
    console.error("Witness renewal insert failed:", error.message);
  }
  return true;
}

/** Keep a monthly gift to Witness in step with its subscription. */
async function syncWitnessSubscription(subscription: any, env: StripeEnv, patch: Record<string, unknown>) {
  if (!subscription?.id) return;
  await getSupabase()
    .from("witness_gifts")
    .update({ ...patch, updated_at: new Date().toISOString() })
    .eq("stripe_subscription_id", subscription.id)
    .eq("environment", env);
}

/**
 * Money just cleared. Send on whatever is owed to recipients who have a
 * confirmed bank account; anything not set up stays recorded as owed.
 */
async function sendOnWhatIsOwed(env: StripeEnv) {
  try {
    const { runDuePayouts } = await import("@/lib/payouts.server");
    await runDuePayouts(env);
  } catch (error) {
    console.error("Automatic payout pass failed:", error);
  }
}

async function handleWebhook(req: Request, env: StripeEnv) {
  const event = await verifyWebhook(req, env);

  switch (event.type) {
    case "checkout.session.completed": {
      const session = event.data.object;
      if (session.payment_status !== "unpaid") {
        await markOrder(session, env, "paid");
        await markDonation(session, env, "paid");
        await markFundGift(session, env, "paid");
        await markWitnessGift(session, env, "paid");
        await markJobContribution(session, env, "paid");
        await markOrgPlan(session, env, "active");
        await markProPlan(session, env, "active");
        await sendOnWhatIsOwed(env);
      } else {
        await markDonation(session, env, "pending");
        await markFundGift(session, env, "pending");
        await markWitnessGift(session, env, "pending");
        await markJobContribution(session, env, "pending");
      }
      break;
    }
    case "checkout.session.async_payment_succeeded":
      await markOrder(event.data.object, env, "paid");
      await markDonation(event.data.object, env, "paid");
      await markFundGift(event.data.object, env, "paid");
      await markWitnessGift(event.data.object, env, "paid");
      await markJobContribution(event.data.object, env, "paid");
      await sendOnWhatIsOwed(env);
      break;
    case "checkout.session.async_payment_failed":
      await markOrder(event.data.object, env, "failed");
      await markDonation(event.data.object, env, "failed");
      await markFundGift(event.data.object, env, "failed");
      await markWitnessGift(event.data.object, env, "failed");
      await markJobContribution(event.data.object, env, "failed");
      break;
    case "checkout.session.expired":
      await markOrder(event.data.object, env, "abandoned");
      await markDonation(event.data.object, env, "abandoned");
      await markFundGift(event.data.object, env, "abandoned");
      await markWitnessGift(event.data.object, env, "abandoned");
      await markJobContribution(event.data.object, env, "abandoned");
      break;
    case "invoice.paid": {
      const handledAsFund = await recordFundRenewal(event.data.object, env);
      const handledAsWitness = handledAsFund ? false : await recordWitnessRenewal(event.data.object, env);
      if (!handledAsFund && !handledAsWitness) await recordRenewal(event.data.object, env);
      await sendOnWhatIsOwed(env);
      await syncOrgPlan({ id: invoiceSubscriptionId(event.data.object) }, env, { status: "active" });
      await syncProPlan({ id: invoiceSubscriptionId(event.data.object) }, env, { status: "active" });
      break;
    }

    case "invoice.payment_failed":
      await markRenewalFailed(event.data.object, env);
      await syncFundSubscription(
        { id: invoiceSubscriptionId(event.data.object) },
        env,
        { status: "past_due" },
      );
      await syncOrgPlan({ id: invoiceSubscriptionId(event.data.object) }, env, { status: "past_due" });
      await syncProPlan({ id: invoiceSubscriptionId(event.data.object) }, env, { status: "past_due" });
      break;
    case "charge.refunded":
      await recordRefund(event.data.object, env);
      break;
    case "customer.subscription.created":
      await markSubscriptionGifts(event.data.object, env, "paid");
      break;
    case "customer.subscription.updated": {
      await syncSubscription(event.data.object, env);
      const sub = event.data.object;
      const item = sub.items?.data?.[0];
      const periodEnd = item?.current_period_end ?? sub.current_period_end;
      await syncFundSubscription(sub, env, {
        current_period_end: periodEnd ? new Date(periodEnd * 1000).toISOString() : null,
      });
      await syncOrgPlan(sub, env, sub.status === "past_due" ? { status: "past_due" } : { status: "active" });
      await syncProPlan(sub, env, sub.status === "past_due" ? { status: "past_due" } : { status: "active" });
      break;
    }
    case "customer.subscription.deleted":
      await endMonthlyGift(event.data.object, env);
      await syncFundSubscription(event.data.object, env, {
        status: "canceled",
        canceled_at: new Date().toISOString(),
      });
      await syncWitnessSubscription(event.data.object, env, {
        status: "canceled",
        canceled_at: new Date().toISOString(),
      });
      await syncOrgPlan(event.data.object, env, { status: "canceled" });
      await syncProPlan(event.data.object, env, { status: "canceled" });
      break;

    // A recipient finished (or changed) their bank setup: refresh their state
    // and send anything already owed to them.
    case "account.updated": {
      const account = event.data.object;
      const { applyAccountState, runDuePayouts } = await import("@/lib/payouts.server");
      const row = await applyAccountState(account.id, {
        payouts_enabled: account.payouts_enabled ?? false,
        details_submitted: account.details_submitted ?? false,
        disabled_reason: account.requirements?.disabled_reason ?? null,
      });
      if (row?.payouts_enabled) {
        await runDuePayouts(env, {
          orgId: row.org_id ?? undefined,
          userId: row.user_id ?? undefined,
        });
      }
      break;
    }
    // Money reached the recipient's bank.
    case "payout.paid":
      break;

    // One-tap gifts, given with something already on file.
    case "payment_intent.succeeded":
      await markDonationPayment(event.data.object, env, "paid");
      await sendOnWhatIsOwed(env);
      break;
    case "payment_intent.payment_failed":
      await markDonationPayment(event.data.object, env, "failed");
      break;

    default:
      console.log("Unhandled event:", event.type);
  }
}

export const Route = createFileRoute("/api/public/payments/webhook")({
  staticData: { sitemap: false },
  server: {
    handlers: {
      POST: async ({ request }) => {
        const rawEnv = new URL(request.url).searchParams.get("env");
        if (rawEnv !== "sandbox" && rawEnv !== "live") {
          console.error("Webhook received with invalid env:", rawEnv);
          return Response.json({ received: true, ignored: "invalid env" });
        }
        const env: StripeEnv = rawEnv;
        try {
          await handleWebhook(request, env);
          return Response.json({ received: true });
        } catch (e) {
          console.error("Webhook error:", e);
          return new Response("Webhook error", { status: 400 });
        }
      },
    },
  },
});
