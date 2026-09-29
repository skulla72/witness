import type { KindnessAct } from "@/data/seed";
import { findUser, findKindness, timeAgo } from "@/data/seed";
import { Sparkles, Clock, Waves } from "lucide-react";

export function KindnessCard({ k }: { k: KindnessAct }) {
  const u = findUser(k.user_id);
  const inspired = k.inspired_by_id ? findKindness(k.inspired_by_id) : undefined;
  const inspiredBy = inspired ? findUser(inspired.user_id) : undefined;

  return (
    <article className="rounded-2xl bg-card border border-border shadow-soft overflow-hidden">
      {k.image && (
        <div className="aspect-[4/3] overflow-hidden bg-muted">
          <img src={k.image} alt="" className="h-full w-full object-cover" />
        </div>
      )}
      <div className="p-4">
        <div className="flex items-center gap-2">
          <img src={u.photo} alt="" className="h-8 w-8 rounded-full object-cover" />
          <div className="flex-1 min-w-0">
            <p className="text-[13px] text-ink truncate">{u.name}</p>
            <p className="text-[11px] uppercase tracking-[0.16em] text-brass">{k.kind}</p>
          </div>
          <span className="text-[11px] text-ink-soft">{timeAgo(k.created_at)}</span>
        </div>

        <p className="mt-3 text-[14.5px] leading-snug text-ink">{k.caption}</p>

        {inspiredBy && (
          <p className="mt-3 inline-flex items-center gap-1.5 text-[11px] text-ink-soft italic">
            <Waves className="h-3 w-3 text-sage" /> inspired by {inspiredBy.name}'s kindness
          </p>
        )}

        <div className="mt-4 flex items-center justify-between text-[12px] text-ink-soft">
          {k.cost_minutes != null && (
            <span className="inline-flex items-center gap-1"><Clock className="h-3.5 w-3.5" />{k.cost_minutes} min</span>
          )}
          <div className="ml-auto flex items-center gap-3">
            <span className="inline-flex items-center gap-1 text-brass-deep">
              <Sparkles className="h-3.5 w-3.5" />{k.cheers}
            </span>
            <span className="inline-flex items-center gap-1 text-sage">
              <Waves className="h-3.5 w-3.5" />{k.ripple_count}
            </span>
          </div>
        </div>
      </div>
    </article>
  );
}