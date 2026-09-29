import { createFileRoute, Link } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { GratitudeCard } from "@/components/GratitudeCard";
import { JournalRitual } from "@/components/gratitude/JournalRitual";
import { BRAND } from "@/config/brand";
import { Mic, Camera, PenLine, Sparkles } from "lucide-react";
import { useSession } from "@/hooks/useSession";
import { loadGratitude } from "@/lib/prayers";
import { useTone } from "@/hooks/useTone";

export const Route = createFileRoute("/gratitude/")({
  staticData: { sitemap: false },
  component: GratitudeFeed,
  head: () => ({
    meta: [
      { title: `Gratitude — one line a day · ${BRAND.name}` },
      {
        name: "description",
        content:
          "A private gratitude journal you can switch on, and a wall of small mercies the community kept. One line, a photo, or thirty seconds of voice.",
      },
      { property: "og:title", content: `Gratitude · ${BRAND.name}` },
      {
        property: "og:description",
        content: "Keep a private gratitude journal, or share the mercy out loud. Both, if you like.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
});

const TABS = ["all", "answered", "mine"] as const;

function GratitudeFeed() {
  const [tab, setTab] = useState<(typeof TABS)[number]>("all");
  const { userId, signedIn } = useSession();
  const tone = useTone();
  const q = useQuery({ queryKey: ["gratitude", "wall", userId ?? "anon"], queryFn: () => loadGratitude({ viewerId: userId ?? null }), enabled: userId !== undefined });
  const all = q.data ?? [];

  const feed = useMemo(() => {
    if (tab === "mine") return all.filter(g => g.user_id === userId);
    if (tab === "answered") return all.filter(g => g.linked_prayer_id);
    return all.filter(g => g.privacy === "community" || g.user_id === userId);
  }, [all, tab, userId]);

  const answered = all.filter(g => g.linked_prayer_id).length;

  return (
    <div className="bg-gratitude min-h-full pb-4 md:mx-auto md:max-w-4xl md:pb-10 lg:max-w-5xl">
      <header className="px-5 pt-6 md:px-8 md:pt-9">
        <p className="text-[11px] uppercase tracking-[0.22em] text-brass">{tone.faith ? "Small mercies, kept" : "Good things, kept"}</p>
        <h1 className="mt-2 font-serif text-[30px] leading-none text-ink">Gratitude</h1>
        <p className="mt-2.5 text-[13.5px] leading-relaxed text-ink-soft">
          Thanks is a practice before it's a feeling. Keep it privately, one line at a time — and
          share it out loud only when you want to.
        </p>
      </header>

      <div className="mt-5 px-5 md:px-8">
        <JournalRitual />
      </div>

      <div className="mt-4 grid grid-cols-3 gap-2 px-5 md:px-8">
        <Link to="/record" search={{ mode: "gratitude", kind: "text" }} className="tap-scale rounded-2xl border border-border bg-card p-3.5 text-center shadow-soft">
          <PenLine className="mx-auto h-4 w-4 text-brass" strokeWidth={1.6} />
          <span className="mt-2 block text-[11.5px] leading-tight text-ink">Write it</span>
        </Link>
        <Link to="/record" search={{ mode: "gratitude", kind: "photo" }} className="tap-scale rounded-2xl border border-border bg-card p-3.5 text-center shadow-soft">
          <Camera className="mx-auto h-4 w-4 text-hope" strokeWidth={1.6} />
          <span className="mt-2 block text-[11.5px] leading-tight text-ink">Photo</span>
        </Link>
        <Link to="/record" search={{ mode: "gratitude", kind: "voice" }} className="tap-scale rounded-2xl border border-border bg-card p-3.5 text-center shadow-soft">
          <Mic className="mx-auto h-4 w-4 text-terracotta" strokeWidth={1.6} />
          <span className="mt-2 block text-[11.5px] leading-tight text-ink">30 sec voice</span>
        </Link>

      </div>

      <div className="mt-7 px-5 md:px-8">
        <div className="flex items-baseline justify-between">
          <h2 className="font-serif text-[13px] uppercase tracking-[0.18em] text-ink-soft">The wall</h2>
          <span className="inline-flex items-center gap-1 text-[11px] text-brass">
            <Sparkles className="h-3 w-3" /> {answered} {tone.faith ? "tied to an answered prayer" : "tied to a hope that came through"}
          </span>
        </div>
        <div className="no-scrollbar mt-3 flex gap-1.5 overflow-x-auto">
          {TABS.map(t => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={`shrink-0 rounded-full border px-3.5 py-1.5 text-[12px] transition-colors ${
                tab === t ? "border-ink bg-ink text-paper" : "border-border bg-paper text-ink-soft hover:text-ink"
              }`}
            >
              {t === "all" ? "All" : t === "mine" ? "Mine" : tone.faith ? "Answered prayers" : "Hopes that came through"}
            </button>
          ))}
        </div>
      </div>

      {signedIn === false ? (
        <div className="mt-8 px-8 text-center">
          <p className="font-serif text-[18px] text-ink">Members keep the wall.</p>
          <Link to="/login" className="mt-4 inline-block rounded-full bg-ink px-5 py-2.5 text-[13px] text-paper">Sign in</Link>
        </div>
      ) : q.isLoading ? (
        <div className="mt-4 grid grid-cols-2 gap-3 px-4 md:grid-cols-3 md:px-8 lg:grid-cols-4">{[0, 1, 2, 3].map(i => <div key={i} className="aspect-square rounded-2xl bg-card border border-border animate-pulse" />)}</div>
      ) : feed.length === 0 ? (
        <div className="mt-8 px-8 text-center">
          <p className="font-serif text-[18px] text-ink">Nothing here yet.</p>
          <p className="mt-1 text-[13px] text-ink-soft">
            Your first thanks doesn't have to be big. "Slept through the night" counts.
          </p>
        </div>
      ) : (
        <div className="mt-4 grid grid-cols-2 gap-3 px-4 md:grid-cols-3 md:px-8 lg:grid-cols-4">
          {feed.map(g => <GratitudeCard key={g.id} g={g} />)}
        </div>
      )}

      <div className="mb-2 mt-10 px-6 text-center">
        <p className="font-serif text-[18px] text-ink">{tone.faith ? "Every thanks is an altar." : "Every good thing is worth remembering."}</p>
        <p className="mt-1 text-[13px] italic text-ink-soft">The wall ends here. Come back tomorrow with one more line.</p>
        <div className="mx-auto mt-5 h-px w-12 bg-brass/60" />
      </div>
    </div>
  );
}
