import type { Encouragement } from "@/data/seed";
import { findUser, timeAgo } from "@/data/seed";
import { Heart, Repeat2, Quote } from "lucide-react";

const toneBg: Record<Encouragement["tone"], string> = {
  uplift: "bg-gratitude-warm",
  empathy: "bg-paper-warm",
  perspective: "bg-card",
  celebration: "bg-gratitude",
};

const toneLabel: Record<Encouragement["tone"], string> = {
  uplift: "Uplift",
  empathy: "Empathy",
  perspective: "Perspective",
  celebration: "Celebration",
};

export function EncouragementCard({ e }: { e: Encouragement }) {
  const u = findUser(e.user_id);
  return (
    <article className={`relative rounded-2xl border border-border p-5 shadow-soft ${toneBg[e.tone]}`}>
      <Quote className="absolute top-3 right-3 h-5 w-5 text-brass/50" strokeWidth={1.5} />
      <span className="text-[10px] uppercase tracking-[0.2em] text-brass">{toneLabel[e.tone]}</span>
      <p className="mt-2 font-serif text-[19px] leading-snug text-ink">"{e.text}"</p>
      <div className="mt-4 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <img src={u.photo} alt="" className="h-7 w-7 rounded-full object-cover" />
          <span className="text-[12px] text-ink-soft">{u.name} · {timeAgo(e.created_at)}</span>
        </div>
        <div className="flex items-center gap-3 text-[12px] text-ink-soft">
          <span className="inline-flex items-center gap-1"><Heart className="h-3.5 w-3.5" />{e.hearts}</span>
          <span className="inline-flex items-center gap-1"><Repeat2 className="h-3.5 w-3.5" />{e.reshared}</span>
        </div>
      </div>
    </article>
  );
}