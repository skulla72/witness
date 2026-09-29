import { createServerFn } from "@tanstack/react-start";
import { createClient } from "@supabase/supabase-js";
import type { Database } from "@/integrations/supabase/types";

/** Anonymous server-side reads: only what the public policies allow. */
function publicClient() {
  const key = process.env["SUPABASE_PUBLISHABLE_KEY"]!;
  return createClient<Database>(process.env["SUPABASE_URL"]!, key, {
    auth: { persistSession: false, autoRefreshToken: false },
    global: {
      fetch: (input, init) => {
        const h = new Headers(init?.headers);
        if (key.startsWith("sb_") && h.get("Authorization") === `Bearer ${key}`) h.delete("Authorization");
        h.set("apikey", key);
        return fetch(input, { ...init, headers: h });
      },
    },
  });
}

const UUID = /^[0-9a-fA-F-]{36}$/;

export interface PublicNeed {
  id: string;
  title: string;
  story: string;
  city: string;
  region: string;
  goal_cents: number;
  raised_cents: number;
  status: string;
  kind: string;
  cover_url: string | null;
  org_name: string | null;
}

/** For the shareable need page: title, story and cover image for link previews. */
export const getPublicNeed = createServerFn({ method: "GET" })
  .inputValidator((data: { id: string }) => {
    if (!UUID.test(data.id)) throw new Error("Invalid need");
    return data;
  })
  .handler(async ({ data }): Promise<PublicNeed | null> => {
    const supabase = publicClient();
    const { data: need } = await supabase
      .from("needs")
      .select("id, title, story, city, region, goal_cents, raised_cents, status, kind, cover_path, org_id")
      .eq("id", data.id)
      .maybeSingle();
    if (!need) return null;
    let org_name: string | null = null;
    if (need.org_id) {
      const { data: org } = await supabase.from("organizations").select("name").eq("id", need.org_id).maybeSingle();
      org_name = org?.name ?? null;
    }
    let cover_url: string | null = null;
    if (need.cover_path) {
      const { data: signed } = await supabase.storage.from("need-media").createSignedUrl(need.cover_path, 60 * 60 * 24);
      cover_url = signed?.signedUrl ?? null;
    }
    return {
      id: need.id,
      title: need.title,
      story: need.story,
      city: need.city,
      region: need.region,
      goal_cents: need.goal_cents,
      raised_cents: need.raised_cents,
      status: need.status,
      kind: need.kind,
      cover_url,
      org_name,
    };
  });

export interface PublicReview {
  stars: number;
  body: string;
  donated: boolean;
  hours: number | null;
  created_at: string;
}

export interface PublicBadge {
  user_id: string;
  display_name: string;
  business_name: string;
  business_line: string;
  hours_verified: number;
  hours_self: number;
  avg_stars: number | null;
  review_count: number;
  donated_jobs: number;
  paid_jobs: number;
  unfinished_marks: number;
  reviews: PublicReview[];
}

/** For the shareable serving badge — hours and reviews, never dollars. */
export const getPublicBadge = createServerFn({ method: "GET" })
  .inputValidator((data: { id: string }) => {
    if (!UUID.test(data.id)) throw new Error("Invalid badge");
    return data;
  })
  .handler(async ({ data }): Promise<PublicBadge | null> => {
    const client = publicClient();
    const { data: row } = await client
      .from("serving_badges")
      .select("user_id, display_name, business_name, business_line, hours_verified, hours_self")
      .eq("user_id", data.id)
      .eq("is_public", true)
      .maybeSingle();
    if (!row) return null;

    const [rep, reviews] = await Promise.all([
      client
        .from("worker_reputation")
        .select("stars_avg, review_count, donated_count, jobs_paid, mark_count")
        .eq("user_id", data.id)
        .maybeSingle(),
      client
        .from("worker_reviews")
        .select("stars, body, donated, hours, created_at")
        .eq("worker_id", data.id)
        .order("created_at", { ascending: false })
        .limit(10),
    ]);

    return {
      ...row,
      display_name: row.display_name || "A Witness member",
      hours_verified: Number(row.hours_verified),
      hours_self: Number(row.hours_self),
      avg_stars: rep.data && Number(rep.data.stars_avg) > 0 ? Number(rep.data.stars_avg) : null,
      review_count: Number(rep.data?.review_count ?? 0),
      donated_jobs: Number(rep.data?.donated_count ?? 0),
      paid_jobs: Number(rep.data?.jobs_paid ?? 0),
      unfinished_marks: Number(rep.data?.mark_count ?? 0),
      reviews: (reviews.data ?? []).map(r => ({
        stars: Number(r.stars),
        body: r.body ?? "",
        donated: !!r.donated,
        hours: r.hours != null ? Number(r.hours) : null,
        created_at: r.created_at,
      })),
    };
  });

