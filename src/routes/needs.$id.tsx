import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import {
  ArrowLeft, Camera, Check, CheckCircle2, Clock, Flame, Hammer, HandCoins, Heart, Loader2, MapPin, Sparkles, Users,
} from "lucide-react";
import { BRAND } from "@/config/brand";
import { supabase } from "@/integrations/supabase/client";
import { useSession } from "@/hooks/useSession";
import { getPublicNeed } from "@/lib/needs.functions";
import { myRoles } from "@/lib/prayers";
import {
  addUpdate, dollars, loadNeed, loadPledges, loadUpdates, offerHands, pctFunded, placeOf, setNeedCover, setNeedStatus,
  setPledgeStatus, STATUS_LABEL, UPDATE_KIND_LABEL, uploadNeedMedia, type Need, type UpdateKind,
} from "@/lib/needs";
import { NeedMedia } from "@/components/needs/NeedMedia";
import { StorySchedule } from "@/components/needs/StorySchedule";
import { JobFund } from "@/components/needs/JobFund";

import { ShareButton } from "@/components/ShareButton";
import { Avatar } from "@/components/Avatar";

export const Route = createFileRoute("/needs/$id")({
  staticData: { sitemap: false },
  loader: ({ params }) => getPublicNeed({ data: { id: params.id } }),
  component: NeedDetail,
  errorComponent: () => <Empty text="This need couldn't be loaded right now." />,
  notFoundComponent: () => <Empty text="No need here." />,
  head: ({ loaderData }) => {
    const n = loaderData;
    const title = n ? `${n.title}${n.city ? ` — ${n.city}` : ""} · ${BRAND.name}` : `A need · ${BRAND.name}`;
    const desc = n
      ? (n.story || `${n.org_name ?? "A neighbor"} needs help with this.`).slice(0, 155) +
        (n.goal_cents ? ` ${dollars(n.raised_cents)} of ${dollars(n.goal_cents)} so far.` : "")
      : "A tangible need you can fund or fix.";
    const img = n?.cover_url && n.cover_url.startsWith("https://") ? n.cover_url : null;
    return {
      meta: [
        { title },
        { name: "description", content: desc },
        { property: "og:title", content: title },
        { property: "og:description", content: desc },
        { property: "og:type", content: "article" },
        { name: "twitter:card", content: img ? "summary_large_image" : "summary" },
        ...(img ? [{ property: "og:image", content: img }, { name: "twitter:image", content: img }] : []),
      ],
    };
  },
});

function Empty({ text }: { text: string }) {
  return (
    <div className="px-6 pt-16 text-center">
      <p className="font-serif text-[20px] text-ink-soft">{text}</p>
      <Link to="/needs" className="mt-4 inline-block text-brass">All needs</Link>
    </div>
  );
}

const DATE = new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric" });

