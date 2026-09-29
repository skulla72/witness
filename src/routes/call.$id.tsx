import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { useSession } from "@/hooks/useSession";
import { supabase } from "@/integrations/supabase/client";
import { personName, sendMessage, threadPeople, type ThreadPerson } from "@/lib/messaging";
import { Mic, MicOff, Video, VideoOff, PhoneOff, Lock } from "lucide-react";

type CallKind = "audio" | "video";
type CallRole = "start" | "answer";

type CallSearch = { kind: CallKind; callId?: string; role: CallRole };

export const Route = createFileRoute("/call/$id")({
  staticData: { sitemap: false },
  component: CallScreen,
  validateSearch: (search: Record<string, unknown>): CallSearch => ({
    kind: search['kind'] === "audio" ? "audio" : "video",
    callId: typeof search['callId'] === "string" ? search['callId'] : undefined,
    role: search['role'] === "answer" ? "answer" : "start",
  }),
  head: () => ({
    meta: [
      { title: "Call · Witness" },
      { name: "description", content: "A private call with someone walking with you." },
      { property: "og:title", content: "Call · Witness" },
      { property: "og:description", content: "A private call with someone walking with you." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
});

const RTC_CONFIG: RTCConfiguration = {
  iceServers: [{ urls: ["stun:stun.l.google.com:19302", "stun:stun1.l.google.com:19302"] }],
};

type Signal =
  | { type: "ready" }
  | { type: "sdp"; description: RTCSessionDescriptionInit }
  | { type: "ice"; candidate: RTCIceCandidateInit };

function CallScreen() {
  const { id } = Route.useParams();
  const { kind, callId: incomingCallId, role } = Route.useSearch();
  const { userId, signedIn } = useSession();
  const navigate = useNavigate();

  const [people, setPeople] = useState<ThreadPerson[]>([]);
  const [status, setStatus] = useState<"connecting" | "ringing" | "active" | "ended">("connecting");
  const [seconds, setSeconds] = useState(0);
  const [muted, setMuted] = useState(false);
  const [cameraOff, setCameraOff] = useState(kind === "audio");
  const [mediaError, setMediaError] = useState<string | null>(null);
  const [hasRemote, setHasRemote] = useState(false);

  const callIdRef = useRef<string | null>(incomingCallId ?? null);
  const streamRef = useRef<MediaStream | null>(null);
  const pcRef = useRef<RTCPeerConnection | null>(null);
  const channelRef = useRef<ReturnType<typeof supabase.channel> | null>(null);
  const localVideoRef = useRef<HTMLVideoElement | null>(null);
  const remoteVideoRef = useRef<HTMLVideoElement | null>(null);
  const remoteAudioRef = useRef<HTMLAudioElement | null>(null);
  const endedRef = useRef(false);
  const offerSentRef = useRef(false);

  useEffect(() => {
    if (signedIn === false) navigate({ to: "/login" });
  }, [signedIn, navigate]);

  // Our own camera and microphone.
  useEffect(() => {
    if (typeof navigator === "undefined" || !navigator.mediaDevices) return;
    let live = true;
    navigator.mediaDevices
      .getUserMedia({ audio: true, video: kind === "video" })
      .then(stream => {
        if (!live) {
          stream.getTracks().forEach(t => t.stop());
          return;
        }
        streamRef.current = stream;
        if (localVideoRef.current) localVideoRef.current.srcObject = stream;
        // If the peer connection came up before the camera did, add the tracks now.
        const pc = pcRef.current;
        if (pc) {
          const attached = new Set(pc.getSenders().map(s => s.track?.id));
          for (const track of stream.getTracks()) {
            if (!attached.has(track.id)) pc.addTrack(track, stream);
          }
        }
      })
      .catch(() => setMediaError("We couldn't reach your camera or microphone. Check the browser permission and try again."));

    return () => {
      live = false;
      streamRef.current?.getTracks().forEach(t => t.stop());
      streamRef.current = null;
    };
  }, [kind]);

  // Set up the call: caller creates the record, the answerer marks it live.
  useEffect(() => {
    if (!userId) return;
    let live = true;

    threadPeople(id, userId).then(rows => live && setPeople(rows));

    const setup = async () => {
      if (role === "answer") {
        if (!incomingCallId) return;
        callIdRef.current = incomingCallId;
        await supabase.from("calls").update({ status: "active" }).eq("id", incomingCallId).eq("status", "ringing");
        if (live) setStatus("active");
        return;
      }
      const { data } = await supabase
        .from("calls")
        .insert({ conversation_id: id, initiator_id: userId, kind, status: "ringing" })
        .select("id")
        .single();
      if (!live || !data) return;
      callIdRef.current = data.id;
      setStatus("ringing");
    };
    void setup();

    return () => {
      live = false;
    };
  }, [id, userId, kind, role, incomingCallId]);

  // The peer connection and its signaling channel, once we have a call id.
  useEffect(() => {
    if (status !== "ringing" && status !== "active") return;
    const callId = callIdRef.current;
    if (!callId || pcRef.current) return;

    const pc = new RTCPeerConnection(RTC_CONFIG);
    pcRef.current = pc;

    for (const track of streamRef.current?.getTracks() ?? []) {
      pc.addTrack(track, streamRef.current!);
    }

    const remote = new MediaStream();
    pc.ontrack = event => {
      for (const track of event.streams[0]?.getTracks() ?? [event.track]) remote.addTrack(track);
      if (remoteVideoRef.current) remoteVideoRef.current.srcObject = remote;
      if (remoteAudioRef.current) remoteAudioRef.current.srcObject = remote;
      setHasRemote(true);
    };

    // Private channel: only the two people in this conversation may listen or speak.
    const channel = supabase.channel(`rtc-${callId}`, { config: { private: true } });

    channelRef.current = channel;

    pc.onicecandidate = event => {
      if (event.candidate) {
        void channel.send({ type: "broadcast", event: "signal", payload: { type: "ice", candidate: event.candidate.toJSON() } satisfies Signal });
      }
    };

    channel.on("broadcast", { event: "signal" }, ({ payload }) => {
      const signal = payload as Signal;
      void (async () => {
        try {
          if (signal.type === "ready") {
            if (role === "answer") {
              // Caller says it's listening — make sure it hears we're ready too.
              await channel.send({ type: "broadcast", event: "signal", payload: { type: "ready" } satisfies Signal });
            } else if (!offerSentRef.current && pc.signalingState === "stable") {
              offerSentRef.current = true;
              const offer = await pc.createOffer();
              await pc.setLocalDescription(offer);
              await channel.send({ type: "broadcast", event: "signal", payload: { type: "sdp", description: offer } satisfies Signal });
            }
          } else if (signal.type === "sdp" && signal.description.type === "offer") {
            await pc.setRemoteDescription(signal.description);
            const answer = await pc.createAnswer();
            await pc.setLocalDescription(answer);
            await channel.send({ type: "broadcast", event: "signal", payload: { type: "sdp", description: answer } satisfies Signal });
          } else if (signal.type === "sdp" && signal.description.type === "answer") {
            await pc.setRemoteDescription(signal.description);
          } else if (signal.type === "ice") {
            await pc.addIceCandidate(signal.candidate);
          }
        } catch {
          /* a late or duplicate signal — the connection usually still completes */
        }
      })();
    });

    channel.subscribe(subscribed => {
      // Announce presence; the caller offers once the answerer announces back.
      if (subscribed === "SUBSCRIBED") {
        void channel.send({ type: "broadcast", event: "signal", payload: { type: "ready" } satisfies Signal });
      }
    });

    return () => {
      supabase.removeChannel(channel);
      channelRef.current = null;
      pc.close();
      pcRef.current = null;
    };
  }, [status, role]);

  // Call status changes: answered, declined, hung up.
  useEffect(() => {
    const channel = supabase
      .channel(`call-${id}`)
      .on(
        "postgres_changes",
        { event: "UPDATE", schema: "public", table: "calls", filter: `conversation_id=eq.${id}` },
        payload => {
          const row = payload.new as { id: string; status: string };
          if (callIdRef.current && row.id !== callIdRef.current) return;
          if (row.status === "active") setStatus("active");
          if (row.status === "ended" || row.status === "missed") setStatus("ended");
        },
      )
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [id]);

  // Ringing too long with no answer.
  useEffect(() => {
    if (status !== "ringing") return;
    const timer = setTimeout(() => void finish("missed"), 45_000);
    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [status]);

  // Leave cleanly once the other side ends it.
  useEffect(() => {
    if (status !== "ended" || endedRef.current) return;
    const timer = setTimeout(() => navigate({ to: "/messages/$id", params: { id } }), 1200);
    return () => clearTimeout(timer);
  }, [status, id, navigate]);

  useEffect(() => {
    if (status !== "active") return;
    const timer = setInterval(() => setSeconds(s => s + 1), 1000);
    return () => clearInterval(timer);
  }, [status]);

  useEffect(() => {
    streamRef.current?.getAudioTracks().forEach(track => (track.enabled = !muted));
  }, [muted]);

  useEffect(() => {
    streamRef.current?.getVideoTracks().forEach(track => (track.enabled = !cameraOff));
  }, [cameraOff]);

  const finish = async (outcome: "ended" | "missed") => {
    if (endedRef.current) return;
    endedRef.current = true;
    setStatus("ended");
    streamRef.current?.getTracks().forEach(t => t.stop());
    pcRef.current?.close();
    pcRef.current = null;
    if (callIdRef.current) {
      await supabase
        .from("calls")
        .update({ status: outcome, ended_at: new Date().toISOString() })
        .eq("id", callIdRef.current);
    }
    if (userId && role === "start") {
      const label = kind === "video" ? "Video call" : "Voice call";
      await sendMessage(
        id,
        userId,
        outcome === "ended" && seconds > 0
          ? `${label} · ${Math.floor(seconds / 60)}m ${seconds % 60}s`
          : `${label} · no answer`,
        "call",
      );
    }
    navigate({ to: "/messages/$id", params: { id } });
  };

  const name = personName(people[0]);
  const label =
    status === "ringing"
      ? "Ringing…"
      : status === "active"
        ? hasRemote
          ? `${String(Math.floor(seconds / 60)).padStart(2, "0")}:${String(seconds % 60).padStart(2, "0")}`
          : "Connecting audio and video…"
        : status === "ended"
          ? "Call ended"
          : "Connecting…";

  const showRemoteVideo = kind === "video" && hasRemote && status === "active";
  const showLocalVideo = kind === "video" && !cameraOff;

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-ink text-paper">
      {/* The other person, full screen once connected. */}
      <video
        ref={remoteVideoRef}
        autoPlay
        playsInline
        className={`absolute inset-0 h-full w-full object-cover ${showRemoteVideo ? "opacity-100" : "opacity-0"}`}
      />
      {/* Voice calls still carry sound. */}
      <audio ref={remoteAudioRef} autoPlay className="hidden" />

      {/* Our own camera, small in the corner. */}
      {showLocalVideo && (
        <video
          ref={localVideoRef}
          autoPlay
          playsInline
          muted
          className="absolute right-4 top-4 z-10 h-32 w-24 rounded-2xl border border-paper/30 object-cover scale-x-[-1] shadow-lift"
        />
      )}

      <div className={`absolute inset-0 ${showRemoteVideo ? "bg-gradient-to-b from-ink/40 via-transparent to-ink/85" : "bg-gradient-to-b from-ink/70 via-ink/30 to-ink/85"}`} />

      <div className="relative flex flex-1 flex-col items-center justify-center px-8 text-center">
        {!showRemoteVideo && (
          <>
            {people[0]?.avatar_url ? (
              <img
                src={people[0].avatar_url}
                alt=""
                className="h-28 w-28 rounded-full border-2 border-brass/50 object-cover"
              />
            ) : (
              <span className="grid h-28 w-28 place-items-center rounded-full bg-paper/10 font-serif text-[30px]">
                {name.charAt(0)}
              </span>
            )}
            <h1 className="mt-5 font-serif text-[28px]">{name}</h1>
          </>
        )}
        <p className={`mt-1.5 text-[13px] text-paper/80 ${showRemoteVideo ? "absolute bottom-32 rounded-full bg-ink/60 px-3 py-1" : ""}`}>{label}</p>
        {status === "ringing" && (
          <span className="mt-4 h-1.5 w-1.5 animate-ping rounded-full bg-brass" aria-hidden />
        )}
        {mediaError && <p className="mt-4 max-w-xs text-[12.5px] text-paper/70">{mediaError}</p>}
        {!showRemoteVideo && (
          <p className="mt-6 flex items-center gap-1.5 text-[11px] text-paper/60">
            <Lock className="h-3 w-3" strokeWidth={1.9} />
            Nothing said here is recorded or stored.
          </p>
        )}
      </div>

      <div className="relative pb-10">
        <div className="mx-auto flex max-w-xs items-center justify-center gap-4">
          <button
            onClick={() => setMuted(v => !v)}
            aria-label={muted ? "Unmute" : "Mute"}
            aria-pressed={muted}
            className={`grid h-14 w-14 place-items-center rounded-full tap-scale ${
              muted ? "bg-paper text-ink" : "bg-paper/15 text-paper"
            }`}
          >
            {muted ? (
              <MicOff className="h-5 w-5" strokeWidth={1.8} />
            ) : (
              <Mic className="h-5 w-5" strokeWidth={1.8} />
            )}
          </button>
          <button
            onClick={() => void finish(status === "ringing" ? "missed" : "ended")}
            aria-label="End call"
            className="grid h-16 w-16 place-items-center rounded-full bg-destructive text-destructive-foreground tap-scale"
          >
            <PhoneOff className="h-6 w-6" strokeWidth={1.9} />
          </button>
          <button
            onClick={() => setCameraOff(v => !v)}
            aria-label={cameraOff ? "Turn camera on" : "Turn camera off"}
            aria-pressed={cameraOff}
            disabled={kind === "audio"}
            className={`grid h-14 w-14 place-items-center rounded-full tap-scale disabled:opacity-40 ${
              cameraOff ? "bg-paper text-ink" : "bg-paper/15 text-paper"
            }`}
          >
            {cameraOff ? (
              <VideoOff className="h-5 w-5" strokeWidth={1.8} />
            ) : (
              <Video className="h-5 w-5" strokeWidth={1.8} />
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
