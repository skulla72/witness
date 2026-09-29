import { OrgCounselorManager } from "@/components/counselors/OrgCounselors";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { ArrowLeft, Loader2, Megaphone, Trash2 } from "lucide-react";
import { BRAND } from "@/config/brand";
import { supabase } from "@/integrations/supabase/client";
import { useSession } from "@/hooks/useSession";
import { ORG_PUBLIC_COLUMNS, type Org } from "@/lib/community";
import { PLANS, planPrice } from "@/data/plans";
import {
  ANNOUNCEMENT_KINDS,
  announcements,
  carries,
  kindLabel,
  orgPlans,
  payoutAccount,
  postAnnouncement,
  removeAnnouncement,
  savePayout,
} from "@/lib/orgs";
import { cancelPlan } from "@/lib/orgplan.functions";
import { getStripeEnvironment } from "@/lib/stripe";
import { PlanCheckout } from "@/components/orgs/PlanCheckout";

export const Route = createFileRoute("/community/manage/$slug")({
  staticData: { sitemap: false },
  component: ManageOrg,
  head: () => ({
    meta: [
      { title: `Run your organization's page · ${BRAND.name}` },
      {
        name: "description",
        content:
          "Post announcements, tell us where gifts should land, and choose the monthly plan your page carries.",
      },
      { property: "og:title", content: `Run your organization's page · ${BRAND.name}` },
      { property: "og:description", content: "Announcements, giving details and your monthly plan." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
});

function ManageOrg() {
  const { slug } = Route.useParams();
  const { userId, signedIn, email } = useSession();
  const qc = useQueryClient();
  const [buying, setBuying] = useState<string | null>(null);

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
  const orgId = org.data?.id;

  const role = useQuery({
    queryKey: ["org", "role", orgId, userId],
    queryFn: async () => {
      const { data } = await supabase
        .from("organization_members")
        .select("role")
        .eq("org_id", orgId!)
        .eq("user_id", userId!)
        .maybeSingle();
      return data?.role ?? null;
    },
    enabled: !!orgId && !!userId,
  });
  const isLeader = role.data === "owner" || role.data === "leader";

  const posts = useQuery({
    queryKey: ["org", "announcements", orgId],
    queryFn: () => announcements(orgId!),
    enabled: !!orgId,
  });
  const payout = useQuery({
    queryKey: ["org", "payout", orgId],
    queryFn: () => payoutAccount(orgId!),
    enabled: !!orgId && isLeader,
  });
  const plans = useQuery({
    queryKey: ["org", "plans", orgId],
    queryFn: () => orgPlans(orgId!),
    enabled: !!orgId && isLeader,
  });

  const active = (plans.data ?? [])
    .filter(p => p.status === "active" || p.status === "past_due")
    .map(p => ({ plan: p.plan, status: p.status }));

  /* announcement form */
  const [kind, setKind] = useState<string>("news");
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [startsAt, setStartsAt] = useState("");

  const post = useMutation({
    mutationFn: () =>
      postAnnouncement(orgId!, userId!, {
        kind,
        title: title.trim(),
        body: body.trim(),
        starts_at: kind === "event" && startsAt ? new Date(startsAt).toISOString() : null,
        link_url: null,
      }),
    onSuccess: () => {
      toast.success("Posted.");
      setTitle("");
      setBody("");
      setStartsAt("");
      void qc.invalidateQueries({ queryKey: ["org", "announcements"] });
    },
    onError: () => toast.error("That didn't post."),
  });

  const drop = useMutation({
    mutationFn: (id: string) => removeAnnouncement(id),
    onSuccess: () => void qc.invalidateQueries({ queryKey: ["org", "announcements"] }),
    onError: () => toast.error("We couldn't remove that."),
  });

  /* where gifts land */
  const [bank, setBank] = useState<string | null>(null);
  const [holder, setHolder] = useState<string | null>(null);
  const [contact, setContact] = useState<string | null>(null);

  const saveBank = useMutation({
    mutationFn: () =>
      savePayout(orgId!, {
        bank_name: (bank ?? payout.data?.bank_name ?? "").trim(),
        account_holder: (holder ?? payout.data?.account_holder ?? "").trim(),
        contact_email: (contact ?? payout.data?.contact_email ?? "").trim(),
        note: "",
      }),
    onSuccess: () => {
      toast.success("Saved. Our team will confirm it with you.");
      void qc.invalidateQueries({ queryKey: ["org", "payout"] });
    },
    onError: () => toast.error("That didn't save."),
  });

  const stop = useMutation({
    mutationFn: (planRowId: string) =>
      cancelPlan({ data: { planRowId, environment: getStripeEnvironment() } }),
    onSuccess: result => {
      if ("error" in result) {
        toast.error(result.error);
        return;
      }
      toast.success("It ends at the end of the month you've paid through.");
      void qc.invalidateQueries({ queryKey: ["org", "plans"] });
    },
    onError: () => toast.error("We couldn't change that."),
  });

  if (org.isLoading || role.isLoading) {
    return (
      <div className="flex justify-center py-16">
        <Loader2 className="h-4 w-4 animate-spin text-ink-soft" />
      </div>
    );
  }
  if (!org.data) {
    return <p className="px-5 pt-8 text-[13px] text-ink-soft">We couldn't find that page.</p>;
  }
  if (signedIn === false || !isLeader) {
    return (
      <div className="px-5 pt-6">
        <Link to="/community/$slug" params={{ slug }} className="text-[13px] text-ink-soft">
          Back to {org.data.name}
        </Link>
        <p className="mt-6 text-[13px] leading-relaxed text-ink-soft">
          This screen is for the people who run {org.data.name}.
        </p>
        <Link
          to="/community/claim/$slug"
          params={{ slug }}
          className="mt-3 inline-flex rounded-full bg-primary px-4 py-2 text-[12.5px] text-primary-foreground"
        >
          Ask for this page
        </Link>
      </div>
    );
  }

  const returnUrl = `${window.location.origin}/checkout/return?session_id={CHECKOUT_SESSION_ID}`;

  return (
    <div className="pb-16">
      <div className="px-4 pt-3">
        <Link
          to="/community/$slug"
          params={{ slug }}
          className="inline-flex items-center gap-1 text-[13px] text-ink-soft"
        >
          <ArrowLeft className="h-4 w-4" /> {org.data.name}
        </Link>
      </div>
      <header className="mb-5 px-5 pt-3">
        <p className="text-[11px] uppercase tracking-[0.22em] text-brass">Yours to run</p>
        <h1 className="mt-2 font-serif text-[28px] leading-tight text-ink">{org.data.name}</h1>
      </header>

      <div className="space-y-4 px-4">
        {buying && (
          <Section title="Payment">
            <PlanCheckout
              orgId={org.data.id}
              plan={buying}
              returnUrl={returnUrl}
              email={email ?? undefined}
            />
            <button
              type="button"
              onClick={() => setBuying(null)}
              className="mt-3 text-[12.5px] text-ink-soft"
            >
              Not now
            </button>
          </Section>
        )}

        <Section title="Your profile">
          <p className="text-[13px] leading-relaxed text-ink-soft">
            Your details the way people see them, plus your alerts and messages.
          </p>
          <Link
            to="/community/profile/$slug"
            params={{ slug }}
            className="mt-2 inline-flex text-[12.5px] text-brass"
          >
            Edit your profile
          </Link>
        </Section>

        <Section title="Dashboard">
          <p className="text-[13px] leading-relaxed text-ink-soft">
            Your balance and everyone you've hired, in one place.
          </p>
          <Link
            to="/community/dashboard/$slug"
            params={{ slug }}
            className="mt-2 inline-flex text-[12.5px] text-brass"
          >
            Open the dashboard
          </Link>
        </Section>

        <Section title="Payments">
          <p className="text-[13px] leading-relaxed text-ink-soft">
            Your monthly total, when the next charge lands, and every charge so far.
          </p>
          <Link
            to="/community/payments/$slug"
            params={{ slug }}
            className="mt-2 inline-flex text-[12.5px] text-brass"
          >
            Open payments
          </Link>
        </Section>

        <Section title="Your Witness story">
          <p className="text-[13px] leading-relaxed text-ink-soft">
            Tell people what changed when your organization found help, hired someone, or served through Witness.
          </p>
          <Link to="/testimonials/share" className="mt-2 inline-flex text-[12.5px] text-brass">
            Share a success story
          </Link>
        </Section>

        <Section title="Say something to your people">
          <div className="flex flex-wrap gap-2">
            {ANNOUNCEMENT_KINDS.map(k => (
              <button
                key={k.key}
                type="button"
                onClick={() => setKind(k.key)}
                className={`rounded-full border px-3 py-1.5 text-[12px] ${
                  kind === k.key ? "border-brass/50 bg-brass/10 text-brass-deep" : "border-border text-ink-soft"
                }`}
              >
                {k.label}
              </button>
            ))}
          </div>
          <input
            value={title}
            onChange={e => setTitle(e.target.value)}
            placeholder="A short title"
            className="mt-3 w-full rounded-xl border border-border bg-paper px-3 py-2 text-[13px] text-ink outline-none placeholder:text-ink-soft/60"
          />
          <textarea
            value={body}
            onChange={e => setBody(e.target.value)}
            rows={3}
            placeholder="What you want them to know."
            className="mt-2 w-full rounded-xl border border-border bg-paper px-3 py-2 text-[13px] leading-relaxed text-ink outline-none placeholder:text-ink-soft/60"
          />
          {kind === "event" && (
            <input
              type="datetime-local"
              value={startsAt}
              onChange={e => setStartsAt(e.target.value)}
              className="mt-2 w-full rounded-xl border border-border bg-paper px-3 py-2 text-[13px] text-ink outline-none"
            />
          )}
          <button
            type="button"
            disabled={post.isPending || !title.trim()}
            onClick={() => post.mutate()}
            className="mt-3 inline-flex items-center gap-2 rounded-full bg-primary px-4 py-2 text-[12.5px] text-primary-foreground disabled:opacity-50"
          >
            <Megaphone className="h-3.5 w-3.5" /> Post it
          </button>

          <div className="mt-4 space-y-2">
            {(posts.data ?? []).map(p => (
              <div key={p.id} className="rounded-xl border border-border bg-paper p-3">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <p className="text-[11px] uppercase tracking-[0.14em] text-brass">
                      {kindLabel(p.kind)}
                    </p>
                    <p className="mt-0.5 text-[13px] text-ink">{p.title}</p>
                    {p.body && (
                      <p className="mt-1 text-[12.5px] leading-relaxed text-ink-soft">{p.body}</p>
                    )}
                  </div>
                  <button
                    type="button"
                    onClick={() => drop.mutate(p.id)}
                    aria-label="Remove"
                    className="shrink-0 text-ink-soft"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </Section>

        <Section title="Prayer groups you run">
          <p className="text-[13px] leading-relaxed text-ink-soft">
            Circles for your people — grief, marriage, recovery, whatever they're carrying.
          </p>
          <Link to="/walk" className="mt-2 inline-flex text-[12.5px] text-brass">
            Open your circles
          </Link>
        </Section>

        <Section title="Counseling">
          <p className="text-[13px] leading-relaxed text-ink-soft">
            Your people can sit with one of our counselors, or with yours — an outside counselor has
            to register here and be verified before they can take sessions.
          </p>
          <Link to="/therapy" className="mt-2 inline-flex text-[12.5px] text-brass">
            See counseling
          </Link>
          <OrgCounselorManager orgId={org.data!.id} />
        </Section>

        <Section title="Where gifts land">
          {carries(active, "page_giving") ? (
            <>
              <p className="text-[12.5px] leading-relaxed text-ink-soft">
                {payout.data?.status === "verified"
                  ? "Confirmed — gifts are routed to this account."
                  : "Give us the account and a person on our team will confirm it with you before any gift is routed. Until then, gifts to your page stay closed."}
              </p>
              <input
                value={holder ?? payout.data?.account_holder ?? ""}
                onChange={e => setHolder(e.target.value)}
                placeholder="Name on the account"
                className="mt-3 w-full rounded-xl border border-border bg-paper px-3 py-2 text-[13px] text-ink outline-none placeholder:text-ink-soft/60"
              />
              <input
                value={bank ?? payout.data?.bank_name ?? ""}
                onChange={e => setBank(e.target.value)}
                placeholder="Bank"
                className="mt-2 w-full rounded-xl border border-border bg-paper px-3 py-2 text-[13px] text-ink outline-none placeholder:text-ink-soft/60"
              />
              <input
                value={contact ?? payout.data?.contact_email ?? ""}
                onChange={e => setContact(e.target.value)}
                placeholder="Who we should email about money"
                className="mt-2 w-full rounded-xl border border-border bg-paper px-3 py-2 text-[13px] text-ink outline-none placeholder:text-ink-soft/60"
              />
              <p className="mt-2 text-[11px] leading-relaxed text-ink-soft">
                Never put full account numbers here. We'll collect those with you directly, over a
                secure line.
              </p>
              <button
                type="button"
                disabled={saveBank.isPending}
                onClick={() => saveBank.mutate()}
                className="mt-3 inline-flex rounded-full bg-primary px-4 py-2 text-[12.5px] text-primary-foreground disabled:opacity-60"
              >
                Save
              </button>
            </>
          ) : (
            <p className="text-[12.5px] leading-relaxed text-ink-soft">
              Giving comes with the Page + Giving plan below.
            </p>
          )}
        </Section>

        <Section title="Your plan">
          <p className="text-[12.5px] leading-relaxed text-ink-soft">
            A plan pays for the page. It never changes who sees a prayer, and it never takes a cut of
            a gift — every dollar given goes on.
          </p>
          <div className="mt-3 space-y-3">
            {PLANS.map(plan => {
              const row = (plans.data ?? []).find(
                r => r.plan === plan.key && (r.status === "active" || r.status === "past_due"),
              );
              return (
                <div key={plan.key} className="rounded-xl border border-border bg-paper p-3">
                  <div className="flex items-baseline justify-between gap-2">
                    <p className="font-serif text-[15.5px] text-ink">
                      {plan.name}
                      {plan.addOn ? " (add-on)" : ""}
                    </p>
                    <p className="text-[12.5px] text-ink-soft">{planPrice(plan.cents)}</p>
                  </div>
                  <p className="mt-1 text-[12.5px] leading-relaxed text-ink-soft">{plan.blurb}</p>
                  <ul className="mt-2 space-y-1">
                    {plan.carries.map(line => (
                      <li key={line} className="text-[12px] text-ink-soft">
                        · {line}
                      </li>
                    ))}
                  </ul>
                  {row ? (
                    <div className="mt-3 flex items-center justify-between gap-2">
                      <span className="text-[12px] text-brass-deep">
                        {row.status === "past_due" ? "Payment didn't go through" : "Active"}
                      </span>
                      <button
                        type="button"
                        disabled={stop.isPending}
                        onClick={() => stop.mutate(row.id)}
                        className="text-[12px] text-ink-soft underline disabled:opacity-60"
                      >
                        End this plan
                      </button>
                    </div>
                  ) : (
                    <button
                      type="button"
                      onClick={() => setBuying(plan.key)}
                      className="mt-3 inline-flex rounded-full bg-primary px-4 py-2 text-[12.5px] text-primary-foreground"
                    >
                      Start this plan
                    </button>
                  )}
                </div>
              );
            })}
          </div>
          <p className="mt-3 text-[11px] leading-relaxed text-ink-soft">
            If a plan lapses, your page comes out of search. Nothing is deleted, and gifts already
            given are untouched.
          </p>
        </Section>
      </div>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="rounded-2xl border border-border bg-card p-4 shadow-soft">
      <h2 className="mb-2 text-[11px] uppercase tracking-[0.18em] text-ink-soft">{title}</h2>
      {children}
    </section>
  );
}
