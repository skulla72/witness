import { createFileRoute, Link } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import {
  ArrowLeft,
  ArrowRight,
  BadgeCheck,
  Clock,
  Hammer,
  Wrench,
  Building2,
  Check,
  MapPin,
  Navigation,
  SlidersHorizontal,
  Wifi,
} from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { useSession } from "@/hooks/useSession";
import { loadBadge } from "@/lib/hours";
import { StandingCard } from "@/components/perks/StandingCard";
import { BRAND } from "@/config/brand";
import {
  shifts,
  skillRequests,
  capacityEngagements,
  SKILLS,
  findLane,
  resourceLabel,
  dayPartLabel,
  type Resource,
  type DayPart,
  type Shift,
} from "@/data/giving";
import {
  RADIUS_STEPS,
  distanceLabel,
  findPlace,
  locateMe,
  milesBetween,
  placeLabel,
  radiusLabel,
  type Place,
} from "@/lib/geo";
import { usePrefs } from "@/hooks/usePrefs";


export const Route = createFileRoute("/serve")({
  staticData: { sitemap: false },
  component: Serve,
  head: () => ({
    meta: [
      { title: `Serve — hours, skills, and back office · ${BRAND.name}` },
      {
        name: "description",
        content:
          "Generosity that isn't money: take a real volunteer shift, lend a trade you already know, or join the Capacity Corps and help a small nonprofit run like a business.",
      },
      { property: "og:title", content: `Serve · ${BRAND.name}` },
      {
        property: "og:description",
        content: "Take a shift, lend a trade, or help a nonprofit build the back office it can't afford.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
});

type Tab = "time" | "skills" | "capacity";

/** Your verified hours and the next rung — the honest ledger behind the serving badge. */
function MyServing() {
  const { userId } = useSession();
  const badgeQ = useQuery({ queryKey: ["badge", userId], queryFn: () => loadBadge(userId!), enabled: !!userId });
  if (!userId) return null;
  const verified = Number(badgeQ.data?.hours_verified ?? 0);
  return (
    <div className="mt-5 space-y-3">
      <StandingCard ledger="goer" total={verified} compact />
      <Link to="/hours" className="tap-scale flex items-center gap-3 rounded-2xl border border-border bg-card p-4 shadow-soft">
        <BadgeCheck className="h-4 w-4 shrink-0 text-brass" strokeWidth={1.8} />
        <span className="min-w-0 flex-1">
          <span className="block font-serif text-[15px] leading-tight text-ink">Log hours &amp; your badge</span>
          <span className="mt-0.5 block text-[11.5px] leading-snug text-ink-soft">
            {verified > 0 ? `${verified.toLocaleString()} verified hours on your public badge.` : "Hours verified by the people you served. Contractors: put it on your business."}
          </span>
        </span>
        <ArrowRight className="h-4 w-4 shrink-0 text-ink-soft" />
      </Link>
    </div>
  );
}


function Serve() {
  const [tab, setTab] = useState<Tab>("time");
  const [mySkills, setMySkills] = useState<string[]>([]);
  const [offered, setOffered] = useState<string[]>([]);
  const [following, setFollowing] = useState<string[]>([]);
  const [taken, setTaken] = useState<string[]>([]);

  return (
    <div className="px-4 pb-14 pt-3">
      <Link to="/giving" className="inline-flex items-center gap-1 text-[13px] text-ink-soft">
        <ArrowLeft className="h-4 w-4" /> Giving
      </Link>

      <header className="px-1 pt-4">
        <p className="text-[11px] uppercase tracking-[0.22em] text-brass">Generosity that isn't money</p>
        <h1 className="mt-2 font-serif text-[29px] leading-tight text-ink">Serve</h1>
        <p className="mt-2 text-[13.5px] leading-relaxed text-ink-soft">
          Most small nonprofits don't fail for lack of heart. They fail for lack of hours, trades,
          and a back office. All three are things you can give.
        </p>
        <p className="mt-3 rounded-2xl border border-border bg-paper px-3.5 py-2.5 text-[10.5px] leading-[1.5] text-ink-soft">
          We only make introductions. We don't employ, supervise, screen, insure or endorse anyone
          listed here, and we don't inspect job sites or guarantee any work. Serving, accepting help,
          entering property and using tools carry real risk — you take part at your own risk and
          release us from any related claim. See the{" "}
          <Link to="/terms" className="underline">beta terms</Link>.
        </p>
      </header>


      <MyServing />

      <Link to="/needs" className="tap-scale mt-3 flex items-center gap-3 rounded-2xl border border-border bg-card p-4 shadow-soft">
        <Hammer className="h-4 w-4 shrink-0 text-brass" strokeWidth={1.8} />
        <span className="min-w-0 flex-1">
          <span className="block font-serif text-[15px] leading-tight text-ink">Needs that want hands</span>
          <span className="mt-0.5 block text-[11.5px] leading-snug text-ink-soft">Roofs, yards, furnaces — real jobs near you, with a photo when they're done.</span>
        </span>
        <ArrowRight className="h-4 w-4 shrink-0 text-ink-soft" />
      </Link>

      <Link to="/pros" className="tap-scale mt-3 flex items-center gap-3 rounded-2xl border border-border bg-card p-4 shadow-soft">
        <Hammer className="h-4 w-4 shrink-0 text-brass" strokeWidth={1.8} />
        <span className="min-w-0 flex-1">
          <span className="block font-serif text-[15px] leading-tight text-ink">Professionals who serve</span>
          <span className="mt-0.5 block text-[11.5px] leading-snug text-ink-soft">Trades and counselors with an identity check, hours served, and reviews from both sides.</span>
        </span>
        <ArrowRight className="h-4 w-4 shrink-0 text-ink-soft" />
      </Link>

      <Link to="/lanes" className="tap-scale mt-3 flex items-center gap-3 rounded-2xl border border-border bg-card p-4 shadow-soft">
        <Hammer className="h-4 w-4 shrink-0 text-brass" strokeWidth={1.8} />
        <span className="min-w-0 flex-1">
          <span className="block font-serif text-[15px] leading-tight text-ink">Serving lanes & what work runs</span>
          <span className="mt-0.5 block text-[11.5px] leading-snug text-ink-soft">The going range for each kind of work — and ask for help, so the people who do it answer with a price.</span>
        </span>
        <ArrowRight className="h-4 w-4 shrink-0 text-ink-soft" />
      </Link>

      <div className="no-scrollbar mt-5 -mx-1 flex gap-1 overflow-x-auto">
        {(
          [
            ["time", "Shifts"],
            ["skills", "Skills"],
            ["capacity", "Capacity Corps"],
          ] as const
        ).map(([k, label]) => (
          <button
            key={k}
            onClick={() => setTab(k)}
            className={`shrink-0 rounded-full border px-3.5 py-1.5 text-[12px] transition-colors ${
              tab === k ? "border-ink bg-ink text-paper" : "border-border bg-card text-ink-soft"
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {tab === "time" && <NearbyShifts taken={taken} setTaken={setTaken} />}


      {tab === "skills" && (
        <section className="mt-5">
          <div className="rounded-2xl border border-border bg-card p-5 shadow-soft">
            <p className="text-[10px] uppercase tracking-[0.2em] text-brass">What do you know how to do?</p>
            <p className="mt-1.5 text-[12.5px] leading-snug text-ink-soft">
              Pick anything. A man with a truck and a Saturday is worth more to these orgs than
              most cheques.
            </p>
            <div className="mt-3 flex flex-wrap gap-1.5">
              {SKILLS.map(s => {
                const on = mySkills.includes(s);
                return (
                  <button
                    key={s}
                    onClick={() =>
                      setMySkills(v => (on ? v.filter(x => x !== s) : [...v, s]))
                    }
                    className={`rounded-full border px-3 py-1.5 text-[11.5px] transition-colors ${
                      on ? "border-brass bg-brass/15 text-ink" : "border-border bg-paper text-ink-soft"
                    }`}
                  >
                    {s}
                  </button>
                );
              })}
            </div>
          </div>

          <h2 className="mb-3 mt-6 px-1 font-serif text-[13px] uppercase tracking-[0.18em] text-ink-soft">
            {mySkills.length > 0 ? "Matched to your skills" : "Open requests"}
          </h2>
          <div className="space-y-2">
            {skillRequests
              .filter(k => mySkills.length === 0 || mySkills.includes(k.skill))
              .map(k => (
                <div key={k.id} className="rounded-2xl border border-border bg-card p-4">
                  <p className="inline-flex items-center gap-1.5 text-[10px] uppercase tracking-[0.14em] text-brass">
                    <Wrench className="h-3 w-3" /> {k.skill}
                    {k.urgent && <span className="text-flame">· urgent</span>}
                  </p>
                  <p className="mt-1.5 font-serif text-[15.5px] leading-snug text-ink">{k.need}</p>
                  <p className="mt-1.5 text-[11.5px] text-ink-soft">
                    {k.org} · {k.commitment}
                  </p>
                  <button
                    onClick={() =>
                      setOffered(v => (v.includes(k.id) ? v.filter(x => x !== k.id) : [...v, k.id]))
                    }
                    aria-pressed={offered.includes(k.id)}
                    className={`tap-scale mt-3 w-full rounded-xl border py-2.5 text-[12.5px] transition-colors ${
                      offered.includes(k.id)
                        ? "border-hope bg-hope/15 text-ink"
                        : "border-border bg-paper text-ink"
                    }`}
                  >
                    {offered.includes(k.id) ? "On your serving list" : "Offer this skill"}
                  </button>
                  {offered.includes(k.id) && (
                    <p className="mt-2 text-[11px] leading-snug text-ink-soft">
                      Saved to your serving list on this device. Nothing is sent to {k.org} during
                      the private beta — we'll open introductions when the lane goes live.
                    </p>
                  )}
                </div>
              ))}
            {mySkills.length > 0 &&
              skillRequests.filter(k => mySkills.includes(k.skill)).length === 0 && (
                <p className="px-1 text-[12.5px] italic text-ink-soft">
                  Nothing open for those skills this week. We'll hold them on file — these
                  requests turn over constantly.
                </p>
              )}
          </div>
        </section>
      )}

      {tab === "capacity" && (
        <section className="mt-5">
          <div className="rounded-2xl border border-brass/30 bg-brass/10 p-5">
            <p className="inline-flex items-center gap-1.5 text-[10px] uppercase tracking-[0.2em] text-brass">
              <Building2 className="h-3 w-3" /> Capacity Corps
            </p>
            <p className="mt-2 font-serif text-[20px] leading-tight text-ink">
              Teach the org to hold the money.
            </p>
            <p className="mt-2 text-[12.5px] leading-relaxed text-ink-soft">
              A grant is one year. Clean books, a real board, and someone who can read a cash
              flow statement last a decade. Operators serve pro bono, and funding is released as
              milestones land — not all at once.
            </p>
          </div>

          <div className="mt-4 space-y-3">
            {capacityEngagements.map(c => {
              const done = c.milestones.filter(m => m.done).length;
              const pct = Math.round((c.tranche_released / c.tranche_total) * 100);
              return (
                <div key={c.id} className="rounded-2xl border border-border bg-card p-4 shadow-soft">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="font-serif text-[16.5px] leading-tight text-ink">{c.org}</p>
                      <p className="mt-1 text-[11.5px] text-ink-soft">
                        {c.role} · {findLane(c.lane)?.label}
                      </p>
                    </div>
                    <span className="shrink-0 rounded-full border border-border bg-paper px-2 py-0.5 text-[10px] uppercase tracking-[0.12em] text-ink-soft">
                      {c.stage.replace("_", " ")}
                    </span>
                  </div>
                  {c.operator && (
                    <p className="mt-2 text-[12px] text-ink-soft">Operator: {c.operator}</p>
                  )}
                  <ul className="mt-3 space-y-1.5">
                    {c.milestones.map(m => (
                      <li key={m.label} className="flex items-start gap-2 text-[12.5px]">
                        <span
                          className={`mt-0.5 grid h-4 w-4 shrink-0 place-items-center rounded-full ${
                            m.done ? "bg-hope/20" : "border border-border"
                          }`}
                        >
                          {m.done && <Check className="h-2.5 w-2.5 text-hope" />}
                        </span>
                        <span className={m.done ? "text-ink" : "text-ink-soft"}>{m.label}</span>
                      </li>
                    ))}
                  </ul>
                  <div className="mt-3 h-1 overflow-hidden rounded-full bg-secondary">
                    <div className="h-full bg-brass" style={{ width: `${pct}%` }} />
                  </div>
                  <p className="mt-1.5 text-[11px] text-ink-soft">
                    ${c.tranche_released.toLocaleString()} of $
                    {c.tranche_total.toLocaleString()} released · {done} of {c.milestones.length}{" "}
                    milestones
                  </p>
                  <button
                    onClick={() =>
                      setFollowing(v => (v.includes(c.id) ? v.filter(x => x !== c.id) : [...v, c.id]))
                    }
                    aria-pressed={following.includes(c.id)}
                    className={`tap-scale mt-3 w-full rounded-xl py-2.5 text-[12.5px] transition-colors ${
                      following.includes(c.id)
                        ? "border border-hope bg-hope/15 text-ink"
                        : "bg-ink text-paper"
                    }`}
                  >
                    {following.includes(c.id)
                      ? c.stage === "applied"
                        ? "You're on the operator list"
                        : "Following this build"
                      : c.stage === "applied"
                        ? "Volunteer as operator"
                        : "Follow this build"}
                  </button>
                  {following.includes(c.id) && (
                    <p className="mt-2 text-[11px] leading-snug text-ink-soft">
                      Kept on this device for now. {c.org} isn't notified during the private beta.
                    </p>
                  )}
                </div>
              );
            })}
          </div>
        </section>
      )}

      <p className="mx-auto mt-9 max-w-[290px] text-center text-[11.5px] italic text-ink-soft">
        Hours and skills are counted the same as dollars here. No donor tiers, no plaques.
      </p>
    </div>
  );
}

/* ---------- Shifts near you ---------- */

const TIME_WINDOWS = [
  { key: "any", label: "Any length", max: 99 },
  { key: "short", label: "Under 2 hrs", max: 2 },
  { key: "half", label: "Half a day", max: 4 },
  { key: "day", label: "A full day", max: 99 },
] as const;
type TimeWindow = (typeof TIME_WINDOWS)[number]["key"];

const RESOURCE_KEYS: Resource[] = [
  "vehicle",
  "lifting",
  "background_check",
  "training",
  "bring_family",
];

const DAY_PARTS: DayPart[] = ["weekday", "evening", "weekend", "overnight"];

function NearbyShifts({
  taken,
  setTaken,
}: {
  taken: string[];
  setTaken: React.Dispatch<React.SetStateAction<string[]>>;
}) {
  const { prefs, ready, update } = usePrefs();
  const [zipDraft, setZipDraft] = useState("");
  const [locating, setLocating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showFilters, setShowFilters] = useState(false);
  const [window, setWindow] = useState<TimeWindow>("any");
  const [parts, setParts] = useState<DayPart[]>([]);
  const [have, setHave] = useState<Resource[]>([]);
  const [remoteOk, setRemoteOk] = useState(true);

  const place: Place | undefined = ready ? findPlace(prefs.zip) : undefined;
  const radius = prefs.radius || 25;

  const setZip = (zip: string) => {
    const found = findPlace(zip);
    if (!found) {
      setError("We don't have that ZIP yet — try a nearby city's ZIP.");
      return;
    }
    setError(null);
    setZipDraft("");
    update({ zip: found.zip });
  };

  const useMyLocation = async () => {
    setLocating(true);
    setError(null);
    try {
      const found = await locateMe();
      update({ zip: found.zip });
    } catch (e) {
      setError(e instanceof Error ? e.message : "Location unavailable.");
    } finally {
      setLocating(false);
    }
  };

  const results = useMemo(() => {
    const rows = shifts
      .map(s => ({
        shift: s,
        miles: place ? milesBetween(place, s) : null,
      }))
      .filter(({ shift, miles }) => {
        if (shift.remote) return remoteOk;
        if (miles !== null && miles > radius) return false;
        if (window === "short" && shift.hours > 2) return false;
        if (window === "half" && shift.hours > 4) return false;
        if (window === "day" && shift.hours < 4) return false;
        if (parts.length > 0 && !parts.includes(shift.day_part)) return false;
        if (
          have.length > 0 &&
          shift.needs.some(n => n !== "nothing" && !have.includes(n))
        )
          return false;
        return true;
      });
    return rows.sort((a, b) => (a.miles ?? 1e9) - (b.miles ?? 1e9));
  }, [place, radius, window, parts, have, remoteOk]);

  const widen = () => {
    const next = RADIUS_STEPS.find(r => r > radius);
    if (next) update({ radius: next });
  };

  return (
    <section className="mt-5">
      {/* Where you're serving from */}
      <div className="rounded-2xl border border-border bg-card p-4 shadow-soft">
        <p className="text-[10px] uppercase tracking-[0.2em] text-brass">Serving from</p>
        {place ? (
          <div className="mt-1.5 flex items-baseline justify-between gap-3">
            <p className="font-serif text-[18px] leading-tight text-ink">
              {placeLabel(place)}{" "}
              <span className="text-[12.5px] text-ink-soft">{place.zip}</span>
            </p>
            <button
              onClick={() => update({ zip: "" })}
              className="shrink-0 text-[12px] text-ink-soft underline"
            >
              Change
            </button>
          </div>
        ) : (
          <>
            <p className="mt-1.5 text-[12.5px] leading-snug text-ink-soft">
              Put in the ZIP you're actually in. Change it any time you travel — the list
              follows you.
            </p>
            <div className="mt-3 flex gap-2">
              <input
                value={zipDraft}
                onChange={e => setZipDraft(e.target.value.replace(/\D/g, "").slice(0, 5))}
                inputMode="numeric"
                placeholder="ZIP code"
                className="min-w-0 flex-1 rounded-xl border border-border bg-paper px-3 py-2.5 text-[13px] text-ink outline-none placeholder:text-ink-soft/70 focus:border-brass"
              />
              <button
                onClick={() => setZip(zipDraft)}
                disabled={zipDraft.length < 5}
                className="tap-scale shrink-0 rounded-xl bg-ink px-4 py-2.5 text-[12.5px] text-paper disabled:opacity-40"
              >
                Set
              </button>
            </div>
            <button
              onClick={useMyLocation}
              className="tap-scale mt-2 inline-flex w-full items-center justify-center gap-1.5 rounded-xl border border-border bg-paper py-2.5 text-[12.5px] text-ink"
            >
              <Navigation className="h-3.5 w-3.5 text-brass" />
              {locating ? "Finding you…" : "Use my current location"}
            </button>
          </>
        )}
        {error && <p className="mt-2 text-[11.5px] text-flame">{error}</p>}

        {/* Radius */}
        <div className="mt-4">
          <div className="flex items-baseline justify-between">
            <p className="text-[11.5px] text-ink-soft">How far you'll go</p>
            <p className="text-[12.5px] text-ink">{radiusLabel(radius)}</p>
          </div>
          <div className="no-scrollbar mt-2 flex gap-1.5 overflow-x-auto">
            {RADIUS_STEPS.map(r => (
              <button
                key={r}
                onClick={() => update({ radius: r })}
                className={`shrink-0 rounded-full border px-3 py-1.5 text-[11.5px] transition-colors ${
                  radius === r
                    ? "border-brass bg-brass/15 text-ink"
                    : "border-border bg-paper text-ink-soft"
                }`}
              >
                {radiusLabel(r)}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Filters */}
      <button
        onClick={() => setShowFilters(v => !v)}
        className="mt-3 inline-flex w-full items-center justify-between rounded-xl border border-border bg-card px-4 py-2.5 text-[12.5px] text-ink"
      >
        <span className="inline-flex items-center gap-1.5">
          <SlidersHorizontal className="h-3.5 w-3.5 text-brass" />
          Time, day, and what you can bring
        </span>
        <span className="text-[11.5px] text-ink-soft">
          {showFilters ? "Hide" : `${results.length} open`}
        </span>
      </button>

      {showFilters && (
        <div className="mt-2 space-y-4 rounded-2xl border border-border bg-card p-4">
          <div>
            <p className="text-[10px] uppercase tracking-[0.16em] text-brass">Time you have</p>
            <div className="mt-2 flex flex-wrap gap-1.5">
              {TIME_WINDOWS.map(w => (
                <Chip key={w.key} on={window === w.key} onClick={() => setWindow(w.key)}>
                  {w.label}
                </Chip>
              ))}
            </div>
          </div>
          <div>
            <p className="text-[10px] uppercase tracking-[0.16em] text-brass">When you're free</p>
            <div className="mt-2 flex flex-wrap gap-1.5">
              {DAY_PARTS.map(d => (
                <Chip
                  key={d}
                  on={parts.includes(d)}
                  onClick={() =>
                    setParts(v => (v.includes(d) ? v.filter(x => x !== d) : [...v, d]))
                  }
                >
                  {dayPartLabel[d]}
                </Chip>
              ))}
            </div>
          </div>
          <div>
            <p className="text-[10px] uppercase tracking-[0.16em] text-brass">
              What you can bring
            </p>
            <div className="mt-2 flex flex-wrap gap-1.5">
              {RESOURCE_KEYS.map(r => (
                <Chip
                  key={r}
                  on={have.includes(r)}
                  onClick={() =>
                    setHave(v => (v.includes(r) ? v.filter(x => x !== r) : [...v, r]))
                  }
                >
                  {resourceLabel[r]}
                </Chip>
              ))}
            </div>
            <p className="mt-2 text-[11px] leading-snug text-ink-soft">
              Leave this blank to see everything. Tick what's true and we'll only show shifts you
              can actually walk into.
            </p>
          </div>
          <label className="flex items-center justify-between text-[12.5px] text-ink">
            <span className="inline-flex items-center gap-1.5">
              <Wifi className="h-3.5 w-3.5 text-brass" /> Include remote shifts
            </span>
            <input
              type="checkbox"
              checked={remoteOk}
              onChange={e => setRemoteOk(e.target.checked)}
              className="h-4 w-4 accent-[var(--brass-deep)]"
            />
          </label>
        </div>
      )}

      {/* Results */}
      <div className="mt-4 space-y-2">
        {results.map(({ shift: s, miles }) => (
          <ShiftCard
            key={s.id}
            shift={s}
            miles={miles}
            mine={taken.includes(s.id)}
            onToggle={() =>
              setTaken(t => (t.includes(s.id) ? t.filter(x => x !== s.id) : [...t, s.id]))
            }
          />
        ))}
        {results.length === 0 && (
          <div className="rounded-2xl border border-border bg-card p-5 text-center">
            <p className="text-[13px] leading-snug text-ink">
              Nothing open inside {radiusLabel(radius)} with those filters.
            </p>
            <p className="mt-1.5 text-[12px] italic text-ink-soft">
              These turn over weekly. Widen the circle and something usually shows up.
            </p>
            <button
              onClick={widen}
              className="tap-scale mt-3 rounded-xl bg-ink px-4 py-2.5 text-[12.5px] text-paper"
            >
              Look farther out
            </button>
          </div>
        )}
      </div>
    </section>
  );
}

function Chip({
  on,
  onClick,
  children,
}: {
  on: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      onClick={onClick}
      className={`rounded-full border px-3 py-1.5 text-[11.5px] transition-colors ${
        on ? "border-brass bg-brass/15 text-ink" : "border-border bg-paper text-ink-soft"
      }`}
    >
      {children}
    </button>
  );
}

function ShiftCard({
  shift: s,
  miles,
  mine,
  onToggle,
}: {
  shift: Shift;
  miles: number | null;
  mine: boolean;
  onToggle: () => void;
}) {
  const lane = findLane(s.lane);
  return (
    <div className="rounded-2xl border border-border bg-card p-4 shadow-soft">
      <div className="flex items-start justify-between gap-3">
        <p className="text-[10px] uppercase tracking-[0.14em] text-brass">{lane?.label}</p>
        <p className="shrink-0 text-[11px] text-ink-soft">
          {s.remote ? "Remote" : miles !== null ? distanceLabel(miles) : s.where}
        </p>
      </div>
      <p className="mt-1.5 font-serif text-[16px] leading-tight text-ink">{s.title}</p>
      <p className="mt-1 flex items-center gap-1 text-[11.5px] text-ink-soft">
        <MapPin className="h-3 w-3 shrink-0" /> {s.org} · {s.where}
      </p>
      <p className="mt-2 flex items-center gap-1 text-[12.5px] text-ink">
        <Clock className="h-3 w-3 text-brass" /> {s.when} · {s.hours} hr
        {s.hours === 1 ? "" : "s"}
      </p>
      <div className="mt-2 flex flex-wrap gap-1.5">
        {s.needs.map(n => (
          <span
            key={n}
            className="rounded-full border border-border bg-paper px-2 py-0.5 text-[10.5px] text-ink-soft"
          >
            {resourceLabel[n]}
          </span>
        ))}
      </div>
      <p className="mt-2 text-[11.5px] text-ink-soft">
        {s.seats_open} of {s.seats_total} seats left
        {s.first_timer_ok ? " · first-timers welcome" : " · training required first"}
      </p>
      <button
        onClick={onToggle}
        className={`tap-scale mt-3 w-full rounded-xl py-2.5 text-[12.5px] ${
          mine ? "border border-hope bg-hope/12 text-ink" : "bg-ink text-paper"
        }`}
      >
        {mine ? "Seat held — we'll text you the address" : "Take a seat"}
      </button>
    </div>
  );
}
