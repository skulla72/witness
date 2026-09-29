import { useState } from "react";
import { Lock, Check, X, ShieldAlert, BookOpen } from "lucide-react";
import { fatherWound, CRISIS, type TrackSession } from "@/data/mens";

/** Eight private sessions. No score, no streak, a visible ceiling. */
export function FatherWoundTrack() {
  const [open, setOpen] = useState<TrackSession | null>(null);
  const done = fatherWound.sessions.filter(s => s.done).length;

  return (
    <section className="mt-6">
      <div className="rounded-2xl border border-border bg-card p-5 shadow-soft">
        <p className="text-[10px] uppercase tracking-[0.2em] text-brass">Guided track · private</p>
        <h2 className="mt-2 font-serif text-[22px] leading-tight text-ink">{fatherWound.title}</h2>
        <p className="mt-2 text-[13px] leading-relaxed text-ink-soft">{fatherWound.intro}</p>

        <div className="mt-4 h-1 overflow-hidden rounded-full bg-secondary">
          <div className="h-full bg-hope" style={{ width: `${(done / fatherWound.sessions.length) * 100}%` }} />
        </div>
        <p className="mt-1.5 text-[11px] text-ink-soft">
          {done} of {fatherWound.sessions.length} sessions · go at your pace
        </p>

        <div className="mt-4 rounded-xl border border-border bg-paper p-3.5">
          <p className="inline-flex items-center gap-1.5 text-[11px] uppercase tracking-[0.14em] text-ink-soft">
            <ShieldAlert className="h-3 w-3 text-brass" /> Where this ends
          </p>
          <p className="mt-1.5 text-[12.5px] leading-snug text-ink-soft">{fatherWound.ceiling}</p>
          <div className="mt-2.5 space-y-1">
            {CRISIS.map(c => (
              <a key={c.label} href={c.href} className="block text-[12px] text-brass">
                {c.label}
              </a>
            ))}
          </div>
        </div>
      </div>

      <ol className="mt-4 space-y-2">
        {fatherWound.sessions.map(s => (
          <li key={s.n}>
            <button
              onClick={() => setOpen(s)}
              className="tap-scale flex w-full items-start gap-3 rounded-2xl border border-border bg-card p-4 text-left shadow-soft"
            >
              <span
                className={`mt-0.5 grid h-6 w-6 shrink-0 place-items-center rounded-full text-[11px] ${
                  s.done ? "bg-hope/20 text-ink" : "border border-border text-ink-soft"
                }`}
              >
                {s.done ? <Check className="h-3.5 w-3.5 text-hope" /> : s.n}
              </span>
              <span className="min-w-0">
                <span className="block font-serif text-[15.5px] leading-tight text-ink">{s.title}</span>
                <span className="mt-0.5 block text-[12px] text-ink-soft">
                  {s.minutes} min · {s.scripture}
                </span>
              </span>
              <Lock className="ml-auto mt-1 h-3.5 w-3.5 shrink-0 text-ink-soft" />
            </button>
          </li>
        ))}
      </ol>

      {open && <SessionSheet s={open} onClose={() => setOpen(null)} />}
    </section>
  );
}

function SessionSheet({ s, onClose }: { s: TrackSession; onClose: () => void }) {
  const [text, setText] = useState("");
  const [saved, setSaved] = useState(false);

  return (
    <div className="fixed inset-0 z-50 flex items-end bg-ink/50 backdrop-blur-sm">
      <div className="rise-in mx-auto w-full max-w-md rounded-t-3xl border border-border bg-paper p-5">
        <div className="flex items-center justify-between">
          <p className="text-[10px] uppercase tracking-[0.2em] text-brass">
            Session {s.n} · only you can read this
          </p>
          <button onClick={onClose} aria-label="Close" className="text-ink-soft">
            <X className="h-4 w-4" />
          </button>
        </div>

        {saved ? (
          <div className="py-8 text-center">
            <Check className="mx-auto h-6 w-6 text-hope" />
            <p className="mt-3 font-serif text-[20px] text-ink">Kept, and kept private.</p>
            <p className="mx-auto mt-1 max-w-[260px] text-[13px] italic text-ink-soft">
              You can bring one line to the room later — or never.
            </p>
            <button onClick={onClose} className="mt-5 rounded-full bg-ink px-5 py-2.5 text-[12.5px] text-paper">
              Done
            </button>
          </div>
        ) : (
          <>
            <h3 className="mt-3 font-serif text-[22px] leading-tight text-ink">{s.title}</h3>
            <p className="mt-2 text-[14px] leading-relaxed text-ink">{s.prompt}</p>
            <p className="mt-2.5 inline-flex items-center gap-1.5 text-[12px] text-brass">
              <BookOpen className="h-3 w-3" /> {s.scripture}
            </p>
            <textarea
              rows={6}
              value={text}
              onChange={e => setText(e.target.value)}
              placeholder="Nobody sees this but you."
              className="mt-3 w-full rounded-xl border border-border bg-card p-3.5 text-[14px] leading-relaxed text-ink placeholder:text-ink-soft/70 focus:outline-none focus:ring-1 focus:ring-brass"
            />
            <p className="mt-1.5 text-[11.5px] text-ink-soft">
              If you ever want to share something from this session: {s.shareable}
            </p>
            <button
              onClick={() => setSaved(true)}
              className="tap-scale mt-3 w-full rounded-xl bg-ink py-3 text-[13.5px] text-paper"
            >
              Keep it private
            </button>
          </>
        )}
      </div>
    </div>
  );
}
