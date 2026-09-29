// Therapy mode: booking a session with a verified therapist, the care
// agreement both people sign first, and notes only the therapist can read.

import { supabase } from "@/integrations/supabase/client";
import type { Tables } from "@/integrations/supabase/types";
import { loadAuthors, type Author } from "@/lib/prayers";
import { openDirectThread } from "@/lib/messaging";

export type Therapist = Tables<"therapists">;
export type Slot = Tables<"therapy_slots">;
export type Session = Tables<"therapy_sessions">;
export type Note = Tables<"therapy_notes">;

export type Party = "client" | "therapist";

export interface TherapistCard extends Therapist {
  author: Author;
  openTimes: Slot[];
}

export interface SessionWithPeople extends Session {
  therapist: Author;
  client: Author;
}

const fallback = (id: string): Author => ({ id, name: "Witness member", photo: null });

/** The wording version currently in force, straight from the database. */
export async function agreementVersion(): Promise<string> {
  const { data, error } = await supabase.rpc("therapy_agreement_version");
  if (error) throw error;
  return data as string;
}

/** Has the signed-in person signed the current agreement as this party? */
export async function agreementSigned(party: Party): Promise<boolean> {
  const { data, error } = await supabase.rpc("therapy_agreement_signed", { _party: party });
  if (error) throw error;
  return !!data;
}

export async function signAgreement(userId: string, party: Party, typedName: string): Promise<void> {
  const version = await agreementVersion();
  const { error } = await supabase.from("therapy_agreements").insert({
    user_id: userId,
    party,
    version,
    signed_name: typedName.trim().slice(0, 80),
  });
  if (error && !error.message.includes("duplicate")) throw error;
}

/** Verified therapists who are accepting people, with their open times. */
export async function acceptingTherapists(): Promise<TherapistCard[]> {
  const { data, error } = await supabase
    .from("therapists")
    .select("*")
    .eq("verified", true)
    .eq("accepting", true);
  if (error) throw error;
  const rows = data ?? [];
  if (!rows.length) return [];

  const ids = rows.map(r => r.user_id);
  const [{ data: slots }, authors] = await Promise.all([
    supabase
      .from("therapy_slots")
      .select("*")
      .in("therapist_id", ids)
      .eq("status", "open")
      .gte("starts_at", new Date().toISOString())
      .order("starts_at"),
    loadAuthors(ids),
  ]);

  return rows
    .map(r => ({
      ...r,
      author: authors.get(r.user_id) ?? fallback(r.user_id),
      openTimes: (slots ?? []).filter(s => s.therapist_id === r.user_id),
    }))
    .sort((a, b) => b.openTimes.length - a.openTimes.length);
}

/** My own therapist listing, if I have one. */
export async function myListing(userId: string): Promise<Therapist | null> {
  const { data } = await supabase.from("therapists").select("*").eq("user_id", userId).maybeSingle();
  return data ?? null;
}

export async function saveListing(userId: string, input: {
  display_name: string;
  credentials: string;
  license_state: string;
  bio: string;
  accepting: boolean;
}): Promise<void> {
  const { error } = await supabase.from("therapists").upsert(
    { user_id: userId, ...input },
    { onConflict: "user_id" },
  );
  if (error) throw error;
}

/** Every session I'm part of, as either person. */
export async function mySessions(userId: string): Promise<SessionWithPeople[]> {
  const { data, error } = await supabase
    .from("therapy_sessions")
    .select("*")
    .or(`client_id.eq.${userId},therapist_id.eq.${userId}`)
    .order("starts_at", { ascending: false })
    .limit(100);
  if (error) throw error;
  return attachPeople(data ?? []);
}

export async function loadSession(id: string): Promise<SessionWithPeople | null> {
  const { data, error } = await supabase.from("therapy_sessions").select("*").eq("id", id).maybeSingle();
  if (error) throw error;
  if (!data) return null;
  return (await attachPeople([data]))[0] ?? null;
}

async function attachPeople(rows: Session[]): Promise<SessionWithPeople[]> {
  const ids = Array.from(new Set(rows.flatMap(r => [r.client_id, r.therapist_id])));
  const authors = ids.length ? await loadAuthors(ids) : new Map<string, Author>();
  return rows.map(r => ({
    ...r,
    client: authors.get(r.client_id) ?? fallback(r.client_id),
    therapist: authors.get(r.therapist_id) ?? fallback(r.therapist_id),
  }));
}

