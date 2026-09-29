import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { ArrowLeft, HandCoins, Hammer, Loader2, MapPin, ShieldCheck } from "lucide-react";
import { dollars, pctFunded } from "@/lib/needs";
import { supabase } from "@/integrations/supabase/client";
import { useSession } from "@/hooks/useSession";
import { BRAND } from "@/config/brand";
import { money } from "@/lib/stripe";
import { WITNESS_TIP_CENTS, totalChargeCents, type PayMethod } from "@/lib/fees";
import { GiveFees } from "@/components/giving/GiveFees";
import { PaymentTestModeBanner } from "@/components/PaymentTestModeBanner";
import { GiftCheckout } from "@/components/giving/GiftCheckout";
import { OneTapGive } from "@/components/giving/OneTapGive";
import type { GiftFrequency } from "@/lib/donate.functions";
import { findLane, tierLabel, tierNote, type Tier } from "@/data/giving";
import { ORG_PUBLIC_COLUMNS, placeLine, type Org } from "@/lib/community";
import type { Tables } from "@/integrations/supabase/types";

type Profile = Tables<"nonprofit_profiles">;

export const Route = createFileRoute("/donate/$slug")({
  staticData: { sitemap: false },
  component: DonatePage,
  validateSearch: (s: Record<string, unknown>): { need?: string } => ({
    need: typeof s.need === "string" && /^[0-9a-fA-F-]{36}$/.test(s.need) ? s.need : undefined,
  }),
  head: () => ({
    meta: [
      { title: `Give to a nonprofit · ${BRAND.name}` },
      {
        name: "description",
        content:
          "Give once or monthly to a vetted nonprofit in a giving lane. You see the readiness tier, what your gift buys, and you get a receipt by email.",
      },
      { property: "og:title", content: `Give to a nonprofit · ${BRAND.name}` },
      {
        property: "og:description",
        content: "One-time or monthly gifts, designated to one nonprofit, with a receipt by email.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
});

const AMOUNTS = [1000, 2500, 5000, 10000];

function DonatePage() {
  const { slug } = Route.useParams();
  const { need: needParam } = Route.useSearch();
  const { userId } = useSession();
  const [frequency, setFrequency] = useState<GiftFrequency>("once");
  const [amount, setAmount] = useState(2500);
  const [custom, setCustom] = useState("");
  const [email, setEmail] = useState("");
  const [donorName, setDonorName] = useState("");
  const [note, setNote] = useState("");
  const [giving, setGiving] = useState(false);
  const [coverFees, setCoverFees] = useState(false);
  const [payMethod, setPayMethod] = useState<PayMethod>("card");
  const [tip, setTip] = useState(false);

  const { data, isLoading } = useQuery({
    queryKey: ["nonprofit", slug],
    queryFn: async () => {
      const { data: org, error } = await supabase
        .from("organizations")
        .select(ORG_PUBLIC_COLUMNS)
        .eq("slug", slug)
        .maybeSingle();
      if (error) throw error;
      if (!org) return { org: null as Org | null, profile: null as Profile | null };
      const { data: profile, error: pErr } = await supabase
        .from("nonprofit_profiles")
        .select("*")
        .eq("org_id", org.id)
        .maybeSingle();
      if (pErr) throw pErr;
      return { org: org as Org, profile: (profile ?? null) as Profile | null };
    },
  });

  const { data: need } = useQuery({
    queryKey: ["need-for-gift", needParam, data?.org?.id],
    enabled: !!needParam && !!data?.org,
    queryFn: async () => {
      const { data: n } = await supabase.from("needs").select("id, title, goal_cents, raised_cents, org_id, status").eq("id", needParam!).maybeSingle();
      if (!n || n.org_id !== data!.org!.id || n.status === "completed" || n.status === "closed") return null;
      return n;
    },
  });

  const cents = custom ? Math.round(Number(custom) * 100) : amount;
  const validAmount = Number.isInteger(cents) && cents >= 500 && cents <= 2_000_000;
  const emailOk = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);

  if (isLoading) {
    return (
      <div className="flex justify-center py-20">
        <Loader2 className="h-5 w-5 animate-spin text-ink-soft" />
      </div>
    );
  }

  if (!data?.org || !data.profile) {
    return (
      <div className="px-5 pb-16 pt-10 text-center">
        <p className="font-serif text-[18px] text-ink">This nonprofit isn't receiving gifts</p>
        <p className="mt-2 text-[13px] text-ink-soft">
          It may not be set up for giving yet.
        </p>
        <Link to="/giving" className="mt-5 inline-block text-[13px] text-brass">
          Back to giving lanes
        </Link>
      </div>
    );
  }

  const { org, profile } = data;
  const lane = findLane(profile.lane);
  const designated = need && frequency === "once" ? need : null;
  const returnUrl = `${typeof window !== "undefined" ? window.location.origin : ""}/checkout/return?kind=gift${designated ? `&need=${designated.id}` : ""}&session_id={CHECKOUT_SESSION_ID}`;

  if (giving && validAmount) {
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
          {money(cents)} {frequency === "monthly" ? "a month" : "once"} to {org.name}
          {need && frequency === "once" ? ` · toward "${need.title}"` : ""}
          {` · ${money(totalChargeCents(cents, coverFees, payMethod, tip))} charged${coverFees ? ", fees covered" : ""}${tip ? `, plus ${money(WITNESS_TIP_CENTS)} to ${BRAND.name}` : ""}`}
        </p>
        <div className="mt-3 px-2">
          <GiftCheckout
            orgSlug={org.slug}
            amountCents={cents}
            frequency={frequency}
            returnUrl={returnUrl}
            email={emailOk ? email : undefined}
            donorName={donorName || undefined}
            note={note || undefined}
            needId={need && frequency === "once" ? need.id : undefined}
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
        <Link
          to="/community/$slug"
          params={{ slug: org.slug }}
          className="inline-flex items-center gap-1 text-[13px] text-ink-soft"
        >
          <ArrowLeft className="h-4 w-4" /> {org.name}
        </Link>
      </div>

      <header className="px-5 pt-3">
        <p className="text-[11px] uppercase tracking-[0.22em] text-brass">
          {lane ? lane.label : "Giving"}
        </p>
        <h1 className="mt-2 font-serif text-[28px] leading-tight text-ink">{org.name}</h1>
        <p className="mt-1.5 flex items-center gap-1 text-[11.5px] text-ink-soft">
          <MapPin className="h-3 w-3" /> {placeLine(org)}
        </p>
        <p className="mt-2.5 text-[13px] leading-relaxed text-ink">
          {profile.mission || org.description}
        </p>
        <div className="mt-3 flex flex-wrap items-center gap-2">
          <span className="inline-flex items-center gap-1 rounded-full border border-border bg-paper px-2 py-0.5 text-[10px] uppercase tracking-[0.12em] text-ink-soft">
            <ShieldCheck className="h-3 w-3" /> {tierLabel[profile.tier as Tier] ?? profile.tier}
          </span>
          <span className="text-[11.5px] text-ink-soft">
            <span className="text-ink">{profile.to_program}¢</span> of every dollar to program
          </span>
        </div>
        <p className="mt-2 text-[11px] italic leading-snug text-ink-soft">
          {tierNote[profile.tier as Tier] ?? ""}
        </p>
      </header>

      {need && (
        <section className="mx-4 mt-5 rounded-2xl border border-brass/40 bg-card p-4 shadow-soft">
          <p className="inline-flex items-center gap-1.5 text-[10px] uppercase tracking-[0.2em] text-brass"><Hammer className="h-3 w-3" /> Toward one need</p>
          <p className="mt-1.5 font-serif text-[17px] leading-tight text-ink">{need.title}</p>
          <p className="mt-1 text-[11.5px] text-ink-soft">
            {dollars(need.raised_cents)} of {dollars(need.goal_cents)} so far · {org.name} collects it and pays the bill.
          </p>
          <div className="mt-2 h-1 overflow-hidden rounded-full bg-secondary"><div className="h-full bg-brass" style={{ width: `${pctFunded(need)}%` }} /></div>
          <Link to="/donate/$slug" params={{ slug: org.slug }} search={{}} className="mt-2 inline-block text-[11.5px] text-ink-soft underline">Give to {org.name} generally instead</Link>
        </section>
      )}

      <section className="mx-4 mt-5 rounded-2xl border border-border bg-card p-5 shadow-soft">
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
            placeholder="e.g. 75"
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
            placeholder="Why this lane matters to you."
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
          recipient={org.name}
        />

        {userId && frequency === "once" && (
          <OneTapGive
            orgSlug={org.slug}
            orgName={org.name}
            amountCents={cents}
            validAmount={validAmount}
            coverFees={coverFees}
            tip={tip}
            note={note || undefined}
            donorName={donorName || undefined}
            needId={need ? need.id : undefined}
          />
        )}


        <button
          disabled={!validAmount}
          onClick={() => setGiving(true)}
          className="tap-scale mt-4 flex w-full items-center justify-center gap-2 rounded-xl bg-ink py-3 text-[14px] font-medium text-paper disabled:opacity-50"
        >
          <HandCoins className="h-4 w-4" />
          Give {validAmount ? money(cents) : ""} {frequency === "monthly" ? "a month" : ""}
        </button>
        <p className="mt-2.5 text-center text-[11px] leading-snug text-ink-soft">
          Gifts are collected by {BRAND.name} and passed on to {org.name}, designated to this
          nonprofit. Your receipt arrives by email. Monthly gifts can be stopped any time from
          the Giving page.
        </p>
      </section>

      <p className="mt-6 px-8 text-center text-[11px] italic text-ink-soft">
        Giving never changes how your prayers are seen. That wall stays up.
      </p>
    </div>
  );
}
