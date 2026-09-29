import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { ArrowLeft, CalendarDays, Loader2, Lock, Phone, Plus, ShieldCheck, Trash2 } from "lucide-react";
import { BRAND } from "@/config/brand";
import { useSession } from "@/hooks/useSession";
import { Avatar } from "@/components/Avatar";
import { AgreementGate } from "@/components/therapy/AgreementGate";
import {
  acceptingTherapists,
  addSlot,
  agreementSigned,
  bookSlot,
  myListing,
  myOpenTimes,
  mySessions,
  removeSlot,
  saveListing,
  signAgreement,
  SESSION_LABEL,
  type Slot,
} from "@/lib/therapy";

export const Route = createFileRoute("/therapy/")({
  staticData: { sitemap: false },
  component: TherapyHome,
  head: () => ({
    meta: [
      { title: `Therapy sessions · ${BRAND.name}` },
      { name: "description", content: "Book a session with a licensed therapist. Notes stay private and an agreement is signed before anything begins." },
      { property: "og:title", content: `Therapy sessions · ${BRAND.name}` },
      { property: "og:description", content: "Licensed care, private notes, and a signed agreement before any session starts." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
});

const INPUT = "w-full rounded-xl border border-border bg-paper px-3 py-2.5 text-[14px] text-ink outline-none placeholder:text-ink-soft/60";
const WHEN = new Intl.DateTimeFormat("en-US", { weekday: "short", month: "short", day: "numeric", hour: "numeric", minute: "2-digit" });

function TherapyHome() {
  const { userId, signedIn } = useSession();
  const qc = useQueryClient();

  const signedQ = useQuery({ queryKey: ["therapy-signed", "client", userId], queryFn: () => agreementSigned("client"), enabled: !!userId });
  const sessionsQ = useQuery({ queryKey: ["therapy-sessions", userId], queryFn: () => mySessions(userId!), enabled: !!userId });
  const listQ = useQuery({ queryKey: ["therapists"], queryFn: acceptingTherapists, enabled: !!userId });
  const listingQ = useQuery({ queryKey: ["my-listing", userId], queryFn: () => myListing(userId!), enabled: !!userId });

  if (signedIn === false) {
    return (
      <div className="px-6 pt-16 text-center">
        <p className="font-serif text-[22px] text-ink">Sign in to book a session.</p>
        <Link to="/login" className="mt-5 inline-block rounded-full bg-ink px-5 py-2.5 text-[13px] text-paper">Sign in</Link>
      </div>
    );
  }

  const sessions = sessionsQ.data ?? [];
  const upcoming = sessions.filter(s => s.status === "booked" || s.status === "in_progress");
  const past = sessions.filter(s => s.status !== "booked" && s.status !== "in_progress");

  return (
    <div className="px-5 pb-24 pt-5">
      <Link to="/profile" className="inline-flex items-center gap-1.5 text-[12px] text-ink-soft">
        <ArrowLeft className="h-3.5 w-3.5" strokeWidth={1.6} /> Back
      </Link>

      <h1 className="mt-3 font-serif text-[26px] leading-tight text-ink">Therapy sessions</h1>
      <p className="mt-1.5 text-[13px] text-ink-soft">
        Licensed people, real hours in a room with you. What is said stays in the room, and the notes belong to your therapist alone.
      </p>

      <p className="mt-4 rounded-2xl border border-border bg-ground px-4 py-3 text-[12px] leading-relaxed text-ink-soft">
        In an emergency, don't wait for a session.{" "}
        <Link to="/crisis" className="underline">Get help right now</Link>.
      </p>

      <p className="mt-2 text-[11px] leading-relaxed text-ink-soft">
        Before you book, read the <Link to="/care-agreement" className="underline">Care Agreement</Link>,{" "}
        <Link to="/terms" className="underline">Terms of Use</Link> and{" "}
        <Link to="/privacy" className="underline">Privacy Notice</Link>.
      </p>


      {signedQ.data === false && (
        <div className="mt-5">
          <AgreementGate
            party="client"
            onSign={async name => {
              await signAgreement(userId!, "client", name);
              await qc.invalidateQueries({ queryKey: ["therapy-signed"] });
              toast.success("Signed. You can book a session now.");
            }}
          />
        </div>
      )}

      {signedQ.data === true && (
        <p className="mt-5 inline-flex items-center gap-1.5 rounded-full border border-border bg-paper px-3 py-1.5 text-[11px] text-ink-soft">
          <ShieldCheck className="h-3.5 w-3.5" strokeWidth={1.6} /> Care agreement signed
        </p>
      )}

      {upcoming.length > 0 && (
        <section className="mt-7">
          <h2 className="font-serif text-[19px] text-ink">Coming up</h2>
          <ul className="mt-3 space-y-2.5">
            {upcoming.map(s => {
              const other = s.client_id === userId ? s.therapist : s.client;
              return (
                <li key={s.id}>
                  <Link to="/therapy/$id" params={{ id: s.id }} className="flex items-center gap-3 rounded-2xl border border-border bg-paper p-3.5">
                    <Avatar name={other.name} photo={other.photo} size={40} />
                    <span className="min-w-0 flex-1">
                      <span className="block text-[14px] font-medium text-ink">{other.name}</span>
                      <span className="block text-[12px] text-ink-soft">{WHEN.format(new Date(s.starts_at))} · {s.minutes} min</span>
                    </span>
                    <span className="rounded-full border border-border px-2.5 py-1 text-[10px] uppercase tracking-wide text-ink-soft">
                      {SESSION_LABEL[s.status] ?? s.status}
                    </span>
                  </Link>
                </li>
              );
            })}
          </ul>
        </section>
      )}

      <section className="mt-7">
        <h2 className="font-serif text-[19px] text-ink">Therapists taking people</h2>
        {listQ.isLoading && <Loader2 className="mt-3 h-4 w-4 animate-spin text-ink-soft" strokeWidth={1.6} />}
        {listQ.isSuccess && (listQ.data ?? []).length === 0 && (
          <p className="mt-2 text-[13px] text-ink-soft">No therapists are open for booking yet. We'll show them here as they're verified.</p>
        )}
        <div className="mt-3 space-y-3">
          {(listQ.data ?? []).map(t => (
            <TherapistBooking
              key={t.user_id}
              name={t.display_name || t.author.name}
              photo={t.author.photo}
              credentials={t.credentials}
              state={t.license_state}
              bio={t.bio}
              slots={t.openTimes}
              canBook={signedQ.data === true}
              onBooked={() => {
                qc.invalidateQueries({ queryKey: ["therapy-sessions"] });
                qc.invalidateQueries({ queryKey: ["therapists"] });
              }}
            />
          ))}
        </div>
      </section>

      {past.length > 0 && (
        <section className="mt-8">
          <h2 className="font-serif text-[19px] text-ink">Earlier</h2>
          <ul className="mt-3 space-y-2">
            {past.map(s => {
              const other = s.client_id === userId ? s.therapist : s.client;
              return (
                <li key={s.id}>
                  <Link to="/therapy/$id" params={{ id: s.id }} className="flex items-center justify-between rounded-xl border border-border bg-paper px-3.5 py-2.5">
                    <span className="text-[13px] text-ink">{other.name}</span>
                    <span className="text-[11px] text-ink-soft">{WHEN.format(new Date(s.starts_at))} · {SESSION_LABEL[s.status] ?? s.status}</span>
                  </Link>
                </li>
              );
            })}
          </ul>
        </section>
      )}

      <ProviderPanel userId={userId!} hasListing={!!listingQ.data} listing={listingQ.data ?? null} />
    </div>
  );
}

function TherapistBooking({
  name, photo, credentials, state, bio, slots, canBook, onBooked,
}: {
  name: string; photo: string | null; credentials: string; state: string; bio: string;
  slots: Slot[]; canBook: boolean; onBooked: () => void;
}) {
  const { userId } = useSession();
  const navigate = useNavigate();
  const [picked, setPicked] = useState<Slot | null>(null);
  const [reason, setReason] = useState("");
  const [busy, setBusy] = useState(false);

  const book = async () => {
    if (!picked || !userId) return;
    setBusy(true);
    const result = await bookSlot(userId, picked, reason);
    setBusy(false);
    if (result.error) {
      toast.error(result.error);
      return;
    }
    setPicked(null);
    setReason("");
    onBooked();
    toast.success("Session booked.");
    if (result.id) navigate({ to: "/therapy/$id", params: { id: result.id } });
  };

  return (
    <article className="rounded-2xl border border-border bg-paper p-4">
      <div className="flex items-start gap-3">
        <Avatar name={name} photo={photo} size={44} />
        <div className="min-w-0 flex-1">
          <p className="text-[14px] font-medium text-ink">{name}</p>
          <p className="text-[11px] text-ink-soft">
            {[credentials, state && `Licensed in ${state}`].filter(Boolean).join(" · ") || "Licensed therapist"}
          </p>
          {bio && <p className="mt-1.5 text-[12px] leading-relaxed text-ink-soft">{bio}</p>}
        </div>
      </div>

      {slots.length === 0 ? (
        <p className="mt-3 text-[12px] text-ink-soft">No open times right now.</p>
      ) : (
        <div className="mt-3 flex flex-wrap gap-2">
          {slots.slice(0, 8).map(slot => (
            <button
              key={slot.id}
              type="button"
              onClick={() => setPicked(picked?.id === slot.id ? null : slot)}
              className={`rounded-full border px-3 py-1.5 text-[11px] ${picked?.id === slot.id ? "border-ink bg-ink text-paper" : "border-border text-ink-soft"}`}
            >
              {WHEN.format(new Date(slot.starts_at))}
            </button>
          ))}
        </div>
      )}

      {picked && (
        <div className="mt-3">
          {canBook ? (
            <>
              <label className="text-[11px] uppercase tracking-wide text-ink-soft" htmlFor={`reason-${picked.id}`}>
                What would you like to bring? (optional)
              </label>
              <textarea
                id={`reason-${picked.id}`}
                value={reason}
                onChange={event => setReason(event.target.value)}
                rows={3}
                className={`${INPUT} mt-1.5 resize-none`}
                placeholder="Only your therapist sees this."
              />
              <button
                type="button"
                onClick={book}
                disabled={busy}
                className="mt-2.5 inline-flex w-full items-center justify-center gap-2 rounded-full bg-ink px-5 py-2.5 text-[13px] text-paper disabled:opacity-40"
              >
                {busy && <Loader2 className="h-4 w-4 animate-spin" strokeWidth={1.6} />}
                Book {WHEN.format(new Date(picked.starts_at))}
              </button>
            </>
          ) : (
            <p className="text-[12px] text-ink-soft">Sign the care agreement above, then this time is yours to book.</p>
          )}
        </div>
      )}
    </article>
  );
}

function ProviderPanel({ userId, hasListing, listing }: {
  userId: string;
  hasListing: boolean;
  listing: { display_name: string; credentials: string; license_state: string; bio: string; accepting: boolean; verified: boolean } | null;
}) {
  const qc = useQueryClient();
  const [open, setOpen] = useState(hasListing);
  const [form, setForm] = useState({
    display_name: listing?.display_name ?? "",
    credentials: listing?.credentials ?? "",
    license_state: listing?.license_state ?? "",
    bio: listing?.bio ?? "",
    accepting: listing?.accepting ?? true,
  });
  const [when, setWhen] = useState("");
  const [minutes, setMinutes] = useState(50);
  const [busy, setBusy] = useState(false);

  const signedQ = useQuery({ queryKey: ["therapy-signed", "therapist", userId], queryFn: () => agreementSigned("therapist"), enabled: hasListing });
  const timesQ = useQuery({ queryKey: ["my-open-times", userId], queryFn: () => myOpenTimes(userId), enabled: hasListing });

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="mt-9 w-full rounded-2xl border border-dashed border-border px-4 py-3 text-[12px] text-ink-soft"
      >
        I'm a licensed therapist — set up my listing
      </button>
    );
  }

  return (
    <section className="mt-9 rounded-2xl border border-border bg-paper p-4">
      <h2 className="font-serif text-[19px] text-ink">Your therapist listing</h2>
      <p className="mt-1 text-[12px] text-ink-soft">
        {listing?.verified
          ? "Verified. People can book your open times."
          : "Saved listings are reviewed before anyone can book. You'll appear once verification is complete."}
      </p>

      <div className="mt-3 space-y-2.5">
        <input className={INPUT} placeholder="Name people will see" value={form.display_name} onChange={e => setForm({ ...form, display_name: e.target.value })} aria-label="Name people will see" />
        <input className={INPUT} placeholder="Credentials (LPC, LCSW, PsyD…)" value={form.credentials} onChange={e => setForm({ ...form, credentials: e.target.value })} aria-label="Credentials" />
        <input className={INPUT} placeholder="Licensed in (state)" value={form.license_state} onChange={e => setForm({ ...form, license_state: e.target.value })} aria-label="Licensed in" />
        <textarea className={`${INPUT} resize-none`} rows={3} placeholder="A few lines about how you work" value={form.bio} onChange={e => setForm({ ...form, bio: e.target.value })} aria-label="About how you work" />
        <label className="flex items-center gap-2 text-[12px] text-ink">
          <input type="checkbox" checked={form.accepting} onChange={e => setForm({ ...form, accepting: e.target.checked })} className="h-4 w-4 rounded border-border accent-ink" />
          I'm accepting new people
        </label>
        <button
          type="button"
          disabled={busy}
          onClick={async () => {
            setBusy(true);
            try {
              await saveListing(userId, form);
              await qc.invalidateQueries({ queryKey: ["my-listing"] });
              toast.success("Listing saved.");
            } catch (error) {
              toast.error(error instanceof Error ? error.message : "Could not save your listing.");
            } finally {
              setBusy(false);
            }
          }}
          className="w-full rounded-full bg-ink px-5 py-2.5 text-[13px] text-paper disabled:opacity-40"
        >
          Save listing
        </button>
      </div>

      {hasListing && signedQ.data === false && (
        <div className="mt-5">
          <AgreementGate
            party="therapist"
            onSign={async name => {
              await signAgreement(userId, "therapist", name);
              await qc.invalidateQueries({ queryKey: ["therapy-signed"] });
              toast.success("Signed.");
            }}
          />
        </div>
      )}

      {hasListing && (
        <div className="mt-5">
          <h3 className="flex items-center gap-1.5 text-[13px] font-medium text-ink">
            <CalendarDays className="h-3.5 w-3.5 text-ink-soft" strokeWidth={1.6} /> Times you're open
          </h3>
          <div className="mt-2 flex gap-2">
            <input type="datetime-local" value={when} onChange={e => setWhen(e.target.value)} className={INPUT} aria-label="Open time" />
            <select value={minutes} onChange={e => setMinutes(Number(e.target.value))} className="rounded-xl border border-border bg-paper px-2 text-[13px] text-ink" aria-label="Length in minutes">
              <option value={30}>30m</option>
              <option value={50}>50m</option>
              <option value={80}>80m</option>
            </select>
            <button
              type="button"
              aria-label="Add this time"
              onClick={async () => {
                if (!when) return;
                const result = await addSlot(userId, when, minutes);
                if (result.error) { toast.error(result.error); return; }
                setWhen("");
                qc.invalidateQueries({ queryKey: ["my-open-times"] });
              }}
              className="grid h-[42px] w-[42px] shrink-0 place-items-center rounded-xl bg-ink text-paper"
            >
              <Plus className="h-4 w-4" strokeWidth={1.6} />
            </button>
          </div>

          <ul className="mt-3 space-y-1.5">
            {(timesQ.data ?? []).map(slot => (
              <li key={slot.id} className="flex items-center justify-between rounded-xl border border-border px-3 py-2 text-[12px] text-ink">
                <span>{WHEN.format(new Date(slot.starts_at))} · {slot.minutes} min</span>
                <span className="flex items-center gap-2">
                  <span className="text-[10px] uppercase tracking-wide text-ink-soft">{slot.status}</span>
                  {slot.status === "open" && (
                    <button
                      type="button"
                      aria-label="Remove this time"
                      onClick={async () => {
                        await removeSlot(slot.id);
                        qc.invalidateQueries({ queryKey: ["my-open-times"] });
                      }}
                    >
                      <Trash2 className="h-3.5 w-3.5 text-ink-soft" strokeWidth={1.6} />
                    </button>
                  )}
                </span>
              </li>
            ))}
          </ul>

          <p className="mt-4 flex items-start gap-1.5 text-[11px] text-ink-soft">
            <Lock className="mt-0.5 h-3 w-3 shrink-0" strokeWidth={1.6} />
            Your session notes are visible to you alone — not to the person you saw, and not to anyone on the team.
          </p>
          <p className="mt-2 flex items-start gap-1.5 text-[11px] text-ink-soft">
            <Phone className="mt-0.5 h-3 w-3 shrink-0" strokeWidth={1.6} />
            Sessions happen in a live room and are never recorded.
          </p>
        </div>
      )}
    </section>
  );
}
