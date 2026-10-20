import { test, expect, afterEach } from "bun:test";
import { readFileSync } from "node:fs";
import { createLovableAuth } from "@lovable.dev/cloud-auth-js";
import { managedSocialSignIn } from "../src/lib/managed-social-auth";
import { parseNativeCallback, safeAuthNext } from "../src/lib/auth-links";

const originalNavigator = Object.getOwnPropertyDescriptor(globalThis, "navigator");
const originalWindow = Object.getOwnPropertyDescriptor(globalThis, "window");
afterEach(() => {
  for (const [name, descriptor] of [["navigator", originalNavigator], ["window", originalWindow]]) {
    if (descriptor) Object.defineProperty(globalThis, name, descriptor);
    else delete globalThis[name];
  }
});

function browser(iframe = false) {
  const listeners = new Map();
  let opened;
  const popup = { closed: false, close() { this.closed = true; } };
  const window = {
    location: { origin: "https://witnessmovement.com", href: "" },
    screenX: 0, screenY: 0, outerWidth: 1200, outerHeight: 800,
    screen: { width: 1200, height: 800 },
    addEventListener: (name, fn) => listeners.set(name, fn),
    removeEventListener: name => listeners.delete(name),
    open: url => { opened = new URL(url, window.location.origin); return popup; },
  };
  window.self = window;
  window.top = iframe ? {} : window;
  Object.defineProperty(globalThis, "window", { configurable: true, value: window });
  Object.defineProperty(globalThis, "navigator", { configurable: true, value: { userAgent: "Mozilla/5.0", maxTouchPoints: 0 } });
  return { window, listeners, popup, opened: () => opened };
}

test("both managed providers initiate the SDK broker with a safe same-origin return", async () => {
  for (const provider of ["google", "apple"]) {
    const b = browser();
    const auth = createLovableAuth();
    const redirect = new URL("/login", b.window.location.origin);
    redirect.searchParams.set("next", safeAuthNext("/profile?tab=prayers"));
    const result = await managedSocialSignIn({ provider, age: 18, native: false, redirectUri: redirect.toString(), signIn: auth.signInWithOAuth });
    const initiated = new URL(b.window.location.href, b.window.location.origin);
    expect(initiated.pathname).toBe("/~oauth/initiate");
    expect(initiated.searchParams.get("provider")).toBe(provider);
    expect(initiated.searchParams.get("redirect_uri")).toBe(redirect.toString());
    expect(initiated.searchParams.get("state")).toBeTruthy();
    expect(result.redirected).toBe(true);
  }
});

test("native social login never invokes broker or direct-provider fallback", async () => {
  let calls = 0;
  for (const provider of ["google", "apple"]) {
    await expect(managedSocialSignIn({ provider, age: 18, native: true, redirectUri: "https://witnessmovement.com/login", signIn: async () => { calls++; } }))
      .rejects.toThrow("no documented handoff");
  }
  expect(calls).toBe(0);
});

test("installed SDK supports an absolute hosted broker without changing the external return", async () => {
  for (const provider of ["google", "apple"]) {
    const b = browser();
    b.window.location.origin = "https://witness-preview.example.replit.dev";
    const redirectUri = `${b.window.location.origin}/login?next=%2Fprofile`;
    const auth = createLovableAuth({ oauthBrokerUrl: "https://witnessmovement.com/~oauth/initiate" });
    const result = await managedSocialSignIn({
      age: 18,
      provider, native: false, redirectUri, signIn: auth.signInWithOAuth,
    });
    const initiated = new URL(b.window.location.href);
    expect(initiated.origin).toBe("https://witnessmovement.com");
    expect(initiated.pathname).toBe("/~oauth/initiate");
    expect(initiated.searchParams.get("redirect_uri")).toBe(redirectUri);
    expect(initiated.searchParams.get("provider")).toBe(provider);
    expect(initiated.searchParams.get("state")).toBeTruthy();
    expect(result.redirected).toBe(true);
  }
});

