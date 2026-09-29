import { supabase } from "@/integrations/supabase/client";
import type { Category, Privacy, Status } from "@/data/seed";
import { parseOverlay, type VideoOverlay } from "@/lib/overlay";

/** A person as the community sees them. */
export interface Author {
  id: string;
  name: string;
  photo: string | null;
  bio?: string | null;
}

export type MediaType = "video" | "audio" | "image";
export type AnswerKind = "yes" | "differently" | "still_trusting";

/** A prayer story: the ask, and (when it comes) the answer linked to it. */
export interface Story {
  id: string;
  user_id: string;
  author: Author;
  ask_caption: string;
  ask_kind: "video" | "text" | "voice";
  ask_media_path: string | null;
  ask_media_type: MediaType | null;
  /** Photo a voice prayer was recorded over (null = gradient from ask_bg). */
  ask_backdrop_path: string | null;
  /** Recorded length of a voice/video ask, in seconds, when known. */
  ask_duration: number | null;
  ask_bg: string | null;
  ask_created_at: string;
  /** Words placed over the ask video. */
  ask_overlay?: VideoOverlay | null;
  category: Category;
  privacy: Privacy;
  is_anonymous: boolean;
  status: Status;
  answer?: {
    id: string;
    caption: string;
    kind: AnswerKind;
    media_path: string | null;
    media_type: MediaType | null;
    created_at: string;
    privacy: Privacy;
    overlay?: VideoOverlay | null;
  };
  intercession_count: number;
  comment_count: number;
  /** A verse the author attached to this prayer. */
  verse_ref: string | null;
  verse_text: string | null;
  /** Whether the current viewer has already tapped "I'm praying". */
  i_prayed: boolean;
}

export interface Word {
  id: string;
  prayer_id: string;
  author: Author;
  body: string;
  kind: "tap" | "word" | "video" | "voice";
  media_path: string | null;
  media_type: MediaType | null;
  created_at: string;
}

export interface GratitudeItem {
  id: string;
  user_id: string;
  author: Author;
  type: "photo" | "video" | "text" | "voice";
  caption: string;
  media_path: string | null;
  bg_color?: string;
  linked_prayer_id?: string | null;
  privacy: "private" | "community";
  created_at: string;
  /** Whether the current viewer has tapped "Amen" on this entry. */
  amened?: boolean;
}

const ANON: Author = { id: "", name: "Anonymous", photo: null };

export function initials(name: string) {
  return name.split(/\s+/).filter(Boolean).slice(0, 2).map(p => p[0]?.toUpperCase() ?? "").join("") || "W";
}

type ProfileRow = { user_id: string; display_name: string | null; avatar_url: string | null; bio?: string | null };

export function toAuthor(p: ProfileRow | undefined | null, fallbackId = ""): Author {
  if (!p) return { id: fallbackId, name: "Witness member", photo: null };
  return { id: p.user_id, name: p.display_name?.trim() || "Witness member", photo: p.avatar_url, bio: p.bio ?? null };
}

export async function loadAuthors(ids: string[]): Promise<Map<string, Author>> {
  const unique = Array.from(new Set(ids.filter(Boolean)));
  const map = new Map<string, Author>();
  if (!unique.length) return map;
  // Member cards only — full profile rows stay private to their owner.
  const { data } = await supabase.rpc("member_cards", { _ids: unique });
  for (const row of data ?? []) map.set(row.user_id, toAuthor(row));
  for (const id of unique) if (!map.has(id)) map.set(id, toAuthor(null, id));
  return map;
}

export async function loadAuthor(id: string): Promise<Author> {
  const { data } = await supabase.rpc("member_cards", { _ids: [id] });
  return toAuthor(data?.[0], id);
}

type PostRow = {
  id: string; author_id: string; body: string; category: string; privacy: string; is_anonymous: boolean;
  post_type: string; parent_prayer_id: string | null; status: string; answer_kind: string | null; bg_color: string | null; created_at: string;
  verse_ref?: string | null; verse_text?: string | null; overlay?: unknown;
};
type MediaRow = { prayer_id: string; storage_path: string; media_type: string; duration_seconds: number | null };

/** A post may carry a voice/video file plus a photo backdrop; pick the one that plays and the one behind it. */
function splitMedia(rows: MediaRow[] | undefined): { primary?: MediaRow; backdrop?: MediaRow } {
  if (!rows?.length) return {};
  const primary = rows.find(r => r.media_type === "audio" || r.media_type === "video") ?? rows[0];
  const backdrop = rows.find(r => r !== primary && r.media_type === "image");
  return { primary, backdrop };
}

