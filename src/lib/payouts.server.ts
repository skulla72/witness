import {
  type StripeEnv,
  createStripeClient,
  getStripeErrorMessage,
} from "@/lib/stripe.server";

/**
 * Automatic payouts. Money a giver sends lands with Witness first; the
 * recipient's share is then transferred to their own connected account.
 *
 * Nothing here ever marks money as paid unless the provider confirmed a real
 * transfer. A failed transfer stays visible as still owed.
 */

export type RecipientKind = "org" | "person";
export type SourceKind = "donation" | "job_fund";

export interface ConnectedAccountRow {
  id: string;
  org_id: string | null;
  user_id: string | null;
  environment: string;
  stripe_account_id: string;
  status: string;
  payouts_enabled: boolean;
  details_submitted: boolean;
  disabled_reason: string | null;
}

/** Stripe tells us Connect itself has never been turned on for this account. */
export function isConnectUnavailable(error: unknown): boolean {
  const message = getStripeErrorMessage(error).toLowerCase();
  return message.includes("signed up for connect") || message.includes("enable connect");
}

export const CONNECT_OFF_MESSAGE =
  "Automatic payouts aren't switched on for the Witness payments account yet. Once the team turns it on, this page will finish setup for you.";

type Admin = Awaited<
  typeof import("@/integrations/supabase/client.server")
>["supabaseAdmin"];

async function admin(): Promise<Admin> {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  return supabaseAdmin;
}

export async function findAccount(
  owner: { orgId?: string | undefined; userId?: string | undefined },
  env: StripeEnv,
): Promise<ConnectedAccountRow | null> {
  const db = await admin();
  let query = db
    .from("connected_accounts")
    .select(
      "id, org_id, user_id, environment, stripe_account_id, status, payouts_enabled, details_submitted, disabled_reason",
    )
    .eq("environment", env);
  query = owner.orgId ? query.eq("org_id", owner.orgId) : query.eq("user_id", owner.userId!);
  const { data } = await query.maybeSingle();
  return (data as ConnectedAccountRow) ?? null;
}

/**
 * Creates the recipient's own account at the provider, once, and remembers it.
 *
 * Anything we already know — their name, website and where they are — is passed
 * along so the setup screens ask for as little as possible.
 */
export async function ensureAccount(
  owner: {
    orgId?: string | undefined;
    userId?: string | undefined;
    email?: string | undefined;
    name?: string | undefined;
    url?: string | undefined;
    phone?: string | undefined;
    city?: string | undefined;
    state?: string | undefined;
  },
  env: StripeEnv,
  createdBy: string,
): Promise<ConnectedAccountRow> {
  const existing = await findAccount(owner, env);
  if (existing) return existing;

  const address =
    owner.city || owner.state
      ? {
          address: {
            ...(owner.city ? { city: owner.city } : {}),
            ...(owner.state ? { state: owner.state } : {}),
            country: "US",
          },
        }
      : {};

  const stripe = createStripeClient(env);
  const account = await stripe.accounts.create({
    type: "express",
    country: "US",
    ...(owner.email ? { email: owner.email } : {}),
    ...(owner.orgId ? { business_type: "company" as const } : {}),
    business_profile: {
      ...(owner.name ? { name: owner.name } : {}),
      ...(owner.url ? { url: owner.url } : {}),
      ...(owner.phone ? { support_phone: owner.phone } : {}),
      product_description: owner.orgId
        ? "Receives gifts given by people through Witness."
        : "Receives payment for finished work arranged through Witness.",
    },
    ...(owner.orgId ? { company: { ...(owner.name ? { name: owner.name } : {}), ...address } } : {}),
    capabilities: { transfers: { requested: true } },
    metadata: {
      ...(owner.orgId ? { orgId: owner.orgId } : {}),
      ...(owner.userId ? { userId: owner.userId } : {}),
    },
    settings: { payouts: { schedule: { interval: "daily" } } },
  });


  const db = await admin();
  const { data, error } = await db
    .from("connected_accounts")
    .insert({
      org_id: owner.orgId ?? null,
      user_id: owner.userId ?? null,
      environment: env,
      stripe_account_id: account.id,
      status: "onboarding",
      payouts_enabled: account.payouts_enabled ?? false,
      details_submitted: account.details_submitted ?? false,
      created_by: createdBy,
    })
    .select(
      "id, org_id, user_id, environment, stripe_account_id, status, payouts_enabled, details_submitted, disabled_reason",
    )
    .single();
  if (error || !data) throw new Error("We couldn't save the payout account. Try again.");
  return data as ConnectedAccountRow;
}

