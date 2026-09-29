import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { ArrowLeft, Loader2, Lock, ShieldCheck, Video } from "lucide-react";
import { BRAND } from "@/config/brand";
import { useSession } from "@/hooks/useSession";
import { Avatar } from "@/components/Avatar";
import { AgreementGate } from "@/components/therapy/AgreementGate";
import {
  agreementSigned,
  deleteNote,
  loadNote,
  loadSession,
  saveNote,
  setSessionStatus,
  signAgreement,
  startSession,
  SESSION_LABEL,
} from "@/lib/therapy";

export const Route = createFileRoute("/therapy/$id")({
  staticData: { sitemap: false },
  component: TherapySession,
  head: () => ({
    meta: [
      { title: `Your session · ${BRAND.name}` },
      { name: "description", content: "One private session: the signed agreement, the room, and notes only the therapist can read." },
      { property: "og:title", content: `Your session · ${BRAND.name}` },
      { property: "og:description", content: "A private session room inside Witness." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
      { name: "robots", content: "noindex" },
    ],
  }),
});

const WHEN = new Intl.DateTimeFormat("en-US", { weekday: "long", month: "short", day: "numeric", hour: "numeric", minute: "2-digit" });

function TherapySession() {
  const { id } = Route.useParams();
  const { userId, signedIn } = useSession();
  const navigate = useNavigate();
  const qc = useQueryClient();
  const [starting, setStarting] = useState(false);

  const sessionQ = useQuery({ queryKey: ["therapy-session", id], queryFn: () => loadSession(id), enabled: !!userId });
  const session = sessionQ.data ?? null;
  const isTherapist = !!session && session.therapist_id === userId;
  const party = isTherapist ? "therapist" : "client";

  const signedQ = useQuery({
    queryKey: ["therapy-signed", party, userId],
    queryFn: () => agreementSigned(party),
    enabled: !!userId && !!session,
  });

  if (signedIn === false) {
    return (
      <div className="px-6 pt-16 text-center">
        <p className="font-serif text-[22px] text-ink">Sign in to open your session.</p>
        <Link to="/login" className="mt-5 inline-block rounded-full bg-ink px-5 py-2.5 text-[13px] text-paper">Sign in</Link>
      </div>
    );
  }

  if (sessionQ.isLoading) {
    return <div className="grid place-items-center pt-24"><Loader2 className="h-5 w-5 animate-spin text-ink-soft" strokeWidth={1.6} /></div>;
  }

  if (!session) {
    return (
      <div className="px-6 pt-16 text-center">
        <p className="font-serif text-[22px] text-ink">This session isn't yours to open.</p>
        <Link to="/therapy" className="mt-5 inline-block rounded-full bg-ink px-5 py-2.5 text-[13px] text-paper">Back to sessions</Link>
      </div>
    );
  }

  const other = isTherapist ? session.client : session.therapist;
  const canStart = signedQ.data === true && (session.status === "booked" || session.status === "in_progress");

  const start = async () => {
    setStarting(true);
    const result = await startSession(session, userId!);
    setStarting(false);
    if (result.error || !result.conversationId) {
      toast.error(result.error ?? "Could not open the room.");
      return;
    }
    qc.invalidateQueries({ queryKey: ["therapy-session", id] });
    navigate({ to: "/call/$id", params: { id: result.conversationId }, search: { kind: "video", role: "start" } });
  };

  return (
    <div className="px-5 pb-24 pt-5">
      <Link to="/therapy" className="inline-flex items-center gap-1.5 text-[12px] text-ink-soft">
        <ArrowLeft className="h-3.5 w-3.5" strokeWidth={1.6} /> Sessions
      </Link>

      <div className="mt-4 flex items-center gap-3">
        <Avatar name={other.name} photo={other.photo} size={52} />
        <div>
          <p className="font-serif text-[22px] leading-tight text-ink">{other.name}</p>
          <p className="text-[12px] text-ink-soft">
            {WHEN.format(new Date(session.starts_at))} · {session.minutes} min · {SESSION_LABEL[session.status] ?? session.status}
          </p>
        </div>
      </div>

      {session.reason && (
        <section className="mt-5 rounded-2xl border border-border bg-paper p-4">
          <h2 className="text-[11px] uppercase tracking-wide text-ink-soft">{isTherapist ? "What they wanted to bring" : "What you wanted to bring"}</h2>
          <p className="mt-1.5 text-[13px] leading-relaxed text-ink">{session.reason}</p>
        </section>
      )}

      {signedQ.data === false ? (
        <div className="mt-5">
          <p className="mb-3 text-[13px] text-ink-soft">The session can't begin until you sign this.</p>
          <AgreementGate
            party={party}
            onSign={async name => {
              await signAgreement(userId!, party, name);
              await qc.invalidateQueries({ queryKey: ["therapy-signed"] });
              toast.success("Signed.");
            }}
          />
        </div>
      ) : (
        <>
          <p className="mt-5 inline-flex items-center gap-1.5 rounded-full border border-border bg-paper px-3 py-1.5 text-[11px] text-ink-soft">
            <ShieldCheck className="h-3.5 w-3.5" strokeWidth={1.6} /> You signed the care agreement
          </p>

          {canStart && (
            <button
              type="button"
              onClick={start}
              disabled={starting}
              className="mt-4 inline-flex w-full items-center justify-center gap-2 rounded-full bg-ink px-5 py-3 text-[13px] text-paper disabled:opacity-40"
            >
              {starting ? <Loader2 className="h-4 w-4 animate-spin" strokeWidth={1.6} /> : <Video className="h-4 w-4" strokeWidth={1.6} />}
              {session.status === "in_progress" ? "Rejoin the room" : "Start the session"}
            </button>
          )}
          <p className="mt-2 text-[11px] text-ink-soft">
            The room only opens once both of you have signed. Nothing is recorded.
          </p>
        </>
      )}

      {(session.status === "booked" || session.status === "in_progress") && (
        <div className="mt-4 flex gap-2">
          {isTherapist && (
            <button
              type="button"
              onClick={async () => {
                await setSessionStatus(session.id, "completed");
                qc.invalidateQueries({ queryKey: ["therapy-session", id] });
                qc.invalidateQueries({ queryKey: ["therapy-sessions"] });
              }}
              className="flex-1 rounded-full border border-border px-4 py-2.5 text-[12px] text-ink"
            >
              Mark complete
            </button>
          )}
          <button
            type="button"
            onClick={async () => {
              await setSessionStatus(session.id, "cancelled");
              qc.invalidateQueries({ queryKey: ["therapy-session", id] });
              qc.invalidateQueries({ queryKey: ["therapy-sessions"] });
              toast.success("Session cancelled. The time is open again.");
            }}
            className="flex-1 rounded-full border border-border px-4 py-2.5 text-[12px] text-ink-soft"
          >
            Cancel session
          </button>
        </div>
      )}

      {isTherapist && <PrivateNote sessionId={session.id} therapistId={userId!} />}
    </div>
  );
}

function PrivateNote({ sessionId, therapistId }: { sessionId: string; therapistId: string }) {
  const qc = useQueryClient();
  const noteQ = useQuery({ queryKey: ["therapy-note", sessionId], queryFn: () => loadNote(sessionId) });
  const [body, setBody] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (noteQ.data) setBody(noteQ.data.body);
  }, [noteQ.data]);

  return (
    <section className="mt-8 rounded-2xl border border-border bg-paper p-4">
      <h2 className="flex items-center gap-1.5 font-serif text-[19px] text-ink">
        <Lock className="h-4 w-4 text-ink-soft" strokeWidth={1.6} /> Your private note
      </h2>
      <p className="mt-1 text-[11px] text-ink-soft">
        Only you can read this. The person you saw cannot, and neither can anyone on the {BRAND.name} team.
      </p>
      <textarea
        value={body}
        onChange={event => setBody(event.target.value)}
        rows={8}
        aria-label="Private session note"
        placeholder="Presentation, what you worked on, plan for next time…"
        className="mt-3 w-full resize-none rounded-xl border border-border bg-ground px-3 py-2.5 text-[13px] leading-relaxed text-ink outline-none placeholder:text-ink-soft/60"
      />
      <div className="mt-2.5 flex gap-2">
        <button
          type="button"
          disabled={saving}
          onClick={async () => {
            setSaving(true);
            try {
              await saveNote(sessionId, therapistId, body);
              await qc.invalidateQueries({ queryKey: ["therapy-note", sessionId] });
              toast.success("Note saved.");
            } catch (error) {
              toast.error(error instanceof Error ? error.message : "Could not save the note.");
            } finally {
              setSaving(false);
            }
          }}
          className="flex-1 rounded-full bg-ink px-5 py-2.5 text-[13px] text-paper disabled:opacity-40"
        >
          Save note
        </button>
        {noteQ.data && (
          <button
            type="button"
            onClick={async () => {
              await deleteNote(sessionId);
              setBody("");
              qc.invalidateQueries({ queryKey: ["therapy-note", sessionId] });
            }}
            className="rounded-full border border-border px-4 py-2.5 text-[12px] text-ink-soft"
          >
            Delete
          </button>
        )}
      </div>
    </section>
  );
}
