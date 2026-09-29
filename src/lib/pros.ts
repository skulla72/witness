// Professional pages: a tradesperson, counselor or any service professional
// keeps their own page here. Pages stay hidden until our team approves them,
// and nobody can be booked before their identity check clears.

import { supabase } from "@/integrations/supabase/client";
import type { Tables } from "@/integrations/supabase/types";
import { slugify } from "@/lib/community";

export type Pro = Tables<"pro_profiles">;
export type ProReview = Tables<"pro_reviews">;
export type ProStrike = Tables<"pro_strikes">;
export type ProVerification = Tables<"pro_verifications">;

export const RATE_KINDS = [
  { key: "hourly", label: "Per hour" },
  { key: "flat", label: "Flat price" },
  { key: "quote", label: "By quote" },
] as const;

export const TRADES = [
  "Handyman",
  "Plumbing",
  "Electrical",
  "Roofing",
  "HVAC",
  "Landscaping",
  "Painting",
  "Cleaning",
  "Moving",
  "Auto repair",
  "Childcare",
  "Counseling",
  "Legal help",
  "Accounting",
  "Other",
] as const;

export const PRO_STATUS: Record<string, string> = {
  draft: "Not sent in yet",
  pending: "Waiting on our team",
  approved: "Live",
  removed: "Removed from search",
};

export function rateLine(pro: Pick<Pro, "rate_cents" | "rate_kind">): string {
  if (pro.rate_kind === "quote" || pro.rate_cents <= 0) return "Price by quote";
  const dollars = `$${(pro.rate_cents / 100).toFixed(0)}`;
  return pro.rate_kind === "hourly" ? `${dollars} an hour` : `${dollars} flat`;
}

export function proPlace(pro: Pick<Pro, "city" | "region">): string {
  return [pro.city, pro.region].filter(Boolean).join(", ");
}

/** Approved pages only — what someone looking for help sees. */
export async function listPros(query = ""): Promise<Pro[]> {
  let q = supabase.from("pro_profiles").select("*").eq("status", "approved");
  const term = query.trim();
  if (term) {
    const like = `%${term.replace(/[%,]/g, "")}%`;
    q = q.or(
      `display_name.ilike.${like},trade.ilike.${like},city.ilike.${like},region.ilike.${like},headline.ilike.${like}`,
    );
  }
  const { data, error } = await q.order("id_verified_at", { ascending: false }).limit(50);
  if (error) throw error;
  return (data ?? []) as Pro[];
}

export async function proBySlug(slug: string): Promise<Pro | null> {
  const { data, error } = await supabase.from("pro_profiles").select("*").eq("slug", slug).maybeSingle();
  if (error) throw error;
  return (data as Pro) ?? null;
}

export async function myProPage(userId: string): Promise<Pro | null> {
  const { data, error } = await supabase.from("pro_profiles").select("*").eq("user_id", userId).maybeSingle();
  if (error) throw error;
  return (data as Pro) ?? null;
}

export interface ProDraft {
  display_name: string;
  trade: string;
  headline: string;
  about: string;
  service_area: string;
  city: string;
  region: string;
  rate_cents: number;
  rate_kind: string;
  serves_free: boolean;
  website: string;
  photo_url: string | null;
}

/**
 * A phone number is kept apart from the page itself, so it is never handed out
 * with a public profile. Only the professional, our team, and whoever actually
 * hired them can read it.
 */
export async function saveProPhone(proId: string, phone: string) {
  const { error } = await supabase
    .from("pro_contacts")
    .upsert({ pro_id: proId, phone: phone.trim().slice(0, 40) }, { onConflict: "pro_id" });
  if (error) throw error;
}

export async function proPhone(proId: string): Promise<string> {
  const { data } = await supabase
    .from("pro_contacts")
    .select("phone")
    .eq("pro_id", proId)
    .maybeSingle();
  return data?.phone?.trim() ?? "";
}

/** Creates the page in "waiting on our team" state. */
export async function createProPage(userId: string, draft: ProDraft): Promise<Pro> {
  const base = slugify(`${draft.display_name} ${draft.city}`) || slugify(draft.display_name) || "pro";
  const slug = `${base}-${Math.random().toString(36).slice(2, 6)}`;
  const { data, error } = await supabase
    .from("pro_profiles")
    .insert({ user_id: userId, slug, status: "pending", ...draft })
    .select("*")
    .single();
  if (error) throw error;
  return data as Pro;
}

export async function saveProPage(id: string, draft: Partial<ProDraft>) {
  const { error } = await supabase.from("pro_profiles").update(draft).eq("id", id);
  if (error) throw error;
}

