import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { ArrowLeft, Loader2 } from "lucide-react";
import { BRAND } from "@/config/brand";
import { useSession } from "@/hooks/useSession";
import { SERVING_LANES, URGENCY, laneByKey, laneLabel, laneRange, urgencyLabel } from "@/data/serving-lanes";
import { REQUEST_STATUS, money, myRequests, postRequest } from "@/lib/serving";
import { leaderOrgs } from "@/lib/orgs";
import { clearChurchDraft, readChurchDraft } from "@/lib/churchSignup";

export const Route = createFileRoute("/hire")({
  staticData: { sitemap: false },
  component: Hire,
  validateSearch: (search: Record<string, unknown>) => ({
    lane: typeof search.lane === "string" ? search.lane : undefined,
  }),
  head: () => ({
    meta: [
      { title: `Ask for help with work · ${BRAND.name}` },
      {
        name: "description",
        content:
          "Say what you need done and where. We put it in front of the professionals who work that lane, and they come back with an offer.",
      },
      { property: "og:title", content: `Ask for help with work · ${BRAND.name}` },
      {
        property: "og:description",
        content: "One ask, and the people who do that work answer with their price.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
});

function Hire() {
  const { lane: laneFromLink } = Route.useSearch();
  const { userId, signedIn } = useSession();
  const navigate = useNavigate();
  const qc = useQueryClient();

  const [lane, setLane] = useState(laneFromLink ?? SERVING_LANES[0]!.key);
  const [title, setTitle] = useState("");
  const [details, setDetails] = useState("");
  const [city, setCity] = useState("");
  const [region, setRegion] = useState("");
  const [urgency, setUrgency] = useState<string>("whenever");
  const [budget, setBudget] = useState("");
  const [rateKind, setRateKind] = useState("quote");
  const [wantsDonated, setWantsDonated] = useState(false);
  const [contactNote, setContactNote] = useState("");
  const [forOrg, setForOrg] = useState("");
  // A church that started on the films page already told us what they need.
  const [cameFromChurch, setCameFromChurch] = useState(false);

  useEffect(() => {
    const draft = readChurchDraft();
    if (!draft) return;
    if (draft.lane && laneByKey(draft.lane)) setLane(draft.lane);
    if (draft.need) setTitle(draft.need);
    if (draft.city) setCity(draft.city);
    if (draft.region) setRegion(draft.region);
    setCameFromChurch(true);
    clearChurchDraft();
  }, []);

  const myOrgs = useQuery({
    queryKey: ["orgs", "leading", userId],
    queryFn: () => leaderOrgs(userId!),
    enabled: !!userId,
  });

  const firstOrgId = (myOrgs.data ?? [])[0]?.id;
  useEffect(() => {
    if (cameFromChurch && !forOrg && firstOrgId) setForOrg(firstOrgId);
  }, [cameFromChurch, forOrg, firstOrgId]);


  const mine = useQuery({
    queryKey: ["serving", "myRequests", userId],
    queryFn: () => myRequests(userId!),
    enabled: !!userId,
  });

  const post = useMutation({
    mutationFn: () =>
      postRequest({
        lane,
        title,
        details,
        city,
        region,
        urgency,
        budget_cents: Math.round((Number(budget) || 0) * 100),
        rate_kind: rateKind,
        wants_donated: wantsDonated,
        contact_note: contactNote,
        org_id: forOrg || null,
      }),
    onSuccess: req => {
      toast.success("Posted. The people who do this work can see it now.");
      void qc.invalidateQueries({ queryKey: ["serving"] });
      navigate({ to: "/requests/$id", params: { id: req.id } });
    },
    onError: () => toast.error("We couldn't post that. Try once more."),
  });

  const guide = laneByKey(lane);

  return (
    <div className="pb-16">
      <div className="px-4 pt-3">
        <Link to="/lanes" className="inline-flex items-center gap-1 text-[13px] text-ink-soft">
          <ArrowLeft className="h-4 w-4" /> Serving lanes
        </Link>
      </div>

      <header className="px-5 pt-3">
        <p className="text-[11px] uppercase tracking-[0.22em] text-brass">Ask for help</p>
        <h1 className="mt-2 font-serif text-[28px] leading-tight text-ink">
          Tell us what needs doing
        </h1>
        <p className="mt-2 text-[13px] leading-relaxed text-ink-soft">
          Only the people who work this lane see your ask, and only they can answer it. Nobody can be
          hired here before their identity check clears.
        </p>
      </header>

      {signedIn === false && (
        <div className="mx-4 mt-5 rounded-2xl border border-brass/30 bg-brass/10 p-4">
          <p className="font-serif text-[15.5px] text-ink">Sign in first</p>
          <Link
            to="/login"
            className="mt-3 inline-flex rounded-full bg-primary px-4 py-2 text-[12.5px] text-primary-foreground"
          >
            Sign in
          </Link>
        </div>
      )}

      <form
        onSubmit={e => {
          e.preventDefault();
          if (userId && title.trim()) post.mutate();
        }}
        className="space-y-5 px-4 pt-6"
      >
        {(myOrgs.data ?? []).length > 0 && (
          <Field label="Who is this for?">
            <select value={forOrg} onChange={e => setForOrg(e.target.value)} className={input}>
              <option value="">Me</option>
              {(myOrgs.data ?? []).map(o => (
                <option key={o.id} value={o.id}>
                  {o.name}
                </option>
              ))}
            </select>
            <span className="mt-1.5 block px-1 text-[11.5px] text-ink-soft">
              Pick your church and this ask — and whoever you hire — shows on its dashboard.
            </span>
          </Field>
        )}

        <Field label="Kind of work">
          <select value={lane} onChange={e => setLane(e.target.value)} className={input}>
            {SERVING_LANES.map(l => (
              <option key={l.key} value={l.key}>
                {l.label}
              </option>
            ))}
          </select>
          {guide && (
            <span className="mt-1.5 block px-1 text-[11.5px] text-ink-soft">
              Usually {laneRange(guide)} around the country.
            </span>
          )}
        </Field>

        <Field label="What you need">
          <input
            required
            value={title}
            onChange={e => setTitle(e.target.value)}
            placeholder="Back yard hasn't been mowed in a month"
            className={input}
          />
        </Field>

        <Field label="Anything they should know">
          <textarea
            value={details}
            onChange={e => setDetails(e.target.value)}
            rows={4}
            placeholder="Half an acre, a gate that's hard to open, two dogs inside."
            className={input}
          />
        </Field>

        <div className="grid grid-cols-[1fr_88px] gap-3">
          <Field label="City">
            <input value={city} onChange={e => setCity(e.target.value)} placeholder="Nashville" className={input} />
          </Field>
          <Field label="State">
            <input value={region} onChange={e => setRegion(e.target.value)} placeholder="TN" className={input} />
          </Field>
        </div>

        <Field label="How soon">
          <select value={urgency} onChange={e => setUrgency(e.target.value)} className={input}>
            {URGENCY.map(u => (
              <option key={u.key} value={u.key}>
                {u.label}
              </option>
            ))}
          </select>
        </Field>

        <div className="grid grid-cols-[110px_1fr] gap-3">
          <Field label="Set aside">
            <input
              value={budget}
              onChange={e => setBudget(e.target.value.replace(/[^0-9]/g, ""))}
              placeholder="150"
              inputMode="numeric"
              className={input}
            />
          </Field>
          <Field label="Counted as">
            <select value={rateKind} onChange={e => setRateKind(e.target.value)} className={input}>
              <option value="quote">I'd rather hear their price</option>
              <option value="hourly">Per hour</option>
              <option value="flat">For the whole job</option>
            </select>
          </Field>
        </div>

        <button
          type="button"
          onClick={() => setWantsDonated(v => !v)}
          className={`tap-scale block w-full rounded-xl border p-3 text-left ${
            wantsDonated ? "border-brass/50 bg-brass/10" : "border-border bg-card"
          }`}
        >
          <span className="block text-[13.5px] text-ink">I can't pay for this right now</span>
          <span className="mt-0.5 block text-[11.5px] text-ink-soft">
            We'll show it first to people who sometimes give the work away. Their time is counted in
            hours served.
          </span>
        </button>

        <Field label="How to reach you">
          <input
            value={contactNote}
            onChange={e => setContactNote(e.target.value)}
            placeholder="Text is best after 4"
            className={input}
          />
        </Field>

        <button
          type="submit"
          disabled={post.isPending || !title.trim() || signedIn !== true}
          className="tap-scale inline-flex w-full items-center justify-center gap-2 rounded-full bg-primary px-5 py-3 text-[14px] text-primary-foreground disabled:opacity-50"
        >
          {post.isPending && <Loader2 className="h-4 w-4 animate-spin" />}
          Post it
        </button>
      </form>

      {!!mine.data?.length && (
        <section className="px-4 pt-8">
          <h2 className="mb-2 px-1 text-[11px] uppercase tracking-[0.18em] text-ink-soft">
            What you've asked for
          </h2>
          <div className="space-y-2">
            {mine.data.map(r => (
              <Link
                key={r.id}
                to="/requests/$id"
                params={{ id: r.id }}
                className="block rounded-2xl border border-border bg-card p-4"
              >
                <div className="flex items-baseline justify-between gap-3">
                  <p className="font-serif text-[15.5px] leading-tight text-ink">{r.title}</p>
                  <span className="shrink-0 text-[11px] uppercase tracking-[0.12em] text-ink-soft">
                    {REQUEST_STATUS[r.status] ?? r.status}
                  </span>
                </div>
                <p className="mt-1 text-[11.5px] text-ink-soft">
                  {[laneLabel(r.lane), urgencyLabel(r.urgency), r.budget_cents ? money(r.budget_cents) : null]
                    .filter(Boolean)
                    .join(" · ")}
                </p>
              </Link>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}

const input =
  "w-full rounded-xl border border-border bg-card px-3 py-2.5 text-[13.5px] leading-relaxed text-ink outline-none placeholder:text-ink-soft";

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="mb-1.5 block px-1 text-[11px] uppercase tracking-[0.18em] text-ink-soft">
        {label}
      </span>
      {children}
    </label>
  );
}
