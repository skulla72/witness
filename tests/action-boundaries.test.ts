import { expect, test } from "bun:test";
import { readFileSync } from "node:fs";
import { authorizeRoom, authorizePurchase, ELIGIBILITY_RETRY, professionalPurchaseKind, isControlPath } from "../src/lib/action-eligibility";
import { makeAttestation, ELIGIBILITY_FIELD, type EligibilityUser } from "../src/lib/eligibility";
import { stopOwnSession, assertSubscriptionOwner, subscriptionKind, performOwnRecurringStop, StopRecordUpdateError } from "../src/lib/own-controls";
import { hasPrivilegedReaderShape } from "../src/lib/reader-capability.server";

const adult = (id = "client", age = 18): EligibilityUser => ({
  id, user_metadata: { [ELIGIBILITY_FIELD]: makeAttestation(id, age, true, new Date("2026-01-01T00:00:00.000Z")) },
});
const care = async () => [{ client_id: "client", therapist_id: "therapist" }];

test("existing care rooms check the actual client even when the actor is already a member", async () => {
  await expect(authorizeRoom(adult("client", 17), "room", async () => true, care)).rejects.toThrow("18+");
  await expect(authorizeRoom({ id: "client" }, "room", async () => true, care)).rejects.toThrow("13+");
  await expect(authorizeRoom(adult("therapist"), "room", async () => true, care)).rejects.toThrow("Cannot establish");
  await expect(authorizeRoom(adult("assigned-person"), "room", async () => true, care)).rejects.toThrow("membership alone");
  expect(await authorizeRoom(adult("client"), "room", async () => true, care)).toEqual({ allowed: true, kind: "care" });
});

test("peer/community rooms preserve ordinary 13+ access, without requiring adult self-attestation", async () => {
  for (const age of [13, 17, 18]) expect(await authorizeRoom(adult("member", age), "peer", async () => true, async () => []))
    .toEqual({ allowed: true, kind: "peer" });
  await expect(authorizeRoom(adult(), "peer", async () => false, async () => [])).rejects.toThrow("not authorized");
});

test("classification errors never turn hidden/unreadable care records into peer permission", async () => {
  let joined = 0;
  const join = async () => {
    await authorizeRoom(adult(), "room", async () => true, async () => { throw new Error("Synthetic unavailable authoritative reader"); });
    joined++;
  };
  await expect(join()).rejects.toThrow("classification is unavailable");
  expect(joined).toBe(0);
  const server = readFileSync("src/lib/call-admission.functions.ts", "utf8");
  expect(server).toContain("supabaseAdmin.from(\"therapy_sessions\")");
  expect(server).toContain("requireExistingPrivilegedReader()");
  expect(server).toContain('call?.conversation_id !== data.conversationId');
  const route = readFileSync("src/routes/call.$id.tsx", "utf8");
  expect(route.indexOf("admitCall({")).toBeLessThan(route.indexOf("function AdmittedCallScreen"));
  expect(route.indexOf("getUserMedia")).toBeGreaterThan(route.indexOf("function AdmittedCallScreen"));
  expect(route).toContain("admission?.key !== key");
});

test("a public/user key cannot certify an RLS-filtered empty result as peer", () => {
  const synthetic = (role: string) => `synthetic.${Buffer.from(JSON.stringify({ role })).toString("base64url")}.synthetic`;
  for (const value of [undefined, "", "sb_publishable_synthetic", synthetic("anon"), synthetic("authenticated"), "malformed"]) {
    expect(hasPrivilegedReaderShape(value)).toBe(false);
  }
  // Shape checks only: deliberately fake values, not real connection tests.
  expect(hasPrivilegedReaderShape(synthetic("service_role"))).toBe(true);
  expect(hasPrivilegedReaderShape("sb_secret_synthetic")).toBe(true);
});

test("care classification cannot use one adult session to excuse another underage/unknown client", async () => {
  await expect(authorizeRoom(adult("client"), "room", async () => true, async () => [
    { client_id: "client", therapist_id: "therapist" },
    { client_id: "other-client", therapist_id: "client" },
  ])).rejects.toThrow("Cannot establish");
});

test("all server purchases reject a failed fresh-user lookup before creating anything", async () => {
  let purchases = 0;
  const create = async () => {
    await authorizePurchase(async () => { throw new Error("Synthetic lookup outage"); });
    purchases++;
  };
  await expect(create()).rejects.toThrow(ELIGIBILITY_RETRY);
  expect(purchases).toBe(0);
  await expect(authorizePurchase(async () => adult("wrong"), "expected")).rejects.toThrow(ELIGIBILITY_RETRY);
  await expect(authorizePurchase(async () => ({ id: "unknown" }))).rejects.toThrow("Confirm 13+");
});

