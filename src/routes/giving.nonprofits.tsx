import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import {
  ArrowLeft,
  BadgeCheck,
  Check,
  Heart,
  Lightbulb,
  Loader2,
  MapPin,
  Plus,
  Search,
  X,
} from "lucide-react";
import { BRAND } from "@/config/brand";
import { LANES } from "@/data/giving";
import { useSession } from "@/hooks/useSession";
import { searchNonprofits, addFoundNonprofit } from "@/lib/places.functions";
import {
  SUGGESTION_STATUS,
  addLaneTag,
  choose,
  laneTags,
  listNonprofits,
  myChoices,
  mySuggestions,
  removeLaneTag,
  suggestNonprofit,
  unchoose,
  type LaneTag,
} from "@/lib/nonprofits";
import { ProfileRow } from "@/components/profile-media/ProfileRow";

export const Route = createFileRoute("/giving/nonprofits")({
  staticData: { sitemap: true },
  component: Nonprofits,
  head: () => ({
    meta: [
      { title: `Find a nonprofit or foundation · ${BRAND.name}` },
      {
        name: "description",
        content:
          "Search nonprofits and foundations nationwide, add the ones that matter to your own giving, and suggest a cause we don't cover yet so it can go in front of the board.",
      },
      { property: "og:title", content: `Find a nonprofit · ${BRAND.name}` },
      {
        property: "og:description",
        content: "Search nonprofits and foundations, choose the ones you want to give to, or suggest a cause we're missing.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
});

const field =
  "mt-1 w-full rounded-xl border border-border bg-paper px-3 py-2 text-[13px] text-ink outline-none placeholder:text-ink-soft/60";
const label = "text-[10px] uppercase tracking-[0.16em] text-ink-soft";

const laneLabel = (key: string) => LANES.find(l => l.key === key)?.label ?? key;

function Nonprofits() {
  const { userId, signedIn } = useSession();
  const qc = useQueryClient();
  const [q, setQ] = useState("");
  const [typed, setTyped] = useState("");
  const [laneFilter, setLaneFilter] = useState<string>("");
  const [adding, setAdding] = useState<string | null>(null);
  const lookup = useServerFn(searchNonprofits);
  const addFound = useServerFn(addFoundNonprofit);

  useEffect(() => {
    const id = window.setTimeout(() => setTyped(q.trim()), 450);
    return () => window.clearTimeout(id);
  }, [q]);

  const orgs = useQuery({ queryKey: ["nonprofits", "listed"], queryFn: listNonprofits });
  const tags = useQuery({ queryKey: ["nonprofits", "tags"], queryFn: laneTags });
  const chosen = useQuery({
    queryKey: ["nonprofits", "choices", userId],
    queryFn: () => myChoices(userId!),
    enabled: !!userId,
  });

  const tagsByOrg = useMemo(() => {
    const map = new Map<string, LaneTag[]>();
    for (const t of tags.data ?? []) {
      const list = map.get(t.org_id) ?? [];
      list.push(t);
      map.set(t.org_id, list);
    }
    return map;
  }, [tags.data]);

  const chosenIds = useMemo(
    () => new Set((chosen.data ?? []).map(c => c.org_id)),
    [chosen.data],
  );

  const refresh = () => {
    void qc.invalidateQueries({ queryKey: ["nonprofits"] });
  };

  const pick = useMutation({
    mutationFn: async (orgId: string) => {
      if (!userId) throw new Error("Sign in first");
      if (chosenIds.has(orgId)) await unchoose(userId, orgId);
      else await choose(userId, orgId, laneFilter);
    },
    onSuccess: refresh,
    onError: () => toast.error("That didn't save. Try again."),
  });

  const tag = useMutation({
    mutationFn: ({ orgId, lane }: { orgId: string; lane: string }) =>
      addLaneTag(orgId, lane, userId!),
    onSuccess: refresh,
    onError: () => toast.error("That channel couldn't be added."),
  });

  const untag = useMutation({
    mutationFn: (id: string) => removeLaneTag(id),
    onSuccess: () => {
      toast.success("Taken out of that channel.");
      refresh();
    },
    onError: () => toast.error("Only this organization's leaders or the team can remove that."),
  });

  const needle = q.trim().toLowerCase();

  const visible = useMemo(() => {
    return (orgs.data ?? []).filter(o => {
      const inLane = laneFilter
        ? (tagsByOrg.get(o.id) ?? []).some(t => t.lane === laneFilter)
        : true;
      const matches = needle
        ? `${o.name} ${o.city} ${o.region} ${o.description}`.toLowerCase().includes(needle)
        : true;
      return inLane && matches;
    });
  }, [orgs.data, tagsByOrg, laneFilter, needle]);

  const found = useQuery({
    queryKey: ["nonprofits", "nationwide", typed],
    enabled: Boolean(signedIn) && typed.length >= 3,
    staleTime: 10 * 60_000,
    queryFn: () => lookup({ data: { query: typed } }),
  });

  const fresh = useMemo(() => {
    const here = new Set(
      (orgs.data ?? []).map(o => `${o.name.toLowerCase()}|${o.city.toLowerCase()}`),
    );
    return (found.data?.orgs ?? []).filter(
      o => !here.has(`${o.name.toLowerCase()}|${o.city.toLowerCase()}`),
    );
  }, [found.data, orgs.data]);

  const add = async (placeId: string) => {
    setAdding(placeId);
    try {
      const result = await addFound({ data: { placeId, lane: laneFilter || undefined } });
      if ("error" in result) {
        toast.error(result.error);
        return;
      }
      if (userId) await choose(userId, result.orgId, laneFilter);
      toast.success("Added and saved to your giving.");
      refresh();
    } catch {
      toast.error("That couldn't be added right now.");
    } finally {
      setAdding(null);
    }
  };

  return (
    <div className="pb-16">
      <div className="px-4 pt-3">
        <Link to="/giving" className="inline-flex items-center gap-1 text-[13px] text-ink-soft">
          <ArrowLeft className="h-4 w-4" /> Giving
        </Link>
      </div>

      <header className="mb-5 px-5 pt-3">
        <p className="text-[11px] uppercase tracking-[0.22em] text-brass">Find the work</p>
        <h1 className="mt-2 font-serif text-[28px] leading-tight text-ink">
          Nonprofits & foundations
        </h1>
        <p className="mt-2 text-[13px] leading-relaxed text-ink-soft">
          Search by name, city or cause. Say <span className="text-ink">Choose</span> and it joins
          your own giving list. If the thing you care about isn't here, suggest it and the board
          will look for the right people.
        </p>
      </header>

      <section className="mx-4 mb-4">
        <div className="flex items-center gap-2 rounded-xl border border-border bg-card px-3 py-2.5">
          <Search className="h-4 w-4 shrink-0 text-ink-soft" />
          <input
            value={q}
            onChange={e => setQ(e.target.value)}
            placeholder="Cancer research, food bank, Nashville…"
            className="w-full bg-transparent text-[13.5px] text-ink outline-none placeholder:text-ink-soft/60"
          />
          {q && (
            <button type="button" onClick={() => setQ("")} aria-label="Clear search">
              <X className="h-4 w-4 text-ink-soft" />
            </button>
          )}
        </div>

        <div className="mt-2.5 flex gap-1.5 overflow-x-auto pb-1">
          <button
            type="button"
            onClick={() => setLaneFilter("")}
            className={`shrink-0 rounded-full border px-3 py-1 text-[11.5px] ${
              laneFilter === "" ? "border-brass/50 bg-brass/10 text-brass" : "border-border text-ink-soft"
            }`}
          >
            All channels
          </button>
          {LANES.map(l => (
            <button
              key={l.key}
              type="button"
              onClick={() => setLaneFilter(l.key)}
              className={`shrink-0 rounded-full border px-3 py-1 text-[11.5px] ${
                laneFilter === l.key
                  ? "border-brass/50 bg-brass/10 text-brass"
                  : "border-border text-ink-soft"
              }`}
            >
              {l.label}
            </button>
          ))}
        </div>
      </section>

      {(chosen.data ?? []).length > 0 && (
        <section className="mx-4 mb-5 rounded-2xl border border-hope/35 bg-card p-4 shadow-soft">
          <p className="inline-flex items-center gap-1.5 text-[10px] uppercase tracking-[0.2em] text-hope">
            <Heart className="h-3 w-3" /> Your giving list
          </p>
          <p className="mt-1.5 text-[12.5px] leading-relaxed text-ink-soft">
            {(chosen.data ?? []).length} chosen. Only you see this list.
          </p>
        </section>
      )}

      <section className="px-4">
        {orgs.isLoading ? (
          <div className="flex justify-center py-8">
            <Loader2 className="h-4 w-4 animate-spin text-ink-soft" />
          </div>
        ) : visible.length === 0 ? (
          <p className="rounded-2xl border border-border bg-card p-4 text-[12.5px] leading-relaxed text-ink-soft">
            Nothing listed here yet for that. Search again, or suggest it below.
          </p>
        ) : (
          <div className="space-y-3">
            {visible.map(o => {
              const mine = chosenIds.has(o.id);
              const orgTags = tagsByOrg.get(o.id) ?? [];
              const untagged = LANES.filter(l => !orgTags.some(t => t.lane === l.key));
              return (
                <div key={o.id} className="rounded-2xl border border-border bg-card p-4 shadow-soft">
                   <div className="flex items-start justify-between gap-3">
                     <Link to="/community/$slug" params={{ slug: o.slug }} className="min-w-0 flex-1">
                       <ProfileRow image={o.logo_url} name={o.name} detail={[o.city, o.region].filter(Boolean).join(", ") || "Nonprofit"} organization trailing={o.verified ? <BadgeCheck className="h-4 w-4 shrink-0 text-brass" /> : undefined} />
                     </Link>
                    {signedIn && (
                      <button
                        type="button"
                        onClick={() => pick.mutate(o.id)}
                        className={`tap-scale shrink-0 rounded-xl px-3 py-2 text-[12.5px] font-medium ${
                          mine ? "border border-hope/50 bg-hope/10 text-hope" : "bg-ink text-paper"
                        }`}
                      >
                        {mine ? (
                          <span className="inline-flex items-center gap-1">
                            <Check className="h-3.5 w-3.5" /> Chosen
                          </span>
                        ) : (
                          "Choose"
                        )}
                      </button>
                    )}
                  </div>

                  {o.description && (
                    <p className="mt-2 text-[12.5px] leading-relaxed text-ink-soft">{o.description}</p>
                  )}

                  <div className="mt-3 flex flex-wrap items-center gap-1.5">
                    {orgTags.map(t => (
                      <span
                        key={t.id}
                        className="inline-flex items-center gap-1 rounded-full border border-border bg-paper px-2 py-0.5 text-[11px] text-ink-soft"
                      >
                        {laneLabel(t.lane)}
                        {signedIn && (
                          <button
                            type="button"
                            onClick={() => untag.mutate(t.id)}
                            aria-label={`Remove ${laneLabel(t.lane)} channel`}
                          >
                            <X className="h-3 w-3" />
                          </button>
                        )}
                      </span>
                    ))}
                    {signedIn && untagged.length > 0 && (
                      <select
                        value=""
                        onChange={e =>
                          e.target.value && tag.mutate({ orgId: o.id, lane: e.target.value })
                        }
                        className="rounded-full border border-dashed border-border bg-transparent px-2 py-0.5 text-[11px] text-ink-soft outline-none"
                        aria-label={`Add ${o.name} to a channel`}
                      >
                        <option value="">+ channel</option>
                        {untagged.map(l => (
                          <option key={l.key} value={l.key}>
                            {l.label}
                          </option>
                        ))}
                      </select>
                    )}
                  </div>
                  <p className="mt-2 text-[10.5px] leading-snug text-ink-soft/80">
                    Channels can be added or removed — never rewritten.
                  </p>
                </div>
              );
            })}
          </div>
        )}
      </section>

      {signedIn && typed.length >= 3 && (
        <section className="mt-6 px-4">
          <h2 className="mb-2 px-1 font-serif text-[13px] uppercase tracking-[0.18em] text-ink-soft">
            Found nationwide
          </h2>
          {found.isFetching ? (
            <div className="flex justify-center py-6">
              <Loader2 className="h-4 w-4 animate-spin text-ink-soft" />
            </div>
          ) : found.data?.error ? (
            <p className="rounded-2xl border border-border bg-card p-4 text-[12.5px] text-ink-soft">
              {found.data.error}
            </p>
          ) : fresh.length === 0 ? (
            <p className="rounded-2xl border border-border bg-card p-4 text-[12.5px] text-ink-soft">
              Nothing new on the map for that search.
            </p>
          ) : (
            <div className="space-y-2">
              {fresh.map(o => (
                <div
                  key={o.placeId}
                  className="flex items-start justify-between gap-3 rounded-2xl border border-border bg-card p-4"
                >
                  <div className="min-w-0">
                    <p className="font-serif text-[15px] leading-tight text-ink">{o.name}</p>
                    <p className="mt-1 text-[11.5px] text-ink-soft">{o.address}</p>
                  </div>
                  <button
                    type="button"
                    onClick={() => add(o.placeId)}
                    disabled={adding === o.placeId}
                    className="tap-scale inline-flex shrink-0 items-center gap-1 rounded-xl bg-ink px-3 py-2 text-[12.5px] font-medium text-paper disabled:opacity-60"
                  >
                    {adding === o.placeId ? (
                      <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    ) : (
                      <Plus className="h-3.5 w-3.5" />
                    )}
                    Choose
                  </button>
                </div>
              ))}
            </div>
          )}
        </section>
      )}

      <SuggestBlock userId={userId ?? null} />

      <p className="mt-8 px-8 text-center text-[11px] italic text-ink-soft">
        Listing an organization isn't an endorsement. Gifts open once it's claimed and vetted.
      </p>
    </div>
  );
}

/** A cause we don't cover yet — a disease, a place, a kind of loss — for the board. */
function SuggestBlock({ userId }: { userId: string | null }) {
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({
    name: "",
    website: "",
    cause: "",
    lane: "",
    city: "",
    region: "",
    reason: "",
  });

  const mine = useQuery({
    queryKey: ["nonprofits", "suggestions", userId],
    queryFn: () => mySuggestions(userId!),
    enabled: !!userId,
  });

  const send = useMutation({
    mutationFn: () => suggestNonprofit(userId!, form),
    onSuccess: () => {
      toast.success("Sent to the board. You'll see the decision here.");
      setForm({ name: "", website: "", cause: "", lane: "", city: "", region: "", reason: "" });
      setOpen(false);
      void qc.invalidateQueries({ queryKey: ["nonprofits", "suggestions"] });
    },
    onError: () => toast.error("That didn't send. Try again."),
  });

  if (!userId) return null;

  return (
    <section className="mt-7 px-4">
      <div className="rounded-2xl border border-brass/35 bg-card p-5 shadow-soft">
        <p className="inline-flex items-center gap-1.5 text-[10px] uppercase tracking-[0.2em] text-brass">
          <Lightbulb className="h-3 w-3" /> Can't find it?
        </p>
        <p className="mt-2 font-serif text-[18px] leading-tight text-ink">Suggest a nonprofit</p>
        <p className="mt-1.5 text-[12.5px] leading-relaxed text-ink-soft">
          Name a disease, a loss or a need that isn't covered here. It goes in front of the board —
          and if nobody is doing that work, it may be work we start.
        </p>

        {!open ? (
          <button
            type="button"
            onClick={() => setOpen(true)}
            className="tap-scale mt-3.5 w-full rounded-xl bg-ink py-2.5 text-[13px] font-medium text-paper"
          >
            Suggest a nonprofit
          </button>
        ) : (
          <div className="mt-4 space-y-3">
            <div>
              <p className={label}>What cause or condition</p>
              <input
                className={field}
                value={form.cause}
                onChange={e => setForm({ ...form, cause: e.target.value })}
                placeholder="ALS, kinship care, a mill town after layoffs…"
              />
            </div>
            <div>
              <p className={label}>Organization name (if you know one)</p>
              <input
                className={field}
                value={form.name}
                onChange={e => setForm({ ...form, name: e.target.value })}
                placeholder="Optional"
              />
            </div>
            <div>
              <p className={label}>Website</p>
              <input
                className={field}
                value={form.website}
                onChange={e => setForm({ ...form, website: e.target.value })}
                placeholder="Optional"
              />
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <p className={label}>City</p>
                <input
                  className={field}
                  value={form.city}
                  onChange={e => setForm({ ...form, city: e.target.value })}
                />
              </div>
              <div>
                <p className={label}>State</p>
                <input
                  className={field}
                  value={form.region}
                  onChange={e => setForm({ ...form, region: e.target.value })}
                />
              </div>
            </div>
            <div>
              <p className={label}>Closest channel</p>
              <select
                className={field}
                value={form.lane}
                onChange={e => setForm({ ...form, lane: e.target.value })}
              >
                <option value="">None of these fit</option>
                {LANES.map(l => (
                  <option key={l.key} value={l.key}>
                    {l.label}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <p className={label}>Why this matters</p>
              <textarea
                className={`${field} min-h-[90px]`}
                value={form.reason}
                onChange={e => setForm({ ...form, reason: e.target.value })}
                placeholder="Say it plainly. What you've seen, and who it would reach."
              />
            </div>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="flex-1 rounded-xl border border-border py-2.5 text-[13px] text-ink-soft"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={send.isPending || (!form.cause.trim() && !form.name.trim())}
                onClick={() => send.mutate()}
                className="tap-scale flex-1 rounded-xl bg-ink py-2.5 text-[13px] font-medium text-paper disabled:opacity-60"
              >
                {send.isPending ? "Sending…" : "Send to the board"}
              </button>
            </div>
          </div>
        )}
      </div>

      {(mine.data ?? []).length > 0 && (
        <div className="mt-4 space-y-2">
          <h2 className="px-1 font-serif text-[13px] uppercase tracking-[0.18em] text-ink-soft">
            Your suggestions
          </h2>
          {(mine.data ?? []).map(s => (
            <div key={s.id} className="rounded-2xl border border-border bg-card p-4">
              <div className="flex items-center justify-between gap-2">
                <p className="text-[14px] text-ink">{s.name || s.cause || "Suggestion"}</p>
                <span className="shrink-0 rounded-full border border-border bg-paper px-2 py-0.5 text-[10px] uppercase tracking-[0.12em] text-ink-soft">
                  {SUGGESTION_STATUS[s.status] ?? s.status}
                </span>
              </div>
              {s.cause && s.name && (
                <p className="mt-1 text-[11.5px] text-ink-soft">{s.cause}</p>
              )}
              {s.review_note && (
                <p className="mt-1.5 text-[12px] italic leading-snug text-ink">"{s.review_note}"</p>
              )}
            </div>
          ))}
        </div>
      )}
    </section>
  );
}
