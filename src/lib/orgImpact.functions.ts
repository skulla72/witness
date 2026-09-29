import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

export interface OrgImpact {
  giftsCents: number;
  giftCount: number;
  hoursServed: number;
  hoursPending: number;
  pendingStories: { id: string; title: string; status: string; week_of: string }[];
  publishedStories: number;
}

/** One organization's impact, for its own leaders only. Totals, never donor details. */
export const getOrgImpact = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator(d => z.object({ orgId: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }): Promise<OrgImpact | { error: string }> => {
    const { data: member } = await context.supabase
      .from("organization_members")
      .select("role")
      .eq("org_id", data.orgId)
      .eq("user_id", context.userId)
      .maybeSingle();
    if (!member || !["owner", "leader"].includes(member.role)) return { error: "Not allowed" };

    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const [gifts, hours, needs] = await Promise.all([
      supabaseAdmin.from("donations").select("recipient_cents, amount_cents")
        .eq("org_id", data.orgId).eq("status", "paid").eq("environment", "live"),
      supabaseAdmin.from("service_hours").select("hours, status").eq("org_id", data.orgId),
      supabaseAdmin.from("needs").select("id, title").eq("org_id", data.orgId),
    ]);
    const needRows = needs.data ?? [];
    const titles = new Map(needRows.map(n => [n.id, n.title]));
    const stories = needRows.length
      ? (await supabaseAdmin.from("need_stories").select("id, need_id, status, week_of")
          .in("need_id", needRows.map(n => n.id))).data ?? []
      : [];

    const g = gifts.data ?? [];
    const h = hours.data ?? [];
    return {
      giftsCents: g.reduce((s, r) => s + (r.recipient_cents || r.amount_cents || 0), 0),
      giftCount: g.length,
      hoursServed: h.filter(r => r.status === "verified").reduce((s, r) => s + Number(r.hours ?? 0), 0),
      hoursPending: h.filter(r => r.status === "self").reduce((s, r) => s + Number(r.hours ?? 0), 0),
      pendingStories: stories
        .filter(s => s.status === "scheduled" || s.status === "filming")
        .map(s => ({ id: s.id, title: titles.get(s.need_id) ?? "A need", status: s.status, week_of: s.week_of })),
      publishedStories: stories.filter(s => s.status === "published").length,
    };
  });
