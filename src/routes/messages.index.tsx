import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useSession } from "@/hooks/useSession";
import {
  listThreads,
  messageablepeople,
  openDirectThread,
  personName,
  type Thread,
  type ThreadPerson,
} from "@/lib/messaging";
import { supabase } from "@/integrations/supabase/client";
import { MessageCircle, PenLine, Lock, LogIn, ChevronRight } from "lucide-react";

export const Route = createFileRoute("/messages/")({
  staticData: { sitemap: false },
  component: Messages,
  head: () => ({
    meta: [
      { title: "Messages · Witness" },
      {
        name: "description",
        content: "Private, agreement-kept conversations with the people walking with you.",
      },
      { property: "og:title", content: "Messages · Witness" },
      { property: "og:description", content: "Private conversations with your people." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
});

function initials(name: string) {
  return name
    .split(" ")
    .slice(0, 2)
    .map(part => part[0]?.toUpperCase() ?? "")
    .join("");
}

function when(iso: string) {
  const date = new Date(iso);
  const sameDay = new Date().toDateString() === date.toDateString();
  return sameDay
    ? date.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" })
    : date.toLocaleDateString([], { month: "short", day: "numeric" });
}

export function Avatar({ person, size = 44 }: { person: ThreadPerson; size?: number }) {
  const name = personName(person);
  return person.avatar_url ? (
    <img
      src={person.avatar_url}
      alt=""
      style={{ height: size, width: size }}
      className="rounded-full object-cover border border-border"
    />
  ) : (
    <span
      style={{ height: size, width: size }}
      className="grid place-items-center rounded-full bg-secondary text-[13px] text-ink-soft"
    >
      {initials(name) || "·"}
    </span>
  );
}

function Messages() {
  const { userId, signedIn } = useSession();
  const [threads, setThreads] = useState<Thread[] | null>(null);
  const [people, setPeople] = useState<ThreadPerson[]>([]);
  const [composing, setComposing] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    if (!userId) return;
    let live = true;
    const load = () => {
      listThreads(userId).then(rows => live && setThreads(rows));
    };
    load();
    messageablepeople(userId).then(rows => live && setPeople(rows));

    const channel = supabase
      .channel("messages-inbox")
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "messages" }, load)
      .subscribe();

    return () => {
      live = false;
      supabase.removeChannel(channel);
    };
  }, [userId]);

  const start = async (otherUserId: string) => {
    if (!userId) return;
    const { id } = await openDirectThread(userId, otherUserId);
    if (id) navigate({ to: "/messages/$id", params: { id } });
  };

  if (signedIn === false) {
    return (
      <div className="px-6 pt-16 text-center">
        <span className="mx-auto grid h-14 w-14 place-items-center rounded-full bg-brass/15">
          <Lock className="h-6 w-6 text-brass" strokeWidth={1.7} />
        </span>
        <h1 className="mt-4 font-serif text-[24px] text-ink">Messages are private</h1>
        <p className="mt-2 text-[13px] text-ink-soft">
          Sign in to reach the people walking with you.
        </p>
        <Link
          to="/login"
          className="mt-5 inline-flex items-center gap-2 rounded-full bg-ink px-5 py-2.5 text-[13.5px] text-paper tap-scale"
        >
          <LogIn className="h-4 w-4" strokeWidth={1.8} />
          Sign in
        </Link>
      </div>
    );
  }

  return (
    <div className="pt-6">
      <header className="px-6">
        <p className="text-[11px] uppercase tracking-[0.22em] text-brass">Kept between you</p>
        <div className="mt-2 flex items-end justify-between gap-3">
          <h1 className="font-serif text-[30px] text-ink">Messages</h1>
          <button
            onClick={() => setComposing(v => !v)}
            className="inline-flex items-center gap-1.5 rounded-full border border-border bg-card px-3.5 py-2 text-[12.5px] text-ink tap-scale"
          >
            <PenLine className="h-3.5 w-3.5 text-brass" strokeWidth={1.8} />
            New
          </button>
        </div>
        <p className="mt-2 flex items-center gap-1.5 text-[12px] text-ink-soft">
          <Lock className="h-3 w-3" strokeWidth={1.8} />
          The agreement applies here too — nothing leaves this room.
        </p>
      </header>

      {composing && (
        <section className="mt-5 mx-4 rounded-2xl border border-border bg-card p-4 shadow-soft rise-in">
          <p className="text-[11px] uppercase tracking-[0.16em] text-ink-soft">
            People you share a group with
          </p>
          {people.length === 0 ? (
            <p className="mt-3 text-[13px] text-ink-soft">
              Join a group or a community and the people there will show up here.
            </p>
          ) : (
            <ul className="mt-3 divide-y divide-border">
              {people.map(p => (
                <li key={p.user_id}>
                  <button
                    onClick={() => start(p.user_id)}
                    className="flex w-full items-center gap-3 py-2.5 text-left"
                  >
                    <Avatar person={p} size={36} />
                    <span className="flex-1 text-[14px] text-ink">{personName(p)}</span>
                    <ChevronRight className="h-4 w-4 text-ink-soft" />
                  </button>
                </li>
              ))}
            </ul>
          )}
        </section>
      )}

      <div className="mt-6 mx-4 overflow-hidden rounded-2xl border border-border bg-card shadow-soft">
        {threads === null ? (
          <p className="px-4 py-6 text-[13px] text-ink-soft">Opening your conversations…</p>
        ) : threads.length === 0 ? (
          <div className="px-5 py-10 text-center">
            <span className="mx-auto grid h-12 w-12 place-items-center rounded-full bg-secondary">
              <MessageCircle className="h-5 w-5 text-ink-soft" strokeWidth={1.7} />
            </span>
            <p className="mt-3 font-serif text-[17px] text-ink">No conversations yet</p>
            <p className="mt-1 text-[12.5px] text-ink-soft">
              Tap “New” to reach someone from your groups.
            </p>
          </div>
        ) : (
          <ul className="divide-y divide-border">
            {threads.map(thread => {
              const first = thread.people[0];
              const title =
                thread.title?.trim() ||
                (thread.people.length > 1
                  ? thread.people.map(personName).join(", ")
                  : personName(first));
              return (
                <li key={thread.id}>
                  <Link
                    to="/messages/$id"
                    params={{ id: thread.id }}
                    className="flex items-center gap-3 px-4 py-3.5"
                  >
                    <Avatar
                      person={
                        first ?? { user_id: thread.id, display_name: title, avatar_url: null }
                      }
                    />
                    <div className="min-w-0 flex-1 leading-tight">
                      <p className="truncate text-[14.5px] font-medium text-ink">{title}</p>
                      <p className="mt-0.5 truncate text-[12.5px] text-ink-soft">
                        {thread.preview ?? "Say the first word."}
                      </p>
                    </div>
                    <span className="shrink-0 text-[11px] text-ink-soft">
                      {when(thread.last_message_at)}
                    </span>
                  </Link>
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </div>
  );
}
