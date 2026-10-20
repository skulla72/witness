import type { OAuthProvider, SignInWithOAuthResult } from "@lovable.dev/cloud-auth-js";
import { requireAge } from "@/lib/launch-policy";
import { requireCommunityAcknowledgement } from "@/lib/community-acknowledgement";

type ManagedSignIn = (
  provider: OAuthProvider,
  options: { redirect_uri: string },
) => Promise<SignInWithOAuthResult>;

/** Use the existing broker contract, never a direct Supabase OAuth fallback. */
export async function managedSocialSignIn(options: {
  provider: "google" | "apple";
  native: boolean;
  redirectUri: string;
  signIn: ManagedSignIn;
  age?: unknown;
  communityAcknowledged?: unknown;
}) {
  // A provider's "sign in" may also create an account. Never gate only signup mode.
  if ("communityAcknowledged" in options) requireCommunityAcknowledgement(options.communityAcknowledged);
  else requireAge(options.age);
  if (options.native) {
    throw new Error("Managed Google/Apple sign-in has no documented handoff for this native app. Use email/password, or the Witness website in your browser.");
  }
  return options.signIn(options.provider, { redirect_uri: options.redirectUri });
}
