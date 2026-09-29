import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

const schema = z.object({
  surveyId: z.string().trim().min(1).max(40),
  rating: z.number().int().min(1).max(5),
  keep: z.string().trim().max(600),
  missing: z.string().trim().max(600),
  friction: z.string().trim().max(600),
  minutesUsed: z.number().int().min(0).max(100000),
});

/** Store one short in-app feedback survey from the signed-in person. */
export const submitFeedback = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) => schema.parse(data))
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase.from("app_feedback").insert({
      user_id: context.userId,
      survey_id: data.surveyId,
      rating: data.rating,
      keep: data.keep,
      missing: data.missing,
      friction: data.friction,
      minutes_used: data.minutesUsed,
    });
    if (error) { console.error("submitFeedback failed", error); throw new Error("We couldn't save your feedback. Try again."); }
    return { ok: true };
  });
