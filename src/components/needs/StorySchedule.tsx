import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { CalendarClock, Camera, Check, Clapperboard, Link2, Loader2, Send, Video } from "lucide-react";
import {
  bookStory, loadStory, nextShoot, PHASE_HINT, PHASE_LABEL, PHASES, SHOOT_STATUS_LABEL, STORY_STATUS_LABEL,
  updateShoot, updateStory, type ShootPhase, type StoryShoot,
} from "@/lib/needs";
import { approvedVideographers, DELIVERY_LABEL, deliveryState } from "@/lib/film";
import { assignStory, shareStoryWithChurch } from "@/lib/film.functions";
import { NeedMedia } from "@/components/needs/NeedMedia";

const DAY = new Intl.DateTimeFormat("en-US", { weekday: "short", month: "short", day: "numeric" });


/** Monday of the coming week, as a yyyy-mm-dd value for the date input. */
function nextMonday(): string {
  const d = new Date();
  d.setDate(d.getDate() + ((8 - d.getDay()) % 7 || 7));
  return d.toISOString().slice(0, 10);
}

function dateInputValue(iso: string): string {
  return new Date(iso).toISOString().slice(0, 10);
}

export function StorySchedule({ needId, canManage }: { needId: string; canManage: boolean }) {
  const qc = useQueryClient();
  const storyQ = useQuery({ queryKey: ["need-story", needId], queryFn: () => loadStory(needId) });
  const invalidate = () => {
    qc.invalidateQueries({ queryKey: ["need-story", needId] });
    qc.invalidateQueries({ queryKey: ["needs"] });
    qc.invalidateQueries({ queryKey: ["need", needId] });
  };

  if (storyQ.isLoading) {
    return <section className="mx-4 mt-4 h-24 animate-pulse rounded-2xl border border-border bg-card" />;
  }

  const plan = storyQ.data;
  if (!plan) return canManage ? <BookForm needId={needId} onDone={invalidate} /> : null;

  const { story, shoots } = plan;
  const upcoming = nextShoot(shoots);
  const byPhase = (p: ShootPhase) => shoots.find(s => s.phase === p);

  return (
    <section className="mx-4 mt-5 rounded-2xl border border-brass/30 bg-card p-4 shadow-soft">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="inline-flex items-center gap-1.5 text-[10px] uppercase tracking-[0.2em] text-brass">
            <Clapperboard className="h-3.5 w-3.5" /> This week's story
          </p>
          <p className="mt-1.5 text-[13px] leading-relaxed text-ink">
            Week of {DAY.format(new Date(`${story.week_of}T12:00:00Z`))}
            {story.videographer_name ? ` · filmed by ${story.videographer_name}` : ""}
          </p>
          {upcoming && (
            <p className="mt-1 inline-flex items-center gap-1 text-[11.5px] text-ink-soft">
              <CalendarClock className="h-3.5 w-3.5" /> Next visit: {PHASE_LABEL[upcoming.phase as ShootPhase]} on {DAY.format(new Date(upcoming.scheduled_for))}
            </p>
          )}
        </div>
        <span className="shrink-0 rounded-full bg-secondary px-2 py-0.5 text-[10px] uppercase tracking-[0.12em] text-ink-soft">
          {DELIVERY_LABEL[deliveryState(story)] ?? STORY_STATUS_LABEL[story.status] ?? story.status}
        </span>
      </div>

      {story.notes && <p className="mt-2.5 whitespace-pre-line text-[12.5px] leading-relaxed text-ink-soft">{story.notes}</p>}

      {canManage && !story.videographer_id && <AssignPicker storyId={story.id} onDone={invalidate} />}

      <ol className="mt-3.5 space-y-2">
        {PHASES.map(p => {
          const shoot = byPhase(p);
          if (!shoot) return null;
          return <ShootRow key={shoot.id} shoot={shoot} canManage={canManage} onDone={invalidate} />;
        })}
      </ol>

      {story.delivered_at && (
        <div className="mt-3 rounded-xl border border-hope/40 bg-hope/5 p-3">
          <p className="text-[12px] text-ink">The film is in — delivered {DAY.format(new Date(story.delivered_at))}.</p>
          {story.film_path && <NeedMedia path={story.film_path} type="video" className="mt-2 aspect-video w-full rounded-lg" />}
          {story.film_url && (
            <a href={story.film_url} target="_blank" rel="noreferrer" className="mt-2 inline-flex items-center gap-1 text-[12px] text-brass underline">
              <Link2 className="h-3.5 w-3.5" /> Watch the film
            </a>
          )}
          {story.delivery_note && <p className="mt-1.5 whitespace-pre-line text-[11.5px] text-ink-soft">{story.delivery_note}</p>}
          {story.shared_at && <p className="mt-1.5 text-[11px] text-ink-soft">The church was sent the link {DAY.format(new Date(story.shared_at))}.</p>}
          {canManage && !story.shared_at && <ShareLink storyId={story.id} onDone={invalidate} />}
        </div>
      )}

      {canManage && (
        <div className="mt-3 flex flex-wrap gap-2">
          {story.status !== "published" && (
            <button
              onClick={() => updateStory(story.id, { status: story.status === "scheduled" ? "filming" : "published" }).then(invalidate)}
              className="inline-flex items-center gap-1 rounded-full border border-border px-3 py-1.5 text-[11.5px] text-ink"
            >
              <Video className="h-3.5 w-3.5" /> {story.status === "scheduled" ? "Filming has started" : "Mark it published"}
            </button>
          )}
          {story.status !== "canceled" && (
            <button
              onClick={() => { if (confirm("Cancel this week's story?")) updateStory(story.id, { status: "canceled" }).then(invalidate); }}
              className="px-2 py-1.5 text-[11.5px] text-ink-soft"
            >
              Cancel the story
            </button>
          )}
        </div>
      )}

    </section>
  );
}

