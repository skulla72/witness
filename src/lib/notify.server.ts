// Server-only push sender. Never callable from the browser: every caller must
// first prove the sender has a real relationship to the person being notified.

const GATEWAY_URL = "https://connector-gateway.lovable.dev/firebase_messaging";

export type NotifyCategory = "prayed_for_me" | "answers" | "messages" | "needs" | "weekly_story";

/** Inside the hours this person asked to be left alone? */
function inQuietHours(start: number | null, end: number | null, timeZone: string | null): boolean {
  if (start === null || end === null) return false;
  const now = new Date();
  let hour = now.getUTCHours();
  if (timeZone) {
    const local = new Intl.DateTimeFormat("en-US", { hour: "numeric", hour12: false, timeZone }).format(now);
    const parsed = Number(local);
    if (Number.isFinite(parsed)) hour = parsed % 24;
  }
  return start <= end ? hour >= start && hour < end : hour >= start || hour < end;
}

export async function pushToUser(args: {
  userId: string;
  title: string;
  body: string;
  path?: string;
  category?: NotifyCategory;
}): Promise<{ sent: number; configured: boolean; skipped?: "muted" | "quiet-hours" }> {
  const lovableKey = process.env["LOVABLE_API_KEY"];
  const connectionKey = process.env["FIREBASE_MESSAGING_API_KEY"];
  if (!lovableKey || !connectionKey) return { sent: 0, configured: false };

  const title = args.title.slice(0, 120);
  const body = args.body.slice(0, 300);
  const path = args.path?.slice(0, 200);

  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

  // Respect what this person asked to hear, and when.
  const { data: prefs } = await supabaseAdmin
    .from("notification_prefs")
    .select("*")
    .eq("user_id", args.userId)
    .maybeSingle();
  if (prefs) {
    if (args.category && prefs[args.category] === false) {
      return { sent: 0, configured: true, skipped: "muted" };
    }
    if (inQuietHours(prefs.quiet_start, prefs.quiet_end, prefs.time_zone)) {
      return { sent: 0, configured: true, skipped: "quiet-hours" };
    }
  }

  const { data: devices } = await supabaseAdmin
    .from("push_devices")
    .select("id, token")
    .eq("user_id", args.userId);
  if (!devices?.length) return { sent: 0, configured: true };

  let sent = 0;
  for (const device of devices) {
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
          notification: { title, body },
          ...(path ? { data: { path } } : {}),
        },
      }),
    });
    if (response.ok) {
      sent += 1;
      continue;
    }
    const errorBody = await response.text();
    console.error(`Push send failed [${response.status}]: ${errorBody}`);
    if (response.status === 404 || response.status === 400) {
      await supabaseAdmin.from("push_devices").delete().eq("id", device.id);
    }
  }
  return { sent, configured: true };
}
