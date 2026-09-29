import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { ArrowLeft, Flame, Gift, Loader2 } from "lucide-react";
import { BRAND } from "@/config/brand";
import { supabase } from "@/integrations/supabase/client";
import type { Tables } from "@/integrations/supabase/types";

type Entry = Tables<"gift_wall">;

export const Route = createFileRoute("/wall")({
  staticData: { sitemap: false },
  component: Wall,
  head: () => ({
    meta: [
      { title: `The wall — candles for the mission · ${BRAND.name}` },
      { name: "description", content: "Every candle here was lit by someone who sent their thank-you gift back to the mission. Names only — never amounts." },
      { property: "og:title", content: `The wall · ${BRAND.name}` },
      { property: "og:description", content: "Candles lit by people who sent their thank-you gift back to the mission." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
});

function Wall() {
  const q = useQuery({
    queryKey: ["gift-wall"],
    queryFn: async () => {
      const { data, error } = await supabase.from("gift_wall").select("*").order("created_at", { ascending: false }).limit(400);
      if (error) throw error;
      return data as Entry[];
    },
  });
  const candles = (q.data ?? []).filter(e => e.kind === "candle");
  const gifts = (q.data ?? []).filter(e => e.kind === "gift");

  return (
    <div className="pb-16">
      <div className="px-4 pt-3">
        <Link to="/perks" className="inline-flex items-center gap-1 text-[13px] text-ink-soft"><ArrowLeft className="h-4 w-4" /> Thank-you gifts</Link>
      </div>
      <header className="px-5 pt-3">
        <p className="text-[11px] uppercase tracking-[0.22em] text-brass">The wall</p>
        <h1 className="mt-2 font-serif text-[28px] leading-tight text-ink">Candles for the mission</h1>
        <p className="mt-2 text-[13px] leading-relaxed text-ink-soft">
          Each lit candle is someone who reached a rung and sent the gift back into the work instead. Names only. Never amounts, never rankings.
        </p>
      </header>

      {q.isLoading ? (
        <div className="flex justify-center py-12"><Loader2 className="h-5 w-5 animate-spin text-ink-soft" /></div>
      ) : candles.length === 0 ? (
        <p className="mx-4 mt-6 rounded-2xl border border-dashed border-border p-6 text-center text-[13px] text-ink-soft">No candles yet. The first one will glow here.</p>
      ) : (
        <ul className="mx-4 mt-6 grid grid-cols-3 gap-3">
          {candles.map((c, i) => (
            <li key={c.id} className="flex flex-col items-center rounded-2xl border border-brass/30 bg-card px-2 pb-3 pt-4 text-center shadow-soft">
              <span className="relative flex flex-col items-center">
                <Flame className="h-6 w-6 text-brass-deep" strokeWidth={1.6} style={{ animation: `pulse ${2.4 + (i % 5) * 0.3}s ease-in-out infinite` }} />
                <span className="-mt-0.5 h-8 w-3 rounded-b-sm rounded-t-[2px] bg-gradient-to-b from-paper to-brass/40" aria-hidden />
              </span>
              <span className="mt-2 line-clamp-2 text-[11.5px] leading-tight text-ink">{c.display_name}</span>
              <span className="mt-0.5 text-[9.5px] uppercase tracking-[0.14em] text-ink-soft">{c.ledger === "sender" ? "Sender" : "Goer"}</span>
            </li>
          ))}
        </ul>
      )}

      {gifts.length > 0 && (
        <section className="mx-4 mt-8">
          <h2 className="mb-2 px-1 font-serif text-[13px] uppercase tracking-[0.18em] text-ink-soft">Also reached a rung</h2>
          <ul className="flex flex-wrap gap-1.5">
            {gifts.map(g => (
              <li key={g.id} className="inline-flex items-center gap-1 rounded-full border border-border bg-paper px-2.5 py-1 text-[11.5px] text-ink-soft">
                <Gift className="h-3 w-3" /> {g.display_name}
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}
