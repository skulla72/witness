import { useEffect, useState, type ReactNode } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Loader2, ShieldCheck } from "lucide-react";
import { toast } from "sonner";
import { BRAND } from "@/config/brand";
import { getStripeEnvironment, money } from "@/lib/stripe";
import { finishPayoutSetup, payoutState, startPayoutSetup } from "@/lib/payouts.functions";

interface Props {
  /** Leave empty for a person's own payouts; pass an organization to set up theirs. */
  orgId?: string | undefined;
  title?: string;
}

/**
 * Where a recipient's money actually goes. Once their bank account is
 * confirmed, balances transfer on their own — nothing waits on our team.
 */
export function PayoutSetup({ orgId, title = "Where the money lands" }: Props) {
  const qc = useQueryClient();
  const [opening, setOpening] = useState(false);
  const environment = safeEnvironment();

  const state = useQuery({
    queryKey: ["payouts", "state", orgId ?? "me"],
    queryFn: () => payoutState({ data: { ...(orgId ? { orgId } : {}), environment: environment! } }),
    enabled: !!environment,
  });

  const finish = useMutation({
    mutationFn: () =>
      finishPayoutSetup({ data: { ...(orgId ? { orgId } : {}), environment: environment! } }),
    onSuccess: result => {
      if ("error" in result) return;
      if (result.ready && result.paidCents > 0) {
        toast.success(`${money(result.paidCents)} is on its way to your bank.`);
      }
      void qc.invalidateQueries({ queryKey: ["payouts", "state", orgId ?? "me"] });
    },
  });

  // Someone just came back from the bank-details screen.
  useEffect(() => {
    if (!environment) return;
    const params = new URLSearchParams(window.location.search);
    if (params.get("payouts") === "done") finish.mutate();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [environment]);

  const open = async () => {
    if (!environment) return;
    setOpening(true);
    try {
      const url = new URL(window.location.href);
      url.searchParams.set("payouts", "done");
      const result = await startPayoutSetup({
        data: { ...(orgId ? { orgId } : {}), returnUrl: url.toString(), environment },
      });
      if ("error" in result) {
        toast.error(result.error);
        return;
      }
      window.location.href = result.url;
    } catch {
      toast.error("We couldn't open the bank setup. Try again.");
    } finally {
      setOpening(false);
    }
  };

  const data = state.data && !("error" in state.data) ? state.data : null;
  const ready = data?.payoutsEnabled === true;

  return (
    <section className="rounded-2xl border border-border bg-card p-4 shadow-soft">
      <h2 className="mb-2 text-[11px] uppercase tracking-[0.18em] text-ink-soft">{title}</h2>

      {!environment ? (
        <p className={muted}>Payments aren't switched on for this build yet.</p>
      ) : state.isLoading ? (
        <p className={muted}>Checking…</p>
      ) : (
        <>
          <div className="mb-3 grid grid-cols-2 gap-3">
            <Figure label="Owed to you" value={money(data?.owedCents ?? 0)} />
            <Figure label="Sent to your bank" value={money(data?.paidCents ?? 0)} />
          </div>

          <p className={muted}>
            {ready
              ? "Your bank account is confirmed. Balances transfer on their own — usually within a day of the gift or finished job clearing."
              : data?.status === "in_review"
                ? "Your details are in review with the payment provider. Transfers start the moment it clears; until then your balance stays recorded and owed to you."
                : data?.connected
                  ? "You started this but didn't finish. Pick up where you left off — it only asks for what's still missing."
                  : `Tell us where your money should land and it arrives on its own from then on. Until then ${BRAND.name} holds it and shows it as owed — never as paid.`}
          </p>

          {!ready && data?.status !== "in_review" && (
            <ol className="mt-3 space-y-1.5 border-t border-border pt-3 text-[12.5px] leading-snug text-ink-soft">
              <Step n={1}>Confirm who you are — we send along what we already know about you.</Step>
              <Step n={2}>
                Sign in to your bank and choose the account. No routing or account numbers to type.
              </Step>
              <Step n={3}>Done. Anything owed to you goes out within a day, every time.</Step>
            </ol>
          )}

          {!ready && data?.status !== "in_review" && (
            <p className="mt-2.5 flex items-start gap-1.5 text-[11px] leading-snug text-ink-soft">
              <ShieldCheck className="mt-[1px] h-3.5 w-3.5 shrink-0 text-hope" />
              <span>
                Your bank login and account numbers stay between you and your bank — {BRAND.name}
                {" "}
                never sees or stores them. Takes about two minutes.
              </span>
            </p>
          )}

          {data?.blockedReason && (
            <p className="mt-2 text-[12px] text-ink-soft">
              The provider still needs something from you before money can move.
            </p>
          )}

          {!ready && (
            <button
              type="button"
              onClick={open}
              disabled={opening}
              className="mt-3 inline-flex items-center gap-2 rounded-full bg-ink px-4 py-2 text-[12.5px] text-paper disabled:opacity-60"
            >
              {opening && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
              {data?.connected ? "Pick up where I left off" : "Sign in to my bank"}
            </button>
          )}

          {!ready && (
            <p className="mt-2 text-[11px] leading-snug text-ink-soft">
              No bank login handy? The same screen lets you type your routing and account number
              instead — either way the numbers go to the bank, not to {BRAND.name}.
            </p>
          )}


          {ready && (data?.owedCents ?? 0) > 0 && (
            <button
              type="button"
              onClick={() => finish.mutate()}
              disabled={finish.isPending}
              className="mt-3 inline-flex items-center gap-2 text-[12.5px] text-brass disabled:opacity-60"
            >
              {finish.isPending && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
              Send what's owed now
            </button>
          )}
        </>
      )}
    </section>
  );
}

function Figure({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-border/70 bg-paper/60 p-3">
      <p className="text-[10.5px] uppercase tracking-[0.16em] text-ink-soft">{label}</p>
      <p className="mt-1 text-[15px] text-ink">{value}</p>
    </div>
  );
}

function safeEnvironment() {
  try {
    return getStripeEnvironment();
  } catch {
    return null;
  }
}

const muted = "text-[13px] leading-relaxed text-ink-soft";

function Step({ n, children }: { n: number; children: ReactNode }) {
  return (
    <li className="flex items-start gap-2">
      <span className="mt-[1px] flex h-4 w-4 shrink-0 items-center justify-center rounded-full bg-ink/10 text-[10px] text-ink">
        {n}
      </span>
      <span className="min-w-0">{children}</span>
    </li>
  );
}
