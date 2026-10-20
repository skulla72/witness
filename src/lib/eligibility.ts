import { requireAge } from "./launch-policy";
import {
  COMMUNITY_ACKNOWLEDGEMENT_VERSION, readCommunityAcknowledgement, requireCommunityAcknowledgement,
  type CommunityAcknowledgement,
} from "./community-acknowledgement";

export type EligibilityUser = { id: string; user_metadata?: Record<string, unknown> };
export type AgeAttestation = {
  version: 1; account_id: string; minimum_age_confirmed: true;
  age_band: "13-17" | "18+" | "13+"; confirmed_at: string;
};
export const ELIGIBILITY_FIELD = "witness_launch_eligibility";

/** Explicit known under-13 metadata cannot be replaced by a minimum-only checkbox. */
export function hasKnownUnder13(user: EligibilityUser): boolean {
  const metadata = user.user_metadata ?? {};
  const raw = metadata[ELIGIBILITY_FIELD] as Record<string, unknown> | undefined;
  const band = raw?.age_band;
  if (band === "under13" || band === "under-13" || band === "<13" ||
    (typeof band === "string" && /^\d+$/.test(band) && Number(band) < 13)) return true;
  for (const age of [raw?.age, metadata.age]) {
    if ((typeof age === "number" || typeof age === "string") && /^(0|[1-9]\d*)$/.test(String(age)) && Number(age) < 13) return true;
  }
  for (const birthday of [metadata.date_of_birth, metadata.birth_date, metadata.birthday]) {
    if (typeof birthday !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(birthday)) continue;
    const birth = new Date(`${birthday}T00:00:00.000Z`);
    if (!Number.isFinite(birth.getTime()) || birth.toISOString().slice(0, 10) !== birthday) continue;
    const cutoff = new Date();
    cutoff.setUTCFullYear(cutoff.getUTCFullYear() - 13);
    if (birth > cutoff) return true;
  }
  return false;
}

/** Editable self-attestation, never verified age. Legacy flags/dates grant no exemption. */
export function readEligibility(user: EligibilityUser, now = Date.now()): AgeAttestation | null {
  if (typeof user.id !== "string" || !user.id || hasKnownUnder13(user)) return null;
  const declaration = readCommunityAcknowledgement(user, now);
  // Derived minimum-only read model, not a stored exact age/minor/adult assertion.
  const minimumOnly: AgeAttestation | null = declaration ? {
    version: 1, account_id: user.id, minimum_age_confirmed: true,
    age_band: "13+", confirmed_at: declaration.confirmed_at,
  } : null;
  const raw = user.user_metadata?.[ELIGIBILITY_FIELD];
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return minimumOnly;
  const value = raw as Partial<AgeAttestation>;
  if (value.version !== 1 || value.account_id !== user.id || value.minimum_age_confirmed !== true ||
      !["13-17", "18+"].includes(value.age_band ?? "") || typeof value.confirmed_at !== "string") return minimumOnly;
  const time = Date.parse(value.confirmed_at);
  if (!Number.isFinite(time) || time <= 0 || time > now ||
      new Date(time).toISOString() !== value.confirmed_at) return minimumOnly;
  return value as AgeAttestation;
}

export function makeAttestation(accountId: string, age: unknown, confirmed: unknown, now = new Date()): AgeAttestation {
  if (!accountId || confirmed !== true) throw new Error("Confirm this self-attestation for your signed-in account.");
  const years = requireAge(age);
  return { version: 1, account_id: accountId, minimum_age_confirmed: true,
    age_band: years >= 18 ? "18+" : "13-17", confirmed_at: now.toISOString() };
}

export type EligibilitySession = { user: { id: string }; access_token: string };
export type EligibilityDependencies = {
  session: () => Promise<EligibilitySession | null>;
  user: (token: string) => Promise<EligibilityUser>;
  update: (token: string, value: AgeAttestation) => Promise<EligibilityUser>;
  updateCommunity?: (token: string, value: CommunityAcknowledgement) => Promise<EligibilityUser>;
  watch: (onChange: () => void) => () => void;
};
export type EligibilityState = {
  status: "loading" | "signed-out" | "needs-confirmation" | "eligible" | "error";
  user: EligibilityUser | null; message?: string;
};
const INITIAL: EligibilityState = { status: "loading", user: null };

