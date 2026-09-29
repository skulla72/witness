import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { ArrowLeft, HandCoins, Loader2, Scale } from "lucide-react";
import { BRAND } from "@/config/brand";
import { LANES, laneLine } from "@/data/giving";
import { usePrefs } from "@/hooks/usePrefs";
import { useSession } from "@/hooks/useSession";
import { money } from "@/lib/stripe";
import { WITNESS_TIP_CENTS, totalChargeCents, type PayMethod } from "@/lib/fees";
import { GiveFees } from "@/components/giving/GiveFees";
import { PaymentTestModeBanner } from "@/components/PaymentTestModeBanner";
import { FundCheckout } from "@/components/giving/FundCheckout";
import { loadFundOrgs, splitCents, type FundScope } from "@/lib/fund";
import type { FundFrequency } from "@/lib/fund.functions";

export const Route = createFileRoute("/giving/fund")({
  staticData: { sitemap: false },
  component: FundPage,
  validateSearch: (s: Record<string, unknown>): { lane?: string } => ({
    lane: typeof s.lane === "string" && LANES.some(l => l.key === s.lane) ? s.lane : undefined,
  }),
  head: () => ({
    meta: [
      { title: `Give across every nonprofit · ${BRAND.name}` },
      {
        name: "description",
        content:
          "One gift, divided evenly between every vetted nonprofit on the board — or every nonprofit in one lane, like homelessness or recovery. You see exactly who shares it.",
      },
      { property: "og:title", content: `Give across every nonprofit · ${BRAND.name}` },
      {
        property: "og:description",
        content: "Give once or monthly and let it split evenly across the whole board, or one lane of it.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
});

const AMOUNTS = [2500, 5000, 10000, 25000];

function FundPage() {
  const { prefs } = usePrefs();
  const { lane: laneParam } = Route.useSearch();
  const { userId } = useSession();
  const [scope, setScope] = useState<FundScope>(laneParam ? "lane" : "all");
  const [lane, setLane] = useState<string>(laneParam ?? LANES[0]!.key);
  const [frequency, setFrequency] = useState<FundFrequency>("once");
  const [amount, setAmount] = useState(5000);
  const [custom, setCustom] = useState("");
  const [email, setEmail] = useState("");
  const [donorName, setDonorName] = useState("");
  const [note, setNote] = useState("");
  const [giving, setGiving] = useState(false);
  const [coverFees, setCoverFees] = useState(false);
  const [payMethod, setPayMethod] = useState<PayMethod>("card");
  const [tip, setTip] = useState(false);

  const orgsQ = useQuery({
    queryKey: ["fund-orgs", scope, scope === "lane" ? lane : "all"],
    queryFn: () => loadFundOrgs(scope, lane),
  });

  const orgs = orgsQ.data ?? [];
  const cents = custom ? Math.round(Number(custom) * 100) : amount;
  const validAmount = Number.isInteger(cents) && cents >= 500 && cents <= 2_000_000;
  const emailOk = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
  const shares = validAmount ? splitCents(cents, orgs.length) : [];
  const enough = orgs.length >= 2;
  const remainder = shares.length ? shares.filter(s => s !== shares[shares.length - 1]!).length : 0;
  const returnUrl = `${typeof window !== "undefined" ? window.location.origin : ""}/checkout/return?kind=gift&session_id={CHECKOUT_SESSION_ID}`;

  if (giving && validAmount && enough) {
    return (
      <div className="pb-16">
        <PaymentTestModeBanner />
        <div className="px-4 pt-3">
          <button
            onClick={() => setGiving(false)}
            className="inline-flex items-center gap-1 text-[13px] text-ink-soft"
          >
            <ArrowLeft className="h-4 w-4" /> Change my gift
          </button>
        </div>
        <p className="px-5 pt-3 text-[13px] text-ink-soft">
          {money(cents)} {frequency === "monthly" ? "a month" : "once"}, split between {orgs.length}{" "}
          {scope === "lane" ? "nonprofits in this lane" : "nonprofits"}
          {` · ${money(totalChargeCents(cents, coverFees, payMethod, tip))} charged${coverFees ? ", fees covered" : ""}${tip ? `, plus ${money(WITNESS_TIP_CENTS)} to ${BRAND.name}` : ""}`}
        </p>
        <div className="mt-3 px-2">
          <FundCheckout
            scope={scope}
            lane={scope === "lane" ? lane : undefined}
            amountCents={cents}
            frequency={frequency}
            returnUrl={returnUrl}
            email={emailOk ? email : undefined}
            donorName={donorName || undefined}
            note={note || undefined}
            coverFees={coverFees}
            payMethod={payMethod}
            tip={tip}
          />
        </div>
      </div>
    );
  }

  return (
    <div className="pb-20">
      <PaymentTestModeBanner />
      <div className="px-4 pt-3">
        <Link to="/giving" className="inline-flex items-center gap-1 text-[13px] text-ink-soft">
          <ArrowLeft className="h-4 w-4" /> Giving
        </Link>
      </div>

      <header className="px-5 pt-3">
        <p className="inline-flex items-center gap-1.5 text-[11px] uppercase tracking-[0.22em] text-brass">
          <Scale className="h-3 w-3" /> Spread it out
        </p>
        <h1 className="mt-2 font-serif text-[28px] leading-tight text-ink">
          One gift, divided evenly
        </h1>
        <p className="mt-2 text-[13px] leading-relaxed text-ink-soft">
          You don't have to pick the right one. Give once, and it's split in equal parts between
          every nonprofit on the board — or every nonprofit in the lane your story belongs to.
        </p>
      </header>

      <section className="mx-4 mt-5 rounded-2xl border border-border bg-card p-5 shadow-soft">
        <p className="text-[10px] uppercase tracking-[0.2em] text-brass">Who shares it</p>
        <div className="mt-3 grid grid-cols-2 gap-2">
          {(["all", "lane"] as const).map(s => (
            <button
              key={s}
              onClick={() => setScope(s)}
              className={`rounded-xl py-2.5 text-[13px] font-medium transition-colors ${
                scope === s ? "bg-ink text-paper" : "border border-border bg-paper text-ink-soft"
              }`}
            >
              {s === "all" ? "The whole board" : "One lane"}
            </button>
          ))}
        </div>

        {scope === "lane" && (
          <div className="mt-3 space-y-2">
            {LANES.map(l => (
              <button
                key={l.key}
                onClick={() => setLane(l.key)}
                className={`flex w-full items-start gap-2 rounded-xl border px-3.5 py-2.5 text-left ${
                  lane === l.key ? "border-brass/50 bg-brass/5" : "border-border bg-paper"
                }`}
              >
                <span className="min-w-0">
                  <span className="block font-serif text-[14.5px] leading-tight text-ink">{l.label}</span>
                  <span className="mt-0.5 block text-[11.5px] italic text-ink-soft">{laneLine(l, prefs.gender)}</span>
                </span>
              </button>
            ))}
          </div>
        )}

        <div className="mt-4 rounded-xl border border-border bg-paper p-3.5">
          {orgsQ.isLoading ? (
            <div className="flex justify-center py-2">
              <Loader2 className="h-4 w-4 animate-spin text-ink-soft" />
            </div>
          ) : !enough ? (
            <p className="text-[12.5px] leading-relaxed text-ink-soft">
              {scope === "lane"
                ? "Not enough nonprofits in this lane are receiving gifts yet. Pick another lane, or give to one nonprofit directly."
                : "Not enough nonprofits are receiving gifts yet."}
            </p>
          ) : (
            <>
              <p className="text-[13px] text-ink">
                {orgs.length} nonprofits share this gift
                {validAmount && shares.length > 0 && (
                  <>
                    {" · "}
                    <span className="text-brass">{money(shares[shares.length - 1]!)} each</span>
                  </>
                )}
              </p>
              {validAmount && remainder > 0 && (
                <p className="mt-1 text-[11px] text-ink-soft">
                  {money(cents)} doesn't divide evenly, so {remainder}{" "}
                  {remainder === 1 ? "nonprofit gets" : "nonprofits get"} an extra cent.
                </p>
              )}
              <ul className="mt-2 space-y-1">
                {orgs.map((o, i) => (
                  <li key={o.id} className="flex items-center justify-between gap-2 text-[12px]">
                    <Link
                      to="/community/$slug"
                      params={{ slug: o.slug }}
                      className="min-w-0 truncate text-ink-soft underline decoration-border"
                    >
                      {o.name}
                    </Link>
                    {validAmount && shares[i] !== undefined && (
                      <span className="shrink-0 text-ink">{money(shares[i]!)}</span>
                    )}
                  </li>
                ))}
              </ul>
            </>
          )}
        </div>
      </section>

      <section className="mx-4 mt-4 rounded-2xl border border-border bg-card p-5 shadow-soft">
        <p className="text-[10px] uppercase tracking-[0.2em] text-brass">Your gift</p>

        <div className="mt-3 grid grid-cols-2 gap-2">
          {(["once", "monthly"] as const).map(f => (
            <button
              key={f}
              onClick={() => setFrequency(f)}
              className={`rounded-xl py-2.5 text-[13px] font-medium transition-colors ${
                frequency === f ? "bg-ink text-paper" : "border border-border bg-paper text-ink-soft"
              }`}
            >
              {f === "once" ? "One time" : "Every month"}
            </button>
          ))}
        </div>

        <div className="mt-3 grid grid-cols-4 gap-2">
          {AMOUNTS.map(n => (
            <button
              key={n}
              onClick={() => {
                setAmount(n);
                setCustom("");
              }}
              className={`rounded-xl py-2.5 text-[13px] font-medium transition-colors ${
                !custom && amount === n ? "bg-brass text-ink" : "border border-border bg-paper text-ink-soft"
              }`}
            >
              ${n / 100}
            </button>
          ))}
        </div>

        <label className="mt-3 block">
          <span className="text-[11px] text-ink-soft">Another amount</span>
          <input
            value={custom}
            onChange={e => setCustom(e.target.value.replace(/[^0-9.]/g, ""))}
            inputMode="decimal"
            placeholder="e.g. 150"
            className="mt-1 w-full rounded-xl border border-border bg-paper px-3 py-2.5 text-[14px] text-ink outline-none placeholder:text-ink-soft/70"
          />
        </label>

        <label className="mt-3 block">
          <span className="text-[11px] text-ink-soft">Email for your receipt</span>
          <input
            value={email}
            onChange={e => setEmail(e.target.value)}
            type="email"
            placeholder="you@email.com"
            className="mt-1 w-full rounded-xl border border-border bg-paper px-3 py-2.5 text-[14px] text-ink outline-none placeholder:text-ink-soft/70"
          />
        </label>

        <label className="mt-3 block">
          <span className="text-[11px] text-ink-soft">Your name (optional)</span>
          <input
            value={donorName}
            onChange={e => setDonorName(e.target.value.slice(0, 80))}
            placeholder="Leave blank to give quietly"
            className="mt-1 w-full rounded-xl border border-border bg-paper px-3 py-2.5 text-[14px] text-ink outline-none placeholder:text-ink-soft/70"
          />
        </label>

        <label className="mt-3 block">
          <span className="text-[11px] text-ink-soft">A note to them (optional)</span>
          <textarea
            value={note}
            onChange={e => setNote(e.target.value.slice(0, 300))}
            rows={2}
            placeholder="Why this matters to you."
            className="mt-1 w-full resize-none rounded-xl border border-border bg-paper px-3 py-2.5 text-[13px] text-ink outline-none placeholder:text-ink-soft/70"
          />
        </label>

        <GiveFees
          amountCents={cents}
          validAmount={validAmount}
          payMethod={payMethod}
          onPayMethod={setPayMethod}
          coverFees={coverFees}
          onCoverFees={setCoverFees}
          tip={tip}
          onTip={setTip}
          recipient="the nonprofits"
        />

        <button
          disabled={!validAmount || !enough}
          onClick={() => setGiving(true)}
          className="tap-scale mt-4 flex w-full items-center justify-center gap-2 rounded-xl bg-ink py-3 text-[14px] font-medium text-paper disabled:opacity-50"
        >
          <HandCoins className="h-4 w-4" />
          Give {validAmount ? money(cents) : ""} {frequency === "monthly" ? "a month" : ""}
        </button>
        <p className="mt-2.5 text-center text-[11px] leading-snug text-ink-soft">
          One charge, one receipt. {BRAND.name} collects it and passes on each equal share to the
          nonprofits listed above. Monthly gifts split again each month across whoever is receiving
          gifts then, and can be stopped any time from the Giving page.
        </p>
      </section>

      <p className="mt-6 px-8 text-center text-[11px] italic text-ink-soft">
        Even shares, no ranking. Giving never changes how your prayers are seen.
      </p>
    </div>
  );
}
