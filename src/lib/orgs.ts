// Claiming a church or nonprofit page, what it announces, where its gifts land,
// and which monthly plan it carries.

import { supabase } from "@/integrations/supabase/client";
import type { Tables } from "@/integrations/supabase/types";
import type { PlanKey } from "@/data/plans";

export type OrgClaim = Tables<"org_claims">;
export type Announcement = Tables<"org_announcements">;
export type PayoutAccount = Tables<"org_payout_accounts">;
export type OrgPlan = Tables<"org_subscriptions">;

export const CLAIM_STATUS: Record<string, string> = {
  pending: "Waiting on our team",
  reviewing: "Being checked",
  approved: "Approved — the page is yours",
  declined: "Not approved yet",
};

export const ANNOUNCEMENT_KINDS = [
  { key: "news", label: "Announcement" },
  { key: "event", label: "Upcoming event" },
  { key: "prayer", label: "Someone to pray for" },
  { key: "serving", label: "Serving" },
] as const;

export const kindLabel = (key: string) =>
  ANNOUNCEMENT_KINDS.find(k => k.key === key)?.label ?? "Announcement";

/* ---------- Claiming ---------- */

export interface ClaimDraft {
  role_title: string;
  work_email: string;
  phone: string;
  note: string;
}

export async function askToClaim(orgId: string, userId: string, draft: ClaimDraft) {
  const { error } = await supabase
    .from("org_claims")
    .insert({ org_id: orgId, user_id: userId, status: "pending", ...draft });
  if (error) throw error;
}

export async function myClaim(orgId: string, userId: string): Promise<OrgClaim | null> {
  const { data } = await supabase
    .from("org_claims")
    .select("*")
    .eq("org_id", orgId)
    .eq("user_id", userId)
    .maybeSingle();
  return (data as OrgClaim) ?? null;
}

export async function allClaims(): Promise<OrgClaim[]> {
  const { data, error } = await supabase
    .from("org_claims")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(200);
  if (error) throw error;
  return (data ?? []) as OrgClaim[];
}

export async function decideClaim(
  id: string,
  status: "pending" | "reviewing" | "approved" | "declined",
  note: string,
  reviewerId: string,
) {
  const { error } = await supabase
    .from("org_claims")
    .update({
      status,
      review_note: note,
      reviewed_by: reviewerId,
      reviewed_at: new Date().toISOString(),
    })
    .eq("id", id);
  if (error) throw error;
}

/* ---------- Announcements ---------- */

export async function announcements(orgId: string): Promise<Announcement[]> {
  const { data, error } = await supabase
    .from("org_announcements")
    .select("*")
    .eq("org_id", orgId)
    .order("created_at", { ascending: false })
    .limit(30);
  if (error) throw error;
  return (data ?? []) as Announcement[];
}

export interface AnnouncementDraft {
  kind: string;
  title: string;
  body: string;
  starts_at: string | null;
  link_url: string | null;
}

export async function postAnnouncement(orgId: string, authorId: string, draft: AnnouncementDraft) {
  const { error } = await supabase
    .from("org_announcements")
    .insert({ org_id: orgId, author_id: authorId, ...draft });
  if (error) throw error;
}

export async function removeAnnouncement(id: string) {
  const { error } = await supabase.from("org_announcements").delete().eq("id", id);
  if (error) throw error;
}

/* ---------- Where gifts land ---------- */

export async function payoutAccount(orgId: string): Promise<PayoutAccount | null> {
  const { data } = await supabase
    .from("org_payout_accounts")
    .select("*")
    .eq("org_id", orgId)
    .maybeSingle();
  return (data as PayoutAccount) ?? null;
}

export interface PayoutDraft {
  bank_name: string;
  account_holder: string;
  contact_email: string;
  note: string;
}

/** Saves what a leader tells us. Our team confirms it before gifts are routed. */
export async function savePayout(orgId: string, draft: PayoutDraft) {
  const { error } = await supabase
    .from("org_payout_accounts")
    .upsert({ org_id: orgId, status: "pending", ...draft }, { onConflict: "org_id" });
  if (error) throw error;
}

/* ---------- Plans ---------- */

/** Plans a leader can see in full, billing details included. */
export async function orgPlans(orgId: string): Promise<OrgPlan[]> {
  const { data, error } = await supabase
    .from("org_subscriptions")
    .select("*")
    .eq("org_id", orgId)
    .order("created_at", { ascending: false });
  if (error) throw error;
  return (data ?? []) as OrgPlan[];
}

/** What anyone may know: which plans a page carries, and nothing about billing. */
export async function publicPlans(orgId: string): Promise<{ plan: string; status: string }[]> {
  const { data, error } = await supabase.rpc("org_plans", { _org_id: orgId });
  if (error) throw error;
  return (data ?? []) as { plan: string; status: string }[];
}

export function carries(plans: { plan: string; status: string }[], key: PlanKey): boolean {
  return plans.some(p => p.plan === key && p.status === "active");
}

/** Giving is open once the page carries the giving plan and payouts are confirmed. */
export function givingOpen(
  plans: { plan: string; status: string }[],
  payout: Pick<PayoutAccount, "status"> | null,
): boolean {
  return carries(plans, "page_giving") && payout?.status === "verified";
}

/* ---------- The church's own dashboard ---------- */

export interface LeaderOrg {
  id: string;
  name: string;
  slug: string;
  role: string;
}

/** Churches and organizations this person runs, for "who is this ask for?". */
export async function leaderOrgs(userId: string): Promise<LeaderOrg[]> {
  const { data, error } = await supabase
    .from("organization_members")
    .select("role, org_id, organizations(id, name, slug)")
    .eq("user_id", userId)
    .in("role", ["owner", "leader"]);
  if (error) throw error;
  return (data ?? [])
    .map((row: any) =>
      row.organizations
        ? {
            id: row.organizations.id as string,
            name: row.organizations.name as string,
            slug: row.organizations.slug as string,
            role: row.role as string,
          }
        : null,
    )
    .filter((x: LeaderOrg | null): x is LeaderOrg => !!x);
}

export interface OrgHire {
  request: Tables<"service_requests">;
  pro: Tables<"pro_profiles"> | null;
}

/** Work the church asked for, newest first, with whoever was hired for it. */
export async function orgHires(orgId: string): Promise<OrgHire[]> {
  const { data, error } = await supabase
    .from("service_requests")
    .select("*")
    .eq("org_id", orgId)
    .order("created_at", { ascending: false })
    .limit(50);
  if (error) throw error;
  const rows = data ?? [];
  const proIds = [...new Set(rows.map(r => r.hired_pro_id).filter((x): x is string => !!x))];
  let byId = new Map<string, Tables<"pro_profiles">>();
  if (proIds.length) {
    const { data: pros } = await supabase.from("pro_profiles").select("*").in("id", proIds);
    byId = new Map((pros ?? []).map(p => [p.id, p as Tables<"pro_profiles">]));
  }
  return rows.map(r => ({
    request: r as Tables<"service_requests">,
    pro: r.hired_pro_id ? byId.get(r.hired_pro_id) ?? null : null,
  }));
}
