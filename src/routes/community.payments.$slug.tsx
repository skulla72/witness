import { useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ArrowLeft, Loader2, ReceiptText } from "lucide-react";
import { toast } from "sonner";
import { BRAND } from "@/config/brand";
import { supabase } from "@/integrations/supabase/client";
import { useSession } from "@/hooks/useSession";
import { ORG_PUBLIC_COLUMNS, type Org } from "@/lib/community";
import { PLANS, planByKey, planPrice } from "@/data/plans";
import { PayoutSetup } from "@/components/payouts/PayoutSetup";
import { orgBilling, type BillingSummary } from "@/lib/billing.functions";
import { cancelPlan } from "@/lib/orgplan.functions";
import { whenMonth } from "@/lib/billing";
import { getStripeEnvironment, money } from "@/lib/stripe";
import { PlanCheckout } from "@/components/orgs/PlanCheckout";

export const Route = createFileRoute("/community/payments/$slug")({
  staticData: { sitemap: false },
  component: OrgPayments,
  head: () => ({
    meta: [
      { title: `Payments · ${BRAND.name}` },
      {
        name: "description",
        content:
          "What your organization pays each month, when the next charge lands, and every charge so far.",
      },
      { property: "og:title", content: `Payments · ${BRAND.name}` },
      {
        property: "og:description",
        content: "Your monthly total, package status and past charges in one place.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
});

const STATUS_WORD: Record<string, string> = {
  active: "Active",
  past_due: "Payment didn't go through",
  canceled: "Ends when the paid month runs out",
};

function OrgPayments() {
  const { slug } = Route.useParams();
  const { userId, email, signedIn } = useSession();
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

  const billing = useQuery({
    queryKey: ["org", "billing", orgId, userId],
    queryFn: async (): Promise<BillingSummary | { error: string }> =>
      orgBilling({ data: { orgId: orgId!, environment: getStripeEnvironment() } }),
    enabled: !!orgId && !!userId,
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
      void qc.invalidateQueries({ queryKey: ["org", "billing"] });
    },
    onError: () => toast.error("We couldn't change that."),
  });


  if (org.isLoading || billing.isLoading) {
    return (
      <Shell slug={slug} name={org.data?.name ?? "Your page"}>
        <div className="flex justify-center py-10">
          <Loader2 className="h-4 w-4 animate-spin text-ink-soft" />
        </div>
      </Shell>
    );
  }
  if (!org.data) {
    return (
      <Shell slug={slug} name="Your page">
        <p className={muted}>We couldn't find that page.</p>
      </Shell>
    );
  }
  if (signedIn === false || !billing.data || "error" in billing.data) {
    return (
      <Shell slug={slug} name={org.data.name}>
        <p className={muted}>
          {billing.data && "error" in billing.data
            ? billing.data.error
            : "Sign in as a leader of this organization to see payments."}
        </p>
      </Shell>
    );
  }

  const b = billing.data;
  const carried = new Set(
    b.lines.filter(l => l.status === "active" || l.status === "past_due").map(l => l.plan),
  );
  const returnUrl =
    typeof window === "undefined"
      ? ""
      : `${window.location.origin}/checkout/return?session_id={CHECKOUT_SESSION_ID}`;

  return (
    <Shell slug={slug} name={org.data.name}>
      {buying && (
        <section className="rounded-2xl border border-border bg-card p-4 shadow-soft">
          <h2 className="mb-2 text-[11px] uppercase tracking-[0.18em] text-ink-soft">Payment</h2>
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
        </section>
      )}

      <section className="rounded-2xl border border-border bg-card p-4 shadow-soft">
        <p className="text-[11px] uppercase tracking-[0.18em] text-ink-soft">Each month</p>
        <p className="mt-1 font-serif text-[30px] leading-none text-ink">
          {money(b.monthlyCents)}
        </p>
        <p className="mt-2 text-[12.5px] leading-relaxed text-ink-soft">
          {b.monthlyCents
            ? `Next charge ${whenMonth(b.nextChargeAt)}.`
            : "Nothing is being charged right now."}
        </p>
        <p className="mt-2 text-[11px] leading-relaxed text-ink-soft">
          This pays for your page. Gifts are separate: a small part helps keep Witness running, and the remainder is owed to the receiving organization after processing.
        </p>
      </section>

      <section className="rounded-2xl border border-border bg-card p-4 shadow-soft">
        <h2 className="mb-2 text-[11px] uppercase tracking-[0.18em] text-ink-soft">
          What you carry
        </h2>
        {b.lines.length === 0 ? (
          <p className={muted}>No package yet.</p>
        ) : (
          <div className="space-y-2">
            {b.lines.map(line => (
              <div
                key={line.id}
                className="flex items-baseline justify-between gap-3 rounded-xl border border-border bg-paper p-3"
              >
                <div className="min-w-0">
                  <p className="text-[13.5px] text-ink">
                    {planByKey(line.plan)?.name ?? line.plan}
                  </p>
                  <p className="mt-0.5 text-[11.5px] text-ink-soft">
                    {STATUS_WORD[line.status] ?? line.status}
                    {line.currentPeriodEnd ? ` · paid through ${whenMonth(line.currentPeriodEnd)}` : ""}
                  </p>
                </div>
                <div className="shrink-0 text-right">
                  <p className="text-[12.5px] text-ink-soft">{money(line.amountCents)}/mo</p>
                  {(line.status === "active" || line.status === "past_due") && (
                    <button
                      type="button"
                      onClick={() => stop.mutate(line.id)}
                      disabled={stop.isPending}
                      className="mt-1 text-[11.5px] text-ink-soft underline"
                    >
                      End it
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}

        <div className="mt-3 space-y-2">
          {PLANS.filter(p => !carried.has(p.key)).map(p => (
            <div
              key={p.key}
              className="flex items-baseline justify-between gap-3 rounded-xl border border-border bg-paper p-3"
            >
              <div className="min-w-0">
                <p className="text-[13.5px] text-ink">{p.name}</p>
                <p className="mt-0.5 text-[11.5px] leading-relaxed text-ink-soft">{p.blurb}</p>
              </div>
              <button
                type="button"
                onClick={() => setBuying(p.key)}
                className="shrink-0 rounded-full bg-primary px-3 py-1.5 text-[12px] text-primary-foreground"
              >
                {planPrice(p.cents)}
              </button>
            </div>
          ))}
        </div>

        <Link
          to="/community/manage/$slug"
          params={{ slug }}
          className="mt-3 inline-flex text-[12.5px] text-brass"
        >
          Everything else about your page
        </Link>
      </section>

      <section className="rounded-2xl border border-border bg-card p-4 shadow-soft">
        <h2 className="mb-2 text-[11px] uppercase tracking-[0.18em] text-ink-soft">Charges</h2>
        {b.chargesNote && <p className="mb-2 text-[12px] text-ink-soft">{b.chargesNote}</p>}
        {b.charges.length === 0 ? (
          <p className={muted}>Nothing has been charged yet.</p>
        ) : (
          <div className="space-y-2">
            {b.charges.map(c => (
              <div key={c.id} className="flex items-center justify-between gap-3 py-1.5">
                <div className="min-w-0">
                  <p className="text-[13px] text-ink">{money(c.amountCents)}</p>
                  <p className="text-[11.5px] text-ink-soft">
                    {whenMonth(c.paidAt)} · {c.status === "paid" ? "Paid" : c.status}
                  </p>
                </div>
                {c.url && (
                  <a
                    href={c.url}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex shrink-0 items-center gap-1 text-[12px] text-brass"
                  >
                    <ReceiptText className="h-3.5 w-3.5" /> Receipt
                  </a>
                )}
              </div>
            ))}
          </div>
        )}
      </section>

      {orgId && <PayoutSetup orgId={orgId} title="Where gifts land" />}

      <p className="px-1 text-[11px] leading-relaxed text-ink-soft">
        If a payment fails your page comes out of search. Nothing is deleted, and gifts already
        given are untouched.
      </p>
    </Shell>
  );
}

const muted = "text-[13px] leading-relaxed text-ink-soft";

function Shell({
  slug,
  name,
  children,
}: {
  slug: string;
  name: string;
  children: React.ReactNode;
}) {
  return (
    <div className="pb-16">
      <div className="px-4 pt-3">
        <Link
          to="/community/manage/$slug"
          params={{ slug }}
          className="inline-flex items-center gap-1 text-[13px] text-ink-soft"
        >
          <ArrowLeft className="h-4 w-4" /> {name}
        </Link>
      </div>
      <header className="mb-5 px-5 pt-3">
        <p className="text-[11px] uppercase tracking-[0.22em] text-brass">Money</p>
        <h1 className="mt-2 font-serif text-[28px] leading-tight text-ink">Payments</h1>
      </header>
      <div className="space-y-4 px-4">{children}</div>
    </div>
  );
}
