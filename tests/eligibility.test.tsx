import { test, expect } from "bun:test";
import { renderToString } from "react-dom/server";
import { readFileSync } from "node:fs";
import {
  ELIGIBILITY_FIELD, EligibilityController, makeAttestation, readEligibility,
  assertActualAdultClient, authorizeCareAcceptance, authorizeCareSession,
  PUBLIC_ELIGIBILITY_PATHS, type EligibilityUser, type EligibilityDependencies, type EligibilityState,
} from "../src/lib/eligibility";
import { EligibilityMount } from "../src/components/LaunchEligibilityBoundary";
import { withProviderAgeAttempt } from "../src/lib/launch-policy";

function user(id = "account-a", age = 18): EligibilityUser {
  return { id, user_metadata: { [ELIGIBILITY_FIELD]: makeAttestation(id, age, true, new Date("2026-01-01T00:00:00.000Z")) } };
}
function deferred<T>() {
  let resolve!: (value: T) => void;
  const promise = new Promise<T>(r => { resolve = r; });
  return { promise, resolve };
}
function harness(initial: EligibilityUser = { id: "account-a", user_metadata: {} }) {
  let current = initial;
  let changed = () => {};
  const writes: Array<{ token: string; account: string }> = [];
  const deps: EligibilityDependencies = {
    session: async () => ({ user: { id: current.id }, access_token: `synthetic-${current.id}` }),
    user: async token => token === `synthetic-${current.id}` ? current : user(token.replace("synthetic-", "")),
    update: async (token, attestation) => {
      writes.push({ token, account: attestation.account_id });
      const result = { id: attestation.account_id, user_metadata: { [ELIGIBILITY_FIELD]: attestation } };
      if (current.id === result.id) current = result;
      return result;
    },
    watch: listener => { changed = listener; return () => {}; },
  };
  return { deps, writes, switchTo(next: EligibilityUser) { current = next; changed(); } };
}

test("unknown existing accounts, old timestamps and legacy flags never exempt confirmation", async () => {
  const old = { id: "old-account", created_at: "2018-01-01", user_metadata: { minimum_age_confirmed: true, age_confirmed_at: "2018-01-01" } };
  expect(readEligibility(old)).toBeNull();
  const h = harness(old);
  const controller = new EligibilityController(h.deps);
  await controller.refresh();
  expect(controller.getSnapshot().status).toBe("needs-confirmation");
  expect(h.writes).toHaveLength(0);
});

test("strict confirmation rejects wrong-account, malformed flags/dates and unsupported bands", () => {
  const base = makeAttestation("account-a", 18, true, new Date("2026-01-01T00:00:00.000Z"));
  for (const patch of [
    { account_id: "account-b" }, { version: "1" }, { version: 0 },
    { minimum_age_confirmed: "true" }, { minimum_age_confirmed: 1 }, { minimum_age_confirmed: false },
    { minimum_age_confirmed: undefined }, { age_band: "12" }, { age_band: "unknown" },
    { confirmed_at: "" }, { confirmed_at: "not-a-date" }, { confirmed_at: "2099-01-01T00:00:00.000Z" },
    { confirmed_at: "2026-01-01" },
  ]) {
    expect(readEligibility({ id: "account-a", user_metadata: { [ELIGIBILITY_FIELD]: { ...base, ...patch } } })).toBeNull();
  }
  expect(readEligibility(user("account-a", 13))?.age_band).toBe("13-17");
  expect(readEligibility(user("account-a", 18))?.age_band).toBe("18+");
  expect(readEligibility({ id: "", user_metadata: { [ELIGIBILITY_FIELD]: { ...base, account_id: "" } } })).toBeNull();
});

test("protected children do not execute/render while loading, unresolved, invalid, or signed out", () => {
  let mounts = 0;
  const Protected = () => { mounts++; return <p>private component/data effect source</p>; };
  const states: EligibilityState[] = [
    { status: "loading", user: null }, { status: "needs-confirmation", user: { id: "old" } },
    { status: "error", user: null }, { status: "signed-out", user: null },
    { status: "eligible", user: { id: "invalid" } },
  ];
  for (const state of states) {
    const html = renderToString(<EligibilityMount state={state} fallback={<p>closed</p>}><Protected /></EligibilityMount>);
    expect(html).toContain("closed");
    expect(html).not.toContain("private component");
  }
  expect(mounts).toBe(0);
  expect(renderToString(<EligibilityMount state={{ status: "eligible", user: user() }} fallback={null}><Protected /></EligibilityMount>)).toContain("private component");
  expect(mounts).toBe(1);
  const root = readFileSync("src/routes/__root.tsx", "utf8");
  expect(root).toContain("<LaunchEligibilityBoundary");
  expect(root).toContain("publicContent={<Outlet />}");
});

