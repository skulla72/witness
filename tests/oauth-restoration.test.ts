import { expect, test } from "bun:test";
import { readFileSync } from "node:fs";
import { AuthClient } from "@supabase/supabase-js";
import {
  callbackPresence, isAuthReturn, observeOAuthRestoration, safeAuthError,
  type RestorationAuth, type RestorationState,
} from "../src/lib/oauth-restoration";

const returning = callbackPresence("https://fixture.invalid/login#access_token=synthetic&refresh_token=synthetic&state=synthetic");
const clean = callbackPresence("https://fixture.invalid/login?next=%2Fprofile");
const tick = () => new Promise(resolve => setTimeout(resolve, 0));
function deferred<T>() {
  let resolve!: (value: T) => void;
  const promise = new Promise<T>(r => { resolve = r; });
  return { promise, resolve };
}
function fixture(fields = returning) {
  let event = () => {};
  let session: unknown | null = null;
  let sessionError: unknown = null;
  const init = deferred<{ error: unknown }>();
  const states: RestorationState[] = [];
  let navigations = 0, reads = 0, unsubscribed = false;
  const auth: RestorationAuth = {
    initialize: () => init.promise,
    getSession: async () => { reads++; return { data: { session }, error: sessionError }; },
    onAuthStateChange: callback => {
      event = callback;
      return { data: { subscription: { unsubscribe() { unsubscribed = true; } } } };
    },
  };
  const stop = observeOAuthRestoration(auth, fields, state => states.push(state), () => { navigations++; });
  return {
    states, init, stop,
    emit: () => event(),
    setSession: (value: unknown) => { session = value; },
    setSessionError: (value: unknown) => { sessionError = value; },
    counts: () => ({ navigations, reads, unsubscribed }),
  };
}

test("callback inspection stores only booleans, including empty query/hash fields", () => {
  const fields = callbackPresence("https://fixture.invalid/login?code=&error_description=private-email%40example.invalid#access_token=private-token&state=private-state");
  expect(fields.code).toBe(true);
  expect(fields.access_token).toBe(true);
  expect(fields.error_description).toBe(true);
  expect(Object.values(fields).every(value => typeof value === "boolean")).toBe(true);
  expect(JSON.stringify(fields)).not.toMatch(/private|example|https|fixture/);
  expect(isAuthReturn(clean)).toBe(false);
  expect(isAuthReturn(fields)).toBe(true);
});

test("initialization failure is explicit, sanitized and never rescued by an unvalidated event", async () => {
  const f = fixture();
  expect(f.states[0].status).toBe("restoring");
  f.setSession({ synthetic: true });
  f.emit();
  expect(f.counts().reads).toBe(0);
  f.init.resolve({ error: { name: "AuthApiError", code: "bad_jwt", message: "https://private.invalid/?token=private&email=private" } });
  await tick();
  const state = f.states.at(-1)!;
  expect(state.status).toBe("failed");
  if (state.status === "failed") {
    expect(state.reference.errorName).toBe("AuthApiError");
    expect(state.reference.errorCode).toBe("bad_jwt");
    expect(state.reference.onwardNavigation).toBe(false);
  }
  f.emit(); await tick();
  expect(f.counts().navigations).toBe(0);
  expect(JSON.stringify(f.states)).not.toMatch(/private|message|token=/);
  f.stop();
});

test("clean direct sign-in stays normal with no misleading callback failure", async () => {
  const f = fixture(clean);
  f.init.resolve({ error: null }); await tick();
  expect(f.states).toEqual([{ status: "normal" }]);
  expect(f.counts().navigations).toBe(0);
  f.stop();
});

test("successful callback waits for initialization, then navigates once with an established session", async () => {
  const f = fixture();
  f.setSession({ synthetic: true });
  f.emit(); await tick();
  expect(f.counts()).toMatchObject({ reads: 0, navigations: 0 });
  f.init.resolve({ error: null }); await tick();
  expect(f.states.map(state => state.status)).toEqual(["restoring", "continuing"]);
  expect(f.counts().navigations).toBe(1);
  f.emit(); f.emit(); await tick();
  expect(f.counts().navigations).toBe(1);
  f.stop();
});

test("missing restored session shows retry, but a later auth event rechecks and can recover", async () => {
  const f = fixture();
  f.init.resolve({ error: null }); await tick();
  expect(f.states.at(-1)).toMatchObject({
    status: "failed", reference: { errorCode: "session_not_established", sessionPresent: false, onwardNavigation: false },
  });
  f.setSession({ synthetic: true }); f.emit(); await tick();
  expect(f.states.at(-1)?.status).toBe("continuing");
  expect(f.counts().navigations).toBe(1);
  f.stop();
});

