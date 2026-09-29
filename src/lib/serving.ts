// Serving lanes and matching: a professional switches on the lanes they work in
// and sets their own rate there; someone who needs help posts a request in a
// lane; we show that request to the professionals who work in it, and they send
// an offer. The seeker picks one. No rankings, no paid placement — the order is
// only about fit with this one request.

import { supabase } from "@/integrations/supabase/client";
import type { Tables } from "@/integrations/supabase/types";
import { laneByKey } from "@/data/serving-lanes";
import type { Pro } from "@/lib/pros";
import { loadAuthors, type Author } from "@/lib/prayers";

export type ProLane = Tables<"pro_lanes">;
export type ServiceRequest = Tables<"service_requests">;
export type ServiceOffer = Tables<"service_offers">;

export const REQUEST_STATUS: Record<string, string> = {
  open: "Open",
  hired: "Someone's hired",
  completed: "Done",
  closed: "Closed",
};

export const OFFER_STATUS: Record<string, string> = {
  sent: "Waiting on them",
  accepted: "Accepted",
  declined: "Not this time",
  withdrawn: "Pulled back",
};

export function money(cents: number): string {
  return `$${(cents / 100).toLocaleString("en-US", {
    minimumFractionDigits: cents % 100 ? 2 : 0,
    maximumFractionDigits: 2,
  })}`;
}

export function rateText(rate_cents: number, rate_kind: string): string {
  if (rate_kind === "quote" || rate_cents <= 0) return "Price by quote";
  return rate_kind === "hourly" ? `${money(rate_cents)} an hour` : `${money(rate_cents)} flat`;
}

/* ---------- A professional's lanes and rates ---------- */

export async function lanesOfPro(proId: string): Promise<ProLane[]> {
  const { data, error } = await supabase
    .from("pro_lanes")
    .select("*")
    .eq("pro_id", proId)
    .order("lane", { ascending: true });
  if (error) throw error;
  return data ?? [];
}

export async function saveProLane(input: {
  proId: string;
  lane: string;
  rate_cents: number;
  rate_kind: string;
  serves_free: boolean;
  notes?: string;
  active?: boolean;
}) {
  const { error } = await supabase.from("pro_lanes").upsert(
    {
      pro_id: input.proId,
      lane: input.lane,
      rate_cents: Math.max(0, Math.round(input.rate_cents)),
      rate_kind: input.rate_kind,
      serves_free: input.serves_free,
      notes: input.notes ?? "",
      active: input.active ?? true,
    },
    { onConflict: "pro_id,lane" },
  );
  if (error) throw error;
}

export async function removeProLane(proId: string, lane: string) {
  const { error } = await supabase.from("pro_lanes").delete().eq("pro_id", proId).eq("lane", lane);
  if (error) throw error;
}

/** Everyone working a lane, for the public lane page and for matching. */
export async function lanePros(lane: string): Promise<(Pro & { rate: ProLane })[]> {
  const { data, error } = await supabase
    .from("pro_lanes")
    .select("*")
    .eq("lane", lane)
    .eq("active", true)
    .limit(60);
  if (error) throw error;
  const rows = data ?? [];
  if (!rows.length) return [];
  const { data: pros } = await supabase
    .from("pro_profiles")
    .select("*")
    .in("id", rows.map(r => r.pro_id))
    .eq("status", "approved");
  const byId = new Map((pros ?? []).map(p => [p.id, p as Pro]));
  return rows
    .map(r => {
      const pro = byId.get(r.pro_id);
      return pro ? { ...pro, rate: r } : null;
    })
    .filter((x): x is Pro & { rate: ProLane } => !!x);
}

/** How many people work each lane — used to say "12 nearby" honestly. */
export async function laneCounts(): Promise<Record<string, number>> {
  const { data } = await supabase.from("pro_lanes").select("lane, pro_id").eq("active", true).limit(2000);
  const counts: Record<string, number> = {};
  for (const row of data ?? []) counts[row.lane] = (counts[row.lane] ?? 0) + 1;
  return counts;
}

/* ---------- Requests from people who need help ---------- */