const POST_COLS = "id, author_id, body, category, privacy, is_anonymous, post_type, parent_prayer_id, status, answer_kind, bg_color, created_at, verse_ref, verse_text, overlay";

function statusFor(ask: PostRow, answer?: PostRow): Status {
  const kind = (answer?.answer_kind ?? ask.answer_kind) as AnswerKind | null;
  if (!answer && ask.status !== "answered") return "open";
  if (kind === "differently") return "answered_differently";
  if (kind === "still_trusting") return "declined";
  return "answered_yes";
}

/** Hydrate ask rows into full stories (answer, media, author, counts). */
async function hydrate(asks: PostRow[], viewerId: string | null): Promise<Story[]> {
  if (!asks.length) return [];
  const askIds = asks.map(a => a.id);
  const [answersRes, authors] = await Promise.all([
    supabase.from("prayer_posts").select(POST_COLS).eq("post_type", "answer").in("parent_prayer_id", askIds).order("created_at", { ascending: false }),
    loadAuthors(asks.map(a => a.author_id)),
  ]);
  const answers = (answersRes.data ?? []) as PostRow[];
  const answerByParent = new Map<string, PostRow>();
  for (const a of answers) if (a.parent_prayer_id && !answerByParent.has(a.parent_prayer_id)) answerByParent.set(a.parent_prayer_id, a);

  const allIds = [...askIds, ...answers.map(a => a.id)];
  const [mediaRes, interRes] = await Promise.all([
    supabase.from("prayer_media").select("prayer_id, storage_path, media_type, duration_seconds").order("created_at", { ascending: true }).in("prayer_id", allIds),
    supabase.from("intercessions").select("prayer_id, sender_id, kind").in("prayer_id", askIds),
  ]);
  const media = new Map<string, MediaRow[]>();
  for (const m of (mediaRes.data ?? []) as MediaRow[]) media.set(m.prayer_id, [...(media.get(m.prayer_id) ?? []), m]);
  const praying = new Map<string, number>();
  const words = new Map<string, number>();
  const mine = new Set<string>();
  for (const i of interRes.data ?? []) {
    praying.set(i.prayer_id, (praying.get(i.prayer_id) ?? 0) + 1);
    if (i.kind === "word") words.set(i.prayer_id, (words.get(i.prayer_id) ?? 0) + 1);
    if (viewerId && i.sender_id === viewerId) mine.add(i.prayer_id);
  }

  return asks.map(ask => {
    const answer = answerByParent.get(ask.id);
    const { primary: am, backdrop } = splitMedia(media.get(ask.id));
    const { primary: xm } = answer ? splitMedia(media.get(answer.id)) : {};
    const author = ask.is_anonymous && ask.author_id !== viewerId ? ANON : (authors.get(ask.author_id) ?? toAuthor(null, ask.author_id));
    return {
      id: ask.id,
      user_id: ask.author_id,
      author,
      ask_caption: ask.body,
      ask_kind: am ? (am.media_type === "audio" ? "voice" : am.media_type === "video" ? "video" : "text") : "text",
      ask_media_path: am?.storage_path ?? null,
      ask_media_type: (am?.media_type as MediaType | undefined) ?? null,
      ask_backdrop_path: backdrop?.storage_path ?? null,
      ask_duration: am?.duration_seconds ?? null,
      ask_bg: ask.bg_color,
      ask_created_at: ask.created_at,
      ask_overlay: parseOverlay(ask.overlay),
      category: ask.category as Category,
      privacy: ask.privacy as Privacy,
      is_anonymous: ask.is_anonymous,
      status: statusFor(ask, answer),
      answer: answer ? {
        id: answer.id,
        caption: answer.body,
        kind: (answer.answer_kind as AnswerKind | null) ?? "yes",
        media_path: xm?.storage_path ?? null,
        media_type: (xm?.media_type as MediaType | undefined) ?? null,
        created_at: answer.created_at,
        privacy: answer.privacy as Privacy,
        overlay: parseOverlay(answer.overlay),
      } : undefined,
      intercession_count: praying.get(ask.id) ?? 0,
      comment_count: words.get(ask.id) ?? 0,
      verse_ref: ask.verse_ref ?? null,
      verse_text: ask.verse_text ?? null,
      i_prayed: mine.has(ask.id),
    };
  });
}

