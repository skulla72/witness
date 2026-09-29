import type { HelpRequest } from "@/data/seed";
import { findUser, helpCategoryColor, timeAgo } from "@/data/seed";
import { MapPin, HandHeart, Lock } from "lucide-react";

const statusLabel: Record<HelpRequest["status"], string> = {
  open: "Needs help",
  matched: "Being helped",
  fulfilled: "Helped — thank you",
  closed: "Closed",
};

export function HelpCard({ h }: { h: HelpRequest }) {
  const u = findUser(h.user_id);
  const accent = helpCategoryColor[h.category];
  const fulfilled = h.status === "fulfilled" || h.status === "matched";

  return (
    <article className="rounded-2xl bg-card border border-border shadow-soft overflow-hidden">
      <div className="h-1.5 w-full" style={{ background: accent }} />
      <div className="p-4">
        <div className="flex items-start gap-3">
          <img src={u.photo} alt="" className="h-9 w-9 rounded-full object-cover" />
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <p className="text-[13px] text-ink truncate">
                {h.is_anonymous ? "Someone nearby" : u.name}
              </p>
              {h.privacy !== "public" && <Lock className="h-3 w-3 text-ink-soft" />}
            </div>
            <p className="text-[11px] uppercase tracking-[0.16em]" style={{ color: accent }}>
              {h.category}
            </p>
          </div>
          <span
            className={`text-[10px] uppercase tracking-[0.16em] px-2 py-1 rounded-full border ${
              fulfilled
                ? "border-sage text-sage"
                : "border-brass text-brass"
            }`}
          >
            {statusLabel[h.status]}
          </span>
        </div>

        <h3 className="mt-3 font-serif text-[18px] text-ink leading-tight">{h.title}</h3>
        <p className="mt-1.5 text-[14px] text-ink-soft leading-snug line-clamp-3">{h.story}</p>

        <div className="mt-4 flex items-center justify-between text-[12px] text-ink-soft">
          <div className="flex items-center gap-3">
            {h.location_hint && (
              <span className="inline-flex items-center gap-1"><MapPin className="h-3.5 w-3.5" />{h.location_hint}</span>
            )}
            <span>{timeAgo(h.created_at)}</span>
          </div>
          <span className="inline-flex items-center gap-1 text-ink">
            <HandHeart className="h-3.5 w-3.5" />{h.offers_count} offered
          </span>
        </div>
      </div>
    </article>
  );
}