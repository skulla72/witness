import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import {
  ArrowLeft,
  ArrowRight,
  BadgeCheck,
  Building2,
  HandCoins,
  Loader2,
  MapPin,
  Quote,
  Sparkles,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { BRAND } from "@/config/brand";
import { findLane, tierLabel, tierNote, type Tier } from "@/data/giving";
import { ORG_PUBLIC_COLUMNS, type Org } from "@/lib/community";
import type { Tables } from "@/integrations/supabase/types";

type Spotlight = Tables<"nonprofit_spotlights"> & { org?: Org | null };

export const Route = createFileRoute("/spotlight")({
  staticData: { sitemap: true },
  component: SpotlightPage,
  head: () => ({
    meta: [
      { title: `Spotlight of the Week — one organization, told properly · ${BRAND.name}` },
      {
        name: "description",
        content:
          "Each week one vetted organization gets the whole page: what they actually do, who said what, what a gift buys, and how much of each dollar reaches the work.",
      },
      { property: "og:title", content: `Spotlight of the Week · ${BRAND.name}` },
      {
        property: "og:description",
        content: "One organization a week, told honestly — and a way to back them today.",
      },
      { property: "og:type", content: "website" },
      { property: "og:url", content: "https://witnessmovement.com/spotlight" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
    links: [{ rel: "canonical", href: "https://witnessmovement.com/spotlight" }],
  }),
});

const WEEK = new Intl.DateTimeFormat("en-US", { month: "long", day: "numeric" });

function weekLabel(weekOf: string): string {
  const start = new Date(`${weekOf}T00:00:00`);
  const end = new Date(start.getTime() + 6 * 86_400_000);
  return `${WEEK.format(start)} – ${WEEK.format(end)}`;
}

function SpotlightPage() {
  const { data, isLoading } = useQuery({
    queryKey: ["spotlights"],
    queryFn: async () => {
      const { data: rows, error } = await supabase
        .from("nonprofit_spotlights")
        .select("*")
        .order("week_of", { ascending: false });
      if (error) throw error;
      const spotlights = (rows ?? []) as Spotlight[];
      const orgIds = [...new Set(spotlights.map(s => s.org_id).filter(Boolean))] as string[];
      if (orgIds.length) {
        const { data: orgs } = await supabase
          .from("organizations")
          .select(ORG_PUBLIC_COLUMNS)
          .in("id", orgIds);
        const byId = new Map(((orgs ?? []) as Org[]).map(o => [o.id, o]));
        for (const s of spotlights) s.org = s.org_id ? (byId.get(s.org_id) ?? null) : null;
      }
      return spotlights;
    },
  });

  if (isLoading) {
    return (
      <div className="px-4 pb-16 pt-10 text-center">
        <Loader2 className="mx-auto h-5 w-5 animate-spin text-ink-soft" />
      </div>
    );
  }

  const all = data ?? [];
  const today = new Date().toISOString().slice(0, 10);
  const current = all.find(s => s.week_of <= today) ?? all[0];
  const past = all.filter(s => s !== current);

  if (!current) {
    return (
      <div className="px-4 pb-16 pt-10 text-center">
        <p className="font-serif text-[18px] text-ink">No spotlight yet</p>
        <p className="mt-2 text-[13px] text-ink-soft">The first one lands next week.</p>
      </div>
    );
  }

  const lane = findLane(current.lane);
  const org = current.org;

  return (
    <div className="pb-16">
      <div className="px-4 pt-3">
        <Link to="/giving" className="inline-flex items-center gap-1 text-[13px] text-ink-soft">
          <ArrowLeft className="h-4 w-4" /> Giving
        </Link>
      </div>

      <header className="px-4 pt-4">
        <p className="flex items-center gap-1.5 text-[11px] uppercase tracking-[0.14em] text-brass">
          <Sparkles className="h-3.5 w-3.5" /> Spotlight of the week
        </p>
        <p className="mt-1 text-[12px] text-ink-soft">{weekLabel(current.week_of)}</p>
        <h1 className="mt-2 font-serif text-[28px] leading-tight text-ink">{current.name}</h1>
        <p className="mt-1.5 font-serif text-[16px] leading-snug text-ink-soft">
          {current.tagline}
        </p>
        <p className="mt-2 flex items-center gap-3 text-[12px] text-ink-soft">
          <span className="flex items-center gap-1">
            <MapPin className="h-3.5 w-3.5" /> {current.city}
          </span>
          {lane && <span>{lane.label}</span>}
          {org?.verified && (
            <span className="flex items-center gap-1 text-hope">
              <BadgeCheck className="h-3.5 w-3.5" /> Verified
            </span>
          )}
        </p>
      </header>

      {current.cover_url && (
        <div className="mt-4 px-4">
          <img
            src={current.cover_url}
            alt={`${current.name}`}
            width={1344}
            height={768}
            className="w-full rounded-2xl border border-border object-cover shadow-soft"
          />
        </div>
      )}

      <section className="mt-5 px-4">
        <div className="rounded-2xl border border-border bg-card p-4 shadow-soft">
          <p className="whitespace-pre-line text-[13px] leading-relaxed text-ink">
            {current.story}
          </p>
        </div>
      </section>

      {current.quote && (
        <section className="mt-4 px-4">
          <blockquote className="rounded-2xl bg-secondary p-4">
            <Quote className="h-4 w-4 text-brass" />
            <p className="mt-2 font-serif text-[17px] leading-snug text-ink">
              "{current.quote}"
            </p>
            {current.quote_by && (
              <footer className="mt-2 text-[12px] text-ink-soft">— {current.quote_by}</footer>
            )}
          </blockquote>
        </section>
      )}

      {current.buys.length > 0 && (
        <section className="mt-5 px-4">
          <h2 className="text-[11px] uppercase tracking-[0.14em] text-ink-soft">
            What a gift buys
          </h2>
          <ul className="mt-2 space-y-2">
            {current.buys.map(item => (
              <li
                key={item}
                className="rounded-xl border border-border bg-card px-3 py-2.5 text-[13px] text-ink"
              >
                {item}
              </li>
            ))}
          </ul>
        </section>
      )}

      <section className="mt-5 px-4">
        <div className="rounded-2xl border border-border bg-card p-4 shadow-soft">
          <p className="flex items-center gap-1.5 text-[13px] font-medium text-ink">
            <BadgeCheck className="h-4 w-4 text-hope" />
            {tierLabel[current.tier as Tier] ?? "Reviewed"} ·{" "}
            <span className="font-normal text-ink-soft">
              {current.to_program}¢ of each dollar reaches the work
            </span>
          </p>
          <p className="mt-1.5 text-[12px] leading-relaxed text-ink-soft">
            {tierNote[current.tier as Tier] ?? "Reviewed by hand before being listed here."}
          </p>
          {current.website && (
            <p className="mt-2 text-[12px] text-brass">{current.website}</p>
          )}
        </div>
      </section>

      {org && (
        <section className="mt-5 space-y-2 px-4">
          <Link
            to="/donate/$slug"
            params={{ slug: org.slug }}
            search={{}}
            className="tap-scale flex items-center justify-between rounded-2xl bg-ink px-4 py-3.5 text-paper"
          >
            <span className="flex items-center gap-2 text-[14px] font-medium">
              <HandCoins className="h-4 w-4" /> Give to {org.name}
            </span>
            <ArrowRight className="h-4 w-4" />
          </Link>
          <Link
            to="/community/$slug"
            params={{ slug: org.slug }}
            className="tap-scale flex items-center justify-between rounded-2xl border border-border bg-card px-4 py-3 text-ink shadow-soft"
          >
            <span className="flex items-center gap-2 text-[13px]">
              <Building2 className="h-4 w-4 text-brass" /> Visit their page
            </span>
            <ArrowRight className="h-4 w-4 text-ink-soft" />
          </Link>
        </section>
      )}

      {past.length > 0 && (
        <section className="mt-7 px-4">
          <h2 className="text-[11px] uppercase tracking-[0.14em] text-ink-soft">
            Earlier weeks
          </h2>
          <ul className="mt-2 space-y-2">
            {past.map(item => (
              <li
                key={item.id}
                className="overflow-hidden rounded-xl border border-border bg-card"
              >
                {item.cover_url && (
                  <img
                    src={item.cover_url}
                    alt={item.name}
                    loading="lazy"
                    width={1344}
                    height={768}
                    className="h-28 w-full object-cover"
                  />
                )}
                <div className="px-3 py-2.5">
                  <p className="text-[13px] font-medium text-ink">{item.name}</p>
                  <p className="mt-0.5 text-[12px] leading-relaxed text-ink-soft">
                    {item.tagline}
                  </p>
                  <p className="mt-1 text-[11px] text-ink-soft">
                    {weekLabel(item.week_of)} · {item.city}
                  </p>
                </div>
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}