export async function loadFeed(viewerId: string | null, limit = 60): Promise<Story[]> {
  const { data, error } = await supabase.from("prayer_posts").select(POST_COLS)
    .eq("post_type", "ask").neq("status", "removed").order("created_at", { ascending: false }).limit(limit);
  if (error) throw error;
  return hydrate((data ?? []) as PostRow[], viewerId);
}

export async function loadStoriesBy(authorId: string, viewerId: string | null): Promise<Story[]> {
  const { data, error } = await supabase.from("prayer_posts").select(POST_COLS)
    .eq("post_type", "ask").eq("author_id", authorId).neq("status", "removed").order("created_at", { ascending: false });
  if (error) throw error;
  return hydrate((data ?? []) as PostRow[], viewerId);
}

export async function loadStory(id: string, viewerId: string | null): Promise<Story | null> {
  const { data, error } = await supabase.from("prayer_posts").select(POST_COLS).eq("id", id).maybeSingle();
  if (error) throw error;
  if (!data) return null;
  let ask = data as PostRow;
  if (ask.post_type === "answer" && ask.parent_prayer_id) {
    const { data: parent } = await supabase.from("prayer_posts").select(POST_COLS).eq("id", ask.parent_prayer_id).maybeSingle();
    if (parent) ask = parent as PostRow;
  }
  const [story] = await hydrate([ask], viewerId);
  return story ?? null;
}

export async function loadWords(prayerId: string): Promise<Word[]> {
  const { data, error } = await supabase.from("intercessions")
    .select("id, prayer_id, sender_id, body, kind, media_path, media_type, created_at")
    .eq("prayer_id", prayerId).neq("kind", "tap").order("created_at", { ascending: true });
  if (error) throw error;
  const authors = await loadAuthors((data ?? []).map(d => d.sender_id));
  return (data ?? []).map(d => ({
    id: d.id, prayer_id: d.prayer_id, body: d.body, kind: d.kind as Word["kind"],
    media_path: d.media_path, media_type: d.media_type as MediaType | null, created_at: d.created_at,
    author: authors.get(d.sender_id) ?? toAuthor(null, d.sender_id),
  }));
}

/** One-tap "I'm praying". Idempotent per person per prayer. */
export async function prayFor(prayerId: string, userId: string) {
  const { data: existing } = await supabase.from("intercessions").select("id").eq("prayer_id", prayerId).eq("sender_id", userId).eq("kind", "tap").maybeSingle();
  if (existing) return false;
  const { error } = await supabase.from("intercessions").insert({ prayer_id: prayerId, sender_id: userId, kind: "tap", body: "" });
  if (error) throw error;
  return true;
}

/** Keep the verse the author attached to their prayer (or clear it). */
export async function attachVerse(prayerId: string, verse: { reference: string; text: string } | null) {
  const { error } = await supabase.from("prayer_posts")
    .update({ verse_ref: verse?.reference ?? null, verse_text: verse?.text ?? null })
    .eq("id", prayerId);
  if (error) throw error;
}

export async function encourage(prayerId: string, userId: string, body: string) {
  const { error } = await supabase.from("intercessions").insert({ prayer_id: prayerId, sender_id: userId, kind: "word", body: body.trim() });
  if (error) throw error;
}

export async function uploadTestimonyMedia(userId: string, folder: string, file: File) {
  const extension = file.name.split(".").pop()?.replace(/[^a-z0-9]/gi, "") || "webm";
  const path = `${userId}/${folder}/${crypto.randomUUID()}.${extension}`;
  const { error } = await supabase.storage.from("testimony-media").upload(path, file, { contentType: file.type, upsert: false });
  if (error) throw error;
  return path;
}

export function mediaTypeOf(file: File): MediaType {
  if (file.type.startsWith("audio/")) return "audio";
  if (file.type.startsWith("image/")) return "image";
  return "video";
}

async function attachMedia(prayerId: string, userId: string, file: File, seconds?: number | null) {
  const path = await uploadTestimonyMedia(userId, prayerId, file);
  const { error } = await supabase.from("prayer_media").insert({
    prayer_id: prayerId, owner_id: userId, storage_path: path, media_type: mediaTypeOf(file),
    mime_type: file.type || "application/octet-stream", size_bytes: file.size,
    duration_seconds: seconds && seconds >= 1 ? Math.min(90, Math.round(seconds)) : null,
  });
  if (error) throw error;
  return path;
}

