import { createFileRoute, Link, useParams } from "@tanstack/react-router";
import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { ArrowLeft, Shield, Users, Clock, Lock, DoorOpen, Check, LogOut } from "lucide-react";
import { PrayerCard } from "@/components/PrayerCard";
import { JoinRitual } from "@/components/walk/JoinRitual";
import { GroupBadges } from "@/components/walk/GroupBadges";
import { Avatar } from "@/components/Avatar";
import { SafetyMenu } from "@/components/safety/ReportSheet";
import { useSession } from "@/hooks/useSession";
import { joinGroup, leaveGroup, loadGroup, loadRoster } from "@/lib/groups";
import { loadFeed } from "@/lib/prayers";

export const Route = createFileRoute("/walk/$id")({
  staticData: { sitemap: false },
  component: WalkGroupDetail,
  head: () => ({
    meta: [
      { title: "A circle · Walk With · Witness" },
      { name: "description", content: "A small, confidential circle on Witness." },
      { property: "og:title", content: "Walk With · Witness" },
      { property: "og:description", content: "A small, confidential circle on Witness." },
      { property: "og:type", content: "article" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
});

function WalkGroupDetail() {
  const { id } = useParams({ from: "/walk/$id" });
  const { userId, signedIn } = useSession();
  const qc = useQueryClient();
  const [ritualOpen, setRitualOpen] = useState(false);

  const groupQ = useQuery({ queryKey: ["group", id, userId ?? "anon"], queryFn: () => loadGroup(id, userId ?? null), enabled: userId !== undefined });
  const group = groupQ.data;
  const joined = group?.joined ?? false;
  const rosterQ = useQuery({ queryKey: ["roster", id], queryFn: () => loadRoster(id), enabled: joined });
  const feedQ = useQuery({ queryKey: ["stories", "feed", userId ?? "anon", 60], queryFn: () => loadFeed(userId ?? null, 60), enabled: joined && !!userId });

  const refresh = () => {
    qc.invalidateQueries({ queryKey: ["group", id] });
    qc.invalidateQueries({ queryKey: ["groups"] });
    qc.invalidateQueries({ queryKey: ["roster", id] });
  };

  if (groupQ.isLoading || userId === undefined) {
    return <div className="px-5 pt-6"><div className="h-40 rounded-2xl bg-card border border-border animate-pulse" /></div>;
  }
  if (!group) {
    return (
      <div className="px-6 pt-10 text-center">
        <p className="font-serif text-[20px] text-ink-soft">Group not found.</p>
        <Link to="/walk" className="mt-4 inline-block text-brass">Back</Link>
      </div>
    );
  }

  const rosterIds = new Set((rosterQ.data ?? []).map(a => a.id));
  const groupPrayers = (feedQ.data ?? []).filter(p => p.privacy === "circle" && rosterIds.has(p.user_id));
  const fac = group.facilitator;

  const leave = async () => {
    if (!userId) return;
    try { await leaveGroup(group.id, userId); toast.success("You've left the circle."); refresh(); }
    catch { toast.error("Couldn't leave right now."); }
  };

  return (
    <div className="pb-32">
      <div className="px-4 pt-3 flex items-center justify-between">
        <Link to="/walk" className="inline-flex items-center gap-1 text-ink-soft text-[13px]">
          <ArrowLeft className="h-4 w-4" aria-hidden="true" /> Back
        </Link>
        <SafetyMenu targetType="group" targetId={group.id} />
      </div>

      <header className="px-5 pt-3">
        <p className="text-[11px] uppercase tracking-[0.22em] text-brass">
          {group.kind === "open" ? "Open table" : "Walk With"}
        </p>
        <h1 className="mt-2 font-serif text-[28px] leading-tight text-ink">{group.topic}</h1>
        <p className="mt-2 text-[13px] text-ink-soft leading-relaxed">{group.blurb}</p>

        <div className="mt-3">
          <GroupBadges group={group} />
        </div>

        <dl className="mt-4 grid grid-cols-2 gap-2 text-[12px]">
          <div className="rounded-xl border border-border bg-card px-3 py-2.5">
            <dt className="text-ink-soft inline-flex items-center gap-1.5"><Clock className="h-3 w-3" aria-hidden="true" /> Rhythm</dt>
            <dd className="mt-0.5 text-ink">{group.cadence}</dd>
          </div>
          <div className="rounded-xl border border-border bg-card px-3 py-2.5">
            <dt className="text-ink-soft inline-flex items-center gap-1.5"><Users className="h-3 w-3" aria-hidden="true" /> Seats</dt>
            <dd className="mt-0.5 text-ink">{group.seats_open} of {group.seats_total} open</dd>
          </div>
        </dl>

        <div className="mt-3 bg-card border border-border rounded-xl p-3 flex items-center gap-3">
          <Avatar name={fac?.name ?? "Witness"} photo={fac?.photo} size={40} />
          <div className="leading-tight">
            <p className="text-[12px] text-ink-soft inline-flex items-center gap-1"><Shield className="h-3 w-3 text-brass" aria-hidden="true" /> Facilitator</p>
            <p className="text-[14px] font-medium text-ink">{fac?.name ?? "Being assigned"}</p>
          </div>
        </div>

        <section aria-labelledby="group-agreement" className="mt-5 rounded-2xl border border-border bg-secondary p-4">
          <h2 id="group-agreement" className="text-[11px] uppercase tracking-[0.18em] text-ink-soft">Our agreement</h2>
          <ul className="mt-2.5 space-y-2">
            {group.covenant.map(line => (
              <li key={line} className="flex items-start gap-2.5 text-[13px] leading-snug text-ink">
                <Check className="mt-0.5 h-3.5 w-3.5 shrink-0 text-hope" strokeWidth={2.5} aria-hidden="true" />
                {line}
              </li>
            ))}
          </ul>
          <p className="mt-3 inline-flex items-center gap-1.5 text-[11.5px] text-ink-soft">
            <Lock className="h-3 w-3" aria-hidden="true" /> Everything shared here stays inside the group.
          </p>
        </section>
      </header>

      {joined ? (
        <>
          <section className="mt-7 px-5" aria-labelledby="roster">
            <h2 id="roster" className="font-serif text-[13px] text-ink-soft mb-3 uppercase tracking-[0.18em]">At the table</h2>
            <div className="flex flex-wrap gap-3">
              {(rosterQ.data ?? []).map(a => (
                <Link key={a.id} to="/person/$id" params={{ id: a.id }} className="flex flex-col items-center gap-1 w-14">
                  <Avatar name={a.name} photo={a.photo} size={44} />
                  <span className="text-[10px] text-ink-soft truncate w-full text-center">{a.id === userId ? "You" : a.name.split(" ")[0]}</span>
                </Link>
              ))}
            </div>
          </section>

          <section className="mt-7 px-4" aria-labelledby="private-feed">
            <h2 id="private-feed" className="px-1 font-serif text-[13px] text-ink-soft mb-3 uppercase tracking-[0.18em]">Circle prayers</h2>
            {groupPrayers.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-border p-5 text-center">
                <p className="text-[13.5px] text-ink-soft">Nothing shared with the circle yet.</p>
                <p className="mt-1 text-[12px] text-ink-soft">Post a prayer with privacy set to <span className="text-ink">Circle</span> and it lands here for the people at this table.</p>
                <Link to="/record" search={{ mode: "prayer" }} className="mt-3 inline-block rounded-full bg-ink px-4 py-2 text-[12.5px] text-paper">Share with the circle</Link>
              </div>
            ) : (
              <div className="space-y-5">
                {groupPrayers.map(p => <PrayerCard key={p.id} prayer={p} onRemoved={() => qc.invalidateQueries({ queryKey: ["stories"] })} />)}
              </div>
            )}
          </section>

          <button onClick={() => void leave()} className="mx-5 mt-8 inline-flex items-center gap-1.5 text-[12px] text-ink-soft hover:text-destructive">
            <LogOut className="h-3.5 w-3.5" /> Leave this circle
          </button>
        </>
      ) : (
        <section className="mt-7 px-5">
          <p className="text-[12.5px] text-ink-soft italic">What's shared inside stays inside. Take a seat to see the table.</p>
        </section>
      )}

      {!joined && (
        <div className="fixed bottom-0 left-1/2 z-30 w-full max-w-md -translate-x-1/2 border-t border-border bg-paper/95 px-5 pb-28 pt-3 backdrop-blur-md md:bottom-6 md:left-[calc(50%+3rem)] md:max-w-lg md:rounded-lg md:border md:pb-3 md:shadow-lift lg:left-[calc(50%+8rem)]">
          <button
            type="button"
            disabled={!group.accepting || group.seats_open === 0}
            onClick={() => { if (!signedIn) { toast.error("Sign in to take a seat."); return; } setRitualOpen(true); }}
            className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-ink py-3.5 text-[14px] font-medium text-paper tap-scale disabled:opacity-50"
          >
            <DoorOpen className="h-4 w-4" aria-hidden="true" />
            {group.seats_open === 0 ? "Full for now" : "Take an open seat"}
          </button>
          <p className="mt-2 text-center text-[11px] text-ink-soft">Three short steps at the door — you can stop at any point.</p>
        </div>
      )}

      <JoinRitual
        group={group}
        open={ritualOpen}
        onClose={() => setRitualOpen(false)}
        onJoined={async (note) => { if (!userId) throw new Error("Sign in first."); await joinGroup(group, userId, note); refresh(); }}
      />
    </div>
  );
}
