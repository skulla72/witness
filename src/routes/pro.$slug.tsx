import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { BadgeCheck, ArrowLeft, Globe, Loader2 } from "lucide-react";
import { BRAND } from "@/config/brand";
import { HoursBadge } from "@/components/serving/HoursBadge";
import { loadBadge } from "@/lib/hours";
import { averageStars, proBySlug, proPlace, rateLine, reviewsOfPro } from "@/lib/pros";
import { ProfileImage } from "@/components/profile-media/ProfileImage";
import { ProfileMediaGallery } from "@/components/profile-media/ProfileMediaGallery";

export const Route = createFileRoute("/pro/$slug")({
  staticData: { sitemap: true },
  component: ProPage,
  head: () => ({
    meta: [
      { title: `A professional who serves · ${BRAND.name}` },
      {
        name: "description",
        content:
          "What this person does, where they work, what they charge, the hours they've served and how past jobs went.",
      },
      { property: "og:title", content: `A professional who serves · ${BRAND.name}` },
      { property: "og:description", content: "Hours served next to the stars, and reviews from both sides." },
      { property: "og:type", content: "profile" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
});

function ProPage() {
  const { slug } = Route.useParams();
  const pro = useQuery({ queryKey: ["pro", slug], queryFn: () => proBySlug(slug) });
  const reviews = useQuery({
    queryKey: ["pros", "reviews", pro.data?.id],
    queryFn: () => reviewsOfPro(pro.data!.id),
    enabled: !!pro.data,
  });
  const badge = useQuery({
    queryKey: ["badge", pro.data?.user_id],
    queryFn: () => loadBadge(pro.data!.user_id),
    enabled: !!pro.data,
  });

  if (pro.isLoading) {
    return (
      <div className="flex justify-center py-16">
        <Loader2 className="h-4 w-4 animate-spin text-ink-soft" />
      </div>
    );
  }
  if (!pro.data || pro.data.status !== "approved") {
    return (
      <div className="px-5 pt-6">
        <Link to="/pros" className="inline-flex items-center gap-1 text-[13px] text-ink-soft">
          <ArrowLeft className="h-4 w-4" /> Professionals
        </Link>
        <p className="mt-6 text-[13px] text-ink-soft">
          This page isn't available right now.
        </p>
      </div>
    );
  }

  const p = pro.data;
  const stars = averageStars(reviews.data ?? []);
  const jobs = new Set((reviews.data ?? []).map(r => r.job_key)).size;

  return (
    <div className="pb-16">
      <div className="px-4 pt-3">
        <Link to="/pros" className="inline-flex items-center gap-1 text-[13px] text-ink-soft">
          <ArrowLeft className="h-4 w-4" /> Professionals
        </Link>
      </div>

      <header className="px-5 pt-4">
        <div className="flex items-center gap-4">
          <ProfileImage path={p.photo_url} alt={p.display_name} className="h-24 w-24 shrink-0" />
          <div className="min-w-0"><h1 className="font-serif text-[28px] leading-tight text-ink">{p.display_name}</h1>
        <p className="mt-1 text-[12.5px] text-ink-soft">
          {[p.trade, proPlace(p), p.service_area].filter(Boolean).join(" · ")}
        </p>
        {p.id_verified_at ? (
          <p className="mt-2 inline-flex items-center gap-1.5 text-[12.5px] text-brass-deep">
            <BadgeCheck className="h-4 w-4" /> Identity verified
          </p>
        ) : (
          <p className="mt-2 text-[12.5px] text-ink-soft">Identity check not finished yet.</p>
        )}</div></div>
      </header>

      <div className="px-4 pt-4">
        <HoursBadge
          userId={p.user_id}
          hoursVerified={badge.data?.hours_verified ?? 0}
          hoursSelf={badge.data?.hours_self ?? 0}
          businessName={p.display_name}
          businessLine={p.trade}
        />
      </div>

      {p.headline && (
        <p className="px-5 pt-4 font-serif text-[16px] leading-relaxed text-ink">{p.headline}</p>
      )}
      {p.about && (
        <p className="px-5 pt-2 text-[13.5px] leading-relaxed text-ink-soft">{p.about}</p>
      )}

      <div className="px-4 pt-5">
        <div className="rounded-2xl border border-border bg-card p-4 shadow-soft">
          <p className="text-[13.5px] text-ink">{rateLine(p)}</p>
          {p.serves_free && (
            <p className="mt-1 text-[12px] text-ink-soft">
              Gives some work away — those hours are on the badge above.
            </p>
          )}
          <p className="mt-2 text-[12px] text-ink-soft">
            Their phone number is shared once you hire them, not before.
          </p>
          <div className="mt-3 flex flex-wrap gap-2">
            {p.website && (
              <a
                href={p.website}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 rounded-full border border-border px-4 py-2 text-[12.5px] text-ink"
              >
                <Globe className="h-3.5 w-3.5" /> Website
              </a>
            )}
          </div>
        </div>
      </div>

      <section className="px-4 pt-6">
        <h2 className="mb-2 px-1 text-[11px] uppercase tracking-[0.18em] text-ink-soft">
          How jobs have gone
        </h2>
        <p className="px-1 text-[13px] text-ink">
          {stars ? `${stars} out of 5` : "No reviews yet"}
          <span className="text-ink-soft">
            {" "}
            · {jobs} {jobs === 1 ? "job" : "jobs"}
          </span>
        </p>
        <p className="mt-1 px-1 text-[11.5px] text-ink-soft">
          Both sides rate each other, and neither review shows until both are in.
        </p>
        <div className="mt-3 space-y-2">
          {(reviews.data ?? []).map(r => (
            <div key={r.id} className="rounded-2xl border border-border bg-card p-4">
              <p className="text-[12px] text-brass">{"★".repeat(r.stars)}</p>
              {r.body && <p className="mt-1 text-[13px] leading-relaxed text-ink">{r.body}</p>}
            </div>
          ))}
        </div>
      </section>
      <div className="px-4"><ProfileMediaGallery pageType="professional" pageId={p.id} /></div>
    </div>
  );
}