export interface RequestDraft {
  lane: string;
  title: string;
  details: string;
  city: string;
  region: string;
  urgency: string;
  budget_cents: number;
  rate_kind: string;
  wants_donated: boolean;
  contact_note: string;
  org_id?: string | null;
}

export async function postRequest(draft: RequestDraft): Promise<ServiceRequest> {
  const { data, error } = await supabase
    .from("service_requests")
    .insert({
      lane: draft.lane,
      title: draft.title.trim().slice(0, 140),
      details: draft.details.trim().slice(0, 2000),
      city: draft.city.trim(),
      region: draft.region.trim(),
      urgency: draft.urgency,
      budget_cents: Math.max(0, Math.round(draft.budget_cents)),
      rate_kind: draft.rate_kind,
      wants_donated: draft.wants_donated,
      contact_note: draft.contact_note.trim().slice(0, 300),
      org_id: draft.org_id ?? null,
    })
    .select("*")
    .single();
  if (error) throw error;
  return data;
}

export async function myRequests(userId: string): Promise<ServiceRequest[]> {
  const { data, error } = await supabase
    .from("service_requests")
    .select("*")
    .eq("seeker_id", userId)
    .order("created_at", { ascending: false })
    .limit(50);
  if (error) throw error;
  return data ?? [];
}

export async function loadRequest(id: string): Promise<ServiceRequest | null> {
  const { data, error } = await supabase.from("service_requests").select("*").eq("id", id).maybeSingle();
  if (error) throw error;
  return data ?? null;
}

export async function setRequestStatus(id: string, status: "open" | "completed" | "closed") {
  const { error } = await supabase.from("service_requests").update({ status }).eq("id", id);
  if (error) throw error;
}

/**
 * Work the professional has been matched with. The database only lets them see
 * open requests in lanes they've switched on, so this is the match itself.
 */
export async function matchedRequests(pro: Pro, lanes: ProLane[]): Promise<ServiceRequest[]> {
  const active = lanes.filter(l => l.active).map(l => l.lane);
  if (!active.length) return [];
  const { data, error } = await supabase
    .from("service_requests")
    .select("*")
    .in("lane", active)
    .eq("status", "open")
    .order("created_at", { ascending: false })
    .limit(60);
  if (error) throw error;
  return sortByFit(data ?? [], pro);
}

/** Closest work first: same city, then same state, then soonest needed. */
function sortByFit(rows: ServiceRequest[], pro: Pro): ServiceRequest[] {
  const urgencyRank: Record<string, number> = { urgent: 0, this_week: 1, whenever: 2 };
  const near = (r: ServiceRequest) =>
    r.city && pro.city && r.city.toLowerCase() === pro.city.toLowerCase()
      ? 0
      : r.region && pro.region && r.region.toLowerCase() === pro.region.toLowerCase()
        ? 1
        : 2;
  return [...rows].sort(
    (a, b) =>
      near(a) - near(b) ||
      (urgencyRank[a.urgency] ?? 2) - (urgencyRank[b.urgency] ?? 2) ||
      b.created_at.localeCompare(a.created_at),
  );
}

/* ---------- Matching the other direction: who fits this request ---------- */

export interface Match {
  pro: Pro;
  rate: ProLane;
  /** Why we put them here, in words the seeker can read. */
  reasons: string[];
}

export async function matchesForRequest(req: ServiceRequest): Promise<Match[]> {
  const pros = await lanePros(req.lane);
  const guide = laneByKey(req.lane);
  const scored = pros.map(p => {
    const reasons: string[] = [];
    let score = 0;
    if (req.city && p.city && req.city.toLowerCase() === p.city.toLowerCase()) {
      score += 3;
      reasons.push(`Works in ${p.city}`);
    } else if (req.region && p.region && req.region.toLowerCase() === p.region.toLowerCase()) {
      score += 1;
      reasons.push(`Works in ${p.region}`);
    }
    if (p.id_verified_at) {
      score += 2;
      reasons.push("Identity verified");
    }
    if (req.wants_donated && p.rate.serves_free) {
      score += 3;
      reasons.push("Sometimes gives the work away");
    }
    if (req.budget_cents > 0 && p.rate.rate_cents > 0 && p.rate.rate_cents <= req.budget_cents) {
      score += 2;
      reasons.push("Rate fits what you set aside");
    } else if (guide && p.rate.rate_cents > 0 && p.rate.rate_cents <= guide.high) {
      score += 1;
      reasons.push("Rate is inside the usual range");
    }
    return { pro: p as Pro, rate: p.rate, reasons, score };
  });
  return scored
    .sort((a, b) => b.score - a.score || a.pro.display_name.localeCompare(b.pro.display_name))
    .map(({ pro, rate, reasons }) => ({ pro, rate, reasons }));
}

