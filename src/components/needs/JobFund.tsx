import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { AlertTriangle, BadgeCheck, Check, HandCoins, Loader2, Lock, Star, Users } from "lucide-react";
import { useSession } from "@/hooks/useSession";
import { Avatar } from "@/components/Avatar";
import { ChipInCheckout } from "@/components/needs/ChipInCheckout";
import {
  addMark, addReview, dollarsExact, FUND_STATUS_LABEL, fundPct, loadBackers, loadFund, loadMarksForNeed,
  loadReviewsForNeed, openFund, setFundWorker, witnessShare, MARK_LABEL,
} from "@/lib/jobfund";
import { confirmJobFinished, releaseJobFunds, resolveStalledJob } from "@/lib/jobfund.functions";
import type { PledgeWithAuthor } from "@/lib/needs";

interface Props {
  needId: string;
  needStatus: string;
  canManage: boolean;
  isAdmin: boolean;
  pledges: PledgeWithAuthor[];
  onDone: () => void;
}

const PRESETS = [100, 500, 2000];

export function JobFund({ needId, needStatus, canManage, isAdmin, pledges, onDone }: Props) {
  const { userId, signedIn } = useSession();
  const qc = useQueryClient();
  const fundQ = useQuery({ queryKey: ["job-fund", needId], queryFn: () => loadFund(needId) });
  const backersQ = useQuery({ queryKey: ["job-backers", needId], queryFn: () => loadBackers(needId), enabled: !!userId });
  const reviewsQ = useQuery({ queryKey: ["job-reviews", needId], queryFn: () => loadReviewsForNeed(needId) });
  const marksQ = useQuery({ queryKey: ["job-marks", needId], queryFn: () => loadMarksForNeed(needId) });

  const refresh = () => {
    qc.invalidateQueries({ queryKey: ["job-fund", needId] });
    qc.invalidateQueries({ queryKey: ["job-backers", needId] });
    qc.invalidateQueries({ queryKey: ["job-reviews", needId] });
    qc.invalidateQueries({ queryKey: ["job-marks", needId] });
    onDone();
  };

  const fund = fundQ.data;

  if (fundQ.isLoading) return null;
  if (!fund) {
    return canManage && userId && needStatus !== "closed" ? (
      <OpenFundForm needId={needId} userId={userId} onDone={refresh} />
    ) : null;
  }

  const pct = fundPct(fund);
  const fee = witnessShare(fund);
  const toWorker = fund.raised_cents - fee;
  const collecting = fund.status === "collecting" || fund.status === "funded";
  const alreadyReviewed = (reviewsQ.data ?? []).some(r => r.reviewer_id === userId);
  const marks = marksQ.data ?? [];

  return (
    <section className="mx-4 mt-4 rounded-2xl border border-border bg-card p-4 shadow-soft">
      <p className="inline-flex items-center gap-1.5 text-[10px] uppercase tracking-[0.2em] text-brass">
        <Users className="h-3.5 w-3.5" /> Chip in for the job
      </p>

      <div className="mt-2 flex items-end justify-between">
        <p className="font-serif text-[22px] leading-none text-ink">{dollarsExact(fund.raised_cents)}</p>
        <p className="text-[12px] text-ink-soft">of {dollarsExact(fund.goal_cents)}</p>
      </div>
      <div className="mt-2.5 h-1.5 overflow-hidden rounded-full bg-secondary">
        <div className="h-full bg-brass transition-all" style={{ width: `${pct}%` }} />
      </div>
      <p className="mt-1.5 text-[11px] text-ink-soft">
        {fund.backer_count > 0
          ? `${fund.backer_count} ${fund.backer_count === 1 ? "person" : "people"} · ${pct}% there`
          : "Nobody's chipped in yet"}
        {" · "}
        {FUND_STATUS_LABEL[fund.status] ?? fund.status}
      </p>

      {(fund.worker_name || fund.worker_id) && (
        <p className="mt-2 text-[12.5px] text-ink">
          The work goes to <span className="font-medium">{fund.worker_name || "the person assigned"}</span>
          {fund.worker_line ? ` · ${fund.worker_line}` : ""}
          {fund.donated ? " — donating the labor" : ""}
        </p>
      )}

      <div className="mt-3 rounded-xl border border-border bg-paper p-3">
        <p className="inline-flex items-center gap-1.5 text-[10px] uppercase tracking-[0.18em] text-ink-soft">
          <Lock className="h-3 w-3" /> How the money is held
        </p>
        <p className="mt-1.5 text-[12.5px] leading-relaxed text-ink">
          Every dollar is held until the person who posted this confirms the work is done, with an after photo.
          Witness keeps 10% to run the platform{fund.raised_cents > 0 ? ` (${dollarsExact(fee)} so far)` : ""}; the rest
          {fund.raised_cents > 0 ? ` — ${dollarsExact(toWorker)} — ` : " "}goes to the person who did the work. If the job
          never gets finished, the money goes back to everyone who chipped in.
        </p>
      </div>

      {collecting && needStatus !== "closed" && <ChipIn needId={needId} />}

      {!signedIn && collecting && (
        <p className="mt-2 text-center text-[11.5px] text-ink-soft">No account needed to chip in.</p>
      )}

      {canManage && (
        <ManagePanel
          fund={fund}
          needId={needId}
          pledges={pledges}
          isAdmin={isAdmin}
          collecting={collecting}
          onDone={refresh}
        />
      )}

      {fund.worker_id && userId && canManage && needStatus === "completed" && !alreadyReviewed && (
        <ReviewForm
          needId={needId}
          workerId={fund.worker_id}
          userId={userId}
          donated={fund.donated}
          onDone={refresh}
        />
      )}

      {marks.length > 0 && (
        <div className="mt-3 rounded-xl border border-flame/30 bg-flame/5 p-3">
          <p className="inline-flex items-center gap-1.5 text-[11px] font-medium text-flame">
            <AlertTriangle className="h-3.5 w-3.5" /> On the record
          </p>
          {marks.map(m => (
            <p key={m.id} className="mt-1 text-[12px] text-ink">
              {MARK_LABEL[m.kind] ?? m.kind}
              {m.note ? ` — ${m.note}` : ""}
            </p>
          ))}
        </div>
      )}

      {(backersQ.data ?? []).length > 0 && (
        <div className="mt-3">
          <p className="text-[10px] uppercase tracking-[0.18em] text-ink-soft">Who chipped in</p>
          <div className="mt-2 space-y-1.5">
            {(backersQ.data ?? []).slice(0, 12).map(b => (
              <div key={b.id} className="flex items-center gap-2">
                <Avatar name={b.author?.name ?? b.donor_name ?? "A neighbor"} photo={b.author?.photo ?? null} size={24} />
                <p className="min-w-0 flex-1 truncate text-[12.5px] text-ink">
                  {b.author?.name || b.donor_name || "A neighbor"}
                </p>
                <p className="text-[12px] text-ink-soft">{dollarsExact(b.amount_cents)}</p>
              </div>
            ))}
          </div>
        </div>
      )}
    </section>
  );
}

