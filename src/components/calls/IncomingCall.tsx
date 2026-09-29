import { useEffect, useRef, useState } from "react";
import { useLocation, useNavigate } from "@tanstack/react-router";
import { Phone, PhoneOff, Video } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useSession } from "@/hooks/useSession";
import { personName, threadPeople, type ThreadPerson } from "@/lib/messaging";

interface Ringing {
  callId: string;
  conversationId: string;
  kind: "audio" | "video";
  person: ThreadPerson | null;
}

/**
 * Listens for calls ringing in any conversation the signed-in member belongs
 * to and shows an answer/decline sheet, wherever they are in the app.
 * Row-level security on `calls` means we only ever hear about our own
 * conversations.
 */
export function IncomingCall() {
  const { userId } = useSession();
  const navigate = useNavigate();
  const { pathname } = useLocation();
  const [ringing, setRinging] = useState<Ringing | null>(null);
  const ringingRef = useRef<Ringing | null>(null);
  ringingRef.current = ringing;

  useEffect(() => {
    if (!userId) return;

    const onRing = async (callId: string, conversationId: string, initiatorId: string, kind: string) => {
      if (initiatorId === userId) return;
      if (pathname.startsWith("/call/")) return; // already in a call
      const people = await threadPeople(conversationId, userId);
      setRinging({
        callId,
        conversationId,
        kind: kind === "audio" ? "audio" : "video",
        person: people[0] ?? null,
      });
    };

    const channel = supabase
      .channel(`incoming-calls-${userId}`)
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "calls" },
        payload => {
          const row = payload.new as { id: string; conversation_id: string; initiator_id: string; kind: string; status: string };
          if (row.status === "ringing") void onRing(row.id, row.conversation_id, row.initiator_id, row.kind);
        },
      )
      .on(
        "postgres_changes",
        { event: "UPDATE", schema: "public", table: "calls" },
        payload => {
          const row = payload.new as { id: string; status: string };
          // Caller hung up or it was answered elsewhere — stop ringing.
          if (ringingRef.current?.callId === row.id && row.status !== "ringing") setRinging(null);
        },
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [userId, pathname]);

  // A ring nobody answers fades after 45 seconds.
  useEffect(() => {
    if (!ringing) return;
    const timer = setTimeout(() => setRinging(null), 45_000);
    return () => clearTimeout(timer);
  }, [ringing]);

  if (!ringing) return null;

  const name = personName(ringing.person ?? undefined);
  const label = ringing.kind === "video" ? "Video call" : "Voice call";

  const answer = () => {
    const target = ringing;
    setRinging(null);
    void navigate({
      to: "/call/$id",
      params: { id: target.conversationId },
      search: { kind: target.kind, callId: target.callId, role: "answer" },
    });
  };

  const decline = async () => {
    const target = ringing;
    setRinging(null);
    await supabase
      .from("calls")
      .update({ status: "missed", ended_at: new Date().toISOString() })
      .eq("id", target.callId)
      .eq("status", "ringing");
  };

  return (
    <div className="fixed inset-0 z-[80] flex items-end justify-center bg-ink/60 backdrop-blur-[2px]" role="dialog" aria-modal="true" aria-label="Incoming call">
      <div className="w-full max-w-md rounded-t-3xl border-t border-border bg-card p-6 pb-10 shadow-lift">
        <div className="flex items-center gap-4">
          {ringing.person?.avatar_url ? (
            <img src={ringing.person.avatar_url} alt="" className="h-16 w-16 rounded-full border-2 border-brass/50 object-cover" />
          ) : (
            <span className="grid h-16 w-16 place-items-center rounded-full bg-secondary font-serif text-[22px] text-ink">
              {name.charAt(0)}
            </span>
          )}
          <div className="min-w-0 flex-1">
            <p className="flex items-center gap-1.5 text-[10.5px] uppercase tracking-[0.2em] text-brass">
              {ringing.kind === "video" ? <Video className="h-3 w-3" /> : <Phone className="h-3 w-3" />}
              Incoming {label.toLowerCase()}
            </p>
            <p className="mt-1 truncate font-serif text-[22px] text-ink">{name}</p>
          </div>
          <span className="h-2 w-2 animate-ping rounded-full bg-flame" aria-hidden />
        </div>

        <div className="mt-6 grid grid-cols-2 gap-3">
          <button
            onClick={() => void decline()}
            className="inline-flex items-center justify-center gap-2 rounded-2xl border border-destructive/40 bg-destructive/10 py-3.5 text-[14px] font-medium text-destructive tap-scale"
          >
            <PhoneOff className="h-4.5 w-4.5" strokeWidth={1.9} /> Decline
          </button>
          <button
            onClick={answer}
            className="inline-flex items-center justify-center gap-2 rounded-2xl bg-ink py-3.5 text-[14px] font-medium text-paper tap-scale"
          >
            {ringing.kind === "video" ? <Video className="h-4.5 w-4.5" strokeWidth={1.9} /> : <Phone className="h-4.5 w-4.5" strokeWidth={1.9} />}
            Answer
          </button>
        </div>
        <p className="mt-4 text-center text-[11px] text-ink-soft">Nothing said on a call is recorded or stored.</p>
      </div>
    </div>
  );
}