test("absolute hosted broker keeps iframe response-mode, trusted origin and state checks", async () => {
  const b = browser(true);
  b.window.location.origin = "https://witness-preview.example.replit.dev";
  const auth = createLovableAuth({ oauthBrokerUrl: "https://witnessmovement.com/~oauth/initiate" });
  const promise = auth.signInWithOAuth("apple", { redirect_uri: `${b.window.location.origin}/login` });
  const initiated = b.opened();
  expect(initiated.origin).toBe("https://witnessmovement.com");
  expect(initiated.searchParams.get("response_mode")).toBe("web_message");
  let settled = false;
  promise.then(() => { settled = true; });
  const response = {
    type: "authorization_response",
    response: { state: initiated.searchParams.get("state"), access_token: "synthetic-only", refresh_token: "synthetic-only" },
  };
  b.listeners.get("message")({ origin: b.window.location.origin, data: response });
  await Promise.resolve();
  expect(settled).toBe(false);
  b.listeners.get("message")({
    origin: "https://oauth.lovable.app",
    data: { ...response, response: { ...response.response, state: "wrong-state" } },
  });
  expect((await promise).error.message).toBe("State is invalid");
  expect(b.listeners.has("message")).toBe(false);
});

test("SDK iframe rejects an untrusted callback origin and validates matching state", async () => {
  const b = browser(true);
  const promise = createLovableAuth().signInWithOAuth("google", { redirect_uri: "https://witnessmovement.com/login" });
  const state = b.opened().searchParams.get("state");
  expect(b.opened().pathname).toBe("/~oauth/initiate");
  expect(b.opened().searchParams.get("response_mode")).toBe("web_message");
  let settled = false;
  promise.then(() => { settled = true; });
  const response = { type: "authorization_response", response: { state, access_token: "synthetic-only", refresh_token: "synthetic-only" } };
  b.listeners.get("message")({ origin: "https://evil.example", data: response });
  await Promise.resolve();
  expect(settled).toBe(false);
  b.listeners.get("message")({ origin: "https://oauth.lovable.app", data: { ...response, response: { ...response.response, state: "wrong-state" } } });
  expect((await promise).error.message).toBe("State is invalid");
  expect(b.listeners.has("message")).toBe(false);
});

test("SDK supported iframe handoff returns synthetic session tokens only after valid state/origin", async () => {
  const b = browser(true);
  const promise = createLovableAuth().signInWithOAuth("apple");
  b.listeners.get("message")({
    origin: "https://oauth.lovable.app",
    data: { type: "authorization_response", response: {
      state: b.opened().searchParams.get("state"),
      access_token: "synthetic-only", refresh_token: "synthetic-only",
    } },
  });
  expect((await promise).error).toBeNull();
  expect(b.popup.closed).toBe(true);
});

test("native email parser rejects former direct-social and malformed/token-bearing callbacks", () => {
  for (const raw of [
    "com.commonlight.witness://auth/callback?code=x",
    "com.commonlight.witness://auth/recovery?code=x&code=y",
    "com.commonlight.witness://auth/recovery?code=x&access_token=synthetic",
    "com.commonlight.witness://auth/recovery?refresh_token=synthetic",
    "com.commonlight.witness://auth/recovery?code=x#access_token=synthetic",
    "com.commonlight.witness://user@auth/recovery?code=x",
    "com.commonlight.witness://auth:123/recovery?code=x",
    "com.commonlight.witness://auth/recovery?code=",
    "https://evil.example/recovery?code=x",
  ]) expect(parseNativeCallback(raw)).toBeNull();
});

test("login buttons wire to managed wrapper, preserving password and invitation checks", () => {
  const source = readFileSync("src/routes/login.tsx", "utf8");
  const wrapper = readFileSync("src/integrations/lovable/index.ts", "utf8");
  expect(wrapper).toContain('oauthBrokerUrl: "https://witnessmovement.com/~oauth/initiate"');
  expect(wrapper).not.toContain("supportedOAuthOrigins");
  expect(source).toContain('new URL("/login", window.location.origin)');
  expect(source).toContain('onClick={() => handleOAuth("google")}');
  expect(source).toContain('onClick={() => handleOAuth("apple")}');
  expect(source).toContain("signIn: lovable.auth.signInWithOAuth");
  expect(source).not.toContain("supabase.auth.signInWithOAuth");
  expect(source).toContain("supabase.auth.signInWithPassword");
  expect(source).toContain("supabase.auth.signUp");
  expect(source.indexOf("validateBetaInvitation({ data: { token: invite } })", source.indexOf("const handleOAuth")))
    .toBeLessThan(source.indexOf("managedSocialSignIn({"));
});