/* --------------------------- chipping in --------------------------- */

function ChipIn({ needId }: { needId: string }) {
  const [amount, setAmount] = useState<number>(500);
  const [custom, setCustom] = useState("");
  const [checkout, setCheckout] = useState(false);
  const cents = custom ? Math.round(Number(custom) * 100) : amount;
  const valid = Number.isInteger(cents) && cents >= 100 && cents <= 500_000;
  const returnUrl = typeof window !== "undefined" ? `${window.location.origin}/checkout/return?kind=gift&need=${needId}&session_id={CHECKOUT_SESSION_ID}` : "";

  if (checkout && valid) {
    return (
      <div className="mt-3">
        <ChipInCheckout needId={needId} amountCents={cents} returnUrl={returnUrl} />
        <button onClick={() => setCheckout(false)} className="mt-2 w-full text-[12px] text-ink-soft underline">
          Back
        </button>
      </div>
    );
  }

  return (
    <div className="mt-3">
      <div className="flex gap-2">
        {PRESETS.map(p => (
          <button
            key={p}
            onClick={() => { setAmount(p); setCustom(""); }}
            className={`flex-1 rounded-xl border py-2 text-[13px] ${!custom && amount === p ? "border-ink bg-ink text-paper" : "border-border bg-paper text-ink"}`}
          >
            {dollarsExact(p)}
          </button>
        ))}
        <input
          value={custom}
          onChange={e => setCustom(e.target.value.replace(/[^0-9.]/g, ""))}
          inputMode="decimal"
          placeholder="Other"
          aria-label="Other amount in dollars"
          className="w-20 rounded-xl border border-border bg-paper px-2.5 py-2 text-[13px] text-ink outline-none placeholder:text-ink-soft/60"
        />
      </div>
      <button
        onClick={() => setCheckout(true)}
        disabled={!valid}
        className="tap-scale mt-2.5 flex w-full items-center justify-center gap-2 rounded-xl bg-ink py-2.5 text-[13.5px] font-medium text-paper disabled:opacity-50"
      >
        <HandCoins className="h-4 w-4" /> Chip in {valid ? dollarsExact(cents) : ""}
      </button>
    </div>
  );
}

