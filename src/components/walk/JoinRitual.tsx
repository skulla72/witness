import { useEffect, useRef, useState } from "react";
import { X, Check, ArrowRight, Flame, Users, Lock, Loader2 } from "lucide-react";
import type { WalkGroup } from "@/lib/groups";

type Step = 0 | 1 | 2 | 3;

/**
 * "The Threshold" — a three-part doorway into a Walk With group.
 * 1. See the table and the seat waiting for you.
 * 2. Agree to the covenant, line by line.
 * 3. Answer the one question at the door.
 */
export function JoinRitual({
  group,
  open,
  onClose,
  onJoined,
}: {
  group: WalkGroup;
  open: boolean;
  onClose: () => void;
  /** Persists the seat. Resolve to continue; reject to stay on the door step. */
  onJoined: (doorAnswer: string) => Promise<void>;
}) {
  const [step, setStep] = useState<Step>(0);
  const [agreed, setAgreed] = useState<number[]>([]);
  const [answer, setAnswer] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const headingRef = useRef<HTMLHeadingElement>(null);
  const fac = group.facilitator;
  const facName = fac?.name ?? "The facilitator";

  const take = async (note: string) => {
    setBusy(true); setError(null);
    try { await onJoined(note); setStep(3); }
    catch (e) { setError(e instanceof Error ? e.message : "Couldn't take the seat just now."); }
    finally { setBusy(false); }
  };

  useEffect(() => {
    if (!open) return;
    setStep(0);
    setAgreed([]);
    setAnswer("");
    setError(null);
  }, [open, group.id]);

  useEffect(() => {
    if (open) headingRef.current?.focus();
  }, [open, step]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
      if (e.key !== "Tab") return;
      const nodes = panelRef.current?.querySelectorAll<HTMLElement>(
        'button, [href], input, textarea, [tabindex]:not([tabindex="-1"])',
      );
      if (!nodes || nodes.length === 0) return;
      const first = nodes[0];
      const last = nodes[nodes.length - 1];
      if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault();
        first.focus();
      } else if (e.shiftKey && document.activeElement === first) {
        e.preventDefault();
        last.focus();
      }
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  if (!open) return null;

  const allAgreed = agreed.length === group.covenant.length;

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center">
      <button
        type="button"
        aria-label="Close"
        onClick={onClose}
        className="absolute inset-0 bg-ink/60 backdrop-blur-sm"
      />
      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="threshold-heading"
        className="relative w-full max-w-md rounded-t-3xl border border-border bg-card p-5 pb-7 shadow-lift rise-in"
      >
        <div className="mb-4 flex items-start justify-between gap-3">
          <div>
            <p className="text-[10px] uppercase tracking-[0.22em] text-brass">
              {step === 3 ? "You're in" : `The threshold · ${step + 1} of 3`}
            </p>
            <h2
              id="threshold-heading"
              ref={headingRef}
              tabIndex={-1}
              className="mt-1 font-serif text-[21px] leading-tight text-ink outline-none"
            >
              {step === 0 && "There's a seat open"}
              {step === 1 && "How this room works"}
              {step === 2 && "One question at the door"}
              {step === 3 && `Welcome to ${group.topic}`}
            </h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close and stay outside"
            className="rounded-full border border-border p-2 text-ink-soft tap-scale"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <ol className="mb-5 flex gap-1.5" aria-hidden="true">
          {[0, 1, 2].map(i => (
            <li
              key={i}
              className={`h-1 flex-1 rounded-full ${
                i <= step ? "bg-brass" : "bg-border"
              }`}
            />
          ))}
        </ol>

        {step === 0 && (
          <div>
            <SeatTable total={group.seats_total} open={group.seats_open} />
            <p className="mt-4 text-[13.5px] leading-relaxed text-ink-soft">
              {group.members === 0 ? "You'd be the first at this table" : `${group.members} ${group.members === 1 ? "person meets" : "people meet"} ${group.cadence.toLowerCase()}`}.{" "}
              <span className="text-ink">
                {group.seats_open} {group.seats_open === 1 ? "seat" : "seats"} left
              </span>{" "}
              — kept small on purpose, so everyone gets time.
            </p>
            <dl className="mt-4 grid grid-cols-2 gap-2 text-[12px]">
              <div className="rounded-xl border border-border bg-secondary px-3 py-2.5">
                <dt className="text-ink-soft">Next gathering</dt>
                <dd className="mt-0.5 text-ink">{group.next_meet}</dd>
              </div>
              <div className="rounded-xl border border-border bg-secondary px-3 py-2.5">
                <dt className="text-ink-soft">Facilitator</dt>
                <dd className="mt-0.5 text-ink">{fac?.name ?? "Witness team"}</dd>
              </div>
            </dl>
            <StepButton onClick={() => setStep(1)}>Step to the door</StepButton>
          </div>
        )}

        {step === 1 && (
          <div>
            <p className="text-[13px] text-ink-soft">
              Tap each line to agree. Nothing opens until all three are yours.
            </p>
            <ul className="mt-3 space-y-2">
              {group.covenant.map((line, i) => {
                const on = agreed.includes(i);
                return (
                  <li key={line}>
                    <button
                      type="button"
                      aria-pressed={on}
                      onClick={() =>
                        setAgreed(a => (on ? a.filter(x => x !== i) : [...a, i]))
                      }
                      className={`flex w-full items-start gap-3 rounded-xl border px-3.5 py-3 text-left transition-colors tap-scale ${
                        on
                          ? "border-hope/50 bg-hope/10"
                          : "border-border bg-secondary"
                      }`}
                    >
                      <span
                        className={`mt-0.5 grid h-5 w-5 shrink-0 place-items-center rounded-full border ${
                          on ? "border-hope bg-hope text-card" : "border-border"
                        }`}
                      >
                        {on && <Check className="h-3 w-3" strokeWidth={3} />}
                      </span>
                      <span className="text-[13.5px] leading-snug text-ink">{line}</span>
                    </button>
                  </li>
                );
              })}
            </ul>
            <p className="mt-3 inline-flex items-center gap-1.5 text-[11.5px] text-ink-soft">
              <Lock className="h-3 w-3" /> Posts here never leave this group.
            </p>
            <StepButton disabled={!allAgreed} onClick={() => setStep(2)}>
              {allAgreed ? "I agree — continue" : `Agree to all ${group.covenant.length}`}
            </StepButton>
          </div>
        )}

        {step === 2 && (
          <div>
            <label
              htmlFor="door-answer"
              className="block font-serif text-[15px] leading-snug text-ink"
            >
              {group.door_question}
            </label>
            <p className="mt-1.5 text-[12px] text-ink-soft">
              {fac ? `Sent privately to ${fac.name} as a message. ` : "Nothing is sent anywhere yet — this room has no facilitator assigned. "}A sentence is plenty. You can skip it.
            </p>
            <textarea
              id="door-answer"
              value={answer}
              onChange={e => setAnswer(e.target.value)}
              rows={4}
              placeholder="However it comes out is fine."
              className="mt-3 w-full resize-none rounded-xl border border-border bg-secondary px-3.5 py-3 text-[14px] text-ink placeholder:text-ink-soft/70 focus:border-brass focus:outline-none focus:ring-2 focus:ring-brass/30"
            />
            {error && <p className="mt-2 text-[12px] text-destructive">{error}</p>}
            <StepButton disabled={busy} onClick={() => void take(answer)}>
              {busy ? <><Loader2 className="h-4 w-4 animate-spin" /> Taking your seat…</> : "Take my seat"}
            </StepButton>
            <button
              type="button"
              disabled={busy}
              onClick={() => void take("")}
              className="mt-2 w-full py-2 text-[12.5px] text-ink-soft underline decoration-border underline-offset-4 disabled:opacity-50"
            >
              Skip and join quietly
            </button>
          </div>
        )}

        {step === 3 && (
          <div className="text-center">
            <span className="mx-auto grid h-16 w-16 place-items-center rounded-full border border-flame/40 bg-flame/10 breathe">
              <Flame className="h-7 w-7 text-flame" strokeWidth={1.8} />
            </span>
            <p className="mt-4 text-[13.5px] leading-relaxed text-ink-soft">
              Your seat is lit. {fac && answer.trim() ? `${facName} has your note. ` : ""}The room meets{" "}
              {group.next_meet.toLowerCase()} — no introduction speech required.
            </p>
            <div className="mt-4 rounded-xl border border-border bg-secondary px-4 py-3 text-left text-[12.5px] text-ink-soft">
              <p className="inline-flex items-center gap-1.5 text-ink">
                <Users className="h-3.5 w-3.5" /> First step
              </p>
              <p className="mt-1">
                Read one thing someone else wrote before you write your own. That's how
                this room stays warm.
              </p>
            </div>
            <StepButton onClick={onClose}>Enter the room</StepButton>
          </div>
        )}
      </div>
    </div>
  );
}

