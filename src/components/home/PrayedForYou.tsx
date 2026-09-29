import { Link } from "@tanstack/react-router";
import { Heart, ArrowRight } from "lucide-react";
import { Avatar } from "@/components/Avatar";
import type { PrayedForMe } from "@/lib/home";
import { useTone } from "@/hooks/useTone";

function kindLabels(faith: boolean): Record<PrayedForMe["kind"], string> {
  return {
    tap: faith ? "prayed for you" : "is standing with you",
    word: "wrote you encouragement",
    video: faith ? "sent you a video prayer" : "sent you a video message",
    voice: faith ? "left you a voice prayer" : "left you a voice message",
  };
}

/**
 * The reciprocity loop — the strongest honest hook in the app.
 * Not "12 likes". Real people, named, who carried your ask.
 */
export function PrayedForYou({ items, total }: { items: PrayedForMe[]; total: number }) {
  const tone = useTone();
  const kindLabel = kindLabels(tone.faith);
  if (!items.length) return null;
  const top = items.slice(0, 4);
  const lead = items[0];

  return (
    <Link
      to="/prayer/$id"
      params={{ id: lead.prayer_id }}
      className="rise-in tap-scale mt-4 block rounded-3xl border border-flame/25 bg-card p-4 shadow-soft"
    >
      <div className="flex items-center gap-2">
        <Heart className="h-3.5 w-3.5 text-flame" strokeWidth={2} />
        <span className="text-[10px] uppercase tracking-[0.2em] text-flame">While you were away</span>
      </div>

      <div className="mt-3 grid grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-3">
        <div className="flex -space-x-2.5">
          {top.map(p => (
            <Avatar key={p.id} name={p.author.name} photo={p.author.photo} size={36} className="border-2 border-card" />
          ))}
        </div>
        <div className="min-w-0 leading-tight">
          <p className="truncate font-serif text-[15px] text-ink">
            {lead.author.name.split(" ")[0]} {kindLabel[lead.kind]}
          </p>
          <p className="truncate text-[11.5px] text-ink-soft">
            {total > 1 ? `+ ${total - 1} ${total - 1 === 1 ? "other" : "others"} · recently` : "recently"}
          </p>
        </div>
        <ArrowRight className="h-4 w-4 shrink-0 text-ink-soft" />
      </div>

      {lead.note && (
        <p className="mt-3 border-l-2 border-flame/50 pl-3 text-[12.5px] italic text-ink-soft">"{lead.note}"</p>
      )}
    </Link>
  );
}
