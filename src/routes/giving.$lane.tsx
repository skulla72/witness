import { createFileRoute, Link, notFound } from "@tanstack/react-router";
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  ArrowLeft,
  ShieldCheck,
  MapPin,
  Clock,
  Wrench,
  ExternalLink,
  Check,
  HandCoins,
  Scale,
} from "lucide-react";
import { BRAND } from "@/config/brand";
import { supabase } from "@/integrations/supabase/client";
import {
  findLane,
  partnersFor,
  shiftsFor,
  skillRequests,
  laneTotals,
  tierLabel,
  tierNote,
  type Tier,
  laneLine,
} from "@/data/giving";
import { usePrefs } from "@/hooks/usePrefs";
import type { LaneKey } from "@/data/personalize";

interface LaneNonprofit {
  id: string;
  name: string;
  city: string;
  blurb: string;
  tier: Tier;
  to_program: number;
  website: string;
  slug: string | null;
  accepting: boolean;
}


export const Route = createFileRoute("/giving/$lane")({
  staticData: { sitemap: false },
  component: LanePage,
  loader: ({ params }) => {
    const lane = findLane(params.lane);
    if (!lane) throw notFound();
    return { lane };
  },
  head: ({ loaderData }) => {
    const lane = loaderData?.lane;
    const title = lane ? `${lane.label} — ${lane.line}` : "Giving lane";
    const desc = lane
      ? `${lane.buys} Vetted partners with honest readiness tiers, volunteer shifts and skill requests in the ${lane.label.toLowerCase()} lane.`
      : "A giving lane.";
    return {
      meta: [
        { title: `${title} · ${BRAND.name}` },
        { name: "description", content: desc },
        { property: "og:title", content: `${title} · ${BRAND.name}` },
        { property: "og:description", content: desc },
        { property: "og:type", content: "article" },
        { name: "twitter:card", content: "summary_large_image" },
      ],
    };
  },
});

