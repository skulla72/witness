import { expect, test } from "bun:test";
import { readFileSync } from "node:fs";
import * as React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { SignedMediaCache, publicMediaUrl, type MediaBucket } from "../src/lib/signed-media-cache";
import { MediaLoadError } from "../src/components/media/MediaLoadError";

const PATH = "owner/file.mp4", A_URL = "https://media.invalid/account-a.mp4", B_URL = "https://media.invalid/account-b.mp4";
const bucket: MediaBucket = "testimony-media";
const read = (path: string) => readFileSync(path, "utf8");
function deferred<T>() {
  let resolve!: (value: T) => void, reject!: (error: unknown) => void;
  const promise = new Promise<T>((yes, no) => { resolve = yes; reject = no; });
  return { promise, resolve, reject };
}
function fixture(sign: (path: string, bucket: MediaBucket) => Promise<string | null> = async () => A_URL) {
  let now = 0;
  const tasks = new Set<{ at: number; run: () => void }>();
  const cache = new SignedMediaCache(sign, {
    now: () => now,
    schedule: (run, delay) => {
      const task = { at: now + delay, run };
      tasks.add(task);
      return () => { tasks.delete(task); };
    },
  });
  return {
    cache, tasks,
    advance(ms: number, fireTimers = true) {
      now += ms;
      if (fireTimers) for (const task of [...tasks]) if (task.at <= now) { tasks.delete(task); task.run(); }
    },
  };
}
const tick = async () => { for (let i = 0; i < 8; i++) await Promise.resolve(); };

test("no private request or cached URL before initial identity is known", async () => {
  let requests = 0;
  const { cache } = fixture(async () => { requests++; return A_URL; });
  expect(cache.read(PATH, bucket)).toEqual({ url: null, loading: true, error: false });
  expect(await cache.load(PATH, bucket)).toBeNull();
  expect(requests).toBe(0);
});

test("normal signing is reused within one account and separate buckets stay separate", async () => {
  const calls: MediaBucket[] = [];
  const { cache } = fixture(async (_, inputBucket) => { calls.push(inputBucket); return A_URL; });
  cache.setAccount("account-a");
  expect(await cache.load(PATH, bucket)).toBe(A_URL);
  expect(await cache.load(PATH, bucket)).toBe(A_URL);
  expect(cache.read(PATH, bucket).url).toBe(A_URL);
  await cache.load(PATH, "avatars");
  expect(calls).toEqual(["testimony-media", "avatars"]);
});

test("expired cache is never readable even when browser expiry timers have not fired", async () => {
  const f = fixture();
  f.cache.setAccount("account-a");
  await f.cache.load(PATH, bucket);
  f.advance(301_000, false);
  expect(f.tasks.size).toBe(1); // Simulate a suspended/background tab.
  expect(f.cache.read(PATH, bucket)).toEqual({ url: null, loading: true, error: false });
});

test("expiry proactively clears mounted URLs and notifies consumers before actual link expiry", async () => {
  const f = fixture();
  f.cache.setAccount("account-a");
  await f.cache.load(PATH, bucket);
  let notices = 0;
  f.cache.subscribe(() => { notices++; });
  f.advance(270_000);
  expect(notices).toBe(1);
  expect(f.cache.read(PATH, bucket).url).toBeNull();
  expect(await f.cache.load(PATH, bucket)).toBe(A_URL);
});

test("account switching clears cached links and requires a new permitted signing request", async () => {
  let calls = 0;
  const f = fixture(async () => ++calls === 1 ? A_URL : B_URL);
  f.cache.setAccount("account-a");
  await f.cache.load(PATH, bucket);
  f.cache.setAccount("account-b");
  expect(f.cache.read(PATH, bucket).url).toBeNull();
  expect(f.tasks.size).toBe(0);
  expect(await f.cache.load(PATH, bucket)).toBe(B_URL);
  expect(calls).toBe(2);
});

test("signout clears all private buckets and guest access never inherits signed-in cache", async () => {
  const f = fixture();
  f.cache.setAccount("account-a");
  for (const name of ["testimony-media", "avatars", "need-media", "profile-media"] as MediaBucket[]) await f.cache.load(PATH, name);
  f.cache.setAccount(null, true);
  for (const name of ["testimony-media", "avatars", "need-media", "profile-media"] as MediaBucket[]) {
    expect(f.cache.read(PATH, name).url).toBeNull();
  }
  expect(f.tasks.size).toBe(0);
});

