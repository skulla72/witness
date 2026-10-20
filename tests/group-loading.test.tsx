import { expect, test } from "bun:test";
import { readFileSync } from "node:fs";
import * as React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { GroupLoadError } from "../src/components/walk/GroupLoadError";

// Execute the real readers/screens with injected local dependencies, not a live
// auth client, database, transport, router or messaging service.
const read = (path: string) => readFileSync(path, "utf8");
const transpiler = new Bun.Transpiler({
  loader: "tsx",
  tsconfig: JSON.stringify({ compilerOptions: { jsx: "react", jsxFactory: "React.createElement", jsxFragmentFactory: "React.Fragment" } }),
});
function compile(source: string, name: string, dependencies: Record<string, unknown>) {
  const code = transpiler.transformSync(source.replace(/^import .*;\n/gm, "").replace(/\bexport /g, ""));
  return new Function(...Object.keys(dependencies), `${code}\nreturn ${name};`)(...Object.values(dependencies));
}
const row = {
  id: "group-a", org_id: "org-a", created_by: null, name: "A circle", description: "",
  rhythm: "weekly", accepting: true, tone: "open", kind: "open", door_question: "",
  covenant: [], seats_total: 8, next_meet: "", member_count: 1,
};
const author = { id: "member-a", name: "Member", photo: null };
function readers(options: {
  groups?: unknown[]; membership?: unknown[]; roster?: unknown[];
  membershipError?: unknown; rosterError?: unknown; groupError?: unknown; authorError?: unknown;
} = {}) {
  const calls: string[] = [];
  const supabase = {
    from(table: string) {
      calls.push(table);
      const chain = {
        select: () => chain,
        order: async () => ({ data: options.groups ?? [row], error: options.groupError ?? null }),
        eq(column: string) {
          if (table === "organization_groups") return chain;
          return Promise.resolve(column === "user_id"
            ? { data: options.membership ?? [{ group_id: row.id }], error: options.membershipError ?? null }
            : { data: options.roster ?? [{ user_id: author.id }], error: options.rosterError ?? null });
        },
        maybeSingle: async () => ({ data: (options.groups ?? [row])[0] ?? null, error: options.groupError ?? null }),
      };
      return chain;
    },
  };
  const loadAuthors = async (ids: string[], settings: { throwOnError?: boolean }) => {
    expect(settings.throwOnError).toBe(true);
    if (options.authorError) throw options.authorError;
    return new Map(ids.map(id => [id, { ...author, id }]));
  };
  return {
    api: compile(read("src/lib/groups.ts") + "\nconst readers = { loadGroups, loadGroup, loadMyGroups, loadRoster };", "readers", {
      supabase, loadAuthors, toAuthor: (_: unknown, id: string) => ({ ...author, id }),
      openDirectThread: () => { throw new Error("Messaging is forbidden in these tests"); },
      sendMessage: () => { throw new Error("Messaging is forbidden in these tests"); },
    }),
    calls,
  };
}

test("successful group membership and roster preserve real results", async () => {
  const { api } = readers();
  expect((await api.loadGroups("account-a"))[0].joined).toBe(true);
  expect((await api.loadGroup("group-a", "account-a")).joined).toBe(true);
  expect((await api.loadMyGroups("account-a")).length).toBe(1);
  expect(await api.loadRoster("group-a")).toEqual([author]);
});

test("genuinely empty membership, groups and rosters remain empty, not errors", async () => {
  const { api } = readers({ membership: [], roster: [] });
  expect((await api.loadGroups("account-a"))[0].joined).toBe(false);
  expect(await api.loadMyGroups("account-a")).toEqual([]);
  expect(await api.loadRoster("group-a")).toEqual([]);
  const empty = readers({ groups: [] });
  expect(await empty.api.loadGroups("account-a")).toEqual([]);
  expect(await empty.api.loadGroup("missing", "account-a")).toBeNull();
  expect(empty.calls).not.toContain("group_members");
});

test("membership service/permission errors reject list, detail and my-groups readers", async () => {
  for (const error of [new Error("service unavailable"), { code: "42501", message: "permission denied" }]) {
    const { api } = readers({ membershipError: error });
    for (const request of [
      () => api.loadGroups("account-a"), () => api.loadGroup("group-a", "account-a"),
      () => api.loadMyGroups("account-a"),
    ]) {
      await expect(request()).rejects.toBe(error);
    }
  }
});

