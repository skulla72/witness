// The videographer workflow: a need's story gets requested, a videographer is
// assigned, the visits get scheduled, the finished film is delivered, and the
// link goes to the church that posted the need.

import { supabase } from "@/integrations/supabase/client";
import type { Tables } from "@/integrations/supabase/types";
import type { NeedStory, StoryShoot, NeedWithOrg } from "@/lib/needs";

export type Videographer = Tables<"videographers">;

export const VIDEOGRAPHER_STATUS: Record<string, string> = {
  pending: "Waiting on our team",
  approved: "On the roster",
  removed: "Off the roster",
};

export interface VideographerDraft {
  display_name: string;
  city: string;
  region: string;
  reel_url: string;
  about: string;
}

/** The roster a need manager can assign from. */
export async function approvedVideographers(): Promise<Videographer[]> {
  const { data, error } = await supabase
    .from("videographers")
    .select("*")
    .eq("status", "approved")
    .order("display_name");
  if (error) throw error;
  return data ?? [];
}

export async function myVideographerProfile(userId: string): Promise<Videographer | null> {
  const { data, error } = await supabase.from("videographers").select("*").eq("user_id", userId).maybeSingle();
  if (error) throw error;
  return data ?? null;
}

export async function applyAsVideographer(userId: string, draft: VideographerDraft): Promise<Videographer> {
  const { data, error } = await supabase
    .from("videographers")
    .insert({ user_id: userId, status: "pending", ...draft })
    .select("*")
    .single();
  if (error) throw error;
  return data;
}

export async function saveVideographerProfile(id: string, draft: Partial<VideographerDraft>) {
  const { error } = await supabase.from("videographers").update(draft).eq("id", id);
  if (error) throw error;
}

/** Our team's list, including people still waiting. */
export async function videographersForReview(): Promise<Videographer[]> {
  const { data, error } = await supabase
    .from("videographers")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(60);
  if (error) throw error;
  return data ?? [];
}

export async function setVideographerStatus(id: string, status: "pending" | "approved" | "removed") {
  const { error } = await supabase.from("videographers").update({ status }).eq("id", id);
  if (error) throw error;
}

/** Everything a videographer needs on one card. */
export interface Assignment {
  story: NeedStory;
  shoots: StoryShoot[];
  need: NeedWithOrg;
}

export async function myAssignments(userId: string): Promise<Assignment[]> {
  const { data: stories, error } = await supabase
    .from("need_stories")
    .select("*")
    .eq("videographer_id", userId)
    .order("week_of", { ascending: false })
    .limit(40);
  if (error) throw error;
  const rows = stories ?? [];
  if (!rows.length) return [];

  const { data: needRows } = await supabase.from("needs").select("*").in("id", rows.map(s => s.need_id));
  const needs = needRows ?? [];
  const orgIds = Array.from(new Set(needs.map(n => n.org_id).filter((x): x is string => !!x)));
  const orgMap = new Map<string, NeedWithOrg["org"]>();
  if (orgIds.length) {
    const { data: orgs } = await supabase
      .from("organizations")
      .select("id, name, slug, kind, city, region")
      .in("id", orgIds);
    for (const o of orgs ?? []) orgMap.set(o.id, o);
  }
  const needMap = new Map(
    needs.map(n => [n.id, { ...n, org: n.org_id ? (orgMap.get(n.org_id) ?? null) : null } as NeedWithOrg]),
  );

  const { data: shootRows } = await supabase
    .from("story_shoots")
    .select("*")
    .in("story_id", rows.map(s => s.id))
    .order("scheduled_for");
  const byStory = new Map<string, StoryShoot[]>();
  for (const shoot of shootRows ?? []) {
    const list = byStory.get(shoot.story_id) ?? [];
    list.push(shoot);
    byStory.set(shoot.story_id, list);
  }

  return rows.flatMap(story => {
    const need = needMap.get(story.need_id);
    if (!need) return [];
    return [{ story, shoots: byStory.get(story.id) ?? [], need }];
  });
}

/** Upload the finished film; returns the storage path inside the need's folder. */
export async function uploadFilm(needId: string, userId: string, file: File): Promise<string> {
  const ext = (file.name.split(".").pop() || "mp4").toLowerCase().replace(/[^a-z0-9]/g, "") || "mp4";
  const path = `${needId}/${userId}/film-${Date.now()}.${ext}`;
  const { error } = await supabase.storage.from("need-media").upload(path, file, { contentType: file.type });
  if (error) throw error;
  return path;
}

/** Hand the finished film in. The church still has to be told — that's a separate step. */
export async function deliverFilm(
  storyId: string,
  film: { film_path?: string; film_url?: string; delivery_note?: string },
) {
  const { error } = await supabase
    .from("need_stories")
    .update({
      film_path: film.film_path ?? "",
      film_url: film.film_url ?? "",
      delivery_note: film.delivery_note ?? "",
      delivered_at: new Date().toISOString(),
      status: "published",
    })
    .eq("id", storyId);
  if (error) throw error;
}

export function deliveryState(story: NeedStory): "unassigned" | "assigned" | "delivered" | "sent" {
  if (story.shared_at) return "sent";
  if (story.delivered_at) return "delivered";
  if (story.videographer_id) return "assigned";
  return "unassigned";
}

export const DELIVERY_LABEL: Record<ReturnType<typeof deliveryState>, string> = {
  unassigned: "Needs a videographer",
  assigned: "Camera assigned",
  delivered: "Film delivered",
  sent: "Link sent to the church",
};
