import { supabase } from "@/integrations/supabase/client";
import { BRAND } from "@/config/brand";

/** Historical identifier retained for existing records. Draft display edits are
 * not an approved legal revision; owner/legal must choose version/re-consent before publication. */
export const COVENANT_VERSION = "2026-09-18";

export const COVENANT_TITLE = `${BRAND.name} Community Terms — Unfinished Draft`;

export const COVENANT_INTRO =
  "People bring their hardest seasons here on video. Before you can see them, you agree to keep what you see inside these walls.";

export const COVENANT_TERMS: Array<{ heading: string; body: string }> = [
  {
    heading: "Nothing leaves this app",
    body:
      "You will not screenshot, screen-record, download, photograph, forward, publish or repeat any video, voice note, message, prayer, confession or name you encounter here — to anyone, anywhere, for any reason.",
  },
  {
    heading: "No sharing outside the room",
    body:
      "What is said in a group, a call, or a private message stays with the people who were there. Not with a spouse, a pastor, a group chat, or an anonymous post.",
  },
  {
    heading: "Respect member privacy",
    body:
      "Respect private member content and its chosen audience. This unfinished draft does not declare all app information confidential or claim final legal approval.",
  },
  {
    heading: "Intended public release",
    body:
      `This draft prepares ${BRAND.name} for public release. There is no beta-confidentiality requirement. Member stories and private communications remain subject to their chosen audience and privacy protections.`,
  },
  {
    heading: "Safety is the one exception",
    body:
      "If someone is in danger of harming themselves or another person, you may tell emergency services or a qualified professional. That is care, not a breach.",
  },
  {
    heading: "Serving and needs are at your own risk",
    body:
      `${BRAND.name} only introduces people. We do not employ, supervise, screen, insure, license or endorse any volunteer, contractor, homeowner, church or nonprofit, and we do not inspect job sites or guarantee any work. Volunteering, accepting help, entering property and using tools or equipment carry real risk of damage, injury and death. You take part at your own risk, carry your own insurance and licensing, and release ${BRAND.name} from any claim arising from serving, hours, badges, needs or any meeting or work that started here. Disputes are between the people involved.`,
  },
  {
    heading: "Breaking it ends your account",
    body:
      "If you share something from here, your access is removed and the person harmed may pursue any remedy the law allows.",
  },
];

export type CovenantScope = { scope: "app" } | { scope: "group"; ref: string };

function refOf(target: CovenantScope) {
  return target.scope === "group" ? target.ref : "app";
}

export async function hasAcceptedCovenant(
  userId: string,
  target: CovenantScope = { scope: "app" },
): Promise<boolean> {
  const { data } = await supabase
    .from("covenant_agreements")
    .select("id")
    .eq("user_id", userId)
    .eq("scope", target.scope)
    .eq("scope_ref", refOf(target))
    .eq("version", COVENANT_VERSION)
    .maybeSingle();
  return !!data;
}

export async function acceptCovenant(
  userId: string,
  signedName: string,
  target: CovenantScope = { scope: "app" },
): Promise<{ error?: string }> {
  const { error } = await supabase.from("covenant_agreements").insert({
    user_id: userId,
    scope: target.scope,
    scope_ref: refOf(target),
    version: COVENANT_VERSION,
    accepted_name: signedName.trim().slice(0, 80) || null,
  });
  if (error && !error.message.includes("duplicate")) return { error: error.message };
  return {};
}
