import { createFileRoute } from "@tanstack/react-router";
import { checkScheduledCredential } from "@/lib/cron-rotation.server";

/** Authentication/configuration check only: NEVER sends or moves money. */
async function health(request: Request) {
  const given = request.headers.get("x-reminder-key") ??
    request.headers.get("x-payout-key") ??
    /^Bearer ([^\s,]+)$/.exec(request.headers.get("authorization") ?? "")?.[1] ?? "";
  try {
    if (!(await checkScheduledCredential(given))) return new Response("Unauthorized", { status: 401 });
  } catch { return new Response("Authentication configuration unavailable", { status: 503 }); }
  const present = (...keys: string[]) => keys.every(key => Boolean(process.env[key]));
  return Response.json({
    authenticated: true,
    side_effects: false,
    configuration_present: {
      reminders: present("SUPABASE_URL", "SUPABASE_SERVICE_ROLE_KEY", "LOVABLE_API_KEY", "FIREBASE_MESSAGING_API_KEY"),
      payouts: present("SUPABASE_URL", "SUPABASE_SERVICE_ROLE_KEY", "LOVABLE_API_KEY", "STRIPE_LIVE_API_KEY"),
    },
    external_provider_access_verified: false,
  });
}

export const Route = createFileRoute("/api/public/cron-health")({
  staticData: { sitemap: false },
  server: { handlers: { GET: ({ request }) => health(request) } },
});
