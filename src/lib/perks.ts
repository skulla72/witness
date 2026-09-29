/**
 * Two recognition ledgers, kept apart on purpose:
 *   Senders — people who give money (dollars, private to them)
 *   Goers   — people who give hours (verified hours, public on their badge)
 *
 * Neither is ever folded into the other: no combined score, no combined total,
 * no leaderboard. Hours are never shown as a dollar figure anywhere.
 *
 * The tiers themselves live in the database (`tiers` + `gift_options`) so the
 * team can rename them, fill in the gifts, or add rungs above the top one.
 */

import type { Tables } from "@/integrations/supabase/types";

export type Ledger = "sender" | "goer";
export type Slot = "A" | "B" | "C";

export type Tier = Tables<"tiers">;
export type GiftOption = Tables<"gift_options">;
export type Selection = Tables<"selections">;

export const LEDGER_LABEL: Record<Ledger, string> = { sender: "Sender", goer: "Goer" };
export const LEDGER_UNIT: Record<Ledger, string> = { sender: "given", goer: "served" };

/** Days after the qualifying gift during which the choice can still change. */
export const LOCK_DAYS = 14;
export const ENGRAVING_MAX = 25;
export const SIZES = ["XS", "S", "M", "L", "XL", "2XL", "3XL"] as const;
export const ANONYMOUS_NAME = "A friend of the mission";

export function tiersFor(tiers: Tier[], ledger: Ledger): Tier[] {
  return tiers.filter(t => t.ledger === ledger).sort((a, b) => Number(a.threshold) - Number(b.threshold));
}

export interface Standing {
  ledger: Ledger;
  total: number;
  /** Highest tier reached, or null when still on the ground. */
  current: Tier | null;
  /** The next rung, or null past the top named one. */
  next: Tier | null;
  /** 0..1 progress from the current rung toward the next. */
  progress: number;
  /** Every tier reached so far, lowest first. */
  reached: Tier[];
}

/** Where someone stands on one ledger, given their lifetime total. */
export function standingFor(ledger: Ledger, total: number, tiers: Tier[]): Standing {
  const ladder = tiersFor(tiers, ledger);
  const reached = ladder.filter(t => Number(t.threshold) <= total);
  const current = reached[reached.length - 1] ?? null;
  const next = ladder.find(t => Number(t.threshold) > total) ?? null;
  const floor = current ? Number(current.threshold) : 0;
  const progress = next ? Math.max(0, Math.min(1, (total - floor) / (Number(next.threshold) - floor))) : 1;
  return { ledger, total, current, next, progress, reached };
}

export function formatThreshold(ledger: Ledger, n: number): string {
  if (ledger === "sender") return `$${Number(n).toLocaleString("en-US")}`;
  return `${Number(n).toLocaleString("en-US")} h`;
}

export function formatTotal(ledger: Ledger, n: number): string {
  if (ledger === "sender") return `$${Math.floor(n).toLocaleString("en-US")}`;
  const rounded = Math.round(n * 10) / 10;
  return `${rounded.toLocaleString("en-US")} h`;
}

export function formatMoney(n: number): string {
  return `$${Number(n).toLocaleString("en-US", { minimumFractionDigits: 0, maximumFractionDigits: 2 })}`;
}

/** The A/B options that are actually ready to be chosen. */
export function readyGifts(options: GiftOption[]): GiftOption[] {
  return options.filter(o => o.slot !== "C" && o.active).sort((a, b) => a.slot.localeCompare(b.slot));
}

/**
 * What choosing C means, in words. Senders may see the dollars the mission
 * keeps; Goers never see a dollar figure attached to their hours.
 */
export function missionImpact(ledger: Ledger, options: GiftOption[]): string {
  const c = options.find(o => o.slot === "C");
  if (c?.impact_copy) return c.impact_copy;
  const cost = Math.max(0, ...readyGifts(options).map(o => Number(o.est_cost_to_org)));
  if (ledger === "sender" && cost > 0) {
    return `Skipping the gift keeps about ${formatMoney(cost)} in the work — meals, beds, roofs, rides.`;
  }
  if (ledger === "sender") return "Whatever a gift would have cost stays in the work instead.";
  return "Whatever a gift would have cost goes straight back to the people you served.";
}

export type SelectionStatus = Selection["status"];

export const STATUS_LABEL: Record<string, string> = {
  pending: "Choice open",
  ordered: "Ordered",
  shipped: "On its way",
  declined: "Passed",
};

/** The receipt wording, so the screen and any email say the same thing. */
export function receiptLines(sel: Pick<Selection, "slot" | "fmv_at_selection" | "created_at" | "ledger">, optionLabel: string, brand: string): string[] {
  const when = new Date(sel.created_at).toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" });
  if (sel.ledger === "goer") return [];
  if (sel.slot === "C") {
    return [
      `${brand} — gift acknowledgment, ${when}.`,
      `You chose to send your thank-you gift back to the mission.`,
      `No goods or services were provided in exchange for your contribution.`,
    ];
  }
  const fmv = Number(sel.fmv_at_selection);
  return [
    `${brand} — gift acknowledgment, ${when}.`,
    `Thank-you gift received: ${optionLabel}.`,
    `Estimated fair market value of this gift: ${formatMoney(fmv)}.`,
    `Only the portion of your contribution that exceeds ${formatMoney(fmv)} may be tax deductible. Keep this with your records.`,
  ];
}