/* ---------- Offers ---------- */

export async function offersForRequest(requestId: string): Promise<ServiceOffer[]> {
  const { data, error } = await supabase
    .from("service_offers")
    .select("*")
    .eq("request_id", requestId)
    .order("created_at", { ascending: false });
  if (error) throw error;
  return data ?? [];
}

export interface OfferWithPro extends ServiceOffer {
  pro: Pro | null;
}

export async function offersWithPros(requestId: string): Promise<OfferWithPro[]> {
  const offers = await offersForRequest(requestId);
  if (!offers.length) return [];
  const { data } = await supabase
    .from("pro_profiles")
    .select("*")
    .in("id", offers.map(o => o.pro_id));
  const byId = new Map((data ?? []).map(p => [p.id, p as Pro]));
  return offers.map(o => ({ ...o, pro: byId.get(o.pro_id) ?? null }));
}

export async function myOffers(proId: string): Promise<ServiceOffer[]> {
  const { data, error } = await supabase
    .from("service_offers")
    .select("*")
    .eq("pro_id", proId)
    .order("created_at", { ascending: false })
    .limit(100);
  if (error) throw error;
  return data ?? [];
}

export async function sendOffer(input: {
  requestId: string;
  proId: string;
  rate_cents: number;
  rate_kind: string;
  message: string;
}) {
  const { error } = await supabase.from("service_offers").upsert(
    {
      request_id: input.requestId,
      pro_id: input.proId,
      rate_cents: Math.max(0, Math.round(input.rate_cents)),
      rate_kind: input.rate_kind,
      message: input.message.trim().slice(0, 1000),
      status: "sent",
    },
    { onConflict: "request_id,pro_id" },
  );
  if (error) throw error;
}

export async function withdrawOffer(offerId: string) {
  const { error } = await supabase.from("service_offers").update({ status: "withdrawn" }).eq("id", offerId);
  if (error) throw error;
}

/** The seeker's pick. The database marks the request hired and closes the rest. */
export async function answerOffer(offerId: string, status: "accepted" | "declined") {
  const { error } = await supabase.from("service_offers").update({ status }).eq("id", offerId);
  if (error) throw error;
}

/* ---------- Who's coming to the door ---------- */

/** The professional the seeker picked, for the "this is your tech" card. */
export async function hiredProOf(request: ServiceRequest): Promise<Pro | null> {
  if (!request.hired_pro_id) return null;
  const { data } = await supabase
    .from("pro_profiles")
    .select("*")
    .eq("id", request.hired_pro_id)
    .maybeSingle();
  return (data as Pro) ?? null;
}

export interface Job {
  offer: ServiceOffer;
  request: ServiceRequest;
}

/** Jobs this professional won, so they can tell the household they're on the way. */
export async function jobsWon(proId: string): Promise<Job[]> {
  const { data: offers, error } = await supabase
    .from("service_offers")
    .select("*")
    .eq("pro_id", proId)
    .eq("status", "accepted")
    .order("created_at", { ascending: false })
    .limit(30);
  if (error) throw error;
  if (!offers?.length) return [];
  const { data: requests } = await supabase
    .from("service_requests")
    .select("*")
    .in("id", offers.map(o => o.request_id));
  const byId = new Map((requests ?? []).map(r => [r.id, r as ServiceRequest]));
  return offers
    .map(o => {
      const request = byId.get(o.request_id);
      return request ? { offer: o, request } : null;
    })
    .filter((x): x is Job => !!x);
}

export async function seekerOf(userId: string): Promise<Author | null> {
  const authors = await loadAuthors([userId]).catch(() => new Map<string, Author>());
  return authors.get(userId) ?? null;
}
