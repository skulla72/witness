import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { DEFAULT_PREFS, type Prefs } from "@/data/personalize";

const surveySchema = z.object({
  done: z.boolean(),
  firstName: z.string().trim().max(80),
  gender: z.enum(["male", "female", "unspecified"]),
  seasons: z.array(z.string().max(40)).max(20),
  intensity: z.enum(["quiet", "steady", "all_in"]),
  anonymousFirst: z.boolean(),
  mensRoom: z.boolean(),
  lanes: z.array(z.string().max(40)).max(20),
  serve: z.array(z.string().max(20)).max(10),
  processing: z.enum(["talk", "write", "silence"]),
  contact: z.enum(["rare", "steady", "daily"]),
  timeOfDay: z.enum(["morning", "midday", "night"]),
  groupSize: z.enum(["one", "few", "many"]),
  faithBased: z.boolean().nullable(),
  addedFeatures: z.array(z.string().max(40)).max(40),
  removedFeatures: z.array(z.string().max(40)).max(40),
  answers: z.record(z.string().max(60), z.array(z.string().max(60)).max(40)),
});

type Row = {
  completed: boolean;
  first_name: string;
  gender: string | null;
  seasons: string[];
  intensity: string;
  anonymous_first: boolean;
  mens_room: boolean;
  lanes: string[];
  serve: string[];
  processing: string;
  contact: string;
  time_of_day: string;
  group_size: string;
  faith_based: boolean | null;
  added_features: string[];
  removed_features: string[];
  answers: Record<string, string[]> | null;
};

function toPrefs(row: Row): Prefs {
  return {
    ...DEFAULT_PREFS,
    done: row.completed,
    firstName: row.first_name,
    gender: (row.gender ?? "unspecified") as Prefs["gender"],
    seasons: row.seasons as Prefs["seasons"],
    intensity: row.intensity as Prefs["intensity"],
    anonymousFirst: row.anonymous_first,
    mensRoom: row.mens_room,
    lanes: row.lanes as Prefs["lanes"],
    serve: row.serve as Prefs["serve"],
    processing: row.processing as Prefs["processing"],
    contact: row.contact as Prefs["contact"],
    timeOfDay: row.time_of_day as Prefs["timeOfDay"],
    groupSize: row.group_size as Prefs["groupSize"],
    faithBased: row.faith_based,
    addedFeatures: row.added_features as Prefs["addedFeatures"],
    removedFeatures: row.removed_features as Prefs["removedFeatures"],
    answers: row.answers ?? {},
  };
}

/** The signed-in person's survey answers, or null if they've never answered. */
export const getMySurvey = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data, error } = await context.supabase
      .from("user_survey")
      .select("*")
      .eq("user_id", context.userId)
      .maybeSingle();
    if (error) throw error;
    return data ? toPrefs(data as Row) : null;
  });

/** Save (or overwrite) the signed-in person's answers so they follow the account. */
export const saveMySurvey = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) => surveySchema.parse(data))
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase.from("user_survey").upsert(
      {
        user_id: context.userId,
        completed: data.done,
        first_name: data.firstName,
        gender: data.gender,
        seasons: data.seasons,
        intensity: data.intensity,
        anonymous_first: data.anonymousFirst,
        mens_room: data.mensRoom,
        lanes: data.lanes,
        serve: data.serve,
        processing: data.processing,
        contact: data.contact,
        time_of_day: data.timeOfDay,
        group_size: data.groupSize,
        faith_based: data.faithBased,
        added_features: data.addedFeatures,
        removed_features: data.removedFeatures,
        answers: data.answers,
      },
      { onConflict: "user_id" },
    );
    if (error) throw error;
    return { ok: true };
  });
