import { createFileRoute, Link } from "@tanstack/react-router";
import { prayers, statusLabel, timeAgo, montageFor } from "@/data/seed";
import { ArrowLeft, Sparkles, Film, Flame } from "lucide-react";

export const Route = createFileRoute("/ledger")({
  staticData: { sitemap: false },
  component: LedgerPage,
  head: () => ({ meta: [{ title: "Faithfulness Ledger" }] }),
});

function LedgerPage() {
  // "My" ledger — all prayers, sorted oldest → newest, so it reads like a timeline
  const mine = [...prayers].sort(
    (a, b) => +new Date(a.ask_created_at) - +new Date(b.ask_created_at)
  );
  const answered = mine.filter(p => p.status === "answered_yes" || p.status === "answered_differently");
  const ongoing = mine.filter(p => p.status === "open" || p.status === "ongoing");
  // The one film that already exists — so the button goes somewhere real.
  const sampleFilm = [...answered].reverse().find(p => montageFor(p.id));

  return (
    <div className="px-4 pt-3 pb-6">
      <div className="flex items-center justify-between">
        <Link to="/" className="rounded-full bg-card border border-border p-2">
          <ArrowLeft className="h-4 w-4 text-ink" />
        </Link>
        <div className="flex items-center gap-1.5 text-[10px] uppercase tracking-[0.22em] text-brass-deep">
          <Flame className="h-3 w-3" /> Faithfulness Ledger
        </div>
        <div className="w-8" />
      </div>

      <h1 className="mt-3 font-serif text-[26px] leading-tight text-ink">Every prayer you've brought.</h1>
      <p className="mt-1 text-[12.5px] text-ink-soft">A quiet record. He's been faithful.</p>

      {/* Stats strip */}
      <div className="mt-5 grid grid-cols-3 gap-2">
        <Stat n={mine.length} label="Brought" />
        <Stat n={answered.length} label="Answered" gold />
        <Stat n={ongoing.length} label="Still asking" />
      </div>

      {/* Year of Faith card */}
      <div className="mt-5 relative overflow-hidden rounded-3xl border border-brass/40 bg-gradient-to-br from-[oklch(0.22_0.02_60)] via-[oklch(0.18_0.025_55)] to-[oklch(0.14_0.02_50)] p-5 shadow-lift">
        <div className="absolute inset-0 opacity-30">
          {Array.from({ length: 30 }).map((_, i) => (
            <span key={i} className="absolute h-px w-px rounded-full bg-brass-light"
              style={{ left: `${(i * 41) % 100}%`, top: `${(i * 67) % 100}%` }} />
          ))}
        </div>
        <div className="relative">
          <div className="flex items-center gap-1.5 text-[10px] uppercase tracking-[0.25em] text-brass-light">
            <Sparkles className="h-3 w-3" /> 2026 · Your Year of Faith
          </div>
          <p className="mt-2 font-serif text-[22px] leading-tight text-paper">
            A two-minute film of your year, ready in December.
          </p>
          <p className="mt-2 text-[12px] text-paper/70">
            Every answered prayer, every gratitude, scored and woven. Yours to keep.
          </p>
          {sampleFilm && (
            <Link
              to="/film/$id"
              params={{ id: sampleFilm.id }}
              className="tap-scale mt-4 inline-flex items-center gap-1.5 rounded-full bg-brass-light text-ink text-[12px] tracking-wide px-4 py-2"
            >
              <Film className="h-3.5 w-3.5" /> See what a film looks like
            </Link>
          )}
        </div>
      </div>

      {/* Timeline */}
      <h2 className="mt-7 font-serif text-[18px] text-ink">The ledger</h2>
      <ol className="mt-3 relative">
        <span className="absolute left-[11px] top-2 bottom-2 w-px bg-border" />
        {mine.map(p => {
          const isAnswered = p.status === "answered_yes" || p.status === "answered_differently";
          const hasFilm = !!montageFor(p.id);
          return (
            <li key={p.id} className="relative pl-8 pb-5">
              <span
                className={`absolute left-1.5 top-2 h-4 w-4 rounded-full border-2 ${
                  isAnswered
                    ? "bg-brass-light border-brass-deep shadow-[0_0_10px_oklch(0.72_0.105_75/.6)]"
                    : p.status === "declined"
                    ? "bg-paper border-ink-soft"
                    : "bg-card border-border"
                }`}
              />
              <div className="flex items-center gap-2 text-[10px] uppercase tracking-[0.18em] text-ink-soft">
                <span>{timeAgo(p.ask_created_at)} ago</span>
                <span>·</span>
                <span className={isAnswered ? "text-brass-deep" : ""}>{statusLabel[p.status]}</span>
              </div>
              <p className="mt-1.5 font-serif text-[15px] leading-snug text-ink line-clamp-2">
                "{p.ask_caption}"
              </p>
              {isAnswered && p.answer_caption && (
                <p className="mt-1 text-[12.5px] text-ink-soft italic line-clamp-2">→ {p.answer_caption}</p>
              )}
              <div className="mt-2 flex gap-2">
                <Link to="/prayer/$id" params={{ id: p.id }} className="text-[11px] text-brass-deep">
                  Open
                </Link>
                {hasFilm && (
                  <Link to="/film/$id" params={{ id: p.id }} className="inline-flex items-center gap-1 text-[11px] text-brass-deep">
                    <Film className="h-3 w-3" /> Watch the film
                  </Link>
                )}
              </div>
            </li>
          );
        })}
      </ol>

      <p className="mt-6 text-center text-[12px] text-ink-soft italic">
        "He has been faithful. Mark it."
      </p>
    </div>
  );
}

function Stat({ n, label, gold }: { n: number; label: string; gold?: boolean }) {
  return (
    <div className={`rounded-2xl border p-3 text-center ${gold ? "border-brass/50 bg-brass-light/10" : "border-border bg-card"}`}>
      <div className={`font-serif text-[22px] leading-none ${gold ? "text-brass-deep" : "text-ink"}`}>{n}</div>
      <div className="mt-1 text-[10px] uppercase tracking-[0.18em] text-ink-soft">{label}</div>
    </div>
  );
}