test("session-read failures and unknown error properties cannot leak into the support reference", async () => {
  const f = fixture();
  f.setSessionError({ name: "private-name", code: "private-code", message: "private-email@example.invalid" });
  f.init.resolve({ error: null }); await tick();
  expect(f.states.at(-1)).toMatchObject({
    status: "failed", reference: { errorName: "UnknownAuthError", errorCode: "unclassified" },
  });
  expect(JSON.stringify(f.states)).not.toContain("private");
  expect(safeAuthError("https://private.invalid/token")).toEqual({ errorName: "UnknownAuthError", errorCode: "unclassified" });
  f.stop();
});

test("unmount cancels late restoration/navigation and unsubscribes without changing auth", async () => {
  const f = fixture();
  f.stop(); f.setSession({ synthetic: true }); f.init.resolve({ error: null });
  await tick(); f.emit(); await tick();
  expect(f.counts()).toEqual({ reads: 0, navigations: 0, unsubscribed: true });
});

test("failed navigation reports a safe established-session failure, without raw router errors", async () => {
  const states: RestorationState[] = [];
  const stop = observeOAuthRestoration({
    initialize: async () => ({ error: null }),
    getSession: async () => ({ data: { session: { synthetic: true } }, error: null }),
    onAuthStateChange: () => ({ data: { subscription: { unsubscribe() {} } } }),
  }, returning, state => states.push(state), async () => { throw new Error("private-router-url"); });
  await tick();
  expect(states.at(-1)).toMatchObject({
    status: "failed", reference: { errorCode: "navigation_failed", sessionPresent: true, onwardNavigation: false },
  });
  expect(JSON.stringify(states)).not.toContain("private");
  stop();
});

test("presence is captured before client creation; only existing client consumes credentials", () => {
  const client = readFileSync("src/integrations/supabase/client.ts", "utf8");
  const login = readFileSync("src/routes/login.tsx", "utf8");
  const observer = readFileSync("src/lib/oauth-restoration.ts", "utf8");
  expect(client.indexOf("initialCallbackPresence();")).toBeLessThan(client.indexOf("const client = createClient"));
  expect(login).toContain("observeOAuthRestoration(supabase.auth");
  expect(login).not.toContain("toast.error(callbackError)");
  expect(login).not.toContain("window.location.hash.slice");
  expect(observer).not.toMatch(/setSession|exchangeCodeForSession|fetch\(|localStorage|console\./);
  expect(login).toContain('new URL("/login", window.location.origin)');
  expect(login).toContain('aria-label="Safe sign-in support reference"');
});

test("installed Auth client alone consumes a synthetic return with fully mocked transport", async () => {
  const originals = ["window", "document"].map(key => [key, Object.getOwnPropertyDescriptor(globalThis, key)] as const);
  try {
    for (const success of [false, true]) {
      const url = new URL(success
        ? "https://fixture.invalid/login#access_token=synthetic-access&refresh_token=synthetic-refresh&expires_in=3600&token_type=bearer"
        : "https://fixture.invalid/login#error=access_denied&error_description=synthetic-private-text");
      const location = {
        get href() { return url.href; },
        get hash() { return url.hash; },
        set hash(value: string) { url.hash = value; },
      };
      Object.defineProperty(globalThis, "window", { configurable: true, value: {
        location, addEventListener() {}, removeEventListener() {},
      } });
      Object.defineProperty(globalThis, "document", { configurable: true, value: {
        visibilityState: "visible", addEventListener() {}, removeEventListener() {},
      } });
      const fields = callbackPresence(url.href);
      let transportCalls = 0;
      const client = new AuthClient({
        url: "https://mock-auth.invalid/auth/v1",
        persistSession: false, autoRefreshToken: false, flowType: "implicit",
        fetch: async input => {
          // No fallthrough to global/live fetch, including on unexpected requests.
          transportCalls++;
          expect(new URL(String(input)).hostname).toBe("mock-auth.invalid");
          expect(new URL(String(input)).pathname).toBe("/auth/v1/user");
          return new Response(JSON.stringify({
            id: "synthetic-fixture", aud: "authenticated", user_metadata: {},
            app_metadata: {}, created_at: "2026-01-01T00:00:00.000Z",
          }), { status: 200, headers: { "Content-Type": "application/json" } });
        },
      });
      const outcome = await client.initialize();
      expect(!!outcome.error).toBe(!success);
      const states: RestorationState[] = [];
      let navigations = 0;
      const stop = observeOAuthRestoration(client, fields, value => states.push(value), () => { navigations++; });
      await tick(); await tick();
      expect(navigations).toBe(success ? 1 : 0);
      expect(states.at(-1)?.status).toBe(success ? "continuing" : "failed");
      expect(transportCalls).toBe(success ? 1 : 0);
      expect(JSON.stringify(states)).not.toMatch(/synthetic-access|synthetic-refresh|synthetic-private-text|synthetic-fixture/);
      if (success) expect(url.hash).toBe("");
      stop(); client.stopAutoRefresh();
    }
  } finally {
    for (const [key, descriptor] of originals) {
      if (descriptor) Object.defineProperty(globalThis, key, descriptor);
      else Reflect.deleteProperty(globalThis, key);
    }
  }
});
