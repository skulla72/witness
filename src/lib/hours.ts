import { supabase } from "@/integrations/supabase/client";
import type { Tables } from "@/integrations/supabase/types";
import { loadAuthors, type Author } from "@/lib/prayers";

export type HoursRow = Tables<"service_hours">;
export type Badge = Tables<"serving_badges">;

export interface HoursWithContext extends HoursRow {
  org: { id: string; name: string; slug: string } | null;
  need: { id: string; title: string } | null;
}

async function attach(rows: HoursRow[]): Promise<HoursWithContext[]> {
  const orgIds = Array.from(new Set(rows.map(r => r.org_id).filter((x): x is string => !!x)));
  const needIds = Array.from(new Set(rows.map(r => r.need_id).filter((x): x is string => !!x)));
  const [orgs, needs] = await Promise.all([
    orgIds.length ? supabase.from("organizations").select("id, name, slug").in("id", orgIds) : Promise.resolve({ data: [] }),
    needIds.length ? supabase.from("needs").select("id, title").in("id", needIds) : Promise.resolve({ data: [] }),
  ]);
  const om = new Map((orgs.data ?? []).map(o => [o.id, o]));
  const nm = new Map((needs.data ?? []).map(n => [n.id, n]));
  return rows.map(r => ({ ...r, org: r.org_id ? (om.get(r.org_id) ?? null) : null, need: r.need_id ? (nm.get(r.need_id) ?? null) : null }));
}

export async function myHours(userId: string): Promise<HoursWithContext[]> {
  const { data, error } = await supabase
    .from("service_hours")
    .select("*")
    .eq("user_id", userId)
    .order("served_on", { ascending: false })
    .limit(100);
  if (error) throw error;
  return attach(data ?? []);
}

export interface PendingHours extends HoursWithContext { author: Author }

/** Hours other people logged that this person can verify (as leader or need poster). */
export async function pendingForMe(userId: string): Promise<PendingHours[]> {
  const { data, error } = await supabase
    .from("service_hours")
    .select("*")
    .neq("user_id", userId)
    .eq("status", "self")
    .order("created_at", { ascending: false })
    .limit(100);
  if (error) throw error;
  const rows = await attach(data ?? []);
  const authors = await loadAuthors(rows.map(r => r.user_id));
  return rows.map(r => ({ ...r, author: authors.get(r.user_id) ?? { id: r.user_id, name: "Witness member", photo: null } }));
}

export async function logHours(userId: string, input: { hours: number; served_on: string; note: string; org_id: string | null; need_id: string | null }) {
  const { error } = await supabase.from("service_hours").insert({ ...input, user_id: userId });
  if (error) throw error;
}

export async function reviewHours(id: string, status: "verified" | "rejected") {
  const { error } = await supabase.from("service_hours").update({ status }).eq("id", id);
  if (error) throw error;
}

export async function deleteHours(id: string) {
  const { error } = await supabase.from("service_hours").delete().eq("id", id);
  if (error) throw error;
}

export async function loadBadge(userId: string): Promise<Badge | null> {
  const { data } = await supabase.from("serving_badges").select("*").eq("user_id", userId).maybeSingle();
  return data ?? null;
}

/** Organizations the person belongs to (to log hours against). */
export async function myOrgs(userId: string): Promise<{ id: string; name: string }[]> {
  const { data: memberships } = await supabase.from("organization_members").select("org_id").eq("user_id", userId);
  const ids = (memberships ?? []).map(m => m.org_id);
  if (!ids.length) return [];
  const { data } = await supabase.from("organizations").select("id, name").in("id", ids).order("name");
  return data ?? [];
}

/** Needs the person has offered hands on. */
export async function myNeeds(userId: string): Promise<{ id: string; title: string }[]> {
  const { data: pledges } = await supabase.from("need_pledges").select("need_id").eq("user_id", userId).in("status", ["offered", "accepted", "done"]);
  const ids = (pledges ?? []).map(p => p.need_id);
  if (!ids.length) return [];
  const { data } = await supabase.from("needs").select("id, title").in("id", ids);
  return data ?? [];
}