function NeedDetail() {
  const { id } = Route.useParams();
  const { userId, signedIn } = useSession();
  const qc = useQueryClient();

  const needQ = useQuery({ queryKey: ["need", id, userId], queryFn: () => loadNeed(id) });
  const updatesQ = useQuery({ queryKey: ["need-updates", id], queryFn: () => loadUpdates(id), enabled: !!needQ.data });
  const pledgesQ = useQuery({ queryKey: ["need-pledges", id], queryFn: () => loadPledges(id), enabled: !!needQ.data && !!userId });
  const rolesQ = useQuery({ queryKey: ["roles", userId], queryFn: () => myRoles(userId!), enabled: !!userId });
  const leaderQ = useQuery({
    queryKey: ["leads-org", needQ.data?.org_id, userId],
    queryFn: async () => {
      const { data } = await supabase.from("organization_members").select("role").eq("org_id", needQ.data!.org_id!).eq("user_id", userId!).in("role", ["owner", "leader"]).maybeSingle();
      return !!data;
    },
    enabled: !!userId && !!needQ.data?.org_id,
  });

  // When a gift clears, the amount raised is recalculated — watch this need so the
  // bar moves while someone is looking at the page.
  useEffect(() => {
    const channel = supabase
      .channel(`need-${id}`)
      .on("postgres_changes", { event: "UPDATE", schema: "public", table: "needs", filter: `id=eq.${id}` }, () => {
        void qc.invalidateQueries({ queryKey: ["need", id] });
      })
      .on("postgres_changes", { event: "*", schema: "public", table: "job_funds", filter: `need_id=eq.${id}` }, () => {
        void qc.invalidateQueries({ queryKey: ["job-fund", id] });
      })
      .subscribe();
    return () => { void supabase.removeChannel(channel); };
  }, [id, qc]);

  const need = needQ.data;
  if (needQ.isLoading) return <div className="flex justify-center py-16"><Loader2 className="h-5 w-5 animate-spin text-ink-soft" /></div>;
  if (!need) {
    return (
      <div className="px-6 pt-16 text-center">
        <p className="font-serif text-[20px] text-ink">{signedIn ? "This need isn't available." : "This need is for members."}</p>
        {!signedIn && <Link to="/login" className="mt-4 inline-block rounded-full bg-ink px-5 py-2.5 text-[13px] text-paper">Sign in</Link>}
      </div>
    );
  }

  const isOwner = !!userId && need.posted_by === userId;
  const isAdmin = (rolesQ.data ?? []).includes("admin");
  const canManage = isOwner || !!leaderQ.data || isAdmin;
  const pledges = pledgesQ.data ?? [];
  const myPledge = pledges.find(p => p.user_id === userId);
  const isHelper = myPledge?.status === "accepted" || myPledge?.status === "done";
  const canPost = canManage || isHelper;
  const done = need.status === "completed";
  const pct = pctFunded(need);
  const updates = updatesQ.data ?? [];
  const after = updates.find(u => u.kind === "after" || u.kind === "timelapse");

  const invalidate = () => {
    qc.invalidateQueries({ queryKey: ["need", id] });
    qc.invalidateQueries({ queryKey: ["needs"] });
    qc.invalidateQueries({ queryKey: ["need-updates", id] });
    qc.invalidateQueries({ queryKey: ["need-pledges", id] });
    qc.invalidateQueries({ queryKey: ["need-story", id] });
    qc.invalidateQueries({ queryKey: ["need-for-prayer"] });
  };


  const sharePath = `/needs/${need.id}`;

  return (
    <div className="pb-20">
      <div className="flex items-center justify-between px-4 pt-3">
        <Link to="/needs" className="inline-flex items-center gap-1 text-[13px] text-ink-soft"><ArrowLeft className="h-4 w-4" /> Needs</Link>
        {need.is_public && <ShareButton title={need.title} text={`${need.title}${need.city ? ` · ${need.city}` : ""} — help fund or fix it on ${BRAND.name}.`} path={sharePath} />}
      </div>

      {need.cover_path && (
        <div className="mx-4 mt-3 overflow-hidden rounded-2xl border border-border">
          <NeedMedia path={need.cover_path} type="image" className="aspect-[4/3] w-full object-cover" />
        </div>
      )}

      <header className="px-5 pt-4">
        <div className="flex flex-wrap items-center gap-2 text-[10px] uppercase tracking-[0.2em]">
          <span className="text-brass">{need.kind === "prayer" ? "Fix that" : "Church project"}</span>
          <span className={`rounded-full px-2 py-0.5 tracking-[0.12em] ${done ? "bg-flame/15 text-flame" : need.status === "in_progress" ? "bg-hope/15 text-hope" : "bg-secondary text-ink-soft"}`}>{STATUS_LABEL[need.status]}</span>
          {need.featured_week && <span className="inline-flex items-center gap-1 text-flame"><Sparkles className="h-3 w-3" /> Featured</span>}
        </div>
        <h1 className="mt-2 font-serif text-[26px] leading-tight text-ink">{need.title}</h1>
        <p className="mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-[12px] text-ink-soft">
          {need.org && <Link to="/community/$slug" params={{ slug: need.org.slug }} className="text-ink">{need.org.name}</Link>}
          {placeOf(need) && <span className="inline-flex items-center gap-1"><MapPin className="h-3 w-3" /> {placeOf(need)}</span>}
        </p>
        {need.story && <p className="mt-4 whitespace-pre-line text-[14px] leading-relaxed text-ink">{need.story}</p>}
      </header>

      {done && (
        <section className="mx-4 mt-5 rounded-2xl border border-flame/30 bg-card p-4 shadow-soft">
          <p className="inline-flex items-center gap-1.5 text-[10px] uppercase tracking-[0.2em] text-flame"><CheckCircle2 className="h-3.5 w-3.5" /> Done</p>
          <p className="mt-1.5 text-[13px] leading-relaxed text-ink">
            {need.completed_at ? `Finished ${DATE.format(new Date(need.completed_at))}. ` : ""}
            {after ? "The after is below." : "The after photo is coming."}
          </p>
          {(isOwner || (need.prayer_id && canManage)) && (
            <div className="mt-3 flex flex-wrap gap-2 text-[12px]">
              {need.prayer_id && (
                <Link to="/record" search={{ mode: "reaction", prayer: need.prayer_id, text: `${need.title} — done. ` }} className="inline-flex items-center gap-1 rounded-full bg-ink px-3.5 py-1.5 text-paper"><Flame className="h-3.5 w-3.5" /> Share it as answered</Link>
              )}
              <Link to="/record" search={{ mode: "gratitude", text: `Thankful: ${need.title} is done. ` }} className="inline-flex items-center gap-1 rounded-full border border-border px-3.5 py-1.5 text-ink"><Heart className="h-3.5 w-3.5" /> Post gratitude</Link>
            </div>
          )}
        </section>
      )}

      {need.goal_cents > 0 && (
        <section className="mx-4 mt-5 rounded-2xl border border-border bg-card p-4 shadow-soft">
          <div className="flex items-end justify-between">
            <p className="font-serif text-[22px] leading-none text-ink">{dollars(need.raised_cents)}</p>
            <p className="text-[12px] text-ink-soft">of {dollars(need.goal_cents)}</p>
          </div>
          <div className="mt-2.5 h-1.5 overflow-hidden rounded-full bg-secondary"><div className="h-full bg-brass transition-all" style={{ width: `${pct}%` }} /></div>
          <p className="mt-1.5 text-[11px] text-ink-soft">{pct}% there{need.status === "funded" ? " · fully funded" : ""}</p>
          {!done && need.status !== "closed" && need.org && (
            <Link to="/donate/$slug" params={{ slug: need.org.slug }} search={{ need: need.id }} className="tap-scale mt-3.5 flex items-center justify-center gap-2 rounded-xl bg-ink py-2.5 text-[13.5px] font-medium text-paper">
              <HandCoins className="h-4 w-4" /> Give toward this
            </Link>
          )}
          <p className="mt-2 text-center text-[11px] text-ink-soft">Paid to {need.org?.name ?? "the partner"}, who pays the bill. Never to a person.</p>
        </section>
      )}

      {need.needs_hands && (
        <section className="mx-4 mt-4 rounded-2xl border border-border bg-card p-4 shadow-soft">
          <p className="inline-flex items-center gap-1.5 text-[10px] uppercase tracking-[0.2em] text-brass"><Hammer className="h-3.5 w-3.5" /> Hands</p>
          <p className="mt-1.5 text-[13px] text-ink">
            {need.hands_count > 0 ? `${need.hands_count} ${need.hands_count === 1 ? "person has" : "people have"} stepped up.` : "Nobody's stepped up yet."}
            {need.hours_needed > 0 ? ` About ${need.hours_needed} hours of work.` : ""}
          </p>
          {need.skills.length > 0 && (
            <div className="mt-2 flex flex-wrap gap-1.5">{need.skills.map(s => <span key={s} className="rounded-full border border-border bg-paper px-2 py-0.5 text-[11px] text-ink-soft">{s}</span>)}</div>
          )}
          {!done && (signedIn ? (
            myPledge ? (
              <div className="mt-3 rounded-xl border border-border bg-paper p-3 text-[12.5px]">
                {myPledge.status === "offered" && <p className="text-ink-soft">You offered to help — waiting on the organizer.</p>}
                {myPledge.status === "accepted" && <p className="text-ink">You're on it. When you've worked, <Link to="/hours" search={{ need: need.id }} className="text-brass">log your hours</Link> so they get verified.</p>}
                {myPledge.status === "done" && <p className="text-ink">Marked done. Thank you. <Link to="/hours" search={{ need: need.id }} className="text-brass">Log hours</Link></p>}
                {myPledge.status === "withdrawn" && <p className="text-ink-soft">You stepped back from this one.</p>}
                {(myPledge.status === "offered" || myPledge.status === "accepted") && (
                  <button onClick={() => setPledgeStatus(myPledge.id, "withdrawn").then(invalidate)} className="mt-1.5 text-[11.5px] text-ink-soft underline">Step back</button>
                )}
              </div>
            ) : isOwner ? (
              <p className="mt-3 text-[12px] italic text-ink-soft">You posted this one — offers from others show up below.</p>
            ) : (
              <OfferForm userId={userId!} needId={need.id} onDone={invalidate} />
            )
          ) : (
            <Link to="/login" className="mt-3 inline-block text-[12.5px] text-brass">Sign in to offer your hands</Link>
          ))}
        </section>
      )}

      {canManage && pledges.length > 0 && (
        <section className="mx-4 mt-4 rounded-2xl border border-border bg-card p-4 shadow-soft">
          <p className="inline-flex items-center gap-1.5 text-[10px] uppercase tracking-[0.2em] text-brass"><Users className="h-3.5 w-3.5" /> Who offered</p>
          <div className="mt-2 space-y-2">
            {pledges.filter(p => p.status !== "withdrawn").map(p => (
              <div key={p.id} className="flex items-center gap-2.5">
                <Avatar name={p.author.name} photo={p.author.photo} size={30} />
                <div className="min-w-0 flex-1 leading-tight">
                  <p className="text-[13px] text-ink">{p.author.name}</p>
                  <p className="truncate text-[11px] text-ink-soft">{p.note || "Offered to help"}{p.status !== "offered" ? ` · ${p.status}` : ""}</p>
                </div>
                {p.status === "offered" && <button onClick={() => setPledgeStatus(p.id, "accepted").then(invalidate)} className="rounded-full bg-ink px-3 py-1 text-[11.5px] text-paper">Accept</button>}
                {p.status === "accepted" && <button onClick={() => setPledgeStatus(p.id, "done").then(invalidate)} className="inline-flex items-center gap-1 rounded-full border border-border px-3 py-1 text-[11.5px] text-ink"><Check className="h-3 w-3" /> Done</button>}
              </div>
            ))}
          </div>
        </section>
      )}

      <JobFund
        needId={need.id}
        needStatus={need.status}
        canManage={canManage}
        isAdmin={isAdmin}
        pledges={pledges}
        onDone={invalidate}
      />

      <StorySchedule needId={need.id} canManage={canManage} />

      <section className="mt-7 px-4">
        <h2 className="mb-3 px-1 font-serif text-[13px] uppercase tracking-[0.18em] text-ink-soft">Before, during, after</h2>

        {updates.length === 0 ? (
          <p className="rounded-2xl border border-dashed border-border p-5 text-center text-[13px] text-ink-soft">No updates yet. The before photo goes here first.</p>
        ) : (
          <ol className="relative space-y-4 border-l border-border pl-4">
            {updates.map(u => (
              <li key={u.id} className="relative">
                <span className={`absolute -left-[21px] top-1.5 h-2.5 w-2.5 rounded-full ${u.kind === "after" || u.kind === "timelapse" ? "bg-flame" : u.kind === "reaction" ? "bg-hope" : "bg-brass"}`} />
                <p className="text-[10px] uppercase tracking-[0.18em] text-ink-soft">{UPDATE_KIND_LABEL[u.kind]} · {DATE.format(new Date(u.created_at))}</p>
                {u.media_path && (
                  <div className="mt-2 overflow-hidden rounded-xl border border-border">
                    <NeedMedia path={u.media_path} type={u.media_type} className="w-full object-cover" />
                  </div>
                )}
                {u.body && <p className="mt-2 text-[13.5px] leading-relaxed text-ink">{u.body}</p>}
                <p className="mt-1 text-[11px] text-ink-soft">— {u.author.name}</p>
              </li>
            ))}
          </ol>
        )}
      </section>

      {canPost && !done && need.status !== "closed" && userId && (
        <UpdateForm userId={userId} need={need} canManage={canManage} onDone={invalidate} />
      )}
      {canPost && done && userId && (
        <UpdateForm userId={userId} need={need} canManage={canManage} onDone={invalidate} afterOnly />
      )}

      {canManage && !done && need.status !== "closed" && (
        <section className="mx-4 mt-4 flex flex-wrap gap-2">
          {need.status !== "in_progress" && (
            <button onClick={() => setNeedStatus(need.id, "in_progress").then(invalidate)} className="inline-flex items-center gap-1 rounded-full border border-border px-3.5 py-1.5 text-[12px] text-ink"><Clock className="h-3.5 w-3.5" /> Work has started</button>
          )}
          <button
            onClick={() => {
              if (!after && !confirm("No after photo yet. Mark it done anyway? You can add the photo after.")) return;
              setNeedStatus(need.id, "completed").then(() => { toast.success("Done. Post the after photo so people can see it."); invalidate(); });
            }}
            className="inline-flex items-center gap-1 rounded-full bg-ink px-3.5 py-1.5 text-[12px] text-paper"
          ><CheckCircle2 className="h-3.5 w-3.5" /> Mark it done</button>
          <button onClick={() => { if (confirm("Close this need? It won't show on the board.")) setNeedStatus(need.id, "closed").then(invalidate); }} className="px-2 py-1.5 text-[12px] text-ink-soft">Close</button>
        </section>
      )}
    </div>
  );
}

