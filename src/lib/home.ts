import { supabase } from "@/integrations/supabase/client";
import { loadAuthors, loadFeed, toAuthor, type Author, type Story } from "@/lib/prayers";

export interface PrayedForMe {
  id: string;
  prayer_id: string;
  author: Author;
  kind: "tap" | "word" | "video" | "voice";
  note: string;
  at: string;
}

export interface Streak {
  current: number;
  best: number;
  days: boolean[]; // last 7 days, oldest first
  lit_today: boolean;
}

export interface HomeData {
  feed: Story[];
  queue: Story[];
  prayedForMe: PrayedForMe[];
  prayedForMeCount: number;
  streak: Streak;
  prayingToday: number;
  answersThisWeek: number;
}

const dayKey = (d: Date) => d.toISOString().slice(0, 10);

function computeStreak(dates: string[]): Streak {
  const set = new Set(dates.map(d => dayKey(new Date(d))));
  const today = new Date();
  const days: boolean[] = [];
  for (let i = 6; i >= 0; i--) {
    const d = new Date(today); d.setUTCDate(d.getUTCDate() - i);
    days.push(set.has(dayKey(d)));
  }
  const litToday = set.has(dayKey(today));
  // current: consecutive days ending today (or yesterday if today is not lit yet)
  let current = 0;
  const cursor = new Date(today);
  if (!litToday) cursor.setUTCDate(cursor.getUTCDate() - 1);
  while (set.has(dayKey(cursor))) { current++; cursor.setUTCDate(cursor.getUTCDate() - 1); }
  // best: longest run in history
  const sorted = Array.from(set).sort();
  let best = 0, run = 0, prev: Date | null = null;
  for (const k of sorted) {
    const d = new Date(k + "T00:00:00Z");
    run = prev && (d.getTime() - prev.getTime()) === 86_400_000 ? run + 1 : 1;
    best = Math.max(best, run);
    prev = d;
  }
  return { current, best: Math.max(best, current), days, lit_today: litToday };
}

export async function loadHome(userId: string | null): Promise<HomeData> {
  const feed = await loadFeed(userId, 60);
  const empty: HomeData = {
    feed, queue: [], prayedForMe: [], prayedForMeCount: 0,
    streak: { current: 0, best: 0, days: [false, false, false, false, false, false, false], lit_today: false },
    prayingToday: 0, answersThisWeek: 0,
  };
  if (!userId) return empty;

  const queue = feed
    .filter(p => p.user_id !== userId && !p.answer && !p.i_prayed)
    .sort((a, b) => a.intercession_count - b.intercession_count)
    .slice(0, 8);

  const since = new Date(Date.now() - 7 * 86_400_000).toISOString();
  const dayAgo = new Date(Date.now() - 86_400_000).toISOString();
  const myAskIds = feed.filter(p => p.user_id === userId).map(p => p.id);

  const [mineRes, forMeRes, recentRes, answersRes] = await Promise.all([
    supabase.from("intercessions").select("created_at").eq("sender_id", userId).order("created_at", { ascending: false }).limit(400),
    myAskIds.length
      ? supabase.from("intercessions").select("id, prayer_id, sender_id, kind, body, created_at").in("prayer_id", myAskIds).neq("sender_id", userId).order("created_at", { ascending: false }).limit(50)
      : Promise.resolve({ data: [] as Array<{ id: string; prayer_id: string; sender_id: string; kind: string; body: string; created_at: string }> }),
    supabase.from("intercessions").select("sender_id").gte("created_at", dayAgo).limit(500),
    supabase.from("prayer_posts").select("id", { count: "exact", head: true }).eq("post_type", "answer").gte("created_at", since),
  ]);

  const forMe = forMeRes.data ?? [];
  const authors = await loadAuthors(forMe.map(f => f.sender_id));
  const prayedForMe: PrayedForMe[] = forMe.map(f => ({
    id: f.id, prayer_id: f.prayer_id, kind: f.kind as PrayedForMe["kind"], note: f.body, at: f.created_at,
    author: authors.get(f.sender_id) ?? toAuthor(null, f.sender_id),
  }));

  return {
    feed,
    queue,
    prayedForMe,
    prayedForMeCount: forMe.length,
    streak: computeStreak((mineRes.data ?? []).map(r => r.created_at)),
    prayingToday: new Set((recentRes.data ?? []).map(r => r.sender_id)).size,
    answersThisWeek: answersRes.count ?? 0,
  };
}
