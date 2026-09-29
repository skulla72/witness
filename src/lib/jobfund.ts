import { supabase } from "@/integrations/supabase/client";
import type { Tables } from "@/integrations/supabase/types";
import { loadAuthors, type Author } from "@/lib/prayers";
import { PAYMENT_CATALOG } from "@/lib/paymentCatalog";

export type JobFund = Tables<"job_funds">;
export type JobContribution = Tables<"job_contributions">;
export type WorkerReview = Tables<"worker_reviews">;
export type WorkerMark = Tables<"worker_marks">;
export type WorkerReputation = Tables<"worker_reputation">;

export const FUND_STATUS_LABEL: Record<string, string> = {
  collecting: "Collecting",
  funded: "Fully funded",
  confirmed: "Work confirmed",
  released: "Paid to the worker",
  refunded: "Given back",
  redirected: "Left on the board",
  canceled: "Canceled",
};

export const JOB_PLATFORM_FEE_BPS = PAYMENT_CATALOG.fees.paidJobBps;

export const MARK_LABEL: Record<string, string> = {
  unfinished: "Didn't finish",
  no_show: "No-show",
  left_early: "Left early",
};

export function dollarsExact(cents: number): string {
  return `$${(cents / 100).toLocaleString("en-US", { minimumFractionDigits: cents % 100 ? 2 : 0, maximumFractionDigits: 2 })}`;
}

export function fundPct(f: Pick<JobFund, "goal_cents" | "raised_cents">): number {
  if (!f.goal_cents) return 0;
  return Math.min(100, Math.round((f.raised_cents / f.goal_cents) * 100));
}

export function witnessShare(f: Pick<JobFund, "raised_cents" | "platform_fee_bps">): number {
  return Math.floor((f.raised_cents * f.platform_fee_bps) / 10_000);
}

export async function loadFund(needId: string): Promise<JobFund | null> {
  const { data } = await supabase.from("job_funds").select("*").eq("need_id", needId).maybeSingle();
  return data ?? null;
}

export interface BackerRow extends JobContribution {
  author: Author | null;
}

/** Who chipped in — visible to the giver themselves and to whoever runs the job. */
export async function loadBackers(needId: string): Promise<BackerRow[]> {
  const { data } = await supabase
    .from("job_contributions")
    .select("*")
    .eq("need_id", needId)
    .eq("status", "paid")
    .order("created_at", { ascending: false });
  const rows = data ?? [];
  const ids = rows.map(r => r.user_id).filter((x): x is string => !!x);
  const authors = ids.length ? await loadAuthors(ids).catch(() => new Map<string, Author>()) : new Map<string, Author>();
  return rows.map(r => ({ ...r, author: r.user_id ? (authors.get(r.user_id) ?? null) : null }));
}

export async function openFund(input: {
  needId: string;
  userId: string;
  goalCents: number;
  workerId: string | null;
  workerName: string;
  workerLine: string;
}): Promise<JobFund> {
  const { data, error } = await supabase
    .from("job_funds")
    .insert({
      need_id: input.needId,
      created_by: input.userId,
      goal_cents: input.goalCents,
      worker_id: input.workerId,
      worker_name: input.workerName.slice(0, 120),
      worker_line: input.workerLine.slice(0, 120),
    })
    .select("*")
    .single();
  if (error) throw error;
  return data;
}

export async function setFundWorker(
  fundId: string,
  patch: { worker_id?: string | null; worker_name?: string; worker_line?: string; donated?: boolean },
) {
  const { error } = await supabase.from("job_funds").update(patch).eq("id", fundId);
  if (error) throw error;
}

/* ------------------------------ reviews ------------------------------ */

export interface ReviewRow extends WorkerReview {
  reviewer: Author;
  needTitle: string;
}

export async function loadWorkerReviews(workerId: string, limit = 20): Promise<ReviewRow[]> {
  const { data } = await supabase
    .from("worker_reviews")
    .select("*")
    .eq("worker_id", workerId)
    .order("created_at", { ascending: false })
    .limit(limit);
  const rows = data ?? [];
  if (!rows.length) return [];
  const authors = await loadAuthors(rows.map(r => r.reviewer_id)).catch(() => new Map<string, Author>());
  const { data: needs } = await supabase.from("needs").select("id, title").in("id", rows.map(r => r.need_id));
  const titles = new Map((needs ?? []).map(n => [n.id, n.title]));
  return rows.map(r => ({
    ...r,
    reviewer: authors.get(r.reviewer_id) ?? { id: r.reviewer_id, name: "Witness member", photo: null },
    needTitle: titles.get(r.need_id) ?? "A job",
  }));
}

export async function loadReviewsForNeed(needId: string): Promise<WorkerReview[]> {
  const { data } = await supabase.from("worker_reviews").select("*").eq("need_id", needId);
  return data ?? [];
}

export async function loadReputation(workerId: string): Promise<WorkerReputation | null> {
  const { data } = await supabase.from("worker_reputation").select("*").eq("user_id", workerId).maybeSingle();
  return data ?? null;
}

export async function addReview(input: {
  needId: string;
  workerId: string;
  reviewerId: string;
  reviewerRole: "poster" | "leader";
  stars: number;
  body: string;
  donated: boolean;
  hours: number | null;
}) {
  const { error } = await supabase.from("worker_reviews").insert({
    need_id: input.needId,
    worker_id: input.workerId,
    reviewer_id: input.reviewerId,
    reviewer_role: input.reviewerRole,
    stars: input.stars,
    body: input.body.slice(0, 1000),
    donated: input.donated,
    hours: input.hours,
  });
  if (error) throw error;
}

export async function loadMarksForNeed(needId: string): Promise<WorkerMark[]> {
  const { data } = await supabase.from("worker_marks").select("*").eq("need_id", needId);
  return data ?? [];
}

export async function addMark(input: {
  needId: string;
  workerId: string;
  userId: string;
  kind: "unfinished" | "no_show" | "left_early";
  note: string;
}) {
  const { error } = await supabase.from("worker_marks").insert({
    need_id: input.needId,
    worker_id: input.workerId,
    created_by: input.userId,
    kind: input.kind,
    note: input.note.slice(0, 500),
  });
  if (error) throw error;
}
