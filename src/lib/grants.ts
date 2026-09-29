// Donor-advised fund (DAF) grants.
// A DAF grant arrives as a check or ACH from a sponsor (Fidelity Charitable,
// NCF, a community foundation), never through card checkout — so it gets
// recorded by hand and then counts as real support on the nonprofit's page.

import { supabase } from "@/integrations/supabase/client";
import type { Tables } from "@/integrations/supabase/types";

export type Grant = Tables<"daf_grants">;
export type GrantStatus = "expected" | "received";

export const SPONSORS = [
  "Fidelity Charitable",
  "Schwab Charitable",
  "Vanguard Charitable",
  "National Christian Foundation",
  "Community foundation",
  "Other sponsor",
] as const;

export const statusLabel: Record<GrantStatus, string> = {
  expected: "Expected",
  received: "Received",
};

export interface GrantInput {
  id?: string;
  org_id: string;
  sponsor: string;
  fund_name: string;
  donor_name: string;
  anonymous: boolean;
  /** Only true when the donor agreed to be named on the public page. */
  public_credit: boolean;
  amount_cents: number;
  granted_on: string;
  status: GrantStatus;
  note: string;
  reference: string;
}

/**
 * Grants for one nonprofit. Leaders and admins see every column straight from
 * the table; everyone else reads through a helper that keeps the details of
 * quietly given grants hidden while still counting their amounts.
 */
export async function grantsForOrg(orgId: string): Promise<Grant[]> {
  const { data, error } = await supabase.rpc("grants_for_org_public", { _org_id: orgId });
  if (error) throw error;
  return (data ?? []) as Grant[];
}


/** Every grant on record — admins only, by policy. */
export async function allGrants(): Promise<Grant[]> {
  const { data, error } = await supabase
    .from("daf_grants")
    .select("*")
    .order("granted_on", { ascending: false })
    .limit(500);
  if (error) throw error;
  return (data ?? []) as Grant[];
}

export interface GrantOrg {
  id: string;
  name: string;
  slug: string;
}

export async function grantOrgs(): Promise<GrantOrg[]> {
  const { data, error } = await supabase
    .from("organizations")
    .select("id, name, slug")
    .order("name");
  if (error) throw error;
  return (data ?? []) as GrantOrg[];
}

export async function saveGrant(input: GrantInput): Promise<void> {
  const row = {
    org_id: input.org_id,
    sponsor: input.sponsor,
    fund_name: input.fund_name,
    donor_name: input.anonymous ? "" : input.donor_name,
    anonymous: input.anonymous,
    public_credit: input.anonymous ? false : input.public_credit,
    amount_cents: input.amount_cents,
    granted_on: input.granted_on,
    status: input.status,
    note: input.note,
    reference: input.reference,
  };
  if (input.id) {
    const { error } = await supabase.from("daf_grants").update(row).eq("id", input.id);
    if (error) throw error;
    return;
  }
  const { data: session } = await supabase.auth.getSession();
  const { error } = await supabase
    .from("daf_grants")
    .insert({ ...row, recorded_by: session.session?.user.id ?? null });
  if (error) throw error;
}

export async function deleteGrant(id: string): Promise<void> {
  const { error } = await supabase.from("daf_grants").delete().eq("id", id);
  if (error) throw error;
}

export function grantTotals(rows: Grant[]) {
  const received = rows.filter(g => g.status === "received");
  const expected = rows.filter(g => g.status === "expected");
  const sum = (list: Grant[]) => list.reduce((t, g) => t + g.amount_cents, 0);
  return {
    receivedCents: sum(received),
    expectedCents: sum(expected),
    receivedCount: received.length,
    count: rows.length,
  };
}

export function grantorName(g: Grant): string {
  if (g.anonymous || !g.donor_name) return "Given quietly";
  return g.donor_name;
}
