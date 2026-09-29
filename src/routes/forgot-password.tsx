import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { BRAND } from "@/config/brand";

export const Route = createFileRoute("/forgot-password")({
  staticData: { sitemap: false },
  component: ForgotPassword,
  head: () => ({
    meta: [
      { title: `Reset your password · ${BRAND.name}` },
      {
        name: "description",
        content: "Send yourself a link to set a new password and get back into your prayer journal.",
      },
      { property: "og:title", content: `Reset your password · ${BRAND.name}` },
      { property: "og:description", content: "Send yourself a link to set a new password." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
});

function ForgotPassword() {
  const [email, setEmail] = useState("");
  const [sent, setSent] = useState(false);
  const [loading, setLoading] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    const { error } = await supabase.auth.resetPasswordForEmail(email.trim(), {
      redirectTo: `${window.location.origin}/reset-password`,
    });
    setLoading(false);
    if (error) {
      toast.error(error.message);
      return;
    }
    setSent(true);
  };

  return (
    <div className="flex min-h-screen items-center justify-center px-5 py-10">
      <div className="w-full max-w-sm">
        <h1 className="text-center font-serif text-[26px] text-ink">Forgot your password</h1>
        <p className="mt-2 text-center text-[13px] text-ink-soft">
          We'll email you a link to set a new one. Nothing in your journal changes.
        </p>

        <div className="mt-6 rounded-2xl border border-border bg-card p-6 shadow-soft">
          {sent ? (
            <p className="text-[13.5px] leading-relaxed text-ink">
              Check <span className="text-brass">{email}</span>. The link works once and expires
              shortly — open it on this device if you can.
            </p>
          ) : (
            <form onSubmit={submit} className="space-y-3">
              <div className="space-y-1.5">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  required
                  maxLength={255}
                />
              </div>
              <Button type="submit" className="w-full" disabled={loading}>
                Send the link
              </Button>
            </form>
          )}
        </div>

        <p className="mt-6 text-center text-[12px] text-ink-soft">
          <Link to="/login" className="text-brass underline-offset-4 hover:underline">
            Back to sign in
          </Link>
        </p>
      </div>
    </div>
  );
}
