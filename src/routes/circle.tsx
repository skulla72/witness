import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { Search, UserPlus, Users, X } from "lucide-react";
import { toast } from "sonner";
import { PrayerCard } from "@/components/PrayerCard";
import { Avatar } from "@/components/Avatar";
import { FriendButton } from "@/components/FriendButton";
import { useSession } from "@/hooks/useSession";
import { loadMyGroups, loadRoster } from "@/lib/groups";
import { loadFeed, type Author } from "@/lib/prayers";
import { searchPeople } from "@/lib/messaging";
import { incomingRequests, listFriends, outgoingRequests, removeLink, respond } from "@/lib/friends";
import { useTone } from "@/hooks/useTone";


export const Route = createFileRoute("/circle")({
  staticData: { sitemap: false },
  component: Circle,
  head: () => ({ meta: [
    { title: "Circle · Witness" },
    { name: "description", content: "The people you've trusted with the hard ones." },
    { property: "og:title", content: "Circle · Witness" },
    { property: "og:description", content: "The people you've trusted with the hard ones." },
    { property: "og:type", content: "website" },
    { name: "twitter:card", content: "summary" },
  ] }),
});

function Circle() {
  const { userId, signedIn } = useSession();
  const tone = useTone();
  const qc = useQueryClient();
  const groupsQ = useQuery({ queryKey: ["groups", "mine", userId], queryFn: () => loadMyGroups(userId!), enabled: !!userId });
  const groups = groupsQ.data ?? [];
  const peopleQ = useQuery({
    queryKey: ["circle-people", userId, groups.map(g => g.id).join(",")],
    queryFn: async () => {
      const rosters = await Promise.all(groups.map(g => loadRoster(g.id)));
      const seen = new Map<string, Author>();
      for (const r of rosters) for (const a of r) if (a.id !== userId) seen.set(a.id, a);
      return Array.from(seen.values());
    },
    enabled: !!userId && groups.length > 0,
  });
  const feedQ = useQuery({ queryKey: ["stories", "feed", userId ?? "anon", 60], queryFn: () => loadFeed(userId ?? null, 60), enabled: !!userId });

  const members = peopleQ.data ?? [];
  const memberIds = new Set(members.map(m => m.id));
  const circleFeed = (feedQ.data ?? []).filter(p => p.privacy === "circle" && (memberIds.has(p.user_id) || p.user_id === userId));

  return (
    <div className="px-4 pt-6">
      <header className="px-2 mb-5">
        <p className="text-[11px] uppercase tracking-[0.22em] text-brass">Your inner few</p>
        <h1 className="mt-2 font-serif text-[30px] text-ink">{tone.faith ? "Prayer Circle" : "My people"}</h1>
        <p className="mt-2 text-[13px] text-ink-soft">
          {tone.faith ? "The people you've trusted with the hard ones — everyone who sits at a Walk-With table with you." : "The people you've trusted with the hard things — everyone in your close circles."}
        </p>
      </header>

      {signedIn !== false && userId && <PeopleSearch myUserId={userId} />}
      {signedIn !== false && userId && <FriendRequests myUserId={userId} />}


      {signedIn === false ? (
        <div className="text-center py-8">
          <p className="font-serif text-[18px] text-ink-soft">Sign in to see your circle.</p>
          <Link to="/login" className="mt-4 inline-block rounded-full bg-ink px-5 py-2.5 text-[13px] text-paper">Sign in</Link>
        </div>
      ) : (
        <>
          <div className="bg-card border border-border rounded-2xl p-4 shadow-soft mb-6">
            <div className="flex -space-x-2 mb-3">
              {members.slice(0, 8).map(m => (
                <Link key={m.id} to="/person/$id" params={{ id: m.id }} aria-label={m.name}>
                  <Avatar name={m.name} photo={m.photo} size={40} className="border-2 border-card" />
                </Link>
              ))}
              <Link to="/walk" aria-label="Find a circle" className="h-10 w-10 rounded-full border-2 border-card bg-secondary grid place-items-center text-ink-soft">
                <UserPlus className="h-4 w-4" />
              </Link>
            </div>
            <p className="text-[13px] text-ink-soft">
              {members.length === 0 ? (
                <>No one in your circle yet. <Link to="/walk" className="text-brass">Take a seat at a table</Link> and the people there become your circle.</>
              ) : (
                <><span className="text-ink font-medium">{members.length} {members.length === 1 ? "person" : "people"}</span> in your circle. {tone.faith ? "Prayers" : "Posts"} you mark <span className="text-ink">Circle</span> are shared only with them.</>
              )}
            </p>
          </div>

          <h2 className="px-2 font-serif text-[14px] text-ink-soft mb-3 uppercase tracking-[0.18em]">Your circles</h2>
          <div className="space-y-2 mb-8">
            {groupsQ.isLoading && <div className="h-14 rounded-xl bg-card border border-border animate-pulse" />}
            {!groupsQ.isLoading && groups.length === 0 && (
              <Link to="/walk" className="bg-card border border-dashed border-border rounded-xl px-4 py-3 flex items-center gap-3">
                <Users className="h-4 w-4 text-brass" />
                <p className="text-[13px] text-ink-soft">Browse Walk-With circles</p>
              </Link>
            )}
            {groups.map(g => (
              <Link key={g.id} to="/walk/$id" params={{ id: g.id }} className="bg-card border border-border rounded-xl px-4 py-3 flex items-center justify-between gap-3">
                <div className="min-w-0">
                  <p className="font-serif text-[15px] text-ink">{g.topic}</p>
                  <p className="text-[11px] text-ink-soft tracking-wide">{g.members} at the table · {g.cadence}</p>
                </div>
                <span className="shrink-0 text-[12px] text-brass">Open</span>
              </Link>
            ))}
          </div>

          <h2 className="px-2 font-serif text-[14px] text-ink-soft mb-3 uppercase tracking-[0.18em]">{tone.faith ? "From your circle" : "From your people"}</h2>
          {circleFeed.length === 0 ? (
            <p className="px-2 text-[13px] text-ink-soft italic">Nothing shared circle-only yet.</p>
          ) : (
            <div className="space-y-5">
              {circleFeed.map(p => <PrayerCard key={p.id} prayer={p} onRemoved={() => qc.invalidateQueries({ queryKey: ["stories"] })} />)}
            </div>
          )}
        </>
      )}
    </div>
  );
}

