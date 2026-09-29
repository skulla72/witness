import type { NotificationPrefs } from "@/lib/notifications";

const DISMISS_KEY = "witness.reminder.dismissed";

function today() {
  const now = new Date();
  return `${now.getFullYear()}-${now.getMonth() + 1}-${now.getDate()}`;
}

/** Someone told us to stay silent right now. */
export function inQuietHours(prefs: Pick<NotificationPrefs, "quiet_start" | "quiet_end">, hour: number) {
  const start = prefs.quiet_start;
  const end = prefs.quiet_end;
  if (start === null || end === null) return false;
  if (start === end) return true;
  return start < end ? hour >= start && hour < end : hour >= start || hour < end;
}

/** Already waved off today's nudge. */
export function reminderDismissedToday() {
  try {
    return window.localStorage.getItem(DISMISS_KEY) === today();
  } catch {
    return false;
  }
}

export function dismissReminderToday() {
  try {
    window.localStorage.setItem(DISMISS_KEY, today());
  } catch {
    /* private browsing — the nudge simply returns later */
  }
}

/**
 * Only ever true when the person switched reminders on themselves,
 * it's past the hour they picked, they're not in quiet hours,
 * and they haven't waved it off today.
 */
export function shouldShowReminder(
  prefs: Pick<NotificationPrefs, "reminders" | "reminder_hour" | "quiet_start" | "quiet_end"> | null,
  now = new Date(),
) {
  if (!prefs?.reminders) return false;
  const hour = now.getHours();
  if (hour < (prefs.reminder_hour ?? 19)) return false;
  if (inQuietHours(prefs, hour)) return false;
  return !reminderDismissedToday();
}