export async function onboardingLink(
  stripeAccountId: string,
  env: StripeEnv,
  urls: { returnUrl: string; refreshUrl: string },
): Promise<string> {
  const stripe = createStripeClient(env);
  const link = await stripe.accountLinks.create({
    account: stripeAccountId,
    return_url: urls.returnUrl,
    refresh_url: urls.refreshUrl,
    type: "account_onboarding",
    // Ask only for what's outstanding right now, so nobody re-answers questions.
    collection_options: { fields: "currently_due", future_requirements: "omit" },
  });
  return link.url;
}

/** Pulls the live state of a connected account into our own records. */
export async function syncAccount(
  stripeAccountId: string,
  env: StripeEnv,
): Promise<ConnectedAccountRow | null> {
  const stripe = createStripeClient(env);
  const account = await stripe.accounts.retrieve(stripeAccountId);
  return applyAccountState(stripeAccountId, {
    payouts_enabled: account.payouts_enabled ?? false,
    details_submitted: account.details_submitted ?? false,
    disabled_reason: account.requirements?.disabled_reason ?? null,
  });
}

export async function applyAccountState(
  stripeAccountId: string,
  state: {
    payouts_enabled: boolean;
    details_submitted: boolean;
    disabled_reason: string | null;
  },
): Promise<ConnectedAccountRow | null> {
  const db = await admin();
  const status = state.payouts_enabled
    ? "ready"
    : state.details_submitted
      ? "in_review"
      : "onboarding";
  const { data } = await db
    .from("connected_accounts")
    .update({ ...state, status })
    .eq("stripe_account_id", stripeAccountId)
    .select(
      "id, org_id, user_id, environment, stripe_account_id, status, payouts_enabled, details_submitted, disabled_reason",
    )
    .maybeSingle();
  const row = (data as ConnectedAccountRow) ?? null;

  // An organization whose bank account is confirmed can receive gifts.
  if (row?.org_id && row.payouts_enabled) {
    await db.from("org_payout_accounts").upsert(
      {
        org_id: row.org_id,
        provider: "stripe",
        account_reference: row.stripe_account_id,
        status: "verified",
      },
      { onConflict: "org_id" },
    );
  }
  return row;
}

interface TransferJob {
  sourceKind: SourceKind;
  sourceId: string;
  amountCents: number;
  account: ConnectedAccountRow;
  description: string;
}

/**
 * One transfer, recorded before it is attempted so the same balance can never
 * go out twice.
 */
async function sendOne(job: TransferJob, env: StripeEnv): Promise<"paid" | "skipped" | "failed"> {
  const db = await admin();
  const { data: row, error: claimError } = await db
    .from("payout_transfers")
    .insert({
      source_kind: job.sourceKind,
      source_id: job.sourceId,
      connected_account_id: job.account.id,
      stripe_account_id: job.account.stripe_account_id,
      org_id: job.account.org_id,
      user_id: job.account.user_id,
      amount_cents: job.amountCents,
      environment: env,
      status: "pending",
    })
    .select("id")
    .single();
  // A pending or paid transfer already exists for this source — leave it alone.
  if (claimError || !row) return "skipped";

  try {
    const stripe = createStripeClient(env);
    const transfer = await stripe.transfers.create(
      {
        amount: job.amountCents,
        currency: "usd",
        destination: job.account.stripe_account_id,
        description: job.description,
        metadata: { sourceKind: job.sourceKind, sourceId: job.sourceId },
      },
      { idempotencyKey: `${job.sourceKind}:${job.sourceId}:${env}` },
    );
    await db
      .from("payout_transfers")
      .update({ status: "paid", stripe_transfer_id: transfer.id })
      .eq("id", row.id);

    const paidPatch = {
      payout_status: "paid",
      payout_reference: transfer.id,
      paid_out_at: new Date().toISOString(),
    };
    if (job.sourceKind === "donation") {
      await db.from("donations").update(paidPatch).eq("id", job.sourceId);
      await closeFundGiftIfSettled(job.sourceId);
    } else {
      await db.from("job_funds").update({ ...paidPatch, status: "released" }).eq("id", job.sourceId);
    }
    return "paid";
  } catch (error) {
    // Still owed. Never presented as paid.
    await db
      .from("payout_transfers")
      .update({ status: "failed", failure_message: getStripeErrorMessage(error) })
      .eq("id", row.id);
    return "failed";
  }
}

