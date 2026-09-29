import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

/**
 * Assigns a videographer to a need's story. Only the person who posted the
 * need, a leader of the church behind it, or our team can do this — the
 * database rules decide, not this code. The videographer gets an alert.
 */
export const assignStory = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) =>
    z
      .object({
        storyId: z.string().uuid(),
        videographerUserId: z.string().uuid(),
        videographerName: z.string().min(1).max(80),
      })
      .parse(data),
  )
  .handler(async ({ data, context }) => {
    const { data: story, error } = await context.supabase
      .from("need_stories")
      .update({
        videographer_id: data.videographerUserId,
        videographer_name: data.videographerName,
        assigned_at: new Date().toISOString(),
        status: "scheduled",
      })
      .eq("id", data.storyId)
      .select("id, need_id")
      .maybeSingle();
    if (error) { console.error("assignStory failed", error); throw new Error("We couldn't assign this story. Try again."); }
    if (!story) throw new Error("You can't assign this story.");

    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: need } = await supabaseAdmin
      .from("needs")
      .select("title")
      .eq("id", story.need_id)
      .maybeSingle();

    await supabaseAdmin.from("notifications").insert({
      user_id: data.videographerUserId,
      actor_id: context.userId,
      category: "weekly_story",
      title: "You're filming this week's story",
      body: need?.title ? `${need.title} — three visits are on the calendar.` : "Three visits are on the calendar.",
      path: "/film/queue",
    });

    return { ok: true as const };
  });

/**
 * Sends the finished film's link to the church that posted the need (and to
 * the person who posted it). Only the assigned videographer, the need's owner
 * or our team can send it, and only once a film exists.
 */
export const shareStoryWithChurch = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) => z.object({ storyId: z.string().uuid() }).parse(data))
  .handler(async ({ data, context }) => {
    const { data: story, error } = await context.supabase
      .from("need_stories")
      .select("id, need_id, film_path, film_url, videographer_id, videographer_name")
      .eq("id", data.storyId)
      .maybeSingle();
    if (error) throw new Error(error.message);
    if (!story) throw new Error("That story isn't yours to send.");
    if (!story.film_path && !story.film_url) throw new Error("Deliver the film first.");

    const { error: markError } = await context.supabase
      .from("need_stories")
      .update({ shared_at: new Date().toISOString() })
      .eq("id", data.storyId);
    if (markError) throw new Error(markError.message);

    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: need } = await supabaseAdmin
      .from("needs")
      .select("id, title, org_id, posted_by")
      .eq("id", story.need_id)
      .maybeSingle();
    if (!need) return { sent: 0 };

    const recipients = new Set<string>([need.posted_by]);
    if (need.org_id) {
      const { data: leaders } = await supabaseAdmin
        .from("organization_members")
        .select("user_id, role")
        .eq("org_id", need.org_id)
        .in("role", ["owner", "leader"]);
      for (const l of leaders ?? []) recipients.add(l.user_id);
    }
    recipients.delete(context.userId);

    const rows = Array.from(recipients).map(userId => ({
      user_id: userId,
      actor_id: context.userId,
      category: "weekly_story" as const,
      title: "Your story film is ready",
      body: `${need.title} — watch it and share it with your people.`,
      path: `/needs/${need.id}`,
    }));
    if (rows.length) await supabaseAdmin.from("notifications").insert(rows);

    return { sent: rows.length };
  });
