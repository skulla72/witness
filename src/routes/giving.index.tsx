import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { ArrowLeft, ArrowRight, HandCoins, Clock, Wrench, Building2, Sparkles, Hammer, Scale, Lightbulb, Search, HeartHandshake } from "lucide-react";
import { BRAND } from "@/config/brand";
import { LANES, laneLine, laneTotals, myPledges, partnersFor, lanesForCategory } from "@/data/giving";
import { usePrefs } from "@/hooks/usePrefs";
import { useSession } from "@/hooks/useSession";
import { myPrayers } from "@/data/seed";
import { MyGifts } from "@/components/giving/MyGifts";
import { SavedMethods } from "@/components/giving/SavedMethods";
import { StandingCard } from "@/components/perks/StandingCard";
import { getStripeEnvironment } from "@/lib/stripe";
import { getMyStanding } from "@/lib/perks.functions";
import { getImpactTotals } from "@/lib/impact.functions";
import { myRoles } from "@/lib/prayers";

export const Route = createFileRoute("/giving/")({
  staticData: { sitemap: true },
  component: GivingIndex,
  head: () => ({
    meta: [
      { title: `Give to a need, organization, or ${BRAND.name}` },
      {
        name: "description",
        content:
          `Choose a specific need, a church or nonprofit, or support ${BRAND.name} directly.`,
      },
      { property: "og:title", content: `Choose where to give · ${BRAND.name}` },
      {
        property: "og:description",
        content: "Give to a practical need, a trusted organization, or support Witness directly.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
});

function safeEnv(): "sandbox" | "live" {
  try { return getStripeEnvironment(); } catch { return "sandbox"; }
}

/** Team-only shortcut for recording donor-advised fund grants. */
function TeamGrantsLink() {
  const { userId } = useSession();
  const q = useQuery({ queryKey: ["roles", userId], queryFn: () => myRoles(userId!), enabled: !!userId });
  if (!(q.data ?? []).includes("admin")) return null;
  return (
    <section className="mx-4 mb-4 space-y-2">
      <Link
        to="/admin/grants"
        className="tap-scale flex items-center justify-between rounded-2xl border border-border bg-card px-4 py-3 text-[13px] text-ink shadow-soft"
      >
        <span className="inline-flex items-center gap-2">
          <Scale className="h-4 w-4 text-brass" /> Team: record fund grants
        </span>
        <ArrowRight className="h-3.5 w-3.5 text-ink-soft" />
      </Link>
      <Link
        to="/admin/suggestions"
        className="tap-scale flex items-center justify-between rounded-2xl border border-border bg-card px-4 py-3 text-[13px] text-ink shadow-soft"
      >
        <span className="inline-flex items-center gap-2">
          <Lightbulb className="h-4 w-4 text-brass" /> Team: suggested nonprofits
        </span>
        <ArrowRight className="h-3.5 w-3.5 text-ink-soft" />
      </Link>
      <Link
        to="/admin/pros"
        className="tap-scale flex items-center justify-between rounded-2xl border border-border bg-card px-4 py-3 text-[13px] text-ink shadow-soft"
      >
        <span className="inline-flex items-center gap-2">
          <Lightbulb className="h-4 w-4 text-brass" /> Team: professional pages
        </span>
        <ArrowRight className="h-3.5 w-3.5 text-ink-soft" />
      </Link>
      <Link
        to="/admin/claims"
        className="tap-scale flex items-center justify-between rounded-2xl border border-border bg-card px-4 py-3 text-[13px] text-ink shadow-soft"
      >
        <span className="inline-flex items-center gap-2">
          <Lightbulb className="h-4 w-4 text-brass" /> Team: page claims
        </span>
        <ArrowRight className="h-3.5 w-3.5 text-ink-soft" />
      </Link>
      <Link
        to="/admin/invites"
        className="tap-scale flex items-center justify-between rounded-2xl border border-border bg-card px-4 py-3 text-[13px] text-ink shadow-soft"
      >
        <span className="inline-flex items-center gap-2">
          <Lightbulb className="h-4 w-4 text-brass" /> Team: inviting organizations
        </span>
        <ArrowRight className="h-3.5 w-3.5 text-ink-soft" />
      </Link>
      <Link
        to="/admin/testimonials"
        className="tap-scale flex items-center justify-between rounded-2xl border border-border bg-card px-4 py-3 text-[13px] text-ink shadow-soft"
      >
        <span className="inline-flex items-center gap-2">
          <Sparkles className="h-4 w-4 text-brass" /> Team: success stories
        </span>
        <ArrowRight className="h-3.5 w-3.5 text-ink-soft" />
      </Link>
    </section>
  );
}


/** Your rung on the Sender ledger. Private — only you see the numbers. */
function MyGivingStanding() {
  const { userId } = useSession();
  const q = useQuery({
    queryKey: ["standing", userId],
    queryFn: () => getMyStanding({ data: { environment: safeEnv() } }),
    enabled: !!userId,
  });
  if (!userId || !q.data) return null;
  const open = q.data.sender.picks.filter(p => !p.selection).length;
  return (
    <section className="mx-4 mb-4">
      <StandingCard ledger="sender" total={q.data.sender.total} tiers={q.data.tiers} compact />
      {open > 0 && (
        <Link to="/perks" className="mt-2 inline-flex items-center gap-1 px-1 text-[12px] text-brass">
          {open === 1 ? "A thank-you gift is waiting for you to choose" : `${open} thank-you gifts are waiting for you to choose`} <ArrowRight className="h-3 w-3" />
        </Link>
      )}
    </section>
  );
}

/** Community-wide running totals, public to everyone. */
function CommunityImpact() {
  const q = useQuery({
    queryKey: ["impact-totals"],
    queryFn: () => getImpactTotals(),
    staleTime: 60_000,
  });
  const given = q.data?.givenCents ?? 0;
  const hours = q.data?.hoursServed ?? 0;
  const dollars = (given / 100).toLocaleString(undefined, { maximumFractionDigits: 0 });
  const hoursText = hours.toLocaleString(undefined, { maximumFractionDigits: 1 });
  return (
    <section className="mx-4 mt-8 rounded-2xl border border-brass/35 bg-card p-5 shadow-soft">
      <p className="text-[10px] uppercase tracking-[0.2em] text-brass">Together so far</p>
      <div className="mt-3 flex items-start gap-6">
        <span className="min-w-0">
          <span className="block font-serif text-[26px] leading-tight text-ink">${dollars}</span>
          <span className="mt-0.5 block text-[11.5px] leading-snug text-ink-soft">
            given through {BRAND.name} to needs and organizations
          </span>
        </span>
        <span className="min-w-0">
          <span className="block font-serif text-[26px] leading-tight text-ink">{hoursText}</span>
          <span className="mt-0.5 block text-[11.5px] leading-snug text-ink-soft">
            verified hours served
          </span>
        </span>
      </div>
    </section>
  );
}

function GivingIndex() {
  const { prefs } = usePrefs();

  // Story matching: your own asks quietly point at a lane.
  const mine = myPrayers();
  const storyLanes = [
    ...new Set(mine.flatMap(p => lanesForCategory(p.category).map(l => l.key))),
  ].slice(0, 2);

  const ordered = [...LANES].sort((a, b) => {
    const score = (k: typeof a.key) =>
      (prefs.lanes.includes(k) ? 2 : 0) + (storyLanes.includes(k) ? 1 : 0);
    return score(b.key) - score(a.key);
  });

  return (
    <div className="pb-14">
      <div className="px-4 pt-3">
        <Link to="/profile" className="inline-flex items-center gap-1 text-[13px] text-ink-soft">
          <ArrowLeft className="h-4 w-4" /> Back
        </Link>
      </div>

      <header className="mb-6 px-5 pt-3">
        <p className="text-[11px] uppercase tracking-[0.22em] text-brass">Give</p>
        <h1 className="mt-2 font-serif text-[30px] leading-tight text-ink">Where would you like to help?</h1>
        <p className="mt-2 text-[13px] leading-relaxed text-ink-soft">
          Choose one place to start. You can review the details before any payment is made.
        </p>
      </header>

      <section aria-label="Choose where to give" className="mx-4 mb-8 grid gap-3 md:grid-cols-3">
        <Link
          to="/needs"
          className="tap-scale flex min-h-44 flex-col rounded-2xl border border-hope/40 bg-card p-5 shadow-soft"
        >
          <Hammer className="h-5 w-5 text-hope" strokeWidth={1.8} />
          <p className="mt-2 font-serif text-[19px] leading-tight text-ink">
            Fund a specific need
          </p>
          <p className="mt-1.5 text-[12.5px] leading-relaxed text-ink-soft">
            Help complete practical work and see what the gift made possible.
          </p>
          <span className="mt-auto inline-flex items-center gap-1 pt-4 text-[12.5px] text-ink">
            See current needs <ArrowRight className="h-3.5 w-3.5" />
          </span>
        </Link>
        <Link
          to="/giving/nonprofits"
          className="tap-scale flex min-h-44 flex-col rounded-2xl border border-brass/35 bg-card p-5 shadow-soft"
        >
          <Search className="h-5 w-5 text-brass" strokeWidth={1.8} />
          <p className="mt-2 font-serif text-[19px] leading-tight text-ink">
            Give to an organization
          </p>
          <p className="mt-1.5 text-[12.5px] leading-relaxed text-ink-soft">
            Search churches and nonprofits by name, place, or cause.
          </p>
          <span className="mt-auto inline-flex items-center gap-1 pt-4 text-[12.5px] text-ink">
            Find an organization <ArrowRight className="h-3.5 w-3.5" />
          </span>
        </Link>
        <Link
          to="/giving/witness"
          className="tap-scale flex min-h-44 flex-col rounded-2xl border border-border bg-card p-5 shadow-soft"
        >
          <HeartHandshake className="h-5 w-5 text-brass" strokeWidth={1.8} />
          <p className="mt-2 font-serif text-[19px] leading-tight text-ink">
            Support {BRAND.name}
          </p>
          <p className="mt-1.5 text-[12.5px] leading-relaxed text-ink-soft">
            Help keep this place available without ads. This gift is not tax-deductible.
          </p>
          <span className="mt-auto inline-flex items-center gap-1 pt-4 text-[12.5px] text-ink">
            Support {BRAND.name} <ArrowRight className="h-3.5 w-3.5" />
          </span>
        </Link>
      </section>

      <h2 className="mx-5 mb-3 font-serif text-[13px] uppercase tracking-[0.18em] text-ink-soft">Your giving</h2>
      <MyGifts />

      <SavedMethods />

      <MyGivingStanding />

      <section className="mx-4 mb-3 mt-7">
        <h2 className="px-1 font-serif text-[13px] uppercase tracking-[0.18em] text-ink-soft">Explore more</h2>
      </section>

      <section className="mx-4 mb-6">
        <Link
          to="/spotlight"
          className="tap-scale block rounded-2xl border border-brass/30 bg-card p-5 shadow-soft"
        >
          <p className="inline-flex items-center gap-1.5 text-[10px] uppercase tracking-[0.2em] text-brass">
            <Sparkles className="h-3 w-3" /> Nonprofit of the week
          </p>
          <p className="mt-2 font-serif text-[19px] leading-tight text-ink">
            One organization, told properly
          </p>
          <p className="mt-1.5 text-[12.5px] leading-relaxed text-ink-soft">
            Meet this week's featured nonprofit and understand what its work makes possible.
          </p>
          <span className="mt-3 inline-flex items-center gap-1 text-[12.5px] text-ink">
            Read this week's story <ArrowRight className="h-3.5 w-3.5" />
          </span>
        </Link>
      </section>

      <section className="mx-4 mb-6">
        <Link
          to="/giving/fund"
          className="tap-scale block rounded-2xl border border-brass/35 bg-card p-5 shadow-soft"
        >
          <p className="inline-flex items-center gap-1.5 text-[10px] uppercase tracking-[0.2em] text-brass">
            <Scale className="h-3 w-3" /> Spread it out
          </p>
          <p className="mt-2 font-serif text-[19px] leading-tight text-ink">One gift, divided evenly</p>
          <p className="mt-1.5 text-[12.5px] leading-relaxed text-ink-soft">
            Split one gift between every vetted nonprofit, or within one cause.
          </p>
          <span className="mt-3 inline-flex items-center gap-1 text-[12.5px] text-ink">Give across the board <ArrowRight className="h-3.5 w-3.5" /></span>
        </Link>
      </section>


      {storyLanes.length > 0 && (
        <section className="mx-4 mb-6 rounded-2xl border border-flame/25 bg-card p-5 shadow-soft">
          <p className="inline-flex items-center gap-1.5 text-[10px] uppercase tracking-[0.2em] text-flame">
            <Sparkles className="h-3 w-3" /> Give where you were broken
          </p>
          <p className="mt-2 text-[13px] leading-relaxed text-ink">
            You've carried things in this app. These are the lanes where what you went through
            pays for someone else's way out.
          </p>
          <div className="mt-3 space-y-2">
            {storyLanes.map(k => {
              const lane = LANES.find(l => l.key === k)!;
              return (
                <Link
                  key={k}
                  to="/giving/$lane"
                  params={{ lane: k }}
                  className="tap-scale flex items-center gap-2 rounded-xl border border-border bg-paper px-3.5 py-3"
                >
                  <span className="min-w-0">
                    <span className="block font-serif text-[14.5px] leading-tight text-ink">{lane.label}</span>
                    <span className="mt-0.5 block text-[11.5px] italic text-ink-soft">{laneLine(lane, prefs.gender)}</span>
                  </span>
                  <ArrowRight className="ml-auto h-3.5 w-3.5 shrink-0 text-ink-soft" />
                </Link>
              );
            })}
          </div>
        </section>
      )}

      {myPledges.length > 0 && (
        <section className="mx-4 mb-6 rounded-2xl border border-border bg-card p-5 shadow-soft">
          <p className="text-[10px] uppercase tracking-[0.2em] text-brass">Your standing pledges</p>
          {myPledges.map(p => {
            const lane = LANES.find(l => l.key === p.lane)!;
            return (
              <div key={p.lane} className="mt-2.5">
                <p className="font-serif text-[19px] leading-tight text-ink">
                  ${p.monthly}/mo · {lane.label}
                </p>
                <p className="mt-1 text-[12px] text-ink-soft">
                  Since {p.since} · ${p.given_total.toLocaleString()} given · split across{" "}
                  {partnersFor(p.lane).length} vetted partners
                </p>
              </div>
            );
          })}
        </section>
      )}

      <section className="px-4">
        <h2 className="mb-3 px-1 font-serif text-[13px] uppercase tracking-[0.18em] text-ink-soft">
          The lanes
        </h2>
        <div className="space-y-3">
          {ordered.map(l => {
            const t = laneTotals[l.key];
            const pct = Math.round((t.distributed / t.quarter) * 100);
            const chosen = prefs.lanes.includes(l.key);
            return (
              <Link
                key={l.key}
                to="/giving/$lane"
                params={{ lane: l.key }}
                className={`tap-scale block rounded-2xl border bg-card p-4 shadow-soft ${
                  chosen ? "border-brass/45" : "border-border"
                }`}
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="font-serif text-[17px] leading-tight text-ink">{l.label}</p>
                    <p className="mt-1 text-[12.5px] italic leading-snug text-ink-soft">{laneLine(l, prefs.gender)}</p>
                  </div>
                  {chosen && (
                    <span className="shrink-0 rounded-full border border-brass/40 bg-brass/10 px-2 py-0.5 text-[10px] uppercase tracking-[0.12em] text-brass">
                      Yours
                    </span>
                  )}
                </div>
                <p className="mt-2.5 text-[12px] text-ink-soft">{l.buys}</p>
                <div className="mt-3 h-1 overflow-hidden rounded-full bg-secondary">
                  <div className="h-full bg-brass" style={{ width: `${pct}%` }} />
                </div>
                <div className="mt-1.5 flex items-center justify-between text-[11px] text-ink-soft">
                  <span>
                    ${t.distributed.toLocaleString()} distributed of ${t.quarter.toLocaleString()}
                  </span>
                  <span>{t.givers.toLocaleString()} givers</span>
                </div>
              </Link>
            );
          })}
        </div>
      </section>

      <section className="mt-7 px-4">
        <h2 className="mb-3 px-1 font-serif text-[13px] uppercase tracking-[0.18em] text-ink-soft">
          Four ways to give
        </h2>
        <div className="space-y-2">
          {[
            { Icon: HandCoins, title: "Fund it", sub: "Monthly lane pledge or one-time gift, split across vetted partners." },
            { Icon: Clock, title: "Show up", sub: "Real shifts with dates, places and seats left." },
            { Icon: Wrench, title: "Lend a skill", sub: "Framing, CDL, tax prep, welding, IT — what you already know." },
            { Icon: Building2, title: "Build the org", sub: "Capacity Corps: fractional CFO, ops and governance, pro bono." },
          ].map(({ Icon, title, sub }) => (
            <Link
              key={title}
              to="/serve"
              className="tap-scale flex items-start gap-3 rounded-2xl border border-border bg-card p-4"
            >
              <Icon className="mt-0.5 h-4 w-4 shrink-0 text-brass" strokeWidth={1.8} />
              <span className="min-w-0">
                <span className="block font-serif text-[15px] leading-tight text-ink">{title}</span>
                <span className="mt-0.5 block text-[11.5px] leading-snug text-ink-soft">{sub}</span>
              </span>
            </Link>
          ))}
        </div>
      </section>

      <CommunityImpact />

      <p className="mt-8 px-8 text-center text-[11px] italic text-ink-soft">
        No user-to-user transfers. No prayer prioritization for givers. Ever.
      </p>
    </div>
  );
}
