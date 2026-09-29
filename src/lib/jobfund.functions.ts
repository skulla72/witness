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
import { assertJobAmountCents } from "@/lib/amounts";

const UUID = /^[0-9a-fA-F-]{36}$/;

interface ChipInInput {
  needId: string;
  amountCents: number;
  returnUrl: string;
  environment: StripeEnv;
  email?: string;
  donorName?: string;
  note?: string;
}

type ChipInResult = { clientSecret: string } | { error: string };

/**
 * Many people, small amounts, one job. Witness holds every dollar until the
 * poster confirms the work is finished — then it goes to the person who did it.
 */
export const chipInToJob = createServerFn({ method: "POST" })
  .inputValidator((data: ChipInInput) => {
    data.returnUrl = assertReturnUrl(data.returnUrl);
    if (!UUID.test(data.needId)) throw new Error("Invalid project");
    assertJobAmountCents(data.amountCents);
    if (data.amountCents % 100 !== 0) throw new Error("Choose a whole-dollar amount");
    if (data.note && data.note.length > 300) throw new Error("Note is too long");
    if (data.donorName && data.donorName.length > 80) throw new Error("Name is too long");
    return data;
  })
  .handler(async ({ data }): Promise<ChipInResult> => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { getOptionalUserId } = await import("@/lib/optional-auth.server");
    const userId = await getOptionalUserId();
    if (!userId) return { error: "Please sign in to give." };

    const { data: fund } = await supabaseAdmin
      .from("job_funds")
      .select("id, need_id, status, goal_cents, raised_cents, worker_name")
      .eq("need_id", data.needId)
      .maybeSingle();
    if (!fund) return { error: "This project isn't collecting for a hired job." };
    if (!["collecting", "funded"].includes(fund.status)) {
      return { error: "This job is no longer collecting." };
    }

    const { data: need } = await supabaseAdmin
      .from("needs")
      .select("id, title, status, is_public")
      .eq("id", data.needId)
      .maybeSingle();
    if (!need) return { error: "We couldn't find that project." };
    if (need.status === "closed") return { error: "This project is closed." };

    // The amount charged is decided here, from the job's own numbers: never
    // more than what the job still needs.
    const remaining = Math.max((fund.goal_cents ?? 0) - (fund.raised_cents ?? 0), 0);
    if (remaining <= 0) return { error: "This job is already fully funded." };
    const amountCents = Math.min(data.amountCents, remaining);
    if (amountCents < 100) return { error: "This job only needs a few cents more." };

    const { data: row, error: insertError } = await supabaseAdmin
      .from("job_contributions")
      .insert({
        fund_id: fund.id,
        need_id: fund.need_id,
        user_id: userId,
        email: data.email ?? null,
        donor_name: data.donorName ?? "",
        note: data.note ?? "",
        amount_cents: amountCents,
        status: "pending",
        environment: data.environment,
      })
      .select("id")
      .single();
    if (insertError || !row) return { error: "We couldn't start that. Try again." };

    try {
      const stripe = createStripeClient(data.environment);
      const customerId = await resolveOrCreateCustomer(stripe, {
        email: data.email,
        userId: userId ?? undefined,
      });
      const label = `Toward the job — ${need.title}`;
      const session = await stripe.checkout.sessions.create({
        mode: "payment",
        ui_mode: "embedded_page",
        return_url: data.returnUrl,
        line_items: [
          {
            quantity: 1,
            price_data: {
              currency: "usd",
              unit_amount: amountCents,
              product_data: {
                name: label,
                description:
                   `Held until the person who posted the job confirms the work is finished, with a photo. Witness keeps ${PAYMENT_CATALOG.fees.paidJobBps / 100}% to run the platform; the rest becomes the worker's payout balance.`,
              },
            },
          },
        ],
        ...(customerId
          ? { customer: customerId, customer_update: { name: "auto" as const } }
          : data.email
            ? { customer_email: data.email }
            : {}),
        payment_intent_data: {
          description: label,
          ...(data.email ? { receipt_email: data.email } : {}),
        },
        metadata: {
          jobContributionId: row.id,
          needId: fund.need_id,
          ...(userId ? { userId } : {}),
        },
      });

      await supabaseAdmin
        .from("job_contributions")
        .update({ stripe_session_id: session.id, stripe_customer_id: customerId ?? null })
        .eq("id", row.id);

      return { clientSecret: session.client_secret ?? "" };
    } catch (error) {
      await supabaseAdmin.from("job_contributions").update({ status: "failed" }).eq("id", row.id);
      return { error: getStripeErrorMessage(error) };
    }
  });

interface FundSummary {
  status: string;
  raisedCents: number;
  feeCents: number;
  toWorkerCents: number;
}

