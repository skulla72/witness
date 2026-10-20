import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import {
  ACCOUNT_COLLECTIONS, ACCOUNT_RELATIONS, readAllAccountRows, type ExportRow,
} from "@/lib/account-data";
import { listAccountFiles, removeAccountFiles } from "@/lib/account-storage.server";
import { finishAccountDeletion } from "@/lib/account-deletion.server";

export const exportMyData = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase, userId, claims } = context;
    const collections: Record<string, ExportRow[]> = {};
    const unavailable: string[] = [];
    for (const [table, columns] of Object.entries(ACCOUNT_COLLECTIONS)) {
      try {
        collections[table] = await readAllAccountRows(supabase,
          table as keyof typeof ACCOUNT_COLLECTIONS,
          columns.map(column => `${column}.eq.${userId}`).join(","));
      } catch { unavailable.push(table); }
    }
    for (const relation of ACCOUNT_RELATIONS) {
      const ids = [...new Set((collections[relation.parent] ?? [])
        .map(row => row[relation.parentColumn ?? "id"]).filter((id): id is string => typeof id === "string"))];
      try {
        const extra: ExportRow[] = [];
        for (let offset = 0; offset < ids.length; offset += 50) {
          extra.push(...await readAllAccountRows(supabase, relation.table,
            `${relation.column}.in.(${ids.slice(offset, offset + 50).join(",")})`));
        }
        const combined = [...(collections[relation.table] ?? []), ...extra];
        collections[relation.table] = [...new Map(combined.map(row => [JSON.stringify(row), row])).values()];
      } catch { unavailable.push(relation.table); }
    }
    let files: Awaited<ReturnType<typeof listAccountFiles>> = [];
    try { files = await listAccountFiles(supabase, userId, true); }
    catch { unavailable.push("saved_files"); }
    const bundle = {
      format_version: 2, exported_at: new Date().toISOString(),
      complete: unavailable.length === 0, unavailable_collections: [...new Set(unavailable)],
      account: { id: userId, email: (claims as { email?: string }).email ?? null },
      collections, saved_files: files,
      file_note: "Links expire after one hour. Download these files separately to keep the originals.",
    };
    return { json: JSON.stringify(bundle), complete: bundle.complete, unavailable_collections: bundle.unavailable_collections };
  });

export const deleteMyAccount = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }): Promise<{ ok: true } | { error: string }> => {
    try {
      const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
      // Preflight before removing ANY file. This requires the transactional
      // migration and refuses active billing/shared-resource ownership.
      await finishAccountDeletion(supabaseAdmin, context.userId, true);
      await removeAccountFiles(supabaseAdmin, context.userId);
      await finishAccountDeletion(supabaseAdmin, context.userId, false);
      return { ok: true };
    } catch {
      // SQL changes are atomic; file removal is idempotent on retry. Never
      // promise rollback of already removed files after a storage failure.
      return { error: "Deletion did not finish. Your account has not been marked successfully deleted. Some files may already have been removed; retry to finish, or contact support. Active gifts/plans or shared organization ownership must be resolved first." };
    }
  });