function LanePage() {
  const { prefs } = usePrefs();
  const { lane } = Route.useLoaderData();
  const seeded = partnersFor(lane.key as LaneKey);

  // Real nonprofit records can receive gifts; anything not yet registered
  // still shows, just without a give button.
  const { data: nonprofits } = useQuery({
    queryKey: ["lane-nonprofits", lane.key],
    queryFn: async (): Promise<LaneNonprofit[]> => {
      const { data, error } = await supabase
        .from("nonprofit_profiles")
        .select("id, tier, to_program, mission, accepting, organizations(name, slug, city, region, description, website)")
        .eq("lane", lane.key);
      if (error) throw error;
      const rows = (data ?? []).map(row => {
        const org = row.organizations as unknown as {
          name: string;
          slug: string;
          city: string;
          region: string | null;
          description: string;
          website: string | null;
        } | null;
        return {
          id: row.id,
          name: org?.name ?? "",
          city: [org?.city, org?.region].filter(Boolean).join(", "),
          blurb: row.mission || org?.description || "",
          tier: row.tier as Tier,
          to_program: row.to_program,
          website: org?.website ?? "",
          slug: org?.slug ?? null,
          accepting: row.accepting,
        };
      });
      if (rows.length > 0) return rows;
      return seeded.map(p => ({
        id: p.id,
        name: p.name,
        city: p.city,
        blurb: p.blurb,
        tier: p.tier,
        to_program: p.to_program,
        website: p.website,
        slug: null,
        accepting: false,
      }));
    },
  });
  const shifts = shiftsFor(lane.key as LaneKey);
  const skills = skillRequests.filter(s => s.lane === lane.key);
  const t = laneTotals[lane.key as LaneKey];

  return (
    <div className="pb-14">
      <div className="px-4 pt-3">
        <Link to="/giving" className="inline-flex items-center gap-1 text-[13px] text-ink-soft">
          <ArrowLeft className="h-4 w-4" /> All lanes
        </Link>
      </div>

      <header className="mb-5 px-5 pt-3">
        <p className="text-[11px] uppercase tracking-[0.22em] text-brass">Giving lane</p>
        <h1 className="mt-2 font-serif text-[29px] leading-tight text-ink">{lane.label}</h1>
        <p className="mt-2 text-[14px] italic leading-relaxed text-ink-soft">{laneLine(lane, prefs.gender)}</p>
        <p className="mt-2.5 text-[13px] leading-relaxed text-ink">{lane.buys}</p>
        <p className="mt-2 text-[11.5px] text-ink-soft">
          {t.givers.toLocaleString()} givers · ${t.distributed.toLocaleString()} distributed this
          quarter
        </p>
      </header>

      <section className="mx-4 mb-6 rounded-2xl border border-brass/35 bg-card p-5 shadow-soft">
        <p className="inline-flex items-center gap-1.5 text-[10px] uppercase tracking-[0.2em] text-brass">
          <Scale className="h-3 w-3" /> Fund the lane
        </p>
        <p className="mt-2 font-serif text-[19px] leading-tight text-ink">
          One gift, divided evenly across this lane
        </p>
        <p className="mt-1.5 text-[12.5px] leading-relaxed text-ink-soft">
          Give once or monthly, and it's split in equal parts between every nonprofit in{" "}
          {lane.label.toLowerCase()} that's receiving gifts. You see each share before you give.
        </p>
        <Link
          to="/giving/fund"
          search={{ lane: lane.key }}
          className="tap-scale mt-4 flex w-full items-center justify-center gap-2 rounded-xl bg-ink py-3 text-[14px] font-medium text-paper"
        >
          <HandCoins className="h-4 w-4" /> Give to this lane
        </Link>
      </section>


      <section className="mb-7 px-4">
        <h2 className="mb-1 px-1 font-serif text-[13px] uppercase tracking-[0.18em] text-ink-soft">
          Vetted partners
        </h2>
        <p className="mb-3 px-1 text-[11.5px] italic text-ink-soft">
          Readiness is shown honestly. A grassroots org isn't a worse gift — it's a different one.
        </p>
        <div className="space-y-3">
          {(nonprofits ?? []).map(n => (
            <div key={n.id} className="rounded-2xl border border-border bg-card p-4 shadow-soft">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="font-serif text-[16.5px] leading-tight text-ink">{n.name}</p>
                  <p className="mt-1 flex items-center gap-1 text-[11.5px] text-ink-soft">
                    <MapPin className="h-3 w-3" /> {n.city}
                  </p>
                </div>
                <TierChip tier={n.tier} />
              </div>
              <p className="mt-2 text-[12.5px] leading-snug text-ink-soft">{n.blurb}</p>
              <div className="mt-3 flex items-center justify-between border-t border-border/70 pt-2.5">
                <p className="text-[11.5px] text-ink-soft">
                  <span className="text-ink">{n.to_program}¢</span> of every dollar to program
                </p>
                {n.website && (
                  <a
                    href={`https://${n.website}`}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-1 text-[11.5px] text-brass"
                  >
                    {n.website} <ExternalLink className="h-3 w-3" />
                  </a>
                )}
              </div>
              <p className="mt-2 text-[11px] italic leading-snug text-ink-soft">
                {tierNote[n.tier]}
              </p>
              {n.slug && n.accepting && (
                <Link
                  to="/donate/$slug"
                  params={{ slug: n.slug }}
                  className="tap-scale mt-3 flex items-center justify-center gap-2 rounded-xl bg-ink py-2.5 text-[12.5px] font-medium text-paper"
                >
                  <HandCoins className="h-4 w-4" /> Give to {n.name}
                </Link>
              )}
            </div>
          ))}
        </div>
      </section>

      {shifts.length > 0 && (
        <section className="mb-7 px-4">
          <h2 className="mb-3 px-1 font-serif text-[13px] uppercase tracking-[0.18em] text-ink-soft">
            Show up instead
          </h2>
          <div className="space-y-2">
            {shifts.map(s => (
              <div key={s.id} className="rounded-2xl border border-border bg-card p-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="font-serif text-[15.5px] leading-tight text-ink">{s.title}</p>
                    <p className="mt-1 text-[11.5px] text-ink-soft">
                      {s.org} · {s.where}
                    </p>
                  </div>
                  <span className="shrink-0 rounded-full border border-border bg-paper px-2 py-0.5 text-[10px] text-ink-soft">
                    {s.seats_open} of {s.seats_total} left
                  </span>
                </div>
                <p className="mt-2 inline-flex items-center gap-1 text-[12px] text-ink">
                  <Clock className="h-3 w-3 text-brass" /> {s.when}
                </p>
                {s.first_timer_ok && (
                  <p className="mt-1.5 inline-flex items-center gap-1 text-[11px] text-hope">
                    <Check className="h-3 w-3" /> First-timers welcome, no experience needed
                  </p>
                )}
                <Link
                  to="/serve"
                  className="tap-scale mt-3 block w-full rounded-xl bg-ink py-2.5 text-center text-[12.5px] text-paper"
                >
                  Take a seat
                </Link>
              </div>
            ))}
          </div>
        </section>
      )}

      {skills.length > 0 && (
        <section className="px-4">
          <h2 className="mb-3 px-1 font-serif text-[13px] uppercase tracking-[0.18em] text-ink-soft">
            What they actually need
          </h2>
          <div className="space-y-2">
            {skills.map(k => (
              <div key={k.id} className="rounded-2xl border border-border bg-card p-4">
                <p className="inline-flex items-center gap-1.5 text-[10px] uppercase tracking-[0.14em] text-brass">
                  <Wrench className="h-3 w-3" /> {k.skill}
                  {k.urgent && <span className="text-flame">· urgent</span>}
                </p>
                <p className="mt-1.5 font-serif text-[15px] leading-snug text-ink">{k.need}</p>
                <p className="mt-1.5 text-[11.5px] text-ink-soft">
                  {k.org} · {k.commitment}
                </p>
              </div>
            ))}
          </div>
        </section>
      )}

      <p className="mt-8 px-8 text-center text-[11px] italic text-ink-soft">
        Giving never changes how your prayers are seen. That wall stays up.
      </p>
    </div>
  );
}

function TierChip({ tier }: { tier: Tier }) {
  const tone =
    tier === "audited"
      ? "border-hope/40 bg-hope/10 text-hope"
      : tier === "growing"
        ? "border-brass/40 bg-brass/10 text-brass"
        : "border-border bg-paper text-ink-soft";
  return (
    <span
      className={`inline-flex shrink-0 items-center gap-1 rounded-full border px-2 py-0.5 text-[10px] uppercase tracking-[0.12em] ${tone}`}
    >
      <ShieldCheck className="h-3 w-3" /> {tierLabel[tier]}
    </span>
  );
}
