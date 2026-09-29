import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ArrowLeft, Building2, CreditCard, Flame, Loader2 } from "lucide-react";
import { BRAND } from "@/config/brand";
import { useSession } from "@/hooks/useSession";
import { money, getStripeEnvironment } from "@/lib/stripe";
import { PaymentTestModeBanner } from "@/components/PaymentTestModeBanner";
import { LightCheckout } from "@/components/giving/LightCheckout";
import { cancelMonthlyLight, myLightGifts, type LightFrequency } from "@/lib/light.functions";
import { toast } from "sonner";
import type { PayMethod } from "@/lib/fees";

export const Route = createFileRoute("/giving/witness")({
  staticData: { sitemap: true },
  component: LightPage,
  head: () => ({
    links: [{ rel: "canonical", href: "https://witnessmovement.com/giving/witness" }],
    meta: [
      { title: `Keep the light lit — support ${BRAND.name} · ${BRAND.name}` },
      {
        name: "description",
        content:
          "Give to Witness itself: the servers, storage and support that keep prayer asks, answers and gifts working. Once or monthly, and never tax-deductible — it's a gift, not a donation.",
      },
      { property: "og:title", content: `Keep the light lit · ${BRAND.name}` },
      {
        property: "og:description",
        content: "Support the app itself — once or every month. No perks, no priority, no leaderboards.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
});

const AMOUNTS = [300, 1000, 2500, 5000];

function safeEnv(): "sandbox" | "live" {
  try { return getStripeEnvironment(); } catch { return "sandbox"; }
}

/** What you've already given to keep the light lit. Only you see this. */
function MyLight() {
  const { userId } = useSession();
  const qc = useQueryClient();
  const q = useQuery({ queryKey: ["light-gifts", userId], queryFn: () => myLightGifts(), enabled: !!userId });
  const stop = useMutation({
    mutationFn: (giftId: string) => cancelMonthlyLight({ data: { giftId, environment: safeEnv() } }),
    onSuccess: r => {
      if ("error" in r) return toast.error(r.error);
      toast.success("Your monthly gift is stopped.");
      void qc.invalidateQueries({ queryKey: ["light-gifts", userId] });
    },
  });

  const gifts = (q.data ?? []).filter(g => g.status === "paid" || g.status === "active" || g.status === "pending");
  if (!userId || gifts.length === 0) return null;

  return (
    <section className="mx-4 mt-4 rounded-2xl border border-border bg-card p-5 shadow-soft">
      <p className="text-[10px] uppercase tracking-[0.2em] text-brass">Your gifts to {BRAND.name}</p>
      <ul className="mt-3 space-y-2">
        {gifts.map(g => (
          <li key={g.id} className="flex items-center justify-between gap-3 text-[12.5px]">
            <span className="text-ink">
              {money(g.amount_cents)} {g.frequency === "monthly" ? "a month" : "once"}
              <span className="ml-1 text-ink-soft">· {new Date(g.created_at).toLocaleDateString()}</span>
            </span>
            {g.frequency === "monthly" && !g.canceled_at && g.stripe_subscription_id && (
              <button
                onClick={() => stop.mutate(g.id)}
                disabled={stop.isPending}
                className="shrink-0 rounded-full border border-border px-2.5 py-1 text-[11px] text-ink-soft"
              >
                {stop.isPending ? <Loader2 className="h-3 w-3 animate-spin" /> : "Stop"}
              </button>
            )}
          </li>
        ))}
      </ul>
    </section>
  );
}

function LightPage() {
  const [frequency, setFrequency] = useState<LightFrequency>("monthly");
  const [amount, setAmount] = useState(1000);
  const [custom, setCustom] = useState("");
  const [email, setEmail] = useState("");
  const [donorName, setDonorName] = useState("");
  const [note, setNote] = useState("");
  const [giving, setGiving] = useState(false);
  const [payMethod, setPayMethod] = useState<PayMethod>("bank");

  const cents = custom ? Math.round(Number(custom) * 100) : amount;
  const validAmount = Number.isInteger(cents) && cents >= 300 && cents <= 500_000;
  const emailOk = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
  const returnUrl = `${typeof window !== "undefined" ? window.location.origin : ""}/checkout/return?kind=gift&session_id={CHECKOUT_SESSION_ID}`;

  if (giving && validAmount) {
    return (
      <div className="pb-16">
        <PaymentTestModeBanner />
        <div className="px-4 pt-3">
          <button onClick={() => setGiving(false)} className="inline-flex items-center gap-1 text-[13px] text-ink-soft">
            <ArrowLeft className="h-4 w-4" /> Change my gift
          </button>
        </div>
        <p className="px-5 pt-3 text-[13px] text-ink-soft">
          {money(cents)} {frequency === "monthly" ? "a month" : "once"} to {BRAND.name} itself — keeping the light lit.
        </p>
        <div className="mt-3 px-2">
          <LightCheckout
            amountCents={cents}
            frequency={frequency}
            returnUrl={returnUrl}
            email={emailOk ? email : undefined}
            donorName={donorName || undefined}
            note={note || undefined}
            payMethod={payMethod}
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
          <Flame className="h-3 w-3" /> Keeping the light lit
        </p>
        <h1 className="mt-2 font-serif text-[28px] leading-tight text-ink">
          Give to {BRAND.name} itself
        </h1>
        <p className="mt-2 text-[13px] leading-relaxed text-ink-soft">
          Every ask, every answered video, every gift that reaches a mission runs on something —
          servers, storage, and people answering support. There are no ads here and nothing is sold.
          If this place has carried you, you can carry it back.
        </p>
      </header>

      <MyLight />

      <section className="mx-4 mt-4 rounded-2xl border border-brass/35 bg-card p-5 shadow-soft">
        <p className="text-[10px] uppercase tracking-[0.2em] text-brass">Your gift</p>

        <div className="mt-3 grid grid-cols-2 gap-2">
          {(["monthly", "once"] as const).map(f => (
            <button
              key={f}
              onClick={() => setFrequency(f)}
              className={`rounded-xl py-2.5 text-[13px] font-medium transition-colors ${
                frequency === f ? "bg-ink text-paper" : "border border-border bg-paper text-ink-soft"
              }`}
            >
              {f === "monthly" ? "Every month" : "One time"}
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
            placeholder="e.g. 15"
            className="mt-1 w-full rounded-xl border border-border bg-paper px-3 py-2.5 text-[14px] text-ink outline-none placeholder:text-ink-soft/70"
          />
        </label>

        <fieldset className="mt-3">
          <legend className="text-[11px] text-ink-soft">Pay from</legend>
          <div className="mt-1 grid grid-cols-2 gap-2">
            {([
              { key: "bank" as const, label: "Bank account", note: "Best for ongoing support", Icon: Building2 },
              { key: "card" as const, label: "Card", note: "Credit or debit", Icon: CreditCard },
            ]).map(({ key, label, note: methodNote, Icon }) => (
              <button
                key={key}
                type="button"
                onClick={() => setPayMethod(key)}
                aria-pressed={payMethod === key}
                className={`rounded-xl border px-3 py-2.5 text-left ${
                  payMethod === key ? "border-brass bg-brass/10" : "border-border bg-paper"
                }`}
              >
                <span className="flex items-center gap-1.5 text-[13px] text-ink">
                  <Icon className="h-3.5 w-3.5" /> {label}
                </span>
                <span className="mt-0.5 block text-[10.5px] text-ink-soft">{methodNote}</span>
              </button>
            ))}
          </div>
        </fieldset>

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
          <span className="text-[11px] text-ink-soft">A note to us (optional)</span>
          <textarea
            value={note}
            onChange={e => setNote(e.target.value.slice(0, 300))}
            rows={2}
            placeholder="What this place has meant to you."
            className="mt-1 w-full resize-none rounded-xl border border-border bg-paper px-3 py-2.5 text-[13px] text-ink outline-none placeholder:text-ink-soft/70"
          />
        </label>

        <button
          disabled={!validAmount}
          onClick={() => setGiving(true)}
          className="tap-scale mt-4 flex w-full items-center justify-center gap-2 rounded-xl bg-ink py-3 text-[14px] font-medium text-paper disabled:opacity-50"
        >
          <Flame className="h-4 w-4" />
          Keep the light lit {validAmount ? `· ${money(cents)}` : ""} {frequency === "monthly" ? "a month" : ""}
        </button>
        <p className="mt-2.5 text-center text-[11px] leading-snug text-ink-soft">
          This one goes to {BRAND.name} itself, not to a nonprofit, so it isn't tax-deductible.
          Monthly gifts can be stopped here any time. Bank gifts are collected securely through the payment provider.
        </p>
      </section>

      <p className="mt-6 px-8 text-center text-[11px] italic text-ink-soft">
        Giving here buys nothing — no badge, no priority, no place in a list. Your prayers are seen
        exactly the same either way.
      </p>
    </div>
  );
}
