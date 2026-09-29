import { useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { ArrowLeft, Camera, Check, Clapperboard, Link2, Loader2, Send, Upload } from "lucide-react";
import { BRAND } from "@/config/brand";
import { useSession } from "@/hooks/useSession";
import { myRoles } from "@/lib/prayers";
import { NeedMedia } from "@/components/needs/NeedMedia";
import {
  applyAsVideographer, deliverFilm, DELIVERY_LABEL, deliveryState, myAssignments, myVideographerProfile,
  setVideographerStatus, uploadFilm, VIDEOGRAPHER_STATUS, videographersForReview, type Assignment,
} from "@/lib/film";
import { shareStoryWithChurch } from "@/lib/film.functions";
import { PHASE_HINT, PHASE_LABEL, SHOOT_STATUS_LABEL, updateShoot, type ShootPhase } from "@/lib/needs";

const DAY = new Intl.DateTimeFormat("en-US", { weekday: "short", month: "short", day: "numeric" });

export const Route = createFileRoute("/film/queue")({
  staticData: { sitemap: false },
  component: FilmQueue,
  head: () => ({
    meta: [
      { title: `Your filming queue · ${BRAND.name}` },
      {
        name: "description",
        content: "The stories you've been handed: when each visit happens, where to upload the finished film, and when the church has been told.",
      },
      { property: "og:title", content: `Filming queue · ${BRAND.name}` },
      { property: "og:description", content: "Assigned stories, scheduled visits, delivered films." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
});

function FilmQueue() {
  const { userId, signedIn } = useSession();
  const qc = useQueryClient();
  const profileQ = useQuery({
    queryKey: ["videographer", "me", userId],
    queryFn: () => myVideographerProfile(userId!),
    enabled: !!userId,
  });
  const rolesQ = useQuery({ queryKey: ["roles", userId], queryFn: () => myRoles(userId!), enabled: !!userId });
  const isAdmin = (rolesQ.data ?? []).includes("admin");
  const jobsQ = useQuery({
    queryKey: ["videographer", "assignments", userId],
    queryFn: () => myAssignments(userId!),
    enabled: !!userId,
  });

  if (signedIn === false) {
    return (
      <div className="px-6 py-16 text-center">
        <p className="text-[14px] text-ink-soft">Sign in to see the stories handed to you.</p>
        <Link to="/login" className="mt-4 inline-block rounded-full bg-ink px-5 py-2.5 text-[13px] text-paper">Sign in</Link>
      </div>
    );
  }

  const jobs = jobsQ.data ?? [];

  return (
    <div className="pb-20">
      <div className="px-4 pt-3">
        <Link to="/needs/stories" className="inline-flex items-center gap-1 text-[13px] text-ink-soft">
          <ArrowLeft className="h-4 w-4" /> Filming schedule
        </Link>
      </div>

      <header className="px-5 pt-4">
        <p className="inline-flex items-center gap-1.5 text-[11px] uppercase tracking-[0.22em] text-brass">
          <Clapperboard className="h-3 w-3" /> Behind the camera
        </p>
        <h1 className="mt-2 font-serif text-[30px] leading-tight text-ink">Your filming queue</h1>
        <p className="mt-2 text-[13px] leading-relaxed text-ink-soft">
          Every story handed to you: the visits to shoot, where the finished film goes, and the moment the church gets the link.
        </p>
      </header>

      {userId && (
        <section className="mt-6 px-4">
          {profileQ.isLoading ? (
            <div className="h-24 animate-pulse rounded-2xl border border-border bg-card" />
          ) : profileQ.data ? (
            <p className="rounded-2xl border border-border bg-card px-4 py-3 text-[12.5px] text-ink-soft">
              {profileQ.data.display_name} · {VIDEOGRAPHER_STATUS[profileQ.data.status] ?? profileQ.data.status}
            </p>
          ) : (
            <ApplyForm userId={userId} onDone={() => qc.invalidateQueries({ queryKey: ["videographer", "me", userId] })} />
          )}
        </section>
      )}

      <section className="mt-5 space-y-3 px-4">
        {jobsQ.isLoading ? (
          <div className="h-40 animate-pulse rounded-2xl border border-border bg-card" />
        ) : jobs.length === 0 ? (
          <p className="rounded-2xl border border-dashed border-border p-6 text-center text-[13px] text-ink-soft">
            Nothing handed to you yet. Once a need's story is assigned to you, it shows up here.
          </p>
        ) : (
          jobs.map(job => <JobCard key={job.story.id} job={job} userId={userId!} />)
        )}
      </section>

      {isAdmin && <AdminRoster />}
    </div>
  );
}

function ApplyForm({ userId, onDone }: { userId: string; onDone: () => void }) {
  const [name, setName] = useState("");
  const [city, setCity] = useState("");
  const [region, setRegion] = useState("");
  const [reel, setReel] = useState("");
  const [about, setAbout] = useState("");
  const apply = useMutation({
    mutationFn: () =>
      applyAsVideographer(userId, {
        display_name: name.trim().slice(0, 80),
        city: city.trim().slice(0, 60),
        region: region.trim().slice(0, 60),
        reel_url: reel.trim().slice(0, 300),
        about: about.trim().slice(0, 600),
      }),
    onSuccess: () => { toast.success("Sent in. Our team will look at it."); onDone(); },
    onError: (e: Error) => toast.error(e.message || "Couldn't send that in."),
  });

  return (
    <div className="rounded-2xl border border-border bg-card p-4 shadow-soft">
      <p className="inline-flex items-center gap-1.5 text-[10px] uppercase tracking-[0.2em] text-brass">
        <Camera className="h-3.5 w-3.5" /> Hold a camera for us
      </p>
      <p className="mt-2 text-[12.5px] leading-relaxed text-ink-soft">
        Tell us who you are and where you shoot. Our team looks at every name before a family is filmed.
      </p>
      <input value={name} onChange={e => setName(e.target.value)} placeholder="Your name" className="mt-3 w-full rounded-xl border border-border bg-paper px-3 py-2 text-[13px] text-ink outline-none placeholder:text-ink-soft/60" />
      <div className="mt-2 flex gap-2">
        <input value={city} onChange={e => setCity(e.target.value)} placeholder="City" className="w-full rounded-xl border border-border bg-paper px-3 py-2 text-[13px] text-ink outline-none placeholder:text-ink-soft/60" />
        <input value={region} onChange={e => setRegion(e.target.value)} placeholder="State" className="w-28 rounded-xl border border-border bg-paper px-3 py-2 text-[13px] text-ink outline-none placeholder:text-ink-soft/60" />
      </div>
      <input value={reel} onChange={e => setReel(e.target.value)} placeholder="Link to your work" className="mt-2 w-full rounded-xl border border-border bg-paper px-3 py-2 text-[13px] text-ink outline-none placeholder:text-ink-soft/60" />
      <textarea value={about} onChange={e => setAbout(e.target.value)} rows={2} placeholder="What you shoot, and why this one matters to you." className="mt-2 w-full resize-none rounded-xl border border-border bg-paper px-3 py-2 text-[13px] text-ink outline-none placeholder:text-ink-soft/60" />
      <button
        onClick={() => apply.mutate()}
        disabled={!name.trim() || apply.isPending}
        className="tap-scale mt-3 inline-flex items-center gap-1.5 rounded-full bg-ink px-4 py-2 text-[12.5px] text-paper disabled:opacity-50"
      >
        {apply.isPending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Check className="h-3.5 w-3.5" />} Send it in
      </button>
    </div>
  );
}

function JobCard({ job, userId }: { job: Assignment; userId: string }) {
  const qc = useQueryClient();
  const { story, shoots, need } = job;
  const state = deliveryState(story);
  const invalidate = () => {
    qc.invalidateQueries({ queryKey: ["videographer", "assignments"] });
    qc.invalidateQueries({ queryKey: ["need-story", need.id] });
    qc.invalidateQueries({ queryKey: ["needs"] });
  };
  const share = useServerFn(shareStoryWithChurch);
  const sendLink = useMutation({
    mutationFn: () => share({ data: { storyId: story.id } }),
    onSuccess: r => { toast.success(r.sent ? "Link sent to the church." : "Sent."); invalidate(); },
    onError: (e: Error) => toast.error(e.message || "Couldn't send the link."),
  });

  return (
    <article className="rounded-2xl border border-border bg-card p-4">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <Link to="/needs/$id" params={{ id: need.id }} className="block truncate text-[15px] font-medium text-ink">
            {need.title}
          </Link>
          <p className="mt-0.5 text-[11.5px] text-ink-soft">
            {need.city}{need.region ? `, ${need.region}` : ""}{need.org ? ` · ${need.org.name}` : ""}
          </p>
        </div>
        <span className="shrink-0 rounded-full border border-border px-2.5 py-0.5 text-[11px] text-ink-soft">
          {DELIVERY_LABEL[state]}
        </span>
      </div>

      {story.notes && <p className="mt-2 whitespace-pre-line text-[12.5px] leading-relaxed text-ink-soft">{story.notes}</p>}

      <ul className="mt-3 space-y-1.5">
        {shoots.map(shoot => (
          <li key={shoot.id} className="flex items-start gap-2">
            <span className={`mt-0.5 grid h-5 w-5 shrink-0 place-items-center rounded-full ${shoot.status === "captured" ? "bg-hope/15 text-hope" : "bg-secondary text-ink-soft"}`}>
              {shoot.status === "captured" ? <Check className="h-3 w-3" strokeWidth={2.4} /> : <Camera className="h-3 w-3" strokeWidth={1.8} />}
            </span>
            <span className="min-w-0 flex-1">
              <span className="block text-[12.5px] text-ink">
                {PHASE_LABEL[shoot.phase as ShootPhase]} · {DAY.format(new Date(shoot.scheduled_for))}
                <span className="ml-1.5 text-[11px] text-ink-soft">{SHOOT_STATUS_LABEL[shoot.status] ?? shoot.status}</span>
              </span>
              <span className="block text-[11px] text-ink-soft">{shoot.note?.trim() ? shoot.note : PHASE_HINT[shoot.phase as ShootPhase]}</span>
              {shoot.status !== "captured" && (
                <input
                  type="date"
                  defaultValue={new Date(shoot.scheduled_for).toISOString().slice(0, 10)}
                  onChange={e => e.target.value && updateShoot(shoot.id, { scheduled_for: new Date(`${e.target.value}T09:00:00Z`).toISOString() }).then(() => { toast.success("Visit moved."); invalidate(); }).catch(() => toast.error("Couldn't move that visit."))}
                  className="mt-1 rounded-lg border border-border bg-paper px-2 py-1 text-[11.5px] text-ink"
                  aria-label={`Move the ${PHASE_LABEL[shoot.phase as ShootPhase].toLowerCase()} visit`}
                />
              )}
            </span>
          </li>
        ))}
      </ul>

      {story.delivered_at ? (
        <div className="mt-3 rounded-xl border border-hope/40 bg-hope/5 p-3">
          <p className="text-[12px] text-ink">Delivered {DAY.format(new Date(story.delivered_at))}</p>
          {story.film_path && <NeedMedia path={story.film_path} type="video" className="mt-2 aspect-video w-full rounded-lg" />}
          {story.film_url && (
            <a href={story.film_url} target="_blank" rel="noreferrer" className="mt-2 inline-flex items-center gap-1 text-[12px] text-brass underline">
              <Link2 className="h-3.5 w-3.5" /> Watch the film
            </a>
          )}
          {story.delivery_note && <p className="mt-1.5 whitespace-pre-line text-[11.5px] text-ink-soft">{story.delivery_note}</p>}
          <button
            onClick={() => sendLink.mutate()}
            disabled={sendLink.isPending || !!story.shared_at}
            className="tap-scale mt-3 inline-flex items-center gap-1.5 rounded-full bg-ink px-4 py-2 text-[12.5px] text-paper disabled:opacity-50"
          >
            {sendLink.isPending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Send className="h-3.5 w-3.5" />}
            {story.shared_at ? "Link already sent" : "Send the link to the church"}
          </button>
        </div>
      ) : (
        <DeliverForm story={job.story} needId={need.id} userId={userId} onDone={invalidate} />
      )}
    </article>
  );
}

function DeliverForm({ story, needId, userId, onDone }: { story: Assignment["story"]; needId: string; userId: string; onDone: () => void }) {
  const [file, setFile] = useState<File | null>(null);
  const [url, setUrl] = useState("");
  const [note, setNote] = useState("");
  const deliver = useMutation({
    mutationFn: async () => {
      const path = file ? await uploadFilm(needId, userId, file) : "";
      await deliverFilm(story.id, { film_path: path, film_url: url.trim().slice(0, 300), delivery_note: note.trim().slice(0, 600) });
    },
    onSuccess: () => { toast.success("Film delivered."); onDone(); },
    onError: (e: Error) => toast.error(e.message || "Couldn't deliver that."),
  });

  return (
    <div className="mt-3 rounded-xl border border-border bg-paper p-3">
      <p className="text-[12px] font-medium text-ink">Deliver the film</p>
      <label className="mt-2 flex cursor-pointer items-center gap-2 rounded-lg border border-dashed border-border px-3 py-2 text-[12px] text-ink-soft">
        <Upload className="h-3.5 w-3.5" /> {file ? file.name : "Upload the cut"}
        <input type="file" accept="video/*" className="hidden" onChange={e => setFile(e.target.files?.[0] ?? null)} />
      </label>
      <input value={url} onChange={e => setUrl(e.target.value)} placeholder="Or paste a link to it" className="mt-2 w-full rounded-lg border border-border bg-card px-3 py-2 text-[12.5px] text-ink outline-none placeholder:text-ink-soft/60" />
      <textarea value={note} onChange={e => setNote(e.target.value)} rows={2} placeholder="A word for the church about the cut." className="mt-2 w-full resize-none rounded-lg border border-border bg-card px-3 py-2 text-[12.5px] text-ink outline-none placeholder:text-ink-soft/60" />
      <button
        onClick={() => deliver.mutate()}
        disabled={deliver.isPending || (!file && !url.trim())}
        className="tap-scale mt-2.5 inline-flex items-center gap-1.5 rounded-full bg-ink px-4 py-2 text-[12.5px] text-paper disabled:opacity-50"
      >
        {deliver.isPending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Check className="h-3.5 w-3.5" />} Hand it in
      </button>
    </div>
  );
}

function AdminRoster() {
  const qc = useQueryClient();
  const rosterQ = useQuery({ queryKey: ["videographer", "roster"], queryFn: videographersForReview });
  const rows = rosterQ.data ?? [];

  return (
    <section className="mt-8 px-4">
      <p className="px-1 text-[10px] uppercase tracking-[0.2em] text-ink-soft">Team: the camera roster</p>
      <div className="mt-2 space-y-2">
        {rows.length === 0 ? (
          <p className="px-1 text-[12.5px] text-ink-soft">Nobody has asked to hold a camera yet.</p>
        ) : (
          rows.map(v => (
            <div key={v.id} className="rounded-2xl border border-border bg-card p-3">
              <p className="text-[13.5px] text-ink">{v.display_name}</p>
              <p className="text-[11.5px] text-ink-soft">
                {[v.city, v.region].filter(Boolean).join(", ") || "No place given"} · {VIDEOGRAPHER_STATUS[v.status] ?? v.status}
              </p>
              {v.about && <p className="mt-1 text-[11.5px] leading-relaxed text-ink-soft">{v.about}</p>}
              {v.reel_url && (
                <a href={v.reel_url} target="_blank" rel="noreferrer" className="mt-1 inline-block text-[11.5px] text-brass underline">Their work</a>
              )}
              <div className="mt-2 flex gap-2">
                {v.status !== "approved" && (
                  <button onClick={() => setVideographerStatus(v.id, "approved").then(() => qc.invalidateQueries({ queryKey: ["videographer"] }))} className="rounded-full border border-border px-3 py-1 text-[11.5px] text-ink">Put on the roster</button>
                )}
                {v.status !== "removed" && (
                  <button onClick={() => setVideographerStatus(v.id, "removed").then(() => qc.invalidateQueries({ queryKey: ["videographer"] }))} className="px-2 py-1 text-[11.5px] text-ink-soft">Take off</button>
                )}
              </div>
            </div>
          ))
        )}
      </div>
    </section>
  );
}
