import { useState } from "react";
import { Mic, Video, Type, Lock, Check, BookOpen, Flame, X } from "lucide-react";
import { confessions, CONFESSION_RULES, type Confession } from "@/data/mens";

const since = (iso: string) => {
  const h = Math.round((Date.now() - +new Date(iso)) / 3600_000);
  return h < 1 ? "just now" : h < 24 ? `${h}h ago` : `${Math.round(h / 24)}d ago`;
};

export function ConfessionalRoom() {
  const [open, setOpen] = useState(false);
  const [sent, setSent] = useState(false);

  return (
    <section className="mt-6">
      <div className="rounded-2xl border border-border bg-card p-5 shadow-soft">
        <p className="inline-flex items-center gap-1.5 text-[10px] uppercase tracking-[0.2em] text-brass">
          <Lock className="h-3 w-3" /> Anonymous room · opening after beta
        </p>
        <h2 className="mt-2 font-serif text-[22px] leading-tight text-ink">The Confessional</h2>
        <p className="mt-2 text-[13px] leading-relaxed text-ink-soft">
          Say the thing you've never said. No name, no face, no profile attached — and no
          advice comes back. Only three responses exist in this room.
        </p>
        <ul className="mt-4 space-y-1.5">
          {CONFESSION_RULES.map(r => (
            <li key={r} className="flex gap-2 text-[12px] leading-snug text-ink-soft">
              <Check className="mt-0.5 h-3 w-3 shrink-0 text-hope" />
              {r}
            </li>
          ))}
        </ul>
        <div className="mt-4 rounded-xl border border-dashed border-border bg-paper px-3.5 py-3 text-[12.5px] leading-snug text-ink-soft">
          This room isn't live during the private beta — nothing typed here is sent or stored yet. The cards below are examples of how it will feel. Need to say something now? Post an <span className="text-ink">anonymous prayer</span> instead; the same no-advice agreement applies.
        </div>
        <button
          onClick={() => setOpen(true)}
          className="tap-scale mt-3 w-full rounded-xl border border-border bg-paper py-3 text-[13.5px] text-ink"
        >
          Preview the door
        </button>
      </div>

      <p className="mt-4 px-1 text-[10px] uppercase tracking-[0.18em] text-ink-soft">Examples · not real posts</p>
      <div className="mt-2 space-y-3">
        {confessions.map(c => (
          <ConfessionCard key={c.id} c={c} />
        ))}
      </div>

      {open && <Composer onClose={() => setOpen(false)} sent={sent} onSend={() => setSent(true)} />}
    </section>
  );
}

