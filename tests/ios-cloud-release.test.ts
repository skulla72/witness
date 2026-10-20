import { expect, test } from "bun:test";
import { readFileSync } from "node:fs";
import { YAML } from "bun";

const workflows = YAML.parse(readFileSync("codemagic.yaml", "utf8")).workflows;
const release = workflows["witness-ios-testflight"];
const script = readFileSync("scripts/codemagic-ios.sh", "utf8");

test("TestFlight uses the existing integration and never submits publicly or invites testers", () => {
  expect(release.integrations.app_store_connect).toBe("Witness Codemagic Edge");
  expect(release.environment.groups).toEqual(["witness_ios_signing"]);
  expect(release.publishing.app_store_connect).toEqual({
    auth: "integration",
    submit_to_testflight: false,
    submit_to_app_store: false,
  });
  expect(workflows["witness-ios"].publishing).toBeUndefined();
  expect(workflows["witness-ios-check"].publishing).toBeUndefined();
  expect(workflows["witness-android"].publishing).toBeUndefined();
});

test("read-only authorization precedes opt-in reusable signing setup", () => {
  const preflight = release.scripts[0].script;
  expect(preflight).toContain("python3 scripts/apple-release-preflight.py");
  expect(preflight).not.toMatch(/--create\b|--delete-stale-profiles\b/);
  const signing = release.scripts[1].script;
  expect(signing).toContain("fetch-signing-files com.commonlight.witness");
  expect(signing).toContain("--strict-match-identifier");
  expect(signing).toContain('1) extra=(--create)');
  expect(release.inputs.prepare_signing.default).toBe(0);
  expect(signing).not.toContain("--delete-stale-profiles");
  expect(script).not.toMatch(/--create\b|--delete-stale-profiles\b|openssl.*gen/i);
  expect(script).toContain("--type IOS_APP_STORE");
  expect(script).toContain("CURRENT_PROJECT_VERSION=$build_number");
  expect(release.environment.vars.WITNESS_IOS_BUILD_NUMBER).toMatch(/^[1-9][0-9]{0,3}$/);
});

test("production content destination and native identity are unchanged", () => {
  const config = readFileSync("capacitor.config.ts", "utf8");
  expect(config).toContain("appId: 'com.commonlight.witness'");
  expect(config).toContain("url: 'https://witnessmovement.com'");
  expect(config).toContain("cleartext: false");
});

test("Apple processing verification cannot compile, upload, invite or create resources", () => {
  const check = workflows["witness-ios-processing-check"];
  expect(check.integrations.app_store_connect).toBe("Witness Codemagic Edge");
  expect(check.publishing).toBeUndefined();
  expect(check.environment.groups).toBeUndefined();
  expect(check.scripts).toHaveLength(1);
  const processing = readFileSync("scripts/apple-processing-check.py", "utf8");
  expect(processing).toContain('"builds", "list"');
  expect(processing).toContain('"builds", "beta-details"');
  expect(processing).not.toMatch(/--create|fetch-signing-files|publish|submit-to|expire-build|keychain/);
});
