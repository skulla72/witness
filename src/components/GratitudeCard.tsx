import { Link } from "@tanstack/react-router";
import { Mic, Sparkles, Lock } from "lucide-react";
import { timeAgo } from "@/data/seed";
import type { GratitudeItem } from "@/lib/prayers";
import { Avatar } from "@/components/Avatar";
import { TestimonyMedia } from "@/components/media/TestimonyMedia";
import { SafetyMenu } from "@/components/safety/ReportSheet";
import { AmenButton } from "@/components/gratitude/AmenButton";
import { useTone } from "@/hooks/useTone";

export function GratitudeCard({ g }: { g: GratitudeItem }) {
  const tone = useTone();
  return (
    <article className="relative overflow-hidden rounded-2xl border border-border bg-card shadow-soft">
      <Link to="/gratitude/$id" params={{ id: g.id }} className="block">
      {g.type === "photo" || g.type === "video" ? (
        <div className="relative aspect-square bg-paper-warm overflow-hidden">
          <TestimonyMedia path={g.media_path} type={g.type === "photo" ? "image" : "video"} controls={false} autoPlay={g.type === "video"} loop={g.type === "video"} className="absolute inset-0 h-full w-full object-cover" />
          <p className="absolute bottom-0 left-0 right-0 p-4 bg-gradient-to-t from-ink/80 to-transparent text-paper font-serif text-[15px] leading-snug pointer-events-none">
            "{g.caption}"
          </p>
        </div>
      ) : g.type === "voice" ? (
        <div className="relative aspect-square bg-gratitude-warm overflow-hidden grid place-items-center p-5 text-center">
          <div>
            <div className="mx-auto h-14 w-14 rounded-full bg-paper/95 grid place-items-center shadow-lift">
              <Mic className="h-5 w-5 text-terracotta" />
            </div>
            <p className="mt-4 font-serif text-[15px] leading-snug text-ink">"{g.caption}"</p>
          </div>
        </div>
      ) : (
        <div
          className="aspect-square p-5 grid place-items-center text-center"
          style={{ backgroundColor: g.bg_color ?? "var(--gratitude-warm)" }}
        >
          <p className="font-serif text-[20px] leading-snug text-ink">"{g.caption}"</p>
        </div>
      )}

      <div className="flex items-center justify-between gap-2 px-4 py-3 pr-11">
        <div className="flex min-w-0 items-center gap-2.5">
          <Avatar name={g.author.name} photo={g.author.photo} size={28} />
          <div className="min-w-0 leading-tight">
            <p className="truncate text-[12px] font-medium text-ink">{g.author.name}</p>
            <p className="truncate text-[10px] tracking-wide text-ink-soft">{timeAgo(g.created_at)}</p>
          </div>
        </div>
        <div className="flex shrink-0 items-center gap-2">
          <AmenButton gratitudeId={g.id} authorId={g.user_id} privacy={g.privacy} amened={!!g.amened} />
          <div className="flex flex-col items-end gap-0.5 text-[11px] text-ink-soft">
            {g.linked_prayer_id && (
              <span className="inline-flex items-center gap-1 text-brass">
                <Sparkles className="h-3 w-3" /> {tone.faith ? "answered" : "came through"}
              </span>
            )}
            {g.privacy === "private" && (
              <span className="inline-flex items-center gap-1"><Lock className="h-3 w-3" /> just you</span>
            )}
          </div>
        </div>
      </div>
      </Link>
      {g.privacy === "community" && (
        <div className="absolute bottom-1.5 right-2">
          <SafetyMenu targetType="gratitude" targetId={g.id} authorId={g.user_id} />
        </div>
      )}
    </article>
  );
}
