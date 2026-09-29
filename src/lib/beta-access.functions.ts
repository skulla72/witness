import { createHash, randomBytes } from "crypto";
import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

const tokenSchema = z.object({ token: z.string().trim().min(24).max(200) });

function tokenHash(token: string) {
  return createHash("sha256").update(token).digest("hex");
}

export const validateBetaInvitation = createServerFn({ method: "POST" })
  .inputValidator((data: unknown) => tokenSchema.parse(data))
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: invitation } = await supabaseAdmin
      .from("beta_invitations")
      .select("id,email,max_uses,use_count,expires_at,revoked_at")
      .eq("token_hash", tokenHash(data.token))
      .maybeSingle();
    const valid = Boolean(
      invitation &&
      !invitation.revoked_at &&
      invitation.use_count < invitation.max_uses &&
      new Date(invitation.expires_at).getTime() > Date.now(),
    );
    return { valid, email: valid ? invitation?.email ?? null : null };
  });

export const getMyBetaAccess = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data } = await context.supabase
      .from("beta_access")
      .select("status")
      .eq("user_id", context.userId)
      .maybeSingle();
    return { active: data?.status === "active", status: data?.status ?? "missing" };
  });

export const redeemBetaInvitation = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) => tokenSchema.parse(data))
  .handler(async ({ data, context }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: invitation } = await supabaseAdmin
      .from("beta_invitations")
      .select("*")
      .eq("token_hash", tokenHash(data.token))
      .maybeSingle();
    if (!invitation || invitation.revoked_at || invitation.use_count >= invitation.max_uses || new Date(invitation.expires_at).getTime() <= Date.now()) {
      return { ok: false as const, error: "This invitation is invalid or has expired." };
    }
    const memberEmail = String((context.claims as { email?: string }).email ?? "").toLowerCase();
    if (invitation.email && invitation.email.toLowerCase() !== memberEmail) {
      return { ok: false as const, error: "This invitation was sent to a different email address." };
    }
    const { error: accessError } = await supabaseAdmin.from("beta_access").upsert({
      user_id: context.userId,
      invited_by: invitation.invited_by,
      invitation_id: invitation.id,
      status: "active",
    });
    if (accessError) throw accessError;
    const { error: inviteError } = await supabaseAdmin.from("beta_invitations").update({
      use_count: invitation.use_count + 1,
      accepted_by: context.userId,
      accepted_at: new Date().toISOString(),
    }).eq("id", invitation.id).eq("use_count", invitation.use_count);
    if (inviteError) throw inviteError;
    return { ok: true as const };
  });

export const createBetaInvitation = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) => z.object({ email: z.string().trim().email().max(255).optional() }).parse(data))
  .handler(async ({ data, context }) => {
    const { data: access } = await context.supabase.from("beta_access").select("status").eq("user_id", context.userId).maybeSingle();
    if (access?.status !== "active") throw new Error("Active beta access is required.");
    const token = randomBytes(24).toString("base64url");
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();
    const { error } = await context.supabase.from("beta_invitations").insert({
      token_hash: tokenHash(token),
      email: data.email?.toLowerCase() || null,
      invited_by: context.userId,
      expires_at: expiresAt,
    });
    if (error) throw error;
    return { token, expiresAt };
  });