/**
 * Post a new ask. Written asks carry only text + a background tone; voice asks
 * carry the recording plus either a gradient tone or a photo it was spoken over.
 */
export async function createAsk(opts: {
  userId: string; body: string; category: Category; privacy: Privacy; isAnonymous: boolean;
  bg: string | null; media?: { file: File; seconds?: number | null } | null; backdrop?: File | null; overlay?: VideoOverlay | null;
}) {
  const { data: prayer, error } = await supabase.from("prayer_posts").insert({
    author_id: opts.userId, body: opts.body.trim(), category: opts.category, privacy: opts.privacy,
    is_anonymous: opts.isAnonymous, post_type: "ask", bg_color: opts.bg,
    overlay: (opts.overlay ?? null) as never,
  }).select("id").single();
  if (error) throw error;
  if (opts.media) await attachMedia(prayer.id, opts.userId, opts.media.file, opts.media.seconds);
  if (opts.backdrop) await attachMedia(prayer.id, opts.userId, opts.backdrop);
  return prayer.id;
}

/** Send a recorded prayer (video/voice) privately to the person who asked. */
export async function sendIntercession(prayerId: string, userId: string, file: File | null, note: string) {
  let media_path: string | null = null;
  let media_type: MediaType | null = null;
  if (file) {
    media_path = await uploadTestimonyMedia(userId, `intercession-${prayerId}`, file);
    media_type = mediaTypeOf(file);
  }
  const { error } = await supabase.from("intercessions").insert({
    prayer_id: prayerId, sender_id: userId, body: note.trim(),
    kind: file ? (media_type === "audio" ? "voice" : "video") : "word", media_path, media_type,
  });
  if (error) throw error;
}

/** Post the answer and link it to the original ask. */
export async function postAnswer(opts: {
  parentId: string; userId: string; body: string; kind: AnswerKind; privacy: Privacy; file: File | null; category: Category; isAnonymous: boolean; overlay?: VideoOverlay | null;
}) {
  const { data: answer, error } = await supabase.from("prayer_posts").insert({
    author_id: opts.userId, body: opts.body.trim(), category: opts.category, privacy: opts.privacy,
    is_anonymous: opts.isAnonymous, post_type: "answer", parent_prayer_id: opts.parentId, answer_kind: opts.kind,
    overlay: (opts.file ? opts.overlay ?? null : null) as never,
  }).select("id").single();
  if (error) throw error;
  if (opts.file) {
    const path = await uploadTestimonyMedia(opts.userId, answer.id, opts.file);
    const { error: mediaError } = await supabase.from("prayer_media").insert({
      prayer_id: answer.id, owner_id: opts.userId, storage_path: path, media_type: mediaTypeOf(opts.file),
      mime_type: opts.file.type || "video/webm", size_bytes: opts.file.size,
    });
    if (mediaError) throw mediaError;
  }
  const { error: parentError } = await supabase.from("prayer_posts").update({ status: "answered", answer_kind: opts.kind }).eq("id", opts.parentId);
  if (parentError) throw parentError;
  return answer.id;
}

export async function deletePrayer(id: string) {
  const { error } = await supabase.from("prayer_posts").update({ status: "removed" }).eq("id", id);
  if (error) throw error;
}

// ---------- Gratitude ----------

type GratRow = { id: string; author_id: string; body: string; privacy: string; media_path: string | null; media_type: string | null; linked_prayer_id: string | null; created_at: string };

function gratType(mt: string | null): GratitudeItem["type"] {
  if (mt === "image") return "photo";
  if (mt === "audio") return "voice";
  if (mt === "video") return "video";
  return "text";
}

const gratBgs = ["oklch(0.88 0.06 75)", "oklch(0.86 0.06 250)", "oklch(0.85 0.08 140)", "oklch(0.92 0.03 60)", "oklch(0.84 0.07 25)"];

