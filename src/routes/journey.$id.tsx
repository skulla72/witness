import { createFileRoute, Link, useParams } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { ArrowLeft } from "lucide-react";
import { useSession } from "@/hooks/useSession";
import { loadStory } from "@/lib/prayers";
import { JourneyPlayer } from "@/components/journey/JourneyPlayer";
import { Avatar } from "@/components/Avatar";

export const Route = createFileRoute("/journey/$id")({
  staticData: { sitemap: false },
  component: JourneyPage,
  head: () => ({ meta: [
    { title: "Asked, then answered · Witness" },
    { name: "description", content: "Watch one prayer's whole journey — the ask, the days between, and the answer." },
    { property: "og:title", content: "Asked, then answered · Witness" },
    { property: "og:description", content: "Watch one prayer's whole journey — the ask, the days between, and the answer." },
    { property: "og:type", content: "video.other" },
    { name: "twitter:card", content: "summary" },
  ] }),
});

function JourneyPage() {
  const { id } = useParams({ from: "/journey/$id" });
  const { userId, signedIn } = useSession();
  const q = useQuery({ queryKey: ["story", id, userId ?? "anon"], queryFn: () => loadStory(id, userId ?? null), enabled: userId !== undefined });
  const story = q.data;
  const open = story && story.answer && story.privacy !== "private" && story.answer.privacy !== "private";

  return (
    <div className="mx-auto max-w-md pb-16 pt-4">
      <div className="px-5"><Link to="/" className="inline-flex items-center gap-1.5 text-[13px] text-ink-soft"><ArrowLeft className="h-4 w-4" /> Witness</Link></div>
      {q.isLoading || userId === undefined ? (
        <div className="mx-5 mt-6 aspect-[9/14] animate-pulse rounded-2xl bg-card" />
      ) : open ? (
        <>
          <div className="mx-5 mt-5 flex items-center gap-3">
            <Avatar name={story.author.name} photo={story.author.photo} size={40} />
            <div>
              <p className="text-[15px] font-medium text-ink">{story.author.name}</p>
              <p className="text-[11px] text-ink-soft">{story.category}</p>
            </div>
          </div>
          <JourneyPlayer story={story} shareable />
          <div className="mx-5 mt-6 text-center">
            <Link to="/prayer/$id" params={{ id: story.id }} className="text-[13px] text-brass underline underline-offset-4">Open the full story</Link>
          </div>
        </>
      ) : (
        <div className="mx-5 mt-10 rounded-2xl border border-border bg-card p-6 text-center">
          <p className="font-serif text-[20px] text-ink">This journey isn't open to you yet.</p>
          <p className="mt-2 text-[13px] text-ink-soft">It may be private, or still waiting for its answer.{signedIn === false ? " Signing in may show it." : ""}</p>
          {signedIn === false && <Link to="/login" className="mt-4 inline-block rounded-xl bg-ink px-4 py-2.5 text-[13px] text-paper">Sign in</Link>}
        </div>
      )}
    </div>
  );
}
