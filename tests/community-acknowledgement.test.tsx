import { expect, test } from "bun:test";
import { readFileSync } from "node:fs";
import { renderToStaticMarkup } from "react-dom/server";
import { CommunityAcknowledgement } from "../src/components/CommunityAcknowledgement";
import {
  COMMUNITY_ACKNOWLEDGEMENT_FIELD as FIELD, COMMUNITY_ACKNOWLEDGEMENT_VERSION as VERSION,
  readCommunityAcknowledgement, requireCommunityAcknowledgement, withCommunityAttempt,
} from "../src/lib/community-acknowledgement";
import {
  EligibilityController, ELIGIBILITY_FIELD, makeAttestation, readEligibility,
  assertActualAdultClient, canMountProtected, type EligibilityDependencies, type EligibilityUser,
} from "../src/lib/eligibility";
import { managedSocialSignIn } from "../src/lib/managed-social-auth";

const declaration = (id: string) => ({
  version: VERSION, account_id: id, minimum_age_confirmed: true as const,
  confirmed_at: "2026-01-01T00:00:00.000Z",
});
function fixture(metadata: Record<string, unknown> = {}) {
  let current = "account-a";
  let changed = () => {};
  const users: Record<string, EligibilityUser> = {
    "account-a": { id: "account-a", user_metadata: metadata },
    "account-b": { id: "account-b", user_metadata: {} },
  };
  const writes: Array<{ token: string; account: string }> = [];
  const deps: EligibilityDependencies = {
    session: async () => ({ user: { id: current }, access_token: current }),
    user: async token => users[token],
    update: async () => { throw new Error("Numeric age must not be written by community consent."); },
    updateCommunity: async (token, value) => {
      writes.push({ token, account: value.account_id });
      const user = users[token];
      users[token] = { ...user, user_metadata: { ...user.user_metadata, [FIELD]: value } };
      return users[token];
    },
    watch: listener => { changed = listener; return () => {}; },
  };
  const controller = new EligibilityController(deps);
  return { users, writes, deps, controller, switchTo(id: string) { current = id; changed(); } };
}

test("only a literal checked checkbox proceeds; no unchecked provider/registration call", async () => {
  let calls = 0, clears = 0;
  for (const invalid of [false, undefined, null, "true", 1, 13, 18]) {
    expect(() => requireCommunityAcknowledgement(invalid)).toThrow();
    await expect(withCommunityAttempt(invalid, () => clears++, async () => calls++)).rejects.toThrow();
    await expect(managedSocialSignIn({
      provider: "google", native: false, redirectUri: "https://example.test/login",
      communityAcknowledged: invalid, signIn: async () => { calls++; return { redirected: true }; },
    })).rejects.toThrow();
  }
  expect(calls).toBe(0);
  expect(clears).toBe(7);
  await withCommunityAttempt(true, () => clears++, async () => { calls++; });
  expect(calls).toBe(1);
});

test("13+ declaration grants community only and stores no numerical age or birthday", async () => {
  const h = fixture();
  await h.controller.refresh();
  await expect(h.controller.confirmCommunity(false, "account-a")).rejects.toThrow();
  expect(h.writes).toHaveLength(0);
  await h.controller.confirmCommunity(true, "account-a");
  const user = h.users["account-a"];
  expect(Object.keys(user.user_metadata![FIELD] as object).sort()).toEqual([
    "account_id", "confirmed_at", "minimum_age_confirmed", "version",
  ]);
  expect(user.user_metadata![ELIGIBILITY_FIELD]).toBeUndefined();
  expect(readEligibility(user)?.age_band).toBe("13+");
  expect(canMountProtected(h.controller.getSnapshot())).toBe(true);
  expect(() => assertActualAdultClient(user, user.id)).toThrow("18+");
  expect(readCommunityAcknowledgement(user)?.version).toBe(VERSION);
});

test("existing adult/minor information and birthdays are preserved, never inferred from the checkbox", async () => {
  for (const age of [13, 17, 18, 42]) {
    const original = makeAttestation("account-a", age, true, new Date("2026-01-01T00:00:00.000Z"));
    const h = fixture({ [ELIGIBILITY_FIELD]: original, date_of_birth: "1980-01-01", other: "preserve" });
    await h.controller.refresh();
    await h.controller.confirmCommunity(true, "account-a");
    const user = h.users["account-a"];
    expect(user.user_metadata![ELIGIBILITY_FIELD]).toEqual(original);
    expect(user.user_metadata!.date_of_birth).toBe("1980-01-01");
    expect(user.user_metadata!.other).toBe("preserve");
    expect(readEligibility(user)?.age_band).toBe(age >= 18 ? "18+" : "13-17");
    if (age < 18) expect(() => assertActualAdultClient(user, user.id)).toThrow();
    else expect(() => assertActualAdultClient(user, user.id)).not.toThrow();
  }
});

