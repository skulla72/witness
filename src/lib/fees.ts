/**
 * What comes off a gift before it reaches the mission.
 *
 * Two separate costs, always named plainly to the giver:
 *  - the Witness fee (2%), which keeps the app running
 *  - payment processing, which the card network or the bank charges
 *
 * A giver can choose to add both on top, so the nonprofit keeps the whole
 * amount they meant to give. The checkbox is not pre-checked — we never
 * quietly inflate a gift.
 */

/** Witness keeps 2% of every gift, however it is paid. */
import { PAYMENT_CATALOG } from "@/lib/paymentCatalog";

export const WITNESS_PERCENT = PAYMENT_CATALOG.fees.donationBps / 10_000;

/** Card networks. */
export const CARD_PERCENT = 0.029;
export const CARD_FLAT_CENTS = 30;

/** Bank transfer (ACH) — far cheaper, and capped. */
export const ACH_PERCENT = 0.008;
export const ACH_CAP_CENTS = 500;

/** How the giver pays. */
export type PayMethod = "card" | "bank";

export function isPayMethod(value: unknown): value is PayMethod {
  return value === "card" || value === "bank";
}

/** Witness's 2% on the gift the giver intended. */
export function witnessFeeCents(amountCents: number): number {
  if (!Number.isFinite(amountCents) || amountCents <= 0) return 0;
  return Math.round(amountCents * WITNESS_PERCENT);
}

/** What processing costs on a given charge. */
export function processingFeeCents(chargedCents: number, method: PayMethod = "card"): number {
  if (!Number.isFinite(chargedCents) || chargedCents <= 0) return 0;
  if (method === "bank") {
    return Math.min(ACH_CAP_CENTS, Math.round(chargedCents * ACH_PERCENT));
  }
  return Math.round(chargedCents * CARD_PERCENT) + CARD_FLAT_CENTS;
}

/**
 * Extra cents to add on top so the intended amount survives both the Witness
 * fee and processing.
 */
export function coverageFeeCents(amountCents: number, method: PayMethod = "card"): number {
  if (!Number.isFinite(amountCents) || amountCents <= 0) return 0;
  const base = amountCents + witnessFeeCents(amountCents);
  if (method === "bank") {
    const grossed = Math.ceil(base / (1 - ACH_PERCENT));
    const total = grossed - base > ACH_CAP_CENTS ? base + ACH_CAP_CENTS : grossed;
    return total - amountCents;
  }
  const total = Math.ceil((base + CARD_FLAT_CENTS) / (1 - CARD_PERCENT));
  return total - amountCents;
}

/**
 * The optional "keeping the light lit" gift to Witness itself. Added on top
 * of the charge, never pre-checked, and never tax-deductible — it goes to
 * Common Light LLC to keep the app running, not to the nonprofit.
 */
export const WITNESS_TIP_CENTS = 300;

/** What the giver is charged, given their amount and their choice. */
export function chargeCents(
  amountCents: number,
  coverFees: boolean,
  method: PayMethod = "card",
): number {
  return coverFees ? amountCents + coverageFeeCents(amountCents, method) : amountCents;
}

/** The full charge including the optional gift to Witness. */
export function totalChargeCents(
  amountCents: number,
  coverFees: boolean,
  method: PayMethod = "card",
  tip = false,
): number {
  const tipCents = tip ? WITNESS_TIP_CENTS : 0;
  if (!coverFees) return amountCents + tipCents;
  const protectedBase = amountCents + witnessFeeCents(amountCents) + tipCents;
  if (method === "bank") {
    const grossed = Math.ceil(protectedBase / (1 - ACH_PERCENT));
    const total = grossed - protectedBase > ACH_CAP_CENTS
      ? protectedBase + ACH_CAP_CENTS
      : grossed;
    return total;
  }
  return Math.ceil((protectedBase + CARD_FLAT_CENTS) / (1 - CARD_PERCENT));
}

export interface PaymentBreakdown {
  chargedCents: number;
  processingFeeCents: number;
  witnessFeeCents: number;
  witnessGiftCents: number;
  recipientCents: number;
}

/** The complete ledger split for an organization gift or Fund gift. */
export function paymentBreakdown(
  amountCents: number,
  coverFees: boolean,
  method: PayMethod,
  tip: boolean,
): PaymentBreakdown {
  const chargedCents = totalChargeCents(amountCents, coverFees, method, tip);
  const processing = processingFeeCents(chargedCents, method);
  const platformFee = witnessFeeCents(amountCents);
  const witnessGift = tip ? WITNESS_TIP_CENTS : 0;
  return {
    chargedCents,
    processingFeeCents: processing,
    witnessFeeCents: platformFee,
    witnessGiftCents: witnessGift,
    recipientCents: Math.max(0, chargedCents - processing - platformFee - witnessGift),
  };
}

/** What actually reaches the mission. */
export function netToMissionCents(
  amountCents: number,
  coverFees: boolean,
  method: PayMethod = "card",
): number {
  if (!Number.isFinite(amountCents) || amountCents <= 0) return 0;
  if (coverFees) return amountCents;
  const net = amountCents - witnessFeeCents(amountCents) - processingFeeCents(amountCents, method);
  return Math.max(0, net);
}
