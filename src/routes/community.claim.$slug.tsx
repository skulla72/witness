import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { ArrowLeft, Loader2 } from "lucide-react";
import { BRAND } from "@/config/brand";
import { supabase } from "@/integrations/supabase/client";
import { useSession } from "@/hooks/useSession";
import { ORG_PUBLIC_COLUMNS, type Org } from "@/lib/community";
import { CLAIM_STATUS, askToClaim, myClaim } from "@/lib/orgs";

export const Route = createFileRoute("/community/claim/$slug")({
  staticData: { sitemap: false },
  component: ClaimOrg,
  head: () => ({
    meta: [
      { title: `Claim your organization's page · ${BRAND.name}` },
      {
        name: "description",
        content:
          "If you lead this church, ministry or nonprofit, ask for its page. Once we confirm who you are, it's yours to run.",
      },
      { property: "og:title", content: `Claim your organization's page · ${BRAND.name}` },
      { property: "og:description", content: "Take responsibility for your organization's page." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
});

function ClaimOrg() {
  const { slug } = Route.useParams();
  const { userId, signedIn, email } = useSession();
  const qc = useQueryClient();

  const org = useQuery({
    queryKey: ["org", slug],
    queryFn: async (): Promise<Org | null> => {
      const { data } = await supabase
        .from("organizations")
        .select(ORG_PUBLIC_COLUMNS)
        .eq("slug", slug)
        .maybeSingle();
      return (data as Org) ?? null;
    },
  });

  const claim = useQuery({
    queryKey: ["org", "claim", org.data?.id, userId],
    queryFn: () => myClaim(org.data!.id, userId!),
    enabled: !!org.data && !!userId,
  });

  const [role, setRole] = useState("");
  const [workEmail, setWorkEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [note, setNote] = useState("");

  const ask = useMutation({
    mutationFn: () =>
      askToClaim(org.data!.id, userId!, {
        role_title: role.trim(),
        work_email: workEmail.trim() || (email ?? ""),
        phone: phone.trim(),
        note: note.trim(),
      }),
    onSuccess: () => {
      toast.success("Sent. We'll confirm and hand the page over.");
      void qc.invalidateQueries({ queryKey: ["org", "claim"] });
    },
    onError: () => toast.error("We couldn't send that. Try once more."),
  });

  if (org.isLoading) {
    return (
      <div className="flex justify-center py-16">
        <Loader2 className="h-4 w-4 animate-spin text-ink-soft" />
      </div>
    );
  }
  if (!org.data) {
    return <p className="px-5 pt-8 text-[13px] text-ink-soft">We couldn't find that page.</p>;
  }

  return (
    <div className="px-5 pt-5 pb-14">
      <Link
        to="/community/$slug"
        params={{ slug }}
        className="inline-flex items-center gap-1.5 text-[12px] text-ink-soft"
      >
        <ArrowLeft className="h-3.5 w-3.5" /> {org.data.name}
      </Link>

      <header className="mt-4 mb-6">
        <p className="text-[11px] uppercase tracking-[0.22em] text-brass">Is this yours?</p>
        <h1 className="mt-2 font-serif text-[28px] leading-tight text-ink">
          Claim {org.data.name}
        </h1>
        <p className="mt-2 text-[13px] leading-relaxed text-ink-soft">
          Tell us who you are there. A person on our team confirms it, then the page is yours — photo,
          links, service times, announcements and prayer groups.
        </p>
      </header>

      {signedIn === false && (
        <div className="mb-6 rounded-2xl border border-brass/30 bg-brass/10 p-4">
          <p className="font-serif text-[15.5px] text-ink">Sign in first</p>
          <Link
            to="/login"
            className="mt-3 inline-flex rounded-full bg-primary px-4 py-2 text-[12.5px] text-primary-foreground"
          >
            Sign in
          </Link>
        </div>
      )}

      {claim.data ? (
        <div className="rounded-2xl border border-border bg-card p-4 shadow-soft">
          <p className="font-serif text-[16px] text-ink">{CLAIM_STATUS[claim.data.status]}</p>
          {claim.data.review_note && (
            <p className="mt-1.5 text-[12.5px] leading-relaxed text-ink-soft">
              {claim.data.review_note}
            </p>
          )}
          {claim.data.status === "approved" && (
            <Link
              to="/community/manage/$slug"
              params={{ slug }}
              className="mt-3 inline-flex rounded-full bg-primary px-4 py-2 text-[12.5px] text-primary-foreground"
            >
              Run the page
            </Link>
          )}
        </div>
      ) : (
        <form
          onSubmit={e => {
            e.preventDefault();
            if (userId) ask.mutate();
          }}
          className="space-y-5"
        >
          <Field label="Your role there">
            <input
              required
              value={role}
              onChange={e => setRole(e.target.value)}
              placeholder="Lead pastor, executive director…"
              className={input}
            />
          </Field>
          <Field label="Email at the organization">
            <input
              value={workEmail}
              onChange={e => setWorkEmail(e.target.value)}
              placeholder={email ?? "you@yourchurch.org"}
              className={input}
            />
          </Field>
          <Field label="Phone we can reach you at">
            <input value={phone} onChange={e => setPhone(e.target.value)} placeholder="(615) 555-0134" className={input} />
          </Field>
          <Field label="Anything that helps us confirm it">
            <textarea
              value={note}
              onChange={e => setNote(e.target.value)}
              rows={3}
              placeholder="Where your name appears on the website, who else can vouch for you."
              className={input}
            />
          </Field>

          <button
            type="submit"
            disabled={ask.isPending || !role.trim() || signedIn !== true}
            className="tap-scale inline-flex w-full items-center justify-center gap-2 rounded-full bg-primary px-5 py-3 text-[14px] text-primary-foreground disabled:opacity-50"
          >
            {ask.isPending && <Loader2 className="h-4 w-4 animate-spin" />}
            Ask for this page
          </button>
        </form>
      )}
    </div>
  );
}

const input =
  "w-full rounded-xl border border-border bg-card px-3 py-2.5 text-[13.5px] leading-relaxed text-ink outline-none placeholder:text-ink-soft";

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="mb-1.5 block px-1 text-[11px] uppercase tracking-[0.18em] text-ink-soft">
        {label}
      </span>
      {children}
    </label>
  );
}
