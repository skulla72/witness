import { useEffect, useState } from "react";
import { X, MessageSquareHeart } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { submitFeedback } from "@/lib/feedback.functions";
import {
  feedbackDue,
  markSession,
  readUsage,
  subscribeUsage,
  writeUsage,
} from "@/lib/usage";

const SURVEY_ID = "early-days";
const TICK_SECONDS = 15;

/**
 * After a few visits — or right after a first ask or an answer, whichever comes
 * first — ask three quiet questions once. Never nags: it can be set aside, and
 * it only ever asks a signed-in person.
 */
export function FeedbackInvite() {
  const [open, setOpen] = useState(false);
  const [signedIn, setSignedIn] = useState(false);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => setSignedIn(!!data.session));
    const { data: sub } = supabase.auth.onAuthStateChange((_e, session) =>
      setSignedIn(!!session),
    );
    return () => sub.subscription.unsubscribe();
  }, []);

  useEffect(() => {
    markSession();
    const check = () => setOpen(feedbackDue(SURVEY_ID));
    check();
    const tick = () => {
      if (document.visibilityState !== "visible") return;
      writeUsage({ seconds: readUsage().seconds + TICK_SECONDS });
      check();
    };
    const id = window.setInterval(tick, TICK_SECONDS * 1000);
    const off = subscribeUsage(check);
    return () => {
      window.clearInterval(id);
      off();
    };
  }, []);

  if (!open || !signedIn) return null;

  return (
    <Sheet
      onClose={(answered) => {
        setOpen(false);
        if (answered) {
          const usage = readUsage();
          writeUsage({ answered: [...usage.answered, SURVEY_ID] });
        } else {
          writeUsage({ snoozedAt: Date.now() });
        }
      }}
    />
  );
}

function Sheet({ onClose }: { onClose: (answered: boolean) => void }) {
  const [rating, setRating] = useState(0);
  const [keep, setKeep] = useState("");
  const [missing, setMissing] = useState("");
  const [friction, setFriction] = useState("");
  const [saving, setSaving] = useState(false);

  const send = async () => {
    if (!rating) return;
    setSaving(true);
    try {
      await submitFeedback({
        data: {
          surveyId: SURVEY_ID,
          rating,
          keep: keep.trim().slice(0, 600),
          missing: missing.trim().slice(0, 600),
          friction: friction.trim().slice(0, 600),
          minutesUsed: Math.round(readUsage().seconds / 60),
        },
      });
      toast.success("Thank you — this shapes what we build next.");
      onClose(true);
    } catch {
      toast.error("That didn't send. Try again in a moment.");
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-ink/60 px-3 pb-3">
      <div className="w-full max-w-md rounded-3xl border border-border bg-card p-5 shadow-lift">
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-2 text-[10px] uppercase tracking-[0.22em] text-brass">
            <MessageSquareHeart className="h-3.5 w-3.5" /> Three quick questions
          </div>
          <button
            onClick={() => onClose(false)}
            aria-label="Not now"
            className="text-muted-foreground hover:text-foreground"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <h2 className="mt-2 font-serif text-[20px] leading-tight text-foreground">
          You've been here a little while now. How is it going?
        </h2>

        <div className="mt-4">
          <p className="text-[11px] uppercase tracking-[0.18em] text-muted-foreground">
            Would you keep using it?
          </p>
          <div className="mt-2 flex gap-2" role="group" aria-label="Rating from 1 to 5">
            {[1, 2, 3, 4, 5].map((n) => (
              <button
                key={n}
                onClick={() => setRating(n)}
                aria-pressed={rating === n}
                className={`h-10 flex-1 rounded-xl border text-[13px] transition-colors ${
                  rating === n
                    ? "border-brass bg-brass text-ink"
                    : "border-border bg-background text-foreground hover:border-brass/50"
                }`}
              >
                {n}
              </button>
            ))}
          </div>
          <div className="mt-1 flex justify-between text-[10.5px] text-muted-foreground">
            <span>Not really</span>
            <span>Every day</span>
          </div>
        </div>

        <Field
          label="What should we keep?"
          value={keep}
          onChange={setKeep}
          placeholder="The part that actually helped…"
        />
        <Field
          label="What's missing?"
          value={missing}
          onChange={setMissing}
          placeholder="Something you wanted and couldn't find…"
        />
        <Field
          label="What got in the way?"
          value={friction}
          onChange={setFriction}
          placeholder="Confusing, slow, or awkward…"
        />

        <div className="mt-4 flex gap-2">
          <button
            onClick={() => onClose(false)}
            className="rounded-full border border-border px-4 py-2.5 text-[12px] uppercase tracking-[0.16em] text-muted-foreground hover:text-foreground"
          >
            Not now
          </button>
          <button
            onClick={send}
            disabled={!rating || saving}
            className="flex-1 rounded-full bg-brass px-4 py-2.5 text-[13px] tracking-wide text-ink disabled:opacity-40"
          >
            {saving ? "Sending…" : "Send feedback"}
          </button>
        </div>
      </div>
    </div>
  );
}

function Field({
  label,
  value,
  onChange,
  placeholder,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  placeholder: string;
}) {
  return (
    <label className="mt-3 block">
      <span className="text-[11px] uppercase tracking-[0.18em] text-muted-foreground">
        {label}
      </span>
      <textarea
        value={value}
        onChange={(e) => onChange(e.target.value.slice(0, 600))}
        rows={2}
        placeholder={placeholder}
        className="mt-1.5 w-full resize-none rounded-xl border border-border bg-background p-3 text-[13.5px] text-foreground placeholder:text-muted-foreground/70 focus:border-brass focus:outline-none"
      />
    </label>
  );
}