function OfferForm({ userId, needId, onDone }: { userId: string; needId: string; onDone: () => void }) {
  const [note, setNote] = useState("");
  const [open, setOpen] = useState(false);
  const offer = useMutation({
    mutationFn: () => offerHands(userId, needId, note.trim().slice(0, 300)),
    onSuccess: () => { toast.success("Offered. They'll be in touch."); onDone(); },
    onError: () => toast.error("Couldn't send that."),
  });
  if (!open) {
    return <button onClick={() => setOpen(true)} className="tap-scale mt-3 flex w-full items-center justify-center gap-2 rounded-xl border border-ink py-2.5 text-[13.5px] font-medium text-ink"><Hammer className="h-4 w-4" /> I can help with this</button>;
  }
  return (
    <div className="mt-3">
      <input value={note} onChange={e => setNote(e.target.value)} placeholder="What you can bring — a Saturday, a truck, 20 years of roofing." className="w-full rounded-xl border border-border bg-paper px-3 py-2.5 text-[13.5px] text-ink outline-none placeholder:text-ink-soft/60" />
      <div className="mt-2 flex gap-2">
        <button onClick={() => offer.mutate()} disabled={offer.isPending} className="rounded-full bg-ink px-4 py-2 text-[12.5px] text-paper disabled:opacity-50">Offer my hands</button>
        <button onClick={() => setOpen(false)} className="rounded-full border border-border px-4 py-2 text-[12.5px] text-ink-soft">Cancel</button>
      </div>
    </div>
  );
}

