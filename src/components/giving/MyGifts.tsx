import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Link } from "@tanstack/react-router";
import { ChevronDown, Loader2, Repeat, Scale, X } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useSession } from "@/hooks/useSession";
import { getStripeEnvironment, money } from "@/lib/stripe";
import { cancelMonthlyGift } from "@/lib/donate.functions";
import { cancelMonthlyFund } from "@/lib/fund.functions";
import { fundLabel } from "@/lib/fund";

const DATE = new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric", year: "numeric" });

interface GiftRow {
  id: string;
  amount_cents: number;
  frequency: string;
  status: string;
  created_at: string;
  receipt_url: string | null;
  stripe_subscription_id: string | null;
  canceled_at: string | null;
  current_period_end: string | null;
  refunded_cents: number | null;
  fund_gift_id: string | null;
  organizations: { name: string; slug: string } | null;
}

interface FundRow {
  id: string;
  scope: string;
  lane: string | null;
  amount_cents: number;
  frequency: string;
  status: string;
  created_at: string;
  receipt_url: string | null;
  stripe_subscription_id: string | null;
  canceled_at: string | null;
  current_period_end: string | null;
  org_count: number;
}

const NOTE: Record<string, string> = {
  pending: "Waiting on the payment to clear",
  past_due: "The last monthly gift didn't go through",
  failed: "This payment didn't go through",
  abandoned: "Checkout was left unfinished",
  refunded: "This gift was refunded",
  canceled: "Stopped",
};

