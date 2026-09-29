import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { ArrowLeft, Plus, Sparkles, Snowflake } from "lucide-react";
import { BRAND } from "@/config/brand";
import { useSession } from "@/hooks/useSession";
import { loadFeaturedNeed, loadNeeds, loadStoryForWeek, PHASE_LABEL, type BoardFilter, type ShootPhase } from "@/lib/needs";
import { NeedCard } from "@/components/needs/NeedCard";

const SHOOT_DAY = new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric" });


export const Route = createFileRoute("/needs/")({
  staticData: { sitemap: false },
  component: NeedsBoard,
  head: () => ({
    meta: [
      { title: `Needs — roofs, bills, repairs, fixed together · ${BRAND.name}` },
      {
        name: "description",
        content:
          "A nationwide board of tangible needs: church roofs, a widow's furnace, a family's rent gap. Fund it or show up and do it, then watch the before-and-after.",
      },
      { property: "og:title", content: `Needs · ${BRAND.name}` },
      { property: "og:description", content: "Small churches and real people with a need you can see, fund, or fix — and the photo afterward." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
});

const FILTERS: { key: BoardFilter; label: string }[] = [
  { key: "all", label: "All" },
  { key: "projects", label: "Church projects" },
  { key: "prayers", label: "Fix that" },
  { key: "hands", label: "Needs hands" },
  { key: "done", label: "Done" },
];

function NeedsBoard() {
  const { signedIn } = useSession();
  const [filter, setFilter] = useState<BoardFilter>("all");
  const needsQ = useQuery({ queryKey: ["needs", filter], queryFn: () => loadNeeds(filter) });
  const featuredQ = useQuery({ queryKey: ["needs", "featured"], queryFn: loadFeaturedNeed });
  const storyQ = useQuery({ queryKey: ["needs", "week-story"], queryFn: loadStoryForWeek });
  const featured = featuredQ.data;

  const list = (needsQ.data ?? []).filter(n => n.id !== featured?.id);

  return (
    <div className="pb-16">
      <div className="flex items-center justify-between px-4 pt-3">
        <Link to="/giving" className="inline-flex items-center gap-1 text-[13px] text-ink-soft">
          <ArrowLeft className="h-4 w-4" /> Giving
        </Link>
        {signedIn && (
          <Link to="/needs/new" className="inline-flex items-center gap-1 rounded-full bg-ink px-3 py-1.5 text-[12px] text-paper">
            <Plus className="h-3.5 w-3.5" /> Post a need
          </Link>
        )}
      </div>

      <header className="px-5 pt-4">
        <p className="inline-flex items-center gap-1.5 text-[11px] uppercase tracking-[0.22em] text-brass">
          <Snowflake className="h-3 w-3" /> The snowball
        </p>
        <h1 className="mt-2 font-serif text-[30px] leading-tight text-ink">Needs</h1>
        <p className="mt-2 text-[13px] leading-relaxed text-ink-soft">
          A small church needs a roof. A widow needs a furnace. Thousands of us each give a little,
          a few of us show up with tools, and you watch it get done — before, during, after.
        </p>
      </header>

      {featured && (
        <section className="mx-4 mt-5">
          <p className="mb-2 flex items-center justify-between gap-2 px-1">
            <span className="inline-flex items-center gap-1.5 text-[10px] uppercase tracking-[0.2em] text-flame">
              <Sparkles className="h-3 w-3" /> This week, told properly
            </span>
            <Link to="/needs/stories" className="text-[11.5px] text-ink-soft underline">
              Filming schedule
            </Link>
          </p>
          <NeedCard need={featured} featured />
          {storyQ.data?.need.id === featured.id && (
            <div className="mt-2 flex flex-wrap gap-1.5 px-1">
              {storyQ.data.shoots.map(s => (
                <span
                  key={s.id}
                  className={`rounded-full border px-2.5 py-0.5 text-[11px] ${
                    s.status === "captured" ? "border-hope/40 bg-hope/10 text-hope" : "border-border bg-card text-ink-soft"
                  }`}
                >
                  {PHASE_LABEL[s.phase as ShootPhase]} · {SHOOT_DAY.format(new Date(s.scheduled_for))}
                </span>
              ))}
            </div>
          )}
        </section>
      )}



      <div className="no-scrollbar mt-5 flex gap-1.5 overflow-x-auto px-4">
        {FILTERS.map(f => (
          <button
            key={f.key}
            onClick={() => setFilter(f.key)}
            className={`shrink-0 rounded-full border px-3.5 py-1.5 text-[12px] transition-colors ${
              filter === f.key ? "border-ink bg-ink text-paper" : "border-border bg-card text-ink-soft"
            }`}
          >
            {f.label}
          </button>
        ))}
      </div>

      <section className="mt-4 space-y-3 px-4">
        {needsQ.isLoading ? (
          <div className="h-40 animate-pulse rounded-2xl border border-border bg-card" />
        ) : list.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-border p-6 text-center">
            <p className="text-[13.5px] text-ink-soft">
              {filter === "done" ? "Nothing finished yet — the first one will be worth watching." : "No needs posted here yet."}
            </p>
            {signedIn && filter !== "done" && (
              <Link to="/needs/new" className="mt-3 inline-block rounded-full bg-ink px-4 py-2 text-[12.5px] text-paper">Post the first one</Link>
            )}
          </div>
        ) : (
          list.map(n => <NeedCard key={n.id} need={n} />)
        )}
      </section>

      <p className="mt-8 px-8 text-center text-[11px] italic text-ink-soft">
        Money goes to the church or nonprofit behind each need, never to a person. Every need shows the photo when it's done.
      </p>
    </div>
  );
}