test("late account-A response cannot fill cache, return a URL, or overwrite account-B work", async () => {
  const late = deferred<string | null>();
  let calls = 0;
  const f = fixture(async () => ++calls === 1 ? late.promise : B_URL);
  f.cache.setAccount("account-a");
  const old = f.cache.load(PATH, bucket);
  await tick();
  f.cache.setAccount("account-b");
  expect(await f.cache.load(PATH, bucket)).toBe(B_URL);
  late.resolve(A_URL);
  expect(await old).toBeNull();
  expect(f.cache.read(PATH, bucket).url).toBe(B_URL);
});

test("late response after signout or A-to-B-to-A is invalid even for the original account ID", async () => {
  for (const returnToA of [false, true]) {
    const late = deferred<string | null>();
    const f = fixture(async () => late.promise);
    f.cache.setAccount("account-a");
    const request = f.cache.load(PATH, bucket);
    await tick();
    f.cache.setAccount(returnToA ? "account-b" : null, true);
    if (returnToA) f.cache.setAccount("account-a");
    late.resolve(A_URL);
    expect(await request).toBeNull();
    expect(f.cache.read(PATH, bucket).url).toBeNull();
  }
});

test("late rejection for an old account cannot put the new account in an error state", async () => {
  const late = deferred<string | null>();
  const f = fixture(async () => late.promise);
  f.cache.setAccount("account-a");
  const request = f.cache.load(PATH, bucket);
  await tick();
  f.cache.setAccount("account-b");
  late.reject(new Error("synthetic transport error"));
  expect(await request).toBeNull();
  expect(f.cache.read(PATH, bucket).error).toBe(false);
});

test("same-account token refresh preserves playback; explicit signout invalidates even guest work", async () => {
  const f = fixture();
  f.cache.setAccount("account-a");
  await f.cache.load(PATH, bucket);
  const initial = f.cache.getSnapshot();
  f.cache.setAccount("account-a");
  expect(f.cache.getSnapshot()).toBe(initial);
  expect(f.cache.read(PATH, bucket).url).toBe(A_URL);
  f.cache.setAccount(null);
  await f.cache.load(PATH, bucket);
  f.cache.setAccount(null, true);
  expect(f.cache.read(PATH, bucket).url).toBeNull();
});

test("public web/local/data/blob assets remain available across identities without signing", async () => {
  let calls = 0;
  const f = fixture(async () => { calls++; return null; });
  for (const path of ["https://images.invalid/public.jpg", "/icon-192.png", "data:image/png;base64,fixture", "blob:fixture"]) {
    expect(publicMediaUrl(path)).toBe(path);
    expect(await f.cache.load(path, bucket)).toBe(path);
    f.cache.setAccount("account-a");
    f.cache.setAccount(null);
    expect(f.cache.read(path, bucket).url).toBe(path);
  }
  expect(calls).toBe(0);
  expect(publicMediaUrl("https://backend.invalid/storage/v1/object/sign/testimony-media/file?token=fixture")).toBeNull();
});

test("anonymous public profile signing still works, in a separate generation from signed-in media", async () => {
  let calls = 0;
  const f = fixture(async () => { calls++; return "https://media.invalid/public-profile.jpg"; });
  f.cache.setAccount(null);
  expect(await f.cache.load(PATH, "profile-media")).toContain("public-profile");
  f.cache.setAccount("account-a");
  expect(f.cache.read(PATH, "profile-media").url).toBeNull();
  await f.cache.load(PATH, "profile-media");
  expect(calls).toBe(2);
});

