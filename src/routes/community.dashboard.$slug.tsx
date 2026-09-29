import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { ArrowLeft, Loader2, Hammer, Megaphone, Pencil, ReceiptText, Sprout, Wallet } from "lucide-react";
import { getOrgImpact } from "@/lib/orgImpact.functions";
import { InviteKit } from "@/components/org/InviteKit";
import { STORY_STATUS_LABEL } from "@/lib/needs";
import { BRAND } from "@/config/brand";
import { supabase } from "@/integrations/supabase/client";
import { useSession } from "@/hooks/useSession";
import { ORG_PUBLIC_COLUMNS, type Org } from "@/lib/community";
import { orgHires, payoutAccount } from "@/lib/orgs";
import { orgBilling, type BillingSummary } from "@/lib/billing.functions";
import { whenMonth } from "@/lib/billing";
import { getStripeEnvironment, money } from "@/lib/stripe";
import { laneLabel } from "@/data/serving-lanes";
import { REQUEST_STATUS } from "@/lib/serving";
import { proPlace, rateLine } from "@/lib/pros";

export const Route = createFileRoute("/community/dashboard/$slug")({
  staticData: { sitemap: false },
  component: OrgDashboard,
  head: () => ({
    meta: [
      { title: `Your organization dashboard · ${BRAND.name}` },
      {
        name: "description",
        content:
          "One place for your organization: your account, what you pay each month, and everyone you've hired.",
      },
      { property: "og:title", content: `Your organization dashboard · ${BRAND.name}` },
      {
        property: "og:description",
        content: "Account, balance and hires for your organization, side by side.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
});

const muted = "text-[13px] leading-relaxed text-ink-soft";

function OrgDashboard() {
  const { slug } = Route.useParams();
  const { userId, signedIn } = useSession();

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

  const billing = useQuery({
    queryKey: ["org", "billing", orgId, userId],
    queryFn: async (): Promise<BillingSummary | { error: string }> =>
      orgBilling({ data: { orgId: orgId!, environment: getStripeEnvironment() } }),
    enabled: !!orgId && isLeader,
  });

  const payout = useQuery({
    queryKey: ["org", "payout", orgId],
    queryFn: () => payoutAccount(orgId!),
    enabled: !!orgId && isLeader,
  });

  const impact = useQuery({
    queryKey: ["org", "impact", orgId],
    queryFn: () => getOrgImpact({ data: { orgId: orgId! } }),
    enabled: !!orgId && isLeader,
  });

  const hires = useQuery({
    queryKey: ["org", "hires", orgId],
    queryFn: () => orgHires(orgId!),
    enabled: !!orgId && isLeader,
  });

  if (org.isLoading) {
    return (
      <Shell slug={slug} name="Your organization">
        <div className="flex justify-center py-10">
          <Loader2 className="h-4 w-4 animate-spin text-ink-soft" />
        </div>
      </Shell>
    );
  }
  if (!org.data) {
    return (
      <Shell slug={slug} name="Your organization">
        <p className={muted}>We couldn't find that page.</p>
      </Shell>
    );
  }
  if (signedIn === false || (role.isFetched && !isLeader)) {
    return (
      <Shell slug={slug} name={org.data.name}>
        <p className={muted}>
          Sign in as a leader of {org.data.name} to open the dashboard.
        </p>
        <Link to="/login" className="mt-3 inline-flex text-[12.5px] text-brass">
          Sign in
        </Link>
      </Shell>
    );
  }

  const b = billing.data && !("error" in billing.data) ? billing.data : null;
  const carried = b?.lines.filter(l => l.status === "active" || l.status === "past_due") ?? [];
  const list = hires.data ?? [];
  const hired = list.filter(h => h.pro);

  const im = impact.data && !("error" in impact.data) ? impact.data : null;

  return (
    <Shell slug={slug} name={org.data.name}>
      <InviteKit slug={slug} name={org.data.name} />
      {/* Impact */}
      <section className="rounded-2xl border border-border bg-card p-4 shadow-soft">
        <h2 className="mb-3 flex items-center gap-1.5 text-[11px] uppercase tracking-[0.18em] text-ink-soft">
          <Sprout className="h-3.5 w-3.5" /> Your impact
        </h2>
        {impact.isLoading ? (
          <Loader2 className="h-4 w-4 animate-spin text-ink-soft" />
        ) : !im ? (
          <p className={muted}>We couldn't read your impact just now.</p>
        ) : (
          <>
            <div className="grid grid-cols-3 gap-2">
              <Stat label="Gifts received" value={money(im.giftsCents)} sub={`${im.giftCount} ${im.giftCount === 1 ? "gift" : "gifts"}`} />
              <Stat label="Hours served" value={im.hoursServed.toLocaleString()} sub={im.hoursPending ? `${im.hoursPending} waiting` : "verified"} />
              <Stat label="Stories pending" value={String(im.pendingStories.length)} sub={`${im.publishedStories} published`} />
            </div>
            {im.pendingStories.length > 0 && (
              <ul className="mt-3 space-y-1.5">
                {im.pendingStories.map(s => (
                  <li key={s.id} className="flex items-baseline justify-between gap-3 rounded-lg bg-paper px-3 py-2">
                    <span className="min-w-0 truncate text-[12.5px] text-ink">{s.title}</span>
                    <span className="shrink-0 text-[11px] text-ink-soft">
                      {STORY_STATUS_LABEL[s.status] ?? s.status}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </>
        )}
      </section>

      {/* Balance */}
      <section className="rounded-2xl border border-border bg-card p-4 shadow-soft">
        <p className="text-[11px] uppercase tracking-[0.18em] text-ink-soft">Each month</p>
        <p className="mt-1 font-serif text-[30px] leading-none text-ink">
          {b ? money(b.monthlyCents) : "—"}
        </p>
        <p className="mt-2 text-[12.5px] leading-relaxed text-ink-soft">
          {!b
            ? billing.isLoading
              ? "Checking…"
              : "We couldn't read your balance just now."
            : b.monthlyCents
              ? `Next charge ${whenMonth(b.nextChargeAt)}.`
              : "Nothing is being charged right now."}
        </p>
        {carried.length > 0 && (
          <p className="mt-2 text-[12px] text-ink-soft">
            You carry {carried.map(l => l.plan.replace(/_/g, " ")).join(", ")}.
          </p>
        )}
        <Link
          to="/community/payments/$slug"
          params={{ slug }}
          className="mt-3 inline-flex items-center gap-1.5 text-[12.5px] text-brass"
        >
          <ReceiptText className="h-3.5 w-3.5" /> Payments and receipts
        </Link>
      </section>

      {/* Who you've hired */}
      <section className="rounded-2xl border border-border bg-card p-4 shadow-soft">
        <h2 className="mb-2 flex items-center gap-1.5 text-[11px] uppercase tracking-[0.18em] text-ink-soft">
          <Hammer className="h-3.5 w-3.5" /> Who you've hired
        </h2>
        {hires.isLoading ? (
          <Loader2 className="h-4 w-4 animate-spin text-ink-soft" />
        ) : list.length === 0 ? (
          <div>
            <p className={muted}>
              Nothing yet. When you ask for help on behalf of {org.data.name}, the work and whoever
              you hire show up here.
            </p>
            <Link
              to="/hire"
              search={{ lane: undefined }}
              className="mt-3 inline-flex text-[12.5px] text-brass"
            >
              Ask for help with work
            </Link>
          </div>
        ) : (
          <div className="space-y-2">
            {list.map(h => (
              <div key={h.request.id} className="rounded-xl border border-border bg-paper p-3">
                <div className="flex items-baseline justify-between gap-3">
                  <p className="min-w-0 truncate text-[13.5px] text-ink">{h.request.title}</p>
                  <span className="shrink-0 text-[11px] text-ink-soft">
                    {REQUEST_STATUS[h.request.status] ?? h.request.status}
                  </span>
                </div>
                <p className="mt-0.5 text-[11.5px] text-ink-soft">
                  {laneLabel(h.request.lane)}
                  {h.request.city ? ` · ${h.request.city}` : ""}
                </p>
                {h.pro ? (
                  <div className="mt-2.5 flex items-center gap-3">
                    {h.pro.photo_url ? (
                      <img
                        src={h.pro.photo_url}
                        alt={h.pro.display_name}
                        className="h-10 w-10 rounded-full object-cover"
                      />
                    ) : (
                      <div className="h-10 w-10 rounded-full bg-ink/10" />
                    )}
                    <div className="min-w-0">
                      <Link
                        to="/pro/$slug"
                        params={{ slug: h.pro.slug }}
                        className="block truncate text-[13px] text-ink"
                      >
                        {h.pro.display_name}
                      </Link>
                      <p className="truncate text-[11.5px] text-ink-soft">
                        {h.pro.trade} · {rateLine(h.pro)}
                        {proPlace(h.pro) ? ` · ${proPlace(h.pro)}` : ""}
                      </p>
                    </div>
                  </div>
                ) : (
                  <p className="mt-2 text-[12px] text-ink-soft">Nobody hired yet.</p>
                )}
                <Link
                  to="/requests/$id"
                  params={{ id: h.request.id }}
                  className="mt-2 inline-flex text-[12px] text-brass"
                >
                  Open the ask
                </Link>
              </div>
            ))}
          </div>
        )}
        {hired.length > 0 && (
          <p className="mt-3 text-[11px] text-ink-soft">
            {hired.length} {hired.length === 1 ? "person" : "people"} hired through your page.
          </p>
        )}
      </section>

      {/* Account */}
      <section className="rounded-2xl border border-border bg-card p-4 shadow-soft">
        <h2 className="mb-2 flex items-center gap-1.5 text-[11px] uppercase tracking-[0.18em] text-ink-soft">
          <Wallet className="h-3.5 w-3.5" /> Your account
        </h2>
        <p className={muted}>
          Where gifts land:{" "}
          {payout.data
            ? payout.data.status === "verified"
              ? "confirmed by our team."
              : "waiting on our team to confirm it."
            : "not set up yet."}
        </p>
        <div className="mt-3 flex flex-col gap-2">
          <Link
            to="/community/profile/$slug"
            params={{ slug }}
            className="inline-flex items-center gap-1.5 text-[12.5px] text-brass"
          >
            <Pencil className="h-3.5 w-3.5" /> Your details, alerts and messages
          </Link>
          <Link
            to="/community/manage/$slug"
            params={{ slug }}
            className="inline-flex items-center gap-1.5 text-[12.5px] text-brass"
          >
            <Megaphone className="h-3.5 w-3.5" /> Announcements, giving details and your plan
          </Link>
          <Link
            to="/community/$slug"
            params={{ slug }}
            className="text-[12.5px] text-ink-soft"
          >
            See the page the way your people see it
          </Link>
        </div>
      </section>
    </Shell>
  );
}

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
          to="/community/$slug"
          params={{ slug }}
          className="inline-flex items-center gap-1 text-[13px] text-ink-soft"
        >
          <ArrowLeft className="h-4 w-4" /> {name}
        </Link>
      </div>
      <header className="px-5 pt-3">
        <p className="text-[11px] uppercase tracking-[0.22em] text-brass">Dashboard</p>
        <h1 className="mt-2 font-serif text-[27px] leading-tight text-ink">{name}</h1>
        <p className="mt-2 text-[13px] leading-relaxed text-ink-soft">
          Your account, what you pay, and everyone you've hired — in one place.
        </p>
      </header>
      <div className="space-y-4 px-4 pt-5">{children}</div>
    </div>
  );
}

function Stat({ label, value, sub }: { label: string; value: string; sub: string }) {
  return (
    <div className="rounded-xl border border-border bg-paper p-2.5">
      <p className="text-[10px] uppercase tracking-[0.14em] text-ink-soft">{label}</p>
      <p className="mt-1 font-serif text-[20px] leading-none text-ink">{value}</p>
      <p className="mt-1 text-[10.5px] text-ink-soft">{sub}</p>
    </div>
  );
}
