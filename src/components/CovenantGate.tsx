import { useEffect, useState } from "react";
import { ShieldCheck, Lock } from "lucide-react";
import { useSession } from "@/hooks/useSession";
import {
  COVENANT_INTRO,
  COVENANT_TERMS,
  COVENANT_TITLE,
  acceptCovenant,
  hasAcceptedCovenant,
} from "@/lib/covenant";

/**
 * One agreement, small print, single checkbox — the standard terms pattern.
 * Acceptance is recorded with the account and the date.
 */
export function CovenantGate() {
  const { userId } = useSession();
  const [needed, setNeeded] = useState(false);
  const [agreed, setAgreed] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!userId) {
      setNeeded(false);
      return;
    }
    let live = true;
    hasAcceptedCovenant(userId).then(done => {
      if (live) setNeeded(!done);
    });
    return () => {
      live = false;
    };
  }, [userId]);

  if (!userId || !needed) return null;

  const accept = async () => {
    setSaving(true);
    setError(null);
    const { error: err } = await acceptCovenant(userId, "");
    setSaving(false);
    if (err) {
      setError("That didn't save. Try once more.");
      return;
    }
    setNeeded(false);
  };

  return (
    <div className="fixed inset-0 z-[70] flex items-end justify-center bg-ink/70 backdrop-blur-sm px-3 pb-3">
      <div className="w-full max-w-md rounded-3xl border border-border bg-card p-5 shadow-lift">
        <div className="flex items-center gap-2">
          <span className="grid h-9 w-9 place-items-center rounded-full bg-brass/15">
            <ShieldCheck className="h-4.5 w-4.5 text-brass" strokeWidth={1.8} />
          </span>
          <div className="leading-tight">
            <p className="text-[10px] uppercase tracking-[0.2em] text-brass">Before you enter</p>
            <h2 className="font-serif text-[20px] text-ink">{COVENANT_TITLE}</h2>
          </div>
        </div>

        <p className="mt-3 text-[12px] leading-relaxed text-ink-soft">
          People bring their hardest seasons here on video. Before you can see them, you agree to keep
          what you see inside these walls.
        </p>

        <div className="mt-3 h-52 overflow-y-auto rounded-2xl border border-border bg-paper px-3.5 py-3 text-[10.5px] leading-[1.5] text-ink-soft">
          <p className="text-[10px] uppercase tracking-[0.16em] text-ink">
            Confidentiality, conduct and liability terms
          </p>
          {COVENANT_TERMS.map((term, i) => (
            <p key={term.heading} className="mt-2">
              <span className="font-medium text-ink">
                {i + 1}. {term.heading}.{" "}
              </span>
              {term.body}
            </p>
          ))}
          <p className="mt-2">
            {COVENANT_TERMS.length + 1}.{" "}
            <span className="font-medium text-ink">Entire agreement. </span>
            This agreement is a binding confidentiality and release agreement between you, everyone in
            this community, and the operators of this app, and applies together with the beta terms
            and privacy notice. Nothing here is medical, legal, financial or emergency assistance.
          </p>
        </div>

        <label className="mt-3 flex items-start gap-2.5 text-[11.5px] leading-snug text-ink">
          <input
            type="checkbox"
            checked={agreed}
            onChange={e => setAgreed(e.target.checked)}
            className="mt-0.5 h-4 w-4 shrink-0 accent-[var(--brass-deep)]"
          />
          <span>
            I have read and agree to all of the terms above, including the confidentiality rules and
            the release of liability for serving, volunteering and needs.
          </span>
        </label>

        {error && <p className="mt-2 text-[11.5px] text-destructive">{error}</p>}

        <button
          disabled={!agreed || saving}
          onClick={accept}
          className="mt-3 w-full rounded-full bg-ink py-3 text-[14px] font-medium text-paper tap-scale disabled:opacity-40"
        >
          {saving ? "Recording…" : "I agree — let me in"}
        </button>

        <p className="mt-3 flex items-center justify-center gap-1.5 text-[10.5px] text-ink-soft">
          <Lock className="h-3 w-3" strokeWidth={1.8} />
          Your acceptance date is kept with your account
        </p>
      </div>
    </div>
  );
}
