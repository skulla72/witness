import { createServerFn } from "@tanstack/react-start";

export interface ImpactTotals {
  givenCents: number;
  hoursServed: number;
}

/**
 * Community-wide running totals shown publicly at the bottom of the giving
 * screen. Returns aggregates only — never row data. Verified hours and
 * completed gifts in the live environment are counted.
 */
export const getImpactTotals = createServerFn({ method: "GET" }).handler(
  async (): Promise<ImpactTotals> => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const [gifts, hours] = await Promise.all([
      supabaseAdmin
        .from("donations")
        .select("amount_cents")
        .eq("status", "paid")
        .eq("environment", "live"),
      supabaseAdmin
        .from("service_hours")
        .select("hours")
        .eq("status", "verified"),
    ]);

    const givenCents = (gifts.data ?? []).reduce((sum, r) => sum + (r.amount_cents ?? 0), 0);
    const hoursServed = (hours.data ?? []).reduce((sum, r) => sum + (r.hours ?? 0), 0);

    return { givenCents, hoursServed };
  },
);
