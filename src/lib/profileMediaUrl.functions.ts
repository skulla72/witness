import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { getOptionalUserId } from "./optional-auth.server";

/**
 * Signs a profile-media file only when it belongs to a public service page
 * (approved gallery item, organization logo/cover, approved pro/counselor photo)
 * or when the caller uploaded it.
 */
export const signProfileMedia = createServerFn({ method: "POST" })
  .inputValidator(d => z.object({ path: z.string().min(1).max(500) }).parse(d))
  .handler(async ({ data }): Promise<{ url: string | null }> => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const path = data.path;
    const userId = await getOptionalUserId();

    const allowed = await (async () => {
      if (userId && path.startsWith(`${userId}/`)) return true;
      const { data: org } = await supabaseAdmin.from("organizations").select("id")
        .or(`logo_url.eq.${JSON.stringify(path)},cover_path.eq.${JSON.stringify(path)}`).limit(1);
      if (org?.length) return true;
      const { data: pro } = await supabaseAdmin.from("pro_profiles").select("id")
        .eq("photo_url", path).eq("status", "approved").limit(1);
      if (pro?.length) return true;
      const { data: c } = await supabaseAdmin.from("counselor_profiles").select("id")
        .eq("photo_url", path).eq("status", "approved").limit(1);
      if (c?.length) return true;
      const { data: pm } = await supabaseAdmin.from("profile_media").select("page_type, page_id")
        .eq("storage_path", path).eq("moderation_status", "visible").limit(1).maybeSingle();
      if (!pm) return false;
      const table = pm.page_type === "organization" ? "organizations"
        : pm.page_type === "professional" ? "pro_profiles"
        : pm.page_type === "counselor" ? "counselor_profiles" : null;
      if (!table) return false;
      const { data: page } = table === "organizations"
        ? await supabaseAdmin.from("organizations").select("id").eq("id", pm.page_id).limit(1)
        : await supabaseAdmin.from(table).select("id").eq("id", pm.page_id).eq("status", "approved").limit(1);
      return !!page?.length;
    })();

    if (!allowed) return { url: null };
    const { data: signed } = await supabaseAdmin.storage.from("profile-media").createSignedUrl(path, 300);
    return { url: signed?.signedUrl ?? null };
  });
