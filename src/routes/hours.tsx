import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { ArrowLeft, BadgeCheck, Check, Clock, Loader2, Trash2, X, Briefcase, Eye, EyeOff } from "lucide-react";
import { BRAND } from "@/config/brand";
import { supabase } from "@/integrations/supabase/client";
import { useSession } from "@/hooks/useSession";
import { Avatar } from "@/components/Avatar";
import { StandingCard } from "@/components/perks/StandingCard";
import { HoursBadge } from "@/components/serving/HoursBadge";
import { ShareButton } from "@/components/ShareButton";
import { deleteHours, loadBadge, logHours, myHours, myNeeds, myOrgs, pendingForMe, reviewHours } from "@/lib/hours";

export const Route = createFileRoute("/hours")({
  staticData: { sitemap: false },
  component: Hours,
  validateSearch: (s: Record<string, unknown>): { need?: string } => ({
    need: typeof s.need === "string" ? s.need : undefined,
  }),
  head: () => ({
    meta: [
      { title: `Hours served · ${BRAND.name}` },
      { name: "description", content: "Log the hours you served, get them verified by the people you served, and carry a badge that's real." },
      { property: "og:title", content: `Hours served · ${BRAND.name}` },
      { property: "og:description", content: "Real hours, verified by real people." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
});

const INPUT = "w-full rounded-xl border border-border bg-paper px-3 py-2.5 text-[14px] text-ink outline-none placeholder:text-ink-soft/60";
const DATE = new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric" });

function Hours() {
  const { need: needParam } = Route.useSearch();
  const { userId, signedIn } = useSession();
  const qc = useQueryClient();

  const badgeQ = useQuery({ queryKey: ["badge", userId], queryFn: () => loadBadge(userId!), enabled: !!userId });
  const mineQ = useQuery({ queryKey: ["my-hours", userId], queryFn: () => myHours(userId!), enabled: !!userId });
  const pendingQ = useQuery({ queryKey: ["pending-hours", userId], queryFn: () => pendingForMe(userId!), enabled: !!userId });
  const orgsQ = useQuery({ queryKey: ["my-orgs", userId], queryFn: () => myOrgs(userId!), enabled: !!userId });
  const needsQ = useQuery({ queryKey: ["my-needs", userId], queryFn: () => myNeeds(userId!), enabled: !!userId });
  const profileQ = useQuery({
    queryKey: ["profile-badge-fields", userId],
    queryFn: async () => {
      const { data } = await supabase.from("profiles").select("business_name, business_line, serving_public").eq("user_id", userId!).maybeSingle();
      return data;
    },
    enabled: !!userId,
  });

  const refresh = () => {
    qc.invalidateQueries({ queryKey: ["my-hours"] });
    qc.invalidateQueries({ queryKey: ["badge"] });
    qc.invalidateQueries({ queryKey: ["pending-hours"] });
    qc.invalidateQueries({ queryKey: ["standing"] });
  };

  if (signedIn === false) {
    return (
      <div className="px-6 pt-16 text-center">
        <p className="font-serif text-[22px] text-ink">Sign in to log hours.</p>
        <Link to="/login" className="mt-5 inline-block rounded-full bg-ink px-5 py-2.5 text-[13px] text-paper">Sign in</Link>
      </div>
    );
  }

  const badge = badgeQ.data;
  const verified = Number(badge?.hours_verified ?? 0);
  const self = Number(badge?.hours_self ?? 0);

  return (
    <div className="pb-16">
      <div className="px-4 pt-3">
        <Link to="/serve" className="inline-flex items-center gap-1 text-[13px] text-ink-soft"><ArrowLeft className="h-4 w-4" /> Serve</Link>
      </div>
      <header className="px-5 pt-3">
        <p className="text-[11px] uppercase tracking-[0.22em] text-brass">Hours served</p>
        <h1 className="mt-2 font-serif text-[28px] leading-tight text-ink">Your hours are real</h1>
        <p className="mt-2 text-[13px] leading-relaxed text-ink-soft">
          Log what you served. A leader of the church or nonprofit — or the person whose need you fixed — confirms it. Verified hours go on your public badge; a contractor can show his customers where his heart is.
        </p>
      </header>

      {userId && (
        <div className="mt-5 space-y-4 px-4">
          <StandingCard ledger="goer" total={verified} compact />
          <div className="rounded-2xl border border-border bg-card p-4 shadow-soft">
            <p className="text-[10px] uppercase tracking-[0.2em] text-brass">Your public badge</p>
            <div className="mt-3">
              <HoursBadge userId={userId} hoursVerified={verified} hoursSelf={self} businessName={badge?.business_name} businessLine={badge?.business_line} showEmpty />
            </div>
            <div className="mt-3 flex items-center gap-2">
              <ShareButton title={`My verified service on ${BRAND.name}`} text={`${verified.toLocaleString()} verified hours of service.`} path={`/badge/${userId}`} label="Share badge" />
              <Link to="/badge/$id" params={{ id: userId }} className="text-[12px] text-brass">Preview</Link>
            </div>
            {profileQ.data && <BadgeSettings userId={userId} initial={profileQ.data} onSaved={() => { qc.invalidateQueries({ queryKey: ["badge"] }); qc.invalidateQueries({ queryKey: ["profile-badge-fields"] }); }} />}
          </div>
        </div>
      )}

      {userId && (
        <LogForm
          userId={userId}
          orgs={orgsQ.data ?? []}
          needs={needsQ.data ?? []}
          presetNeed={needParam}
          onLogged={refresh}
        />
      )}

      {(pendingQ.data ?? []).length > 0 && (
        <section className="mt-8 px-4">
          <h2 className="mb-1 px-1 font-serif text-[13px] uppercase tracking-[0.18em] text-ink-soft">Waiting on your word</h2>
          <p className="mb-3 px-1 text-[11.5px] text-ink-soft">People say they served with you. Confirm what you saw.</p>
          <div className="space-y-2">
            {(pendingQ.data ?? []).map(h => (
              <div key={h.id} className="rounded-2xl border border-border bg-card p-3.5">
                <div className="flex items-center gap-3">
                  <Avatar name={h.author.name} photo={h.author.photo} size={34} />
                  <div className="min-w-0 flex-1 leading-tight">
                    <p className="text-[13.5px] text-ink"><span className="font-medium">{h.author.name}</span> · {Number(h.hours)} h</p>
                    <p className="truncate text-[11px] text-ink-soft">{h.need ? h.need.title : h.org?.name} · {DATE.format(new Date(h.served_on))}{h.note ? ` · ${h.note}` : ""}</p>
                  </div>
                </div>
                <div className="mt-2.5 flex gap-2">
                  <button onClick={() => reviewHours(h.id, "verified").then(() => { toast.success("Verified."); refresh(); }).catch(() => toast.error("Couldn't verify that."))} className="inline-flex flex-1 items-center justify-center gap-1 rounded-xl bg-ink py-2 text-[12.5px] text-paper"><Check className="h-3.5 w-3.5" /> Yes, they did</button>
                  <button onClick={() => reviewHours(h.id, "rejected").then(() => { toast("Marked as not confirmed."); refresh(); }).catch(() => toast.error("Couldn't do that."))} className="inline-flex items-center justify-center gap-1 rounded-xl border border-border px-3 py-2 text-[12.5px] text-ink-soft"><X className="h-3.5 w-3.5" /> No</button>
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      <section className="mt-8 px-4">
        <h2 className="mb-3 px-1 font-serif text-[13px] uppercase tracking-[0.18em] text-ink-soft">Your log</h2>
        {mineQ.isLoading ? null : (mineQ.data ?? []).length === 0 ? (
          <p className="rounded-2xl border border-dashed border-border p-5 text-center text-[13px] text-ink-soft">Nothing logged yet. The first hour counts.</p>
        ) : (
          <div className="space-y-2">
            {(mineQ.data ?? []).map(h => (
              <div key={h.id} className="flex items-center gap-3 rounded-xl border border-border bg-card px-3.5 py-3">
                <span className={`grid h-8 w-8 shrink-0 place-items-center rounded-full ${h.status === "verified" ? "bg-brass/20" : "bg-secondary"}`}>
                  {h.status === "verified" ? <BadgeCheck className="h-4 w-4 text-brass-deep" /> : <Clock className="h-4 w-4 text-ink-soft" />}
                </span>
                <div className="min-w-0 flex-1 leading-tight">
                  <p className="text-[13.5px] text-ink">{Number(h.hours)} h · {h.need ? h.need.title : h.org?.name ?? "On my own"}</p>
                  <p className="truncate text-[11px] text-ink-soft">
                    {DATE.format(new Date(h.served_on))} · {h.status === "verified" ? "Verified" : h.status === "rejected" ? "Not confirmed" : "Awaiting confirmation"}{h.note ? ` · ${h.note}` : ""}
                  </p>
                </div>
                {h.status === "self" && (
                  <button aria-label="Remove" onClick={() => deleteHours(h.id).then(refresh).catch(() => toast.error("Couldn't remove that."))} className="p-1.5 text-ink-soft"><Trash2 className="h-3.5 w-3.5" /></button>
                )}
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}

function LogForm({ userId, orgs, needs, presetNeed, onLogged }: { userId: string; orgs: { id: string; name: string }[]; needs: { id: string; title: string }[]; presetNeed?: string; onLogged: () => void }) {
  const [hours, setHours] = useState("");
  const [date, setDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [note, setNote] = useState("");
  const [target, setTarget] = useState<string>(presetNeed ? `need:${presetNeed}` : "");
  useEffect(() => { if (presetNeed) setTarget(`need:${presetNeed}`); }, [presetNeed]);

  const log = useMutation({
    mutationFn: async () => {
      const n = Number(hours);
      if (!(n > 0 && n <= 1000)) throw new Error("Enter hours between 0 and 1,000.");
      const [kind, id] = target.split(":");
      await logHours(userId, {
        hours: n,
        served_on: date,
        note: note.trim(),
        org_id: kind === "org" ? id! : null,
        need_id: kind === "need" ? id! : null,
      });
    },
    onSuccess: () => { setHours(""); setNote(""); toast.success(target ? "Logged. They'll be asked to confirm." : "Logged as self-reported."); onLogged(); },
    onError: (e: Error) => toast.error(e.message || "Couldn't log that."),
  });

  return (
    <section className="mx-4 mt-5 rounded-2xl border border-border bg-card p-4 shadow-soft">
      <p className="text-[10px] uppercase tracking-[0.2em] text-brass">Log hours</p>
      <div className="mt-3 grid grid-cols-2 gap-2">
        <label className="block"><span className="text-[11px] text-ink-soft">Hours</span><input value={hours} onChange={e => setHours(e.target.value.replace(/[^0-9.]/g, ""))} inputMode="decimal" placeholder="3" className={`${INPUT} mt-1`} /></label>
        <label className="block"><span className="text-[11px] text-ink-soft">Day</span><input type="date" value={date} onChange={e => setDate(e.target.value)} className={`${INPUT} mt-1`} /></label>
      </div>
      <label className="mt-3 block">
        <span className="text-[11px] text-ink-soft">Who can confirm it</span>
        <select value={target} onChange={e => setTarget(e.target.value)} className={`${INPUT} mt-1`}>
          <option value="">Nobody yet — self-reported</option>
          {needs.length > 0 && <optgroup label="Needs you helped with">{needs.map(n => <option key={n.id} value={`need:${n.id}`}>{n.title}</option>)}</optgroup>}
          {orgs.length > 0 && <optgroup label="Your churches & organizations">{orgs.map(o => <option key={o.id} value={`org:${o.id}`}>{o.name}</option>)}</optgroup>}
        </select>
        {!target && <p className="mt-1 text-[11px] text-ink-soft">Self-reported hours show on your badge separately and don't climb the ladder. Pick a church or a need so someone can vouch for you.</p>}
      </label>
      <label className="mt-3 block"><span className="text-[11px] text-ink-soft">What you did (optional)</span><input value={note} onChange={e => setNote(e.target.value.slice(0, 500))} placeholder="Mowed and edged the widow's yard on Elm St." className={`${INPUT} mt-1`} /></label>
      <button onClick={() => log.mutate()} disabled={log.isPending || !hours} className="tap-scale mt-4 flex w-full items-center justify-center gap-2 rounded-xl bg-ink py-2.5 text-[13.5px] font-medium text-paper disabled:opacity-50">
        {log.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Clock className="h-4 w-4" />} Log it
      </button>
    </section>
  );
}

function BadgeSettings({ userId, initial, onSaved }: { userId: string; initial: { business_name: string; business_line: string; serving_public: boolean }; onSaved: () => void }) {
  const [open, setOpen] = useState(false);
  const [name, setName] = useState(initial.business_name);
  const [line, setLine] = useState(initial.business_line);
  const [pub, setPub] = useState(initial.serving_public);
  const save = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from("profiles").update({ business_name: name.trim().slice(0, 80), business_line: line.trim().slice(0, 80), serving_public: pub }).eq("user_id", userId);
      if (error) throw error;
    },
    onSuccess: () => { setOpen(false); onSaved(); toast.success("Badge updated."); },
    onError: () => toast.error("Couldn't save that."),
  });
  if (!open) {
    return (
      <button onClick={() => setOpen(true)} className="mt-3 inline-flex items-center gap-1.5 text-[12px] text-ink-soft">
        <Briefcase className="h-3.5 w-3.5" /> {initial.business_name ? "Edit business on badge" : "Run a business? Put it on your badge"}
      </button>
    );
  }
  return (
    <div className="mt-3 space-y-2 rounded-xl border border-border bg-paper p-3">
      <input value={name} onChange={e => setName(e.target.value)} placeholder="Business name (e.g. Ridgeline Lawn Care)" className={INPUT} />
      <input value={line} onChange={e => setLine(e.target.value)} placeholder="What you do (e.g. Landscaping)" className={INPUT} />
      <button onClick={() => setPub(v => !v)} className="flex w-full items-center gap-2 py-1 text-left text-[12.5px] text-ink">
        {pub ? <Eye className="h-4 w-4 text-hope" /> : <EyeOff className="h-4 w-4 text-ink-soft" />}
        {pub ? "Badge is public — anyone with the link can see it" : "Badge is hidden — only you"}
      </button>
      <div className="flex gap-2">
        <button onClick={() => save.mutate()} disabled={save.isPending} className="rounded-full bg-ink px-3.5 py-1.5 text-[12px] text-paper disabled:opacity-50">Save</button>
        <button onClick={() => setOpen(false)} className="rounded-full border border-border px-3.5 py-1.5 text-[12px] text-ink-soft">Cancel</button>
      </div>
    </div>
  );
}
