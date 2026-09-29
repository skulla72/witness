import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { toast } from "sonner";
import { ArrowLeft, Flame, Loader2, Receipt } from "lucide-react";
import { ENGRAVING_MAX, SIZES, formatMoney, type GiftOption, type Ledger } from "@/lib/perks";
import { chooseGift, type ChooseGiftInput, type GiftPick } from "@/lib/perks.functions";

interface Props {
  ledger: Ledger;
  pick: GiftPick;
  option: GiftOption;
  environment: "sandbox" | "live";
  impact: string;
  onBack: () => void;
  onDone: () => void;
}

const field = "mt-1 w-full rounded-xl border border-border bg-paper px-3 py-2.5 text-[14px] text-ink outline-none placeholder:text-ink-soft/70";

/**
 * The confirm step. A and B ask only for what the item needs — an address, a
 * size, an engraving — and Senders see the tax line before they commit.
 * C asks for nothing but whether to sign the candle.
 */
export function GiftSelectionForm({ ledger, pick, option, environment, impact, onBack, onDone }: Props) {
  const isC = option.slot === "C";
  const [f, setF] = useState({
    shipping_name: pick.selection?.shipping_name ?? "",
    address_1: pick.selection?.address_1 ?? "",
    address_2: pick.selection?.address_2 ?? "",
    city: pick.selection?.city ?? "",
    state: pick.selection?.state ?? "",
    zip: pick.selection?.zip ?? "",
    size: pick.selection?.size ?? "",
    engraving_text: pick.selection?.engraving_text ?? "",
    anonymous: pick.selection?.anonymous ?? false,
  });
  const set = (k: keyof typeof f, v: string | boolean) => setF(p => ({ ...p, [k]: v }));

  const save = useMutation({
    mutationFn: async () => {
      const input: ChooseGiftInput = { environment, earnedTierId: pick.earnedTier.id, optionId: option.id, ...f };
      const r = await chooseGift({ data: input });
      if ("error" in r) throw new Error(r.error);
      return r;
    },
    onSuccess: () => {
      toast.success(isC ? "Sent to the mission. Your candle is lit." : "Chosen. We'll take it from here.");
      onDone();
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const needsShip = !isC && option.requires_shipping;
  const needsSize = !isC && option.requires_size;
  const needsEngrave = !isC && option.requires_engraving;
  const ready =
    (!needsShip || (f.shipping_name && f.address_1 && f.city && f.state && f.zip)) &&
    (!needsSize || f.size) &&
    (!needsEngrave || f.engraving_text.trim().length > 0);

  return (
    <div className="rounded-2xl border border-border bg-card p-4 shadow-soft">
      <button type="button" onClick={onBack} className="inline-flex items-center gap-1 text-[12px] text-ink-soft">
        <ArrowLeft className="h-3.5 w-3.5" /> Back to the three options
      </button>

      <p className="mt-3 text-[10px] uppercase tracking-[0.2em] text-brass">Option {option.slot}</p>
      <p className="mt-1 font-serif text-[20px] leading-tight text-ink">{option.label}</p>

      {isC ? (
        <>
          <div className="mt-3 flex items-start gap-3 rounded-xl border border-brass/40 bg-brass/10 p-3.5">
            <Flame className="mt-0.5 h-4 w-4 shrink-0 text-brass-deep" />
            <p className="text-[12.5px] leading-relaxed text-ink">{impact}</p>
          </div>
          <label className="mt-3 flex items-start gap-2.5 text-[12.5px] text-ink">
            <input type="checkbox" checked={f.anonymous} onChange={e => set("anonymous", e.target.checked)} className="mt-0.5 accent-[var(--brass-deep)]" />
            <span>Light the candle without my name <span className="text-ink-soft">— it'll read "A friend of the mission."</span></span>
          </label>
          {ledger === "sender" && (
            <p className="mt-3 flex items-start gap-2 text-[11px] leading-snug text-ink-soft">
              <Receipt className="mt-0.5 h-3.5 w-3.5 shrink-0" /> Your acknowledgment will state that no goods or services were provided in exchange for your gift.
            </p>
          )}
        </>
      ) : (
        <>
          {needsShip && (
            <div className="mt-3 grid grid-cols-2 gap-2.5">
              <label className="col-span-2 block"><span className="text-[11px] text-ink-soft">Name</span><input value={f.shipping_name} onChange={e => set("shipping_name", e.target.value.slice(0, 80))} className={field} autoComplete="name" /></label>
              <label className="col-span-2 block"><span className="text-[11px] text-ink-soft">Street address</span><input value={f.address_1} onChange={e => set("address_1", e.target.value.slice(0, 120))} className={field} autoComplete="address-line1" /></label>
              <label className="col-span-2 block"><span className="text-[11px] text-ink-soft">Apt, suite (optional)</span><input value={f.address_2} onChange={e => set("address_2", e.target.value.slice(0, 120))} className={field} autoComplete="address-line2" /></label>
              <label className="block"><span className="text-[11px] text-ink-soft">City</span><input value={f.city} onChange={e => set("city", e.target.value.slice(0, 80))} className={field} autoComplete="address-level2" /></label>
              <label className="block"><span className="text-[11px] text-ink-soft">State</span><input value={f.state} onChange={e => set("state", e.target.value.slice(0, 40))} className={field} autoComplete="address-level1" /></label>
              <label className="block"><span className="text-[11px] text-ink-soft">ZIP</span><input value={f.zip} onChange={e => set("zip", e.target.value.replace(/[^0-9-]/g, "").slice(0, 10))} inputMode="numeric" className={field} autoComplete="postal-code" /></label>
            </div>
          )}

          {needsSize && (
            <div className="mt-3">
              <span className="text-[11px] text-ink-soft">Size</span>
              <div className="mt-1 flex flex-wrap gap-1.5">
                {SIZES.map(s => (
                  <button key={s} type="button" onClick={() => set("size", s)} className={`rounded-full px-3 py-1.5 text-[12px] ${f.size === s ? "bg-ink text-paper" : "border border-border bg-paper text-ink-soft"}`}>{s}</button>
                ))}
              </div>
            </div>
          )}

          {needsEngrave && (
            <label className="mt-3 block">
              <span className="flex items-center justify-between text-[11px] text-ink-soft"><span>Engraving</span><span>{f.engraving_text.length}/{ENGRAVING_MAX}</span></span>
              <input value={f.engraving_text} onChange={e => set("engraving_text", e.target.value.slice(0, ENGRAVING_MAX))} maxLength={ENGRAVING_MAX} placeholder="Psalm 23 · The Okoyes" className={field} />
              <span className="mt-2 block rounded-xl border border-brass/40 bg-gradient-to-b from-brass/20 to-brass/5 px-4 py-3 text-center font-serif text-[15px] tracking-[0.08em] text-ink">
                {f.engraving_text.trim() || <span className="text-ink-soft/70">Your words here</span>}
              </span>
            </label>
          )}

          {ledger === "sender" && (
            <div className="mt-4 flex items-start gap-2.5 rounded-xl border border-border bg-paper p-3">
              <Receipt className="mt-0.5 h-4 w-4 shrink-0 text-ink-soft" />
              <p className="text-[11.5px] leading-snug text-ink">
                Fair market value of this gift: <span className="font-medium">{formatMoney(Number(option.fmv))}</span>.
                Only the portion of your gift that exceeds {formatMoney(Number(option.fmv))} is tax deductible. This figure will be on your acknowledgment.
              </p>
            </div>
          )}
        </>
      )}

      {pick.locked && (
        <p className="mt-3 text-[11px] italic text-ink-soft">The 14 days after your qualifying {ledger === "sender" ? "gift" : "hours"} have passed, so this choice is final once you confirm.</p>
      )}

      <button
        type="button"
        disabled={!ready || save.isPending}
        onClick={() => save.mutate()}
        className={`tap-scale mt-4 flex w-full items-center justify-center gap-2 rounded-xl py-3 text-[14px] font-medium disabled:opacity-50 ${isC ? "bg-brass text-ink" : "bg-ink text-paper"}`}
      >
        {save.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : isC ? <Flame className="h-4 w-4" /> : null}
        {isC ? "Send it to the mission" : "Confirm this gift"}
      </button>
    </div>
  );
}
