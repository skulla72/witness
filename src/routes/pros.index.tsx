import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { BadgeCheck, Loader2, Search, Wrench } from "lucide-react";
import { BRAND } from "@/config/brand";
import { useSession } from "@/hooks/useSession";
import { listPros, myProPage, proPlace, rateLine } from "@/lib/pros";
import { ProfileRow } from "@/components/profile-media/ProfileRow";

export const Route = createFileRoute("/pros/")({
  staticData: { sitemap: true },
  component: Pros,
  head: () => ({
    meta: [
      { title: `Find someone who serves · ${BRAND.name}` },
      {
        name: "description",
        content:
          "Plumbers, roofers, counselors and neighbors who work with their hands — with hours served and honest reviews from both sides of the job.",
      },
      { property: "og:title", content: `Find someone who serves · ${BRAND.name}` },
      {
        property: "og:description",
        content: "Professionals with an identity check, hours served, and reviews from both sides.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
});

function Pros() {
  const { userId } = useSession();
  const [term, setTerm] = useState("");

  const pros = useQuery({ queryKey: ["pros", term], queryFn: () => listPros(term) });
  const mine = useQuery({
    queryKey: ["pros", "mine", userId],
    queryFn: () => myProPage(userId!),
    enabled: !!userId,
  });

  return (
    <div className="pb-16">
      <header className="px-5 pt-5">
        <p className="text-[11px] uppercase tracking-[0.22em] text-brass">Serving</p>
        <h1 className="mt-2 font-serif text-[28px] leading-tight text-ink">
          Find someone who serves
        </h1>
        <p className="mt-2 text-[13px] leading-relaxed text-ink-soft">
          People who work with their hands, and some who give that work away. Hours served sit next
          to the stars, so you can see what someone is like before they're at your door.
        </p>
      </header>

      <div className="px-4 pt-5">
        <label className="flex items-center gap-2 rounded-full border border-border bg-card px-4 py-2.5">
          <Search className="h-4 w-4 shrink-0 text-ink-soft" />
          <input
            value={term}
            onChange={e => setTerm(e.target.value)}
            placeholder="Roofing, Nashville, counseling…"
            className="w-full bg-transparent text-[13.5px] text-ink outline-none placeholder:text-ink-soft/70"
          />
        </label>
      </div>

      <div className="grid grid-cols-2 gap-3 px-4 pt-4">
        <Link
          to="/lanes"
          className="rounded-2xl border border-border bg-card p-4 text-[13px] text-ink"
        >
          Serving lanes
          <span className="mt-0.5 block text-[11.5px] text-ink-soft">What the work usually runs</span>
        </Link>
        <Link
          to="/hire"
          search={{ lane: undefined }}
          className="rounded-2xl border border-brass/30 bg-brass/10 p-4 text-[13px] text-ink"
        >
          Ask for help
          <span className="mt-0.5 block text-[11.5px] text-ink-soft">
            The right people see it and answer
          </span>
        </Link>
      </div>

      <div className="px-4 pt-3">
        {mine.data ? (
          <Link
            to="/pros/leads"
            className="block rounded-2xl border border-brass/30 bg-brass/10 p-4 text-[13px] text-ink"
          >
            Your page — {mine.data.display_name}
            <span className="mt-0.5 block text-[11.5px] text-ink-soft">
              Set your lanes and rates, and see work asking for you
            </span>
          </Link>
        ) : (
          <Link
            to="/pros/new"
            className="block rounded-2xl border border-border bg-card p-4 text-[13px] text-ink"
          >
            <span className="inline-flex items-center gap-2">
              <Wrench className="h-4 w-4 text-brass" /> Do this for a living?
            </span>
            <span className="mt-0.5 block text-[11.5px] text-ink-soft">
              Set up your own page — free while we're getting started.
            </span>
          </Link>
        )}
      </div>

      <div className="space-y-3 px-4 pt-5">
        {pros.isLoading && (
          <div className="flex justify-center py-8">
            <Loader2 className="h-4 w-4 animate-spin text-ink-soft" />
          </div>
        )}
        {pros.data?.map(p => (
          <Link
            key={p.id}
            to="/pro/$slug"
            params={{ slug: p.slug }}
            className="block rounded-2xl border border-border bg-card p-4 shadow-soft"
          >
            <ProfileRow image={p.photo_url} name={p.display_name} detail={[p.trade, proPlace(p)].filter(Boolean).join(" · ")} trailing={p.id_verified_at ? <BadgeCheck className="h-4 w-4 shrink-0 text-brass" /> : undefined} />
            {p.headline && (
              <p className="mt-2 text-[13px] leading-relaxed text-ink">{p.headline}</p>
            )}
            <p className="mt-2 text-[11.5px] text-ink-soft">
              {rateLine(p)}
              {p.serves_free ? " · Sometimes gives the work away" : ""}
            </p>
          </Link>
        ))}
        {pros.data?.length === 0 && (
          <p className="rounded-2xl border border-border bg-card p-4 text-[12.5px] text-ink-soft">
            Nobody here yet for that. Try a trade or a city.
          </p>
        )}
      </div>
    </div>
  );
}
