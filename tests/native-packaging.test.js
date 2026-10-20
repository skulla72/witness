import { describe, expect, test } from "bun:test";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import xcode from "xcode";
import plist from "plist";
import config from "../capacitor.config";

const read = path => readFileSync(new URL(`../${path}`, import.meta.url), "utf8");
const html = read("mobile/webroot/index.html");
const project = xcode.project(fileURLToPath(new URL("../ios/App/App.xcodeproj/project.pbxproj", import.meta.url)));
project.parseSync();
const configurations = Object.values(project.pbxXCBuildConfigurationSection())
  .filter(value => typeof value === "object" && value.buildSettings?.PRODUCT_BUNDLE_IDENTIFIER === "com.commonlight.witness");

describe("native connection failure packaging", () => {
  test("uses Capacitor's local error-page hook without changing destination/security", () => {
    expect(config.server.errorPath).toBe("index.html");
    expect(config.webDir).toBe("mobile/webroot");
    expect(config.server.url).toBe("https://witnessmovement.com");
    expect(config.server.cleartext).toBe(false);
    expect(config.android.allowMixedContent).toBe(false);
    expect(config.appId).toBe("com.commonlight.witness");
  });

  test("Retry navigates to production, including from a local error URL", () => {
    const retry = html.match(/<a\b[^>]*class="retry"[^>]*href="([^"]+)"[^>]*>([^<]+)<\/a>/);
    expect(retry).not.toBeNull();
    expect(retry[2]).toBe("Try again");
    for (const localUrl of [
      "capacitor://witnessmovement.com/index.html",
      "https://witnessmovement.com/index.html",
      "file:///app/public/index.html",
    ]) {
      const target = new URL(retry[1], localUrl);
      expect(target.href).toBe("https://witnessmovement.com/");
      expect(target.pathname).not.toBe("/index.html");
    }
    expect(html).not.toMatch(/location\.reload|onclick|target=/);
  });

  test("is self-contained, keyboard-accessible and makes no save/sync promise", () => {
    expect(html).toContain('<html lang="en">');
    expect(html).toContain('name="viewport"');
    expect(html).toContain("<main>");
    expect(html).toContain(":focus-visible");
    expect(html).not.toMatch(/<script|<link|<img|@import|url\(/i);
    expect(html).not.toMatch(/will (send|sync)|is saved on this phone|automatically send/i);
    expect(html).toContain("cannot confirm whether any unfinished writing was saved or sent");
  });
});

describe("iOS push signing preparation", () => {
  test("Debug and Release preserve identity/automatic signing and select distinct entitlements", () => {
    expect(configurations).toHaveLength(2);
    for (const name of ["Debug", "Release"]) {
      const settings = configurations.find(value => value.name === name)?.buildSettings;
      expect(settings).toBeDefined();
      expect(settings.CODE_SIGN_STYLE).toBe("Automatic");
      expect(settings.CODE_SIGN_ENTITLEMENTS).toBe(`App/App.${name}.entitlements`);
      expect(settings.DEVELOPMENT_TEAM).toBeUndefined();
    }
  });

  test("development and distribution request only the matching APNs environment", () => {
    for (const [name, environment] of [["Debug", "development"], ["Release", "production"]]) {
      expect(plist.parse(read(`ios/App/App/App.${name}.entitlements`))).toEqual({
        "aps-environment": environment,
      });
    }
  });

  test("the actual app target enables push and retains the installed plugin callbacks", () => {
    const app = Object.values(project.pbxNativeTargetSection()).find(value => value?.name === "App");
    const targetId = Object.entries(project.pbxNativeTargetSection()).find(([, value]) => value === app)[0];
    const projectObject = Object.values(project.pbxProjectSection()).find(value => value?.attributes);
    expect(projectObject.attributes.TargetAttributes[targetId].SystemCapabilities["com.apple.Push"].enabled).toBe(1);
    const delegate = read("ios/App/App/AppDelegate.swift");
    expect(delegate).toContain(".capacitorDidRegisterForRemoteNotifications");
    expect(delegate).toContain(".capacitorDidFailToRegisterForRemoteNotifications");
  });
});