function FriendRequests({ myUserId }: { myUserId: string }) {
  const qc = useQueryClient();
  const inQ = useQuery({ queryKey: ["friend-requests", "in", myUserId], queryFn: () => incomingRequests(myUserId) });
  const outQ = useQuery({ queryKey: ["friend-requests", "out", myUserId], queryFn: () => outgoingRequests(myUserId) });
  const friendsQ = useQuery({ queryKey: ["friends", myUserId], queryFn: () => listFriends(myUserId) });

  const refresh = () => {
    qc.invalidateQueries({ queryKey: ["friend-requests"] });
    qc.invalidateQueries({ queryKey: ["friends"] });
    qc.invalidateQueries({ queryKey: ["friend-link"] });
  };

  const answer = async (id: string, status: "accepted" | "declined", name: string) => {
    const res = await respond(id, status);
    if (res.error) toast.error(res.error);
    else toast.success(status === "accepted" ? `You and ${name} are connected.` : "Request declined.");
    refresh();
  };

  const cancel = async (id: string) => {
    const res = await removeLink(id);
    if (res.error) toast.error(res.error);
    refresh();
  };

  const incoming = inQ.data ?? [];
  const outgoing = outQ.data ?? [];
  const friends = friendsQ.data ?? [];

  if (incoming.length === 0 && outgoing.length === 0 && friends.length === 0) return null;

  return (
    <div className="mb-6 space-y-4">
      {incoming.length > 0 && (
        <section>
          <h2 className="px-2 font-serif text-[14px] text-ink-soft mb-3 uppercase tracking-[0.18em]">
            Waiting on you
          </h2>
          <div className="space-y-2">
            {incoming.map(r => {
              const name = r.person.display_name?.trim() || "Someone here";
              return (
                <div key={r.id} className="flex items-center gap-3 rounded-xl border border-brass/40 bg-brass/5 px-3 py-2.5">
                  <Link to="/person/$id" params={{ id: r.person.user_id }} aria-label={name}>
                    <Avatar name={name} photo={r.person.avatar_url} size={38} />
                  </Link>
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-serif text-[14px] text-ink">{name}</p>
                    <p className="text-[11.5px] text-ink-soft">asked to connect with you</p>
                  </div>
                  <button
                    onClick={() => void answer(r.id, "accepted", name)}
                    className="shrink-0 rounded-full bg-ink px-3.5 py-1.5 text-[12px] text-paper"
                  >
                    Accept
                  </button>
                  <button
                    onClick={() => void answer(r.id, "declined", name)}
                    aria-label={`Decline ${name}`}
                    className="shrink-0 rounded-full border border-border bg-card p-1.5 text-ink-soft"
                  >
                    <X className="h-3.5 w-3.5" />
                  </button>
                </div>
              );
            })}
          </div>
        </section>
      )}

      {outgoing.length > 0 && (
        <section>
          <h2 className="px-2 font-serif text-[14px] text-ink-soft mb-3 uppercase tracking-[0.18em]">Asked</h2>
          <div className="space-y-2">
            {outgoing.map(r => {
              const name = r.person.display_name?.trim() || "Someone here";
              return (
                <div key={r.id} className="flex items-center gap-3 rounded-xl border border-border bg-card px-3 py-2.5">
                  <Avatar name={name} photo={r.person.avatar_url} size={34} />
                  <p className="min-w-0 flex-1 truncate text-[13px] text-ink">{name}</p>
                  <button onClick={() => void cancel(r.id)} className="shrink-0 text-[12px] text-ink-soft">
                    Cancel
                  </button>
                </div>
              );
            })}
          </div>
        </section>
      )}

      {friends.length > 0 && (
        <section>
          <h2 className="px-2 font-serif text-[14px] text-ink-soft mb-3 uppercase tracking-[0.18em]">Connected</h2>
          <div className="space-y-2">
            {friends.map(f => {
              const name = f.person.display_name?.trim() || "Someone here";
              return (
                <Link
                  key={f.linkId}
                  to="/person/$id"
                  params={{ id: f.person.user_id }}
                  className="flex items-center gap-3 rounded-xl border border-border bg-card px-3 py-2.5 shadow-soft"
                >
                  <Avatar name={name} photo={f.person.avatar_url} size={34} />
                  <p className="min-w-0 flex-1 truncate text-[13px] text-ink">{name}</p>
                  <span className="shrink-0 text-[12px] text-brass">Open</span>
                </Link>
              );
            })}
          </div>
        </section>
      )}
    </div>
  );
}

