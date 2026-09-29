// "This is who's coming" — the hired professional tells the person at the door
// they're on the way. Only the professional who was actually hired for that job
// can send it, so the message can be trusted.

import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

const input = z.object({
  requestId: z.string().uuid(),
  note: z.string().max(300).optional(),
});

export const sendHeadsUp = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) => input.parse(data))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context as {
      supabase: import("@supabase/supabase-js").SupabaseClient;
      userId: string;
    };

    // Read as the caller, so row-level rules still apply.
    const { data: request, error } = await supabase
      .from("service_requests")
      .select("id, status, seeker_id, hired_pro_id, title")
      .eq("id", data.requestId)
      .maybeSingle();
    if (error) throw error;
    if (!request || request.status !== "hired" || !request.hired_pro_id) {
      throw new Error("That job isn't hired out.");
    }

    const { data: pro } = await supabase
      .from("pro_profiles")
      .select("id, user_id, display_name, trade, slug")
      .eq("id", request.hired_pro_id)
      .maybeSingle();
    if (!pro || pro.user_id !== userId) {
      throw new Error("Only the professional who was hired can send this.");
    }

    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { error: saveError } = await supabaseAdmin
      .from("service_requests")
      .update({
        heads_up_at: new Date().toISOString(),
        heads_up_note: (data.note ?? "").trim().slice(0, 300),
      })
      .eq("id", request.id);
    if (saveError) throw saveError;

    // The message is composed here, on the server, from verified job facts —
    // the only freeform part is the hired professional's own short note.
    const note = (data.note ?? "").trim().slice(0, 300);
    const trade = (pro.trade as string) ?? "";
    const { pushToUser } = await import("@/lib/notify.server");
    await pushToUser({
      userId: request.seeker_id as string,
      title: `${pro.display_name as string} is on the way`,
      body: note || `${trade || "Your professional"} — tap to see who's coming.`,
      path: `/requests/${request.id}`,
      category: "needs",
    }).catch(() => undefined);

    return {
      seekerId: request.seeker_id as string,
      proName: pro.display_name as string,
      trade: (pro.trade as string) ?? "",
    };
  });
