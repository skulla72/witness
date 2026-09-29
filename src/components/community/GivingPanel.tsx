import { Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { HandCoins, Landmark, Loader2, Repeat } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { money } from "@/lib/stripe";
import { findLane, tierLabel, type Tier } from "@/data/giving";
import { grantTotals, grantorName, grantsForOrg, statusLabel, type Grant, type GrantStatus } from "@/lib/grants";
import type { Tables } from "@/integrations/supabase/types";

type Profile = Tables<"nonprofit_profiles">;
type Donation = Tables<"donations">;

const STATUS_STYLE: Record<string, string> = {
  paid: "bg-hope/15 text-hope",
  pending: "bg-secondary text-ink-soft",
  failed: "bg-flame/10 text-flame",
  abandoned: "bg-secondary text-ink-soft",
};

const DATE = new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric" });

interface Props {
  orgId: string;
  orgSlug: string;
  orgName: string;
  isLeader: boolean;
}

export function GivingPanel({ orgId, orgSlug, orgName, isLeader }: Props) {
  const { data: profile, isLoading } = useQuery({
    queryKey: ["nonprofit-profile", orgId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("nonprofit_profiles")
        .select("*")
        .eq("org_id", orgId)
        .maybeSingle();
      if (error) throw error;
      return (data ?? null) as Profile | null;
    },
  });

  const { data: gifts } = useQuery({
    queryKey: ["nonprofit-gifts", orgId],
    enabled: isLeader,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("donations")
        .select("*")
        .eq("org_id", orgId)
        .order("created_at", { ascending: false })
        .limit(50);
      if (error) throw error;
      return (data ?? []) as Donation[];
    },
  });

  const { data: grants } = useQuery({
    queryKey: ["org-grants", orgId],
    queryFn: () => grantsForOrg(orgId),
  });

  if (isLoading) {
    return (
      <div className="flex justify-center py-10">
        <Loader2 className="h-4 w-4 animate-spin text-ink-soft" />
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="rounded-2xl border border-border bg-card p-4 shadow-soft">
        <p className="text-[12.5px] leading-relaxed text-ink-soft">
          This organization isn't set up to receive gifts yet.
        </p>
        {isLeader && (
          <Link
            to="/community/manage/$slug"
            params={{ slug: orgSlug }}
            className="mt-3 inline-flex text-[12.5px] text-brass"
          >
            Set up giving details
          </Link>
        )}
      </div>
    );
  }

  const lane = findLane(profile.lane);
  const paid = (gifts ?? []).filter(g => g.status === "paid");
  const total = paid.reduce((sum, g) => sum + g.amount_cents, 0);
  const monthly = paid.filter(g => g.frequency === "monthly");
  const monthlyValue = [
    ...new Map(monthly.map(g => [g.stripe_subscription_id ?? g.id, g])).values(),
  ].reduce((sum, g) => sum + g.amount_cents, 0);

  return (
    <div className="space-y-4">
      <div className="rounded-2xl border border-border bg-card p-4 shadow-soft">
        <p className="text-[10px] uppercase tracking-[0.2em] text-brass">
          {lane ? lane.label : "Giving lane"}
        </p>
        <p className="mt-1.5 text-[13px] leading-relaxed text-ink">
          {profile.mission}
        </p>
        <div className="mt-2.5 flex items-center gap-2 text-[11.5px] text-ink-soft">
          <span className="rounded-full border border-border bg-paper px-2 py-0.5 text-[10px] uppercase tracking-[0.12em]">
            {tierLabel[profile.tier as Tier] ?? profile.tier}
          </span>
          <span>
            <span className="text-ink">{profile.to_program}¢</span> of every dollar to program
          </span>
        </div>
        {profile.accepting ? (
          <Link
            to="/donate/$slug"
            params={{ slug: orgSlug }}
            className="tap-scale mt-3.5 flex items-center justify-center gap-2 rounded-xl bg-ink py-2.5 text-[13px] font-medium text-paper"
          >
            <HandCoins className="h-4 w-4" /> Give to {orgName}
          </Link>
        ) : (
          <p className="mt-3 text-[12px] italic text-ink-soft">
            Gifts are paused right now.
          </p>
        )}
        {isLeader && (
          <Link
            to="/community/profile/$slug"
            params={{ slug: orgSlug }}
            className="mt-3 inline-flex text-[12.5px] text-brass"
          >
            Edit profile, alerts and messages
          </Link>
        )}
      </div>

      <GrantsBlock rows={grants ?? []} isLeader={isLeader} />

      {isLeader && (
        <div className="rounded-2xl border border-border bg-card p-4 shadow-soft">
          <p className="text-[10px] uppercase tracking-[0.2em] text-brass">Gifts received</p>
          <div className="mt-3 grid grid-cols-3 gap-2">
            <Stat label="Received" value={money(total)} />
            <Stat label="Monthly" value={money(monthlyValue)} />
            <Stat label="Gifts" value={String(paid.length)} />
          </div>

          {(gifts ?? []).length === 0 ? (
            <p className="mt-3.5 text-[12.5px] text-ink-soft">
              No gifts yet. Share your page and they'll show up here.
            </p>
          ) : (
            <div className="mt-3.5 space-y-2">
              {(gifts ?? []).map(g => (
                <div key={g.id} className="rounded-xl border border-border bg-paper p-3">
                  <div className="flex items-center justify-between gap-2">
                    <p className="text-[14px] text-ink">
                      {money(g.amount_cents)}
                      {g.frequency === "monthly" && (
                        <span className="ml-1.5 inline-flex items-center gap-1 text-[11px] text-brass">
                          <Repeat className="h-3 w-3" /> monthly
                        </span>
                      )}
                    </p>
                    <span
                      className={`rounded-full px-2 py-0.5 text-[10px] uppercase tracking-[0.12em] ${
                        STATUS_STYLE[g.status] ?? "bg-secondary text-ink-soft"
                      }`}
                    >
                      {g.status}
                    </span>
                  </div>
                  <p className="mt-1 text-[11.5px] text-ink-soft">
                    {g.donor_name || "Given quietly"} · {DATE.format(new Date(g.created_at))}
                    {g.email ? ` · ${g.email}` : ""}
                  </p>
                  {g.note && (
                    <p className="mt-1.5 text-[12px] italic leading-snug text-ink">"{g.note}"</p>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-border bg-paper px-2 py-2.5 text-center">
      <p className="font-serif text-[16px] text-ink">{value}</p>
      <p className="mt-0.5 text-[10px] uppercase tracking-[0.14em] text-ink-soft">{label}</p>
    </div>
  );
}

/** Grants recommended out of donor-advised funds — real support, no card involved. */
function GrantsBlock({ rows, isLeader }: { rows: Grant[]; isLeader: boolean }) {
  const visible = isLeader ? rows : rows.filter(g => g.status === "received");
  if (visible.length === 0) return null;
  const totals = grantTotals(visible);

  return (
    <div className="rounded-2xl border border-border bg-card p-4 shadow-soft">
      <p className="inline-flex items-center gap-1.5 text-[10px] uppercase tracking-[0.2em] text-brass">
        <Landmark className="h-3 w-3" /> Fund grants
      </p>
      <div className="mt-3 grid grid-cols-3 gap-2">
        <Stat label="Granted" value={money(totals.receivedCents)} />
        <Stat label="Expected" value={money(totals.expectedCents)} />
        <Stat label="Grants" value={String(totals.receivedCount)} />
      </div>
      <div className="mt-3.5 space-y-2">
        {visible.slice(0, 12).map(g => (
          <div key={g.id} className="rounded-xl border border-border bg-paper p-3">
            <div className="flex items-center justify-between gap-2">
              <p className="text-[14px] text-ink">{money(g.amount_cents)}</p>
              {g.status === "expected" && (
                <span className="rounded-full bg-secondary px-2 py-0.5 text-[10px] uppercase tracking-[0.12em] text-ink-soft">
                  {statusLabel[g.status as GrantStatus]}
                </span>
              )}
            </div>
            <p className="mt-1 text-[11.5px] text-ink-soft">
              {grantorName(g)}
              {g.fund_name ? ` · ${g.fund_name}` : ""}
              {g.sponsor ? ` · ${g.sponsor}` : ""} · {DATE.format(new Date(`${g.granted_on}T12:00:00`))}
            </p>
          </div>
        ))}
      </div>
      <p className="mt-3 text-[11.5px] leading-relaxed text-ink-soft">
        Recommended from a donor-advised fund and paid straight to this organization.
      </p>
    </div>
  );
}
