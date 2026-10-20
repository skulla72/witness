export const COMMUNITY_ACKNOWLEDGEMENT_VERSION = "2026-10-15-community-13plus-draft";
export const COMMUNITY_ACKNOWLEDGEMENT_FIELD = "witness_community_acknowledgement";

export type CommunityAcknowledgement = {
  version: typeof COMMUNITY_ACKNOWLEDGEMENT_VERSION;
  account_id: string;
  minimum_age_confirmed: true;
  confirmed_at: string;
};

export function requireCommunityAcknowledgement(checked: unknown) {
  if (checked !== true) throw new Error("Confirm the 13+ age requirements, Terms of Use and Privacy Notice to continue.");
}

export function readCommunityAcknowledgement(user: { id: string; user_metadata?: Record<string, unknown> }, now = Date.now()): CommunityAcknowledgement | null {
  const raw = user.user_metadata?.[COMMUNITY_ACKNOWLEDGEMENT_FIELD];
  if (!raw || typeof raw !== "object" || Array.isArray(raw) || !user.id) return null;
  const value = raw as Partial<CommunityAcknowledgement>;
  if (value.version !== COMMUNITY_ACKNOWLEDGEMENT_VERSION || value.account_id !== user.id ||
    value.minimum_age_confirmed !== true || typeof value.confirmed_at !== "string") return null;
  const time = Date.parse(value.confirmed_at);
  if (!Number.isFinite(time) || time <= 0 || time > now || new Date(time).toISOString() !== value.confirmed_at) return null;
  return value as CommunityAcknowledgement;
}

/** Only an attempt-local checkbox; never session storage or returned-account consent. */
export async function withCommunityAttempt<T>(checked: unknown, clear: () => void, action: () => Promise<T>): Promise<T> {
  try {
    requireCommunityAcknowledgement(checked);
    clear();
    return await action();
  } finally { clear(); }
}
