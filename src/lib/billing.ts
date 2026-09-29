// What a professional is owed from pooled job funds, and what Witness keeps.

import { supabase } from "@/integrations/supabase/client";
import type { JobFund } from "@/lib/jobfund";
import { witnessShare } from "@/lib/jobfund";

export interface WorkMoney {
  collectingCents: number;
  heldCents: number;
  paidCents: number;
  witnessCents: number;
  jobs: JobFund[];
}

/** Every job fund pointed at this person, split by where the money sits. */
export async function myWorkMoney(userId: string): Promise<WorkMoney> {
  const { data } = await supabase
    .from("job_funds")
    .select("*")
    .eq("worker_id", userId)
    .order("created_at", { ascending: false })
    .limit(50);
  const jobs = (data ?? []) as JobFund[];

  const sum = (rows: JobFund[], pick: (f: JobFund) => number) =>
    rows.reduce((total, f) => total + pick(f), 0);

  const collecting = jobs.filter(f => f.status === "collecting");
  const held = jobs.filter(f => f.status === "funded" || f.status === "confirmed");
  const paid = jobs.filter(f => f.status === "released");

  return {
    collectingCents: sum(collecting, f => f.raised_cents),
    heldCents: sum(held, f => f.raised_cents - witnessShare(f)),
    paidCents: sum(paid, f => f.raised_cents - witnessShare(f)),
    witnessCents: sum([...held, ...paid], witnessShare),
    jobs,
  };
}

export function whenMonth(iso: string | null): string {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString("en-US", {
    month: "long",
    day: "numeric",
    year: "numeric",
  });
}
