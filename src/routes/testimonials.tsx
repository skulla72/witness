import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { ArrowLeft, ArrowRight, Building2, Quote, Wrench } from "lucide-react";
import { BRAND } from "@/config/brand";
import { publicTestimonials, type TestimonialStory } from "@/lib/testimonials";

export const Route = createFileRoute("/testimonials")({
  staticData: { sitemap: true },
  component: TestimonialsPage,
  head: () => ({
    meta: [
      { title: `Stories of impact · ${BRAND.name}` },
      { name: "description", content: "Churches and professionals share what changed when people found one another through Witness." },
      { property: "og:title", content: `Stories of impact · ${BRAND.name}` },
      { property: "og:description", content: "Real stories from churches and professionals serving through Witness." },
      { property: "og:type", content: "website" },
      { property: "og:url", content: "https://witnessmovement.com/testimonials" },
      { property: "og:image", content: "https://witnessmovement.com/share-witness.jpg" },
      { name: "twitter:card", content: "summary_large_image" },
      { name: "twitter:image", content: "https://witnessmovement.com/share-witness.jpg" },
    ],
    links: [{ rel: "canonical", href: "https://witnessmovement.com/testimonials" }],
  }),
});

function TestimonialsPage() {
  const stories = useQuery({
    queryKey: ["testimonials", "public"],
    queryFn: publicTestimonials,
    staleTime: 60_000,
  });

  return (
    <div className="min-h-screen bg-paper pb-16">
      <div className="bg-ink text-paper">
        <div className="mx-auto max-w-md px-5 pb-10 pt-5">
          <Link to="/" className="inline-flex items-center gap-1 text-[12.5px] text-paper/65">
            <ArrowLeft className="h-4 w-4" /> {BRAND.name}
          </Link>
          <p className="mt-10 text-[10px] uppercase tracking-[0.24em] text-brass-light">Stories of impact</p>
          <h1 className="mt-3 font-serif text-[34px] leading-[1.12] text-paper">When showing up changes something.</h1>
          <p className="mt-4 max-w-sm text-[14px] leading-relaxed text-paper/68">
            Churches found helping hands. Professionals found meaningful work. These are their own words about what happened next.
          </p>
        </div>
      </div>

      <main className="mx-auto max-w-md px-4 pt-6">
        {stories.isLoading && <div className="h-56 animate-pulse rounded-2xl border border-border bg-card" />}
        {stories.isError && (
          <div className="rounded-2xl border border-border bg-card p-5 text-center">
            <p className="font-serif text-[17px] text-ink">The stories couldn't load.</p>
            <button type="button" onClick={() => stories.refetch()} className="mt-3 text-[12.5px] text-brass">Try again</button>
          </div>
        )}
        {!stories.isLoading && !stories.isError && (stories.data ?? []).length === 0 && (
          <div className="border-y border-border py-10 text-center">
            <Quote className="mx-auto h-6 w-6 text-brass" />
            <h2 className="mt-3 font-serif text-[20px] text-ink">The first stories are being gathered.</h2>
            <p className="mx-auto mt-2 max-w-xs text-[13px] leading-relaxed text-ink-soft">
              Nothing is invented here. A story appears only after the church or professional shares it and our team reviews it.
            </p>
          </div>
        )}
        <div className="space-y-5">
          {(stories.data ?? []).map(story => <StoryCard key={story.id} story={story} />)}
        </div>

        <section className="mt-9 border-t border-border pt-7">
          <p className="text-[10px] uppercase tracking-[0.2em] text-brass">Your turn</p>
          <h2 className="mt-2 font-serif text-[20px] text-ink">Did Witness help your church or work?</h2>
          <p className="mt-2 text-[13px] leading-relaxed text-ink-soft">Share the honest outcome. Every story is reviewed before it appears here.</p>
          <Link to="/testimonials/share" className="mt-4 inline-flex items-center gap-2 rounded-full bg-primary px-5 py-3 text-[13px] text-primary-foreground">
            Share your story <ArrowRight className="h-4 w-4" />
          </Link>
        </section>
      </main>
    </div>
  );
}

function StoryCard({ story }: { story: TestimonialStory }) {
  const professional = story.subject_type === "professional";
  const fallback = story.photo_url ?? story.subjectPhoto;
  const body = (
    <article className="overflow-hidden rounded-2xl border border-border bg-card shadow-soft">
      {fallback && <img src={fallback} alt="" className="aspect-[16/9] w-full object-cover" />}
      <div className="p-5">
        <Quote className="h-5 w-5 text-brass" />
        <h2 className="mt-3 font-serif text-[21px] leading-snug text-ink">{story.headline}</h2>
        <p className="mt-3 whitespace-pre-line text-[13.5px] leading-relaxed text-ink-soft">{story.story}</p>
        <div className="mt-5 border-l-2 border-brass pl-3">
          <p className="text-[10px] uppercase tracking-[0.18em] text-brass-deep">What changed</p>
          <p className="mt-1 text-[13px] leading-relaxed text-ink">{story.outcome}</p>
        </div>
        <div className="mt-5 flex items-center gap-3 border-t border-border pt-4">
          <span className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-secondary text-ink-soft">
            {professional ? <Wrench className="h-4 w-4" /> : <Building2 className="h-4 w-4" />}
          </span>
          <div className="min-w-0">
            <p className="truncate text-[13px] font-medium text-ink">{story.subjectName}</p>
            <p className="truncate text-[11.5px] text-ink-soft">{story.subjectDetail || (professional ? "Professional" : "Organization")}</p>
          </div>
          <ArrowRight className="ml-auto h-4 w-4 text-brass" />
        </div>
      </div>
    </article>
  );
  return professional ? (
    <Link to="/pro/$slug" params={{ slug: story.subjectSlug }}>{body}</Link>
  ) : (
    <Link to="/community/$slug" params={{ slug: story.subjectSlug }}>{body}</Link>
  );
}