function PeopleSearch({ myUserId }: { myUserId: string }) {
  const [q, setQ] = useState("");
  const resultsQ = useQuery({
    queryKey: ["people-search", q.trim()],
    queryFn: () => searchPeople(q),
    enabled: q.trim().length >= 2,
    staleTime: 15_000,
  });
  const hits = (resultsQ.data ?? []).filter(p => p.user_id !== myUserId);

  return (
    <div className="mb-6">
      <label className="flex items-center gap-2 rounded-full border border-border bg-card px-4 py-2.5 shadow-soft">
        <Search className="h-4 w-4 text-ink-soft" strokeWidth={1.8} />
        <input
          value={q}
          onChange={e => setQ(e.target.value)}
          placeholder="Find people by name…"
          aria-label="Find people by name"
          className="w-full bg-transparent text-[14px] text-ink placeholder:text-ink-soft/70 focus:outline-none"
        />
      </label>
      {q.trim().length >= 2 && (
        <div className="mt-2 space-y-2">
          {resultsQ.isLoading && <div className="h-14 rounded-xl bg-card border border-border animate-pulse" />}
          {!resultsQ.isLoading && hits.length === 0 && (
            <p className="px-2 py-2 text-[13px] text-ink-soft italic">No one by that name yet.</p>
          )}
          {hits.map(p => (
            <div
              key={p.user_id}
              className="flex items-center gap-3 rounded-xl border border-border bg-card px-3 py-2.5 shadow-soft"
            >
              <Link to="/person/$id" params={{ id: p.user_id }} className="flex min-w-0 flex-1 items-center gap-3">
                <Avatar name={p.display_name ?? "?"} photo={p.avatar_url} size={38} />
                <div className="min-w-0">
                  <p className="truncate font-serif text-[14px] text-ink">{p.display_name ?? "Someone here"}</p>
                  <p className="truncate text-[11.5px] text-ink-soft">
                    {p.business_name || p.bio || "Member"}
                  </p>
                </div>
              </Link>
              <div className="shrink-0">
                <FriendButton
                  myUserId={myUserId}
                  personId={p.user_id}
                  firstName={(p.display_name ?? "them").split(" ")[0]}
                />
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

