import { Link } from "@tanstack/react-router";
import { CalendarHeart, ArrowRight, Sparkles } from "lucide-react";
import type { Story } from "@/lib/prayers";

/** "A year ago today" — memory is a gentler hook than novelty. Real asks only. */
export function AnniversaryCard({ stories, userId }: { stories: Story[]; userId: string | null }) {
  if (!userId) return null;
  const now = new Date();
  const hit = stories.find(s => {
    if (s.user_id !== userId) return false;
    const d = new Date(s.ask_created_at);
    const years = now.getUTCFullYear() - d.getUTCFullYear();
    return years >= 1 && d.getUTCMonth() === now.getUTCMonth() && d.getUTCDate() === now.getUTCDate();
  });
  if (!hit) return null;
  const years = now.getUTCFullYear() - new Date(hit.ask_created_at).getUTCFullYear();

  return (
    <Link
      to="/prayer/$id"
      params={{ id: hit.id }}
      className="rise-in tap-scale mt-3 block overflow-hidden rounded-3xl border border-border bg-gradient-to-br from-[oklch(0.2_0.022_60)] to-[oklch(0.14_0.02_60)] p-5 shadow-lift"
    >
      <div className="flex items-center gap-2">
        <CalendarHeart className="h-3.5 w-3.5 text-brass-light" />
        <span className="text-[10px] uppercase tracking-[0.22em] text-brass-light">{years === 1 ? "One year ago today" : `${years} years ago today`}</span>
      </div>
      <p className="mt-2.5 font-serif text-[19px] leading-snug text-paper">"{hit.ask_caption || "You brought a video ask."}"</p>
      {hit.answer && (
        <p className="mt-2 inline-flex items-center gap-1.5 text-[12.5px] text-paper/70">
          <Sparkles className="h-3.5 w-3.5 text-brass-light" /> You marked it answered.
        </p>
      )}
      <p className="mt-4 inline-flex items-center gap-1 text-[11.5px] uppercase tracking-[0.18em] text-paper/80">
        Read it again <ArrowRight className="h-3.5 w-3.5" />
      </p>
    </Link>
  );
}
