// Giving spread evenly across many nonprofits at once — the whole board, or
// every nonprofit in one lane. No weighting, no ranking: an even split.

import { supabase } from "@/integrations/supabase/client";
import { LANES } from "@/data/giving";



export type FundScope = "all" | "lane";

export interface FundOrg {
  id: string;
  name: string;
  slug: string;
  lane: string;
}

/** Every nonprofit currently set up and still receiving gifts. */
export async function loadFundOrgs(scope: FundScope, lane?: string): Promise<FundOrg[]> {
  let q = supabase
    .from("nonprofit_profiles")
    .select("lane, accepting, org_id, organizations(name, slug)")
    .eq("accepting", true);

  if (scope === "lane" && lane) q = q.eq("lane", lane);
  const { data, error } = await q;
  if (error) throw error;
  const rows = (data ?? []) as unknown as Array<{
    lane: string;
    org_id: string;
    organizations: { name: string; slug: string } | null;
  }>;
  return rows
    .filter(r => r.organizations)
    .map(r => ({ id: r.org_id, name: r.organizations!.name, slug: r.organizations!.slug, lane: r.lane }))
    .sort((a, b) => a.name.localeCompare(b.name));
}

/**
 * Even split, to the cent. Any leftover cents go to the organizations at the
 * top of the list — we say so on the screen rather than quietly rounding.
 */
export function splitCents(total: number, count: number): number[] {
  if (count <= 0) return [];
  const base = Math.floor(total / count);
  const extra = total - base * count;
  return Array.from({ length: count }, (_, i) => base + (i < extra ? 1 : 0));
}

export function laneLabel(lane: string | null | undefined): string {
  return LANES.find(l => l.key === lane)?.label ?? "Giving";
}

export function fundLabel(scope: string, lane: string | null | undefined): string {
  return scope === "lane" ? laneLabel(lane) : "Every nonprofit on the board";
}
