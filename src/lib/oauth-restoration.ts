/** Credential values are never retained here. Only presence survives URL inspection. */
const CALLBACK_FIELDS = [
  "access_token", "refresh_token", "expires_in", "expires_at", "token_type",
  "code", "state", "error", "error_code", "error_description",
] as const;
export type CallbackPresence = Readonly<Record<typeof CALLBACK_FIELDS[number], boolean>>;
export function callbackPresence(href: string): CallbackPresence {
  const url = new URL(href);
  const fragment = new URLSearchParams(url.hash.slice(1));
  return Object.freeze(Object.fromEntries(CALLBACK_FIELDS.map(field =>
    [field, url.searchParams.has(field) || fragment.has(field)],
  ))) as CallbackPresence;
}
export function isAuthReturn(fields: CallbackPresence) {
  return CALLBACK_FIELDS.some(field => fields[field]);
}

let initialPresence: CallbackPresence | undefined;
/** Called before createClient, since automatic initialization can clear the URL. */
export function initialCallbackPresence(): CallbackPresence {
  if (typeof window === "undefined") return callbackPresence("https://placeholder.invalid/login");
  return initialPresence ??= callbackPresence(window.location.href);
}
/** A later SPA visit to sign-in is not the original callback. */
export function finishInitialCallbackObservation() {
  initialPresence = callbackPresence("https://placeholder.invalid/login");
}

const ERROR_NAMES = new Set([
  "AuthApiError", "AuthUnknownError", "AuthImplicitGrantRedirectError",
  "AuthPKCEGrantCodeExchangeError", "AuthSessionMissingError", "AuthRetryableFetchError",
]);
const ERROR_CODES = new Set([
  "bad_jwt", "flow_state_not_found", "flow_state_expired", "access_denied",
  "otp_expired", "invalid_credentials", "unexpected_failure", "request_timeout",
]);
export type SafeAuthReference = {
  callback: CallbackPresence;
  errorName: string;
  errorCode: string;
  sessionPresent: boolean;
  onwardNavigation: boolean;
};
export function safeAuthError(error: unknown) {
  const candidate = error && typeof error === "object" ? error as { name?: unknown; code?: unknown } : {};
  return {
    errorName: typeof candidate.name === "string" && ERROR_NAMES.has(candidate.name) ? candidate.name : "UnknownAuthError",
    errorCode: typeof candidate.code === "string" && ERROR_CODES.has(candidate.code) ? candidate.code : "unclassified",
  };
}
export type RestorationState =
  | { status: "normal" | "restoring" | "continuing" }
  | { status: "failed"; reference: SafeAuthReference };
type AuthResult = { error: unknown };
export interface RestorationAuth {
  initialize(): Promise<AuthResult>;
  getSession(): Promise<{ data: { session: unknown | null }; error: unknown }>;
  onAuthStateChange(callback: () => void): { data: { subscription: { unsubscribe(): void } } };
}

/** Observes the existing client; does not parse tokens, exchange codes or write storage. */
export function observeOAuthRestoration(
  auth: RestorationAuth, fields: CallbackPresence,
  update: (state: RestorationState) => void, navigate: () => Promise<unknown> | void,
) {
  const returning = isAuthReturn(fields);
  let active = true, initialized = false, navigating = false, completed = false;
  let sessionPresent = false, readRevision = 0;
  const fail = (error: unknown, code?: "session_not_established" | "navigation_failed") => {
    if (!active || !returning) return;
    update({ status: "failed", reference: {
      callback: fields, ...safeAuthError(error),
      ...(code ? { errorCode: code } : {}),
      sessionPresent, onwardNavigation: completed,
    } });
  };
  const readSession = async () => {
    if (!active || !initialized || navigating || completed) return;
    const revision = ++readRevision;
    try {
      const { data, error } = await auth.getSession();
      if (!active || revision !== readRevision || navigating || completed) return;
      sessionPresent = !!data.session;
      if (error) { fail(error); return; }
      if (!sessionPresent) { fail(null, "session_not_established"); return; }
      navigating = true;
      if (returning) update({ status: "continuing" });
      try {
        await navigate();
        completed = true;
      } catch (error) {
        fail(error, "navigation_failed");
      } finally { navigating = false; }
    } catch (error) {
      if (active && revision === readRevision) fail(error);
    }
  };
  update({ status: returning ? "restoring" : "normal" });
  // Never call async Auth methods inside the client's locked event callback.
  const listener = auth.onAuthStateChange(() => {
    if (initialized) queueMicrotask(() => { void readSession(); });
  });
  void (async () => {
    try {
      // Public API returns the SAME initialization promise, not a second consumer.
      const { error } = await auth.initialize();
      if (!active) return;
      if (error) { fail(error); return; }
      initialized = true;
      await readSession();
    } catch (error) { fail(error); }
  })();
  return () => {
    active = false; ++readRevision;
    listener.data.subscription.unsubscribe();
  };
}
