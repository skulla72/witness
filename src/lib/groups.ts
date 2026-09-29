import { supabase } from "@/integrations/supabase/client";
import { loadAuthors, toAuthor, type Author } from "@/lib/prayers";
import { openDirectThread, sendMessage } from "@/lib/messaging";

export type GroupTone = "grief" | "prodigal" | "illness" | "marriage" | "addiction" | "caregivers" | "mental" | "mens" | "open";

/** A Walk-With circle as the app renders it, backed by organization_groups. */
export interface WalkGroup {
  id: string;
  org_id: string;
  topic: string;
  blurb: string;
  members: number;
  facilitator: Author | null;
  joined: boolean;
  tone: GroupTone;
  kind: "faith" | "open";
  cadence: string;
  next_meet: string;
  seats_total: number;
  seats_open: number;
  covenant: string[];
  door_question: string;
  accepting: boolean;
}

type GroupRow = {
  id: string; org_id: string; created_by: string | null; name: string; description: string; rhythm: string; accepting: boolean;
  tone: string; kind: string; door_question: string; covenant: string[]; seats_total: number; next_meet: string; member_count: number;
};

const COLS = "id, org_id, created_by, name, description, rhythm, accepting, tone, kind, door_question, covenant, seats_total, next_meet, member_count";

async function shape(rows: GroupRow[], userId: string | null): Promise<WalkGroup[]> {
  if (!rows.length) return [];
  const [facilitators, mine] = await Promise.all([
    loadAuthors(rows.map(r => r.created_by).filter((v): v is string => !!v)),
    userId ? supabase.from("group_members").select("group_id").eq("user_id", userId) : Promise.resolve({ data: [] as { group_id: string }[] }),
  ]);
  const joined = new Set((mine.data ?? []).map(m => m.group_id));
  return rows.map(r => ({
    id: r.id,
    org_id: r.org_id,
    topic: r.name,
    blurb: r.description,
    members: r.member_count,
    facilitator: r.created_by ? (facilitators.get(r.created_by) ?? toAuthor(null, r.created_by)) : null,
    joined: joined.has(r.id),
    tone: (r.tone as GroupTone) || "open",
    kind: r.kind === "open" ? "open" : "faith",
    cadence: r.rhythm,
    next_meet: r.next_meet,
    seats_total: r.seats_total,
    seats_open: Math.max(0, r.seats_total - r.member_count),
    covenant: r.covenant ?? [],
    door_question: r.door_question,
    accepting: r.accepting,
  }));
}

export async function loadGroups(userId: string | null): Promise<WalkGroup[]> {
  const { data, error } = await supabase.from("organization_groups").select(COLS).order("created_at", { ascending: true });
  if (error) throw error;
  return shape((data ?? []) as GroupRow[], userId);
}

export async function loadGroup(id: string, userId: string | null): Promise<WalkGroup | null> {
  const { data, error } = await supabase.from("organization_groups").select(COLS).eq("id", id).maybeSingle();
  if (error) throw error;
  if (!data) return null;
  const [g] = await shape([data as GroupRow], userId);
  return g ?? null;
}

export async function loadMyGroups(userId: string): Promise<WalkGroup[]> {
  const all = await loadGroups(userId);
  return all.filter(g => g.joined);
}

/** Members of a group (visible only to fellow members / org leaders under RLS). */
export async function loadRoster(groupId: string): Promise<Author[]> {
  const { data } = await supabase.from("group_members").select("user_id").eq("group_id", groupId);
  const ids = (data ?? []).map(m => m.user_id);
  const authors = await loadAuthors(ids);
  return ids.map(id => authors.get(id) ?? toAuthor(null, id));
}

/** Take a seat. Optionally sends the door answer privately to the facilitator. */
export async function joinGroup(group: WalkGroup, userId: string, doorAnswer: string) {
  // The seat check and claim happen in one locked step on the server, so two
  // people joining the last seat at the same moment can't both get in.
  const { data, error } = await supabase.rpc("join_group", { p_group_id: group.id });
  if (error) throw error;
  const status = data as string;
  if (status === "full") throw new Error("This circle just filled up. Another one will open.");
  if (status === "closed") throw new Error("This circle isn't taking new members right now.");
  if (status === "missing") throw new Error("We couldn't find that circle.");
  if (status === "signin") throw new Error("Sign in first.");
  const note = doorAnswer.trim();
  if (note && group.facilitator && group.facilitator.id !== userId) {
    const thread = await openDirectThread(userId, group.facilitator.id);
    if (thread.id) await sendMessage(thread.id, userId, `At the door of "${group.topic}" — ${group.door_question}\n\n${note}`);
  }
}

export async function leaveGroup(groupId: string, userId: string) {
  const { error } = await supabase.from("group_members").delete().eq("group_id", groupId).eq("user_id", userId);
  if (error) throw error;
}
