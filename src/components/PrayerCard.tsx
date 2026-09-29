import { Link } from "@tanstack/react-router";
import { useState } from "react";
import { toast } from "sonner";
import { Heart, MessageCircle, Sparkles, Flame, Share2 } from "lucide-react";
import { statusLabel, timeAgo } from "@/data/seed";
import { prayFor, type Story } from "@/lib/prayers";
import { useSession } from "@/hooks/useSession";
import { Avatar } from "@/components/Avatar";
import { TestimonyMedia } from "@/components/media/TestimonyMedia";
import { VoicePrayer } from "@/components/media/VoicePrayer";
import { SafetyMenu } from "@/components/safety/ReportSheet";
import { ShareTestimonySheet, shareReasonFor } from "@/components/share/ShareTestimony";
import { useTone } from "@/hooks/useTone";
import { categoryForTone } from "@/lib/tone";

const statusTone: Record<string, string> = {
  answered_yes: "bg-brass/15 text-[oklch(0.45_0.1_70)] border-brass/40",
  answered_differently: "bg-[oklch(0.9_0.04_130)] text-[oklch(0.38_0.07_130)] border-[oklch(0.7_0.08_130)]",
  ongoing: "bg-secondary text-ink-soft border-border",
  declined: "bg-[oklch(0.94_0.02_30)] text-[oklch(0.42_0.1_30)] border-[oklch(0.78_0.06_30)]",
  open: "bg-secondary text-ink-soft border-border",
};