/* ------------------------- opening the fund ------------------------- */

function OpenFundForm({ needId, userId, onDone }: { needId: string; userId: string; onDone: () => void }) {
  const [open, setOpen] = useState(false);
  const [goal, setGoal] = useState("");
  const [name, setName] = useState("");
  const [line, setLine] = useState("");
  const save = useMutation({
    mutationFn: async () => {
      const cents = Math.round(Number(goal) * 100);
      if (!Number.isInteger(cents) || cents < 500) throw new Error("Set an amount of $5 or more.");
      await openFund({ needId, userId, goalCents: cents, workerId: null, workerName: name.trim(), workerLine: line.trim() });
    },
    onSuccess: () => { toast.success("Open. People can chip in now."); setOpen(false); onDone(); },
    onError: (e: Error) => toast.error(e.message || "Couldn't open that."),
  });

  if (!open) {
    return (
      <section className="mx-4 mt-4">
        <button
          onClick={() => setOpen(true)}
          className="tap-scale flex w-full items-center justify-center gap-2 rounded-xl border border-ink py-2.5 text-[13.5px] font-medium text-ink"
        >
          <Users className="h-4 w-4" /> Let people chip in to hire someone
        </button>
      </section>
    );
  }

  return (
    <section className="mx-4 mt-4 rounded-2xl border border-border bg-card p-4 shadow-soft">
      <p className="text-[10px] uppercase tracking-[0.2em] text-brass">Chip in for the job</p>
      <p className="mt-1.5 text-[12.5px] leading-relaxed text-ink-soft">
        What would it cost to get this done? Twenty neighbors at a dollar each is twenty dollars toward a mowed lawn.
      </p>
      <input
        value={goal}
        onChange={e => setGoal(e.target.value.replace(/[^0-9.]/g, ""))}
        inputMode="decimal"
        placeholder="Amount needed, in dollars"
        className="mt-3 w-full rounded-xl border border-border bg-paper px-3 py-2.5 text-[13.5px] text-ink outline-none placeholder:text-ink-soft/60"
      />
      <input
        value={name}
        onChange={e => setName(e.target.value)}
        placeholder="Who's doing the work (if you know yet)"
        className="mt-2 w-full rounded-xl border border-border bg-paper px-3 py-2.5 text-[13.5px] text-ink outline-none placeholder:text-ink-soft/60"
      />
      <input
        value={line}
        onChange={e => setLine(e.target.value)}
        placeholder="Their trade — landscaping, roofing…"
        className="mt-2 w-full rounded-xl border border-border bg-paper px-3 py-2.5 text-[13.5px] text-ink outline-none placeholder:text-ink-soft/60"
      />
      <div className="mt-3 flex gap-2">
        <button
          onClick={() => save.mutate()}
          disabled={save.isPending}
          className="rounded-full bg-ink px-4 py-2 text-[12.5px] text-paper disabled:opacity-50"
        >
          {save.isPending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : "Open it"}
        </button>
        <button onClick={() => setOpen(false)} className="rounded-full border border-border px-4 py-2 text-[12.5px] text-ink-soft">
          Cancel
        </button>
      </div>
    </section>
  );
}

/* --------------------- poster / leader controls --------------------- */