test("roster and group service errors reject rather than return empty/not-found", async () => {
  const error = new Error("request failed");
  await expect(readers({ rosterError: error }).api.loadRoster("group-a")).rejects.toBe(error);
  await expect(readers({ groupError: error }).api.loadGroup("group-a", "account-a")).rejects.toBe(error);
  await expect(readers({ groupError: error }).api.loadGroups("account-a")).rejects.toBe(error);
});

test("rejected membership/roster transport promises propagate without fallback", async () => {
  const error = new Error("connection interrupted");
  const failedChain = {
    select() { return this; },
    eq() { return Promise.reject(error); },
    order: async () => ({ data: [row], error: null }),
  };
  const api = compile(read("src/lib/groups.ts") + "\nconst readers = { loadGroups, loadRoster };", "readers", {
    supabase: { from: () => failedChain }, loadAuthors: async () => new Map(), toAuthor: () => author,
  });
  await expect(api.loadGroups("account-a")).rejects.toBe(error);
  await expect(api.loadRoster("group-a")).rejects.toBe(error);
});

test("anonymous discovery does not request signed-in memberships; author failures propagate for groups", async () => {
  const anon = readers();
  expect((await anon.api.loadGroups(null))[0].joined).toBe(false);
  expect(anon.calls).not.toContain("group_members");
  const error = new Error("member cards unavailable");
  await expect(readers({ authorError: error }).api.loadRoster("group-a")).rejects.toBe(error);
});

test("actual member-card reader throws only for opted-in strict group loading", async () => {
  const source = read("src/lib/prayers.ts");
  const fn = source.slice(source.indexOf("export async function loadAuthors("), source.indexOf("export async function loadAuthor("));
  const error = new Error("permission denied");
  const load = compile(fn, "loadAuthors", {
    supabase: { rpc: async () => ({ data: null, error }) },
    toAuthor: (_: unknown, id: string) => ({ ...author, id }),
  });
  await expect(load(["member-a"], { throwOnError: true })).rejects.toBe(error);
  expect((await load(["member-a"])).get("member-a")).toEqual(author);
  expect((await load([], { throwOnError: true })).size).toBe(0);
});

function query(data: unknown, error = false, pending = false) {
  return { data, isError: error, isPending: pending, isLoading: pending, isSuccess: !error && !pending, isFetching: false, refetch: () => {} };
}
function screen(path: string, component: string, queries: Record<string, ReturnType<typeof query>>) {
  const source = read(path);
  const dependencies: Record<string, unknown> = { React };
  for (const match of source.matchAll(/^import \{ (.+) \} from /gm)) {
    for (const name of match[1].split(",").map(s => s.trim()).filter(s => !s.startsWith("type "))) {
      dependencies[name] = () => null;
    }
  }
  let stateIndex = 0, retries = 0;
  const retryActions: Array<() => void> = [];
  Object.assign(dependencies, {
    createFileRoute: () => (settings: unknown) => settings,
    useState: (initial: unknown) => [component === "NotOkayButton" && stateIndex++ === 0 ? true : initial, () => {}],
    useSession: () => ({ userId: "account-a", signedIn: true }),
    useParams: () => ({ id: row.id }),
    usePrefs: () => ({ prefs: {} }),
    toneFor: () => ({ faith: true }),
    useTone: () => ({ faith: true }),
    useQueryClient: () => ({ invalidateQueries() {} }),
    useQuery: ({ queryKey }: { queryKey: string[] }) => ({
      ...(queries[queryKey[0]] ?? query([])),
      refetch: () => { retries++; },
    }),
    Link: ({ children }: { children: React.ReactNode }) => <a>{children}</a>,
    GroupLoadError: (props: React.ComponentProps<typeof GroupLoadError>) => {
      retryActions.push(props.retry);
      return <GroupLoadError {...props} />;
    },
    CRISIS: [{ label: "Call 988", href: "tel:988", detail: "Emergency help" }],
  });
  const Component = compile(source, component, dependencies);
  return { html: renderToStaticMarkup(<Component />), retry() { retryActions.forEach(action => action()); return retries; } };
}

test("Community renders recoverable membership failure instead of available/empty groups", () => {
  const result = screen("src/routes/walk.index.tsx", "WalkWith", { groups: query([], true) });
  expect(result.html).toContain("circles and your membership");
  expect(result.html).not.toContain("No circles open yet");
  expect(result.retry()).toBe(1);
});

test("detail membership failure is retryable, never group-not-found or join invitation", () => {
  const result = screen("src/routes/walk.$id.tsx", "WalkGroupDetail", { group: query(undefined, true) });
  expect(result.html).toContain("this circle and your membership");
  expect(result.html).not.toContain("Group not found");
  expect(result.html).not.toContain("Take an open seat");
  expect(result.retry()).toBe(1);
});

