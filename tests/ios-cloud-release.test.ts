import { expect, test } from "bun:test";
import { readFileSync } from "node:fs";
import { YAML } from "bun";

const workflows = YAML.parse(readFileSync("codemagic.yaml", "utf8")).workflows;
const release = workflows["witness-ios-testflight"];
const script = readFileSync("scripts/codemagic-ios.sh", "utf8");

test("TestFlight uses the existing integration and never submits publicly or invites testers", () => {
  expect(release.integrations.app_store_connect).toBe("Codemagic API Key");
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

test("authorization preflight precedes installation and does not create credentials", () => {
  const preflight = release.scripts[0].script;
  expect(preflight).toContain("fetch-signing-files com.commonlight.witness");
  expect(preflight).toContain("--strict-match-identifier");
  expect(preflight).not.toMatch(/--create\b|--delete-stale-profiles\b/);
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
