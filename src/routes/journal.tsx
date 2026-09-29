import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { statusLabel, timeAgo } from "@/data/seed";
import { useSession } from "@/hooks/useSession";
import { loadStoriesBy, type Story } from "@/lib/prayers";
import { Lock, Sparkles } from "lucide-react";
import { useTone } from "@/hooks/useTone";
import { categoryForTone } from "@/lib/tone";

export const Route = createFileRoute("/journal")({
  staticData: { sitemap: false },
  component: Journal,
  head: () => ({ meta: [
    { title: "Journal · Witness" },
    { name: "description", content: "Every prayer you've spoken, and what He did with it." },
    { property: "og:title", content: "Journal · Witness" },
    { property: "og:description", content: "Every prayer you've spoken, and what He did with it." },
    { property: "og:type", content: "website" },
    { name: "twitter:card", content: "summary" },
  ] }),
});

function Journal() {
  const { userId, signedIn } = useSession();
  const tone = useTone();
  const q = useQuery({ queryKey: ["stories", "mine", userId ?? "anon"], queryFn: () => loadStoriesBy(userId!, userId!), enabled: !!userId });
  const mine = q.data ?? [];
  const open = mine.filter(p => p.status === "open" || p.status === "ongoing");
  const answered = mine.filter(p => p.status === "answered_yes" || p.status === "answered_differently");
  const trusting = mine.filter(p => p.status === "declined");

  return (
    <div className="px-6 pt-6">
      <header className="mb-8">
        <p className="text-[11px] uppercase tracking-[0.22em] text-brass">A personal record</p>
        <h1 className="mt-2 font-serif text-[34px] leading-none text-ink">My Journal</h1>
        <p className="mt-3 text-[14px] text-ink-soft leading-relaxed">
          Every prayer you've spoken aloud. Open the page when you need to remember what He's done.
        </p>
      </header>

      {signedIn === false ? (
        <div className="text-center">
          <p className="font-serif text-[18px] text-ink-soft">Sign in to open your journal.</p>
          <Link to="/login" className="mt-4 inline-block rounded-full bg-ink px-5 py-2.5 text-[13px] text-paper">Sign in</Link>
        </div>
      ) : q.isLoading ? (
        <div className="space-y-3">{[0, 1, 2].map(i => <div key={i} className="h-24 rounded-xl bg-card border border-border animate-pulse" />)}</div>
      ) : q.isError ? (
        <p className="text-center text-[13px] text-destructive">Couldn't load your journal. Pull to try again.</p>
      ) : (
        <>
          <Section title={tone.faith ? "Still asking" : "Still hoping"} items={open} />
          <Section title={tone.faith ? "Answered" : "Came through"} items={answered} />
          <Section title={tone.faith ? "Still trusting" : "Still unfolding"} items={trusting} />
          {mine.length === 0 && (
            <div className="mt-12 text-center">
              <p className="font-serif text-[18px] text-ink-soft">{tone.faith ? "No prayers yet. The first one is the hardest." : "No hopes yet. Sharing the first one is the hardest."}</p>
              <Link to="/record" search={{ mode: "prayer" }} className="mt-4 inline-block rounded-full bg-ink px-5 py-2.5 text-[13px] text-paper">{tone.faith ? "Record a prayer" : "Share a hope"}</Link>
            </div>
          )}
        </>
      )}
    </div>
  );
}

function Section({ title, items }: { title: string; items: Story[] }) {
  const tone = useTone();
  if (items.length === 0) return null;
  return (
    <section className="mb-10">
      <h2 className="font-serif text-[15px] text-ink-soft mb-3 flex items-center gap-3">
        <span className="h-px flex-1 bg-border" />
        <span className="tracking-wide">{title}</span>
        <span className="h-px flex-1 bg-border" />
      </h2>
      <ul className="space-y-3">
        {items.map(p => (
          <li key={p.id}>
            <Link
              to="/prayer/$id"
              params={{ id: p.id }}
              className="block bg-card rounded-xl border border-border p-4 shadow-soft hover:border-brass/60 transition-colors"
            >
              <p className="font-serif text-[16px] leading-snug text-ink">"{p.ask_caption || (p.ask_kind === "voice" ? (tone.faith ? "Voice prayer" : "Voice hope") : (tone.faith ? "Video prayer" : "Video hope"))}"</p>
              <div className="mt-3 flex flex-wrap items-center gap-2 text-[11px] text-ink-soft uppercase tracking-[0.14em]">
                <span>{timeAgo(p.ask_created_at)}</span>
                <span>·</span>
                <span>{categoryForTone(p.category, tone)}</span>
                <span>·</span>
                <span className="text-brass">{statusLabel[p.status]}</span>
                {p.privacy === "private" && <span className="inline-flex items-center gap-1"><Lock className="h-3 w-3" /> private</span>}
              </div>
              {p.answer?.caption && (
                <p className="mt-3 pl-3 border-l-2 border-brass/60 text-[13px] text-ink-soft italic">
                  "{p.answer.caption}"
                </p>
              )}
              {!p.answer && p.status === "open" && (
                <p className="mt-3 text-[11.5px] text-brass inline-flex items-center gap-1"><Sparkles className="h-3 w-3" /> {tone.faith ? `${p.intercession_count} praying · tap to post the answer when it comes` : `${p.intercession_count} supporting · tap to share what happens`}</p>
              )}
            </Link>
          </li>
        ))}
      </ul>
    </section>
  );
}