export function MyGifts() {
  const { userId } = useSession();
  const queryClient = useQueryClient();
  const [open, setOpen] = useState<string | null>(null);

  const { data: gifts, isLoading } = useQuery({
    queryKey: ["my-gifts", userId],
    enabled: Boolean(userId),
    queryFn: async (): Promise<GiftRow[]> => {
      const { data, error } = await supabase
        .from("donations")
        .select(
          "id, amount_cents, frequency, status, created_at, receipt_url, stripe_subscription_id, canceled_at, current_period_end, refunded_cents, fund_gift_id, organizations(name, slug)",
        )
        .eq("user_id", userId!)
        .order("created_at", { ascending: false })
        .limit(200);
      if (error) throw error;
      return (data ?? []) as unknown as GiftRow[];
    },
  });

  const { data: funds } = useQuery({
    queryKey: ["my-fund-gifts", userId],
    enabled: Boolean(userId),
    queryFn: async (): Promise<FundRow[]> => {
      const { data, error } = await supabase
        .from("fund_gifts")
        .select(
          "id, scope, lane, amount_cents, frequency, status, created_at, receipt_url, stripe_subscription_id, canceled_at, current_period_end, org_count",
        )
        .eq("user_id", userId!)
        .order("created_at", { ascending: false })
        .limit(20);
      if (error) throw error;
      return (data ?? []) as unknown as FundRow[];
    },
  });

  const stopFund = useMutation({
    mutationFn: async (fundGiftId: string) => {
      const result = await cancelMonthlyFund({
        data: { fundGiftId, environment: getStripeEnvironment() },
      });
      if ("error" in result) throw new Error(result.error);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["my-fund-gifts"] });
      queryClient.invalidateQueries({ queryKey: ["my-gifts"] });
    },
  });


  const stop = useMutation({
    mutationFn: async (donationId: string) => {
      const result = await cancelMonthlyGift({
        data: { donationId, environment: getStripeEnvironment() },
      });
      if ("error" in result) throw new Error(result.error);
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["my-gifts"] }),
  });

  if (!userId) return null;
  if (isLoading) {
    return (
      <div className="flex justify-center py-6">
        <Loader2 className="h-4 w-4 animate-spin text-ink-soft" />
      </div>
    );
  }
  const fundGifts = (funds ?? []).filter(f => f.status !== "abandoned");
  const direct = (gifts ?? []).filter(g => !g.fund_gift_id);
  if (direct.length === 0 && fundGifts.length === 0) return null;

  return (
    <section className="mx-4 mb-6 rounded-2xl border border-border bg-card p-4 shadow-soft">
      <p className="text-[10px] uppercase tracking-[0.2em] text-brass">Your giving</p>

      {fundGifts.length > 0 && (
        <div className="mt-3 space-y-2">
          {fundGifts.map(f => {
            const monthly = f.frequency === "monthly";
            const active =
              monthly && !f.canceled_at && ["paid", "pending", "past_due"].includes(f.status);
            const shares = (gifts ?? []).filter(g => g.fund_gift_id === f.id);
            const expanded = open === f.id;
            return (
              <div key={f.id} className="rounded-xl border border-brass/30 bg-paper p-3">
                <div className="flex items-center justify-between gap-2">
                  <p className="text-[14px] text-ink">
                    {money(f.amount_cents)}
                    {monthly && (
                      <span className="ml-1.5 inline-flex items-center gap-1 text-[11px] text-brass">
                        <Repeat className="h-3 w-3" /> monthly
                      </span>
                    )}
                  </p>
                  <span className="text-[11px] text-ink-soft">
                    {DATE.format(new Date(f.created_at))}
                  </span>
                </div>
                <p className="mt-1 inline-flex items-center gap-1.5 text-[12px] text-ink-soft">
                  <Scale className="h-3 w-3 text-brass" />
                  {fundLabel(f.scope, f.lane)} · split evenly between {f.org_count} nonprofits
                </p>
                {(NOTE[f.status] || (f.canceled_at && monthly)) && (
                  <p className="mt-1 text-[11.5px] text-ink-soft">
                    {f.canceled_at && f.status === "paid"
                      ? `Monthly giving stopped ${DATE.format(new Date(f.canceled_at))}`
                      : NOTE[f.status]}
                  </p>
                )}
                {active && f.current_period_end && (
                  <p className="mt-1 text-[11.5px] text-hope">
                    Next gift {DATE.format(new Date(f.current_period_end))}
                  </p>
                )}
                <div className="mt-2 flex flex-wrap items-center gap-3">
                  {shares.length > 0 && (
                    <button
                      onClick={() => setOpen(expanded ? null : f.id)}
                      className="inline-flex items-center gap-1 text-[11.5px] text-ink-soft"
                    >
                      <ChevronDown
                        className={`h-3 w-3 transition-transform ${expanded ? "rotate-180" : ""}`}
                      />
                      {expanded ? "Hide who shared it" : "See who shared it"}
                    </button>
                  )}
                  {f.receipt_url && (
                    <a
                      href={f.receipt_url}
                      target="_blank"
                      rel="noreferrer"
                      className="text-[11.5px] text-brass"
                    >
                      Receipt
                    </a>
                  )}
                  {active && f.stripe_subscription_id && (
                    <button
                      onClick={() => stopFund.mutate(f.id)}
                      disabled={stopFund.isPending}
                      className="inline-flex items-center gap-1 text-[11.5px] text-ink-soft disabled:opacity-50"
                    >
                      <X className="h-3 w-3" /> Stop this monthly gift
                    </button>
                  )}
                </div>
                {expanded && (
                  <ul className="mt-2 space-y-1 border-t border-border pt-2">
                    {shares.map(s => (
                      <li key={s.id} className="flex items-center justify-between gap-2 text-[12px]">
                        <span className="min-w-0 truncate text-ink-soft">
                          {s.organizations?.name ?? "A nonprofit"}
                        </span>
                        <span className="shrink-0 text-ink">{money(s.amount_cents)}</span>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            );
          })}
        </div>
      )}

      <div className="mt-3 space-y-2">
        {direct.map(g => {

          const monthly = g.frequency === "monthly";
          const active = monthly && !g.canceled_at && ["paid", "pending", "past_due"].includes(g.status);
          return (
            <div key={g.id} className="rounded-xl border border-border bg-paper p-3">
              <div className="flex items-center justify-between gap-2">
                <p className="text-[14px] text-ink">
                  {money(g.amount_cents)}
                  {monthly && (
                    <span className="ml-1.5 inline-flex items-center gap-1 text-[11px] text-brass">
                      <Repeat className="h-3 w-3" /> monthly
                    </span>
                  )}
                </p>
                <span className="text-[11px] text-ink-soft">
                  {DATE.format(new Date(g.created_at))}
                </span>
              </div>
              {g.organizations && (
                <Link
                  to="/community/$slug"
                  params={{ slug: g.organizations.slug }}
                  className="mt-1 block text-[12px] text-ink-soft"
                >
                  {g.organizations.name}
                </Link>
              )}
              {(NOTE[g.status] || (g.canceled_at && monthly)) && (
                <p className="mt-1 text-[11.5px] text-ink-soft">
                  {g.canceled_at && g.status === "paid"
                    ? `Monthly giving stopped ${DATE.format(new Date(g.canceled_at))}`
                    : NOTE[g.status]}
                </p>
              )}
              {active && g.current_period_end && (
                <p className="mt-1 text-[11.5px] text-hope">
                  Next gift {DATE.format(new Date(g.current_period_end))}
                </p>
              )}
              <div className="mt-2 flex items-center gap-3">
                {g.receipt_url && (
                  <a
                    href={g.receipt_url}
                    target="_blank"
                    rel="noreferrer"
                    className="text-[11.5px] text-brass"
                  >
                    Receipt
                  </a>
                )}
                {active && g.stripe_subscription_id && (
                  <button
                    onClick={() => stop.mutate(g.id)}
                    disabled={stop.isPending}
                    className="inline-flex items-center gap-1 text-[11.5px] text-ink-soft disabled:opacity-50"
                  >
                    <X className="h-3 w-3" /> Stop this monthly gift
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>
      {stop.isError && (
        <p className="mt-2 text-[11.5px] text-flame">{(stop.error as Error).message}</p>
      )}
      {stopFund.isError && (
        <p className="mt-2 text-[11.5px] text-flame">{(stopFund.error as Error).message}</p>
      )}

    </section>
  );
}
