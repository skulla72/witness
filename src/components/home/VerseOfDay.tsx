import { Link } from "@tanstack/react-router";
import { BookOpen, ArrowRight } from "lucide-react";
import { verseOfDay } from "@/lib/bible.data";

/** One verse, every day. Quiet, deterministic, no network. */
export function VerseOfDay() {
  const v = verseOfDay();
  return (
    <section className="rise-in mt-3 rounded-3xl border border-brass/25 bg-card p-5 shadow-soft">
      <div className="flex items-center gap-2">
        <BookOpen className="h-3.5 w-3.5 text-brass" />
        <span className="text-[10px] uppercase tracking-[0.22em] text-ink-soft">Verse of the day</span>
      </div>
      <p className="mt-2.5 font-serif text-[18px] leading-snug text-ink">"{v.text}"</p>
      <div className="mt-3 flex items-center justify-between">
        <p className="text-[11px] uppercase tracking-[0.18em] text-brass">{v.ref}</p>
        <Link
          to="/bible"
          search={{ ref: v.ref }}
          className="tap-scale inline-flex items-center gap-1 text-[11.5px] text-ink-soft"
        >
          Read it <ArrowRight className="h-3.5 w-3.5" />
        </Link>
      </div>
    </section>
  );
}
