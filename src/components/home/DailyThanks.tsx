import { Link } from "@tanstack/react-router";
import { PenLine, Check, ArrowRight } from "lucide-react";
import { useJournal } from "@/hooks/useJournal";
import { entryFor, journalStreak, promptFor, todayKey } from "@/lib/journal";

/**
 * A one-line reminder of the private ritual, shown only to people who turned it
 * on. Never a nag: if today is written, it just says so.
 */
export function DailyThanks() {
  const { journal, ready } = useJournal();
  if (!ready || !journal.enabled) return null;

  const day = todayKey();
  const written = !!entryFor(journal, day);
  const streak = journal.tracking ? journalStreak(journal) : 0;

  return (
    <Link
      to="/gratitude"
      className="rise-in tap-scale mt-3 flex items-start gap-3 rounded-3xl border border-border bg-card p-4 shadow-soft"
    >
      {written ? (
        <Check className="mt-0.5 h-4 w-4 shrink-0 text-hope" />
      ) : (
        <PenLine className="mt-0.5 h-4 w-4 shrink-0 text-brass" />
      )}
      <span className="min-w-0">
        <span className="block text-[10px] uppercase tracking-[0.2em] text-ink-soft">
          Your gratitude journal
        </span>
        <span className="mt-1 block font-serif text-[15.5px] leading-snug text-ink">
          {written ? "Today is written." : promptFor(day).text}
        </span>
        <span className="mt-0.5 block text-[11.5px] text-ink-soft">
          {streak > 0 ? `${streak} day${streak === 1 ? "" : "s"} in a row · private` : "Private to you"}
        </span>
      </span>
      <ArrowRight className="ml-auto mt-1 h-3.5 w-3.5 shrink-0 text-ink-soft" />
    </Link>
  );
}
