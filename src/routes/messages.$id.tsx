import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { useSession } from "@/hooks/useSession";
import { supabase } from "@/integrations/supabase/client";
import {
  loadMessages,
  personName,
  sendMessage,
  threadPeople,
  type Message,
  type ThreadPerson,
} from "@/lib/messaging";
import { Avatar } from "./messages.index";
import { SafetyMenu } from "@/components/safety/ReportSheet";
import { ArrowLeft, Send, Lock, Phone, Video } from "lucide-react";

export const Route = createFileRoute("/messages/$id")({
  staticData: { sitemap: false },
  component: Thread,
  head: () => ({
    meta: [
      { title: "Conversation · Witness" },
      { name: "description", content: "A private conversation kept under the agreement." },
      { property: "og:title", content: "Conversation · Witness" },
      { property: "og:description", content: "A private conversation kept under the agreement." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
});

function clock(iso: string) {
  return new Date(iso).toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });
}

function Thread() {
  const { id } = Route.useParams();
  const { userId, signedIn } = useSession();
  const navigate = useNavigate();
  const [messages, setMessages] = useState<Message[]>([]);
  const [people, setPeople] = useState<ThreadPerson[]>([]);
  const [draft, setDraft] = useState("");
  const [sending, setSending] = useState(false);
  const endRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (signedIn === false) navigate({ to: "/login" });
  }, [signedIn, navigate]);

  useEffect(() => {
    if (!userId) return;
    let live = true;
    loadMessages(id).then(rows => live && setMessages(rows));
    threadPeople(id, userId).then(rows => live && setPeople(rows));

    const channel = supabase
      .channel(`thread-${id}`)
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "messages", filter: `conversation_id=eq.${id}` },
        payload => {
          const row = payload.new as Message;
          setMessages(prev => (prev.some(m => m.id === row.id) ? prev : [...prev, row]));
        },
      )
      .subscribe();

    supabase
      .from("conversation_members")
      .update({ last_read_at: new Date().toISOString() })
      .eq("conversation_id", id)
      .eq("user_id", userId);

    return () => {
      live = false;
      supabase.removeChannel(channel);
    };
  }, [id, userId]);

  useEffect(() => {
    endRef.current?.scrollIntoView({ block: "end" });
  }, [messages.length]);

  const send = async () => {
    if (!userId || !draft.trim() || sending) return;
    setSending(true);
    const body = draft;
    setDraft("");
    const { error } = await sendMessage(id, userId, body);
    if (error) setDraft(body);
    setSending(false);
  };

  const title =
    people.length > 1 ? people.map(personName).join(", ") : personName(people[0]);

  return (
    <div className="flex min-h-[calc(100vh-6rem)] flex-col">
      <header className="sticky top-[57px] z-20 flex items-center gap-3 border-b border-border/60 bg-paper/90 px-4 py-3 backdrop-blur-md">
        <Link to="/messages" aria-label="Back to messages" className="text-ink-soft">
          <ArrowLeft className="h-5 w-5" strokeWidth={1.8} />
        </Link>
        {people[0] && <Avatar person={people[0]} size={34} />}
        <div className="min-w-0 flex-1 leading-tight">
          <p className="truncate text-[14.5px] font-medium text-ink">{title}</p>
          <p className="flex items-center gap-1 text-[10.5px] text-ink-soft">
            <Lock className="h-2.5 w-2.5" strokeWidth={2} />
            Agreement kept
          </p>
        </div>
        <div className="flex items-center gap-1">
          <button
            onClick={() => navigate({ to: "/call/$id", params: { id }, search: { kind: "audio", role: "start" } })}
            aria-label={`Voice call ${title}`}
            className="grid h-9 w-9 place-items-center rounded-full text-ink-soft transition-colors hover:bg-secondary hover:text-ink"
          >
            <Phone className="h-4.5 w-4.5" strokeWidth={1.8} />
          </button>
          <button
            onClick={() => navigate({ to: "/call/$id", params: { id }, search: { kind: "video", role: "start" } })}
            aria-label={`Video call ${title}`}
            className="grid h-9 w-9 place-items-center rounded-full text-ink-soft transition-colors hover:bg-secondary hover:text-ink"
          >
            <Video className="h-4.5 w-4.5" strokeWidth={1.8} />
          </button>
        </div>
      </header>

      <div className="flex-1 space-y-2.5 px-4 py-5">
        {messages.length === 0 && (
          <p className="mx-auto max-w-[16rem] pt-8 text-center text-[13px] text-ink-soft">
            Nothing here yet. A first sentence is enough.
          </p>
        )}
        {messages.map(message => {
          const mine = message.sender_id === userId;
          if (message.kind === "call") {
            return (
              <p key={message.id} className="text-center text-[11.5px] text-ink-soft">
                {message.body} · {clock(message.created_at)}
              </p>
            );
          }
          return (
            <div key={message.id} className={mine ? "flex justify-end" : "flex justify-start"}>
              <div className={`flex items-end gap-1 ${mine ? "flex-row-reverse" : ""}`}>
                <div
                  className={`max-w-[78%] rounded-2xl px-3.5 py-2.5 text-[14px] leading-relaxed ${
                    mine
                      ? "bg-ink text-paper rounded-br-md"
                      : "border border-border bg-card text-ink rounded-bl-md"
                  }`}
                >
                  <p className="whitespace-pre-wrap break-words">{message.body}</p>
                  <p
                    className={`mt-1 text-[10px] ${mine ? "text-paper/60" : "text-ink-soft"}`}
                  >
                    {clock(message.created_at)}
                  </p>
                </div>
                {!mine && (
                  <span className="opacity-40 transition-opacity focus-within:opacity-100 hover:opacity-100 [&_button]:p-1 [&_button]:mr-0">
                    <SafetyMenu targetType="message" targetId={message.id} authorId={message.sender_id} />
                  </span>
                )}
              </div>
            </div>
          );
        })}
        <div ref={endRef} />
      </div>

      <div className="sticky bottom-0 border-t border-border/60 bg-paper/95 px-3 py-3 backdrop-blur-md">
        <div className="flex items-end gap-2">
          <textarea
            value={draft}
            rows={1}
            onChange={e => setDraft(e.target.value)}
            onKeyDown={e => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                send();
              }
            }}
            placeholder="Write something true…"
            className="max-h-32 flex-1 resize-none rounded-2xl border border-border bg-card px-3.5 py-2.5 text-[14px] text-ink outline-none focus:border-brass/60"
          />
          <button
            onClick={send}
            disabled={!draft.trim() || sending}
            aria-label="Send"
            className="grid h-11 w-11 shrink-0 place-items-center rounded-full bg-primary text-primary-foreground tap-scale disabled:opacity-40"
          >
            <Send className="h-4.5 w-4.5" strokeWidth={1.8} />
          </button>
        </div>
      </div>
    </div>
  );
}
