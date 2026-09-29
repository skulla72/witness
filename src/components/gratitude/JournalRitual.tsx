import { useEffect, useState } from "react";
import { Check, PenLine, Sun, Moon, Trash2, BarChart3 } from "lucide-react";
import { useJournal } from "@/hooks/useJournal";
import {
  affirmationFor,
  draftFor,
  entrySummary,
  hasAnything,
  journalStreak,
  lastSevenDays,
  prettyDay,
  promptFor,
  removeEntry,
  saveEntry,
  todayKey,
  type JournalEntry,
} from "@/lib/journal";

/**
 * The daily ritual. Off until someone asks for it, private always, and it never
 * scolds: tracking is opt-in and a missed day costs nothing.
 */
export function JournalRitual() {
  const { journal, ready, update } = useJournal();
  const day = todayKey();
  const [entry, setEntry] = useState<JournalEntry>(() => draftFor(journal, day));
  const [saved, setSaved] = useState(false);
  const [evening, setEvening] = useState(false);
  const prompt = promptFor(day);

  useEffect(() => {
    setEntry(draftFor(journal, day));
  }, [journal.entries, day]);

  if (!ready) return null;

  if (!journal.enabled) {
    return (
      <section className="rise-in rounded-3xl border border-brass/30 bg-card p-5 shadow-soft">
        <div className="flex items-center gap-2">
          <PenLine className="h-3.5 w-3.5 text-brass" />
          <span className="text-[10px] uppercase tracking-[0.22em] text-ink-soft">
            Daily ritual · optional
          </span>
        </div>
        <p className="mt-2.5 font-serif text-[19px] leading-snug text-ink">
          Keep this as a gratitude journal?
        </p>
        <p className="mt-2 text-[12.5px] leading-relaxed text-ink-soft">
          A few short lines a day, only for you. Nothing is counted unless you ask for it, it stays
          private on this device, and you can turn it off any time without losing what you wrote.
        </p>
        <button
          onClick={() => update({ enabled: true })}
          className="tap-scale mt-4 w-full rounded-full bg-ink py-3 text-[13px] text-paper"
        >
          Turn the daily ritual on
        </button>
      </section>
    );
  }

  const week = lastSevenDays(journal);
  const streak = journalStreak(journal);
  const written = hasAnything(entry) && journal.entries.some(e => e.day === day);

  const setList = (key: "grateful" | "great", i: number, v: string) =>
    setEntry(prev => {
      const next = [...prev[key]];
      next[i] = v;
      return { ...prev, [key]: next };
    });

  const field =
    "w-full rounded-2xl border border-border bg-paper px-4 py-2.5 text-[14px] leading-relaxed text-ink placeholder:text-ink-soft/70 focus:outline-none focus:ring-1 focus:ring-brass";

  const save = () => {
    if (!hasAnything(entry)) return;
    saveEntry(entry);
    setSaved(true);
    window.setTimeout(() => setSaved(false), 2200);
  };

  return (
    <section className="rise-in overflow-hidden rounded-3xl border border-border bg-gradient-to-b from-[var(--paper-warm)] to-card p-5 shadow-soft">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-[10px] uppercase tracking-[0.22em] text-brass">Your journal</p>
          <p className="mt-1.5 font-serif text-[21px] leading-tight text-ink">
            {evening ? "Close the day" : "Begin the day"}
          </p>
        </div>
        <button
          onClick={() => update({ enabled: false })}
          className="shrink-0 rounded-full border border-border px-3 py-1.5 text-[11px] text-ink-soft"
        >
          Turn off
        </button>
      </div>

      {journal.tracking && (
        <div className="mt-4 flex items-center gap-1.5">
          {week.map((d, i) => (
            <div key={d.day} className="flex-1 text-center">
              <div
                className={`h-1.5 rounded-full ${d.written ? "bg-hope" : "bg-border"}`}
                aria-hidden
              />
              <span className="mt-1 block text-[9px] tracking-wide text-ink-soft">
                {i === 6 ? "now" : d.label}
              </span>
            </div>
          ))}
        </div>
      )}

      <div className="mt-4 flex gap-1.5">
        <button
          onClick={() => setEvening(false)}
          className={`flex-1 rounded-full border px-3 py-1.5 text-[11.5px] ${
            evening ? "border-border bg-paper text-ink-soft" : "border-ink bg-ink text-paper"
          }`}
        >
          <Sun className="mr-1 inline h-3.5 w-3.5" /> Morning
        </button>
        <button
          onClick={() => setEvening(true)}
          className={`flex-1 rounded-full border px-3 py-1.5 text-[11.5px] ${
            evening ? "border-ink bg-ink text-paper" : "border-border bg-paper text-ink-soft"
          }`}
        >
          <Moon className="mr-1 inline h-3.5 w-3.5" /> Evening
        </button>
      </div>

      {!evening ? (
        <div className="mt-4 space-y-4">
          <div>
            <p className="text-[12px] text-ink-soft">Three things you're grateful for</p>
            <div className="mt-2 space-y-2">
              {entry.grateful.map((v, i) => (
                <input
                  key={i}
                  value={v}
                  onChange={e => setList("grateful", i, e.target.value)}
                  placeholder={i === 0 ? "Even something small." : "Optional"}
                  className={field}
                />
              ))}
            </div>
          </div>
          <div>
            <p className="text-[12px] text-ink-soft">Three things that would make today great</p>
            <div className="mt-2 space-y-2">
              {entry.great.map((v, i) => (
                <input
                  key={i}
                  value={v}
                  onChange={e => setList("great", i, e.target.value)}
                  placeholder={i === 0 ? "One is plenty." : "Optional"}
                  className={field}
                />
              ))}
            </div>
          </div>
          <div>
            <p className="text-[12px] text-ink-soft">One affirmation, in your own words</p>
            <input
              value={entry.affirmation}
              onChange={e => setEntry({ ...entry, affirmation: e.target.value })}
              placeholder={affirmationFor(day)}
              className={`${field} mt-2`}
            />
          </div>
        </div>
      ) : (
        <div className="mt-4 space-y-4">
          <div>
            <p className="text-[12px] text-ink-soft">Something amazing that happened</p>
            <textarea
              value={entry.amazing}
              onChange={e => setEntry({ ...entry, amazing: e.target.value })}
              rows={2}
              className={`${field} mt-2 resize-none`}
              placeholder="A moment worth keeping."
            />
          </div>
          <div>
            <p className="text-[12px] text-ink-soft">
              One gentle way today could have been better
            </p>
            <textarea
              value={entry.better}
              onChange={e => setEntry({ ...entry, better: e.target.value })}
              rows={2}
              className={`${field} mt-2 resize-none`}
              placeholder="Kindly. This is never scored."
            />
          </div>
          <div>
            <p className="font-serif text-[15.5px] leading-snug text-ink">{prompt.text}</p>
            <textarea
              value={entry.reflection}
              onChange={e => setEntry({ ...entry, reflection: e.target.value })}
              rows={3}
              maxLength={600}
              className={`${field} mt-2 resize-none`}
              placeholder="Only if you want to."
            />
          </div>
        </div>
      )}

      <div className="mt-4 flex items-center gap-2">
        <button
          onClick={save}
          disabled={!hasAnything(entry)}
          className="tap-scale flex-1 rounded-full bg-ink py-3 text-[13px] text-paper disabled:opacity-40"
        >
          {written ? "Update today" : "Keep today"}
        </button>
        <button
          onClick={() => update({ tracking: !journal.tracking })}
          className="inline-flex shrink-0 items-center gap-1.5 rounded-full border border-border px-3.5 py-3 text-[11.5px] text-ink-soft"
        >
          <BarChart3 className="h-3.5 w-3.5 text-brass" />
          {journal.tracking ? "Tracking on" : "Tracking off"}
        </button>
      </div>
      {(saved || written) && (
        <p className="mt-2.5 inline-flex items-center gap-1.5 text-[11.5px] text-hope">
          <Check className="h-3.5 w-3.5" />
          {saved
            ? "Kept. Only you can see it."
            : journal.tracking && streak > 1
              ? `Written today · ${streak} days`
              : "Written today."}
        </p>
      )}

      {journal.entries.length > 0 && (
        <div className="mt-5 border-t border-border pt-4">
          <p className="text-[10px] uppercase tracking-[0.2em] text-ink-soft">Earlier entries</p>
          <ul className="mt-2.5 space-y-2">
            {journal.entries.slice(0, 8).map(e => (
              <li
                key={e.id}
                className="flex items-start gap-3 rounded-2xl border border-border bg-card px-4 py-3"
              >
                <div className="min-w-0 flex-1">
                  <p className="text-[10px] uppercase tracking-[0.16em] text-brass">
                    {prettyDay(e.day)}
                  </p>
                  <p className="mt-1 font-serif text-[14.5px] leading-snug text-ink">
                    {entrySummary(e)}
                  </p>
                </div>
                <button
                  onClick={() => removeEntry(e.id)}
                  aria-label={`Delete entry from ${prettyDay(e.day)}`}
                  className="shrink-0 text-ink-soft"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}
    </section>
  );
}
