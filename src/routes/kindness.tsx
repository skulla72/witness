import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { kindnessActs, communityPulse } from "@/data/seed";
import { KindnessCard } from "@/components/KindnessCard";
import { BRAND } from "@/config/brand";
import { Sparkles, Waves } from "lucide-react";

export const Route = createFileRoute("/kindness")({
  staticData: { sitemap: false },
  component: KindnessPage,
  head: () => ({
    meta: [
      { title: `Kindness · ${BRAND.name}` },
      { name: "description", content: "A live wall of small, real acts of kindness — and the ripples they start." },
    ],
  }),
});

const filters = ["All", "Strangers", "Neighbors", "Anonymous", "Ripples"] as const;

function KindnessPage() {
  const [f, setF] = useState<(typeof filters)[number]>("All");
  const pulse = communityPulse();

  const list = kindnessActs.filter(k => {
    if (f === "All") return true;
    if (f === "Strangers") return k.kind === "stranger";
    if (f === "Neighbors") return k.kind === "neighbor";
    if (f === "Anonymous") return k.kind === "anonymous";
    if (f === "Ripples") return !!k.inspired_by_id;
    return true;
  });

  return (
    <div className="px-4 pt-4">
      <section className="rounded-2xl bg-gratitude border border-border p-5 shadow-soft">
        <span className="text-[10px] uppercase tracking-[0.22em] text-brass">Community pulse</span>
        <h1 className="mt-1 font-serif text-[24px] text-ink leading-tight">
          {pulse.acts} small kindnesses today
        </h1>
        <p className="mt-1.5 text-[13px] text-ink-soft">
          {pulse.ripples} of them sparked another. That's how the world shifts.
        </p>
        <div className="mt-4 grid grid-cols-3 gap-3 text-center">
          <Pulse n={pulse.cheers} label="Cheers" icon={<Sparkles className="h-3.5 w-3.5" />} />
          <Pulse n={pulse.ripples} label="Ripples" icon={<Waves className="h-3.5 w-3.5" />} />
          <Pulse n={pulse.acts} label="Acts" />
        </div>
      </section>

      <div className="mt-5 -mx-1 flex gap-1 overflow-x-auto no-scrollbar">
        {filters.map(t => (
          <button
            key={t}
            onClick={() => setF(t)}
            className={`shrink-0 px-3.5 py-1.5 rounded-full text-[12px] tracking-wide border transition-colors ${
              f === t ? "bg-ink text-paper border-ink" : "bg-card text-ink-soft border-border hover:text-ink"
            }`}
          >
            {t}
          </button>
        ))}
      </div>

      <div className="mt-4 space-y-4">
        {list.map(k => <KindnessCard key={k.id} k={k} />)}
      </div>

      <p className="mt-10 mb-4 text-center font-serif text-[16px] text-ink-soft italic">
        "Kindness multiplies when it's seen."
      </p>
    </div>
  );
}

function Pulse({ n, label, icon }: { n: number; label: string; icon?: React.ReactNode }) {
  return (
    <div className="rounded-xl bg-card border border-border p-3">
      <div className="flex items-center justify-center gap-1 text-brass-deep">
        {icon}<span className="font-serif text-[20px] text-ink">{n.toLocaleString()}</span>
      </div>
      <p className="mt-0.5 text-[10px] uppercase tracking-[0.18em] text-ink-soft">{label}</p>
    </div>
  );
}