/** Hand this week's story to someone on the camera roster. */
function AssignPicker({ storyId, onDone }: { storyId: string; onDone: () => void }) {
  const rosterQ = useQuery({ queryKey: ["videographer", "approved"], queryFn: approvedVideographers });
  const assign = useServerFn(assignStory);
  const pick = useMutation({
    mutationFn: (v: { user_id: string; display_name: string }) =>
      assign({ data: { storyId, videographerUserId: v.user_id, videographerName: v.display_name } }),
    onSuccess: () => { toast.success("Assigned. They've been told."); onDone(); },
    onError: (e: Error) => toast.error(e.message || "Couldn't assign that."),
  });
  const roster = rosterQ.data ?? [];

  return (
    <div className="mt-3 rounded-xl border border-border bg-paper p-3">
      <p className="inline-flex items-center gap-1.5 text-[12px] font-medium text-ink">
        <Camera className="h-3.5 w-3.5" /> Who's holding the camera
      </p>
      {rosterQ.isLoading ? (
        <p className="mt-1.5 text-[11.5px] text-ink-soft">Looking at the roster…</p>
      ) : roster.length === 0 ? (
        <p className="mt-1.5 text-[11.5px] text-ink-soft">Nobody is on the roster yet. Our team adds videographers as they come in.</p>
      ) : (
        <div className="mt-2 flex flex-wrap gap-2">
          {roster.map(v => (
            <button
              key={v.id}
              onClick={() => pick.mutate({ user_id: v.user_id, display_name: v.display_name })}
              disabled={pick.isPending}
              className="rounded-full border border-border bg-card px-3 py-1.5 text-[11.5px] text-ink disabled:opacity-50"
            >
              {v.display_name}
              {v.city ? ` · ${v.city}` : ""}
            </button>
          ))}
          {pick.isPending && <Loader2 className="h-3.5 w-3.5 animate-spin self-center text-ink-soft" />}
        </div>
      )}
    </div>
  );
}

function ShareLink({ storyId, onDone }: { storyId: string; onDone: () => void }) {
  const share = useServerFn(shareStoryWithChurch);
  const send = useMutation({
    mutationFn: () => share({ data: { storyId } }),
    onSuccess: () => { toast.success("Link sent to the church."); onDone(); },
    onError: (e: Error) => toast.error(e.message || "Couldn't send the link."),
  });
  return (
    <button
      onClick={() => send.mutate()}
      disabled={send.isPending}
      className="tap-scale mt-3 inline-flex items-center gap-1.5 rounded-full bg-ink px-4 py-2 text-[12.5px] text-paper disabled:opacity-50"
    >
      {send.isPending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Send className="h-3.5 w-3.5" />} Send the link to the church
    </button>
  );
}


