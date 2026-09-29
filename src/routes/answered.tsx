import { createFileRoute, Link } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { timeAgo } from "@/data/seed";
import { BRAND } from "@/config/brand";
import { Sparkles, ArrowLeft } from "lucide-react";
import { useSession } from "@/hooks/useSession";
import { loadFeed, type Story } from "@/lib/prayers";
import { useTone } from "@/hooks/useTone";
import { TestimonyMedia } from "@/components/media/TestimonyMedia";

export const Route = createFileRoute("/answered")({
  staticData: { sitemap: true },
  component: AnsweredWall,
  head: () => ({
    meta: [
      { title: `He Answered — ${BRAND.name}` },
      { name: "description", content: "A wall of answered prayers. Only answers. Only proof." },
      { property: "og:title", content: `He Answered — ${BRAND.name}` },
      { property: "og:description", content: "A wall of answered prayers. Only answers. Only proof." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
});

const lenses = ["All", "Yes", "Differently", "Still trusting"] as const;

function AnsweredWall() {
  const tone = useTone();
  const [lens, setLens] = useState<(typeof lenses)[number]>("All");
  const { userId, signedIn } = useSession();
  const q = useQuery({ queryKey: ["stories", "feed", userId ?? "anon", 200], queryFn: () => loadFeed(userId ?? null, 200), enabled: userId !== undefined });

  const answered = useMemo(() => {
    const base = (q.data ?? [])
      .filter(p => !!p.answer)
      .sort((a, b) => +new Date(b.answer!.created_at) - +new Date(a.answer!.created_at));
    if (lens === "Yes") return base.filter(p => p.status === "answered_yes");
    if (lens === "Differently") return base.filter(p => p.status === "answered_differently");
    if (lens === "Still trusting") return base.filter(p => p.status === "declined");
    return base;
  }, [q.data, lens]);

  return (
    <div className="px-4 pt-4">
      <Link to="/" className="inline-flex items-center gap-1 text-[12px] text-ink-soft hover:text-ink">
        <ArrowLeft className="h-3.5 w-3.5" /> Back
      </Link>

      <section className="mt-3 rounded-3xl border border-brass/30 bg-gradient-to-br from-[var(--gratitude-warm)] to-[var(--paper-warm)] p-6 shadow-soft text-center">
        <Sparkles className="mx-auto h-5 w-5 text-brass" />
        <p className="mt-2 text-[10px] uppercase tracking-[0.24em] text-brass">The Wall</p>
        <h1 className="mt-2 font-serif text-[28px] leading-tight text-ink">He Answered.</h1>
        <p className="mt-2 text-[13px] text-ink-soft italic max-w-xs mx-auto">
          No asks. No noise. Just the answers — the moments faith met reality.
        </p>
        <div className="mx-auto mt-4 h-px w-12 bg-brass/60" />
        <p className="mt-3 text-[11px] uppercase tracking-[0.18em] text-ink-soft">
          {answered.length} {answered.length === 1 ? "answer" : "answers"} shared with you
        </p>
      </section>

      <div className="mt-5 -mx-1 flex gap-1 overflow-x-auto no-scrollbar">
        {lenses.map(t => (
          <button
            key={t}
            onClick={() => setLens(t)}
            className={`shrink-0 px-3.5 py-1.5 rounded-full text-[12px] tracking-wide border transition-colors ${
              lens === t ? "bg-ink text-paper border-ink" : "bg-card text-ink-soft border-border hover:text-ink"
            }`}
          >
            {t === "Still trusting" && !tone.faith ? "Still hoping" : t}
          </button>
        ))}
      </div>

      {signedIn === false ? (
        <div className="mt-8 text-center">
          <p className="font-serif text-[18px] text-ink">Members see the wall.</p>
          <Link to="/login" className="mt-4 inline-block rounded-full bg-ink px-5 py-2.5 text-[13px] text-paper">Sign in</Link>
        </div>
      ) : q.isLoading ? (
        <div className="mt-4 grid grid-cols-2 gap-3">{[0, 1, 2, 3].map(i => <div key={i} className="aspect-[3/4] rounded-2xl bg-card border border-border animate-pulse" />)}</div>
      ) : answered.length === 0 ? (
        <div className="mt-8 px-6 text-center">
          <p className="font-serif text-[18px] text-ink">The wall is waiting for its first answer.</p>
          <p className="mt-1 text-[13px] text-ink-soft italic">When a {tone.ask} you posted {tone.answered === "answered" ? "is answered" : "comes through"}, record the reaction and it appears here.</p>
        </div>
      ) : (
        <div className="mt-4 grid grid-cols-2 gap-3">
          {answered.map(p => <AnswerTile key={p.id} prayer={p} />)}
        </div>
      )}

      <div className="mt-10 mb-4 text-center">
        <Sparkles className="mx-auto h-4 w-4 text-brass" />
        <p className="mt-3 font-serif text-[18px] text-ink">That's the wall — for now.</p>
        <p className="mt-1 text-[13px] text-ink-soft italic">Bring back an answer of your own.</p>
        <Link to="/record" search={{ mode: "reaction" }} className="inline-block mt-5 rounded-full bg-ink text-paper text-[12.5px] tracking-wide px-5 py-2.5">
          Record an answer
        </Link>
      </div>
    </div>
  );
}

function AnswerTile({ prayer }: { prayer: Story }) {
  const toneLabel: Record<string, string> = {
    answered_yes: "Yes", answered_differently: "Differently", declined: "Still trusting", ongoing: "Ongoing", open: "Open",
  };
  const a = prayer.answer!;
  return (
    <Link to="/prayer/$id" params={{ id: prayer.id }} className="group block rounded-2xl overflow-hidden border border-border bg-card shadow-soft">
      <div className="relative aspect-[3/4] bg-ink">
        {a.media_path && a.media_type === "video" && (
          <TestimonyMedia path={a.media_path} type="video" controls={false} className="absolute inset-0 h-full w-full object-cover opacity-95" />
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-ink/85 via-ink/20 to-transparent pointer-events-none" />
        <span className="absolute top-2 left-2 text-[9px] uppercase tracking-[0.18em] text-ink bg-brass/95 px-2 py-0.5 rounded">
          {toneLabel[prayer.status]}
        </span>
        <div className="absolute bottom-0 left-0 right-0 p-3 pointer-events-none">
          <p className="text-paper font-serif text-[13.5px] leading-snug line-clamp-3">
            "{a.caption || prayer.ask_caption}"
          </p>
          <p className="mt-1.5 text-[10px] uppercase tracking-[0.14em] text-paper/70">
            {prayer.author.name} · {timeAgo(a.created_at)}
          </p>
        </div>
      </div>
    </Link>
  );
}