/** The poster (or the church leader) says the work is finished. Money can now go out. */
export const confirmJobFinished = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: { needId: string }) => {
    if (!UUID.test(data.needId)) throw new Error("Invalid project");
    return data;
  })
  .handler(async ({ data, context }): Promise<{ ok: true; summary: FundSummary } | { error: string }> => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { canManageNeed, feeCents } = await import("@/lib/jobfund.server");
    if (!(await canManageNeed(supabaseAdmin, data.needId, context.userId))) {
      return { error: "Only the person who posted this job, or their church leader, can confirm it." };
    }

    const { data: fund } = await supabaseAdmin
      .from("job_funds")
      .select("id, status, raised_cents, platform_fee_bps, worker_id")
      .eq("need_id", data.needId)
      .maybeSingle();
    if (!fund) return { error: "There's no job fund on this project." };
    if (fund.status === "released") return { error: "This one is already paid out." };
    if (!["collecting", "funded", "confirmed"].includes(fund.status)) {
      return { error: "This job fund is closed." };
    }

    // A finished job needs proof people can see.
    const { data: after } = await supabaseAdmin
      .from("need_updates")
      .select("id")
      .eq("need_id", data.needId)
      .in("kind", ["after", "timelapse"])
      .not("media_path", "is", null)
      .limit(1);
    if (!after || after.length === 0) {
      return { error: "Post the after photo first — the people who chipped in need to see it." };
    }

    const fee = feeCents(fund.raised_cents, fund.platform_fee_bps);
    await supabaseAdmin
      .from("job_funds")
      .update({
        status: "confirmed",
        confirmed_at: new Date().toISOString(),
        confirmed_by: context.userId,
        platform_fee_cents: fee,
        worker_balance_cents: fund.raised_cents - fee,
        payout_status: "ready",
      })
      .eq("id", fund.id);
    await supabaseAdmin
      .from("needs")
      .update({ status: "completed", completed_at: new Date().toISOString() })
      .eq("id", data.needId)
      .neq("status", "completed");

    // If the worker's bank account is already confirmed, the money goes now.
    let status = "ready_for_payout";
    if (fund.worker_id) {
      try {
        const { findAccount, runDuePayouts } = await import("@/lib/payouts.server");
        const { data: env } = await supabaseAdmin
          .from("job_funds")
          .select("environment")
          .eq("id", fund.id)
          .maybeSingle();
        const environment = (env?.environment ?? "sandbox") as StripeEnv;
        const account = await findAccount({ userId: fund.worker_id }, environment);
        if (account?.payouts_enabled) {
          const run = await runDuePayouts(environment, { userId: fund.worker_id });
          if (run.paid > 0) status = "paid_out";
        }
      } catch (error) {
        console.error("Automatic worker payout failed:", getStripeErrorMessage(error));
      }
    }

    return {
      ok: true,
      summary: {
        status,
        raisedCents: fund.raised_cents,
        feeCents: fee,
        toWorkerCents: fund.raised_cents - fee,
      },
    };
  });

/** Admin records that the worker has been paid out of the held money. */
export const releaseJobFunds = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: { needId: string; note?: string }) => {
    if (!UUID.test(data.needId)) throw new Error("Invalid project");
    if (data.note && data.note.length > 500) throw new Error("Note is too long");
    return data;
  })
  .handler(async ({ data, context }): Promise<{ ok: true } | { error: string }> => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { isAdmin } = await import("@/lib/jobfund.server");
    if (!(await isAdmin(supabaseAdmin, context.userId))) return { error: "Forbidden" };

    const { data: fund } = await supabaseAdmin
      .from("job_funds")
      .select("id, status")
      .eq("need_id", data.needId)
      .maybeSingle();
    if (!fund) return { error: "There's no job fund on this project." };
    if (fund.status !== "confirmed") return { error: "The work has to be confirmed finished first." };

    await supabaseAdmin
      .from("job_funds")
      .update({
        status: "released",
        released_at: new Date().toISOString(),
        released_by: context.userId,
        release_note: data.note ?? "",
      })
      .eq("id", fund.id);
    return { ok: true };
  });

/**
 * The job stalled. Default is money back to everyone who chipped in; the poster
 * can instead leave it on the board for another job.
 */
export const resolveStalledJob = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: { needId: string; action: "refund" | "keep" }) => {
    if (!UUID.test(data.needId)) throw new Error("Invalid project");
    if (data.action !== "refund" && data.action !== "keep") throw new Error("Invalid choice");
    return data;
  })
  .handler(async ({ data, context }): Promise<{ ok: true; refunded: number } | { error: string }> => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { canManageNeed } = await import("@/lib/jobfund.server");
    if (!(await canManageNeed(supabaseAdmin, data.needId, context.userId))) {
      return { error: "Only the poster, their church leader, or an admin can do that." };
    }

    const { data: fund } = await supabaseAdmin
      .from("job_funds")
      .select("id, status, environment")
      .eq("need_id", data.needId)
      .maybeSingle();
    if (!fund) return { error: "There's no job fund on this project." };
    if (fund.status === "released") return { error: "This one is already paid out." };

    const { data: paid } = await supabaseAdmin
      .from("job_contributions")
      .select("id, amount_cents, stripe_payment_intent_id, environment")
      .eq("fund_id", fund.id)
      .eq("status", "paid");
    const rows = paid ?? [];

    if (data.action === "keep") {
      await supabaseAdmin
        .from("job_contributions")
        .update({ status: "redirected" })
        .eq("fund_id", fund.id)
        .eq("status", "paid");
      await supabaseAdmin.from("job_funds").update({ status: "redirected" }).eq("id", fund.id);
      return { ok: true, refunded: 0 };
    }

    let refunded = 0;
    for (const row of rows) {
      if (!row.stripe_payment_intent_id) continue;
      try {
        const stripe = createStripeClient(row.environment as StripeEnv);
        await stripe.refunds.create({ payment_intent: row.stripe_payment_intent_id });
        await supabaseAdmin
          .from("job_contributions")
          .update({ status: "refunded", refunded_cents: row.amount_cents })
          .eq("id", row.id);
        refunded += row.amount_cents;
      } catch (error) {
        console.error("Refund failed:", getStripeErrorMessage(error));
      }
    }
    await supabaseAdmin.from("job_funds").update({ status: "refunded" }).eq("id", fund.id);
    return { ok: true, refunded };
  });