function ManagePanel({
  fund, needId, pledges, isAdmin, collecting, onDone,
}: {
  fund: { id: string; status: string; worker_id: string | null; donated: boolean };
  needId: string;
  pledges: PledgeWithAuthor[];
  isAdmin: boolean;
  collecting: boolean;
  onDone: () => void;
}) {
  const helpers = pledges.filter(p => p.status === "accepted" || p.status === "done");
  const confirm = useMutation({
    mutationFn: async () => {
      const r = await confirmJobFinished({ data: { needId } });
      if ("error" in r) throw new Error(r.error);
    },
    onSuccess: () => { toast.success("Confirmed. The money is cleared to go to the worker."); onDone(); },
    onError: (e: Error) => toast.error(e.message),
  });
  const stall = useMutation({
    mutationFn: async (action: "refund" | "keep") => {
      const r = await resolveStalledJob({ data: { needId, action } });
      if ("error" in r) throw new Error(r.error);
      return r;
    },
    onSuccess: () => { toast.success("Done."); onDone(); },
    onError: (e: Error) => toast.error(e.message),
  });
  const release = useMutation({
    mutationFn: async () => {
      const r = await releaseJobFunds({ data: { needId } });
      if ("error" in r) throw new Error(r.error);
    },
    onSuccess: () => { toast.success("Marked paid out."); onDone(); },
    onError: (e: Error) => toast.error(e.message),
  });
  const assign = useMutation({
    mutationFn: (p: PledgeWithAuthor) =>
      setFundWorker(fund.id, { worker_id: p.user_id, worker_name: p.author.name }),
    onSuccess: () => { toast.success("Assigned."); onDone(); },
    onError: () => toast.error("Couldn't assign that."),
  });
  const [markKind, setMarkKind] = useState<"unfinished" | "no_show" | "left_early">("unfinished");
  const [markNote, setMarkNote] = useState("");
  const { userId } = useSession();
  const mark = useMutation({
    mutationFn: () =>
      addMark({ needId, workerId: fund.worker_id!, userId: userId!, kind: markKind, note: markNote.trim() }),
    onSuccess: () => { toast.success("Recorded."); setMarkNote(""); onDone(); },
    onError: () => toast.error("Couldn't record that."),
  });

  return (
    <div className="mt-3 rounded-xl border border-dashed border-border p-3">
      <p className="text-[10px] uppercase tracking-[0.18em] text-ink-soft">You run this job</p>

      {!fund.worker_id && helpers.length > 0 && (
        <div className="mt-2">
          <p className="text-[12px] text-ink-soft">Who's doing the work?</p>
          <div className="mt-1.5 space-y-1.5">
            {helpers.map(p => (
              <button
                key={p.id}
                onClick={() => assign.mutate(p)}
                className="flex w-full items-center gap-2 rounded-xl border border-border bg-paper px-2.5 py-2 text-left"
              >
                <Avatar name={p.author.name} photo={p.author.photo} size={26} />
                <span className="flex-1 truncate text-[12.5px] text-ink">{p.author.name}</span>
                <span className="text-[11.5px] text-brass">Assign</span>
              </button>
            ))}
          </div>
        </div>
      )}

      {fund.worker_id && (
        <label className="mt-2 flex items-center gap-2 text-[12.5px] text-ink">
          <input
            type="checkbox"
            checked={fund.donated}
            onChange={e => setFundWorker(fund.id, { donated: e.target.checked }).then(onDone)}
            className="h-4 w-4 accent-brass"
          />
          They're donating the labor — count it as served hours, not pay
        </label>
      )}

      {(collecting || fund.status === "confirmed") && (
        <div className="mt-3 flex flex-wrap gap-2">
          {collecting && (
            <button
              onClick={() => confirm.mutate()}
              disabled={confirm.isPending}
              className="inline-flex items-center gap-1 rounded-full bg-ink px-3.5 py-1.5 text-[12px] text-paper disabled:opacity-50"
            >
              <Check className="h-3.5 w-3.5" /> The work is finished
            </button>
          )}
          {isAdmin && fund.status === "confirmed" && (
            <button
              onClick={() => release.mutate()}
              disabled={release.isPending}
              className="inline-flex items-center gap-1 rounded-full bg-brass px-3.5 py-1.5 text-[12px] text-ink disabled:opacity-50"
            >
              <BadgeCheck className="h-3.5 w-3.5" /> Mark paid to the worker
            </button>
          )}
          {collecting && (
            <>
              <button
                onClick={() => { if (confirm.isPending) return; if (window.confirm("Send every dollar back to the people who chipped in?")) stall.mutate("refund"); }}
                className="rounded-full border border-border px-3.5 py-1.5 text-[12px] text-ink-soft"
              >
                Give the money back
              </button>
              <button
                onClick={() => { if (window.confirm("Leave the money on the board for another job?")) stall.mutate("keep"); }}
                className="rounded-full border border-border px-3.5 py-1.5 text-[12px] text-ink-soft"
              >
                Leave it on the board
              </button>
            </>
          )}
        </div>
      )}

      {fund.worker_id && (
        <div className="mt-3 border-t border-border pt-3">
          <p className="text-[12px] text-ink-soft">If they didn't finish or didn't show, put it on the record.</p>
          <div className="mt-1.5 flex gap-1.5">
            {(["unfinished", "no_show", "left_early"] as const).map(k => (
              <button
                key={k}
                onClick={() => setMarkKind(k)}
                className={`rounded-full border px-2.5 py-1 text-[11.5px] ${markKind === k ? "border-ink bg-ink text-paper" : "border-border bg-paper text-ink-soft"}`}
              >
                {MARK_LABEL[k]}
              </button>
            ))}
          </div>
          <input
            value={markNote}
            onChange={e => setMarkNote(e.target.value)}
            placeholder="What happened (kept short and fair)"
            className="mt-2 w-full rounded-xl border border-border bg-paper px-3 py-2 text-[12.5px] text-ink outline-none placeholder:text-ink-soft/60"
          />
          <button
            onClick={() => mark.mutate()}
            disabled={mark.isPending}
            className="mt-2 rounded-full border border-flame/40 px-3.5 py-1.5 text-[12px] text-flame disabled:opacity-50"
          >
            Record it
          </button>
        </div>
      )}
    </div>
  );
}

