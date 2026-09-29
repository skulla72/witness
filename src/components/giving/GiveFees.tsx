import { Building2, CreditCard, Flame, ShieldCheck } from "lucide-react";
import { BRAND } from "@/config/brand";
import { money } from "@/lib/stripe";
import {
  WITNESS_TIP_CENTS,
  chargeCents,
  coverageFeeCents,
  netToMissionCents,
  totalChargeCents,
  witnessFeeCents,
  type PayMethod,
} from "@/lib/fees";

interface Props {
  amountCents: number;
  validAmount: boolean;
  payMethod: PayMethod;
  onPayMethod: (m: PayMethod) => void;
  coverFees: boolean;
  onCoverFees: (v: boolean) => void;
  /** The optional gift to Witness itself ("keeping the light lit"). */
  tip: boolean;
  onTip: (v: boolean) => void;
  /** Who the money is going to, e.g. "the mission" or "the nonprofits". */
  recipient?: string;
}

/** Payment method choice, the Witness fee, and the option to cover it. */
export function GiveFees({
  amountCents,
  validAmount,
  payMethod,
  onPayMethod,
  coverFees,
  onCoverFees,
  tip,
  onTip,
  recipient = "the mission",
}: Props) {
  const charged = validAmount ? totalChargeCents(amountCents, coverFees, payMethod, tip) : 0;
  const baseCharged = validAmount ? chargeCents(amountCents, coverFees, payMethod) : 0;
  const net = validAmount ? netToMissionCents(amountCents, coverFees, payMethod) : 0;
  const cover = validAmount ? coverageFeeCents(amountCents, payMethod) : 0;

  return (
    <div className="mt-3 rounded-xl border border-border bg-paper px-3.5 py-3">
      <span className="text-[11px] text-ink-soft">How you'd like to give</span>
      <div className="mt-2 grid grid-cols-2 gap-2">
        {(
          [
            { key: "card" as PayMethod, label: "Card", note: "2.9% + 30¢", Icon: CreditCard },
            {
              key: "bank" as PayMethod,
              label: "From my bank",
              note: "0.8%, $5 max — lowest fee",
              Icon: Building2,
            },
          ]
        ).map(({ key, label, note, Icon }) => (
          <button
            key={key}
            type="button"
            onClick={() => onPayMethod(key)}
            className={`flex flex-col items-start gap-1 rounded-xl border px-3 py-2.5 text-left ${
              payMethod === key ? "border-brass bg-brass/10" : "border-border"
            }`}
          >
            <span className="flex items-center gap-1.5 text-[13px] text-ink">
              <Icon className="h-3.5 w-3.5" /> {label}
            </span>
            <span className="text-[11px] text-ink-soft">{note}</span>
          </button>
        ))}
      </div>

      {payMethod === "bank" && (
        <p className="mt-2 flex items-start gap-1.5 text-[11px] leading-snug text-ink-soft">
          <ShieldCheck className="mt-[1px] h-3.5 w-3.5 shrink-0 text-hope" />
          <span>
            You'll sign in to your bank on the next screen and pick an account — no routing or
            account numbers to type. {BRAND.name} never sees your bank login, and bank gifts usually
            settle in a few business days.
          </span>
        </p>
      )}


      <label className="mt-3 flex items-start gap-2.5 border-t border-border pt-3">
        <input
          type="checkbox"
          checked={coverFees}
          onChange={e => onCoverFees(e.target.checked)}
          className="mt-0.5 h-4 w-4 shrink-0 accent-brass"
        />
        <span className="min-w-0">
          <span className="block text-[13px] text-ink">
            I'll cover the fees{validAmount ? ` (${money(cover)})` : ""}
          </span>
          <span className="mt-0.5 block text-[11px] leading-snug text-ink-soft">
            {validAmount
              ? coverFees
                ? `You're charged ${money(baseCharged)} so the full ${money(amountCents)} reaches ${recipient}.`
                : `${money(baseCharged)} is charged. ${money(witnessFeeCents(amountCents))} helps keep ${BRAND.name} running, and about ${money(net)} reaches ${recipient} after payment processing.`
              : `A small part of each gift helps keep ${BRAND.name} running. Payment processing is separate. Cover both and the full amount goes on.`}
          </span>
        </span>
      </label>

      <label className="mt-3 flex items-start gap-2.5 border-t border-border pt-3">
        <input
          type="checkbox"
          checked={tip}
          onChange={e => onTip(e.target.checked)}
          className="mt-0.5 h-4 w-4 shrink-0 accent-brass"
        />
        <span className="min-w-0">
          <span className="flex items-center gap-1.5 text-[13px] text-ink">
            <Flame className="h-3.5 w-3.5 text-brass" /> Donate to {BRAND.name} ({money(WITNESS_TIP_CENTS)})
          </span>
          <span className="mt-0.5 block text-[11px] italic leading-snug text-ink-soft">
            Keeping the light lit.
          </span>
          <span className="mt-0.5 block text-[11px] leading-snug text-ink-soft">
            A small gift to {BRAND.name} itself, so this place stays free for everyone who needs it.
            This part isn't tax-deductible.
            {tip && validAmount ? ` You're charged ${money(charged)} in all.` : ""}
          </span>
        </span>
      </label>
    </div>
  );
}
