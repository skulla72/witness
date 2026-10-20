import { test, expect, beforeEach, afterEach } from "bun:test";
import { readFileSync } from "node:fs";
import {
  setJournalAccount, readJournal, writeJournal, recoverLegacyJournal,
  clearAccountJournal, draftFor, saveEntry,
} from "../src/lib/journal";
import { parseNativeCallback, safeAuthNext } from "../src/lib/auth-links";
import { matchesCronCredential } from "../src/lib/cron-rotation.server";
import { readAllAccountRows, redactExportRow, ACCOUNT_COLLECTIONS } from "../src/lib/account-data";
import { removeAccountFiles } from "../src/lib/account-storage.server";

let store;
beforeEach(() => {
  store = new Map();
  globalThis.window = {
    localStorage: {
      getItem: key => store.get(key) ?? null,
      setItem: (key, value) => store.set(key, value),
      removeItem: key => store.delete(key),
    },
    dispatchEvent: () => {},
  };
  setJournalAccount(null);
});
afterEach(() => { setJournalAccount(null); delete globalThis.window; });

test("switching accounts does not expose the previous journal; switching back preserves it", () => {
  setJournalAccount("account-a"); writeJournal({ enabled: true, entries: [{ id: "a", day: "2026-10-14", grateful: ["private A"] }] });
  setJournalAccount("account-b"); expect(readJournal().entries).toEqual([]);
  writeJournal({ entries: [{ id: "b", day: "2026-10-14", grateful: ["private B"] }] });
  setJournalAccount("account-a"); expect(readJournal().entries[0].id).toBe("a");
  setJournalAccount(null); expect(readJournal().entries).toEqual([]);
});
test("signed-out writes are rejected", () => {
  expect(() => writeJournal({ enabled: true })).toThrow("Sign in");
});
test("legacy entries are not auto-assigned and recovery leaves the original intact", () => {
  const original = JSON.stringify({ entries: [{ day: "2026-10-13", text: "old entry" }] });
  store.set("witness.journal.v1", original);
  setJournalAccount("a"); expect(readJournal().entries).toEqual([]);
  recoverLegacyJournal(); recoverLegacyJournal();
  expect(readJournal().entries).toHaveLength(1);
  expect(store.get("witness.journal.v1")).toBe(original);
  setJournalAccount("b"); expect(readJournal().entries).toEqual([]);
});
test("recovering same-day entries and editing today's entry does not erase the other entry", () => {
  setJournalAccount("a");
  const draft = draftFor(readJournal(), "2026-10-14"); draft.grateful[0] = "new"; saveEntry(draft);
  store.set("witness.journal.v2", JSON.stringify({ entries: [{ id: "old", day: draft.day, grateful: ["old"] }] }));
  recoverLegacyJournal(); saveEntry({ ...draft, affirmation: "edited" });
  expect(readJournal().entries.map(e => e.id)).toContain("old");
  expect(readJournal().entries).toHaveLength(2);
});
test("failed storage writes never appear successfully saved", () => {
  setJournalAccount("a");
  window.localStorage.setItem = () => { throw new Error("quota"); };
  expect(() => writeJournal({ enabled: true })).toThrow("quota");
  expect(readJournal().enabled).toBe(false);
});
test("local deletion clears only the requested account, preserving legacy and other accounts", () => {
  store.set("witness.journal.v1", "backup");
  setJournalAccount("b"); writeJournal({ enabled: true });
  setJournalAccount("a"); writeJournal({ enabled: true }); clearAccountJournal("a");
  expect(store.has("witness.journal.v2:a")).toBe(false);
  expect(store.has("witness.journal.v2:b")).toBe(true);
  expect(store.get("witness.journal.v1")).toBe("backup");
});
test("safe destinations reject protocol-relative, backslash and control-character redirects", () => {
  for (const input of ["//evil.test", "/\\evil.test", "https://evil.test", "/\n/evil.test"]) expect(safeAuthNext(input)).toBe("/");
  expect(safeAuthNext("/profile?tab=prayers")).toBe("/profile?tab=prayers");
});
test("native email callback accepts only exact app auth host/path and code", () => {
  expect(parseNativeCallback("com.commonlight.witness://auth/email-confirmation?code=synthetic")).toEqual({ code: "synthetic", error: null, recovery: false });
  expect(parseNativeCallback("com.commonlight.witness://auth/recovery?code=synthetic")?.recovery).toBe(true);
  for (const url of ["https://evil.test/callback?code=x", "com.commonlight.witness://other/callback?code=x", "com.commonlight.witness://auth/other?code=x"]) expect(parseNativeCallback(url)).toBeNull();
  expect(parseNativeCallback("com.commonlight.witness://auth/callback#access_token=not-real")).toBeNull();
});
test("cron rotation permits synthetic new/previous credentials but rejects empty or wrong ones", () => {
  expect(matchesCronCredential("new-test-only", ["new-test-only", "old-test-only"])).toBe(true);
  expect(matchesCronCredential("old-test-only", ["new-test-only", "old-test-only"])).toBe(true);
  expect(matchesCronCredential("wrong", ["new-test-only", "old-test-only"])).toBe(false);
  expect(matchesCronCredential("", ["", undefined])).toBe(false);
});
test("account export paginates beyond the provider row limit", async () => {
  const rows = Array.from({ length: 1207 }, (_, i) => ({ id: i, body: "synthetic" }));
  const ranges = [];
  const fake = { from: () => ({ select: () => ({ or: () => ({ order: () => ({
    range: (start, end) => { ranges.push([start, end]); return Promise.resolve({ data: rows.slice(start, end + 1), error: null }); },
  }) }) }) }) };
  expect(await readAllAccountRows(fake, "prayer_posts", "author_id.eq.synthetic")).toHaveLength(1207);
  expect(ranges).toHaveLength(3);
});
test("export query failures are not silently converted to empty collections", async () => {
  const fake = { from: () => ({ select: () => ({ or: () => ({ order: () => ({ range: () => Promise.resolve({ data: null, error: "denied" }) }) }) }) }) };
  await expect(readAllAccountRows(fake, "prayer_posts", "author_id.eq.synthetic")).rejects.toThrow("prayer_posts");
});
test("export omits credential-bearing fields and includes core formerly missing collections", () => {
  expect(redactExportRow({ id: "x", token: "not-real", token_hash: "not-real", body: "mine" })).toEqual({ id: "x", body: "mine" });
  for (const table of ["prayer_posts", "gratitude_entries", "messages", "intercessions", "profile_media", "therapy_agreements"]) expect(ACCOUNT_COLLECTIONS[table]).toBeDefined();
});
test("file deletion failure stops cleanup and exposes a retryable error", async () => {
  const fake = { storage: { from: bucket => ({
    list: async prefix => ({ data: bucket === "avatars" && prefix === "synthetic" ? [{ id: "file", name: "avatar.jpg" }] : [], error: null }),
    remove: async () => ({ error: "synthetic failure" }),
  }) } };
  await expect(removeAccountFiles(fake, "synthetic")).rejects.toThrow("File cleanup failed");
});
test("file listing failure cannot be treated as successful deletion", async () => {
  const fake = { storage: { from: () => ({ list: async () => ({ data: null, error: "denied" }) }) } };
  await expect(removeAccountFiles(fake, "synthetic")).rejects.toThrow("enumerate");
});
test("AI source contract: first click asks, server requires explicit consent", () => {
  const ui = readFileSync("src/components/ScriptureSuggest.tsx", "utf8");
  const server = readFileSync("src/lib/bible.functions.ts", "utf8");
  expect(ui).toContain("onClick={() => setConsenting(true)}");
  expect(ui).toContain("Send text and find verses");
  expect(ui).toContain("Not now");
  expect(server).toContain("consent: z.literal(true)");
});
