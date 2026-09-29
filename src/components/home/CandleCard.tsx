import { useState } from "react";
import { Link } from "@tanstack/react-router";
import { toast } from "sonner";
import { Flame, Check, ChevronRight } from "lucide-react";
import { prayFor, type Story } from "@/lib/prayers";
import type { Streak } from "@/lib/home";

const dayLabels = ["", "", "", "", "", "", ""];

/**
 * The daily candle. One tap, one person, once a day.
 * The count is real: days you actually prayed for someone.
 */
export function CandleCard({ streak, target, userId, onLit }: { streak: Streak; target?: Story; userId: string | null; onLit: () => void }) {
  const [busy, setBusy] = useState(false);
  const lit = streak.lit_today;
  const targetName = !target ? "someone" : target.author.id ? target.author.name.split(" ")[0] : "someone anonymous";
  const count = streak.current;

  const light = async () => {
    if (!userId) { toast.error("Sign in to light your candle."); return; }
    if (!target) return;
    setBusy(true);
    try {
      await prayFor(target.id, userId);
      toast.success(`Candle lit. ${targetName} will know.`);
      onLit();
    } catch {
      toast.error("Couldn't light it just now. Try again.");
    } finally { setBusy(false); }
  };

  const labels = ["M", "T", "W", "T", "F", "S", "S"];
  const todayIdx = (new Date().getUTCDay() + 6) % 7;
  void dayLabels;

  return (
    <section className="rise-in overflow-hidden rounded-3xl border border-border bg-gradient-to-b from-[var(--paper-warm)] to-card p-5 shadow-soft">
      <div className="grid grid-cols-[minmax(0,1fr)_auto] items-start gap-4">
        <div className="min-w-0">
          <p className="text-[10px] uppercase tracking-[0.22em] text-brass">Your candle</p>
          <p className="mt-1.5 font-serif text-[27px] leading-none text-ink">
            {count} <span className="text-[15px] font-normal text-ink-soft">{count === 1 ? "day" : "days"} lit</span>
          </p>
          <p className="mt-1.5 text-[12.5px] text-ink-soft">
            Days you showed up for someone else — not days you opened the app.
          </p>
        </div>
        <div className={`grid h-14 w-14 shrink-0 place-items-center rounded-2xl ${lit ? "bg-flame/15 flame-glow" : "bg-secondary"}`}>
          <Flame className={`h-7 w-7 ${lit ? "breathe text-flame" : "text-ink-soft"}`} strokeWidth={1.6} />
        </div>
      </div>

      <div className="mt-4 flex items-center gap-1.5">
        {streak.days.map((on, i) => {
          const labelIdx = (todayIdx - (6 - i) + 7) % 7;
          const isToday = i === 6;
          return (
            <div key={i} className="flex-1 text-center">
              <div className={`h-1.5 rounded-full ${on ? (isToday ? "bg-flame" : "bg-flame/70") : isToday ? "bg-brass/25" : "bg-border"}`} aria-hidden />
              <span className={`mt-1 block text-[9px] tracking-wide ${isToday ? "text-brass" : "text-ink-soft"}`}>{isToday ? "now" : labels[labelIdx]}</span>
            </div>
          );
        })}
      </div>

      {lit ? (
        <div className="mt-4 flex items-center gap-2 rounded-2xl bg-hope/10 px-4 py-3">
          <Check className="h-4 w-4 shrink-0 text-hope" />
          <p className="min-w-0 text-[12.5px] text-ink">Lit today. Best run so far: {streak.best} {streak.best === 1 ? "day" : "days"}.</p>
        </div>
      ) : target ? (
        <div className="mt-4">
          <button onClick={() => void light()} disabled={busy} className="tap-scale flex w-full items-center justify-between gap-3 rounded-2xl bg-ink px-4 py-3.5 text-left text-paper disabled:opacity-60">
            <span className="min-w-0">
              <span className="block text-[13.5px] font-medium">Pray for {targetName} today</span>
              <span className="block truncate text-[11.5px] text-paper/60">{target.ask_caption || "They shared a video ask."}</span>
            </span>
            <Flame className="h-5 w-5 shrink-0 text-brass-light" strokeWidth={1.7} />
          </button>
          <Link to="/sit/$id" params={{ id: target.id }} className="mt-2 inline-flex items-center gap-1 text-[11.5px] tracking-wide text-brass">
            Sit with them instead <ChevronRight className="h-3 w-3" />
          </Link>
        </div>
      ) : (
        <div className="mt-4">
          <Link to="/record" className="tap-scale flex w-full items-center justify-between gap-3 rounded-2xl bg-ink px-4 py-3.5 text-left text-paper">
            <span className="min-w-0">
              <span className="block text-[13.5px] font-medium">No one is waiting right now</span>
              <span className="block truncate text-[11.5px] text-paper/60">Bring a prayer, or invite a friend to bring theirs.</span>
            </span>
            <Flame className="h-5 w-5 shrink-0 text-brass-light" strokeWidth={1.7} />
          </Link>
        </div>
      )}
    </section>
  );
}