export function PrayerCard({ prayer, onRemoved }: { prayer: Story; onRemoved?: (id: string) => void }) {
  const { userId } = useSession();
  const tone = useTone();
  const { author } = prayer;
  const showAnon = prayer.is_anonymous && prayer.user_id !== userId;
  const hasAnswer = !!prayer.answer;
  const isText = !prayer.ask_media_path;
  const isVoice = prayer.ask_kind === "voice" && !!prayer.ask_media_path;
  const [prayed, setPrayed] = useState(prayer.i_prayed);
  const [count, setCount] = useState(prayer.intercession_count);
  const [sharing, setSharing] = useState(false);
  const shareReason = prayer.user_id === userId ? shareReasonFor({ ...prayer, intercession_count: count }) : null;


  const tapPray = async () => {
    if (!userId) { toast.error(tone.say("Sign in to pray with the community.", "Sign in to stand with them.")); return; }
    if (prayed) return;
    setPrayed(true); setCount(c => c + 1);
    try {
      const added = await prayFor(prayer.id, userId);
      if (added) toast.success(tone.say("They'll know you're praying.", "They'll know you're standing with them."));
    } catch {
      setPrayed(false); setCount(c => c - 1);
      toast.error("Couldn't record that. Try again.");
    }
  };

  const meta = `${categoryForTone(prayer.category, tone)} · ${timeAgo(prayer.ask_created_at)}`;

  return (
    <article className="bg-card rounded-2xl border border-border shadow-soft overflow-hidden">
      <header className="flex items-center justify-between px-4 pt-4">
        {showAnon || !author.id ? (
          <div className="flex items-center gap-3">
            <Avatar name="Anonymous" />
            <div className="leading-tight">
              <p className="font-medium text-[14px] text-ink">Anonymous</p>
              <p className="text-[11px] text-ink-soft tracking-wide">{meta}</p>
            </div>
          </div>
        ) : (
          <Link to="/person/$id" params={{ id: author.id }} className="flex items-center gap-3 group/person">
            <Avatar name={author.name} photo={author.photo} />
            <div className="leading-tight">
              <p className="font-medium text-[14px] text-ink group-hover/person:text-brass transition-colors">{author.name}</p>
              <p className="text-[11px] text-ink-soft tracking-wide">{meta}{prayer.is_anonymous ? " · anonymous to others" : ""}</p>
            </div>
          </Link>
        )}
        <div className="flex items-center gap-1">
          {hasAnswer && (
            <span className={`text-[10px] uppercase tracking-[0.14em] px-2.5 py-1 rounded-full border ${statusTone[prayer.status]}`}>
              {statusLabel[prayer.status]}
            </span>
          )}
          <SafetyMenu targetType="prayer" targetId={prayer.id} authorId={prayer.user_id} onRemove={onRemoved ? () => onRemoved(prayer.id) : undefined} />
        </div>
      </header>

      <Link to="/prayer/$id" params={{ id: prayer.id }} className="block mt-3 group">
        {isText ? (
          <div
            className="relative aspect-[9/12] overflow-hidden flex items-center justify-center p-6"
            style={{ background: prayer.ask_bg ?? "oklch(0.9 0.04 75)" }}
          >
            <span className="absolute top-3 left-3 text-[10px] uppercase tracking-[0.18em] text-ink/70 bg-paper/70 px-2 py-1 rounded">
              {tone.say("The Ask", "The Hope")} · written
            </span>
            {hasAnswer && (
              <span className="absolute top-3 right-3 text-[10px] uppercase tracking-[0.18em] text-ink bg-brass/95 px-2 py-1 rounded inline-flex items-center gap-1">
                <Sparkles className="h-3 w-3" /> {tone.answeredTitle}
              </span>
            )}
            <p className="text-ink font-serif text-[20px] leading-snug text-center">"{prayer.ask_caption}"</p>
          </div>
        ) : isVoice ? (
          <div className="relative aspect-[9/12] overflow-hidden">
            <VoicePrayer path={prayer.ask_media_path!} backdropPath={prayer.ask_backdrop_path} bg={prayer.ask_bg} caption={prayer.ask_caption} seconds={prayer.ask_duration} className="absolute inset-0 h-full w-full" />
            <span className={`absolute top-3 left-3 text-[10px] uppercase tracking-[0.18em] px-2 py-1 rounded ${prayer.ask_backdrop_path ? "text-paper/90 bg-ink/50 backdrop-blur" : "text-ink/70 bg-paper/70"}`}>
               {tone.say("The Ask", "The Hope")} · voice
            </span>
            {hasAnswer && (
              <span className="absolute top-3 right-3 text-[10px] uppercase tracking-[0.18em] text-ink bg-brass/95 px-2 py-1 rounded inline-flex items-center gap-1">
                 <Sparkles className="h-3 w-3" /> {tone.answeredTitle}
              </span>
            )}
          </div>
        ) : (
          <div className="relative aspect-[9/12] bg-ink overflow-hidden">
            <TestimonyMedia path={prayer.ask_media_path} type={prayer.ask_media_type} className="absolute inset-0 h-full w-full" controls={false} />
            <div className="absolute inset-x-0 bottom-0 h-1/2 bg-gradient-to-t from-ink/80 to-transparent pointer-events-none" />
            <span className="absolute top-3 left-3 text-[10px] uppercase tracking-[0.18em] text-paper/90 bg-ink/50 backdrop-blur px-2 py-1 rounded">
               {tone.say("The Ask", "The Hope")}
            </span>
            {hasAnswer && (
              <span className="absolute top-3 right-3 text-[10px] uppercase tracking-[0.18em] text-ink bg-brass/95 px-2 py-1 rounded inline-flex items-center gap-1">
                 <Sparkles className="h-3 w-3" /> {tone.answeredTitle}
              </span>
            )}
            {prayer.ask_caption && (
              <p className="absolute bottom-0 left-0 right-0 p-4 text-paper font-serif text-[17px] leading-snug pointer-events-none">
                "{prayer.ask_caption}"
              </p>
            )}
          </div>
        )}
      </Link>

      {prayer.answer && (
        <Link to="/prayer/$id" params={{ id: prayer.id }} className="mx-4 mt-3 flex items-center gap-3 rounded-xl border border-brass/40 bg-brass/10 px-3 py-2.5">
          {prayer.answer.media_path && (
            <span className="relative h-14 w-14 shrink-0 overflow-hidden rounded-lg bg-ink">
              <TestimonyMedia path={prayer.answer.media_path} type={prayer.answer.media_type} className="h-full w-full" controls={false} />
            </span>
          )}
          <span className="min-w-0">
             <p className="text-[10px] uppercase tracking-[0.18em] text-[oklch(0.45_0.1_70)]">{tone.say("The Answer", "What came through")} · {timeAgo(prayer.answer.created_at)}</p>
            <p className="mt-1 text-[13px] text-ink leading-snug line-clamp-2">
               {prayer.answer.caption || (prayer.answer.media_path ? "Watch the reaction." : tone.say("He answered.", "It came through."))}
            </p>
          </span>
        </Link>
      )}

      {!hasAnswer && prayer.user_id === userId && (
        <Link to="/record" search={{ mode: "reaction", prayer: prayer.id }} className="mx-4 mt-3 flex items-center gap-2 rounded-xl border border-brass/40 bg-brass/10 px-3 py-2.5 text-[13px] text-ink">
          <Sparkles className="h-4 w-4 text-brass" />
           {tone.say("Has He answered? Share the answer.", "Did it come through? Share what happened.")}
        </Link>
      )}

      <footer className="flex items-center gap-5 px-4 py-3 text-[13px] text-ink-soft">
        <button onClick={() => void tapPray()} aria-pressed={prayed} className={`inline-flex items-center gap-1.5 transition-colors ${prayed ? "text-brass" : "hover:text-brass"}`}>
          <Heart className="h-4 w-4" strokeWidth={1.5} fill={prayed ? "currentColor" : "none"} />
           <span>{tone.faith ? `${count} praying` : prayed ? "Standing with them" : "Stand with them"}</span>
        </button>
        <Link to="/prayer/$id" params={{ id: prayer.id }} className="inline-flex items-center gap-1.5 hover:text-ink">
          <MessageCircle className="h-4 w-4" strokeWidth={1.5} />
          <span>{prayer.comment_count}</span>
        </Link>
        {shareReason ? (
          <button onClick={() => setSharing(true)} className="ml-auto inline-flex items-center gap-1.5 text-brass hover:text-ink">
            <Share2 className="h-4 w-4" strokeWidth={1.5} />
            <span className="text-[12px] tracking-wide">Share</span>
          </button>
        ) : !hasAnswer && (
          <Link to="/sit/$id" params={{ id: prayer.id }} className="ml-auto inline-flex items-center gap-1.5 text-brass hover:text-ink">
            <Flame className="h-4 w-4" strokeWidth={1.5} />
             <span className="text-[12px] tracking-wide">{tone.say("Sit with", "Encourage")}</span>
          </Link>
        )}
      </footer>
      {shareReason && <ShareTestimonySheet story={{ ...prayer, intercession_count: count }} reason={shareReason} open={sharing} onClose={() => setSharing(false)} />}
    </article>
  );
}
