import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { BRAND } from "@/config/brand";

export const Route = createFileRoute("/reset-password")({
  staticData: { sitemap: false },
  component: ResetPassword,
  head: () => ({
    meta: [
      { title: `Set a new password · ${BRAND.name}` },
      { name: "description", content: "Choose a new password for your account." },
      { property: "og:title", content: `Set a new password · ${BRAND.name}` },
      { property: "og:description", content: "Choose a new password for your account." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
});

function ResetPassword() {
  const navigate = useNavigate();
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [loading, setLoading] = useState(false);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    // The recovery link signs the person in with a temporary session.
    supabase.auth.getSession().then(({ data }) => setReady(!!data.session));
    const { data: sub } = supabase.auth.onAuthStateChange((_e, session) => {
      if (session) setReady(true);
    });
    return () => sub.subscription.unsubscribe();
  }, []);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (password !== confirm) {
      toast.error("Those two passwords don't match.");
      return;
    }
    setLoading(true);
    const { error } = await supabase.auth.updateUser({ password });
    setLoading(false);
    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success("Your password is set.");
    navigate({ to: "/" });
  };

  return (
    <div className="flex min-h-screen items-center justify-center px-5 py-10">
      <div className="w-full max-w-sm">
        <h1 className="text-center font-serif text-[26px] text-ink">Set a new password</h1>

        <div className="mt-6 rounded-2xl border border-border bg-card p-6 shadow-soft">
          {!ready ? (
            <p className="text-[13.5px] leading-relaxed text-ink-soft">
              Open this page from the link in your email. If you got here another way, ask for a new
              link from the sign-in page.
            </p>
          ) : (
            <form onSubmit={submit} className="space-y-3">
              <div className="space-y-1.5">
                <Label htmlFor="password">New password</Label>
                <Input
                  id="password"
                  type="password"
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  required
                  minLength={8}
                  maxLength={72}
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="confirm">Type it again</Label>
                <Input
                  id="confirm"
                  type="password"
                  value={confirm}
                  onChange={e => setConfirm(e.target.value)}
                  required
                  minLength={8}
                  maxLength={72}
                />
              </div>
              <Button type="submit" className="w-full" disabled={loading}>
                Save password
              </Button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
