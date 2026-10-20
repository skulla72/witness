import { test, expect } from "bun:test";
import { readFileSync } from "node:fs";
import {
  requireAge, withRegistrationAge, withAdultCareAge, isAdultCareAge,
  assertCounselorLaunchSpecialties, TEEN_CARE_NOTICE,
} from "../src/lib/launch-policy";
import { managedSocialSignIn } from "../src/lib/managed-social-auth";

test("minimum-age boundaries use whole years without DOB or calendar ambiguity", () => {
  for (const age of [0, 12, "12"]) expect(() => requireAge(age)).toThrow("at least 13");
  for (const age of [13, "13", 17, 18, 120]) expect(requireAge(age)).toBe(Number(age));
  for (const age of [undefined, null, "", " ", "13.5", 13.5, -1, "013", "1e2", "Infinity", Infinity, NaN, 121, true, {}, "2000-01-01"]) {
    expect(() => requireAge(age)).toThrow();
  }
});

test("email registration action cannot run without minimum age; does not persist exact age", async () => {
  let calls = 0;
  for (const age of [undefined, "", 12, "12", "13.1"]) {
    await expect(withRegistrationAge(age, async () => ++calls)).rejects.toThrow();
  }
  expect(calls).toBe(0);
  expect(await withRegistrationAge(13, async () => ++calls)).toBe(1);
  const login = readFileSync("src/routes/login.tsx", "utf8");
  expect(login).toContain("withCommunityAttempt(accepted, () => setAccepted(false), () => supabase.auth.signUp");
  expect(login).not.toContain("date_of_birth:");
  expect(login).toContain("minimum_age_confirmed: true");
  // Existing password sign-in is not account creation and remains independent.
  expect(login).toContain('supabase.auth.signInWithPassword({ email, password })');
  expect(login).toContain('if (data.session) void navigate({ to: destination })');
});

test("both social providers require age even with no signup mode; cannot invoke SDK first", async () => {
  let calls = 0;
  for (const provider of ["google", "apple"] as const) {
    for (const age of [undefined, "", 12, "invalid"]) {
      await expect(managedSocialSignIn({
        provider, age, native: false, redirectUri: "https://witnessmovement.com/login",
        signIn: async () => { calls++; return { redirected: true }; },
      })).rejects.toThrow();
    }
    expect(calls).toBe(0);
    expect((await managedSocialSignIn({
      provider, age: 13, native: false, redirectUri: "https://witnessmovement.com/login",
      signIn: async () => ({ redirected: true }),
    })).redirected).toBe(true);
  }
});

test("adult counseling refuses absent/malformed/teen ages before action; 18 passes", async () => {
  let writes = 0;
  for (const age of [undefined, "", 12, 13, 17, "17", "18.1", true]) {
    expect(isAdultCareAge(age)).toBe(false);
    await expect(withAdultCareAge(age, async () => ++writes)).rejects.toThrow();
  }
  expect(writes).toBe(0);
  expect(isAdultCareAge(18)).toBe(true);
  expect(await withAdultCareAge("18", async () => ++writes)).toBe(1);
});

test("actual owned counselor/therapy handlers reject direct calls before any remote action", async () => {
  // No mock user/account and no network call: all handlers must reject before
  // touching the lazy Supabase client, agreement lookup or messaging.
  const { requestSession, saveCounselorPage } = await import("../src/lib/counselors");
  const { bookSlot, signAgreement, startSession } = await import("../src/lib/therapy");
  for (const age of [undefined, "", 13, 17]) {
    const expected = age === 13 || age === 17 ? TEEN_CARE_NOTICE : "Enter your current age in whole years.";
    await expect(requestSession("synthetic", "synthetic", "", false, age)).rejects.toThrow(expected);
    await expect(bookSlot("synthetic", {} as never, "", age)).rejects.toThrow(expected);
    await expect(signAgreement("synthetic", "client", "Synthetic", age)).rejects.toThrow(expected);
    await expect(startSession({ client_id: "synthetic" } as never, "synthetic", age)).rejects.toThrow(expected);
  }
  await expect(saveCounselorPage("synthetic", { specialties: ["Teens"] } as never)).rejects.toThrow("deferred");
});

test("new teen offerings refused while legacy specialties remain untouched", () => {
  expect(() => assertCounselorLaunchSpecialties(["Teens"])).toThrow("deferred");
  const legacy = ["Teens", "Anxiety"];
  expect(() => assertCounselorLaunchSpecialties(legacy, legacy)).not.toThrow();
  expect(legacy).toEqual(["Teens", "Anxiety"]);
});

test("all local counseling entry points keep notices, crisis access and disabled controls", () => {
  for (const route of ["src/routes/therapy.tsx", "src/routes/counselors.tsx"]) {
    expect(readFileSync(route, "utf8")).toContain("<CareLaunchNotice />");
  }
  expect(readFileSync("src/components/CareLaunchNotice.tsx", "utf8")).toContain('to="/crisis"');
  for (const route of ["src/routes/therapy.index.tsx", "src/routes/therapy.$id.tsx", "src/routes/counselor.$slug.tsx"]) {
    expect(readFileSync(route, "utf8")).toContain("isAdultCareAge(careAge)");
    expect(readFileSync(route, "utf8")).toContain("<AdultCareAge");
  }
  expect(readFileSync("src/lib/counselors.ts", "utf8").split("] as const;")[0]).not.toContain('"Teens",');
  const allLogin = readFileSync("src/routes/login.tsx", "utf8");
  // Checking "Sign in" vs "Create account" cannot remove the social age gate.
  const social = allLogin.slice(allLogin.indexOf("const handleOAuth"), allLogin.indexOf("  return (", allLogin.indexOf("const handleOAuth")));
  expect(social.indexOf("requireAge(age)")).toBeLessThan(social.indexOf('if (mode === "signup")'));
});
