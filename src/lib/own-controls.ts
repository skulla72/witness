import { assertOwnControl } from "./action-eligibility";

export const SUBSCRIPTION_TABLES = {
  donation: "donations", fund: "fund_gifts", light: "witness_gifts",
  professional: "pro_subscriptions", organization: "org_subscriptions",
} as const;
export type SubscriptionKind = keyof typeof SUBSCRIPTION_TABLES;
export function subscriptionKind(value: string): SubscriptionKind {
  if (!Object.hasOwn(SUBSCRIPTION_TABLES, value)) throw new Error("Invalid recurring item.");
  return value as SubscriptionKind;
}
export type StopItem = { id: string; kind: SubscriptionKind | "session"; status: string; startsAt?: string };
export type OwnSession = { id: string; client_id: string; therapist_id: string; status: string };

/** Deliberately independent of minimum age/adult self-attestation. Auth is still mandatory. */
export async function stopOwnSession(
  actorId: string, id: string, load: () => Promise<OwnSession | null>,
  cancel: () => Promise<void>,
) {
  const session = await load();
  if (!session || session.id !== id) throw new Error("Session could not be verified. Retry; nothing was cancelled.");
  assertOwnControl(actorId, [session.client_id, session.therapist_id]);
  if (session.status === "cancelled") return;
  if (!["booked", "in_progress"].includes(session.status)) throw new Error("This session is not open for cancellation.");
  await cancel();
}

export function assertSubscriptionOwner(actorId: string, record: { user_id?: string; org_id?: string }, managerIds: string[] = []) {
  assertOwnControl(actorId, record.org_id ? managerIds : record.user_id ? [record.user_id] : []);
}

export type RecurringStopRecord = {
  id: string; user_id?: string; org_id?: string; status: string;
  environment: string; stripe_subscription_id: string | null;
};
type VerifiedRecurring = RecurringStopRecord & {
  environment: "sandbox" | "live"; stripe_subscription_id: string;
};
export class StopRecordUpdateError extends Error {
  constructor() {
    super("The provider accepted the stop, but the local record update was not verified. Contact support before retrying. No records were deleted.");
  }
}

/** No age lookup: cancel ownership is independent of permission to buy. */
export async function performOwnRecurringStop(
  actorId: string, row: RecurringStopRecord, managers: string[],
  prepare: (canonical: VerifiedRecurring) => Promise<{ stop: () => Promise<void>; save: () => Promise<boolean> }>,
) {
  assertSubscriptionOwner(actorId, row, managers);
  if (!row.id || !row.stripe_subscription_id || !/^sub_[a-zA-Z0-9]+$/.test(row.stripe_subscription_id))
    throw new Error("A recurring provider record could not be established.");
  if (row.environment !== "sandbox" && row.environment !== "live") throw new Error("The saved payment environment is unresolved.");
  const actions = await prepare({ ...row, environment: row.environment, stripe_subscription_id: row.stripe_subscription_id });
  await actions.stop();
  let saved = false;
  try { saved = await actions.save(); } catch { /* Provider success must not imply record success. */ }
  if (!saved) throw new StopRecordUpdateError();
}
