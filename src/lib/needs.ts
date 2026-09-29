import { supabase } from "@/integrations/supabase/client";
import type { Tables } from "@/integrations/supabase/types";
import { loadAuthors, type Author } from "@/lib/prayers";

export type Need = Tables<"needs">;
export type NeedUpdate = Tables<"need_updates">;
export type NeedPledge = Tables<"need_pledges">;
export type UpdateKind = NeedUpdate["kind"];

export const NEED_SKILLS = [
  "Roofing", "Framing", "Plumbing", "Electrical", "HVAC", "Landscaping", "Painting", "Concrete",
  "Drywall", "Flooring", "Welding", "Auto repair", "Hauling", "Cleaning", "Cooking", "Childcare",
  "Moving", "IT", "Bookkeeping", "Photography", "Videography",
] as const;

export const STATUS_LABEL: Record<Need["status"], string> = {
  open: "Open",
  funded: "Funded",
  in_progress: "Work underway",
  completed: "Done",
  closed: "Closed",
};

export const UPDATE_KIND_LABEL: Record<UpdateKind, string> = {
  before: "Before",
  progress: "Progress",
  after: "After",
  timelapse: "Time-lapse",
  story: "Their story",
  reaction: "The reaction",
  note: "Follow-up",
};

export function placeOf(n: Pick<Need, "city" | "region">): string {
  return [n.city, n.region].filter(Boolean).join(", ");
}

export function pctFunded(n: Pick<Need, "goal_cents" | "raised_cents">): number {
  if (!n.goal_cents) return 0;
  return Math.min(100, Math.round((n.raised_cents / n.goal_cents) * 100));
}

export function dollars(cents: number): string {
  return `$${Math.round(cents / 100).toLocaleString("en-US")}`;
}

export interface NeedWithOrg extends Need {
  org: { id: string; name: string; slug: string; kind: string; city: string; region: string } | null;
}

const ORG_COLS = "id, name, slug, kind, city, region";

async function attachOrgs<T extends Need>(rows: T[]): Promise<(T & { org: NeedWithOrg["org"] })[]> {
  const ids = Array.from(new Set(rows.map(r => r.org_id).filter((x): x is string => !!x)));
  const map = new Map<string, NeedWithOrg["org"]>();
  if (ids.length) {
    const { data } = await supabase.from("organizations").select(ORG_COLS).in("id", ids);
    for (const o of data ?? []) map.set(o.id, o);
  }
  return rows.map(r => ({ ...r, org: r.org_id ? (map.get(r.org_id) ?? null) : null }));
}

export type BoardFilter = "all" | "projects" | "prayers" | "hands" | "done";

export async function loadNeeds(filter: BoardFilter = "all"): Promise<NeedWithOrg[]> {
  let q = supabase.from("needs").select("*").order("created_at", { ascending: false }).limit(60);
  if (filter === "projects") q = q.eq("kind", "project");
  if (filter === "prayers") q = q.eq("kind", "prayer");
  if (filter === "hands") q = q.eq("needs_hands", true).in("status", ["open", "funded", "in_progress"]);
  if (filter === "done") q = q.eq("status", "completed");
  else q = q.neq("status", "closed");
  const { data, error } = await q;
  if (error) throw error;
  return attachOrgs(data ?? []);
}

