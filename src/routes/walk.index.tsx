import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { GroupBadges } from "@/components/walk/GroupBadges";
import { Shield, Users, Phone, Clock, ChevronRight, Building2, HandHeart, Heart, HandCoins } from "lucide-react";
import { useSession } from "@/hooks/useSession";
import { loadGroups, type WalkGroup } from "@/lib/groups";
import { usePrefs } from "@/hooks/usePrefs";
import { toneFor } from "@/lib/tone";

export const Route = createFileRoute("/walk/")({
  staticData: { sitemap: false },
  component: WalkWith,
  head: () => ({
    meta: [
      { title: "Community — circles and organizations · Witness" },
      {
        name: "description",
        content:
          "Your circles, churches, nonprofits, community groups, and nearby ways to help — together in one place.",
      },
      { property: "og:title", content: "Community · Witness" },
      {
        property: "og:description",
        content: "Find your circles, local organizations, and practical ways to help.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
});

function WalkWith() {
  const { userId } = useSession();
  const { prefs } = usePrefs();
  const tone = toneFor(prefs);
  const q = useQuery({ queryKey: ["groups", userId ?? "anon"], queryFn: () => loadGroups(userId ?? null), enabled: userId !== undefined });
  const groups = q.data ?? [];
  const joined = groups.filter(g => g.joined);
  // Someone who chose the plain door doesn't get shown the faith circles.
  const faith = tone.faith ? groups.filter(g => !g.joined && g.kind === "faith") : [];
  const open = groups.filter(g => !g.joined && g.kind === "open");
  const [showAll, setShowAll] = useState(false);
  const available = [...faith, ...open];
  const visible = showAll ? available : available.slice(0, 4);

  return (
    <div className="px-5 pt-6 pb-10 md:mx-auto md:max-w-3xl md:px-0 md:pt-9 lg:max-w-5xl">
      <header className="mb-6">
        <p className="text-[11px] uppercase tracking-[0.22em] text-brass">Together, in practical ways</p>
        <h1 className="mt-2 font-serif text-[30px] leading-tight text-ink">Community</h1>
        <p className="mt-2 text-[13px] text-ink-soft leading-relaxed">
          What would you like to do today?
        </p>
      </header>

      <section aria-label="Choose how to take part" className="mb-8 grid gap-3 md:grid-cols-3">
        <Link to="/" className="tap-scale flex min-h-32 items-start gap-3 rounded-2xl border border-brass/35 bg-card p-4 shadow-soft md:flex-col md:p-5">
          <Heart className="mt-0.5 h-5 w-5 shrink-0 text-brass" strokeWidth={1.8} />
          <span className="min-w-0">
            <span className="block font-serif text-[19px] leading-tight text-ink">{tone.faith ? "Pray" : "Encourage"}</span>
            <span className="mt-1.5 block text-[12.5px] leading-relaxed text-ink-soft">{tone.faith ? "Carry a prayer, share one, or find a supportive circle." : "Stand with someone, share a hope, or find a supportive circle."}</span>
          </span>
          <ChevronRight className="ml-auto mt-1 h-4 w-4 shrink-0 text-brass md:ml-0 md:mt-auto" />
        </Link>
        <Link to="/needs" className="tap-scale flex min-h-32 items-start gap-3 rounded-2xl border border-hope/40 bg-card p-4 shadow-soft md:flex-col md:p-5">
          <HandHeart className="mt-0.5 h-5 w-5 shrink-0 text-hope" strokeWidth={1.8} />
          <span className="min-w-0">
            <span className="block font-serif text-[19px] leading-tight text-ink">Help</span>
            <span className="mt-1.5 block text-[12.5px] leading-relaxed text-ink-soft">Offer your time or skills for a practical need.</span>
          </span>
          <ChevronRight className="ml-auto mt-1 h-4 w-4 shrink-0 text-hope md:ml-0 md:mt-auto" />
        </Link>
        <Link to="/giving" className="tap-scale flex min-h-32 items-start gap-3 rounded-2xl border border-border bg-card p-4 shadow-soft md:flex-col md:p-5">
          <HandCoins className="mt-0.5 h-5 w-5 shrink-0 text-brass" strokeWidth={1.8} />
          <span className="min-w-0">
            <span className="block font-serif text-[19px] leading-tight text-ink">Give</span>
            <span className="mt-1.5 block text-[12.5px] leading-relaxed text-ink-soft">Fund a need, give to an organization, or support Witness.</span>
          </span>
          <ChevronRight className="ml-auto mt-1 h-4 w-4 shrink-0 text-brass md:ml-0 md:mt-auto" />
        </Link>
      </section>

      {q.isLoading ? (
        <div className="space-y-3">{[0, 1, 2].map(i => <div key={i} className="h-28 rounded-2xl bg-card border border-border animate-pulse" />)}</div>
      ) : q.isError ? (
        <p className="text-center text-[13px] text-destructive">Couldn't load the circles right now.</p>
      ) : (
        <>
          <div>
          {joined.length > 0 && (
            <section aria-labelledby="your-circles" className="mb-8">
              <h2 id="your-circles" className="px-1 font-serif text-[13px] text-ink-soft mb-3 uppercase tracking-[0.18em]">My circles</h2>
              <div className="grid gap-3 md:grid-cols-2">
                {joined.map(g => <GroupCard key={g.id} group={g} />)}
              </div>
            </section>
          )}

          <section aria-labelledby="explore-community">
            <h2 id="explore-community" className="mb-3 px-1 font-serif text-[13px] uppercase tracking-[0.18em] text-ink-soft">Explore community</h2>
            <div className="mb-6 grid gap-2 md:grid-cols-2">
              <Link to="/community" className="tap-scale flex items-start gap-3 rounded-2xl border border-border bg-card p-4 shadow-soft">
                <Building2 className="mt-0.5 h-4 w-4 shrink-0 text-brass" />
                <span className="min-w-0"><span className="block font-serif text-[15.5px] text-ink">{tone.faith ? "Churches & organizations" : "Organizations & nonprofits"}</span><span className="mt-0.5 block text-[11.5px] text-ink-soft">{tone.faith ? "Find churches, nonprofits, ministries, and events." : "Find nonprofits, community groups, and events."}</span></span>
                <ChevronRight className="ml-auto mt-1 h-3.5 w-3.5 shrink-0 text-ink-soft" />
              </Link>
              <Link to="/serve" className="tap-scale flex items-start gap-3 rounded-2xl border border-border bg-card p-4 shadow-soft">
                <HandHeart className="mt-0.5 h-4 w-4 shrink-0 text-hope" />
                <span className="min-w-0"><span className="block font-serif text-[15.5px] text-ink">Ways to help</span><span className="mt-0.5 block text-[11.5px] text-ink-soft">Volunteer, lend a skill, or support a build.</span></span>
                <ChevronRight className="ml-auto mt-1 h-3.5 w-3.5 shrink-0 text-ink-soft" />
              </Link>
            </div>
            <div className="mb-3 flex items-end justify-between gap-3 px-1">
              <div>
                <h3 className="font-serif text-[13px] uppercase tracking-[0.18em] text-ink-soft">Find a circle</h3>
                <p className="mt-1 text-[11.5px] text-ink-soft">Small, confidential groups for heavy seasons.</p>
              </div>
              {available.length > 4 && (
                <button type="button" onClick={() => setShowAll(value => !value)} className="shrink-0 text-[12px] text-brass">
                  {showAll ? "Show less" : `See all ${available.length}`}
                </button>
              )}
            </div>
            <div className="space-y-3 mb-7">
              {visible.map(g => <GroupCard key={g.id} group={g} />)}
              {available.length === 0 && <p className="text-[13px] text-ink-soft italic">No circles open yet.</p>}
            </div>
          </section>
          </div>
        </>
      )}

      <div className="flex items-center justify-between gap-3 border-t border-border px-1 pt-4 text-[11.5px] text-ink-soft">
        <span className="inline-flex items-center gap-1.5"><Shield className="h-3.5 w-3.5" /> Need help right now?</span>
        <span className="flex items-center gap-3"><a href="tel:988" className="inline-flex items-center gap-1 text-ink"><Phone className="h-3.5 w-3.5" /> 988</a><Link to="/help" className="text-brass">More help</Link></span>
      </div>
    </div>
  );
}

function GroupCard({ group }: { group: WalkGroup }) {
  return (
    <Link
      to="/walk/$id"
      params={{ id: group.id }}
      aria-label={`${group.topic} — ${group.cadence}, ${group.seats_open} seats open`}
      className="block bg-card rounded-2xl border border-border p-4 shadow-soft hover:border-brass/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brass/50 transition-colors tap-scale"
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="font-serif text-[17px] text-ink leading-tight">{group.topic}</p>
          <p className="mt-1.5 text-[13px] text-ink-soft leading-snug">{group.blurb}</p>
        </div>
        {group.joined ? (
          <span className="text-[10px] uppercase tracking-[0.16em] text-hope shrink-0">In</span>
        ) : (
          <ChevronRight className="h-4 w-4 shrink-0 text-ink-soft" aria-hidden="true" />
        )}
      </div>
      <div className="mt-3">
        <GroupBadges group={group} />
      </div>
      <p className="mt-2 text-[10px] uppercase tracking-[0.14em] text-ink-soft">{group.kind === "faith" ? "Faith circle" : "Open circle"}</p>
      <div className="mt-3 flex items-center justify-between gap-2 text-[11px] text-ink-soft">
        <span className="inline-flex items-center gap-1.5"><Clock className="h-3 w-3" aria-hidden="true" /> {group.cadence}</span>
        <span className="inline-flex items-center gap-1.5"><Users className="h-3 w-3" aria-hidden="true" /> {group.members} walking{group.facilitator ? ` · ${group.facilitator.name}` : ""}</span>
      </div>
    </Link>
  );
}