test("late resolution cannot admit the previous account after a switch", async () => {
  const h = harness(user("account-a"));
  const wait = deferred<EligibilityUser>();
  let first = true;
  h.deps.user = async () => { if (first) { first = false; return wait.promise; } return { id: "account-b" }; };
  const controller = new EligibilityController(h.deps);
  const stop = controller.start();
  await Promise.resolve(); await Promise.resolve();
  h.switchTo({ id: "account-b" });
  expect(controller.getSnapshot().status).toBe("loading");
  wait.resolve(user("account-a"));
  await new Promise(resolve => setTimeout(resolve, 0));
  expect(controller.getSnapshot().user?.id).toBe("account-b");
  expect(controller.getSnapshot().status).toBe("needs-confirmation");
  stop();
});

test("confirmation requires an explicit valid age and saves only the actual account, not DOB", async () => {
  const h = harness();
  const controller = new EligibilityController(h.deps);
  await controller.refresh();
  for (const [age, consent] of [[12, true], [18, false], [18, "true"], ["", true]]) {
    await expect(controller.confirm(age, consent, "account-a")).rejects.toThrow();
  }
  expect(h.writes).toHaveLength(0);
  await controller.confirm(13, true, "account-a");
  expect(h.writes).toEqual([{ token: "synthetic-account-a", account: "account-a" }]);
  expect(controller.getSnapshot().status).toBe("eligible");
  expect(readEligibility(controller.getSnapshot().user!)?.age_band).toBe("13-17");
  expect(JSON.stringify(controller.getSnapshot().user)).not.toContain("date_of_birth");
});

test("account switch before a pending save cannot write confirmation to another account", async () => {
  const h = harness();
  const controller = new EligibilityController(h.deps);
  await controller.refresh();
  const wait = deferred<EligibilityUser>();
  h.deps.user = () => wait.promise;
  const attempt = controller.confirm(18, true, "account-a");
  await Promise.resolve();
  h.switchTo({ id: "account-b" });
  wait.resolve({ id: "account-b" });
  await expect(attempt).rejects.toThrow("Account changed");
  expect(h.writes).toHaveLength(0);
});

test("an in-flight save uses the captured account token and never confirms a switched account", async () => {
  const h = harness();
  const controller = new EligibilityController(h.deps);
  const stop = controller.start();
  await controller.refresh();
  const wait = deferred<EligibilityUser>();
  h.deps.update = async (token, value) => {
    h.writes.push({ token, account: value.account_id });
    return wait.promise;
  };
  const attempt = controller.confirm(18, true, "account-a");
  await Promise.resolve(); await Promise.resolve(); await Promise.resolve();
  h.switchTo({ id: "account-b" });
  wait.resolve(user("account-a"));
  await expect(attempt).rejects.toThrow("Account changed");
  expect(h.writes.every(write => write.account === "account-a" && write.token === "synthetic-account-a")).toBe(true);
  expect(controller.getSnapshot().user?.id).not.toBe("account-a");
  stop();
});

test("failed save or malformed saved confirmation cannot open protected content", async () => {
  for (const outcome of ["network", "invalid"] as const) {
    const h = harness(); const controller = new EligibilityController(h.deps);
    await controller.refresh();
    h.deps.update = async () => {
      if (outcome === "network") throw new Error("Synthetic save failure");
      return { id: "account-a", user_metadata: { minimum_age_confirmed: true } };
    };
    await expect(controller.confirm(18, true, "account-a")).rejects.toThrow();
    expect(controller.getSnapshot().status).toBe("needs-confirmation");
  }
});

