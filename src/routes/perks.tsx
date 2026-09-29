import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { ArrowLeft, ArrowRight, Flame, Loader2 } from "lucide-react";
import { BRAND } from "@/config/brand";
import { useSession } from "@/hooks/useSession";
import { getStripeEnvironment } from "@/lib/stripe";
import { myRoles } from "@/lib/prayers";
import { formatThreshold, tiersFor, type Ledger } from "@/lib/perks";
import { getMyStanding, type LedgerView, type MyStanding } from "@/lib/perks.functions";
import { StandingCard } from "@/components/perks/StandingCard";
import { GiftPick } from "@/components/perks/GiftPick";

export const Route = createFileRoute("/perks")({
  staticData: { sitemap: false },
  component: Perks,
  head: () => ({
    meta: [
      { title: `Choose your thank-you gift · ${BRAND.name}` },
      { name: "description", content: "Two ledgers — Senders who give money, Goers who give hours. Each rung you reach unlocks a thank-you gift to choose, or send back to the mission." },
      { property: "og:title", content: `Choose your thank-you gift · ${BRAND.name}` },
      { property: "og:description", content: "Senders and Goers — one rung at a time, a gift to choose at each." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
});

function safeEnv(): "sandbox" | "live" {
  try { return getStripeEnvironment(); } catch { return "sandbox"; }
}

function Perks() {
  const { userId, signedIn } = useSession();
  const qc = useQueryClient();
  const env = safeEnv();

  const standingQ = useQuery({
    queryKey: ["standing", userId],
    queryFn: () => getMyStanding({ data: { environment: env } }),
    enabled: !!userId,
  });
  const rolesQ = useQuery({ queryKey: ["roles", userId], queryFn: () => myRoles(userId!), enabled: !!userId });
  const isAdmin = (rolesQ.data ?? []).includes("admin");

  if (signedIn === false) {
    return (
      <div className="px-6 pt-16 text-center">
        <p className="font-serif text-[22px] text-ink">Sign in to see your standing.</p>
        <Link to="/login" className="mt-5 inline-block rounded-full bg-ink px-5 py-2.5 text-[13px] text-paper">Sign in</Link>
      </div>
    );
  }

  const s = standingQ.data;
  const refresh = () => qc.invalidateQueries({ queryKey: ["standing"] });

  return (
    <div className="pb-16">
      <div className="px-4 pt-3">
        <Link to="/giving" className="inline-flex items-center gap-1 text-[13px] text-ink-soft"><ArrowLeft className="h-4 w-4" /> Giving</Link>
      </div>
      <header className="px-5 pt-3">
        <p className="text-[11px] uppercase tracking-[0.22em] text-brass">Thank-you gifts</p>
        <h1 className="mt-2 font-serif text-[28px] leading-tight text-ink">Choose your thank-you gift</h1>
        <p className="mt-2 text-[13px] leading-relaxed text-ink-soft">
          Two ledgers, kept apart: Senders give money, Goers give hours. Each rung you reach unlocks a gift — pick it, pick a lower rung's, or send it back to the mission and light a candle on the wall.
        </p>
      </header>

      {standingQ.isLoading || !s ? (
        <div className="flex justify-center py-12"><Loader2 className="h-5 w-5 animate-spin text-ink-soft" /></div>
      ) : (
        <>
          <LedgerSection ledger="sender" view={s.sender} standing={s} env={env} onChanged={refresh} />
          <LedgerSection ledger="goer" view={s.goer} standing={s} env={env} onChanged={refresh} />
        </>
      )}

      <div className="mt-8 px-4">
        <Link to="/wall" className="tap-scale flex items-center gap-3 rounded-2xl border border-brass/40 bg-card p-4 shadow-soft">
          <span className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-brass/15"><Flame className="h-4 w-4 text-brass-deep" /></span>
          <span className="min-w-0 flex-1">
            <span className="block font-serif text-[15px] leading-tight text-ink">The wall</span>
            <span className="mt-0.5 block text-[11.5px] leading-snug text-ink-soft">Every candle lit by someone who sent their gift back to the mission.</span>
          </span>
          <ArrowRight className="h-4 w-4 shrink-0 text-ink-soft" />
        </Link>
        {isAdmin && (
          <Link to="/admin/gifts" className="mt-3 block text-center text-[12px] text-brass">Team: gift catalog & orders</Link>
        )}
      </div>

      <p className="mt-6 px-8 text-center text-[11px] italic text-ink-soft">
        Money and hours never mix into one score. Gifts never change how prayers are seen.
      </p>
    </div>
  );
}

function LedgerSection({ ledger, view, standing, env, onChanged }: { ledger: Ledger; view: LedgerView; standing: MyStanding; env: "sandbox" | "live"; onChanged: () => void }) {
  const ladder = tiersFor(standing.tiers, ledger);
  const firstGift = ladder.find(t => t.gifts);
  return (
    <section className="mt-6 px-4">
      <h2 className="mb-2 px-1 font-serif text-[13px] uppercase tracking-[0.18em] text-ink-soft">
        {ledger === "sender" ? "Senders · what you've given" : "Goers · hours you've served"}
      </h2>
      <StandingCard ledger={ledger} total={view.total} tiers={standing.tiers} />
      {ledger === "goer" && standing.hoursSelf > 0 && (
        <p className="mt-1.5 px-1 text-[11px] text-ink-soft">{standing.hoursSelf.toLocaleString()} more hours are self-reported and waiting on a leader's confirmation.</p>
      )}

      <div className="mt-4 space-y-5">
        {view.picks.length === 0 ? (
          <p className="rounded-2xl border border-dashed border-border p-4 text-center text-[12.5px] text-ink-soft">
            {firstGift
              ? `Your first thank-you gift unlocks at ${formatThreshold(ledger, Number(firstGift.threshold))} ${ledger === "sender" ? "given" : "verified"}.`
              : "No gift rungs yet."}{" "}
            {ledger === "sender" ? <Link to="/needs" className="text-brass">Give to a need</Link> : <Link to="/hours" className="text-brass">Log hours served</Link>}
          </p>
        ) : (
          view.picks.map(p => (
            <GiftPick
              key={p.earnedTier.id}
              ledger={ledger}
              pick={p}
              tiers={standing.tiers}
              options={standing.options}
              receivedOptionIds={standing.receivedOptionIds}
              environment={env}
              onChanged={onChanged}
            />
          ))
        )}
      </div>
    </section>
  );
}