/** The viewer's own Amen taps among a set of entries. */
async function myAmens(ids: string[], viewerId: string | null): Promise<Set<string>> {
  if (!viewerId || !ids.length) return new Set();
  // The generated table types don't include gratitude_amens yet; query untyped until they sync.
  const table = (supabase as unknown as { from: (name: string) => ReturnType<typeof untypedFrom> }).from("gratitude_amens");
  const { data } = await table.select("gratitude_id").eq("sender_id", viewerId).in("gratitude_id", ids);
  return new Set((data ?? []).map((a: { gratitude_id: string }) => a.gratitude_id));
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const untypedFrom = (_name: string): any => null;

export async function loadGratitude(opts: { authorId?: string; viewerId: string | null; limit?: number }): Promise<GratitudeItem[]> {
  let q = supabase.from("gratitude_entries").select("id, author_id, body, privacy, media_path, media_type, linked_prayer_id, created_at").order("created_at", { ascending: false }).limit(opts.limit ?? 80);
  if (opts.authorId) q = q.eq("author_id", opts.authorId);
  const { data, error } = await q;
  if (error) throw error;
  const rows = (data ?? []) as GratRow[];
  const [authors, amens] = await Promise.all([loadAuthors(rows.map(r => r.author_id)), myAmens(rows.map(r => r.id), opts.viewerId)]);
  return rows.map((r, i) => ({
    id: r.id, user_id: r.author_id, author: authors.get(r.author_id) ?? toAuthor(null, r.author_id),
    type: gratType(r.media_type), caption: r.body, media_path: r.media_path,
    bg_color: gratBgs[(r.id.charCodeAt(0) + i) % gratBgs.length], linked_prayer_id: r.linked_prayer_id,
    privacy: r.privacy as GratitudeItem["privacy"], created_at: r.created_at, amened: amens.has(r.id),
  }));
}

export async function loadGratitudeItem(id: string, viewerId: string | null): Promise<GratitudeItem | null> {
  const { data, error } = await supabase.from("gratitude_entries").select("id, author_id, body, privacy, media_path, media_type, linked_prayer_id, created_at").eq("id", id).maybeSingle();
  if (error) throw error;
  if (!data) return null;
  const r = data as GratRow;
  const [author, amens] = await Promise.all([loadAuthor(r.author_id), myAmens([r.id], viewerId)]);
  return {
    id: r.id, user_id: r.author_id, author, type: gratType(r.media_type), caption: r.body, media_path: r.media_path,
    bg_color: gratBgs[r.id.charCodeAt(0) % gratBgs.length], linked_prayer_id: r.linked_prayer_id,
    privacy: r.privacy as GratitudeItem["privacy"], created_at: r.created_at, amened: amens.has(r.id),
  };
}

/** Toggle the viewer's "Amen" on an entry. Returns the new state. */
export async function toggleAmen(gratitudeId: string, userId: string): Promise<boolean> {
  // The generated table types don't include gratitude_amens yet; query untyped until they sync.
  const table = (supabase as unknown as { from: (name: string) => ReturnType<typeof untypedFrom> }).from("gratitude_amens");
  const { data: existing } = await table.select("id").eq("gratitude_id", gratitudeId).eq("sender_id", userId).maybeSingle();
  if (existing) {
    const { error } = await table.delete().eq("id", existing.id);
    if (error) throw error;
    return false;
  }
  const { error } = await table.insert({ gratitude_id: gratitudeId, sender_id: userId });
  if (error) throw error;
  return true;
}

export async function deleteGratitude(id: string) {
  const { error } = await supabase.from("gratitude_entries").delete().eq("id", id);
  if (error) throw error;
}

// ---------- Safety ----------

export type ReportTarget = "prayer" | "message" | "profile" | "group" | "gratitude" | "organization" | "profile_media";
export type ReportReason = "safety" | "adult_content" | "harassment" | "privacy" | "spam" | "fraud" | "other";

export async function reportContent(userId: string, target_type: ReportTarget, target_id: string, reason: ReportReason, details: string) {
  const { error } = await supabase.from("content_reports").insert({ reporter_id: userId, target_type, target_id, reason, details: details.trim() });
  if (error) throw error;
}

export async function blockMember(userId: string, blockedId: string) {
  const { error } = await supabase.from("member_blocks").upsert({ blocker_id: userId, blocked_id: blockedId }, { onConflict: "blocker_id,blocked_id" });
  if (error) throw error;
}

export async function unblockMember(userId: string, blockedId: string) {
  const { error } = await supabase.from("member_blocks").delete().eq("blocker_id", userId).eq("blocked_id", blockedId);
  if (error) throw error;
}

export async function isBlocked(userId: string, otherId: string) {
  const { data } = await supabase.from("member_blocks").select("blocked_id").eq("blocker_id", userId).eq("blocked_id", otherId).maybeSingle();
  return Boolean(data);
}

export async function myRoles(userId: string): Promise<string[]> {
  const { data } = await supabase.from("user_roles").select("role").eq("user_id", userId);
  return (data ?? []).map(r => r.role as string);
}
