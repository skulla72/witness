import { createFileRoute, Link, useNavigate, useParams } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { ArrowLeft, Sparkles, Lock } from "lucide-react";
import { timeAgo } from "@/data/seed";
import { useSession } from "@/hooks/useSession";
import { deleteGratitude, loadGratitudeItem, loadStory } from "@/lib/prayers";
import { Avatar } from "@/components/Avatar";
import { TestimonyMedia } from "@/components/media/TestimonyMedia";
import { AmenButton } from "@/components/gratitude/AmenButton";
import { SafetyMenu } from "@/components/safety/ReportSheet";
import { useTone } from "@/hooks/useTone";
import { categoryForTone } from "@/lib/tone";

export const Route = createFileRoute("/gratitude/$id")({
  staticData: { sitemap: false },
  component: GratitudeDetail,
  head: () => ({ meta: [
    { title: "Gratitude · Witness" },
    { name: "description", content: "One small mercy, kept." },
    { property: "og:title", content: "Gratitude · Witness" },
    { property: "og:description", content: "One small mercy, kept." },
    { property: "og:type", content: "article" },
    { name: "twitter:card", content: "summary" },
  ] }),
});

function GratitudeDetail() {
  const { id } = useParams({ from: "/gratitude/$id" });
  const { userId } = useSession();
  const navigate = useNavigate();
  const qc = useQueryClient();
  const tone = useTone();
  const q = useQuery({ queryKey: ["gratitude", id, userId ?? "anon"], queryFn: () => loadGratitudeItem(id, userId ?? null), enabled: userId !== undefined });
  const g = q.data;
  const linkedQ = useQuery({ queryKey: ["story", g?.linked_prayer_id, userId ?? "anon"], queryFn: () => loadStory(g!.linked_prayer_id!, userId ?? null), enabled: !!g?.linked_prayer_id });

  if (q.isLoading || userId === undefined) {
    return <div className="px-4 pt-6"><div className="aspect-square rounded-2xl bg-card border border-border animate-pulse" /></div>;
  }
  if (!g) {
    return (
      <div className="px-6 pt-10 text-center">
        <p className="font-serif text-[20px] text-ink-soft">This gratitude isn't available.</p>
        <Link to="/gratitude" className="mt-4 inline-block text-brass">Back</Link>
      </div>
    );
  }
  const linked = linkedQ.data;
  const isOwn = g.user_id === userId;

  const remove = async () => {
    try {
      await deleteGratitude(g.id);
      qc.invalidateQueries({ queryKey: ["gratitude"] });
      toast.success("Removed.");
      navigate({ to: "/gratitude" });
    } catch { toast.error("Couldn't remove that."); }
  };

  return (
    <div className="bg-gratitude min-h-full pb-10">
      <div className="px-4 pt-3 flex items-center justify-between">
        <Link to="/gratitude" className="inline-flex items-center gap-1 text-ink-soft text-[13px]">
          <ArrowLeft className="h-4 w-4" /> Back
        </Link>
        <SafetyMenu targetType="gratitude" targetId={g.id} authorId={g.user_id} onRemove={remove} />
      </div>

      {g.type === "text" ? (
        <div className="mt-4 mx-4 rounded-2xl p-10 min-h-[340px] grid place-items-center text-center" style={{ backgroundColor: g.bg_color }}>
          <p className="font-serif text-[26px] leading-snug text-ink">"{g.caption}"</p>
        </div>
      ) : (
        <div className="mt-4 mx-4 rounded-2xl overflow-hidden bg-paper-warm">
          <TestimonyMedia path={g.media_path} type={g.type === "photo" ? "image" : g.type === "voice" ? "audio" : "video"} className="w-full aspect-square object-cover" />
        </div>
      )}

      <div className="px-5 mt-4 flex items-center gap-3">
        <Link to="/person/$id" params={{ id: g.user_id }} className="flex items-center gap-3">
          <Avatar name={g.author.name} photo={g.author.photo} size={40} />
          <div>
            <p className="font-medium text-[14px] text-ink">{isOwn ? "You" : g.author.name}</p>
            <p className="text-[11px] text-ink-soft">{timeAgo(g.created_at)}{g.privacy === "private" ? " · private" : ""}</p>
          </div>
        </Link>
      </div>

      {g.type !== "text" && g.caption && (
        <p className="px-5 mt-3 font-serif text-[17px] text-ink leading-snug">"{g.caption}"</p>
      )}

      {g.privacy === "community" && (
        <div className="mx-5 mt-5 max-w-sm">
          <AmenButton gratitudeId={g.id} authorId={g.user_id} privacy={g.privacy} amened={!!g.amened} full />
        </div>
      )}

      {linked && (
        <Link to="/prayer/$id" params={{ id: linked.id }} className="mx-4 mt-5 block bg-card border border-brass/40 rounded-xl p-4">
          <p className="text-[10px] uppercase tracking-[0.2em] text-brass inline-flex items-center gap-1">
            <Sparkles className="h-3 w-3" /> {tone.faith
              ? linked.answer ? "A prayer He answered" : "The prayer behind this"
              : linked.answer ? "A hope that came through" : "The hope behind this"}
          </p>
          <p className="mt-2 font-serif text-[15px] text-ink leading-snug">"{linked.ask_caption || (tone.faith ? "Video prayer" : "Video hope")}"</p>
          <p className="mt-1 text-[11px] text-ink-soft">{categoryForTone(linked.category, tone)} · {timeAgo(linked.ask_created_at)}</p>
        </Link>
      )}

      {g.privacy === "private" && (
        <p className="mx-5 mt-6 text-center text-[12px] text-ink-soft inline-flex w-[calc(100%-2.5rem)] items-center justify-center gap-1.5"><Lock className="h-3 w-3" /> Kept just for you.</p>
      )}
    </div>
  );
}
