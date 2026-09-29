import { supabase } from "@/integrations/supabase/client";
import type { Tables } from "@/integrations/supabase/types";
import { ORG_PUBLIC_COLUMNS, type Org } from "@/lib/community";
import type { Pro } from "@/lib/pros";

export type Testimonial = Tables<"platform_testimonials">;
export type TestimonialStatus = "pending" | "approved" | "changes_requested" | "removed";

export interface TestimonialStory extends Testimonial {
  subjectName: string;
  subjectSlug: string;
  subjectPhoto: string | null;
  subjectDetail: string;
}

export interface TestimonialDraft {
  subject_type: "church" | "professional";
  org_id: string | null;
  pro_id: string | null;
  headline: string;
  story: string;
  outcome: string;
  photo_url: string | null;
  consent_confirmed: boolean;
}

async function enrich(rows: Testimonial[]): Promise<TestimonialStory[]> {
  const orgIds = [...new Set(rows.map(row => row.org_id).filter((id): id is string => Boolean(id)))];
  const proIds = [...new Set(rows.map(row => row.pro_id).filter((id): id is string => Boolean(id)))];
  const [orgResult, proResult] = await Promise.all([
    orgIds.length
      ? supabase.from("organizations").select(ORG_PUBLIC_COLUMNS).in("id", orgIds)
      : Promise.resolve({ data: [] as Org[], error: null }),
    proIds.length
      ? supabase.from("pro_profiles").select("*").in("id", proIds).eq("status", "approved")
      : Promise.resolve({ data: [] as Pro[], error: null }),
  ]);
  if (orgResult.error) throw orgResult.error;
  if (proResult.error) throw proResult.error;
  const orgs = new Map((orgResult.data ?? []).map(org => [org.id, org as Org]));
  const pros = new Map((proResult.data ?? []).map(pro => [pro.id, pro as Pro]));

  return rows.flatMap(row => {
    if (row.subject_type === "church" && row.org_id) {
      const org = orgs.get(row.org_id);
      if (!org) return [];
      return [{
        ...row,
        subjectName: org.name,
        subjectSlug: org.slug,
        subjectPhoto: org.logo_url,
        subjectDetail: [org.city, org.region].filter(Boolean).join(", "),
      }];
    }
    if (row.subject_type === "professional" && row.pro_id) {
      const pro = pros.get(row.pro_id);
      if (!pro) return [];
      return [{
        ...row,
        subjectName: pro.display_name,
        subjectSlug: pro.slug,
        subjectPhoto: pro.photo_url,
        subjectDetail: [pro.trade, pro.city, pro.region].filter(Boolean).join(" · "),
      }];
    }
    return [];
  });
}

export async function publicTestimonials(): Promise<TestimonialStory[]> {
  const { data, error } = await supabase
    .from("platform_testimonials")
    .select("*")
    .eq("status", "approved")
    .order("created_at", { ascending: false })
    .limit(60);
  if (error) throw error;
  return enrich((data ?? []) as Testimonial[]);
}

export async function myTestimonials(userId: string): Promise<TestimonialStory[]> {
  const { data, error } = await supabase
    .from("platform_testimonials")
    .select("*")
    .eq("author_id", userId)
    .order("created_at", { ascending: false });
  if (error) throw error;
  return enrich((data ?? []) as Testimonial[]);
}

export async function submitTestimonial(userId: string, draft: TestimonialDraft) {
  const payload = {
    ...draft,
    author_id: userId,
    headline: draft.headline.trim(),
    story: draft.story.trim(),
    outcome: draft.outcome.trim(),
    photo_url: draft.photo_url?.trim() || null,
    status: "pending",
  };
  const { error } = await supabase.from("platform_testimonials").insert(payload);
  if (error) throw error;
}

export async function reviseTestimonial(id: string, draft: TestimonialDraft) {
  const { error } = await supabase
    .from("platform_testimonials")
    .update({
      ...draft,
      headline: draft.headline.trim(),
      story: draft.story.trim(),
      outcome: draft.outcome.trim(),
      photo_url: draft.photo_url?.trim() || null,
      status: "pending",
      review_note: null,
      reviewed_by: null,
      reviewed_at: null,
    })
    .eq("id", id);
  if (error) throw error;
}

export async function testimonialsForReview(): Promise<TestimonialStory[]> {
  const { data, error } = await supabase
    .from("platform_testimonials")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(200);
  if (error) throw error;
  return enrich((data ?? []) as Testimonial[]);
}

export async function reviewTestimonial(
  id: string,
  status: TestimonialStatus,
  note: string,
  reviewerId: string,
) {
  const { error } = await supabase
    .from("platform_testimonials")
    .update({
      status,
      review_note: note.trim() || null,
      reviewed_by: reviewerId,
      reviewed_at: new Date().toISOString(),
    })
    .eq("id", id);
  if (error) throw error;
}

export const TESTIMONIAL_STATUS: Record<string, string> = {
  pending: "Waiting on our team",
  approved: "Live",
  changes_requested: "Changes requested",
  removed: "Removed",
};