function ConfessionCard({ c }: { c: Confession }) {
  const [meToo, setMeToo] = useState(false);
  const [prayed, setPrayed] = useState(false);
  const [showScripture, setShowScripture] = useState(false);
  const Icon = c.kind === "voice" ? Mic : c.kind === "video" ? Video : Type;

  return (
    <article
      className={`rounded-2xl border bg-card p-4 shadow-soft ${
        c.lighter ? "border-flame/30" : "border-border"
      }`}
    >
      <div className="flex items-center justify-between">
        <span className="inline-flex items-center gap-1.5 text-[11.5px] text-ink-soft">
          <Icon className="h-3.5 w-3.5" strokeWidth={1.7} />
          {c.handle}
          {c.duration_sec ? ` · ${Math.floor(c.duration_sec / 60)}:${String(c.duration_sec % 60).padStart(2, "0")}` : ""}
        </span>
        <span className="text-[11px] text-ink-soft">{since(c.at)}</span>
      </div>

      <p className="mt-2.5 text-[14px] leading-relaxed text-ink">{c.body}</p>

      {c.lighter && (
        <p className="mt-2 inline-flex items-center gap-1 text-[11px] uppercase tracking-[0.14em] text-flame">
          <Flame className="h-3 w-3" /> He said it got lighter
        </p>
      )}

      {c.scripture.length > 0 && (
        <div className="mt-3 flex flex-wrap gap-1.5">
          {c.scripture.map(s => (
            <span
              key={s.ref + s.handle}
              className="inline-flex items-center gap-1 rounded-full border border-brass/35 bg-brass/10 px-2 py-0.5 text-[10.5px] text-brass"
            >
              <BookOpen className="h-2.5 w-2.5" /> {s.ref}
            </span>
          ))}
        </div>
      )}

      <div className="mt-3 grid grid-cols-3 gap-2">
        <button
          onClick={() => setMeToo(v => !v)}
          className={`rounded-xl border py-2 text-[12px] transition-colors ${
            meToo ? "border-hope bg-hope/15 text-ink" : "border-border bg-paper text-ink-soft"
          }`}
        >
          Me too · {c.me_too + (meToo ? 1 : 0)}
        </button>
        <button
          onClick={() => setShowScripture(v => !v)}
          aria-expanded={showScripture}
          className={`rounded-xl border py-2 text-[12px] transition-colors ${
            showScripture ? "border-brass bg-brass/12 text-ink" : "border-border bg-paper text-ink-soft"
          }`}
        >
          Scripture · {c.scripture.length}
        </button>
        <button
          onClick={() => setPrayed(v => !v)}
          className={`rounded-xl border py-2 text-[12px] transition-colors ${
            prayed ? "border-flame/40 bg-flame/12 text-ink" : "border-border bg-paper text-ink-soft"
          }`}
        >
          Pray · {c.prayers + (prayed ? 1 : 0)}
        </button>
      </div>

      {showScripture && (
        <div className="mt-3 rounded-xl border border-border bg-paper p-3">
          {c.scripture.length > 0 ? (
            <ul className="space-y-1.5">
              {c.scripture.map(s => (
                <li key={s.ref + s.handle} className="flex items-center gap-2 text-[12px] text-ink">
                  <BookOpen className="h-3 w-3 shrink-0 text-brass" />
                  <span>{s.ref}</span>
                  <span className="text-ink-soft">· left by {s.handle}</span>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-[12px] leading-snug text-ink-soft">
              No verse has been left on this one yet.
            </p>
          )}
          <p className="mt-2 text-[11px] leading-snug text-ink-soft">
            This room is a preview during the private beta — you can read the verses men left, but
            nothing you add here is sent or stored yet.
          </p>
        </div>
      )}
    </article>
  );
}

function Composer({
  onClose,
  sent,
  onSend,
}: {
  onClose: () => void;
  sent: boolean;
  onSend: () => void;
}) {
  const [body, setBody] = useState("");
  const [mode, setMode] = useState<"text" | "voice" | "video">("text");

  return (
    <div className="fixed inset-0 z-50 flex items-end bg-ink/45 backdrop-blur-sm">
      <div className="rise-in mx-auto w-full max-w-md rounded-t-3xl border border-border bg-paper p-5">
        <div className="flex items-center justify-between">
          <p className="inline-flex items-center gap-1.5 text-[10px] uppercase tracking-[0.2em] text-brass">
            <Lock className="h-3 w-3" /> You will appear as an animal name
          </p>
          <button onClick={onClose} aria-label="Close" className="text-ink-soft">
            <X className="h-4 w-4" />
          </button>
        </div>

        {sent ? (
          <div className="py-8 text-center">
            <Flame className="flame-glow mx-auto h-6 w-6 text-flame" />
            <p className="mt-3 font-serif text-[20px] text-ink">Not sent — and not kept.</p>
            <p className="mx-auto mt-1 max-w-[260px] text-[13px] italic text-ink-soft">
              The Confessional opens after the beta. What you wrote stayed on your screen only. Until then, an anonymous prayer reaches real people.
            </p>
            <button onClick={onClose} className="mt-5 rounded-full bg-ink px-5 py-2.5 text-[12.5px] text-paper">
              Close the door
            </button>
          </div>
        ) : (
          <>
            <div className="mt-4 grid grid-cols-3 gap-2">
              {([
                ["text", Type, "Type it"],
                ["voice", Mic, "Voice"],
                ["video", Video, "One take"],
              ] as const).map(([k, Icon, label]) => (
                <button
                  key={k}
                  onClick={() => setMode(k)}
                  className={`flex flex-col items-center gap-1 rounded-xl border py-3 text-[11.5px] ${
                    mode === k ? "border-ink bg-ink text-paper" : "border-border bg-card text-ink-soft"
                  }`}
                >
                  <Icon className="h-4 w-4" strokeWidth={1.7} />
                  {label}
                </button>
              ))}
            </div>

            {mode === "text" ? (
              <textarea
                value={body}
                onChange={e => setBody(e.target.value)}
                rows={5}
                placeholder="The thing you've never said out loud…"
                className="mt-3 w-full rounded-xl border border-border bg-card p-3.5 text-[14px] leading-relaxed text-ink placeholder:text-ink-soft/70 focus:outline-none focus:ring-1 focus:ring-brass"
              />
            ) : (
              <div className="mt-3 rounded-xl border border-border bg-card p-5 text-center">
                <p className="text-[13px] text-ink">
                  {mode === "video" ? "One take. No retakes, no filters." : "Voice only. Nobody hears a name."}
                </p>
                <p className="mt-1 text-[11.5px] text-ink-soft">
                  Recording is disabled in this preview.
                </p>
              </div>
            )}

            <button
              onClick={onSend}
              disabled={mode === "text" && body.trim().length < 4}
              className="tap-scale mt-3 w-full rounded-xl bg-ink py-3 text-[13.5px] text-paper disabled:opacity-40"
            >
              Leave it in the room (preview)
            </button>
            <p className="mt-2 text-center text-[11px] italic text-ink-soft">
              Preview only — nothing is sent or saved during the beta.
            </p>
          </>
        )}
      </div>
    </div>
  );
}