/* ---------- Two-way ratings ---------- */

export const jobKey = (needId: string, proId: string) => `${needId}:${proId}`;

/** Reviews on a pro's page. Hidden ones simply aren't returned by the database. */
export async function reviewsOfPro(proId: string): Promise<ProReview[]> {
  const { data, error } = await supabase
    .from("pro_reviews")
    .select("*")
    .eq("pro_id", proId)
    .eq("direction", "of_pro")
    .not("revealed_at", "is", null)
    .order("created_at", { ascending: false })
    .limit(50);
  if (error) throw error;
  return (data ?? []) as ProReview[];
}

export async function reviewsOfPerson(personId: string): Promise<ProReview[]> {
  const { data, error } = await supabase
    .from("pro_reviews")
    .select("*")
    .eq("subject_id", personId)
    .eq("direction", "of_homeowner")
    .not("revealed_at", "is", null)
    .order("created_at", { ascending: false })
    .limit(50);
  if (error) throw error;
  return (data ?? []) as ProReview[];
}

export function averageStars(reviews: Pick<ProReview, "stars">[]): number | null {
  if (!reviews.length) return null;
  return Math.round((reviews.reduce((s, r) => s + r.stars, 0) / reviews.length) * 10) / 10;
}

export async function myReviewFor(needId: string, proId: string, userId: string): Promise<ProReview | null> {
  const { data } = await supabase
    .from("pro_reviews")
    .select("*")
    .eq("job_key", jobKey(needId, proId))
    .eq("author_id", userId)
    .maybeSingle();
  return (data as ProReview) ?? null;
}

/** Both sides rate; neither is shown until both have, or a week passes. */
export async function rate(input: {
  needId: string;
  proId: string;
  authorId: string;
  subjectId: string;
  direction: "of_pro" | "of_homeowner";
  stars: number;
  body: string;
}) {
  const { error } = await supabase.from("pro_reviews").insert({
    pro_id: input.proId,
    need_id: input.needId,
    job_key: jobKey(input.needId, input.proId),
    author_id: input.authorId,
    subject_id: input.subjectId,
    direction: input.direction,
    stars: input.stars,
    body: input.body.trim().slice(0, 800),
  });
  if (error) throw error;
}

/* ---------- Identity check ---------- */

export async function verificationFor(proId: string): Promise<ProVerification | null> {
  const { data } = await supabase
    .from("pro_verifications")
    .select("*")
    .eq("pro_id", proId)
    .maybeSingle();
  return (data as ProVerification) ?? null;
}

/** Marks the identity check as started. Our team confirms the result. */
export async function startVerification(proId: string) {
  const { error } = await supabase
    .from("pro_verifications")
    .upsert({ pro_id: proId, status: "pending", provider: "" }, { onConflict: "pro_id" });
  if (error) throw error;
}

/* ---------- Strikes ---------- */

export async function strikesFor(proId: string): Promise<ProStrike[]> {
  const { data } = await supabase
    .from("pro_strikes")
    .select("*")
    .eq("pro_id", proId)
    .order("created_at", { ascending: false });
  return (data ?? []) as ProStrike[];
}

export function strikeCounts(strikes: Pick<ProStrike, "kind">[]) {
  return {
    no_show: strikes.filter(s => s.kind === "no_show").length,
    quality: strikes.filter(s => s.kind === "quality").length,
  };
}

/* ---------- Team tools ---------- */

export async function prosForReview(): Promise<Pro[]> {
  const { data, error } = await supabase
    .from("pro_profiles")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(200);
  if (error) throw error;
  return (data ?? []) as Pro[];
}

export async function decidePro(
  id: string,
  status: "approved" | "removed" | "pending",
  note: string,
  reviewerId: string,
) {
  const { error } = await supabase
    .from("pro_profiles")
    .update({
      status,
      review_note: note,
      reviewed_by: reviewerId,
      reviewed_at: new Date().toISOString(),
      ...(status === "removed" ? { removed_at: new Date().toISOString() } : { removed_at: null }),
    })
    .eq("id", id);
  if (error) throw error;
}

export async function setIdentityVerified(id: string, verified: boolean) {
  const { error } = await supabase
    .from("pro_profiles")
    .update({ id_verified_at: verified ? new Date().toISOString() : null })
    .eq("id", id);
  if (error) throw error;
}

export async function addStrike(
  proId: string,
  kind: "no_show" | "quality",
  note: string,
  adminId: string,
) {
  const { error } = await supabase
    .from("pro_strikes")
    .insert({ pro_id: proId, kind, note, created_by: adminId });
  if (error) throw error;
}
