// Counselor pages: licensed counselors keep their own page. Pages stay hidden
// until our team checks the license. Requests for a first session are private
// between the person asking and the counselor.

import { supabase } from "@/integrations/supabase/client";
import type { Tables } from "@/integrations/supabase/types";
import { slugify } from "@/lib/community";

export type Counselor = Tables<"counselor_profiles">;
export type CounselorRequest = Tables<"counselor_requests">;

export const SPECIALTIES = [
  "Anxiety",
  "Depression",
  "Grief",
  "Marriage & couples",
  "Family",
  "Addiction",
  "Trauma",
  "Teens",
  "Life transitions",
  "Faith questions",
] as const;

export const LICENSE_TYPES = ["LPC", "LCSW", "LMFT", "Psychologist", "LMHC", "Other"] as const;

export const COUNSELOR_STATUS: Record<string, string> = {
  pending: "Waiting on our team to check your license",
  approved: "Live — license verified",
  removed: "Not showing right now",
};

export const REQUEST_STATUS: Record<string, string> = {
  pending: "Waiting to hear back",
  accepted: "Accepted",
  declined: "Not able to take this on",
};

export function counselorRate(c: Pick<Counselor, "rate_cents" | "sliding_scale">): string {
  const base = c.rate_cents > 0 ? `$${Math.round(c.rate_cents / 100)} a session` : "Rate on request";
  return c.sliding_scale ? `${base} · sliding scale` : base;
}

export interface CounselorFilters {
  term?: string;
  specialty?: string;
  state?: string;
  video?: boolean;
  faith?: boolean;
}

export async function listCounselors(f: CounselorFilters = {}): Promise<Counselor[]> {
  let q = supabase.from("counselor_profiles").select("*").eq("status", "approved");
  if (f.specialty) q = q.contains("specialties", [f.specialty]);
  if (f.state) q = q.ilike("license_state", f.state.trim());
  if (f.video) q = q.eq("offers_video", true);
  if (f.faith) q = q.eq("faith_integrated", true);
  const term = f.term?.trim().replace(/[%,]/g, "");
  if (term) q = q.or(`display_name.ilike.%${term}%,headline.ilike.%${term}%,city.ilike.%${term}%`);
  const { data, error } = await q.order("display_name").limit(60);
  if (error) throw error;
  return (data ?? []) as Counselor[];
}

export async function counselorBySlug(slug: string): Promise<Counselor | null> {
  const { data, error } = await supabase.from("counselor_profiles").select("*").eq("slug", slug).maybeSingle();
  if (error) throw error;
  return (data as Counselor) ?? null;
}

export async function myCounselorPage(userId: string): Promise<Counselor | null> {
  const { data, error } = await supabase.from("counselor_profiles").select("*").eq("user_id", userId).maybeSingle();
  if (error) throw error;
  return (data as Counselor) ?? null;
}

export type CounselorDraft = Pick<
  Counselor,
  | "display_name" | "headline" | "about" | "license_type" | "license_number" | "license_state"
  | "specialties" | "languages" | "offers_video" | "offers_in_person" | "city" | "region"
  | "rate_cents" | "sliding_scale" | "faith_integrated" | "photo_url"
>;

export async function saveCounselorPage(userId: string, draft: CounselorDraft, existing?: Counselor | null) {
  if (existing) {
    const { error } = await supabase.from("counselor_profiles").update(draft).eq("id", existing.id);
    if (error) throw error;
    return existing.slug;
  }
  const slug = `${slugify(draft.display_name) || "counselor"}-${Math.random().toString(36).slice(2, 6)}`;
  const { error } = await supabase.from("counselor_profiles").insert({ ...draft, user_id: userId, slug, status: "pending" });
  if (error) throw error;
  return slug;
}

export async function requestSession(counselorId: string, userId: string, message: string, prefersVideo: boolean) {
  const { error } = await supabase.from("counselor_requests").insert({
    counselor_id: counselorId, requester_id: userId, message, prefers_video: prefersVideo,
  });
  if (error) throw error;
}

export async function myRequestTo(counselorId: string, userId: string): Promise<CounselorRequest | null> {
  const { data, error } = await supabase.from("counselor_requests").select("*")
    .eq("counselor_id", counselorId).eq("requester_id", userId)
    .order("created_at", { ascending: false }).limit(1).maybeSingle();
  if (error) throw error;
  return (data as CounselorRequest) ?? null;
}

export async function requestsForMe(counselorId: string): Promise<CounselorRequest[]> {
  const { data, error } = await supabase.from("counselor_requests").select("*")
    .eq("counselor_id", counselorId).order("created_at", { ascending: false });
  if (error) throw error;
  return (data ?? []) as CounselorRequest[];
}

export async function answerRequest(id: string, status: "accepted" | "declined") {
  const { error } = await supabase.from("counselor_requests").update({ status, updated_at: new Date().toISOString() }).eq("id", id);
  if (error) throw error;
}

/** Team view */
export async function allCounselorPages(): Promise<Counselor[]> {
  const { data, error } = await supabase.from("counselor_profiles").select("*").order("created_at", { ascending: false });
  if (error) throw error;
  return (data ?? []) as Counselor[];
}

export async function reviewCounselor(id: string, status: "approved" | "removed" | "pending", note: string) {
  const { error } = await supabase.from("counselor_profiles").update({
    status, review_note: note, license_verified_at: status === "approved" ? new Date().toISOString() : null,
  }).eq("id", id);
  if (error) throw error;
}

export async function orgCounselors(orgId: string): Promise<Counselor[]> {
  const { data, error } = await supabase.from("org_counselors")
    .select("counselor_profiles(*)").eq("org_id", orgId);
  if (error) throw error;
  return ((data ?? []) as unknown as Array<{ counselor_profiles: Counselor | null }>)
    .map(r => r.counselor_profiles).filter((c): c is Counselor => !!c && c.status === "approved");
}

export async function linkOrgCounselor(orgId: string, counselorId: string) {
  const { error } = await supabase.from("org_counselors").upsert({ org_id: orgId, counselor_id: counselorId }, { onConflict: "org_id,counselor_id" });
  if (error) throw error;
}

export async function unlinkOrgCounselor(orgId: string, counselorId: string) {
  const { error } = await supabase.from("org_counselors").delete().eq("org_id", orgId).eq("counselor_id", counselorId);
  if (error) throw error;
}
