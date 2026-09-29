import { createFileRoute, Link, notFound, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { findPrayer, findUser, intercessionsFor, montageFor } from "@/data/seed";
import { ArrowLeft, Play, Pause, Share2, Download, Sparkles } from "lucide-react";
import { usePrefs } from "@/hooks/usePrefs";
import { toast } from "sonner";

export const Route = createFileRoute("/film/$id")({
  staticData: { sitemap: false },
  component: FilmPage,
  notFoundComponent: () => (
    <div className="p-8 text-center text-ink-soft">No film for this prayer yet.</div>
  ),
  loader: ({ params }) => {
    const prayer = findPrayer(params.id);
    const montage = montageFor(params.id);
    if (!prayer || !montage) throw notFound();
    return { prayer, montage };
  },
  head: () => ({ meta: [{ title: "Answer Film" }] }),
});

function FilmPage() {
  const { prayer, montage } = Route.useLoaderData();
  const navigate = useNavigate();
  const { prefs, ready: prefsReady } = usePrefs();
  const asker = findUser(prayer.user_id);
  const intercessors = intercessionsFor(prayer.id);
  const total = montage.duration_sec;

  const [playing, setPlaying] = useState(true);
  const [t, setT] = useState(0);

  useEffect(() => {
    if (prefsReady && prefs.faithBased === false) {
      void navigate({ to: "/", replace: true });
    }
  }, [navigate, prefs.faithBased, prefsReady]);

  useEffect(() => {
    if (!playing) return;
    const id = setInterval(() => {
      setT(prev => (prev + 0.1 >= total ? 0 : prev + 0.1));
    }, 100);
    return () => clearInterval(id);
  }, [playing, total]);

  // Scene = 0..1 progress
  const p = t / total;
  // Story arc: ask → intercessions → answer
  const stage = p < 0.18 ? "ask" : p < 0.78 ? "intercede" : "answer";

  const shareFilm = async () => {
    const url = typeof window === "undefined" ? "" : window.location.href;
    const title = `An answered prayer — ${asker?.name ?? "a friend"}`;
    try {
      if (typeof navigator !== "undefined" && navigator.share) {
        await navigator.share({ title, url });
        return;
      }
      await navigator.clipboard.writeText(url);
      toast.success("Link copied — paste it anywhere.");
    } catch {
      /* the person closed the share sheet */
    }
  };

  const saveCover = async () => {
    const src = prayer.answer_thumbnail || montage.thumbnail;
    try {
      const blob = await fetch(src).then(r => r.blob());
      const href = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = href;
      a.download = `witness-answer-${prayer.id}.jpg`;
      a.click();
      URL.revokeObjectURL(href);
      toast.success("Saved to your photos.");
    } catch {
      toast.error("Couldn't save that image.");
    }
  };

  if (!prefsReady || prefs.faithBased === false) return null;

  return (
    <div className="fixed inset-0 z-50 bg-black text-white">
      {/* Backdrop image with Ken Burns */}
      <div className="absolute inset-0 overflow-hidden">
        <img
          src={stage === "answer" ? prayer.answer_thumbnail || montage.thumbnail : prayer.ask_thumbnail || montage.thumbnail}
          alt=""
          className="h-full w-full object-cover transition-transform duration-[6000ms] ease-out"
          style={{
            transform: `scale(${1.1 + p * 0.15}) translate(${(p - 0.5) * 2}%, ${(p - 0.5) * -2}%)`,
            filter: stage === "ask" ? "brightness(0.55) saturate(0.7)" : stage === "answer" ? "brightness(0.85)" : "brightness(0.7)",
          }}
        />
        <div className="absolute inset-0 bg-gradient-to-b from-black/40 via-transparent to-black/85" />
      </div>

      {/* Top bar */}
      <div className="relative z-10 flex items-center justify-between px-4 pt-4">
        <Link to="/prayer/$id" params={{ id: prayer.id }} className="rounded-full bg-white/10 backdrop-blur p-2 active:scale-95">
          <ArrowLeft className="h-4 w-4" />
        </Link>
        <div className="flex items-center gap-1.5 text-[10px] uppercase tracking-[0.22em] text-white/80">
          <Sparkles className="h-3 w-3 text-brass-light" /> Answer Film
        </div>
        <button
          onClick={shareFilm}
          aria-label="Share this film"
          className="rounded-full bg-white/10 backdrop-blur p-2 active:scale-95"
        >
          <Share2 className="h-4 w-4" />
        </button>
      </div>

      {/* Center storytelling */}
      <div className="relative z-10 flex flex-col justify-end h-full pb-32 px-6">
        {stage === "ask" && (
          <div className="animate-[fadeIn_700ms_ease-out]">
            <p className="text-[10px] uppercase tracking-[0.3em] text-white/60">The ask · {timeAgoShort(prayer.ask_created_at)}</p>
            <p className="mt-3 font-serif text-[26px] leading-snug">"{prayer.ask_caption}"</p>
            <p className="mt-3 text-[12px] text-white/70">— {asker.name}</p>
          </div>
        )}

        {stage === "intercede" && (
          <div>
            <p className="text-[10px] uppercase tracking-[0.3em] text-brass-light">{montage.contributor_count} stood with them</p>
            <div className="mt-4 flex flex-wrap gap-2">
              {intercessors.slice(0, 6).map((i, idx) => {
                const u = findUser(i.user_id);
                const visible = p * 6 - idx > 0;
                return (
                  <div
                    key={i.id}
                    className="flex items-center gap-2 rounded-full bg-white/10 backdrop-blur px-3 py-1.5 transition-all duration-500"
                    style={{
                      opacity: visible ? 1 : 0,
                      transform: visible ? "translateY(0)" : "translateY(8px)",
                    }}
                  >
                    <img src={u.photo} alt="" className="h-6 w-6 rounded-full" />
                    <span className="text-[11px]">{u.name}</span>
                  </div>
                );
              })}
            </div>
            <p className="mt-5 font-serif text-[20px] leading-snug text-white/90 italic">
              "Standing with you tonight. Won't stop."
            </p>
          </div>
        )}

        {stage === "answer" && (
          <div className="animate-[fadeIn_700ms_ease-out]">
            <p className="text-[10px] uppercase tracking-[0.3em] text-brass-light">He answered</p>
            <p className="mt-3 font-serif text-[28px] leading-snug">"{prayer.answer_caption}"</p>
            {prayer.scripture && (
              <p className="mt-4 text-[12px] text-white/70 italic">
                {prayer.scripture.text} — {prayer.scripture.ref}
              </p>
            )}
          </div>
        )}
      </div>

      {/* Controls */}
      <div className="absolute bottom-0 left-0 right-0 z-10 p-4 pb-6">
        <div className="h-0.5 w-full rounded-full bg-white/15 overflow-hidden">
          <div className="h-full bg-brass-light transition-all duration-100" style={{ width: `${p * 100}%` }} />
        </div>
        <div className="mt-3 flex items-center justify-between">
          <button
            onClick={() => setPlaying(v => !v)}
            className="grid h-11 w-11 place-items-center rounded-full bg-white text-black active:scale-95"
          >
            {playing ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4 translate-x-0.5" />}
          </button>
          <button
            onClick={saveCover}
            className="flex items-center gap-1.5 rounded-full bg-white/10 backdrop-blur px-3.5 py-2 text-[11px]"
          >
            <Download className="h-3.5 w-3.5" /> Save this picture
          </button>
        </div>
      </div>

      <style>{`@keyframes fadeIn { from { opacity: 0; transform: translateY(6px); } to { opacity: 1; transform: translateY(0); } }`}</style>
    </div>
  );
}

function timeAgoShort(iso: string) {
  const d = Math.floor((Date.now() - new Date(iso).getTime()) / 86_400_000);
  return d <= 0 ? "today" : `${d}d ago`;
}