function StepButton({
  children,
  onClick,
  disabled,
}: {
  children: React.ReactNode;
  onClick: () => void;
  disabled?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className="mt-5 inline-flex w-full items-center justify-center gap-2 rounded-xl bg-primary py-3.5 text-[14px] font-medium text-primary-foreground tap-scale disabled:opacity-40"
    >
      {children}
      {!disabled && <ArrowRight className="h-4 w-4" />}
    </button>
  );
}

/** A quiet table diagram: filled seats, then the open ones — yours glows. */
function SeatTable({ total, open }: { total: number; open: number }) {
  const taken = total - open;
  return (
    <div
      className="rounded-2xl border border-border bg-secondary px-4 py-5"
      role="img"
      aria-label={`${taken} of ${total} seats taken, ${open} open`}
    >
      <div className="flex flex-wrap justify-center gap-2">
        {Array.from({ length: total }).map((_, i) => {
          const isOpen = i >= taken;
          const isYours = i === taken;
          return (
            <span
              key={i}
              className={`h-4 w-4 rounded-full border ${
                isYours
                  ? "border-flame bg-flame/30 flame-glow"
                  : isOpen
                    ? "border-border bg-transparent"
                    : "border-transparent bg-ink/25"
              }`}
            />
          );
        })}
      </div>
      <p className="mt-3 text-center text-[11px] uppercase tracking-[0.18em] text-brass">
        The glowing one is yours
      </p>
    </div>
  );
}