const KINDS: UpdateKind[] = ["before", "progress", "after", "timelapse", "story", "reaction", "note"];

function UpdateForm({ userId, need, canManage, onDone, afterOnly }: { userId: string; need: Need; canManage: boolean; onDone: () => void; afterOnly?: boolean }) {
  const [kind, setKind] = useState<UpdateKind>(afterOnly ? "after" : need.cover_path ? "progress" : "before");
  const [body, setBody] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const post = useMutation({
    mutationFn: async () => {
      if (!body.trim() && !file) throw new Error("Add a photo or a few words.");
      let media: { path: string; type: "image" | "video" } | null = null;
      if (file) media = await uploadNeedMedia(need.id, userId, file);
      await addUpdate(userId, need.id, kind, body.trim().slice(0, 2000), media);
      if (media?.type === "image" && !need.cover_path && canManage) await setNeedCover(need.id, media.path);
    },
    onSuccess: () => { setBody(""); setFile(null); toast.success("Posted."); onDone(); },
    onError: (e: Error) => toast.error(e.message || "Couldn't post that."),
  });
  const kinds = afterOnly ? (["after", "timelapse", "reaction", "note"] as UpdateKind[]) : KINDS;
  return (
    <section className="mx-4 mt-5 rounded-2xl border border-border bg-card p-4 shadow-soft">
      <p className="text-[10px] uppercase tracking-[0.2em] text-brass">Post an update</p>
      <div className="no-scrollbar mt-2.5 flex gap-1.5 overflow-x-auto">
        {kinds.map(k => (
          <button key={k} onClick={() => setKind(k)} className={`shrink-0 rounded-full border px-3 py-1 text-[11.5px] ${kind === k ? "border-ink bg-ink text-paper" : "border-border bg-paper text-ink-soft"}`}>{UPDATE_KIND_LABEL[k]}</button>
        ))}
      </div>
      <textarea value={body} onChange={e => setBody(e.target.value)} rows={3} placeholder={kind === "after" ? "What it looks like now, and what it means to them." : "A few words."} className="mt-3 w-full resize-none rounded-xl border border-border bg-paper px-3 py-2.5 text-[13.5px] text-ink outline-none placeholder:text-ink-soft/60" />
      <button onClick={() => fileRef.current?.click()} className="mt-2 flex w-full items-center gap-2 rounded-xl border border-dashed border-border bg-paper px-3 py-2.5 text-left text-[12.5px] text-ink-soft">
        <Camera className="h-4 w-4 text-brass" /> {file ? file.name : "Add a photo or video"}
      </button>
      <input ref={fileRef} type="file" accept="image/*,video/*" className="sr-only" onChange={e => setFile(e.target.files?.[0] ?? null)} />
      <button onClick={() => post.mutate()} disabled={post.isPending} className="tap-scale mt-3 flex w-full items-center justify-center gap-2 rounded-xl bg-ink py-2.5 text-[13.5px] font-medium text-paper disabled:opacity-50">
        {post.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />} Post update
      </button>
    </section>
  );
}
