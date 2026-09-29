import { supabase } from "@/integrations/supabase/client";

export type FriendStatus = "none" | "pending_out" | "pending_in" | "friends" | "declined_out";

export interface FriendLink {
  id: string;
  requester_id: string;
  addressee_id: string;
  status: "pending" | "accepted" | "declined";
  created_at: string;
}

export interface FriendRequest extends FriendLink {
  person: { user_id: string; display_name: string | null; avatar_url: string | null; bio: string | null };
}

async function cards(ids: string[]) {
  const map = new Map<string, { user_id: string; display_name: string | null; avatar_url: string | null; bio: string | null }>();
  if (ids.length === 0) return map;
  const { data } = await supabase.rpc("member_cards", { _ids: ids });
  for (const p of data ?? []) {
    map.set(p.user_id, { user_id: p.user_id, display_name: p.display_name, avatar_url: p.avatar_url, bio: p.bio });
  }
  return map;
}

/** The link between me and one other person, if any. */
export async function friendLink(myUserId: string, otherId: string): Promise<FriendLink | null> {
  const { data } = await supabase
    .from("friendships")
    .select("id, requester_id, addressee_id, status, created_at")
    .or(
      `and(requester_id.eq.${myUserId},addressee_id.eq.${otherId}),and(requester_id.eq.${otherId},addressee_id.eq.${myUserId})`,
    )
    .maybeSingle();
  return data ? { ...data, status: data.status as FriendLink["status"] } : null;
}

export function statusFor(link: FriendLink | null, myUserId: string): FriendStatus {
  if (!link) return "none";
  if (link.status === "accepted") return "friends";
  if (link.status === "declined") return link.requester_id === myUserId ? "declined_out" : "none";
  return link.requester_id === myUserId ? "pending_out" : "pending_in";
}

/** Ask someone to connect. */
export async function askToConnect(myUserId: string, otherId: string): Promise<{ error?: string }> {
  if (myUserId === otherId) return { error: "You're already yourself." };
  const existing = await friendLink(myUserId, otherId);
  if (existing) {
    if (existing.status === "accepted") return { error: "You're already connected." };
    if (existing.status === "pending") {
      return existing.addressee_id === myUserId
        ? await respond(existing.id, "accepted")
        : { error: "Your request is still waiting on them." };
    }
    // A previously declined request can be re-sent by either side.
    const { error } = await supabase
      .from("friendships")
      .delete()
      .eq("id", existing.id);
    if (error) return { error: error.message };
  }
  const { error } = await supabase
    .from("friendships")
    .insert({ requester_id: myUserId, addressee_id: otherId, status: "pending" });
  if (error) return { error: error.message };
  return {};
}

/** The invited person answers. */
export async function respond(linkId: string, status: "accepted" | "declined"): Promise<{ error?: string }> {
  const { error } = await supabase.from("friendships").update({ status }).eq("id", linkId);
  if (error) return { error: error.message };
  return {};
}

/** Either side walks it back. */
export async function removeLink(linkId: string): Promise<{ error?: string }> {
  const { error } = await supabase.from("friendships").delete().eq("id", linkId);
  if (error) return { error: error.message };
  return {};
}

/** Requests waiting on me to answer. */
export async function incomingRequests(myUserId: string): Promise<FriendRequest[]> {
  const { data } = await supabase
    .from("friendships")
    .select("id, requester_id, addressee_id, status, created_at")
    .eq("addressee_id", myUserId)
    .eq("status", "pending")
    .order("created_at", { ascending: false });
  const rows = data ?? [];
  const people = await cards(rows.map(r => r.requester_id));
  return rows.map(r => ({
    ...r,
    status: r.status as FriendLink["status"],
    person: people.get(r.requester_id) ?? { user_id: r.requester_id, display_name: null, avatar_url: null, bio: null },
  }));
}

/** Requests I've sent that are still waiting. */
export async function outgoingRequests(myUserId: string): Promise<FriendRequest[]> {
  const { data } = await supabase
    .from("friendships")
    .select("id, requester_id, addressee_id, status, created_at")
    .eq("requester_id", myUserId)
    .eq("status", "pending")
    .order("created_at", { ascending: false });
  const rows = data ?? [];
  const people = await cards(rows.map(r => r.addressee_id));
  return rows.map(r => ({
    ...r,
    status: r.status as FriendLink["status"],
    person: people.get(r.addressee_id) ?? { user_id: r.addressee_id, display_name: null, avatar_url: null, bio: null },
  }));
}

/** Everyone I'm connected with. */
export async function listFriends(myUserId: string) {
  const { data } = await supabase
    .from("friendships")
    .select("id, requester_id, addressee_id, status, created_at")
    .eq("status", "accepted")
    .or(`requester_id.eq.${myUserId},addressee_id.eq.${myUserId}`);
  const rows = data ?? [];
  const otherIds = rows.map(r => (r.requester_id === myUserId ? r.addressee_id : r.requester_id));
  const people = await cards(otherIds);
  return rows.map(r => {
    const other = r.requester_id === myUserId ? r.addressee_id : r.requester_id;
    return {
      linkId: r.id,
      person: people.get(other) ?? { user_id: other, display_name: null, avatar_url: null, bio: null },
    };
  });
}
