import { useState } from "react";
import { Link } from "@tanstack/react-router";
import { useMutation } from "@tanstack/react-query";
import { toast } from "sonner";
import { Flame, Gift, Lock, Receipt } from "lucide-react";
import { BRAND } from "@/config/brand";
import {
  STATUS_LABEL,
  formatThreshold,
  missionImpact,
  readyGifts,
  receiptLines,
  type GiftOption,
  type Ledger,
  type Tier,
} from "@/lib/perks";
import { passOnGift, type GiftPick as Pick } from "@/lib/perks.functions";
import { GiftOptionCard } from "./GiftOptionCard";
import { GiftSelectionForm } from "./GiftSelectionForm";

interface Props {
  ledger: Ledger;
  pick: Pick;
  tiers: Tier[];
  options: GiftOption[];
  receivedOptionIds: string[];
  environment: "sandbox" | "live";
  onChanged: () => void;
}

const when = (iso: string) => new Date(iso).toLocaleDateString("en-US", { month: "short", day: "numeric" });

/**
 * One rung's thank-you. Either the three cards to choose from, or what was
 * chosen and where it stands. The highest rung is offered by default; any
 * lower rung's gift can be chosen instead.
 */
export function GiftPick({ ledger, pick, tiers, options, receivedOptionIds, environment, onChanged }: Props) {
  const sel = pick.selection;
  const [changing, setChanging] = useState(false);
  const [tierId, setTierId] = useState(sel?.tier_id ?? pick.earnedTier.id);
  const [option, setOption] = useState<GiftOption | null>(null);

  const eligibleTiers = tiers
    .filter(t => t.ledger === ledger && t.gifts && Number(t.threshold) <= Number(pick.earnedTier.threshold))
    .sort((a, b) => Number(b.threshold) - Number(a.threshold));
  const tier = eligibleTiers.find(t => t.id === tierId) ?? pick.earnedTier;
  const tierOptions = options.filter(o => o.tier_id === tier.id);
  const c = tierOptions.find(o => o.slot === "C");
  // Never offer an item this person already has — unless it's the one they chose for this very rung.
  const ab = readyGifts(tierOptions).filter(o => !receivedOptionIds.includes(o.id) || o.id === sel?.option_id);
  const impact = missionImpact(ledger, tierOptions);
  const canChange = !!sel && sel.status !== "ordered" && sel.status !== "shipped" && !pick.locked;

  const pass = useMutation({
    mutationFn: async () => {
      const r = await passOnGift({ data: { selectionId: sel!.id } });
      if ("error" in r) throw new Error(r.error);
    },
    onSuccess: () => { toast.success("Passed on this one."); onChanged(); },
    onError: (e: Error) => toast.error(e.message),
  });

  const heading = (
    <div className="flex items-start justify-between gap-3 px-1">
      <div>
        <p className="text-[10px] uppercase tracking-[0.2em] text-brass">{pick.earnedTier.name || "Rung"} · {formatThreshold(ledger, Number(pick.earnedTier.threshold))}</p>
        <p className="mt-0.5 text-[11.5px] text-ink-soft">
          Reached {when(pick.qualifiedAt)}. {pick.locked ? "Choice window closed" : `Choice open until ${when(pick.locksAt)}`}.
        </p>
      </div>
      {pick.locked && <Lock className="mt-1 h-3.5 w-3.5 shrink-0 text-ink-soft" />}
    </div>
  );

  // ----- Chosen -----
  if (sel && !changing) {
    const chosen = options.find(o => o.id === sel.option_id);
    const lines = receiptLines(sel, chosen?.label ?? "", BRAND.name);
    const isC = sel.slot === "C";
    return (
      <section className="space-y-2">
        {heading}
        <div className={`rounded-2xl border p-4 shadow-soft ${isC ? "border-brass/50 bg-gradient-to-br from-brass/15 to-card" : "border-border bg-card"}`}>
          <div className="flex items-start gap-3">
            <span className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-brass/15">
              {isC ? <Flame className="h-4 w-4 text-brass-deep" /> : <Gift className="h-4 w-4 text-brass-deep" />}
            </span>
            <div className="min-w-0 flex-1">
              <p className="font-serif text-[17px] leading-tight text-ink">{chosen?.label ?? "Your gift"}</p>
              <p className="mt-0.5 text-[11.5px] text-ink-soft">
                {sel.status === "declined" ? "You passed on this rung's gift." : isC ? "Sent to the mission. Your candle is on the wall." : STATUS_LABEL[sel.status] ?? sel.status}
                {sel.engraving_text ? ` · "${sel.engraving_text}"` : ""}{sel.size ? ` · ${sel.size}` : ""}
              </p>
              {sel.shipping_name && sel.status !== "declined" && (
                <p className="mt-1 text-[11px] text-ink-soft">To {sel.shipping_name}, {sel.address_1}{sel.address_2 ? `, ${sel.address_2}` : ""}, {sel.city}, {sel.state} {sel.zip}</p>
              )}
            </div>
          </div>

          {lines.length > 0 && sel.status !== "declined" && (
            <details className="mt-3 rounded-xl border border-border bg-paper px-3 py-2">
              <summary className="flex cursor-pointer items-center gap-1.5 text-[11.5px] text-ink"><Receipt className="h-3.5 w-3.5 text-ink-soft" /> Your acknowledgment</summary>
              <ul className="mt-2 space-y-1 text-[11px] leading-snug text-ink-soft">{lines.map((l, i) => <li key={i}>{l}</li>)}</ul>
            </details>
          )}

          <div className="mt-3 flex flex-wrap items-center gap-3 text-[12px]">
            {isC && <Link to="/wall" className="text-brass">See the wall</Link>}
            {canChange && <button type="button" onClick={() => setChanging(true)} className="text-brass">{sel.status === "declined" ? "Actually, choose a gift" : "Change my choice"}</button>}
            {canChange && sel.status !== "declined" && <button type="button" onClick={() => pass.mutate()} disabled={pass.isPending} className="text-ink-soft">Pass on this gift</button>}
            {!canChange && sel.status !== "declined" && <span className="inline-flex items-center gap-1 text-ink-soft"><Lock className="h-3 w-3" /> Locked in</span>}
          </div>
        </div>
      </section>
    );
  }

  // ----- Confirming one option -----
  if (option) {
    return (
      <section className="space-y-2">
        {heading}
        <GiftSelectionForm
          ledger={ledger}
          pick={pick}
          option={option}
          environment={environment}
          impact={impact}
          onBack={() => setOption(null)}
          onDone={() => { setOption(null); setChanging(false); onChanged(); }}
        />
      </section>
    );
  }

  // ----- The three cards -----
  return (
    <section className="space-y-2">
      {heading}
      <div className="rounded-2xl border border-border bg-card p-4 shadow-soft">
        <div className="flex items-center justify-between gap-2">
          <p className="font-serif text-[17px] leading-tight text-ink">Choose your thank-you gift</p>
          {sel && <button type="button" onClick={() => setChanging(false)} className="text-[12px] text-ink-soft">Keep current</button>}
        </div>
        {eligibleTiers.length > 1 && (
          <label className="mt-2 block text-[11.5px] text-ink-soft">
            From the{" "}
            <select value={tier.id} onChange={e => setTierId(e.target.value)} className="rounded-lg border border-border bg-paper px-2 py-1 text-[12px] text-ink">
              {eligibleTiers.map(t => <option key={t.id} value={t.id}>{t.name || formatThreshold(ledger, Number(t.threshold))} · {formatThreshold(ledger, Number(t.threshold))}</option>)}
            </select>{" "}
            rung {tier.id !== pick.earnedTier.id && <span className="italic">(a lower rung — your call)</span>}
          </label>
        )}

        <div className="mt-3 space-y-3">
          {c && <GiftOptionCard option={c} impact={impact} onPick={() => setOption(c)} />}
          {ab.length > 0 ? (
            <div className="grid grid-cols-2 gap-3">
              {ab.map(o => <GiftOptionCard key={o.id} option={o} onPick={() => setOption(o)} />)}
            </div>
          ) : (
            <p className="rounded-xl border border-dashed border-border px-3 py-3 text-center text-[12px] text-ink-soft">
              {tierOptions.some(o => o.slot !== "C" && o.active) ? "You've received the gifts at this rung — the mission option is still open." : "Gift announced soon. The mission option is always open."}
            </p>
          )}
        </div>
      </div>
    </section>
  );
}