test("explicit under13 metadata cannot be overwritten or bypassed with a checked declaration", async () => {
  for (const metadata of [
    { [ELIGIBILITY_FIELD]: { age_band: "under13", minimum_age_confirmed: false } },
    { age: 12 }, { date_of_birth: "2020-01-01" },
  ]) {
    const h = fixture(metadata);
    await h.controller.refresh();
    await expect(h.controller.confirmCommunity(true, "account-a")).rejects.toThrow("under-13");
    expect(h.writes).toHaveLength(0);
    expect(h.users["account-a"].user_metadata).toEqual(metadata);
    expect(readEligibility({ id: "account-a", user_metadata: { ...metadata, [FIELD]: declaration("account-a") } })).toBeNull();
    expect(canMountProtected(h.controller.getSnapshot())).toBe(false);
  }
});

test("a declaration must be current-version, account-bound, boolean and date-valid; history is not upgraded", () => {
  for (const patch of [
    { account_id: "account-b" }, { version: "historical-version" },
    { minimum_age_confirmed: "true" }, { minimum_age_confirmed: false },
    { confirmed_at: "2099-01-01T00:00:00.000Z" }, { confirmed_at: "2026-01-01" },
  ]) {
    const user = { id: "account-a", user_metadata: { [FIELD]: { ...declaration("account-a"), ...patch } } };
    expect(readCommunityAcknowledgement(user)).toBeNull();
    expect(readEligibility(user)).toBeNull();
  }
  const historical = fixture({ terms_version: "2026-09-18", terms_accepted_at: "2026-01-01" });
  expect(readCommunityAcknowledgement(historical.users["account-a"])).toBeNull();
  expect(historical.writes).toHaveLength(0);
});

test("stale displayed-account checkbox and unresolved states cannot save", async () => {
  const h = fixture();
  await expect(h.controller.confirmCommunity(true, "account-a")).rejects.toThrow();
  await h.controller.refresh();
  h.switchTo("account-b");
  await h.controller.refresh();
  await expect(h.controller.confirmCommunity(true, "account-a")).rejects.toThrow("Account changed");
  expect(h.writes).toHaveLength(0);
});

test("switch during a late write never acknowledges the new account or opens its protected content", async () => {
  const h = fixture();
  const stop = h.controller.start();
  await h.controller.refresh();
  let release!: () => void;
  const wait = new Promise<void>(resolve => { release = resolve; });
  let entered!: () => void;
  const ready = new Promise<void>(resolve => { entered = resolve; });
  const update = h.deps.updateCommunity!;
  h.deps.updateCommunity = async (token, value) => { entered(); await wait; return update(token, value); };
  const pending = h.controller.confirmCommunity(true, "account-a");
  await ready;
  h.switchTo("account-b");
  await h.controller.refresh();
  release();
  await expect(pending).rejects.toThrow("Account changed");
  expect(h.writes).toEqual([{ token: "account-a", account: "account-a" }]);
  expect(h.users["account-b"].user_metadata![FIELD]).toBeUndefined();
  expect(canMountProtected(h.controller.getSnapshot())).toBe(false);
  stop();
});

test("failed/cancelled provider attempts clear the draft before and after; native handoff remains refused", async () => {
  let checked = true, cleared = 0;
  await expect(withCommunityAttempt(checked, () => { checked = false; cleared++; }, async () => {
    expect(checked).toBe(false);
    throw new Error("Provider cancelled");
  })).rejects.toThrow("cancelled");
  expect(checked).toBe(false);
  expect(cleared).toBe(2);
  let initiated = false;
  await expect(managedSocialSignIn({
    provider: "apple", native: true, communityAcknowledged: true,
    redirectUri: "https://example.test/login",
    signIn: async () => { initiated = true; return { redirected: true }; },
  })).rejects.toThrow("no documented handoff");
  expect(initiated).toBe(false);
});

test("compact acknowledgement has one unchecked normal checkbox, exact label, policy links and draft notice", () => {
  const html = renderToStaticMarkup(<CommunityAcknowledgement id="synthetic-ack" checked={false} onChange={() => {}} />);
  expect(html.match(/type="checkbox"/g)).toHaveLength(1);
  expect(html).not.toMatch(/checked=""|type="number"|type="date"/);
  expect(html).toContain('for="synthetic-ack"');
  expect(html).toContain('id="synthetic-ack"');
  expect(html).toContain('href="/terms"');
  expect(html).toContain('href="/privacy"');
  expect(html.replace(/<[^>]+>/g, "")).toContain("I confirm I am at least 13 years old, understand Witness’s age requirements, agree to the Terms of Use, and acknowledge the Privacy Notice.");
  expect(html).toContain("unfinished drafts");
  expect(html).toContain("focus-visible");
  expect(html).toContain("min-h-11");
  const login = readFileSync("src/routes/login.tsx", "utf8");
  const account = readFileSync("src/components/LaunchEligibilityBoundary.tsx", "utf8");
  const before = readFileSync("src/components/CovenantGate.tsx", "utf8");
  for (const source of [login, account, before]) {
    expect(source).toContain("<CommunityAcknowledgement");
    expect(source).not.toContain('type="number"');
  }
  expect(login).toContain("<EntryBrand");
  expect(account).toContain("<EntryBrand");
  expect(before).not.toContain("COVENANT_TERMS");
  expect(account).toContain("confirmedFor === state.user");
  expect(readFileSync("src/components/AdultCareAge.tsx", "utf8")).toContain("min={18}");
  expect(readFileSync("src/components/therapy/AgreementGate.tsx", "utf8")).toContain("Type your full name to sign");
});