/* ----------------------------- reviews ----------------------------- */

function ReviewForm({
  needId, workerId, userId, donated, onDone,
}: { needId: string; workerId: string; userId: string; donated: boolean; onDone: () => void }) {
  const [stars, setStars] = useState(5);
  const [body, setBody] = useState("");
  const [hours, setHours] = useState("");
  const save = useMutation({
    mutationFn: () =>
      addReview({
        needId,
        workerId,
        reviewerId: userId,
        reviewerRole: "poster",
        stars,
        body: body.trim(),
        donated,
        hours: donated && hours ? Number(hours) : null,
      }),
    onSuccess: () => { toast.success("Thank you. Their badge shows it now."); onDone(); },
    onError: () => toast.error("Couldn't save that review."),
  });

  return (
    <div className="mt-3 rounded-xl border border-border bg-paper p-3">
      <p className="text-[10px] uppercase tracking-[0.18em] text-ink-soft">How did they do?</p>
      <div className="mt-2 flex gap-1">
        {[1, 2, 3, 4, 5].map(n => (
          <button key={n} onClick={() => setStars(n)} aria-label={`${n} stars`}>
            <Star className={`h-6 w-6 ${n <= stars ? "fill-brass text-brass" : "text-ink-soft/40"}`} />
          </button>
        ))}
      </div>
      <textarea
        value={body}
        onChange={e => setBody(e.target.value)}
        rows={3}
        placeholder="What they did, how they treated your family."
        className="mt-2 w-full resize-none rounded-xl border border-border bg-card px-3 py-2.5 text-[13px] text-ink outline-none placeholder:text-ink-soft/60"
      />
      {donated && (
        <input
          value={hours}
          onChange={e => setHours(e.target.value.replace(/[^0-9.]/g, ""))}
          inputMode="decimal"
          placeholder="Hours they gave"
          className="mt-2 w-full rounded-xl border border-border bg-card px-3 py-2.5 text-[13px] text-ink outline-none placeholder:text-ink-soft/60"
        />
      )}
      <button
        onClick={() => save.mutate()}
        disabled={save.isPending}
        className="tap-scale mt-2.5 flex w-full items-center justify-center gap-2 rounded-xl bg-ink py-2.5 text-[13px] font-medium text-paper disabled:opacity-50"
      >
        {save.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Star className="h-4 w-4" />} Leave the review
      </button>
    </div>
  );
}
