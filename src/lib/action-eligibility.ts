import { readEligibility, assertActualAdultClient, type EligibilityUser } from "./eligibility";

export const ELIGIBILITY_RETRY = "Eligibility could not be checked. No purchase or call was started. Please retry; cancellation controls remain available.";
export type PurchaseKind = "community" | "counseling";
export function professionalPurchaseKind(trade: string): PurchaseKind {
  if (!trade?.trim()) throw new Error("The saved professional category is unresolved. Retry or contact support before purchasing.");
  return /counsel|therap/i.test(trade) ? "counseling" : "community";
}

/** Must be backed by a fresh authenticated user lookup, not client input/JWT metadata. */
export async function authorizePurchase(load: () => Promise<EligibilityUser>, expectedId?: string, kind: PurchaseKind = "community") {
  let user: EligibilityUser;
  try { user = await load(); }
  catch { throw new Error(ELIGIBILITY_RETRY); }
  if (!user?.id || (expectedId && user.id !== expectedId)) throw new Error(ELIGIBILITY_RETRY);
  const value = readEligibility(user);
  if (!value) throw new Error("Confirm 13+ self-attestation for your signed-in account before purchasing. Cancellation controls remain available.");
  if (kind === "counseling" && value.age_band !== "18+") throw new Error("Counseling purchases require an account-bound 18+ self-attestation. Teen counseling is deferred.");
  return user;
}

export type CareRoom = { client_id: string; therapist_id: string };
export async function authorizeRoom(
  user: EligibilityUser, conversationId: string,
  member: () => Promise<boolean>,
  // This must be authoritative across the room, not an RLS-filtered empty result.
  classify: () => Promise<CareRoom[]>,
) {
  if (!conversationId || !await member()) throw new Error("You are not authorized to enter this room.");
  let care: CareRoom[];
  try { care = await classify(); }
  catch { throw new Error("Call classification is unavailable. No camera, microphone or signaling was opened. Retry or contact support."); }
  if (!readEligibility(user)) throw new Error("Confirm 13+ self-attestation before joining a call.");
  for (const session of care) {
    if (!session.client_id || !session.therapist_id || session.client_id === session.therapist_id) throw new Error("The actual care participants could not be established.");
    if (user.id !== session.client_id && user.id !== session.therapist_id) throw new Error("Room membership alone does not authorize counseling participation.");
    assertActualAdultClient(user, session.client_id);
  }
  return { allowed: true as const, kind: care.length ? "care" as const : "peer" as const };
}

export function assertOwnControl(actorId: string, ownerIds: string[]) {
  if (!actorId || !ownerIds.includes(actorId)) throw new Error("Only an authenticated owner or session participant can stop this item.");
}

export const CONTROL_PATH = "/account-controls";
export function isControlPath(path: string) {
  return path.replace(/\/$/, "") === CONTROL_PATH;
}
