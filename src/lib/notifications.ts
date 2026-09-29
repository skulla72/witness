import { supabase } from "@/integrations/supabase/client";
import type { Tables } from "@/integrations/supabase/types";

export type NotificationPrefs = Tables<"notification_prefs">;

export type AlertKey = "prayed_for_me" | "answers" | "messages" | "needs" | "weekly_story";

export const ALERTS: { key: AlertKey; label: string; sub: string }[] = [
  { key: "prayed_for_me", label: "Someone prayed for me", sub: "A quiet nudge when your ask is carried." },
  { key: "answers", label: "Answers", sub: "When a prayer you carried is answered." },
  { key: "messages", label: "Messages and calls", sub: "New private messages and incoming calls." },
  { key: "needs", label: "Needs and serving", sub: "A need near you, or your hours getting verified." },
  { key: "weekly_story", label: "The week's story", sub: "When this week's need is filmed and posted." },
];

export const DEFAULT_PREFS: Pick<
  NotificationPrefs,
  AlertKey | "quiet_start" | "quiet_end" | "reminders" | "reminder_hour"
> = {
  prayed_for_me: true,
  answers: true,
  messages: true,
  needs: true,
  weekly_story: false,
  quiet_start: null,
  quiet_end: null,
  reminders: false,
  reminder_hour: null,
};


/** What this person has chosen, or the gentle defaults if they never touched it. */
export async function loadNotificationPrefs(userId: string) {
  const { data, error } = await supabase
    .from("notification_prefs")
    .select("*")
    .eq("user_id", userId)
    .maybeSingle();
  if (error) throw error;
  return data ?? null;
}

export async function saveNotificationPrefs(
  userId: string,
  patch: Partial<
    Pick<NotificationPrefs, AlertKey | "quiet_start" | "quiet_end" | "time_zone" | "reminders" | "reminder_hour">
  >,

) {
  const timeZone =
    patch.time_zone ?? (typeof Intl !== "undefined" ? Intl.DateTimeFormat().resolvedOptions().timeZone : null);
  const { error } = await supabase
    .from("notification_prefs")
    .upsert({ user_id: userId, ...DEFAULT_PREFS, ...patch, time_zone: timeZone }, { onConflict: "user_id" });
  if (error) throw error;
}

/** "10 PM" style label for the quiet-hours pickers. */
export function hourLabel(hour: number) {
  const suffix = hour < 12 ? "AM" : "PM";
  const twelve = hour % 12 === 0 ? 12 : hour % 12;
  return `${twelve} ${suffix}`;
}
