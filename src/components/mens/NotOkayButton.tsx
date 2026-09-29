import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { LifeBuoy, X, Phone, Flame, Loader2 } from "lucide-react";
import { CRISIS } from "@/data/mens";
import { useSession } from "@/hooks/useSession";
import { loadMyGroups, loadRoster } from "@/lib/groups";
import { openDirectThread, sendMessage } from "@/lib/messaging";
import type { Author } from "@/lib/prayers";

const FLARE = "🕯 I'm not okay tonight. No reason to give — I just need company. (Sent with one tap from Witness.)";

/**
 * The worst-hour button. One tap, no explanation, ever.
 * Sends a private message to every person who sits at a Walk-With table with you.
 */
export function NotOkayButton({ compact = false }: { compact?: boolean }) {
  const { userId } = useSession();
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [sent, setSent] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);

  const circleQ = useQuery({
    queryKey: ["circle-people-flat", userId],
    queryFn: async () => {
      const groups = await loadMyGroups(userId!);
      const rosters = await Promise.all(groups.map(g => loadRoster(g.id)));
      const seen = new Map<string, Author>();
      for (const r of rosters) for (const a of r) if (a.id !== userId) seen.set(a.id, a);
      return Array.from(seen.values());
    },
    enabled: !!userId && open,
  });
  const circle = circleQ.data ?? [];

  const light = async () => {
    if (!userId) return;
    setBusy(true); setError(null);
    let delivered = 0;
    for (const person of circle) {
      const t = await openDirectThread(userId, person.id);
      if (!t.id) continue;
      const r = await sendMessage(t.id, userId, FLARE);
      if (!r.error) delivered++;
    }
    setBusy(false);
    if (circle.length > 0 && delivered === 0) { setError("Couldn't reach anyone just now. The lines below are always open."); return; }
    setSent(delivered);
  };

  return (
    <>
      <button
        onClick={() => { setOpen(true); setSent(null); setError(null); }}
        className={`tap-scale w-full rounded-2xl border border-flame/35 bg-flame/10 text-ink ${compact ? "px-4 py-3" : "p-5"}`}
      >
        <span className="flex items-center gap-3">
          <LifeBuoy className="h-5 w-5 shrink-0 text-flame" strokeWidth={1.9} />
          <span className="text-left">
            <span className="block font-serif text-[16px] leading-tight">I'm not okay tonight</span>
            <span className="mt-0.5 block text-[11.5px] text-ink-soft">One tap. No explanation required.</span>
          </span>
        </span>
      </button>

      {open && (
        <div className="fixed inset-0 z-50 flex items-end bg-ink/50 backdrop-blur-sm">
          <div className="rise-in mx-auto w-full max-w-md rounded-t-3xl border border-border bg-paper p-5">
            <div className="flex items-center justify-between">
              <p className="text-[10px] uppercase tracking-[0.2em] text-brass">No reason needed</p>
              <button onClick={() => setOpen(false)} aria-label="Close" className="text-ink-soft">
                <X className="h-4 w-4" />
              </button>
            </div>

            {sent !== null ? (
              <div className="py-7 text-center">
                <Flame className="flame-glow mx-auto h-7 w-7 text-flame" />
                <p className="mt-3 font-serif text-[21px] text-ink">Your candle is lit.</p>
                <p className="mx-auto mt-1 max-w-[270px] text-[13px] text-ink-soft">
                  {sent === 0
                    ? "No one is in your circle yet, so nothing was sent — but the lines below answer every hour of the night."
                    : `${sent} ${sent === 1 ? "person" : "people"} in your circle just got a private message. They'll see it the next time they open Witness. You don't have to type anything else.`}
                </p>
                <div className="mx-auto mt-5 h-px w-12 bg-brass/60" />
                <p className="mt-4 text-[11.5px] uppercase tracking-[0.16em] text-ink-soft">If it's an emergency</p>
                <a href="tel:988" className="mt-2 inline-flex items-center gap-2 rounded-full bg-ink px-5 py-2.5 text-[12.5px] text-paper">
                  <Phone className="h-3.5 w-3.5" /> Call or text 988
                </a>
              </div>
            ) : (
              <>
                <h3 className="mt-3 font-serif text-[22px] leading-tight text-ink">Send it. That's the whole thing.</h3>
                <ul className="mt-3 space-y-2">
                  {[
                    "Everyone at your Walk-With tables gets one private message: you're up, you need company.",
                    "No reason required. You never have to explain it after.",
                    "This isn't an emergency service. If you're in danger, use the lines below.",
                  ].map(f => (
                    <li key={f} className="flex gap-2 text-[13px] leading-snug text-ink-soft">
                      <span className="mt-1.5 h-1 w-1 shrink-0 rounded-full bg-brass" />
                      {f}
                    </li>
                  ))}
                </ul>

                <p className="mt-4 rounded-xl border border-border bg-card p-3.5 text-[12.5px] leading-snug text-ink-soft">
                  {!userId
                    ? "Sign in to reach your circle."
                    : circleQ.isLoading
                      ? "Finding your circle…"
                      : circle.length === 0
                        ? "You haven't joined a circle yet, so there's no one to message. The lines below are always open."
                        : `This goes to ${circle.length} ${circle.length === 1 ? "person" : "people"}: ${circle.slice(0, 3).map(p => p.name.split(" ")[0]).join(", ")}${circle.length > 3 ? ` and ${circle.length - 3} more` : ""}.`}
                </p>
                {error && <p className="mt-2 text-[12px] text-destructive">{error}</p>}

                <button
                  onClick={() => void light()}
                  disabled={busy || !userId || circleQ.isLoading}
                  className="tap-scale mt-4 inline-flex w-full items-center justify-center gap-2 rounded-xl bg-flame py-3.5 text-[14px] font-medium text-ink disabled:opacity-50"
                >
                  {busy ? <><Loader2 className="h-4 w-4 animate-spin" /> Sending…</> : "Light it"}
                </button>

                <div className="mt-4 space-y-1.5">
                  {CRISIS.map(c => (
                    <a key={c.label} href={c.href} className="block rounded-xl border border-border bg-card px-3.5 py-2.5">
                      <p className="text-[12.5px] text-ink">{c.label}</p>
                      <p className="text-[11px] text-ink-soft">{c.detail}</p>
                    </a>
                  ))}
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </>
  );
}