test("detail roster error, loading and genuinely empty results stay distinct", () => {
  const group = { ...row, topic: row.name, joined: true, facilitator: null, seats_open: 7 };
  const failed = screen("src/routes/walk.$id.tsx", "WalkGroupDetail", { group: query(group), roster: query([], true) });
  expect(failed.html).toContain("the people in this circle");
  expect(failed.html).not.toContain("Nothing shared with the circle yet");
  expect(failed.retry()).toBe(1);
  const empty = screen("src/routes/walk.$id.tsx", "WalkGroupDetail", { group: query(group), roster: query([]) });
  expect(empty.html).toContain("No members to show yet");
  expect(empty.html).not.toContain('role="alert"');
  const loading = screen("src/routes/walk.$id.tsx", "WalkGroupDetail", { group: query(group), roster: query(undefined, false, true) });
  expect(loading.html).toContain("Loading the people in this circle");
  expect(loading.html).not.toContain("No members to show yet");
});

test("My People hides false empty/partial content on membership or roster errors and retries the right query", () => {
  for (const queries of [
    { groups: query([], true) },
    { groups: query([{ id: row.id }]), "circle-people": query([], true) },
    // Even a background failure with cached people must not render that data.
    { groups: query([{ id: row.id }]), "circle-people": query([author], true) },
  ]) {
    const result = screen("src/routes/circle.tsx", "Circle", queries);
    expect(result.html).toContain('role="alert"');
    expect(result.html).not.toContain("No one in your circle yet");
    expect(result.html).not.toContain("Nothing shared circle-only yet");
    expect(result.retry()).toBe(1);
  }
  const empty = screen("src/routes/circle.tsx", "Circle", { groups: query([]) });
  expect(empty.html).toContain("No one in your circle yet");
});

test("support flare never treats failed recipients as no circle or enables sending; crisis help remains", () => {
  const result = screen("src/components/mens/NotOkayButton.tsx", "NotOkayButton", { "circle-people-flat": query([], true) });
  expect(result.html).toContain("nothing has been sent");
  expect(result.html).not.toContain("You haven&#x27;t joined a circle yet");
  expect(result.html).toContain('href="tel:988"');
  expect(result.html).toMatch(/<button[^>]*disabled=""[^>]*>Light it<\/button>/);
  expect(result.retry()).toBe(1);
  const source = read("src/components/mens/NotOkayButton.tsx");
  expect(source).toContain("if (!userId || !circleQ.isSuccess || circleQ.isFetching) return;");
});

test("successful screens show group/member data and real empty discovery stays empty", () => {
  const group = { ...row, topic: row.name, blurb: "", joined: true, facilitator: null, seats_open: 7 };
  const community = screen("src/routes/walk.index.tsx", "WalkWith", { groups: query([group]) });
  expect(community.html).toContain("A circle");
  expect(community.html).not.toContain('role="alert"');
  const detail = screen("src/routes/walk.$id.tsx", "WalkGroupDetail", { group: query(group), roster: query([author]) });
  expect(detail.html).toContain("Member");
  expect(detail.html).not.toContain("No members to show yet");
  const circle = screen("src/routes/circle.tsx", "Circle", { groups: query([group]), "circle-people": query([author]) });
  expect(circle.html).toContain("1 person");
  expect(circle.html).toContain("A circle");
  expect(circle.html).not.toContain("No one in your circle yet");
  const empty = screen("src/routes/walk.index.tsx", "WalkWith", { groups: query([]) });
  expect(empty.html).toContain("No circles open yet");
  expect(empty.html).not.toContain('role="alert"');
});

test("support recipient loading and real emptiness are distinct from failure", () => {
  const loading = screen("src/components/mens/NotOkayButton.tsx", "NotOkayButton", {
    "circle-people-flat": query(undefined, false, true),
  });
  expect(loading.html).toContain("Finding your circle");
  expect(loading.html).toMatch(/<button[^>]*disabled=""[^>]*>Light it<\/button>/);
  const empty = screen("src/components/mens/NotOkayButton.tsx", "NotOkayButton", { "circle-people-flat": query([]) });
  expect(empty.html).toContain("joined a circle yet");
  expect(empty.html).not.toContain('role="alert"');
});

test("retry panel is accessible, has a non-submit button and a disabled retry-in-progress state", () => {
  const html = renderToStaticMarkup(<GroupLoadError subject="your membership" retry={() => {}} retrying />);
  expect(html).toContain('role="alert"');
  expect(html).toContain('type="button"');
  expect(html).toContain("Retrying…");
  expect(html).toContain('disabled=""');
});