function ShootRow({ shoot, canManage, onDone }: { shoot: StoryShoot; canManage: boolean; onDone: () => void }) {
  const phase = shoot.phase as ShootPhase;
  const captured = shoot.status === "captured";
  const skipped = shoot.status === "skipped";
  const reschedule = useMutation({
    mutationFn: (day: string) => updateShoot(shoot.id, { scheduled_for: new Date(`${day}T09:00:00Z`).toISOString() }),
    onSuccess: () => { toast.success("Visit moved."); onDone(); },
    onError: () => toast.error("Couldn't move that visit."),
  });

  return (
    <li className={`rounded-xl border p-3 ${captured ? "border-hope/40 bg-hope/5" : skipped ? "border-border bg-paper opacity-70" : "border-border bg-paper"}`}>
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="text-[12.5px] font-medium text-ink">{PHASE_LABEL[phase]}</p>
          <p className="mt-0.5 text-[11.5px] leading-snug text-ink-soft">{PHASE_HINT[phase]}</p>
          <p className="mt-1 text-[11px] text-ink-soft">
            {DAY.format(new Date(shoot.scheduled_for))} · {SHOOT_STATUS_LABEL[shoot.status] ?? shoot.status}
          </p>
        </div>
        {captured && <Check className="h-4 w-4 shrink-0 text-hope" />}
      </div>

      {canManage && !captured && (
        <div className="mt-2 flex flex-wrap items-center gap-2">
          <input
            type="date"
            defaultValue={dateInputValue(shoot.scheduled_for)}
            onChange={e => e.target.value && reschedule.mutate(e.target.value)}
            className="rounded-lg border border-border bg-card px-2 py-1 text-[11.5px] text-ink"
            aria-label={`Reschedule the ${PHASE_LABEL[phase].toLowerCase()} visit`}
          />
          {reschedule.isPending && <Loader2 className="h-3.5 w-3.5 animate-spin text-ink-soft" />}
          <button
            onClick={() => updateShoot(shoot.id, { status: skipped ? "scheduled" : "skipped" }).then(onDone)}
            className="rounded-full border border-border px-2.5 py-1 text-[11px] text-ink-soft"
          >
            {skipped ? "Put it back on" : "Skip this one"}
          </button>
        </div>
      )}
    </li>
  );
}

function BookForm({ needId, onDone }: { needId: string; onDone: () => void }) {
  const [open, setOpen] = useState(false);
  const [week, setWeek] = useState(nextMonday());
  const [who, setWho] = useState("");
  const [notes, setNotes] = useState("");
  const book = useMutation({
    mutationFn: () => bookStory(needId, week, who.trim().slice(0, 80), notes.trim().slice(0, 600)),
    onSuccess: () => { toast.success("Booked. The three visits are on the calendar."); setOpen(false); onDone(); },
    onError: (e: Error) => toast.error(e.message || "Couldn't book that."),
  });

  if (!open) {
    return (
      <section className="mx-4 mt-5 rounded-2xl border border-dashed border-border p-4 text-center">
        <p className="text-[12.5px] leading-relaxed text-ink-soft">
          No story booked yet. Schedule a videographer and this need gets a before, a during, and an after.
        </p>
        <button onClick={() => setOpen(true)} className="tap-scale mt-3 inline-flex items-center gap-1.5 rounded-full bg-ink px-4 py-2 text-[12.5px] text-paper">
          <Clapperboard className="h-3.5 w-3.5" /> Schedule the story
        </button>
      </section>
    );
  }

  return (
    <section className="mx-4 mt-5 rounded-2xl border border-border bg-card p-4 shadow-soft">
      <p className="inline-flex items-center gap-1.5 text-[10px] uppercase tracking-[0.2em] text-brass">
        <Clapperboard className="h-3.5 w-3.5" /> Schedule the story
      </p>
      <label className="mt-2.5 block">
        <span className="text-[11px] text-ink-soft">Week it's filmed</span>
        <input type="date" value={week} onChange={e => setWeek(e.target.value)} className="mt-1 w-full rounded-xl border border-border bg-paper px-3 py-2 text-[13px] text-ink outline-none" />
      </label>
      <label className="mt-2 block">
        <span className="text-[11px] text-ink-soft">Who's filming</span>
        <input value={who} onChange={e => setWho(e.target.value)} placeholder="Name" className="mt-1 w-full rounded-xl border border-border bg-paper px-3 py-2 text-[13px] text-ink outline-none placeholder:text-ink-soft/60" />
      </label>
      <label className="mt-2 block">
        <span className="text-[11px] text-ink-soft">Notes for the crew</span>
        <textarea value={notes} onChange={e => setNotes(e.target.value)} rows={2} placeholder="Who to meet, gate code, the part of the story that matters." className="mt-1 w-full resize-none rounded-xl border border-border bg-paper px-3 py-2 text-[13px] text-ink outline-none placeholder:text-ink-soft/60" />
      </label>
      <p className="mt-2 text-[11px] text-ink-soft">Three visits get scheduled: before on that day, during three days later, after ten days later. You can move any of them.</p>
      <div className="mt-3 flex gap-2">
        <button onClick={() => book.mutate()} disabled={!week || book.isPending} className="inline-flex items-center gap-1.5 rounded-full bg-ink px-4 py-2 text-[12.5px] text-paper disabled:opacity-50">
          {book.isPending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Check className="h-3.5 w-3.5" />} Book it
        </button>
        <button onClick={() => setOpen(false)} className="rounded-full border border-border px-4 py-2 text-[12.5px] text-ink-soft">Cancel</button>
      </div>
    </section>
  );
}
