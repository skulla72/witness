import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { lovable } from "@/integrations/lovable";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { BRAND } from "@/config/brand";
import { validateBetaInvitation } from "@/lib/beta-access.functions";
import { COVENANT_VERSION } from "@/lib/covenant";


export const Route = createFileRoute("/login")({
  staticData: { sitemap: false },
  component: LoginPage,
  head: () => ({ meta: [
    { title: `Private Beta Sign In · ${BRAND.name}` },
    { name: "description", content: `Sign in to the private ${BRAND.name} beta.` },
    { property: "og:title", content: `Private Beta Sign In · ${BRAND.name}` },
    { property: "og:description", content: `Sign in to the private ${BRAND.name} beta.` },
    { property: "og:type", content: "website" },
    { name: "twitter:card", content: "summary" },
  ] }),
});

/** Youngest age allowed to hold an account. */
const MIN_AGE = 13;

/** Whole years between a birth date and today, or null if the date is unusable. */
function ageFrom(birthday: string): number | null {
  if (!birthday) return null;
  const born = new Date(`${birthday}T00:00:00`);
  if (Number.isNaN(born.getTime())) return null;
  const today = new Date();
  let years = today.getFullYear() - born.getFullYear();
  const beforeBirthday =
    today.getMonth() < born.getMonth() ||
    (today.getMonth() === born.getMonth() && today.getDate() < born.getDate());
  if (beforeBirthday) years -= 1;
  if (years < 0 || years > 120) return null;
  return years;
}

/** Only same-origin app paths are ever followed after sign-in. */
function safeNext(raw: string | null): string {
  if (!raw || !raw.startsWith("/") || raw.startsWith("//")) return "/";
  return raw;
}

function LoginPage() {
  const navigate = useNavigate();
  const [next, setNext] = useState("/");
  const [mode, setMode] = useState<"signin" | "signup">("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [invite, setInvite] = useState("");
  const [birthday, setBirthday] = useState("");
  const [accepted, setAccepted] = useState(false);
  const [loading, setLoading] = useState(false);


  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const incoming = params.get("invite") ?? "";
    if (incoming) {
      setInvite(incoming);
      window.localStorage.setItem("witness_beta_invite", incoming);
    }
    const destination = safeNext(params.get("next"));
    setNext(destination);
    if (destination !== "/" || params.get("mode") === "signup") setMode("signup");
    supabase.auth.getSession().then(({ data }) => {
      if (data.session) navigate({ to: destination });
    });
  }, [navigate]);


  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      if (mode === "signup") {
        const age = ageFrom(birthday);
        if (age === null) throw new Error("Please enter your date of birth.");
        if (age < MIN_AGE) throw new Error(`You must be at least ${MIN_AGE} to join ${BRAND.name}.`);
        if (!accepted) throw new Error("Please accept the terms and privacy notice to continue.");
        if (BRAND.inviteOnly) {
          const invitation = await validateBetaInvitation({ data: { token: invite } });
          if (!invitation.valid) throw new Error("A valid beta invitation is required.");
          window.localStorage.setItem("witness_beta_invite", invite);
        }
        const { error } = await supabase.auth.signUp({
          email,
          password,
          options: {
            emailRedirectTo: `${window.location.origin}${next}`,
            data: {
              full_name: name,
              date_of_birth: birthday,
              age_confirmed_at: new Date().toISOString(),
              terms_version: COVENANT_VERSION,
              terms_accepted_at: new Date().toISOString(),
            },
          },
        });

        if (error) throw error;
        toast.success("Check your email to confirm your account.");
      } else {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
        toast.success("Welcome back.");
        navigate({ to: next });
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Something went wrong.");
    } finally {
      setLoading(false);
    }
  };

  const handleOAuth = async (provider: "google" | "apple") => {
    if (mode === "signup") {
      const age = ageFrom(birthday);
      if (age === null) { toast.error("Please enter your date of birth first."); return; }
      if (age < MIN_AGE) { toast.error(`You must be at least ${MIN_AGE} to join ${BRAND.name}.`); return; }
      if (!accepted) { toast.error("Please accept the terms and privacy notice to continue."); return; }
    }

    setLoading(true);
    const result = await lovable.auth.signInWithOAuth(provider, {
      redirect_uri: next === "/" ? window.location.origin : `${window.location.origin}/login?next=${encodeURIComponent(next)}`,
    });
    if (result.error) {
      toast.error(provider === "apple" ? "Could not sign in with Apple." : "Could not sign in with Google.");
      setLoading(false);
      return;
    }
    if (result.redirected) return;
    navigate({ to: next });
  };

  return (
    <div className="min-h-screen bg-paper paper-grain flex items-center justify-center px-5 py-10 md:px-10">
      <div className="w-full max-w-sm md:max-w-md">
        <div className="text-center mb-8">
          <Link to="/" className="font-serif text-[28px] text-ink">
            {BRAND.name}<span className="text-brass">·</span>
          </Link>
          <p className="mt-2 text-[12px] uppercase tracking-[0.18em] text-ink-soft">
            {mode === "signin" ? "Welcome back" : "Begin your witness"}
          </p>
        </div>

        <div className="bg-card border border-border rounded-2xl shadow-soft p-6">
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
                <div className="space-y-1.5">
                  <Label htmlFor="birthday">Date of birth</Label>
                  <Input id="birthday" type="date" value={birthday} onChange={(e) => setBirthday(e.target.value)} required max={new Date().toISOString().slice(0, 10)} />
                  <p className="text-[11px] text-ink-soft">You must be {MIN_AGE} or older to join.</p>
                </div>
                <label className="flex items-start gap-2.5 text-[11px] leading-relaxed text-ink-soft">
                  <input
                    type="checkbox"
                    checked={accepted}
                    onChange={(e) => setAccepted(e.target.checked)}
                    className="mt-0.5 h-4 w-4 shrink-0 rounded border-border accent-ink"
                  />
                  <span>
                    I have read and accept the{" "}
                    <Link to="/terms" className="underline">Terms of Use &amp; Beta Agreement</Link>, the{" "}
                    <Link to="/privacy" className="underline">Privacy Notice</Link>, and — if I book a session — the{" "}
                    <Link to="/care-agreement" className="underline">Care Agreement</Link>.
                  </span>
                </label>
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
              {mode === "signin" ? "Sign in" : "Create account"}
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


        </div>

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