test("service failures are sanitized and retry replaces the failed request; late invalidated work loses", async () => {
  let calls = 0;
  const f = fixture(async () => { if (++calls === 1) throw new Error("must-not-expose-secret-or-url"); return A_URL; });
  f.cache.setAccount("account-a");
  expect(await f.cache.load(PATH, bucket)).toBeNull();
  expect(f.cache.read(PATH, bucket)).toEqual({ url: null, loading: false, error: true });
  expect(JSON.stringify(f.cache.read(PATH, bucket))).not.toContain("must-not-expose");
  f.cache.invalidate(PATH, bucket);
  expect(await f.cache.load(PATH, bucket)).toBe(A_URL);
  const old = deferred<string | null>();
  let attempts = 0;
  const retry = fixture(async () => ++attempts === 1 ? old.promise : B_URL);
  retry.cache.setAccount("account-a");
  const first = retry.cache.load(PATH, bucket);
  await tick();
  retry.cache.invalidate(PATH, bucket);
  await retry.cache.load(PATH, bucket);
  old.resolve(A_URL);
  expect(await first).toBeNull();
  expect(retry.cache.read(PATH, bucket).url).toBe(B_URL);
});

test("slow signing does not extend the real TTL by counting from response completion", async () => {
  const late = deferred<string | null>();
  const f = fixture(async () => late.promise);
  f.cache.setAccount("account-a");
  const request = f.cache.load(PATH, bucket);
  await tick();
  f.advance(301_000);
  late.resolve(A_URL);
  expect(await request).toBeNull();
  expect(f.cache.read(PATH, bucket).error).toBe(true);
});

const transpiler = new Bun.Transpiler({
  loader: "tsx",
  tsconfig: JSON.stringify({ compilerOptions: { jsx: "react", jsxFactory: "React.createElement", jsxFragmentFactory: "React.Fragment" } }),
});
function compile(source: string, name: string, deps: Record<string, unknown>) {
  const code = transpiler.transformSync(source.replace(/^import .*;\n/gm, "").replace(/\bexport /g, ""));
  return new Function(...Object.keys(deps), `${code}\nreturn ${name};`)(...Object.values(deps));
}

// Run the actual hook with deterministic mounted-hook lifecycle dependencies.
// Reads can be asserted BEFORE effects run, which catches stale-first-render bugs.
function hookFixture(cache: SignedMediaCache) {
  const state: unknown[] = [], effects: Array<{ deps: unknown[]; run: () => void }> = [];
  let stateIndex = 0, effectIndex = 0, pending: Array<() => void> = [], notifications = 0;
  const unsubscribe = cache.subscribe(() => { notifications++; });
  const source = read("src/hooks/useSignedUrl.ts");
  const useHook = compile(source.slice(source.indexOf("export function useSignedUrl(")), "useSignedUrl", {
    signedMediaCache: cache, publicMediaUrl,
    serverSnapshot: { account: undefined, generation: 0, revision: 0 },
    supabase: { auth: {} },
    useSyncExternalStore: (_: unknown, get: () => unknown) => get(),
    useState: (initial: unknown) => {
      const index = stateIndex++;
      if (!(index in state)) state[index] = initial;
      return [state[index], (value: unknown) => { state[index] = value; }];
    },
    useEffect: (run: () => void, deps: unknown[]) => {
      const index = effectIndex++, previous = effects[index];
      if (!previous || deps.some((value, i) => value !== previous.deps[i])) {
        effects[index] = { deps, run }; pending.push(run);
      }
    },
  });
  return {
    render(path: string | null = PATH, name: MediaBucket = bucket) {
      stateIndex = 0; effectIndex = 0;
      return useHook(path, name) as { url: string | null; loading: boolean; error: boolean; retry: () => void; onError: () => void; isCurrent: () => boolean };
    },
    effects() { const tasks = pending; pending = []; tasks.forEach(run => run()); },
    notices: () => notifications,
    dispose: unsubscribe,
  };
}

test("mounted hook resets before effects on account switch, signout and path changes", async () => {
  const f = fixture();
  f.cache.setAccount("account-a");
  await f.cache.load(PATH, bucket);
  const hook = hookFixture(f.cache);
  expect(hook.render().url).toBe(A_URL);
  f.cache.setAccount("account-b");
  expect(hook.notices()).toBe(1);
  expect(hook.render().url).toBeNull(); // No effects necessary to hide old media.
  await f.cache.load(PATH, bucket);
  expect(hook.render().url).toBe(A_URL);
  expect(hook.render("different/file.mp4").url).toBeNull();
  f.cache.setAccount(null, true);
  expect(hook.render().url).toBeNull();
  hook.dispose();
});

