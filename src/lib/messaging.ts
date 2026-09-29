import { supabase } from "@/integrations/supabase/client";

export interface ThreadPerson {
  user_id: string;
  display_name: string | null;
  avatar_url: string | null;
}

export interface Thread {
  id: string;
  title: string | null;
  is_group: boolean;
  last_message_at: string;
  people: ThreadPerson[];
  preview: string | null;
}

export interface Message {
  id: string;
  conversation_id: string;
  sender_id: string;
  body: string;
  kind: string;
  created_at: string;
}

export function isUuid(value: string): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(value);
}

async function peopleFor(userIds: string[]): Promise<Map<string, ThreadPerson>> {
  const map = new Map<string, ThreadPerson>();
  if (userIds.length === 0) return map;
  const { data } = await supabase.rpc("member_cards", { _ids: userIds });
  for (const p of data ?? []) map.set(p.user_id, { user_id: p.user_id, display_name: p.display_name, avatar_url: p.avatar_url });
  return map;
}

export interface PersonHit extends ThreadPerson {
  bio: string | null;
  business_name: string | null;
}

/** Find anyone with an account by name or business name. Signed-in users only. */
export async function searchPeople(query: string): Promise<PersonHit[]> {
  const q = query.trim();
  if (q.length < 2) return [];
  const { data } = await supabase.rpc("search_people", { _q: q, _limit: 12 });
  return (data ?? []).map(p => ({
    user_id: p.user_id,
    display_name: p.display_name,
    avatar_url: p.avatar_url,
    bio: p.bio,
    business_name: p.business_name,
  }));
}

/** Every thread this person belongs to, newest first. */
export async function listThreads(myUserId: string): Promise<Thread[]> {
  const { data: mine } = await supabase
    .from("conversation_members")
    .select("conversation_id")
    .eq("user_id", myUserId);

  const ids = (mine ?? []).map(m => m.conversation_id);
  if (ids.length === 0) return [];

  const [{ data: convos }, { data: members }, { data: recent }] = await Promise.all([
    supabase
      .from("conversations")
      .select("id, title, is_group, last_message_at")
      .in("id", ids)
      .order("last_message_at", { ascending: false }),
    supabase.from("conversation_members").select("conversation_id, user_id").in("conversation_id", ids),
    supabase
      .from("messages")
      .select("conversation_id, body, created_at")
      .in("conversation_id", ids)
      .order("created_at", { ascending: false })
      .limit(200),
  ]);

  const others = (members ?? []).filter(m => m.user_id !== myUserId).map(m => m.user_id);
  const people = await peopleFor([...new Set(others)]);

  const previews = new Map<string, string>();
  for (const m of recent ?? []) {
    if (!previews.has(m.conversation_id)) previews.set(m.conversation_id, m.body);
  }

  return (convos ?? []).map(c => ({
    id: c.id,
    title: c.title,
    is_group: c.is_group,
    last_message_at: c.last_message_at,
    preview: previews.get(c.id) ?? null,
    people: (members ?? [])
      .filter(m => m.conversation_id === c.id && m.user_id !== myUserId)
      .map(m => people.get(m.user_id) ?? { user_id: m.user_id, display_name: null, avatar_url: null }),
  }));
}

/** People you're allowed to message: your circle and anyone in your groups. */
export async function messageablepeople(myUserId: string): Promise<ThreadPerson[]> {
  const [{ data: myGroups }, { data: myOrgs }] = await Promise.all([
    supabase.from("group_members").select("group_id").eq("user_id", myUserId),
    supabase.from("organization_members").select("org_id").eq("user_id", myUserId),
  ]);

  const groupIds = (myGroups ?? []).map(g => g.group_id);
  const orgIds = (myOrgs ?? []).map(o => o.org_id);
  const ids = new Set<string>();

  if (groupIds.length > 0) {
    const { data } = await supabase.from("group_members").select("user_id").in("group_id", groupIds);
    for (const m of data ?? []) ids.add(m.user_id);
  }
  if (orgIds.length > 0) {
    const { data } = await supabase.from("organization_members").select("user_id").in("org_id", orgIds);
    for (const m of data ?? []) ids.add(m.user_id);
  }
  ids.delete(myUserId);

  const people = await peopleFor([...ids]);
  return [...people.values()].sort((a, b) =>
    (a.display_name ?? "").localeCompare(b.display_name ?? ""),
  );
}

/** Find the one-to-one thread with someone, or start it. */
export async function openDirectThread(
  myUserId: string,
  otherUserId: string,
): Promise<{ id?: string; error?: string }> {
  if (!isUuid(otherUserId)) return { error: "That person doesn't have an account yet." };

  const { data: mine } = await supabase
    .from("conversation_members")
    .select("conversation_id")
    .eq("user_id", myUserId);
  const ids = (mine ?? []).map(m => m.conversation_id);

  if (ids.length > 0) {
    const { data: rows } = await supabase
      .from("conversation_members")
      .select("conversation_id, user_id")
      .in("conversation_id", ids);
    const counts = new Map<string, string[]>();
    for (const r of rows ?? []) counts.set(r.conversation_id, [...(counts.get(r.conversation_id) ?? []), r.user_id]);
    for (const [cid, members] of counts) {
      if (members.length === 2 && members.includes(otherUserId)) return { id: cid };
    }
  }

  const { data: convo, error } = await supabase
    .from("conversations")
    .insert({ created_by: myUserId, is_group: false })
    .select("id")
    .single();
  if (error || !convo) return { error: error?.message ?? "Could not start the conversation." };

  const { error: memberError } = await supabase.from("conversation_members").insert([
    { conversation_id: convo.id, user_id: myUserId },
    { conversation_id: convo.id, user_id: otherUserId },
  ]);
  if (memberError) return { error: memberError.message };

  return { id: convo.id };
}

export async function loadMessages(conversationId: string): Promise<Message[]> {
  const { data } = await supabase
    .from("messages")
    .select("id, conversation_id, sender_id, body, kind, created_at")
    .eq("conversation_id", conversationId)
    .order("created_at", { ascending: true })
    .limit(500);
  return data ?? [];
}

export async function sendMessage(
  conversationId: string,
  senderId: string,
  body: string,
  kind: "text" | "call" | "prayer" = "text",
): Promise<{ error?: string }> {
  const trimmed = body.trim().slice(0, 4000);
  if (!trimmed) return {};
  const { error } = await supabase
    .from("messages")
    .insert({ conversation_id: conversationId, sender_id: senderId, body: trimmed, kind });
  if (error) return { error: error.message };
  await supabase
    .from("conversations")
    .update({ last_message_at: new Date().toISOString() })
    .eq("id", conversationId);
  return {};
}

export async function threadPeople(
  conversationId: string,
  myUserId: string,
): Promise<ThreadPerson[]> {
  const { data } = await supabase
    .from("conversation_members")
    .select("user_id")
    .eq("conversation_id", conversationId);
  const others = (data ?? []).map(m => m.user_id).filter(id => id !== myUserId);
  const people = await peopleFor(others);
  return others.map(id => people.get(id) ?? { user_id: id, display_name: null, avatar_url: null });
}

export function personName(person: ThreadPerson | undefined): string {
  return person?.display_name?.trim() || "Someone here";
}
