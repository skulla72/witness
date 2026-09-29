import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { ArrowLeft, Clapperboard, Camera, Check, CalendarDays } from "lucide-react";
import { BRAND } from "@/config/brand";
import {
  loadStories,
  weekStart,
  PHASE_LABEL,
  PHASE_HINT,
  SHOOT_STATUS_LABEL,
  STORY_STATUS_LABEL,
  type ShootPhase,
  type StoryOnBoard,
} from "@/lib/needs";

const DAY = new Intl.DateTimeFormat("en-US", { weekday: "short", month: "short", day: "numeric" });
const WEEK = new Intl.DateTimeFormat("en-US", { month: "long", day: "numeric" });

export const Route = createFileRoute("/needs/stories")({
  staticData: { sitemap: false },
  component: StoriesHub,
  head: () => ({
    meta: [
      { title: `Filming schedule — the week's story · ${BRAND.name}` },
      {
        name: "description",
        content:
          "Which need is being filmed this week, who is holding the camera, and which visits — before, during, after — are still to capture.",
      },
      { property: "og:title", content: `Filming schedule · ${BRAND.name}` },
      { property: "og:description", content: "The week's need, the crew, and the three visits that tell the story." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
});

function StoriesHub() {
  const storiesQ = useQuery({ queryKey: ["needs", "stories"], queryFn: () => loadStories() });
  const stories = storiesQ.data ?? [];
  const thisWeek = weekStart();
  const current = stories.filter(s => s.story.week_of >= thisWeek);
  const past = stories.filter(s => s.story.week_of < thisWeek);

  return (
    <div className="pb-16">
      <div className="px-4 pt-3">
        <Link to="/needs" className="inline-flex items-center gap-1 text-[13px] text-ink-soft">
          <ArrowLeft className="h-4 w-4" /> Needs
        </Link>
      </div>

      <header className="px-5 pt-4">
        <p className="inline-flex items-center gap-1.5 text-[11px] uppercase tracking-[0.22em] text-brass">
          <Clapperboard className="h-3 w-3" /> Told properly
        </p>
        <h1 className="mt-2 font-serif text-[30px] leading-tight text-ink">Filming schedule</h1>
        <p className="mt-2 text-[13px] leading-relaxed text-ink-soft">
          One need each week gets a camera: the leak before, the hands during, the family after.
          Posting a before, progress, or after update marks that visit captured.
        </p>
        <Link to="/film/queue" className="mt-3 inline-flex items-center gap-1.5 rounded-full border border-border px-3.5 py-1.5 text-[12.5px] text-ink">
          <Camera className="h-3.5 w-3.5" /> Behind the camera — your queue
        </Link>
      </header>


      <section className="mt-6 space-y-3 px-4">
        {storiesQ.isLoading ? (
          <div className="h-44 animate-pulse rounded-2xl border border-border bg-card" />
        ) : stories.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-border p-6 text-center">
            <p className="text-[13.5px] text-ink-soft">
              Nothing booked yet. Open a need and schedule the week's visits.
            </p>
            <Link to="/needs" className="mt-3 inline-block rounded-full bg-ink px-4 py-2 text-[12.5px] text-paper">
              Find a need
            </Link>
          </div>
        ) : (
          <>
            <SectionLabel label={current.length ? "This week and ahead" : "Ahead"} />
            {current.length === 0 ? (
              <p className="px-1 text-[12.5px] text-ink-soft">Nothing booked for this week yet.</p>
            ) : (
              current.map(s => <StoryRow key={s.story.id} entry={s} />)
            )}
            {past.length > 0 && (
              <>
                <SectionLabel label="Already filmed" />
                {past.map(s => <StoryRow key={s.story.id} entry={s} />)}
              </>
            )}
          </>
        )}
      </section>

      <p className="mt-8 px-8 text-center text-[11px] italic text-ink-soft">
        Nobody is filmed without saying yes. Faces can be kept out of the frame at any visit.
      </p>
    </div>
  );
}

function SectionLabel({ label }: { label: string }) {
  return <p className="px-1 pt-2 text-[10px] uppercase tracking-[0.2em] text-ink-soft">{label}</p>;
}

function StoryRow({ entry }: { entry: StoryOnBoard }) {
  const { story, shoots, need } = entry;
  const captured = shoots.filter(s => s.status === "captured").length;
  const remaining = shoots.filter(s => s.status === "scheduled");

  return (
    <article className="rounded-2xl border border-border bg-card p-4">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <Link to="/needs/$id" params={{ id: need.id }} className="block truncate text-[15px] font-medium text-ink">
            {need.title}
          </Link>
          <p className="mt-0.5 text-[11.5px] text-ink-soft">
            {need.city}
            {need.region ? `, ${need.region}` : ""}
            {need.org ? ` · ${need.org.name}` : ""}
          </p>
        </div>
        <span className="shrink-0 rounded-full border border-border px-2.5 py-0.5 text-[11px] text-ink-soft">
          {STORY_STATUS_LABEL[story.status] ?? story.status}
        </span>
      </div>

      <p className="mt-2.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-[11.5px] text-ink-soft">
        <span className="inline-flex items-center gap-1">
          <CalendarDays className="h-3.5 w-3.5" strokeWidth={1.8} /> Week of {WEEK.format(new Date(`${story.week_of}T12:00:00`))}
        </span>
        <span className="inline-flex items-center gap-1">
          <Camera className="h-3.5 w-3.5" strokeWidth={1.8} />
          {story.videographer_name?.trim() ? story.videographer_name : "Camera unassigned"}
        </span>
        <span>
          {captured} of {shoots.length || 3} captured
        </span>
      </p>

      <ul className="mt-3 space-y-1.5">
        {shoots.map(shoot => {
          const done = shoot.status === "captured";
          return (
            <li key={shoot.id} className="flex items-start gap-2">
              <span
                className={`mt-0.5 grid h-5 w-5 shrink-0 place-items-center rounded-full ${
                  done ? "bg-hope/15 text-hope" : "bg-secondary text-ink-soft"
                }`}
              >
                {done ? <Check className="h-3 w-3" strokeWidth={2.4} /> : <Camera className="h-3 w-3" strokeWidth={1.8} />}
              </span>
              <span className="min-w-0 flex-1 leading-tight">
                <span className="block text-[12.5px] text-ink">
                  {PHASE_LABEL[shoot.phase as ShootPhase]} · {DAY.format(new Date(shoot.scheduled_for))}
                  <span className="ml-1.5 text-[11px] text-ink-soft">{SHOOT_STATUS_LABEL[shoot.status] ?? shoot.status}</span>
                </span>
                <span className="block text-[11px] text-ink-soft">
                  {shoot.note?.trim() ? shoot.note : PHASE_HINT[shoot.phase as ShootPhase]}
                </span>
              </span>
            </li>
          );
        })}
      </ul>

      {remaining.length > 0 && (
        <Link
          to="/needs/$id"
          params={{ id: need.id }}
          className="mt-3 inline-block rounded-full bg-ink px-4 py-2 text-[12.5px] text-paper"
        >
          Post the {PHASE_LABEL[remaining[0]!.phase as ShootPhase].toLowerCase()} update
        </Link>
      )}
    </article>
  );
}