test("failed and cancelled provider attempts clear transient age without persisting account confirmation", async () => {
  for (const cancelled of [true, false]) {
    let field = "18"; let clears = 0;
    const clear = () => { field = ""; clears++; };
    const result = withProviderAgeAttempt(field, clear, async age => {
      expect(field).toBe(""); expect(age).toBe(18);
      if (cancelled) return { error: "cancelled" };
      throw new Error("Synthetic provider failure");
    });
    if (cancelled) expect(await result).toEqual({ error: "cancelled" });
    else await expect(result).rejects.toThrow("provider failure");
    expect(field).toBe(""); expect(clears).toBe(2);
  }
  const source = readFileSync("src/routes/login.tsx", "utf8");
  expect(source).toContain("withCommunityAttempt(attemptedAcknowledgement");
  expect(source).not.toContain("updateUser(");
});

test("a stale rendered form cannot confirm a different already-resolved account", async () => {
  const h = harness();
  const controller = new EligibilityController(h.deps);
  await controller.refresh(); // The form was displayed for account-a.
  h.switchTo({ id: "account-b" });
  await controller.refresh();
  await expect(controller.confirm(18, true, "account-a")).rejects.toThrow("Account changed");
  await expect(controller.confirm(18, true, "" as never)).rejects.toThrow();
  expect(h.writes).toHaveLength(0);
  expect(controller.getSnapshot().status).toBe("needs-confirmation");
});

test("adult checks use the actual client/account band, never a clinician's or supplied age alone", () => {
  expect(() => assertActualAdultClient(user("client", 18), "client")).not.toThrow();
  for (const age of [13, 17]) expect(() => assertActualAdultClient(user("client", age), "client")).toThrow("18+");
  expect(() => assertActualAdultClient({ id: "client" }, "client")).toThrow("18+");
  expect(() => assertActualAdultClient(user("therapist"), "client")).toThrow("Cannot establish");
});

test("alternate counselor acceptance resolves canonical requester and refuses unknown other clients before write", async () => {
  let writes = 0; let readId = "";
  const accept = async (actor: EligibilityUser) => {
    await authorizeCareAcceptance(actor, "request", async id => { readId = id; return { id, requester_id: "client", counselor_id: "counselor" }; }, async () => "therapist");
    writes++;
  };
  await expect(accept(user("therapist", 18))).rejects.toThrow("Cannot establish");
  expect(readId).toBe("request"); expect(writes).toBe(0);
  await expect(accept(user("outsider", 18))).rejects.toThrow("not yours");
  await expect(authorizeCareAcceptance(user("therapist"), "request", async () => null, async () => "therapist")).rejects.toThrow("actual client");
});

test("therapist initiation cannot inherit adult status and canonical client initiation still works", async () => {
  const load = async (id: string) => ({ id, client_id: "client", therapist_id: "therapist" });
  await expect(authorizeCareSession(user("therapist"), "session", load)).rejects.toThrow("Cannot establish");
  await expect(authorizeCareSession(user("client", 17), "session", load)).rejects.toThrow("18+");
  await expect(authorizeCareSession(user("outsider"), "session", load)).rejects.toThrow("not yours");
  expect((await authorizeCareSession(user("client", 18), "session", load)).client_id).toBe("client");
  const therapy = readFileSync("src/lib/therapy.ts", "utf8");
  expect(therapy).toContain("authorizeCareSession(actor, session.id");
  expect(therapy).toContain("await requireAdultClient(userId)");
  const counselor = readFileSync("src/lib/counselors.ts", "utf8");
  expect(counselor.indexOf("await authorizeCareAcceptance")).toBeLessThan(counselor.indexOf('.update({ status, updated_at'));
});

test("session-status helper cannot be used as an alternate start or booking entry", async () => {
  const { setSessionStatus } = await import("../src/lib/therapy");
  for (const status of ["in_progress", "booked", "accepted", "", undefined]) {
    await expect(setSessionStatus("synthetic", status as never)).rejects.toThrow("guarded session-start");
  }
});

test("public help remains reachable and legacy birthday disclosure is not a removal feature", () => {
  for (const path of ["/crisis", "/privacy", "/terms", "/contact", "/account-deletion", "/login"]) expect(PUBLIC_ELIGIBILITY_PATHS.has(path)).toBe(true);
  expect(readFileSync("src/routes/privacy.tsx", "utf8")).toContain("Existing account records may include birth dates");
  expect(readFileSync("src/components/AccountPanel.tsx", "utf8")).not.toContain("date_of_birth");
  const adapter = readFileSync("src/lib/eligibility-client.ts", "utf8");
  expect(adapter).toContain("Authorization: `Bearer ${token}`");
  expect(adapter).not.toContain("service_role");
});
