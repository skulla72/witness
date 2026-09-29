import { createFileRoute } from "@tanstack/react-router";
import { timingSafeEqual } from "crypto";
import type { StripeEnv } from "@/lib/stripe.server";

/**
 * Runs on a schedule: sends every recipient balance that is owed and has a
 * finished payout account. Anything not yet set up simply waits.
 */
async function run(request: Request): Promise<Response> {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const presented = request.headers.get("x-payout-key") ?? "";
  const { data: keyRow } = await supabaseAdmin
    .from("reminder_cron_key")
    .select("key")
    .order("id")
    .limit(1)
    .maybeSingle();
  const expected = keyRow?.key ?? "";
  const ok =
    presented.length === expected.length &&
    expected.length > 0 &&
    timingSafeEqual(Buffer.from(presented), Buffer.from(expected));
  if (!ok) return new Response("Unauthorized", { status: 401 });

  const { runDuePayouts, isConnectUnavailable } = await import("@/lib/payouts.server");
  const results: Record<string, unknown> = {};

  for (const env of ["sandbox", "live"] as StripeEnv[]) {
    try {
      results[env] = await runDuePayouts(env);
    } catch (error) {
      if (isConnectUnavailable(error)) {
        results[env] = { skipped: "automatic payouts not switched on" };
      } else {
        console.error("Payout run failed:", env, error);
        results[env] = { error: "run failed" };
      }
    }
  }

  return Response.json({ ok: true, results });
}

export const Route = createFileRoute("/api/public/payouts/run")({
  staticData: { sitemap: false },
  server: { handlers: { POST: ({ request }) => run(request) } },
});
