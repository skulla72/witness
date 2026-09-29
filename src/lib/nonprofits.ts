// Nonprofit discovery: the directory, the channels a nonprofit sits in, the
// nonprofits a person has chosen for their own giving, and suggestions that go
// in front of the board.

import { supabase } from "@/integrations/supabase/client";
import { ORG_PUBLIC_COLUMNS, type Org } from "@/lib/community";
import type { Tables } from "@/integrations/supabase/types";

export type LaneTag = Tables<"nonprofit_lane_tags">;
export type GivingChoice = Tables<"giving_choices">;
export type Suggestion = Tables<"nonprofit_suggestions">;

export const SUGGESTION_STATUS: Record<string, string> = {
  pending: "Waiting on the board",
  reviewing: "In front of the board",
  approved: "Approved",
  declined: "Not a fit yet",
};

/** Every nonprofit and foundation listed here. */
export async function listNonprofits(): Promise<Org[]> {
  const { data, error } = await supabase
    .from("organizations")
    .select(ORG_PUBLIC_COLUMNS)
    .in("kind", ["nonprofit", "ministry"])
    .order("verified", { ascending: false })
    .order("name");
  if (error) throw error;
  return (data ?? []) as Org[];
}

export async function laneTags(): Promise<LaneTag[]> {
  const { data, error } = await supabase.from("nonprofit_lane_tags").select("*");
  if (error) throw error;
  return (data ?? []) as LaneTag[];
}

/** Puts a nonprofit in a giving channel. Tags are add-or-remove, never edited. */
export async function addLaneTag(orgId: string, lane: string, userId: string) {
  const { error } = await supabase
    .from("nonprofit_lane_tags")
    .upsert({ org_id: orgId, lane, added_by: userId }, { onConflict: "org_id,lane" });
  if (error) throw error;
}

/** Takes a nonprofit out of a channel that doesn't fit it. */
export async function removeLaneTag(id: string) {
  const { error } = await supabase.from("nonprofit_lane_tags").delete().eq("id", id);
  if (error) throw error;
}

export async function myChoices(userId: string): Promise<GivingChoice[]> {
  const { data, error } = await supabase
    .from("giving_choices")
    .select("*")
    .eq("user_id", userId)
    .order("created_at", { ascending: false });
  if (error) throw error;
  return (data ?? []) as GivingChoice[];
}

export async function choose(userId: string, orgId: string, lane = "") {
  const { error } = await supabase
    .from("giving_choices")
    .upsert({ user_id: userId, org_id: orgId, lane }, { onConflict: "user_id,org_id" });
  if (error) throw error;
}

export async function unchoose(userId: string, orgId: string) {
  const { error } = await supabase
    .from("giving_choices")
    .delete()
    .eq("user_id", userId)
    .eq("org_id", orgId);
  if (error) throw error;
}

export interface SuggestionDraft {
  name: string;
  website: string;
  cause: string;
  lane: string;
  city: string;
  region: string;
  reason: string;
}

export async function suggestNonprofit(userId: string, draft: SuggestionDraft) {
  const { error } = await supabase.from("nonprofit_suggestions").insert({
    suggested_by: userId,
    status: "pending",
    ...draft,
  });
  if (error) throw error;
}

export async function mySuggestions(userId: string): Promise<Suggestion[]> {
  const { data, error } = await supabase
    .from("nonprofit_suggestions")
    .select("*")
    .eq("suggested_by", userId)
    .order("created_at", { ascending: false });
  if (error) throw error;
  return (data ?? []) as Suggestion[];
}

/** Team view: every suggestion, newest first. */
export async function allSuggestions(): Promise<Suggestion[]> {
  const { data, error } = await supabase
    .from("nonprofit_suggestions")
    .select("*")
    .order("created_at", { ascending: false });
  if (error) throw error;
  return (data ?? []) as Suggestion[];
}

export async function decideSuggestion(
  id: string,
  status: "pending" | "reviewing" | "approved" | "declined",
  note: string,
  reviewerId: string,
) {
  const { error } = await supabase
    .from("nonprofit_suggestions")
    .update({
      status,
      review_note: note,
      reviewed_by: reviewerId,
      reviewed_at: new Date().toISOString(),
    })
    .eq("id", id);
  if (error) throw error;
}
