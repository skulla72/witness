import { createFileRoute, Link, useLocation, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { lovable } from "@/integrations/lovable";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { BRAND } from "@/config/brand";
import { validateBetaInvitation } from "@/lib/beta-access.functions";
import { COMMUNITY_ACKNOWLEDGEMENT_VERSION, requireCommunityAcknowledgement, withCommunityAttempt } from "@/lib/community-acknowledgement";
import { Capacitor } from "@capacitor/core";
import { NATIVE_EMAIL_CALLBACK, safeAuthNext } from "@/lib/auth-links";
import { managedSocialSignIn } from "@/lib/managed-social-auth";
import { EntryBrand } from "@/components/EntryBrand";
import { CommunityAcknowledgement } from "@/components/CommunityAcknowledgement";
import { finishInitialCallbackObservation, initialCallbackPresence, observeOAuthRestoration, type RestorationState } from "@/lib/oauth-restoration";


export const Route = createFileRoute("/login")({
  staticData: { sitemap: false },
  component: LoginPage,
  head: () => ({ meta: [
    { title: `Sign In · ${BRAND.name}` },
    { name: "description", content: `Sign in to ${BRAND.name}.` },
    { property: "og:title", content: `Sign In · ${BRAND.name}` },
    { property: "og:description", content: `Sign in to ${BRAND.name}.` },
    { property: "og:type", content: "website" },
    { name: "twitter:card", content: "summary" },
  ] }),
});

/** Only same-origin app paths are ever followed after sign-in. */
function safeNext(raw: string | null): string {
  return safeAuthNext(raw);
}

function LoginPage() {
  const navigate = useNavigate();
  const entrySearch = useLocation({ select: location => location.searchStr });
  const [next, setNext] = useState("/");
  const [mode, setMode] = useState<"signin" | "signup">(
    () => new URLSearchParams(entrySearch).get("mode") === "signup" ? "signup" : "signin",
  );
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [invite, setInvite] = useState("");
  const [accepted, setAccepted] = useState(false);
  const [loading, setLoading] = useState(false);
  const [native, setNative] = useState(false);
  const [restoration, setRestoration] = useState<RestorationState>({ status: "normal" });


  useEffect(() => {
    setNative(Capacitor.isNativePlatform());
    const params = new URLSearchParams(window.location.search);
    const incoming = params.get("invite") ?? "";
    if (incoming) {
      setInvite(incoming);
      window.localStorage.setItem("witness_beta_invite", incoming);
    }
    const destination = safeNext(params.get("next"));
    setNext(destination);
    if (params.get("mode") === "signup") setMode("signup");
    const fields = initialCallbackPresence();
    return observeOAuthRestoration(supabase.auth, fields, setRestoration, async () => {
      await navigate({ to: destination });
      finishInitialCallbackObservation();
    });
  }, [navigate]);


  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      if (mode === "signup") {
        requireCommunityAcknowledgement(accepted);
        if (BRAND.inviteOnly) {
          const invitation = await validateBetaInvitation({ data: { token: invite } });
          if (!invitation.valid) throw new Error("A valid beta invitation is required.");
          window.localStorage.setItem("witness_beta_invite", invite);
        }
        const { error } = await withCommunityAttempt(accepted, () => setAccepted(false), () => supabase.auth.signUp({
          email,
          password,
          options: {
            emailRedirectTo: Capacitor.isNativePlatform() ? NATIVE_EMAIL_CALLBACK : `${window.location.origin}/login?next=${encodeURIComponent(next)}`,
            data: {
              full_name: name,
              minimum_age_confirmed: true,
              age_confirmed_at: new Date().toISOString(),
              terms_version: COMMUNITY_ACKNOWLEDGEMENT_VERSION,
              terms_accepted_at: new Date().toISOString(),
            },
          },
        }));

        if (error) throw error;
        toast.success("Check your email to confirm your account.");
      } else {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
        toast.success("Welcome back.");
        navigate({ to: next });
      }
    } catch (err) {
      setAccepted(false);
      toast.error(err instanceof Error ? err.message : "Something went wrong.");
    } finally {
      setLoading(false);
    }
  };

  const handleOAuth = async (provider: "google" | "apple") => {
    try { requireCommunityAcknowledgement(accepted); } catch (error) {
      setAccepted(false);
      toast.error(error instanceof Error ? error.message : "Confirm the acknowledgement."); return;
    }
    if (mode === "signup") {
      if (!accepted) { toast.error("Please accept the terms and privacy notice to continue."); return; }
    }

    const attemptedAcknowledgement = accepted;
    // Never leave a failed/cancelled attempt available to confirm another identity.
    // Post-auth confirmation is a separate account-bound step, not this draft.
    setAccepted(false);
    setLoading(true);
    try {
      const redirectTo = new URL("/login", window.location.origin);
      if (mode === "signup" && BRAND.inviteOnly) {
        const invitation = await validateBetaInvitation({ data: { token: invite } });
        if (!invitation.valid) throw new Error("A valid beta invitation is required.");
        window.localStorage.setItem("witness_beta_invite", invite);
      }
      if (next !== "/") redirectTo.searchParams.set("next", next);
      const result = await withCommunityAttempt(attemptedAcknowledgement, () => setAccepted(false), () => managedSocialSignIn({
        provider,
        native: Capacitor.isNativePlatform(),
        redirectUri: redirectTo.toString(),
        signIn: lovable.auth.signInWithOAuth,
        communityAcknowledged: attemptedAcknowledgement,
      }));
      if (result.error) throw result.error;
      if (!result.redirected) void navigate({ to: safeAuthNext(next) });
    } catch (error) {
      toast.error(error instanceof Error ? error.message : `Could not sign in with ${provider === "apple" ? "Apple" : "Google"}.`);
    } finally {
      setAccepted(false);
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-paper paper-grain flex items-center justify-center px-5 py-10 md:px-10">
      <div className="w-full max-w-sm md:max-w-md">
        <div className="text-center mb-8">
          <EntryBrand />
          <p className="mt-2 text-[12px] uppercase tracking-[0.18em] text-ink-soft">
            {mode === "signin" ? "Welcome back" : "Begin your witness"}
          </p>
        </div>

        {restoration.status !== "normal" ? (
          <section className="bg-card border border-border rounded-2xl shadow-soft p-6" aria-label="Sign-in restoration">
            {restoration.status === "failed" ? <>
              <h1 className="text-lg font-semibold">Sign-in could not be completed</h1>
              <p role="alert" className="mt-3 text-sm">Witness could not restore your signed-in session. Please start sign-in again. This does not tell us whether the provider step succeeded.</p>
              <Button className="mt-4 w-full" onClick={() => {
                const retry = new URL("/login", window.location.origin);
                if (next !== "/") retry.searchParams.set("next", safeNext(next));
                window.location.replace(retry.toString());
              }}>Return to sign-in and retry</Button>
              <p className="mt-4 text-xs text-muted-foreground">If this happens again, copy this safe reference for support. It contains no credentials or account details.</p>
              <textarea aria-label="Safe sign-in support reference" readOnly
                className="mt-2 w-full rounded border bg-background p-2 text-xs" rows={8}
                value={JSON.stringify(restoration.reference, null, 2)} />
              <Link to="/crisis" className="mt-3 block text-sm underline">Crisis help</Link>
            </> : <p role="status" aria-live="polite">
              {restoration.status === "restoring" ? "Restoring your signed-in session. Please wait…" : "Session restored. Continuing…"}
            </p>}
          </section>
        ) : <div className="bg-card border border-border rounded-2xl shadow-soft p-6">
          <p className="mb-4 text-xs text-muted-foreground">
            {native
              ? "Google and Apple sign-in do not yet have a supported handoff into this native app. Use email/password here, or sign in to the website in your browser (a separate session)."
              : "Google and Apple sign-in opens Witness’s hosted sign-in service and returns here."}
            {" "}
            <a className="underline" href="https://witnessmovement.com/login" target="_blank" rel="noopener noreferrer">
              Open Witness website
            </a>
          </p>
          <div className="mb-4 space-y-2">
            <CommunityAcknowledgement id="entry-community-ack" checked={accepted} onChange={setAccepted} disabled={loading} />
            <p className="text-[11px] text-ink-soft">Required for signup and Google/Apple. Existing email/password sign-in remains available. After sign-in, confirmation is separately bound to the displayed account.</p>
          </div>
          <div className="space-y-2.5">
            <Button
              type="button"
              variant="outline"
              className="w-full"
              onClick={() => handleOAuth("apple")}
              disabled={loading}
            >
              <AppleIcon />
              Continue with Apple
            </Button>
            <Button
              type="button"
              variant="outline"
              className="w-full"
              onClick={() => handleOAuth("google")}
              disabled={loading}
            >
              <GoogleIcon />
              Continue with Google
            </Button>
          </div>

          <div className="my-5 flex items-center gap-3 text-[11px] uppercase tracking-[0.18em] text-ink-soft">
            <div className="h-px flex-1 bg-border" />
            or
            <div className="h-px flex-1 bg-border" />
          </div>

          <form onSubmit={handleSubmit} className="space-y-3">
            {mode === "signup" && (
              <>
                {BRAND.inviteOnly && (
                  <div className="space-y-1.5">
                    <Label htmlFor="invite">Invitation code</Label>
                    <Input id="invite" value={invite} onChange={(e) => setInvite(e.target.value)} required minLength={24} maxLength={200} />
                  </div>
                )}
                <div className="space-y-1.5">
                  <Label htmlFor="name">Name</Label>
                  <Input id="name" value={name} onChange={(e) => setName(e.target.value)} required maxLength={80} />
                </div>
              </>
            )}

            <div className="space-y-1.5">
              <Label htmlFor="email">Email</Label>
              <Input id="email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} required maxLength={255} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="password">Password</Label>
              <Input id="password" type="password" value={password} onChange={(e) => setPassword(e.target.value)} required minLength={6} maxLength={72} />
            </div>
            <Button type="submit" className="w-full" disabled={loading}>
              {mode === "signin" ? "Sign in" : "Continue"}
            </Button>
          </form>

          {mode === "signup" && (
            <p className="mt-3 text-center text-[11.5px] leading-relaxed text-ink-soft">
              After you create one account, choose Personal, Organization, Professional, or Counselor.
            </p>
          )}

          <p className="mt-4 text-center text-[12px]">
            <Link to="/forgot-password" className="text-ink-soft underline-offset-4 hover:underline">
              Forgot your password?
            </Link>
          </p>

          <p className="mt-3 text-center text-[12px] text-ink-soft">
            {mode === "signin" ? "New here?" : "Already have an account?"}{" "}
            <button
              type="button"
              onClick={() => setMode(mode === "signin" ? "signup" : "signin")}
              className="text-brass underline-offset-4 hover:underline"
            >
              {mode === "signin" ? "Create an account" : "Sign in"}
            </button>
          </p>

          <p className="mt-5 text-center text-[11px] leading-relaxed text-ink-soft">
            Read the <Link to="/terms" className="underline">Terms of Use</Link>, the{" "}
            <Link to="/privacy" className="underline">Privacy Notice</Link> and the{" "}
            <Link to="/care-agreement" className="underline">Care Agreement</Link> for therapy sessions.
          </p>


        </div>}

        <p className="mt-6 text-center text-[11px] text-ink-soft italic">{BRAND.tagline}</p>
      </div>
    </div>
  );
}

function GoogleIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-4 w-4" aria-hidden>
      <path fill="#EA4335" d="M12 10.2v3.9h5.5c-.24 1.4-1.66 4.1-5.5 4.1-3.31 0-6-2.74-6-6.1S8.69 6 12 6c1.88 0 3.14.8 3.86 1.48l2.63-2.54C16.83 3.43 14.65 2.5 12 2.5 6.76 2.5 2.5 6.76 2.5 12s4.26 9.5 9.5 9.5c5.49 0 9.13-3.86 9.13-9.28 0-.62-.07-1.1-.16-1.52H12z"/>
    </svg>
  );
}
function AppleIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-4 w-4 fill-current" aria-hidden>
      <path d="M16.36 12.73c.02 2.6 2.28 3.46 2.31 3.47-.02.06-.36 1.24-1.2 2.45-.72 1.05-1.47 2.1-2.66 2.12-1.16.02-1.54-.69-2.87-.69-1.33 0-1.75.67-2.85.71-1.14.04-2.01-1.13-2.74-2.18-1.58-2.28-2.79-6.45-1.16-9.27.81-1.4 2.25-2.29 3.82-2.31 1.12-.02 2.17.75 2.86.75.68 0 1.97-.93 3.32-.79.56.02 2.14.2 3.16 1.53-.08.05-1.88 1.1-1.86 3.3zM14.2 4.6c.6-.73 1.01-1.75.9-2.77-.87.04-1.93.58-2.56 1.31-.56.64-1.05 1.68-.92 2.67.98.08 1.97-.49 2.58-1.21z" />
    </svg>
  );
}
