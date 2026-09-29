// Habit + engagement layer.
// These are the "return" mechanics: a daily candle, reciprocity signals,
// anniversaries of past asks, and a weekly prayer partner.
// Deliberately shame-free: no red numbers, no lost-streak punishment.

import { prayers, users, findUser, type Prayer } from "@/data/seed";

export interface Streak {
  current: number; // consecutive days you showed up for someone
  best: number;
  grace_days: number; // forgiveness tokens: a miss doesn't reset
  days: boolean[]; // last 7 days, oldest first
}

export const streak: Streak = {
  current: 12,
  best: 31,
  grace_days: 2,
  days: [true, true, true, false, true, true, true],
};

export const dayLabels = ["M", "T", "W", "T", "F", "S", "S"];

/** Someone prayed for YOUR ask — the reciprocity loop. */
export interface PrayedForYou {
  id: string;
  user_id: string;
  prayer_id: string;
  at: string;
  kind: "prayed" | "sat" | "voice" | "scripture";
  note?: string;
}

const hoursAgo = (h: number) => new Date(Date.now() - h * 3600_000).toISOString();

export const prayedForYou: PrayedForYou[] = [
  { id: "pf1", user_id: "u_ruth", prayer_id: "p1", at: hoursAgo(2), kind: "prayed" },
  { id: "pf2", user_id: "u_james", prayer_id: "p1", at: hoursAgo(5), kind: "sat", note: "Sat with it for 4 minutes." },
  { id: "pf3", user_id: "u_lena", prayer_id: "p1", at: hoursAgo(9), kind: "voice" },
  { id: "pf4", user_id: "u_marcus", prayer_id: "p1", at: hoursAgo(21), kind: "scripture", note: "Psalm 34:18" },
  { id: "pf5", user_id: "u_priya", prayer_id: "p1", at: hoursAgo(30), kind: "prayed" },
];

export const prayedForYouCount = 47;

export const kindLabel: Record<PrayedForYou["kind"], string> = {
  prayed: "prayed for you",
  sat: "sat with you",
  voice: "left a voice prayer",
  scripture: "sent you scripture",
};

/** Anniversary resurfacing: "a year ago today, you asked this." */
export interface Anniversary {
  prayer_id: string;
  years: number;
  headline: string;
  then: string;
  now?: string;
}

export const anniversaries: Anniversary[] = [
  {
    prayer_id: "p2",
    years: 1,
    headline: "One year ago today",
    then: "You asked for a job — any job — before the lease ran out.",
    now: "You marked it answered 4 months later.",
  },
];

/** Weekly matched prayer partner. */
export interface Partner {
  user_id: string;
  week_of: string;
  checked_in: boolean;
  their_ask: string;
  minutes: number;
}

export const partner: Partner = {
  user_id: "u_aiden",
  week_of: "This week",
  checked_in: false,
  their_ask: "First semester away from home. Trying to stay steady.",
  minutes: 5,
};

/** Open asks that most need someone today — the one-tap queue. */
export function todayQueue(): Prayer[] {
  return prayers
    .filter(p => p.user_id !== "u_me" && (p.status === "open" || p.status === "ongoing"))
    .sort((a, b) => a.intercession_count - b.intercession_count)
    .slice(0, 8);
}

/** People with fresh asks — shown as a familiar avatar rail. */
export function askRail() {
  return todayQueue().map(p => ({
    prayer: p,
    user: p.is_anonymous ? { ...findUser(p.user_id), name: "Anonymous" } : findUser(p.user_id),
  }));
}

export function communityToday() {
  return {
    praying_now: 218,
    answers_this_week: 34,
    people: users.length,
  };
}