/** Synchronous invalidation + revision checks prevent account-switch/late-response reuse. */
export class EligibilityController {
  private state: EligibilityState = INITIAL;
  private revision = 0;
  private listeners = new Set<() => void>();
  constructor(private deps: EligibilityDependencies) {}
  getSnapshot = () => this.state;
  getServerSnapshot = () => INITIAL;
  subscribe = (listener: () => void) => { this.listeners.add(listener); return () => { this.listeners.delete(listener); }; };
  private set(state: EligibilityState) { this.state = state; this.listeners.forEach(listener => listener()); }
  start() {
    const stop = this.deps.watch(() => {
      ++this.revision;
      this.set(INITIAL);
      // Never await Supabase operations within its auth-event callback lock.
      queueMicrotask(() => { void this.refresh(); });
    });
    void this.refresh();
    return () => { ++this.revision; stop(); this.set(INITIAL); };
  }
  refresh = async () => {
    const revision = ++this.revision;
    this.set(INITIAL);
    try {
      const session = await this.deps.session();
      if (revision !== this.revision) return;
      if (!session) { this.set({ status: "signed-out", user: null }); return; }
      const user = await this.deps.user(session.access_token);
      if (revision !== this.revision) return;
      if (user.id !== session.user.id) throw new Error("Your account changed. Please retry confirmation.");
      this.set({ status: readEligibility(user) ? "eligible" : "needs-confirmation", user });
    } catch {
      if (revision === this.revision) this.set({ status: "error", user: null, message: "Could not resolve account eligibility. Protected content remains closed. Please retry." });
    }
  };
  confirm = async (age: unknown, confirmed: unknown, expectedAccountId: string) => {
    const id = this.state.user?.id;
    if (!id || !expectedAccountId || id !== expectedAccountId || !["eligible", "needs-confirmation"].includes(this.state.status)) throw new Error("Account changed or unresolved. Confirm again for the current account.");
    const value = makeAttestation(id, age, confirmed);
    const revision = this.revision;
    const session = await this.deps.session();
    if (!session || session.user.id !== id || revision !== this.revision) throw new Error("Account changed. Confirm again for the current account.");
    const user = await this.deps.user(session.access_token);
    if (user.id !== id || revision !== this.revision) throw new Error("Account changed. Confirm again for the current account.");
    if (hasKnownUnder13(user)) throw new Error("This account has an under-13 age declaration. Contact support if it is incorrect.");
    // The update is bound to this captured, verified token, NOT a mutable global session.
    const updated = await this.deps.update(session.access_token, value);
    if (revision !== this.revision) throw new Error("Account changed; no confirmation was applied to the new account.");
    const stored = readEligibility(updated);
    if (updated.id !== id || stored?.confirmed_at !== value.confirmed_at || stored.age_band !== value.age_band) throw new Error("Confirmation could not be verified. Please retry.");
    const verified = await this.deps.user(session.access_token);
    const current = await this.deps.session();
    if (revision !== this.revision || current?.user.id !== id) throw new Error("Account changed; confirm again for the current account.");
    const verifiedValue = readEligibility(verified);
    if (verified.id !== id || verifiedValue?.confirmed_at !== value.confirmed_at || verifiedValue.age_band !== value.age_band) throw new Error("Saved self-attestation could not be verified.");
    this.set({ status: "eligible", user: verified });
  };
  confirmCommunity = async (checked: unknown, expectedAccountId: string) => {
    requireCommunityAcknowledgement(checked);
    const id = this.state.user?.id;
    if (!id || id !== expectedAccountId || !["eligible", "needs-confirmation"].includes(this.state.status)) throw new Error("Account changed or unresolved. Confirm again for the displayed account.");
    const revision = this.revision;
    const session = await this.deps.session();
    if (!session || session.user.id !== id || revision !== this.revision) throw new Error("Account changed. Confirm again for the displayed account.");
    const user = await this.deps.user(session.access_token);
    if (user.id !== id || revision !== this.revision) throw new Error("Account changed. Confirm again for the displayed account.");
    if (hasKnownUnder13(user)) throw new Error("This account has an under-13 age declaration. Community access remains unavailable; contact support if it is incorrect.");
    if (!this.deps.updateCommunity) throw new Error("Acknowledgement saving is unavailable. Please retry.");
    const value: CommunityAcknowledgement = {
      version: COMMUNITY_ACKNOWLEDGEMENT_VERSION, account_id: id,
      minimum_age_confirmed: true, confirmed_at: new Date().toISOString(),
    };
    const updated = await this.deps.updateCommunity(session.access_token, value);
    if (revision !== this.revision || updated.id !== id || readCommunityAcknowledgement(updated)?.confirmed_at !== value.confirmed_at) throw new Error("Account changed or acknowledgement could not be verified. Confirm again.");
    const verified = await this.deps.user(session.access_token);
    const current = await this.deps.session();
    if (revision !== this.revision || current?.user.id !== id || verified.id !== id ||
      readCommunityAcknowledgement(verified)?.confirmed_at !== value.confirmed_at || !readEligibility(verified)) throw new Error("Saved acknowledgement could not be verified for this account. Please retry.");
    this.set({ status: "eligible", user: verified });
  };
}

export const PUBLIC_ELIGIBILITY_PATHS = new Set([
  "/login", "/forgot-password", "/reset-password", "/crisis", "/privacy", "/terms",
  "/care-agreement", "/about", "/contact", "/support", "/delete-account", "/account-deletion",
]);
export function canMountProtected(state: EligibilityState): boolean {
  return state.status === "eligible" && !!state.user && !!readEligibility(state.user);
}

/** No admin/auth-user directory access exists here to establish another client's age. */
export function assertActualAdultClient(user: EligibilityUser, clientId: string) {
  if (user.id !== clientId) throw new Error("Cannot establish this client's adult self-attestation through the current managed backend. No acceptance or session start was performed. A supported client-eligibility lookup is required.");
  if (readEligibility(user)?.age_band !== "18+") throw new Error("Adult counseling requires an account-bound 18+ self-attestation. Confirm adult eligibility for this account first. Teen counseling remains deferred.");
}

export async function authorizeCareAcceptance(
  actor: EligibilityUser, requestId: string,
  readRequest: (id: string) => Promise<{ id: string; requester_id: string; counselor_id: string } | null>,
  readOwner: (id: string) => Promise<string | null>,
) {
  const request = await readRequest(requestId);
  if (!request || request.id !== requestId) throw new Error("Could not establish the actual client for this request.");
  if (await readOwner(request.counselor_id) !== actor.id) throw new Error("This request is not yours to accept.");
  assertActualAdultClient(actor, request.requester_id);
}

export async function authorizeCareSession<T extends { id: string; client_id: string; therapist_id: string }>(
  actor: EligibilityUser, sessionId: string, load: (id: string) => Promise<T | null>,
): Promise<T> {
  const session = await load(sessionId);
  if (!session || session.id !== sessionId) throw new Error("Could not establish this session's actual client.");
  if (session.client_id !== actor.id && session.therapist_id !== actor.id) throw new Error("This session is not yours to start.");
  assertActualAdultClient(actor, session.client_id);
  return session;
}