test("checkout uses 13+ for community and 18+ for counseling, not a client-supplied age/category", async () => {
  expect((await authorizePurchase(async () => adult("buyer", 13), "buyer", "community")).id).toBe("buyer");
  await expect(authorizePurchase(async () => adult("buyer", 17), "buyer", "counseling")).rejects.toThrow("18+");
  expect((await authorizePurchase(async () => adult("buyer"), "buyer", "counseling")).id).toBe("buyer");
  expect(professionalPurchaseKind("Counseling")).toBe("counseling");
  expect(professionalPurchaseKind("Therapy")).toBe("counseling");
  expect(professionalPurchaseKind("Plumbing")).toBe("community");
  expect(() => professionalPurchaseKind("")).toThrow("unresolved");
});

test("every existing checkout and saved-method charge is guarded before provider/pending-record work", () => {
  for (const name of ["store", "donate", "fund", "light", "jobfund", "proplan", "orgplan", "wallet"]) {
    const source = readFileSync(`src/lib/${name}.functions.ts`, "utf8");
    const boundary = source.indexOf("await checkoutAccount(");
    expect(boundary).toBeGreaterThan(0);
    const provider = Math.max(source.indexOf("stripe.checkout.sessions.create"), source.indexOf("stripe.paymentIntents.create"));
    expect(boundary).toBeLessThan(provider);
  }
  const pro = readFileSync("src/lib/proplan.functions.ts", "utf8");
  expect(pro).toContain("professionalPurchaseKind(pro.trade)");
  const helper = readFileSync("src/lib/checkout-eligibility.server.ts", "utf8");
  expect(helper).toContain("auth.getUser(header.slice(7))");
  expect(helper).not.toContain("getClaims");
});

test("own session cancellation is age-independent for unresolved, failed and under13 states", async () => {
  for (const metadata of [
    undefined, {}, { minimum_age_confirmed: false }, { age: 12 },
    { [ELIGIBILITY_FIELD]: { minimum_age_confirmed: false, age_band: "under13" } },
  ]) {
    const actor = { id: "client", user_metadata: metadata };
    let stops = 0;
    await stopOwnSession(actor.id, "session", async () => ({ id: "session", client_id: "client", therapist_id: "therapist", status: "booked" }), async () => { stops++; });
    expect(stops).toBe(1);
  }
  let stops = 0;
  await expect(stopOwnSession("stranger", "session", async () => ({ id: "session", client_id: "client", therapist_id: "therapist", status: "booked" }), async () => { stops++; })).rejects.toThrow("owner");
  await expect(stopOwnSession("", "session", async () => ({ id: "session", client_id: "client", therapist_id: "therapist", status: "booked" }), async () => { stops++; })).rejects.toThrow();
  expect(stops).toBe(0);
});

test("cancellation failures and closed records never report or perform an unverified stop", async () => {
  let stops = 0;
  await expect(stopOwnSession("client", "s", async () => null, async () => { stops++; })).rejects.toThrow("verified");
  await expect(stopOwnSession("client", "s", async () => { throw new Error("Synthetic lookup failure"); }, async () => { stops++; })).rejects.toThrow();
  await expect(stopOwnSession("client", "s", async () => ({ id: "s", client_id: "client", therapist_id: "t", status: "completed" }), async () => { stops++; })).rejects.toThrow("not open");
  expect(stops).toBe(0);
});

test("subscription controls retain ownership/manager checks, regardless of minimum-age status", () => {
  expect(() => assertSubscriptionOwner("owner", { user_id: "owner" })).not.toThrow();
  expect(() => assertSubscriptionOwner("wrong", { user_id: "owner" })).toThrow("owner");
  expect(() => assertSubscriptionOwner("", { user_id: "" })).toThrow();
  expect(() => assertSubscriptionOwner("leader", { org_id: "org" }, ["leader"])).not.toThrow();
  expect(() => assertSubscriptionOwner("member", { org_id: "org" }, ["leader"])).toThrow();
  expect(() => subscriptionKind("__proto__")).toThrow();
  expect(() => subscriptionKind("checkout")).toThrow();
});

