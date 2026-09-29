import { supabase } from "@/integrations/supabase/client";
import type { Tables } from "@/integrations/supabase/types";

export type ProfileMedia = Tables<"profile_media">;
export type ProfilePageType = "organization" | "professional" | "counselor";

export async function listProfileMedia(pageType: ProfilePageType, pageId: string) {
  const { data, error } = await supabase
    .from("profile_media")
    .select("*")
    .eq("page_type", pageType)
    .eq("page_id", pageId)
    .order("display_order")
    .order("created_at");
  if (error) throw error;
  return (data ?? []) as ProfileMedia[];
}

function extension(file: File) {
  const fromName = file.name.split(".").pop()?.toLowerCase().replace(/[^a-z0-9]/g, "");
  if (fromName) return fromName;
  return file.type.startsWith("video/") ? "mp4" : "jpg";
}

export async function uploadProfileFile(userId: string, pageType: ProfilePageType, pageId: string, file: File, purpose = "gallery") {
  const path = `${userId}/${pageType}/${pageId}/${purpose}-${crypto.randomUUID()}.${extension(file)}`;
  const { error } = await supabase.storage.from("profile-media").upload(path, file, {
    contentType: file.type,
    upsert: false,
  });
  if (error) throw error;
  return path;
}

export async function addProfileMedia(input: {
  userId: string;
  pageType: ProfilePageType;
  pageId: string;
  file: File;
  caption: string;
  displayOrder: number;
}) {
  const path = await uploadProfileFile(input.userId, input.pageType, input.pageId, input.file);
  const mediaType = input.file.type.startsWith("video/") ? "video" : "image";
  const { error } = await supabase.from("profile_media").insert({
    page_type: input.pageType,
    page_id: input.pageId,
    media_type: mediaType,
    storage_path: path,
    caption: input.caption.trim(),
    display_order: input.displayOrder,
    owner_id: input.userId,
  });
  if (error) {
    await supabase.storage.from("profile-media").remove([path]);
    throw error;
  }
}

export async function updateProfileMedia(id: string, patch: Pick<ProfileMedia, "caption" | "display_order">) {
  const { error } = await supabase.from("profile_media").update(patch).eq("id", id);
  if (error) throw error;
}

export async function removeProfileMedia(item: Pick<ProfileMedia, "id" | "storage_path">) {
  const { error } = await supabase.from("profile_media").delete().eq("id", item.id);
  if (error) throw error;
  await supabase.storage.from("profile-media").remove([item.storage_path]);
}