test("initial hook render cannot flash an expired cached link, even without expiry callbacks", async () => {
  const f = fixture();
  f.cache.setAccount("account-a");
  await f.cache.load(PATH, bucket);
  f.advance(301_000, false);
  const hook = hookFixture(f.cache);
  expect(hook.render().url).toBeNull();
  expect(hook.render().loading).toBe(true);
  hook.dispose();
});

test("mounted hook restores normal playback after expiry refresh and recoverable failure", async () => {
  let calls = 0;
  const f = fixture(async () => { if (++calls === 2) throw new Error("offline"); return A_URL; });
  f.cache.setAccount("account-a");
  const hook = hookFixture(f.cache);
  expect(hook.render().loading).toBe(true);
  hook.effects(); await tick();
  expect(hook.render().url).toBe(A_URL);
  f.advance(270_000);
  expect(hook.render().url).toBeNull();
  hook.effects(); await tick();
  expect(hook.render().error).toBe(true);
  hook.render().retry(); await tick();
  expect(hook.render().url).toBe(A_URL);
  expect(hook.render().error).toBe(false);
  hook.dispose();
});

test("stale mounted callbacks cannot retry, fail, or validate work for a new identity", async () => {
  const f = fixture();
  f.cache.setAccount("account-a");
  await f.cache.load(PATH, bucket);
  const hook = hookFixture(f.cache), stale = hook.render();
  f.cache.setAccount("account-b");
  await f.cache.load(PATH, bucket);
  stale.onError(); stale.retry();
  expect(stale.isCurrent()).toBe(false);
  expect(f.cache.read(PATH, bucket).url).toBe(A_URL);
  expect(f.cache.read(PATH, bucket).error).toBe(false);
  hook.dispose();
});

test("public asset network errors have retry without becoming private or requiring sign-in", () => {
  const f = fixture(), hook = hookFixture(f.cache), path = "/icon-192.png";
  expect(hook.render(path).url).toBe(path);
  hook.render(path).onError();
  expect(hook.render(path).url).toBeNull();
  expect(hook.render(path).error).toBe(true);
  hook.render(path).retry();
  expect(hook.render(path).url).toBe(path);
  hook.dispose();
});

test("actual client auth-event handler clears media across accounts and preserves same-account refresh", async () => {
  const f = fixture(), listeners: Array<(event: string, session: unknown) => void> = [], journals: unknown[] = [];
  const source = read("src/integrations/supabase/client.ts");
  const factory = source.slice(source.indexOf("function createSupabaseClient()"), source.indexOf("let _supabase:"));
  // No network: the fake client's fetch option is a sentinel function.
  const safeCreate = compile(factory.replaceAll("import.meta.env", "fixtureEnv"), "createSupabaseClient", {
    fixtureEnv: { VITE_SUPABASE_URL: "https://backend.invalid", VITE_SUPABASE_PUBLISHABLE_KEY: "fixture-public" },
    window: {}, process: { env: {} }, signedMediaCache: f.cache,
    createClient: () => ({ auth: { onAuthStateChange: (listener: typeof listeners[number]) => { listeners.push(listener); } } }),
    initialCallbackPresence: () => {}, createSupabaseFetch: () => () => { throw new Error("Live transport forbidden"); },
    brokeredPreviewStorage: () => ({}), Capacitor: { isNativePlatform: () => false },
    setJournalAccount: (value: unknown) => { journals.push(value); },
  });
  safeCreate();
  expect(listeners.length).toBe(1);
  listeners[0]("INITIAL_SESSION", { user: { id: "account-a" } });
  await f.cache.load(PATH, bucket);
  const generation = f.cache.getSnapshot().generation;
  listeners[0]("TOKEN_REFRESHED", { user: { id: "account-a" } });
  expect(f.cache.getSnapshot().generation).toBe(generation);
  expect(f.cache.read(PATH, bucket).url).toBe(A_URL);
  listeners[0]("SIGNED_IN", { user: { id: "account-b" } });
  expect(f.cache.read(PATH, bucket).url).toBeNull();
  await f.cache.load(PATH, bucket);
  listeners[0]("SIGNED_OUT", null);
  expect(f.cache.read(PATH, bucket).url).toBeNull();
  expect(journals).toEqual(["account-a", "account-a", "account-b", null]);
});

