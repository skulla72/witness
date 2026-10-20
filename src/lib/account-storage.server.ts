import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/integrations/supabase/types";

export type AccountFile = { bucket: string; path: string; download_url?: string };

/** Every upload layout used by Witness, including orphaned uploads. */
export async function listAccountFiles(client: SupabaseClient<Database>, userId: string, links = false) {
  const files: AccountFile[] = [];
  const walk = async (bucket: string, prefix: string) => {
    for (let offset = 0; ; offset += 100) {
      const { data, error } = await client.storage.from(bucket).list(prefix, {
        limit: 100, offset, sortBy: { column: "name", order: "asc" },
      });
      if (error) throw new Error("Could not enumerate saved files.");
      for (const item of data ?? []) {
        const path = `${prefix}/${item.name}`;
        if (!item.id) await walk(bucket, path);
        else files.push({ bucket, path });
      }
      if (!data || data.length < 100) break;
    }
  };
  for (const bucket of ["avatars", "testimony-media", "profile-media"]) await walk(bucket, userId);
  // need-media uses need-id/user-id/file. Enumerate every root so abandoned
  // uploads are included even if their database row has already disappeared.
  for (let offset = 0; ; offset += 100) {
    const { data, error } = await client.storage.from("need-media").list("", {
      limit: 100, offset, sortBy: { column: "name", order: "asc" },
    });
    if (error) throw new Error("Could not enumerate need files.");
    for (const root of data ?? []) {
      if (!root.id) await walk("need-media", `${root.name}/${userId}`);
    }
    if (!data || data.length < 100) break;
  }
  if (links) {
    for (const file of files) {
      const { data, error } = await client.storage.from(file.bucket).createSignedUrl(file.path, 3600);
      if (error || !data?.signedUrl) throw new Error("Could not create a download link.");
      file.download_url = data.signedUrl;
    }
  }
  return files;
}

export async function removeAccountFiles(client: SupabaseClient<Database>, userId: string) {
  const files = await listAccountFiles(client, userId);
  for (const bucket of [...new Set(files.map(file => file.bucket))]) {
    const paths = files.filter(file => file.bucket === bucket).map(file => file.path);
    for (let offset = 0; offset < paths.length; offset += 100) {
      const { error } = await client.storage.from(bucket).remove(paths.slice(offset, offset + 100));
      if (error) throw new Error("File cleanup failed; retry deletion.");
    }
  }
  // Never delete the auth user while files remain under an owned upload path.
  if ((await listAccountFiles(client, userId)).length) throw new Error("Files remain.");
}
