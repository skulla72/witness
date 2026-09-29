import { createFileRoute } from "@tanstack/react-router";
import { timingSafeEqual } from "crypto";

const GATEWAY_URL = "https://connector-gateway.lovable.dev/firebase_messaging";

/** Shame-free copy; the nudge rotates by day. */
const NUDGES = [
  { title: "The day isn't over", body: "Still here. Say the thing you can't say anything else." },
  { title: "One quiet minute", body: "Carry someone else's prayer for a moment — it costs nothing." },
  { title: "Your candle's waiting", body: "Light it with a word, a prayer, or a thank-you." },
  { title: "Whenever you're ready", body: "Nothing is due. But someone's ask is open if you want to carry it." },
];

type PrefsRow = {
  user_id: string;
  reminder_hour: number | null;
  quiet_start: number | null;
  quiet_end: number | null;
  time_zone: string | null;
  last_reminder_date: string | null;
};

/** Local hour (0-23) and YYYY-MM-DD for this person, or UTC when unknown. */
function localParts(now: Date, timeZone: string | null) {
  if (timeZone) {
    try {
      const hour = Number(
        new Intl.DateTimeFormat("en-US", { hour: "numeric", hour12: false, timeZone }).format(now),
      ) % 24;
      const date = new Intl.DateTimeFormat("en-CA", { timeZone }).format(now);
      if (Number.isFinite(hour) && /^\d{4}-\d{2}-\d{2}$/.test(date)) return { hour, date };
    } catch {
      /* unknown zone — fall through to UTC */
    }
  }
  return {
    hour: now.getUTCHours(),
    date: new Intl.DateTimeFormat("en-CA", { timeZone: "UTC" }).format(now),
  };
}

function inQuiet(start: number | null, end: number | null, hour: number) {
  if (start === null || end === null) return false;
  if (start === end) return true;
  return start < end ? hour >= start && hour < end : hour >= start || hour < end;
}

/**
 * "Not before the hour they picked" — unless that hour sits inside their quiet
 * hours, in which case the nudge waits until quiet hours end instead.
 */
function effectiveHour(reminder: number, quietStart: number | null, quietEnd: number | null) {
  if (quietStart === null || quietEnd === null) return reminder;
  return inQuiet(quietStart, quietEnd, reminder) ? quietEnd : reminder;
}

function pickNudge(date: string, userId: string) {
  let hash = 0;
  const seed = `${date}:${userId}`;
  for (let i = 0; i < seed.length; i += 1) hash = (hash * 31 + seed.charCodeAt(i)) | 0;
  return NUDGES[Math.abs(hash) % NUDGES.length];
}

export const Route = createFileRoute("/api/public/push/reminders")({
  staticData: { sitemap: false },
  server: {
    handlers: {
      POST: async ({ request }) => {
        const lovableKey = process.env["LOVABLE_API_KEY"];
        const connectionKey = process.env["FIREBASE_MESSAGING_API_KEY"];
        if (!lovableKey || !connectionKey) {
          return Response.json({ error: "not configured" }, { status: 503 });
        }

        // Only the scheduled job (and we) know this key.
        const given = request.headers.get("x-reminder-key") ?? "";
        const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
        const { data: keyRow } = await supabaseAdmin
          .from("reminder_cron_key")
          .select("key")
          .limit(1)
          .maybeSingle();
        const expected = keyRow?.key ?? "";
        const a = Buffer.from(given);
        const b = Buffer.from(expected);
        if (!expected || a.length !== b.length || !timingSafeEqual(a, b)) {
          return new Response("Bad key", { status: 401 });
        }

        const now = new Date();
        const { data: prefRows } = await supabaseAdmin
          .from("notification_prefs")
          .select("*")
          .eq("reminders", true);
        const prefs = (prefRows ?? []) as unknown as PrefsRow[];

        const eligible: PrefsRow[] = [];
        for (const row of prefs) {
          const { hour, date } = localParts(now, row.time_zone);
          if (row.last_reminder_date === date) continue;
          const start = effectiveHour(row.reminder_hour ?? 19, row.quiet_start, row.quiet_end);
          if (hour < start) continue;
          if (inQuiet(row.quiet_start, row.quiet_end, hour)) continue;
          eligible.push({ ...row, last_reminder_date: date });
        }
        if (!eligible.length) return Response.json({ checked: prefs.length, sent: 0 });

        const { data: deviceRows } = await supabaseAdmin
          .from("push_devices")
          .select("id, user_id, token")
          .in("user_id", eligible.map(r => r.user_id));
        const devices = deviceRows ?? [];
        const byUser = new Map<string, Array<{ id: string; token: string }>>();
        for (const d of devices) {
          const list = byUser.get(d.user_id) ?? [];
          list.push({ id: d.id, token: d.token });
          byUser.set(d.user_id, list);
        }

        let sent = 0;
        for (const row of eligible) {
          const userDevices = byUser.get(row.user_id) ?? [];
          if (!userDevices.length) continue; // never registered a phone — in-app nudge still covers them
          const nudge = pickNudge(row.last_reminder_date!, row.user_id);
          let ok = 0;
          for (const device of userDevices) {
            const response = await fetch(`${GATEWAY_URL}/v1/projects/_/messages:send`, {
              method: "POST",
              headers: {
                Authorization: `Bearer ${lovableKey}`,
                "X-Connection-Api-Key": connectionKey,
                "Content-Type": "application/json",
              },
              body: JSON.stringify({
                message: {
                  token: device.token,
                  notification: { title: nudge.title, body: nudge.body },
                  data: { path: "/" },
                },
              }),
            });
            if (response.ok) {
              ok += 1;
              continue;
            }
            const errorBody = await response.text();
            console.error(`Reminder push failed [${response.status}]: ${errorBody}`);
            if (response.status === 404 || response.status === 400) {
              await supabaseAdmin.from("push_devices").delete().eq("id", device.id);
            }
          }
          if (ok > 0) {
            sent += ok;
            // One nudge a day, even across several devices.
            await supabaseAdmin
              .from("notification_prefs")
              .update({ last_reminder_date: row.last_reminder_date } as never)
              .eq("user_id", row.user_id);
          }
        }

        return Response.json({ checked: prefs.length, eligible: eligible.length, sent });
      },
    },
  },
});
