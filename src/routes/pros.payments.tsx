import { useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ArrowLeft, Loader2, ReceiptText } from "lucide-react";
import { toast } from "sonner";
import { BRAND } from "@/config/brand";
import { useSession } from "@/hooks/useSession";
import { myProPage } from "@/lib/pros";
import { myWorkMoney, whenMonth } from "@/lib/billing";
import { FUND_STATUS_LABEL, dollarsExact } from "@/lib/jobfund";
import { loadBadge } from "@/lib/hours";
import { PRO_PAGE_PLAN } from "@/data/plans";
import { getStripeEnvironment, money } from "@/lib/stripe";
import { cancelProPlan, proBilling, type ProBillingSummary } from "@/lib/proplan.functions";
import { ProPlanCheckout } from "@/components/pros/ProPlanCheckout";
import { PayoutSetup } from "@/components/payouts/PayoutSetup";

export const Route = createFileRoute("/pros/payments")({
  staticData: { sitemap: false },
  component: ProPayments,
  head: () => ({
    meta: [
      { title: `Your payments · ${BRAND.name}` },
      {
        name: "description",
        content:
          "What's been chipped in for your jobs, what's still held, what's been paid out, and hours you've served.",
      },
      { property: "og:title", content: `Your payments · ${BRAND.name}` },
      {
        property: "og:description",
        content: "Money held for your jobs, money paid, and hours served.",
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

function ProPayments() {
  const { userId, email, signedIn } = useSession();
  const qc = useQueryClient();
  const [paying, setPaying] = useState(false);

  const page = useQuery({
    queryKey: ["pros", "mine", userId],
    queryFn: () => myProPage(userId!),
    enabled: !!userId,
  });
  const work = useQuery({
    queryKey: ["pros", "money", userId],
    queryFn: () => myWorkMoney(userId!),
    enabled: !!userId,
  });
  const badge = useQuery({
    queryKey: ["hours", "badge", userId],
    queryFn: () => loadBadge(userId!),
    enabled: !!userId,
  });

  const proId = page.data?.id;
  const billing = useQuery({
    queryKey: ["pros", "billing", proId],
    queryFn: async (): Promise<ProBillingSummary | { error: string }> =>
      proBilling({ data: { proId: proId!, environment: getStripeEnvironment() } }),
    enabled: !!proId && !!userId,
  });

  const stop = useMutation({
    mutationFn: (planRowId: string) =>
      cancelProPlan({ data: { planRowId, environment: getStripeEnvironment() } }),
    onSuccess: result => {
      if ("error" in result) {
        toast.error(result.error);
        return;
      }
      toast.success("It ends at the end of the month you've paid through.");
      void qc.invalidateQueries({ queryKey: ["pros", "billing"] });
    },
    onError: () => toast.error("We couldn't change that."),
  });

  const plan = billing.data && !("error" in billing.data) ? billing.data : null;
  const line = plan?.line ?? null;
  const activePlan = line?.status === "active" || line?.status === "past_due";
  const returnUrl =
    typeof window === "undefined"
      ? ""
      : `${window.location.origin}/checkout/return?session_id={CHECKOUT_SESSION_ID}`;


  if (signedIn === false) {
    return (
      <Shell>
        <p className={muted}>Sign in to see your payments.</p>
      </Shell>
    );
  }
  if (work.isLoading) {
    return (
      <Shell>
        <div className="flex justify-center py-10">
          <Loader2 className="h-4 w-4 animate-spin text-ink-soft" />
        </div>
      </Shell>
    );
  }

  const m = work.data;

  return (
    <Shell>
      <section className="rounded-2xl border border-border bg-card p-4 shadow-soft">
        <p className="text-[11px] uppercase tracking-[0.18em] text-ink-soft">Waiting for you</p>
        <p className="mt-1 font-serif text-[30px] leading-none text-ink">
          {dollarsExact(m?.heldCents ?? 0)}
        </p>
        <p className="mt-2 text-[12.5px] leading-relaxed text-ink-soft">
          Held until the person who posted the job says the work is done. Then it becomes ready for payout.
        </p>
        <div className="mt-3 grid grid-cols-2 gap-3">
          <Stat label="Still being collected" value={dollarsExact(m?.collectingCents ?? 0)} />
          <Stat label="Paid to you" value={dollarsExact(m?.paidCents ?? 0)} />
        </div>
      </section>

      <section className="rounded-2xl border border-border bg-card p-4 shadow-soft">
        <h2 className="mb-2 text-[11px] uppercase tracking-[0.18em] text-ink-soft">Your page</h2>
        {!page.data ? (
          <>
            <p className={muted}>
              You don't have a professional page yet. Setting one up is free; keeping it active is{" "}
              {money(PRO_PAGE_PLAN.cents)} a month.
            </p>
            <Link to="/pros/new" className="mt-2 inline-flex text-[12.5px] text-brass">
              Set one up
            </Link>
          </>
        ) : paying ? (
          <>
            <ProPlanCheckout
              proId={page.data.id}
              returnUrl={returnUrl}
              email={email ?? undefined}
            />
            <button
              type="button"
              onClick={() => setPaying(false)}
              className="mt-3 text-[12.5px] text-ink-soft"
            >
              Not now
            </button>
          </>
        ) : activePlan && line ? (
          <>
            <p className="text-[13.5px] text-ink">
              {money(line.amountCents)} a month · {STATUS_WORD[line.status] ?? line.status}
            </p>
            <p className="mt-1 text-[11.5px] text-ink-soft">
              {line.currentPeriodEnd
                ? `Paid through ${whenMonth(line.currentPeriodEnd)}.`
                : "Your first charge is being set up."}
            </p>
            {line.status === "past_due" && (
              <button
                type="button"
                onClick={() => setPaying(true)}
                className="mt-3 inline-flex rounded-full bg-primary px-4 py-2 text-[12.5px] text-primary-foreground"
              >
                Pay with a different card
              </button>
            )}
            <button
              type="button"
              onClick={() => stop.mutate(line.id)}
              disabled={stop.isPending}
              className="mt-3 block text-[12.5px] text-ink-soft"
            >
              End it
            </button>
          </>
        ) : (
          <>
            <p className={muted}>
              {money(PRO_PAGE_PLAN.cents)} a month keeps your page active. Witness also keeps a tenth
              of each job fund — nothing else.
            </p>
            <ul className="mt-2 space-y-1">
              {PRO_PAGE_PLAN.carries.map(item => (
                <li key={item} className="text-[12.5px] text-ink-soft">
                  · {item}
                </li>
              ))}
            </ul>
            <button
              type="button"
              onClick={() => setPaying(true)}
              className="mt-3 inline-flex rounded-full bg-primary px-4 py-2 text-[12.5px] text-primary-foreground"
            >
              {line?.status === "canceled" ? "Start it again" : "Start it"} —{" "}
              {money(PRO_PAGE_PLAN.cents)}/mo
            </button>
          </>
        )}
      </section>

      <PayoutSetup title="Where your job money lands" />

      {plan && (plan.charges.length > 0 || plan.chargesNote) && (
        <section className="rounded-2xl border border-border bg-card p-4 shadow-soft">
          <h2 className="mb-2 text-[11px] uppercase tracking-[0.18em] text-ink-soft">
            Page charges
          </h2>
          {plan.chargesNote && <p className="mb-2 text-[12px] text-ink-soft">{plan.chargesNote}</p>}
          <div className="space-y-2">
            {plan.charges.map(c => (
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
        </section>
      )}


      <section className="rounded-2xl border border-border bg-card p-4 shadow-soft">
        <h2 className="mb-2 text-[11px] uppercase tracking-[0.18em] text-ink-soft">Jobs</h2>
        {!m?.jobs.length ? (
          <p className={muted}>No funded jobs yet.</p>
        ) : (
          <div className="space-y-2">
            {m.jobs.map(f => (
              <div
                key={f.id}
                className="flex items-baseline justify-between gap-3 rounded-xl border border-border bg-paper p-3"
              >
                <div className="min-w-0">
                  <p className="text-[13px] text-ink">{dollarsExact(f.raised_cents)} chipped in</p>
                  <p className="mt-0.5 text-[11.5px] text-ink-soft">
                    {FUND_STATUS_LABEL[f.status] ?? f.status} · goal{" "}
                    {dollarsExact(f.goal_cents)}
                  </p>
                </div>
                <Link
                  to="/needs/$id"
                  params={{ id: f.need_id }}
                  className="shrink-0 text-[12px] text-brass"
                >
                  Open
                </Link>
              </div>
            ))}
          </div>
        )}
      </section>

      <section className="rounded-2xl border border-border bg-card p-4 shadow-soft">
        <h2 className="mb-2 text-[11px] uppercase tracking-[0.18em] text-ink-soft">
          Hours you've served
        </h2>
        <p className="text-[13px] text-ink">
          {badge.data?.hours_verified ?? 0} confirmed
          <span className="text-ink-soft"> · {badge.data?.hours_self ?? 0} you've told us about</span>
        </p>
        <p className="mt-1 text-[11.5px] leading-relaxed text-ink-soft">
          Hours are never turned into dollars.
        </p>
        <Link to="/hours" className="mt-2 inline-flex text-[12.5px] text-brass">
          Your hours
        </Link>
      </section>

      <p className="px-1 text-[11px] leading-relaxed text-ink-soft">
        Your page is $9 a month. Witness also keeps 10% of each paid job. Worker balances stay recorded
        here until automatic connected-account payouts are available; nothing is marked paid before money moves.
      </p>
    </Shell>
  );
}

const muted = "text-[13px] leading-relaxed text-ink-soft";

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-border bg-paper p-3">
      <p className="text-[11px] leading-tight text-ink-soft">{label}</p>
      <p className="mt-1 text-[15px] text-ink">{value}</p>
    </div>
  );
}

function Shell({ children }: { children: React.ReactNode }) {
  return (
    <div className="pb-16">
      <div className="px-4 pt-3">
        <Link to="/pros/mine" className="inline-flex items-center gap-1 text-[13px] text-ink-soft">
          <ArrowLeft className="h-4 w-4" /> Your page
        </Link>
      </div>
      <header className="mb-5 px-5 pt-3">
        <p className="text-[11px] uppercase tracking-[0.22em] text-brass">Money</p>
        <h1 className="mt-2 font-serif text-[28px] leading-tight text-ink">Your payments</h1>
      </header>
      <div className="space-y-4 px-4">{children}</div>
    </div>
  );
}
