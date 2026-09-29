import { createFileRoute, Link } from "@tanstack/react-router";
import { Sparkles, ArrowRight } from "lucide-react";
import { BRAND } from "@/config/brand";
import { ShareTourButton } from "@/components/ShareTourButton";
import walkthrough from "@/assets/witness-walkthrough.mp4.asset.json";

export const Route = createFileRoute("/tour")({
  staticData: { sitemap: false },
  component: TourPage,
  head: () => ({
    meta: [
      { title: `Take the ${BRAND.name} tour — a two-minute walkthrough` },
      {
        name: "description",
        content: `A narrated walkthrough of ${BRAND.name}: bring the ask, witness the answer, and walk with others through hard seasons.`,
      },
      { property: "og:title", content: `Take the ${BRAND.name} tour` },
      {
        property: "og:description",
        content: `Two narrated minutes inside ${BRAND.name} — prayer, gratitude, and presence.`,
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
});

function TourPage() {
  return (
    <div className="px-4 pt-4 pb-10">
      <section className="rounded-3xl border border-brass/30 bg-gradient-to-br from-[oklch(0.18_0.025_255)] to-[oklch(0.12_0.02_260)] p-5 shadow-lift">
        <div className="flex items-center gap-1.5 text-[10px] uppercase tracking-[0.25em] text-brass-light">
          <Sparkles className="h-3 w-3" /> The walkthrough
        </div>
        <h1 className="mt-2 font-serif text-[24px] leading-tight text-paper">
          Two quiet minutes inside {BRAND.name}.
        </h1>
        <p className="mt-1.5 text-[13.5px] text-paper/70">
          Narrated, unhurried, and honest — every rhythm of the app, from the
          first ask to the answer you come back to mark.
        </p>

        <div className="mt-4 overflow-hidden rounded-2xl border border-white/10 bg-black">
          <video
            src={walkthrough.url}
            controls
            playsInline
            preload="metadata"
            className="w-full"
          />
        </div>

        <Link
          to="/start"
          className="mt-4 inline-flex w-full items-center justify-center gap-2 rounded-full bg-brass px-5 py-3.5 text-[13.5px] tracking-wide text-ink"
        >
          Get started
          <ArrowRight className="h-4 w-4" />
        </Link>
        <p className="mt-2 text-center text-[11.5px] text-paper/50">
          A guided two minutes — write your first ask and invite one friend.
        </p>

        <div className="mt-4 flex items-center justify-between gap-3 border-t border-white/10 pt-4">
          <ShareTourButton />
          <Link
            to="/record"
            className="inline-flex items-center gap-1.5 text-[11.5px] uppercase tracking-[0.2em] text-paper/70 hover:text-paper"
          >
            Bring a prayer
            <ArrowRight className="h-3.5 w-3.5" />
          </Link>
        </div>
      </section>

      <div className="mt-6 text-center">
        <Link
          to="/welcome"
          className="text-[12px] uppercase tracking-[0.2em] text-brass hover:text-brass-light"
        >
          See the first-open walkthrough
        </Link>
      </div>

      <div className="mt-4 text-center">
        <Link
          to="/"
          className="text-[12px] uppercase tracking-[0.2em] text-ink-soft hover:text-ink"
        >
          Back to the feed
        </Link>
      </div>
    </div>
  );
}
