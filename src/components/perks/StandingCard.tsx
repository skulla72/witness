import { Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { Gift, Lock, Check } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { formatThreshold, formatTotal, standingFor, LEDGER_LABEL, LEDGER_UNIT, type Ledger, type Tier } from "@/lib/perks";

interface Props {
  ledger: Ledger;
  total: number;
  /** Compact version for the Giving/Serve pages; full on /perks. */
  compact?: boolean;
  /** Pass the tiers when the page already has them; otherwise they're fetched. */
  tiers?: Tier[];
}

export function useTiers(enabled = true) {
  return useQuery({
    queryKey: ["tiers"],
    queryFn: async () => {
      const { data, error } = await supabase.from("tiers").select("*").order("threshold", { ascending: true });
      if (error) throw error;
      return data as Tier[];
    },
    staleTime: 5 * 60_000,
    enabled,
  });
}

/**
 * One ledger, the way the owner wants it seen: the rung you're on and the next
 * one. Nothing above that. Sender totals are private to the person; Goer
 * totals are hours, never dollars.
 */
export function StandingCard({ ledger, total, compact, tiers: given }: Props) {
  const tiersQ = useTiers(!given);
  const tiers = given ?? tiersQ.data ?? [];
  const s = standingFor(ledger, total, tiers);
  const pct = Math.round(s.progress * 100);
  const remaining = s.next ? Number(s.next.threshold) - total : 0;

  return (
    <section className="rounded-2xl border border-border bg-card p-4 shadow-soft">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-[10px] uppercase tracking-[0.2em] text-brass">Your {LEDGER_LABEL[ledger]} standing</p>
          <p className="mt-1 font-serif text-[20px] leading-tight text-ink">
            {s.current
              ? s.current.name || formatThreshold(ledger, Number(s.current.threshold))
              : ledger === "sender" ? "Your first gift starts the ladder" : "Your first verified hour starts the ladder"}
          </p>
          <p className="mt-0.5 text-[11.5px] text-ink-soft">
            {s.current
              ? `${formatThreshold(ledger, Number(s.current.threshold))} ${LEDGER_UNIT[ledger]} · reached`
              : ledger === "sender" ? "Every gift counts toward it, across every lane." : "Verified hours count. Self-reported hours wait for a leader's nod."}
          </p>
        </div>
        <div className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-brass/15">
          {s.current ? <Check className="h-4 w-4 text-brass-deep" /> : <Gift className="h-4 w-4 text-brass-deep" />}
        </div>
      </div>

      <div className="mt-3.5">
        <div className="flex items-center justify-between text-[11px] text-ink-soft">
          <span>{formatTotal(ledger, total)} {LEDGER_UNIT[ledger]}</span>
          {s.next && <span>Next: {formatThreshold(ledger, Number(s.next.threshold))}</span>}
        </div>
        <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-secondary">
          <div className="h-full bg-hope transition-[width]" style={{ width: `${pct}%` }} />
        </div>
      </div>

      <div className="mt-3 flex items-start gap-2.5 rounded-xl border border-dashed border-border bg-paper px-3 py-2.5">
        <Lock className="mt-0.5 h-3.5 w-3.5 shrink-0 text-ink-soft" />
        <div className="min-w-0">
          {s.next ? (
            <>
              <p className="text-[12.5px] text-ink">
                <span className="font-medium">{s.next.name || "Next rung"}</span>
                <span className="text-ink-soft"> · {formatThreshold(ledger, Number(s.next.threshold))}</span>
              </p>
              <p className="text-[11px] leading-snug text-ink-soft">
                {s.next.gifts ? "Unlocks a thank-you gift to choose." : "A quiet mark of thanks."} {formatThreshold(ledger, Math.max(0, remaining))} to go.
              </p>
            </>
          ) : (
            <p className="text-[11.5px] leading-snug text-ink-soft">
              You've reached every rung named so far. New rungs get added as the mission grows — the ladder doesn't stop here.
            </p>
          )}
        </div>
      </div>

      {compact && (
        <Link to="/perks" className="mt-3 block text-center text-[12px] text-brass">
          Choose your thank-you gift
        </Link>
      )}
      {ledger === "sender" && (
        <p className="mt-2.5 text-center text-[10.5px] italic text-ink-soft">
          Only you see these numbers. Giving never changes how prayers are seen.
        </p>
      )}
    </section>
  );
}
