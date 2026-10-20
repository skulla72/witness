import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/integrations/supabase/types";

type Table = keyof Database["public"]["Tables"];
/** Personal rows only. RLS remains in force, including for clinical records. */
export const ACCOUNT_COLLECTIONS: Partial<Record<Table, string[]>> = {
  profiles: ["user_id"], user_survey: ["user_id"], user_roles: ["user_id"],
  app_feedback: ["user_id"], beta_access: ["user_id"],
  beta_invitations: ["invited_by", "accepted_by"], covenant_agreements: ["user_id"],
  connected_accounts: ["user_id", "created_by"], content_reports: ["reporter_id"],
  conversation_members: ["user_id"], conversations: ["created_by"],
  calls: ["initiator_id"], messages: ["sender_id"],
  counselor_profiles: ["user_id"], counselor_requests: ["requester_id"],
  donations: ["user_id"], fund_gifts: ["user_id"], witness_gifts: ["user_id"],
  job_contributions: ["user_id"], job_funds: ["created_by", "worker_id"],
  gift_wall: ["user_id"], giving_choices: ["user_id"],
  gratitude_entries: ["author_id"], gratitude_amens: ["sender_id"],
  intercessions: ["sender_id"], group_members: ["user_id"],
  friendships: ["requester_id", "addressee_id"], member_blocks: ["blocker_id"],
  need_pledges: ["user_id"], need_stories: ["created_by", "videographer_id"],
  need_updates: ["author_id"], needs: ["posted_by"],
  nonprofit_suggestions: ["suggested_by"], notifications: ["user_id"],
  notification_prefs: ["user_id"], push_devices: ["user_id"],
  org_announcements: ["author_id"], org_claims: ["user_id"],
  org_claim_invites: ["prompted_by"], org_subscriptions: ["started_by"],
  organization_events: ["created_by"], organization_groups: ["created_by"],
  organizations: ["owner_id", "claimed_by"],
  organization_members: ["user_id"], organization_prayer_requests: ["user_id"],
  payout_transfers: ["user_id"], perk_awards: ["user_id"],
  platform_testimonials: ["author_id"], prayer_posts: ["author_id"],
  prayer_media: ["owner_id"], profile_media: ["owner_id"],
  pro_profiles: ["user_id"], pro_subscriptions: ["user_id"],
  pro_reviews: ["author_id", "subject_id"], selections: ["user_id"],
  service_hours: ["user_id"], service_offers: ["pro_user_id"],
  service_requests: ["seeker_id"], store_orders: ["user_id"],
  support_requests: ["user_id"], therapists: ["user_id"],
  therapy_agreements: ["user_id"], therapy_notes: ["therapist_id"],
  therapy_sessions: ["client_id", "therapist_id"], therapy_slots: ["therapist_id"],
  videographers: ["user_id"], worker_marks: ["created_by", "worker_id"],
  worker_reviews: ["reviewer_id", "worker_id"],
};

export type ExportRow = Record<string, unknown>;
export interface AccountReadClient {
  from(table: string): {
    select(columns: string): {
      or(filter: string): {
        order(column: string, options: { ascending: boolean }): {
          range(start: number, end: number): PromiseLike<{ data: ExportRow[] | null; error: unknown }>;
        };
      };
    };
  };
}
const PRIVATE_CREDENTIAL_FIELDS = new Set(["token", "token_hash"]);
export function redactExportRow(row: ExportRow): ExportRow {
  return Object.fromEntries(Object.entries(row).filter(([key]) => !PRIVATE_CREDENTIAL_FIELDS.has(key)));
}

/** Range paging avoids Supabase's default 1,000-row silent truncation. */
export async function readAllAccountRows(
  client: SupabaseClient<Database>, table: Table, filter: string,
) {
  const rows: ExportRow[] = [];
  for (let offset = 0; ; offset += 500) {
    // A small read-only boundary avoids expanding every generated table union.
    const { data, error } = await (client as unknown as AccountReadClient).from(table).select("*").or(filter)
      .order(ACCOUNT_ORDER[table] ?? "id", { ascending: true })
      .range(offset, offset + 499);
    if (error) throw new Error(`Could not export ${table}.`);
    const page = (data ?? []) as unknown as ExportRow[];
    rows.push(...page.map(redactExportRow));
    if (page.length < 500) return rows;
  }
}

export const ACCOUNT_RELATIONS: Array<{ table: Table; column: string; parent: Table; parentColumn?: string }> = [
  { table: "store_order_items", column: "order_id", parent: "store_orders" },
  { table: "messages", column: "conversation_id", parent: "conversation_members", parentColumn: "conversation_id" },
  { table: "calls", column: "conversation_id", parent: "conversation_members", parentColumn: "conversation_id" },
  { table: "conversations", column: "id", parent: "conversation_members", parentColumn: "conversation_id" },
  { table: "counselor_requests", column: "counselor_id", parent: "counselor_profiles" },
  { table: "pro_contacts", column: "pro_id", parent: "pro_profiles" },
  { table: "pro_lanes", column: "pro_id", parent: "pro_profiles" },
  { table: "pro_verifications", column: "pro_id", parent: "pro_profiles" },
  { table: "pro_strikes", column: "pro_id", parent: "pro_profiles" },
  { table: "story_shoots", column: "story_id", parent: "need_stories" },
];

/** Stable order for tables without created_at, then primary-key tie breakers. */
export const ACCOUNT_ORDER: Partial<Record<Table, string>> = {
  beta_access: "user_id",
  notification_prefs: "user_id", member_blocks: "blocker_id",
  pro_contacts: "pro_id",
};