/**
 * Book an open time. The database refuses this unless the therapist is
 * verified, the time is still open, and the agreement is already signed.
 */
export async function bookSlot(
  userId: string,
  slot: Slot,
  reason: string,
): Promise<{ id?: string; error?: string }> {
  const { data, error } = await supabase
    .from("therapy_sessions")
    .insert({
      therapist_id: slot.therapist_id,
      client_id: userId,
      slot_id: slot.id,
      starts_at: slot.starts_at,
      minutes: slot.minutes,
      reason: reason.trim().slice(0, 500),
    })
    .select("id")
    .single();
  if (error || !data) return { error: friendly(error?.message) };
  return { id: data.id };
}

function friendly(message?: string): string {
  if (!message) return "That didn't go through. Try again.";
  if (message.includes("care agreement")) return "Sign the care agreement first.";
  if (message.includes("no longer open")) return "Someone just took that time. Pick another.";
  if (message.includes("not available")) return "That therapist isn't taking sessions right now.";
  return message;
}

/**
 * Open the room. Refused by the database unless both people have signed the
 * current agreement.
 */
export async function startSession(
  session: Session,
  userId: string,
): Promise<{ conversationId?: string; error?: string }> {
  let conversationId = session.conversation_id ?? undefined;
  if (!conversationId) {
    const other = session.client_id === userId ? session.therapist_id : session.client_id;
    const thread = await openDirectThread(userId, other);
    if (thread.error || !thread.id) return { error: thread.error ?? "Could not open the room." };
    conversationId = thread.id;
  }

  const { error } = await supabase
    .from("therapy_sessions")
    .update({ status: "in_progress", conversation_id: conversationId })
    .eq("id", session.id);
  if (error) return { error: friendly(error.message) };
  return { conversationId };
}

export async function setSessionStatus(id: string, status: "completed" | "cancelled" | "no_show"): Promise<void> {
  const patch = { status, ...(status === "completed" ? { ended_at: new Date().toISOString() } : {}) };
  const { error } = await supabase.from("therapy_sessions").update(patch).eq("id", id);

  if (error) throw error;
}

// ===== Times a therapist opens =====

export async function myOpenTimes(userId: string): Promise<Slot[]> {
  const { data, error } = await supabase
    .from("therapy_slots")
    .select("*")
    .eq("therapist_id", userId)
    .gte("starts_at", new Date().toISOString())
    .order("starts_at");
  if (error) throw error;
  return data ?? [];
}

export async function addSlot(userId: string, startsAt: string, minutes: number): Promise<{ error?: string }> {
  const { error } = await supabase
    .from("therapy_slots")
    .insert({ therapist_id: userId, starts_at: new Date(startsAt).toISOString(), minutes });
  if (error) {
    if (error.message.includes("duplicate")) return { error: "You already opened that time." };
    return { error: error.message };
  }
  return {};
}

export async function removeSlot(id: string): Promise<void> {
  const { error } = await supabase.from("therapy_slots").delete().eq("id", id);
  if (error) throw error;
}

// ===== Private notes (therapist only) =====

export async function loadNote(sessionId: string): Promise<Note | null> {
  const { data } = await supabase.from("therapy_notes").select("*").eq("session_id", sessionId).maybeSingle();
  return data ?? null;
}

export async function saveNote(sessionId: string, therapistId: string, body: string): Promise<void> {
  const { error } = await supabase.from("therapy_notes").upsert(
    { session_id: sessionId, therapist_id: therapistId, body, updated_at: new Date().toISOString() },
    { onConflict: "session_id" },
  );
  if (error) throw error;
}

export async function deleteNote(sessionId: string): Promise<void> {
  const { error } = await supabase.from("therapy_notes").delete().eq("session_id", sessionId);
  if (error) throw error;
}

export const SESSION_LABEL: Record<string, string> = {
  booked: "Booked",
  in_progress: "In session",
  completed: "Complete",
  cancelled: "Cancelled",
  no_show: "Missed",
};