/** This week's (or the latest) featured story — the videographer's visit. */
export async function loadFeaturedNeed(): Promise<NeedWithOrg | null> {
  const { data } = await supabase
    .from("needs")
    .select("*")
    .not("featured_week", "is", null)
    .neq("status", "closed")
    .order("featured_week", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (!data) return null;
  const [n] = await attachOrgs([data]);
  return n ?? null;
}

export async function loadNeed(id: string): Promise<NeedWithOrg | null> {
  const { data, error } = await supabase.from("needs").select("*").eq("id", id).maybeSingle();
  if (error) throw error;
  if (!data) return null;
  const [n] = await attachOrgs([data]);
  return n ?? null;
}

export async function loadNeedForPrayer(prayerId: string): Promise<Need | null> {
  const { data } = await supabase
    .from("needs")
    .select("*")
    .eq("prayer_id", prayerId)
    .neq("status", "closed")
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  return data ?? null;
}

export interface UpdateWithAuthor extends NeedUpdate { author: Author }

export async function loadUpdates(needId: string): Promise<UpdateWithAuthor[]> {
  const { data, error } = await supabase
    .from("need_updates")
    .select("*")
    .eq("need_id", needId)
    .order("created_at", { ascending: true });
  if (error) throw error;
  const rows = data ?? [];
  const authors = await loadAuthors(rows.map(r => r.author_id)).catch(() => new Map<string, Author>());
  return rows.map(r => ({ ...r, author: authors.get(r.author_id) ?? { id: r.author_id, name: "Witness member", photo: null } }));
}

export interface PledgeWithAuthor extends NeedPledge { author: Author }

export async function loadPledges(needId: string): Promise<PledgeWithAuthor[]> {
  const { data, error } = await supabase.from("need_pledges").select("*").eq("need_id", needId).order("created_at");
  if (error) throw error;
  const rows = data ?? [];
  const authors = await loadAuthors(rows.map(r => r.user_id));
  return rows.map(r => ({ ...r, author: authors.get(r.user_id) ?? { id: r.user_id, name: "Witness member", photo: null } }));
}

/** Upload a photo or video for a need; returns the storage path. */
export async function uploadNeedMedia(needId: string, userId: string, file: File): Promise<{ path: string; type: "image" | "video" }> {
  const type: "image" | "video" = file.type.startsWith("video/") ? "video" : "image";
  const ext = (file.name.split(".").pop() || (type === "video" ? "mp4" : "jpg")).toLowerCase().replace(/[^a-z0-9]/g, "") || "bin";
  const path = `${needId}/${userId}/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`;
  const { error } = await supabase.storage.from("need-media").upload(path, file, { contentType: file.type, upsert: false });
  if (error) throw error;
  return { path, type };
}

export interface NewNeed {
  kind: "prayer" | "project";
  title: string;
  story: string;
  city: string;
  region: string;
  org_id: string | null;
  prayer_id: string | null;
  goal_cents: number;
  needs_hands: boolean;
  hours_needed: number;
  skills: string[];
  is_public: boolean;
}

export async function createNeed(userId: string, input: NewNeed): Promise<Need> {
  const { data, error } = await supabase
    .from("needs")
    .insert({ ...input, posted_by: userId })
    .select("*")
    .single();
  if (error) throw error;
  return data;
}

export async function addUpdate(userId: string, needId: string, kind: UpdateKind, body: string, media?: { path: string; type: "image" | "video" } | null) {
  const { data, error } = await supabase.from("need_updates").insert({
    need_id: needId,
    author_id: userId,
    kind,
    body,
    media_path: media?.path ?? null,
    media_type: media?.type ?? null,
  }).select("id").single();
  if (error) throw error;
  // A before/during/after update fulfils the scheduled shoot it belongs to.
  const phase = phaseForKind(kind);
  if (phase && data) await captureShootForUpdate(needId, phase, data.id).catch(() => {});
  return data;
}

/* ---------------------------------------------------------------------------
 * The weekly videographer story: one scheduled visit per stage of the work.
 * ------------------------------------------------------------------------- */

export type NeedStory = Tables<"need_stories">;
export type StoryShoot = Tables<"story_shoots">;
export type ShootPhase = "before" | "during" | "after";

export const PHASES: ShootPhase[] = ["before", "during", "after"];

export const PHASE_LABEL: Record<ShootPhase, string> = {
  before: "Before",
  during: "During the work",
  after: "After",
};

export const PHASE_HINT: Record<ShootPhase, string> = {
  before: "The need as it stands — the leak, the cold house, the empty shelf.",
  during: "Hands on it: the crew, the sweat, the neighbors who showed up.",
  after: "The finished thing, and what the family says about it.",
};

export const STORY_STATUS_LABEL: Record<string, string> = {
  scheduled: "Booked",
  filming: "Filming",
  published: "Published",
  canceled: "Canceled",
};

export const SHOOT_STATUS_LABEL: Record<string, string> = {
  scheduled: "Scheduled",
  captured: "Captured",
  skipped: "Skipped",
};

/** Which scheduled visit an update of this kind belongs to. */
export function phaseForKind(kind: UpdateKind): ShootPhase | null {
  if (kind === "before") return "before";
  if (kind === "progress") return "during";
  if (kind === "after" || kind === "timelapse") return "after";
  return null;
}

export interface StoryPlan {
  story: NeedStory;
  shoots: StoryShoot[];
}

export async function loadStory(needId: string): Promise<StoryPlan | null> {
  const { data: story, error } = await supabase.from("need_stories").select("*").eq("need_id", needId).maybeSingle();
  if (error) throw error;
  if (!story) return null;
  const { data: shoots } = await supabase.from("story_shoots").select("*").eq("story_id", story.id).order("scheduled_for");
  return { story, shoots: shoots ?? [] };
}

/** The story on this week's featured need, if one is booked. */
export async function loadStoryForWeek(): Promise<(StoryPlan & { need: NeedWithOrg }) | null> {
  const { data: story } = await supabase
    .from("need_stories")
    .select("*")
    .neq("status", "canceled")
    .order("week_of", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (!story) return null;
  const need = await loadNeed(story.need_id);
  if (!need) return null;
  const { data: shoots } = await supabase.from("story_shoots").select("*").eq("story_id", story.id).order("scheduled_for");
  return { story, shoots: shoots ?? [], need };
}

export interface StoryOnBoard extends StoryPlan {
  need: NeedWithOrg;
}

/** Every booked story, newest week first — the filming schedule. */
export async function loadStories(limit = 24): Promise<StoryOnBoard[]> {
  const { data: stories, error } = await supabase
    .from("need_stories")
    .select("*")
    .order("week_of", { ascending: false })
    .limit(limit);
  if (error) throw error;
  const rows = stories ?? [];
  if (!rows.length) return [];

  const { data: needRows } = await supabase
    .from("needs")
    .select("*")
    .in("id", rows.map(s => s.need_id));
  const needs = await attachOrgs(needRows ?? []);
  const needMap = new Map(needs.map(n => [n.id, n]));

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

/** Monday of the week a date falls in, as YYYY-MM-DD. */
export function weekStart(date = new Date()): string {
  const d = new Date(date);
  const day = (d.getDay() + 6) % 7;
  d.setDate(d.getDate() - day);
  return d.toISOString().slice(0, 10);
}


/** Book the week's story. The three visits are created automatically. */
export async function bookStory(needId: string, weekOf: string, videographerName: string, notes: string): Promise<NeedStory> {
  const { data, error } = await supabase
    .from("need_stories")
    .insert({ need_id: needId, week_of: weekOf, videographer_name: videographerName, notes })
    .select("*")
    .single();
  if (error) throw error;
  return data;
}

export async function updateStory(id: string, patch: Partial<Pick<NeedStory, "week_of" | "videographer_name" | "notes" | "status">>) {
  const { error } = await supabase.from("need_stories").update(patch).eq("id", id);
  if (error) throw error;
}

export async function updateShoot(id: string, patch: Partial<Pick<StoryShoot, "scheduled_for" | "status" | "note">>) {
  const { error } = await supabase.from("story_shoots").update(patch).eq("id", id);
  if (error) throw error;
}

/** Mark the matching visit captured and attach the update it produced. */
async function captureShootForUpdate(needId: string, phase: ShootPhase, updateId: string) {
  const { data: story } = await supabase.from("need_stories").select("id").eq("need_id", needId).maybeSingle();
  if (!story) return;
  const { data: shoot } = await supabase
    .from("story_shoots")
    .select("id, status")
    .eq("story_id", story.id)
    .eq("phase", phase)
    .maybeSingle();
  if (!shoot || shoot.status === "captured") return;
  await supabase.from("story_shoots").update({ status: "captured", update_id: updateId }).eq("id", shoot.id);
}

/** Next visit still to come, so the page can say when the crew is due. */
export function nextShoot(shoots: StoryShoot[]): StoryShoot | null {
  return shoots.find(s => s.status === "scheduled") ?? null;
}


export async function setNeedStatus(needId: string, status: Need["status"]) {
  const { error } = await supabase
    .from("needs")
    .update({ status, ...(status === "completed" ? { completed_at: new Date().toISOString() } : {}) })
    .eq("id", needId);
  if (error) throw error;
}

export async function setNeedCover(needId: string, path: string) {
  const { error } = await supabase.from("needs").update({ cover_path: path }).eq("id", needId);
  if (error) throw error;
}

export async function offerHands(userId: string, needId: string, note: string) {
  const { error } = await supabase.from("need_pledges").insert({ need_id: needId, user_id: userId, note });
  if (error) throw error;
}

export async function setPledgeStatus(id: string, status: NeedPledge["status"]) {
  const { error } = await supabase.from("need_pledges").update({ status }).eq("id", id);
  if (error) throw error;
}

/** Organizations the person leads (for posting a church project). */
export async function myLedOrgs(userId: string): Promise<{ id: string; name: string; slug: string; kind: string; city: string; region: string }[]> {
  const { data: memberships } = await supabase
    .from("organization_members")
    .select("org_id, role")
    .eq("user_id", userId)
    .in("role", ["owner", "leader"]);
  const ids = (memberships ?? []).map(m => m.org_id);
  if (!ids.length) return [];
  const { data } = await supabase.from("organizations").select(ORG_COLS).in("id", ids).order("name");
  return data ?? [];
}

/** Nonprofits currently accepting gifts — the partners a "Fix that" can route money through. */
export async function acceptingPartners(): Promise<{ id: string; name: string; slug: string; kind: string; city: string; region: string }[]> {
  const { data: profiles } = await supabase.from("nonprofit_profiles").select("org_id").eq("accepting", true);
  const ids = (profiles ?? []).map(p => p.org_id);
  if (!ids.length) return [];
  const { data } = await supabase.from("organizations").select(ORG_COLS).in("id", ids).order("name");
  return data ?? [];
}