test("actual sign-out helper clears media only after successful signout, keeping failed cleanup explicit", async () => {
  const f = fixture();
  f.cache.setAccount("account-a");
  await f.cache.load(PATH, bucket);
  const calls: string[] = [];
  let pushFails = false, authFails = false;
  const signOut = compile(read("src/lib/sign-out.ts"), "signOutWitness", {
    signedMediaCache: f.cache,
    disablePush: async () => { calls.push("push-cleanup"); if (pushFails) throw new Error("synthetic cleanup failure"); },
    supabase: { auth: { signOut: async () => { calls.push("auth-signout"); return { error: authFails ? new Error("synthetic signout failure") : null }; } } },
    setJournalAccount: (value: unknown) => { calls.push(`journal:${value}`); },
  });
  await signOut();
  expect(calls).toEqual(["push-cleanup", "auth-signout", "journal:null"]);
  expect(f.cache.read(PATH, bucket).url).toBeNull();
  expect(f.cache.getSnapshot().account).toBeNull();
  f.cache.setAccount("account-a");
  await f.cache.load(PATH, bucket);
  pushFails = true;
  await expect(signOut()).rejects.toThrow("Could not disconnect");
  expect(f.cache.getSnapshot().account).toBe("account-a");
  pushFails = false; authFails = true;
  await expect(signOut()).rejects.toThrow("synthetic signout failure");
  expect(f.cache.getSnapshot().account).toBe("account-a");
});

test("actual testimony playback renders successful URLs, removes them on account switch, and renders retry", async () => {
  const f = fixture();
  f.cache.setAccount("account-a");
  await f.cache.load(PATH, bucket);
  const hook = hookFixture(f.cache);
  const Component = compile(read("src/components/media/TestimonyMedia.tsx"), "TestimonyMedia", {
    React, useState: (initial: unknown) => [initial, () => {}],
    useSignedUrl: () => hook.render(), MediaLoadError, Mic: () => null,
    hasOverlay: () => false, OverlayLayers: () => null,
  });
  for (const type of ["image", "audio", "video"]) {
    expect(renderToStaticMarkup(<Component path={PATH} type={type} />)).toContain(A_URL);
  }
  f.cache.setAccount("account-b");
  expect(renderToStaticMarkup(<Component path={PATH} type="video" />)).not.toContain(A_URL);
  f.cache.fail(PATH, bucket);
  const failed = renderToStaticMarkup(<Component path={PATH} type="video" />);
  expect(failed).toContain("Try again");
  expect(failed).not.toContain("<video");
  hook.dispose();
});

test("retry control suppresses parent navigation; auth and all media consumers retain shared lifecycle wiring", () => {
  let retries = 0, prevented = 0, stopped = 0;
  const panel = MediaLoadError({ retry: () => { retries++; } });
  const button = panel.props.children[1];
  button.props.onClick({ preventDefault() { prevented++; }, stopPropagation() { stopped++; } });
  expect([retries, prevented, stopped]).toEqual([1, 1, 1]);
  const client = read("src/integrations/supabase/client.ts");
  expect(client).toContain("signedMediaCache.setAccount(session?.user.id ?? null, event === 'SIGNED_OUT')");
  expect(client).toContain("setJournalAccount(session?.user.id ?? null)");
  expect(read("src/lib/sign-out.ts")).toContain("signedMediaCache.setAccount(null, true)");
  const journey = read("src/components/journey/JourneyPlayer.tsx");
  expect(journey.match(/useSignedUrl\(/g)?.length).toBe(3);
  expect(journey).not.toContain("setAskUrl");
  expect(journey).toContain("if (!askMedia.isCurrent()) return;");
  for (const path of [
    "src/components/Avatar.tsx", "src/components/media/VoicePrayer.tsx", "src/components/needs/NeedMedia.tsx",
    "src/components/profile-media/ProfileImage.tsx", "src/components/profile-media/ProfileMediaGallery.tsx",
  ]) {
    expect(read(path)).toContain("useSignedUrl(");
    expect(read(path)).toContain("onError");
  }
});