test("only the isolated controls route bypasses age; its server actions cannot start purchases", () => {
  for (const state of ["loading", "error", "needs-confirmation", "under13", "eligible"]) {
    expect(isControlPath("/account-controls")).toBe(true);
    expect(isControlPath("/account-controls/new-purchase")).toBe(false);
  }
  const boundary = readFileSync("src/components/LaunchEligibilityBoundary.tsx", "utf8");
  expect(boundary.indexOf("isControlPath(pathname)")).toBeLessThan(boundary.indexOf("return <EligibilityMount"));
  const server = readFileSync("src/lib/own-controls.functions.ts", "utf8");
  expect(server).toContain(".middleware([requireSupabaseAuth])");
  expect(server).toContain("performOwnRecurringStop(userId, row, managers");
  expect(server).toContain("createStripeClient(canonical.environment)");
  expect(server).toContain("cancel_at_period_end: true");
  expect(server).not.toMatch(/checkout\.sessions\.create|paymentIntents\.create|requireAdult|checkoutAccount|readEligibility/);
  expect(server).toContain("!saved.error && !!saved.data");
  expect(server).toContain("data.accountId !== userId");
  const page = readFileSync("src/routes/account-controls.tsx", "utf8");
  expect(page).toContain("key={userId}");
  expect(page).toContain("stopOwnItem");
});

test("own recurrence can stop despite a failed eligibility lookup or missing/under13 confirmation", async () => {
  for (const actor of [{ id: "owner" }, { id: "owner", user_metadata: { age: 12 } }, { id: "owner", user_metadata: { minimum_age_confirmed: false } }]) {
    await expect(authorizePurchase(async () => { throw new Error("Synthetic age lookup failure"); }, actor.id)).rejects.toThrow(ELIGIBILITY_RETRY);
    const steps: string[] = [];
    await performOwnRecurringStop(actor.id, { id: "row", user_id: "owner", status: "paid", environment: "sandbox", stripe_subscription_id: "sub_synthetic" }, [], async canonical => {
      expect(canonical.environment).toBe("sandbox");
      expect(canonical.stripe_subscription_id).toBe("sub_synthetic");
      steps.push("prepare");
      return { stop: async () => { steps.push("stop"); }, save: async () => { steps.push("save"); return true; } };
    });
    expect(steps).toEqual(["prepare", "stop", "save"]);
  }
});

test("foreign subscription owners and invalid saved environments cannot reach provider preparation", async () => {
  let preparations = 0;
  const prepare = async () => { preparations++; return { stop: async () => {}, save: async () => true }; };
  const row = { id: "row", user_id: "owner", status: "paid", environment: "sandbox", stripe_subscription_id: "sub_synthetic" };
  await expect(performOwnRecurringStop("stranger", row, [], prepare)).rejects.toThrow("owner");
  await expect(performOwnRecurringStop("owner", { ...row, environment: "unknown" }, [], prepare)).rejects.toThrow("environment");
  expect(preparations).toBe(0);
});

test("failed dependency preparation cannot stop a subscription; provider failure cannot mark records stopped", async () => {
  const row = { id: "row", user_id: "owner", status: "paid", environment: "sandbox", stripe_subscription_id: "sub_synthetic" };
  let saves = 0;
  await expect(performOwnRecurringStop("owner", row, [], async () => { throw new Error("Synthetic unavailable existing backend"); })).rejects.toThrow("backend");
  await expect(performOwnRecurringStop("owner", row, [], async () => ({
    stop: async () => { throw new Error("Synthetic provider failure"); },
    save: async () => { saves++; return true; },
  }))).rejects.toThrow("provider");
  expect(saves).toBe(0);
});

test("provider stop plus record-write failure is reported as partial, not success", async () => {
  let providerStops = 0;
  await expect(performOwnRecurringStop("owner", { id: "row", user_id: "owner", status: "paid", environment: "sandbox", stripe_subscription_id: "sub_synthetic" }, [], async () => ({
    stop: async () => { providerStops++; }, save: async () => false,
  }))).rejects.toBeInstanceOf(StopRecordUpdateError);
  expect(providerStops).toBe(1);
});

test("launch draft copy removes private-beta and unsupported erasure guarantees", () => {
  const login = readFileSync("src/routes/login.tsx", "utf8");
  expect(login).not.toContain("Private Beta Sign In");
  expect(login).not.toContain("Sign in to the private");
  const covenant = readFileSync("src/lib/covenant.ts", "utf8");
  expect(covenant).not.toContain("Keep the unreleased");
  expect(covenant).toContain("Unfinished Draft");
  const terms = readFileSync("src/routes/terms.tsx", "utf8");
  expect(terms).not.toContain("Keep the beta confidential");
  const panel = readFileSync("src/components/AccountPanel.tsx", "utf8");
  expect(panel).not.toContain("for good");
  expect(panel).not.toContain("stripped of contact details");
  expect(panel).toContain("have");
  expect(readFileSync("src/routes/privacy.tsx", "utf8")).not.toContain("an export or full deletion");
});