/** A split Fund gift is settled only once every organization's share has gone out. */
async function closeFundGiftIfSettled(donationId: string): Promise<void> {
  const db = await admin();
  const { data: donation } = await db
    .from("donations")
    .select("fund_gift_id")
    .eq("id", donationId)
    .maybeSingle();
  const fundGiftId = donation?.fund_gift_id;
  if (!fundGiftId) return;
  const { data: outstanding } = await db
    .from("donations")
    .select("id")
    .eq("fund_gift_id", fundGiftId)
    .neq("payout_status", "paid")
    .limit(1);
  if (outstanding && outstanding.length > 0) return;
  await db
    .from("fund_gifts")
    .update({ payout_status: "paid", paid_out_at: new Date().toISOString() })
    .eq("id", fundGiftId);
}

export interface PayoutRun {
  paid: number;
  paidCents: number;
  failed: number;
  waiting: number;
}

/**
 * Sends every recipient share that is owed and has somewhere to go. Shares
 * whose recipient hasn't finished payout setup are counted as waiting.
 */
export async function runDuePayouts(
  env: StripeEnv,
  filter?: { orgId?: string | undefined; userId?: string | undefined },
): Promise<PayoutRun> {
  const db = await admin();
  const run: PayoutRun = { paid: 0, paidCents: 0, failed: 0, waiting: 0 };
  const accounts = new Map<string, ConnectedAccountRow | null>();

  const accountFor = async (
    owner: { orgId?: string | undefined; userId?: string | undefined },
  ): Promise<ConnectedAccountRow | null> => {
    const key = owner.orgId ? `org:${owner.orgId}` : `person:${owner.userId}`;
    if (!accounts.has(key)) accounts.set(key, await findAccount(owner, env));
    const found = accounts.get(key) ?? null;
    return found?.payouts_enabled ? found : null;
  };

  // Gifts to nonprofits and organizations, including Fund shares.
  let gifts = db
    .from("donations")
    .select("id, org_id, recipient_cents, payout_status")
    .eq("environment", env)
    .eq("status", "paid")
    .in("payout_status", ["awaiting_setup", "ready", "failed"])
    .gt("recipient_cents", 0)
    .not("org_id", "is", null)
    .limit(200);
  if (filter?.orgId) gifts = gifts.eq("org_id", filter.orgId);
  const { data: giftRows } = await gifts;

  for (const gift of giftRows ?? []) {
    const account = await accountFor({ orgId: gift.org_id as string });
    if (!account) {
      run.waiting += 1;
      continue;
    }
    const result = await sendOne(
      {
        sourceKind: "donation",
        sourceId: gift.id,
        amountCents: gift.recipient_cents as number,
        account,
        description: "Gift from Witness givers",
      },
      env,
    );
    if (result === "paid") {
      run.paid += 1;
      run.paidCents += gift.recipient_cents as number;
    } else if (result === "failed") run.failed += 1;
  }

  // Finished jobs: the worker's balance after the Witness share.
  let jobs = db
    .from("job_funds")
    .select("id, worker_id, worker_balance_cents, payout_status, status")
    .eq("environment", env)
    .in("payout_status", ["ready", "failed"])
    .gt("worker_balance_cents", 0)
    .not("worker_id", "is", null)
    .limit(200);
  if (filter?.userId) jobs = jobs.eq("worker_id", filter.userId);
  const { data: jobRows } = await jobs;

  for (const job of jobRows ?? []) {
    const account = await accountFor({ userId: job.worker_id as string });
    if (!account) {
      run.waiting += 1;
      continue;
    }
    const result = await sendOne(
      {
        sourceKind: "job_fund",
        sourceId: job.id,
        amountCents: job.worker_balance_cents as number,
        account,
        description: "Finished job paid by Witness givers",
      },
      env,
    );
    if (result === "paid") {
      run.paid += 1;
      run.paidCents += job.worker_balance_cents as number;
    } else if (result === "failed") run.failed += 1;
  }

  return run;
}
