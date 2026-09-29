import { Flame, Gift, ImageOff } from "lucide-react";
import type { GiftOption } from "@/lib/perks";

interface Props {
  option: GiftOption;
  /** Words for what choosing C does. Only used on the C card. */
  impact?: string;
  onPick: () => void;
  disabled?: boolean;
}

/**
 * One of the three cards. A and B are the item: photo, name, a line.
 * C — "Send it to the mission instead" — is the warmest card on the screen,
 * never styled as a decline and never smaller than A or B.
 */
export function GiftOptionCard({ option, impact, onPick, disabled }: Props) {
  if (option.slot === "C") {
    return (
      <button
        type="button"
        onClick={onPick}
        disabled={disabled}
        className="tap-scale relative w-full overflow-hidden rounded-2xl border border-brass/50 bg-gradient-to-br from-brass/20 via-card to-card p-5 text-left shadow-soft disabled:opacity-60"
      >
        <span className="absolute -right-6 -top-6 h-28 w-28 rounded-full bg-brass/15 blur-2xl" aria-hidden />
        <span className="flex items-start gap-3.5">
          <span className="relative mt-0.5 grid h-11 w-11 shrink-0 place-items-center rounded-full bg-brass/20">
            <Flame className="h-5 w-5 text-brass-deep" strokeWidth={1.8} />
            <span className="absolute inset-0 animate-pulse rounded-full bg-brass/20" aria-hidden />
          </span>
          <span className="min-w-0">
            <span className="block text-[10px] uppercase tracking-[0.2em] text-brass">Option C</span>
            <span className="mt-1 block font-serif text-[20px] leading-tight text-ink">{option.label || "Send it to the mission instead"}</span>
            <span className="mt-1.5 block text-[12.5px] leading-relaxed text-ink">{impact}</span>
            <span className="mt-2 block text-[11.5px] leading-snug text-ink-soft">
              {option.description || "Skip the gift. What it would have cost goes straight back into the work."} A lit candle with your name goes on the wall.
            </span>
          </span>
        </span>
      </button>
    );
  }

  return (
    <button
      type="button"
      onClick={onPick}
      disabled={disabled}
      className="tap-scale flex h-full w-full flex-col overflow-hidden rounded-2xl border border-border bg-card text-left shadow-soft disabled:opacity-60"
    >
      <span className="block aspect-[4/3] w-full bg-secondary">
        {option.image_url ? (
          <img src={option.image_url} alt={option.label} className="h-full w-full object-cover" loading="lazy" />
        ) : (
          <span className="grid h-full w-full place-items-center text-ink-soft"><ImageOff className="h-5 w-5" strokeWidth={1.5} /></span>
        )}
      </span>
      <span className="flex flex-1 flex-col p-3.5">
        <span className="inline-flex items-center gap-1 text-[10px] uppercase tracking-[0.2em] text-brass"><Gift className="h-3 w-3" /> Option {option.slot}</span>
        <span className="mt-1 block font-serif text-[16px] leading-tight text-ink">{option.label}</span>
        {option.description && <span className="mt-1 block text-[11.5px] leading-snug text-ink-soft">{option.description}</span>}
      </span>
    </button>
  );
}
