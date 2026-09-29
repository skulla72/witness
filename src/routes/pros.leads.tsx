import { createFileRoute, Link } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { ArrowLeft, Loader2 } from "lucide-react";
import { BRAND } from "@/config/brand";
import { useSession } from "@/hooks/useSession";
import { SERVING_LANES, laneLabel, laneRange, urgencyLabel } from "@/data/serving-lanes";
import { myProPage } from "@/lib/pros";
import {
  OFFER_STATUS,
  jobsWon,
  lanesOfPro,
  matchedRequests,
  money,
  myOffers,
  rateText,
  removeProLane,
  saveProLane,
  sendOffer,
  withdrawOffer,
  type Job,
} from "@/lib/serving";
import { sendHeadsUp } from "@/lib/serving.functions";

export const Route = createFileRoute("/pros/leads")({
  staticData: { sitemap: false },
  component: Leads,
  head: () => ({
    meta: [
      { title: `Your lanes and leads · ${BRAND.name}` },
      {
        name: "description",
        content:
          "Switch on the lanes you work, set your own rate in each, and answer the people asking for that work near you.",
      },
      { property: "og:title", content: `Your lanes and leads · ${BRAND.name}` },
      { property: "og:description", content: "Work coming to you from people who need it." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
});

function Leads() {
  const { userId, signedIn } = useSession();
  const qc = useQueryClient();

  const page = useQuery({
    queryKey: ["pros", "mine", userId],
    queryFn: () => myProPage(userId!),
    enabled: !!userId,
  });
  const pro = page.data ?? null;

  const lanes = useQuery({
    queryKey: ["serving", "proLanes", pro?.id],
    queryFn: () => lanesOfPro(pro!.id),
    enabled: !!pro,
  });
  const leads = useQuery({
    queryKey: ["serving", "leads", pro?.id, lanes.data?.length],
    queryFn: () => matchedRequests(pro!, lanes.data ?? []),
    enabled: !!pro && !!lanes.data,
  });
  const offers = useQuery({
    queryKey: ["serving", "myOffers", pro?.id],
    queryFn: () => myOffers(pro!.id),
    enabled: !!pro,
  });
  const jobs = useQuery({
    queryKey: ["serving", "jobsWon", pro?.id],
    queryFn: () => jobsWon(pro!.id),
    enabled: !!pro,
  });

  const offerByRequest = useMemo(
    () => new Map((offers.data ?? []).map(o => [o.request_id, o])),
    [offers.data],
  );

  const laneRows = lanes.data ?? [];

  if (signedIn === false) return <Shell><p className={muted}>Sign in to see your leads.</p></Shell>;
  if (page.isLoading) {
    return (
      <Shell>
        <div className="flex justify-center py-10">
          <Loader2 className="h-4 w-4 animate-spin text-ink-soft" />
        </div>
      </Shell>
    );
  }
  if (!pro) {
    return (
      <Shell>
        <p className={muted}>You'll need a professional page before work can come to you.</p>
        <Link
          to="/pros/new"
          className="mt-3 inline-flex rounded-full bg-primary px-4 py-2 text-[12.5px] text-primary-foreground"
        >
          Set one up
        </Link>
      </Shell>
    );
  }

  const canOffer = pro.status === "approved" && !!pro.id_verified_at;

  return (
    <Shell>
      {!canOffer && (
        <section className="rounded-2xl border border-brass/30 bg-brass/10 p-4">
          <p className="text-[13px] leading-relaxed text-ink">
            {pro.status !== "approved"
              ? "Your page is still with our team. Set your lanes now — you can answer work as soon as it's live."
              : "Your identity check hasn't cleared yet, so you can't send offers. Start it on your page."}
          </p>
          <Link to="/pros/mine" className="mt-2 inline-flex text-[12.5px] text-brass">
            Open your page
          </Link>
        </section>
      )}

      <section className="rounded-2xl border border-border bg-card p-4 shadow-soft">
        <h2 className="mb-1 text-[11px] uppercase tracking-[0.18em] text-ink-soft">
          Lanes you work
        </h2>
        <p className={muted}>
          Switch on what you actually do and name your own rate. The range beside each lane is only
          what people around the country tend to pay.
        </p>
        <div className="mt-3 space-y-2">
          {SERVING_LANES.map(l => (
            <LaneRow
              key={l.key}
              proId={pro.id}
              laneKey={l.key}
              label={l.label}
              range={laneRange(l)}
              row={laneRows.find(r => r.lane === l.key) ?? null}
              onDone={() => void qc.invalidateQueries({ queryKey: ["serving"] })}
            />
          ))}
        </div>
      </section>

      {!!jobs.data?.length && (
        <section className="rounded-2xl border border-border bg-card p-4 shadow-soft">
          <h2 className="mb-1 text-[11px] uppercase tracking-[0.18em] text-ink-soft">
            Jobs you've got
          </h2>
          <p className={muted}>
            Before you head over, send them a heads-up. They'll see your photo, your name and your
            short bio, so they know who's knocking.
          </p>
          <div className="mt-3 space-y-2">
            {jobs.data.map(j => (
              <JobRow
                key={j.offer.id}
                job={j}
                proName={pro.display_name}
                onDone={() => void qc.invalidateQueries({ queryKey: ["serving"] })}
              />
            ))}
          </div>
        </section>
      )}

      <section className="rounded-2xl border border-border bg-card p-4 shadow-soft">
        <h2 className="mb-1 text-[11px] uppercase tracking-[0.18em] text-ink-soft">
          Work asking for you
        </h2>
        <p className={muted}>
          Closest to home and soonest needed first. Only people in your lanes see these.
        </p>
        {leads.isLoading && <Loader2 className="mt-3 h-4 w-4 animate-spin text-ink-soft" />}
        <div className="mt-3 space-y-2">
          {(leads.data ?? []).map(r => (
            <LeadRow
              key={r.id}
              request={r}
              proId={pro.id}
              defaultRate={laneRows.find(x => x.lane === r.lane) ?? null}
              existing={offerByRequest.get(r.id) ?? null}
              canOffer={canOffer}
              onDone={() => void qc.invalidateQueries({ queryKey: ["serving"] })}
            />
          ))}
          {leads.data?.length === 0 && (
            <p className={muted}>
              Nothing open in your lanes right now. We'll put new asks here the moment they're posted.
            </p>
          )}
        </div>
      </section>
    </Shell>
  );
}

function JobRow({ job, proName, onDone }: { job: Job; proName: string; onDone: () => void }) {
  const { request } = job;
  const [open, setOpen] = useState(false);
  const [note, setNote] = useState("");

  const heads = useMutation({
    mutationFn: async () => {
      // The alert is sent server-side by sendHeadsUp, which verifies this pro
      // was actually hired for this job.
      return await sendHeadsUp({ data: { requestId: request.id, note } });
    },
    onSuccess: () => {
      toast.success("They know who's coming.");
      setOpen(false);
      setNote("");
      onDone();
    },
    onError: () => toast.error("We couldn't send that heads-up."),
  });

  return (
    <div className="rounded-xl border border-brass/40 bg-brass/5 p-3">
      <p className="font-serif text-[15.5px] leading-tight text-ink">{request.title}</p>
      <p className="mt-0.5 text-[11.5px] text-ink-soft">
        {[laneLabel(request.lane), [request.city, request.region].filter(Boolean).join(", ")]
          .filter(Boolean)
          .join(" · ")}
      </p>
      {request.heads_up_at && (
        <p className="mt-2 text-[12px] text-ink-soft">
          Heads-up sent{" "}
          {new Date(request.heads_up_at).toLocaleString(undefined, {
            weekday: "short",
            hour: "numeric",
            minute: "2-digit",
          })}
        </p>
      )}
      {!open ? (
        <button
          type="button"
          onClick={() => setOpen(true)}
          className="tap-scale mt-3 inline-flex rounded-full bg-primary px-4 py-2 text-[12.5px] text-primary-foreground"
        >
          {request.heads_up_at ? "Send another heads-up" : "Tell them I'm on the way"}
        </button>
      ) : (
        <div className="mt-3 space-y-2">
          <textarea
            value={note}
            onChange={e => setNote(e.target.value.slice(0, 300))}
            rows={3}
            placeholder={`${proName} here — I'll be there between 2 and 3, driving a white truck.`}
            className={input}
          />
          <p className="text-[11.5px] text-ink-soft">
            They'll see your photo, name, trade and bio with this note.
          </p>
          <button
            type="button"
            disabled={heads.isPending}
            onClick={() => heads.mutate()}
            className="tap-scale inline-flex rounded-full bg-primary px-4 py-2 text-[12.5px] text-primary-foreground disabled:opacity-60"
          >
            Send it
          </button>
        </div>
      )}
    </div>
  );
}

function LaneRow({
  proId,
  laneKey,
  label,
  range,
  row,
  onDone,
}: {
  proId: string;
  laneKey: string;
  label: string;
  range: string;
  row: { rate_cents: number; rate_kind: string; serves_free: boolean; active: boolean } | null;
  onDone: () => void;
}) {
  const [open, setOpen] = useState(false);
  const [rate, setRate] = useState(row ? String(Math.round(row.rate_cents / 100)) : "");
  const [kind, setKind] = useState(row?.rate_kind ?? "hourly");
  const [free, setFree] = useState(row?.serves_free ?? false);

  const save = useMutation({
    mutationFn: () =>
      saveProLane({
        proId,
        lane: laneKey,
        rate_cents: (Number(rate) || 0) * 100,
        rate_kind: kind,
        serves_free: free,
      }),
    onSuccess: () => {
      toast.success(`${label} is on.`);
      setOpen(false);
      onDone();
    },
    onError: () => toast.error("That didn't save."),
  });

  const drop = useMutation({
    mutationFn: () => removeProLane(proId, laneKey),
    onSuccess: () => {
      toast.success(`${label} switched off.`);
      onDone();
    },
    onError: () => toast.error("That didn't save."),
  });

  return (
    <div className={`rounded-xl border p-3 ${row ? "border-brass/40 bg-brass/5" : "border-border bg-paper"}`}>
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-[13.5px] text-ink">{label}</p>
          <p className="mt-0.5 text-[11.5px] text-ink-soft">
            {row
              ? [rateText(row.rate_cents, row.rate_kind), row.serves_free ? "Sometimes free" : null]
                  .filter(Boolean)
                  .join(" · ")
              : `Usually ${range}`}
          </p>
        </div>
        <div className="flex shrink-0 gap-2">
          <button
            type="button"
            onClick={() => setOpen(v => !v)}
            className="rounded-full border border-border bg-card px-3 py-1.5 text-[11.5px] text-ink"
          >
            {row ? "Change" : "Turn on"}
          </button>
          {row && (
            <button
              type="button"
              disabled={drop.isPending}
              onClick={() => drop.mutate()}
              className="rounded-full border border-border bg-card px-3 py-1.5 text-[11.5px] text-ink-soft disabled:opacity-60"
            >
              Off
            </button>
          )}
        </div>
      </div>

      {open && (
        <div className="mt-3 space-y-2">
          <div className="grid grid-cols-[100px_1fr] gap-2">
            <input
              value={rate}
              onChange={e => setRate(e.target.value.replace(/[^0-9]/g, ""))}
              placeholder="75"
              inputMode="numeric"
              className={input}
            />
            <select value={kind} onChange={e => setKind(e.target.value)} className={input}>
              <option value="hourly">Per hour</option>
              <option value="flat">Flat price</option>
              <option value="quote">By quote</option>
            </select>
          </div>
          <button
            type="button"
            onClick={() => setFree(v => !v)}
            className={`block w-full rounded-xl border p-2.5 text-left text-[12.5px] ${
              free ? "border-brass/50 bg-brass/10 text-ink" : "border-border bg-card text-ink-soft"
            }`}
          >
            I'll sometimes give this work away — counted in hours served
          </button>
          <button
            type="button"
            disabled={save.isPending}
            onClick={() => save.mutate()}
            className="tap-scale inline-flex rounded-full bg-primary px-4 py-2 text-[12.5px] text-primary-foreground disabled:opacity-60"
          >
            Save this lane
          </button>
        </div>
      )}
    </div>
  );
}

function LeadRow({
  request,
  proId,
  defaultRate,
  existing,
  canOffer,
  onDone,
}: {
  request: {
    id: string;
    lane: string;
    title: string;
    details: string;
    city: string;
    region: string;
    urgency: string;
    budget_cents: number;
    rate_kind: string;
    wants_donated: boolean;
  };
  proId: string;
  defaultRate: { rate_cents: number; rate_kind: string } | null;
  existing: { id: string; status: string; rate_cents: number; rate_kind: string } | null;
  canOffer: boolean;
  onDone: () => void;
}) {
  const [open, setOpen] = useState(false);
  const [rate, setRate] = useState(
    defaultRate ? String(Math.round(defaultRate.rate_cents / 100)) : "",
  );
  const [kind, setKind] = useState(defaultRate?.rate_kind ?? "hourly");
  const [message, setMessage] = useState("");

  const send = useMutation({
    mutationFn: () =>
      sendOffer({
        requestId: request.id,
        proId,
        rate_cents: request.wants_donated ? 0 : (Number(rate) || 0) * 100,
        rate_kind: request.wants_donated ? "quote" : kind,
        message,
      }),
    onSuccess: () => {
      toast.success("Offer sent.");
      setOpen(false);
      onDone();
    },
    onError: () => toast.error("We couldn't send that."),
  });

  const pull = useMutation({
    mutationFn: () => withdrawOffer(existing!.id),
    onSuccess: () => {
      toast.success("Pulled back.");
      onDone();
    },
    onError: () => toast.error("That didn't save."),
  });

  return (
    <div className="rounded-xl border border-border bg-paper p-3">
      <div className="flex items-baseline justify-between gap-3">
        <p className="font-serif text-[15.5px] leading-tight text-ink">{request.title}</p>
        {existing && (
          <span className="shrink-0 text-[10.5px] uppercase tracking-[0.12em] text-ink-soft">
            {OFFER_STATUS[existing.status] ?? existing.status}
          </span>
        )}
      </div>
      <p className="mt-0.5 text-[11.5px] text-ink-soft">
        {[
          laneLabel(request.lane),
          [request.city, request.region].filter(Boolean).join(", "),
          urgencyLabel(request.urgency),
        ]
          .filter(Boolean)
          .join(" · ")}
      </p>
      {request.details && (
        <p className="mt-2 text-[12.5px] leading-relaxed text-ink">{request.details}</p>
      )}
      <p className="mt-2 text-[11.5px] text-ink-soft">
        {request.wants_donated
          ? "They can't pay right now — your time here is counted in hours served."
          : request.budget_cents
            ? `They've set aside ${money(request.budget_cents)}${request.rate_kind === "hourly" ? " an hour" : ""}`
            : "Open to your price"}
      </p>

      {existing && existing.status === "sent" ? (
        <div className="mt-3 flex items-center gap-3">
          <p className="text-[12px] text-ink">
            You offered {rateText(existing.rate_cents, existing.rate_kind)}
          </p>
          <button
            type="button"
            disabled={pull.isPending}
            onClick={() => pull.mutate()}
            className="rounded-full border border-border bg-card px-3 py-1.5 text-[11.5px] text-ink-soft disabled:opacity-60"
          >
            Pull it back
          </button>
        </div>
      ) : (
        canOffer && (
          <>
            {!open ? (
              <button
                type="button"
                onClick={() => setOpen(true)}
                className="tap-scale mt-3 inline-flex rounded-full bg-primary px-4 py-2 text-[12.5px] text-primary-foreground"
              >
                {existing ? "Offer again" : "Send an offer"}
              </button>
            ) : (
              <div className="mt-3 space-y-2">
                {!request.wants_donated && (
                  <div className="grid grid-cols-[100px_1fr] gap-2">
                    <input
                      value={rate}
                      onChange={e => setRate(e.target.value.replace(/[^0-9]/g, ""))}
                      placeholder="75"
                      inputMode="numeric"
                      className={input}
                    />
                    <select value={kind} onChange={e => setKind(e.target.value)} className={input}>
                      <option value="hourly">Per hour</option>
                      <option value="flat">For the whole job</option>
                      <option value="quote">I'd need to look first</option>
                    </select>
                  </div>
                )}
                <textarea
                  value={message}
                  onChange={e => setMessage(e.target.value)}
                  rows={3}
                  placeholder="I can be there Thursday morning and I'll haul the brush off."
                  className={input}
                />
                <button
                  type="button"
                  disabled={send.isPending}
                  onClick={() => send.mutate()}
                  className="tap-scale inline-flex rounded-full bg-primary px-4 py-2 text-[12.5px] text-primary-foreground disabled:opacity-60"
                >
                  Send it
                </button>
              </div>
            )}
          </>
        )
      )}
    </div>
  );
}

const muted = "text-[13px] leading-relaxed text-ink-soft";
const input =
  "w-full rounded-xl border border-border bg-card px-3 py-2 text-[13px] leading-relaxed text-ink outline-none placeholder:text-ink-soft";

function Shell({ children }: { children: React.ReactNode }) {
  return (
    <div className="pb-16">
      <div className="px-4 pt-3">
        <Link to="/pros" className="inline-flex items-center gap-1 text-[13px] text-ink-soft">
          <ArrowLeft className="h-4 w-4" /> Professionals
        </Link>
      </div>
      <header className="mb-5 px-5 pt-3">
        <p className="text-[11px] uppercase tracking-[0.22em] text-brass">Your work</p>
        <h1 className="mt-2 font-serif text-[28px] leading-tight text-ink">Lanes & leads</h1>
      </header>
      <div className="space-y-4 px-4">{children}</div>
    </div>
  );
}
