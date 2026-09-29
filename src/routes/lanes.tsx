import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { ArrowLeft, HandHeart } from "lucide-react";
import { BRAND } from "@/config/brand";
import { SERVING_LANES, laneRange } from "@/data/serving-lanes";
import { laneCounts } from "@/lib/serving";

export const Route = createFileRoute("/lanes")({
  staticData: { sitemap: false },
  component: Lanes,
  head: () => ({
    meta: [
      { title: `Serving lanes and what work costs · ${BRAND.name}` },
      {
        name: "description",
        content:
          "Yard work, plumbing, roofing, childcare, counseling and more — the going range for each kind of work, and the people who do it.",
      },
      { property: "og:title", content: `Serving lanes and what work costs · ${BRAND.name}` },
      {
        property: "og:description",
        content: "What each kind of work usually runs, and who near you does it.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
});

function Lanes() {
  const counts = useQuery({ queryKey: ["serving", "laneCounts"], queryFn: laneCounts });

  return (
    <div className="pb-16">
      <div className="px-4 pt-3">
        <Link to="/serve" className="inline-flex items-center gap-1 text-[13px] text-ink-soft">
          <ArrowLeft className="h-4 w-4" /> Serving
        </Link>
      </div>

      <header className="px-5 pt-3">
        <p className="text-[11px] uppercase tracking-[0.22em] text-brass">Serving lanes</p>
        <h1 className="mt-2 font-serif text-[28px] leading-tight text-ink">
          What the work runs
        </h1>
        <p className="mt-2 text-[13px] leading-relaxed text-ink-soft">
          These are the ranges neighbors around the country tend to pay. They're a guide so nobody
          gets talked into a bad number — every professional still names their own price, and some
          give the work away.
        </p>
      </header>

      <div className="px-4 pt-5">
        <Link
          to="/hire"
          search={{ lane: undefined }}
          className="block rounded-2xl border border-brass/30 bg-brass/10 p-4 text-[13px] text-ink"
        >
          <span className="inline-flex items-center gap-2">
            <HandHeart className="h-4 w-4 text-brass" /> Ask for help with something
          </span>
          <span className="mt-0.5 block text-[11.5px] text-ink-soft">
            Say what you need and we'll put it in front of the people who do that work.
          </span>
        </Link>
      </div>

      <div className="space-y-3 px-4 pt-5">
        {SERVING_LANES.map(lane => {
          const n = counts.data?.[lane.key] ?? 0;
          return (
            <div key={lane.key} className="rounded-2xl border border-border bg-card p-4 shadow-soft">
              <div className="flex items-baseline justify-between gap-3">
                <p className="font-serif text-[16.5px] leading-tight text-ink">{lane.label}</p>
                <p className="shrink-0 text-[12px] text-brass-deep">{laneRange(lane)}</p>
              </div>
              <p className="mt-1.5 text-[12.5px] leading-relaxed text-ink-soft">{lane.blurb}</p>
              <p className="mt-2 text-[11.5px] text-ink-soft">
                {n === 0
                  ? "Nobody working this lane yet."
                  : `${n} ${n === 1 ? "person works" : "people work"} this lane.`}
              </p>
              <div className="mt-3 flex gap-2">
                <Link
                  to="/hire"
                  search={{ lane: lane.key }}
                  className="tap-scale inline-flex rounded-full bg-primary px-4 py-2 text-[12.5px] text-primary-foreground"
                >
                  Ask in this lane
                </Link>
                <Link
                  to="/pros"
                  className="tap-scale inline-flex rounded-full border border-border bg-card px-4 py-2 text-[12.5px] text-ink"
                >
                  See people
                </Link>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
