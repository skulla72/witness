import { useState } from "react";
import { Mic, Check, UserCheck } from "lucide-react";
import { wingman } from "@/data/mens";

/** One man, one week, two questions that never change. */
export function WingmanCard() {
  const [answered, setAnswered] = useState(false);
  const [carried, setCarried] = useState("");
  const [hid, setHid] = useState("");

  return (
    <section className="mt-6 rounded-2xl border border-border bg-card p-5 shadow-soft">
      <p className="text-[10px] uppercase tracking-[0.2em] text-brass">Your wingman · week {wingman.weeks_together}</p>

      <div className="mt-3 flex items-center gap-3">
        <img src={wingman.photo} alt="" className="h-12 w-12 rounded-full object-cover" />
        <div className="min-w-0">
          <p className="font-serif text-[18px] leading-tight text-ink">{wingman.name}</p>
          <p className="text-[11.5px] text-ink-soft">{wingman.city}</p>
        </div>
        <span className="ml-auto inline-flex items-center gap-1 rounded-full border border-hope/40 bg-hope/12 px-2.5 py-1 text-[10.5px] text-ink">
          <UserCheck className="h-3 w-3 text-hope" /> Paired
        </span>
      </div>

      {wingman.his_answer && (
        <div className="mt-4 rounded-xl border border-border bg-paper p-3.5">
          <p className="text-[10px] uppercase tracking-[0.16em] text-ink-soft">He carried</p>
          <p className="mt-1 text-[13.5px] leading-relaxed text-ink">{wingman.his_answer.carried}</p>
          {wingman.his_answer.hid && (
            <>
              <p className="mt-3 text-[10px] uppercase tracking-[0.16em] text-ink-soft">He hid</p>
              <p className="mt-1 text-[13.5px] leading-relaxed text-ink">{wingman.his_answer.hid}</p>
            </>
          )}
        </div>
      )}

      {answered ? (
        <p className="mt-4 inline-flex items-center gap-1.5 text-[13px] text-ink">
          <Check className="h-4 w-4 text-hope" /> Sent to {wingman.name}. That's the week.
        </p>
      ) : (
        <div className="mt-4 space-y-3">
          <label className="block">
            <span className="text-[12.5px] text-ink">{wingman.questions[0]}</span>
            <textarea
              rows={2}
              value={carried}
              onChange={e => setCarried(e.target.value)}
              className="mt-1.5 w-full rounded-xl border border-border bg-paper p-3 text-[13.5px] text-ink placeholder:text-ink-soft/70 focus:outline-none focus:ring-1 focus:ring-brass"
              placeholder="Say it plainly."
            />
          </label>
          <label className="block">
            <span className="text-[12.5px] text-ink">{wingman.questions[1]}</span>
            <textarea
              rows={2}
              value={hid}
              onChange={e => setHid(e.target.value)}
              className="mt-1.5 w-full rounded-xl border border-border bg-paper p-3 text-[13.5px] text-ink placeholder:text-ink-soft/70 focus:outline-none focus:ring-1 focus:ring-brass"
              placeholder="The part you'd normally leave out."
            />
          </label>
          <div className="grid grid-cols-2 gap-2">
            <button
              onClick={() => setAnswered(true)}
              disabled={carried.trim().length < 3}
              className="tap-scale rounded-xl bg-ink py-3 text-[13px] text-paper disabled:opacity-40"
            >
              Send it
            </button>
            <button
              onClick={() => setAnswered(true)}
              className="tap-scale inline-flex items-center justify-center gap-1.5 rounded-xl border border-border bg-paper py-3 text-[13px] text-ink-soft"
            >
              <Mic className="h-3.5 w-3.5" /> Voice note
            </button>
          </div>
          <p className="text-[11px] italic text-ink-soft">
            Answer at 5am if that's when it's true. No streak, no red numbers.
          </p>
        </div>
      )}
    </section>
  );
}
