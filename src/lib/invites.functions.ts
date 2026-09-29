import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

/**
 * When somebody adds a church, ministry or nonprofit to their circle and that
 * organization hasn't claimed its page yet, we offer it to them. Email goes on
 * its own; a phone-only organization becomes a call for the team, because a
 * real person should make that call.
 *
 * Nothing goes out until the team turns the switch on (team tools → Inviting
 * organizations), so the beta stays quiet.
 */

const SITE = "https://witnessmovement.com";
const UUID = /^[0-9a-fA-F-]{36}$/;
const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

export type InviteOutcome =
  | "off"
  | "sent"
  | "needs_call"
  | "already_reached"
  | "already_claimed"
  | "no_contact"
  | "failed";

export const inviteOrgToClaim = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: { orgId: string }) => {
    if (!UUID.test(data.orgId)) throw new Error("Invalid organization");
    return data;
  })
  .handler(async ({ data, context }): Promise<{ outcome: InviteOutcome }> => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const { data: setting } = await supabaseAdmin
      .from("platform_settings")
      .select("enabled")
      .eq("key", "claim_invites")
      .maybeSingle();
    if (!setting?.enabled) return { outcome: "off" };

    const { data: org } = await supabaseAdmin
      .from("organizations")
      .select("id, name, slug, owner_id, claimed_at, contact_email, contact_phone")
      .eq("id", data.orgId)
      .maybeSingle();
    if (!org) return { outcome: "failed" };
    // An organization already looking after its own page needs no invitation.
    if (org.owner_id || org.claimed_at) return { outcome: "already_claimed" };

    const { data: already } = await supabaseAdmin
      .from("org_claim_invites")
      .select("id")
      .eq("org_id", org.id)
      .limit(1);
    if (already && already.length > 0) return { outcome: "already_reached" };

    const email = (org.contact_email ?? "").trim();
    const phone = (org.contact_phone ?? "").trim();

    if (EMAIL.test(email)) {
      try {
        const { sendTemplateEmail } = await import("@/lib/email-templates/send-email");
        const result = await sendTemplateEmail("org-claim-invite", email, {
          idempotencyKey: `org-claim-invite-${org.id}`,
          templateData: {
            orgName: org.name,
            claimUrl: `${SITE}/community/claim/${org.slug}`,
            pageUrl: `${SITE}/community/${org.slug}`,
          },
        });
        await supabaseAdmin.from("org_claim_invites").insert({
          org_id: org.id,
          channel: "email",
          sent_to: email,
          status: result.sent ? "sent" : "skipped",
          prompted_by: context.userId,
          note: result.sent ? "" : "That address has asked not to receive email.",
        });
        return { outcome: result.sent ? "sent" : "no_contact" };
      } catch (error) {
        console.error("Claim invitation email failed:", error);
        await supabaseAdmin.from("org_claim_invites").insert({
          org_id: org.id,
          channel: "email",
          sent_to: email,
          status: "failed",
          prompted_by: context.userId,
          note: "The letter didn't go out. Worth a call.",
        });
        return { outcome: "failed" };
      }
    }

    if (phone.length >= 7) {
      await supabaseAdmin.from("org_claim_invites").insert({
        org_id: org.id,
        channel: "phone",
        sent_to: phone,
        status: "needs_call",
        prompted_by: context.userId,
      });
      return { outcome: "needs_call" };
    }

    return { outcome: "no_contact" };
  });

/* ---------- Team tools ---------- */

export interface CallRow {
  id: string;
  orgName: string;
  orgSlug: string;
  phone: string;
  status: string;
  note: string;
  createdAt: string;
}

async function assertTeam(supabase: any, userId: string) {
  const { data: isAdmin } = await supabase.rpc("has_role", {
    _user_id: userId,
    _role: "admin",
  });
  if (!isAdmin) throw new Error("This is for the team.");
}

export const invitesOverview = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }): Promise<{ enabled: boolean; calls: CallRow[]; sentCount: number }> => {
    await assertTeam(context.supabase, context.userId);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const [setting, rows] = await Promise.all([
      supabaseAdmin.from("platform_settings").select("enabled").eq("key", "claim_invites").maybeSingle(),
      supabaseAdmin
        .from("org_claim_invites")
        .select("id, channel, sent_to, status, note, created_at, organizations(name, slug)")
        .order("created_at", { ascending: false })
        .limit(200),
    ]);

    const all = (rows.data ?? []) as any[];
    const calls: CallRow[] = all
      .filter(r => r.channel === "phone" || r.status === "failed")
      .map(r => ({
        id: r.id,
        orgName: r.organizations?.name ?? "Unknown",
        orgSlug: r.organizations?.slug ?? "",
        phone: r.sent_to,
        status: r.status,
        note: r.note ?? "",
        createdAt: r.created_at,
      }));

    return {
      enabled: setting.data?.enabled === true,
      calls,
      sentCount: all.filter(r => r.status === "sent").length,
    };
  });

export const setClaimInvites = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: { enabled: boolean }) => data)
  .handler(async ({ data, context }): Promise<{ ok: true }> => {
    await assertTeam(context.supabase, context.userId);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    await supabaseAdmin
      .from("platform_settings")
      .upsert(
        { key: "claim_invites", enabled: data.enabled, updated_by: context.userId },
        { onConflict: "key" },
      );
    return { ok: true };
  });

export const markInviteHandled = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: { inviteId: string; status: "called" | "skipped" }) => {
    if (!UUID.test(data.inviteId)) throw new Error("Invalid record");
    if (data.status !== "called" && data.status !== "skipped") throw new Error("Invalid status");
    return data;
  })
  .handler(async ({ data, context }): Promise<{ ok: true }> => {
    await assertTeam(context.supabase, context.userId);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    await supabaseAdmin
      .from("org_claim_invites")
      .update({
        status: data.status,
        handled_by: context.userId,
        handled_at: new Date().toISOString(),
      })
      .eq("id", data.inviteId);
    return { ok: true };
  });
