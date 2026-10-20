import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { getRequest } from "@tanstack/react-start/server";
import { authorizeRoom } from "./action-eligibility";
import { requireExistingPrivilegedReader } from "./reader-capability.server";

export const admitCall = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: { conversationId: string; callId?: string; accountId: string }) => {
    if (!/^[0-9a-fA-F-]{36}$/.test(data.conversationId)) throw new Error("Invalid room.");
    if (data.callId && !/^[0-9a-fA-F-]{36}$/.test(data.callId)) throw new Error("Invalid call.");
    if (!/^[0-9a-fA-F-]{36}$/.test(data.accountId)) throw new Error("Invalid account.");
    return data;
  })
  .handler(async ({ data, context }): Promise<{ allowed: true; kind: "care" | "peer" } | { error: string }> => {
    try {
      if (data.accountId !== context.userId) throw new Error("Account changed. Retry call admission for the current account.");
      const { data: identity, error } = await context.supabase.auth.getUser(getRequest()?.headers.get("authorization")?.slice(7));
      if (error || !identity.user || identity.user.id !== context.userId) throw new Error("Sign in again to establish your identity.");
      if (data.callId) {
        const { data: call, error } = await context.supabase.from("calls").select("conversation_id")
          .eq("id", data.callId).maybeSingle();
        if (error || call?.conversation_id !== data.conversationId) throw new Error("This call does not belong to the admitted room.");
      }
      return await authorizeRoom(identity.user, data.conversationId, async () => {
        const { data: membership, error } = await context.supabase.from("conversation_members")
          .select("user_id").eq("conversation_id", data.conversationId).eq("user_id", context.userId).maybeSingle();
        if (error) throw new Error("Room membership could not be checked.");
        return !!membership;
      }, async () => {
        // Existing server reader only. No new shared permission or RLS-empty fallback.
        requireExistingPrivilegedReader();
        const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
        const { data: sessions, error } = await supabaseAdmin.from("therapy_sessions")
          .select("client_id,therapist_id").eq("conversation_id", data.conversationId);
        if (error || !sessions) throw new Error("Classification unavailable.");
        return sessions;
      });
    } catch (error) {
      return { error: error instanceof Error ? error.message : "Call admission failed. Please retry." };
    }
  });
