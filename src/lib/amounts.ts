/**
 * One place that decides which money amounts the server will accept.
 * Checkout amounts are always re-checked here on the server, never trusted
 * because the screen sent them.
 */

export const GIFT_MIN_CENTS = 500;
export const GIFT_MAX_CENTS = 2_000_000;
export const JOB_MIN_CENTS = 100;
export const JOB_MAX_CENTS = 500_000;

/** Whole cents only, inside the allowed range. Throws a plain, kind message. */
export function assertAmountCents(
  cents: unknown,
  min: number,
  max: number,
  message: string,
): number {
  if (typeof cents !== "number" || !Number.isInteger(cents) || cents < min || cents > max) {
    throw new Error(message);
  }
  return cents;
}

export function assertGiftAmountCents(cents: unknown): number {
  return assertAmountCents(
    cents,
    GIFT_MIN_CENTS,
    GIFT_MAX_CENTS,
    "Choose an amount between $5 and $20,000",
  );
}

export function assertJobAmountCents(cents: unknown): number {
  return assertAmountCents(cents, JOB_MIN_CENTS, JOB_MAX_CENTS, "Chip in between $1 and $5,000");
}

export const LIGHT_MIN_CENTS = 300;
export const LIGHT_MAX_CENTS = 500_000;

export function assertLightAmountCents(cents: unknown): number {
  return assertAmountCents(cents, LIGHT_MIN_CENTS, LIGHT_MAX_CENTS, "Choose an amount between $3 and $5,000");
}
