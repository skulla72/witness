import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { ArrowLeft, Camera, Hammer, HandCoins, Loader2, Lock, Globe } from "lucide-react";
import { BRAND } from "@/config/brand";
import { useSession } from "@/hooks/useSession";
import { loadStory } from "@/lib/prayers";
import { acceptingPartners, createNeed, myLedOrgs, NEED_SKILLS, setNeedCover, uploadNeedMedia } from "@/lib/needs";

export const Route = createFileRoute("/needs/new")({
  staticData: { sitemap: false },
  component: NewNeed,
  validateSearch: (s: Record<string, unknown>): { prayer?: string } => ({
    prayer: typeof s.prayer === "string" ? s.prayer : undefined,
  }),
  head: () => ({
    meta: [
      { title: `Post a need · ${BRAND.name}` },
      { name: "description", content: "Turn a prayer or a church project into a tangible need people can fund or fix." },
      { property: "og:title", content: `Post a need · ${BRAND.name}` },
      { property: "og:description", content: "Turn a prayer or a church project into a tangible need people can fund or fix." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
});

function NewNeed() {
  const { prayer: prayerId } = Route.useSearch();
  const { userId, signedIn } = useSession();
  const navigate = useNavigate();
  const qc = useQueryClient();
  const fileRef = useRef<HTMLInputElement>(null);

  const kind: "prayer" | "project" = prayerId ? "prayer" : "project";
  const ledQ = useQuery({ queryKey: ["led-orgs", userId], queryFn: () => myLedOrgs(userId!), enabled: !!userId });
  const partnersQ = useQuery({ queryKey: ["accepting-partners"], queryFn: acceptingPartners, enabled: kind === "prayer" });
  const storyQ = useQuery({ queryKey: ["story", prayerId, userId], queryFn: () => loadStory(prayerId!, userId ?? null), enabled: !!prayerId && !!userId });

  const [title, setTitle] = useState("");
  const [story, setStory] = useState("");
  const [city, setCity] = useState("");
  const [region, setRegion] = useState("");
  const [orgId, setOrgId] = useState<string>("");
  const [goal, setGoal] = useState("");
  const [hands, setHands] = useState(false);
  const [hours, setHours] = useState("");
  const [skills, setSkills] = useState<string[]>([]);
  const [isPublic, setIsPublic] = useState(true);
  const [cover, setCover] = useState<File | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    const s = storyQ.data;
    if (s && !title) {
      setTitle(s.ask_caption.slice(0, 80));
      setIsPublic(s.privacy === "public");
    }
  }, [storyQ.data, title]);

  const led = ledQ.data ?? [];
  const orgOptions = kind === "project" ? led : [...led, ...(partnersQ.data ?? []).filter(p => !led.some(l => l.id === p.id))];
  useEffect(() => {
    if (!orgId && kind === "project" && led.length === 1) setOrgId(led[0]!.id);
  }, [led, kind, orgId]);

  const goalCents = goal ? Math.round(Number(goal) * 100) : 0;
  const valid = title.trim().length >= 3 && (goalCents === 0 || !!orgId) && (kind === "prayer" || !!orgId) && (goalCents > 0 || hands);

  if (signedIn === false) {
    return (
      <div className="px-6 pt-16 text-center">
        <p className="font-serif text-[22px] text-ink">Sign in to post a need.</p>
        <Link to="/login" className="mt-5 inline-block rounded-full bg-ink px-5 py-2.5 text-[13px] text-paper">Sign in</Link>
      </div>
    );
  }

  if (kind === "project" && ledQ.data && led.length === 0) {
    return (
      <div className="px-6 pb-16 pt-10 text-center">
        <p className="font-serif text-[20px] text-ink">Church projects are posted by leaders.</p>
        <p className="mt-2 text-[13px] leading-relaxed text-ink-soft">
          You'd need to lead a church or organization here so gifts have somewhere to land. Set one up, or ask your pastor to.
        </p>
        <Link to="/community/new" className="mt-5 inline-block rounded-full bg-ink px-5 py-2.5 text-[13px] text-paper">Add your church</Link>
        <p className="mt-6 text-[12px] text-ink-soft">
          Personal needs start from a prayer — open one of yours and tap <span className="text-ink">Fix that</span>.
        </p>
      </div>
    );
  }

  const submit = async () => {
    if (!userId || !valid || busy) return;
    setBusy(true);
    try {
      const need = await createNeed(userId, {
        kind,
        title: title.trim(),
        story: story.trim(),
        city: city.trim(),
        region: region.trim(),
        org_id: orgId || null,
        prayer_id: prayerId ?? null,
        goal_cents: goalCents,
        needs_hands: hands,
        hours_needed: hands ? Number(hours) || 0 : 0,
        skills: hands ? skills : [],
        is_public: isPublic,
      });
      if (cover) {
        try {
          const up = await uploadNeedMedia(need.id, userId, cover);
          await setNeedCover(need.id, up.path);
        } catch {
          toast.error("The need is up, but the photo didn't upload. You can add one from the need page.");
        }
      }
      qc.invalidateQueries({ queryKey: ["needs"] });
      qc.invalidateQueries({ queryKey: ["need-for-prayer"] });
      toast.success("Posted. Now people can fund it or show up.");
      navigate({ to: "/needs/$id", params: { id: need.id } });
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Couldn't post that.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="pb-20">
      <div className="px-4 pt-3">
        <Link to="/needs" className="inline-flex items-center gap-1 text-[13px] text-ink-soft"><ArrowLeft className="h-4 w-4" /> Needs</Link>
      </div>
      <header className="px-5 pt-3">
        <p className="text-[11px] uppercase tracking-[0.22em] text-brass">{kind === "prayer" ? "Fix that" : "Church project"}</p>
        <h1 className="mt-2 font-serif text-[26px] leading-tight text-ink">{kind === "prayer" ? "Make it something people can do" : "Post what your church needs"}</h1>
        <p className="mt-2 text-[13px] leading-relaxed text-ink-soft">
          {kind === "prayer"
            ? "Say plainly what would fix this — a repair, a bill, a job. People can fund it through a partner nonprofit, or show up and do it."
            : "A roof, a van, a furnace. Say what it costs and what it changes. The network does the rest."}
        </p>
      </header>

      <section className="mx-4 mt-5 space-y-4 rounded-2xl border border-border bg-card p-5 shadow-soft">
        <Field label="What needs doing">
          <input value={title} onChange={e => setTitle(e.target.value.slice(0, 120))} placeholder={kind === "prayer" ? "Replace the water heater" : "New roof for the sanctuary"} className={INPUT} />
        </Field>
        <Field label="The story">
          <textarea value={story} onChange={e => setStory(e.target.value.slice(0, 4000))} rows={4} placeholder="Who this is for, what happened, what changes when it's done." className={`${INPUT} resize-none`} />
        </Field>
        <div className="grid grid-cols-2 gap-2">
          <Field label="City"><input value={city} onChange={e => setCity(e.target.value.slice(0, 60))} className={INPUT} /></Field>
          <Field label="State"><input value={region} onChange={e => setRegion(e.target.value.slice(0, 40))} className={INPUT} /></Field>
        </div>

        <Field label={kind === "prayer" ? "Partner that receives the money" : "Your church or organization"}>
          <select value={orgId} onChange={e => setOrgId(e.target.value)} className={INPUT}>
            <option value="">{kind === "prayer" ? "No money — hands only" : "Choose one"}</option>
            {orgOptions.map(o => (
              <option key={o.id} value={o.id}>{o.name}{o.city ? ` · ${o.city}` : ""}</option>
            ))}
          </select>
          {kind === "prayer" && (
            <p className="mt-1 text-[11px] leading-snug text-ink-soft">Gifts never go person-to-person. A vetted nonprofit or your church collects and pays the bill.</p>
          )}
        </Field>

        <Field label="Amount to raise (leave blank if none)">
          <div className="flex items-center gap-2">
            <HandCoins className="h-4 w-4 text-brass" />
            <input value={goal} onChange={e => setGoal(e.target.value.replace(/[^0-9]/g, ""))} inputMode="numeric" placeholder="e.g. 4500" disabled={!orgId} className={`${INPUT} disabled:opacity-50`} />
          </div>
        </Field>

        <button onClick={() => setHands(v => !v)} className={`flex w-full items-center gap-3 rounded-xl border px-3 py-2.5 text-left ${hands ? "border-brass bg-brass/10" : "border-border bg-paper"}`}>
          <Hammer className="h-4 w-4 text-brass" />
          <span className="flex-1 text-[13px] text-ink">Hands needed too</span>
          <span className={`h-5 w-9 rounded-full p-0.5 transition-colors ${hands ? "bg-brass" : "bg-secondary"}`}><span className={`block h-4 w-4 rounded-full bg-paper transition-transform ${hands ? "translate-x-4" : ""}`} /></span>
        </button>
        {hands && (
          <>
            <Field label="Roughly how many hours">
              <input value={hours} onChange={e => setHours(e.target.value.replace(/[^0-9]/g, ""))} inputMode="numeric" placeholder="e.g. 40" className={INPUT} />
            </Field>
            <Field label="Skills that help">
              <div className="flex flex-wrap gap-1.5">
                {NEED_SKILLS.map(s => {
                  const on = skills.includes(s);
                  return (
                    <button key={s} onClick={() => setSkills(v => (on ? v.filter(x => x !== s) : [...v, s]))} className={`rounded-full border px-2.5 py-1 text-[11px] ${on ? "border-brass bg-brass/15 text-ink" : "border-border bg-paper text-ink-soft"}`}>{s}</button>
                  );
                })}
              </div>
            </Field>
          </>
        )}

        <Field label="A photo (the 'before')">
          <button onClick={() => fileRef.current?.click()} className="flex w-full items-center gap-2 rounded-xl border border-dashed border-border bg-paper px-3 py-2.5 text-left text-[12.5px] text-ink-soft">
            <Camera className="h-4 w-4 text-brass" /> {cover ? cover.name : "Add a photo"}
          </button>
          <input ref={fileRef} type="file" accept="image/*" className="sr-only" onChange={e => setCover(e.target.files?.[0] ?? null)} />
        </Field>

        <button onClick={() => setIsPublic(v => !v)} className="flex w-full items-center gap-3 rounded-xl border border-border bg-paper px-3 py-2.5 text-left">
          {isPublic ? <Globe className="h-4 w-4 text-hope" /> : <Lock className="h-4 w-4 text-ink-soft" />}
          <span className="flex-1 leading-tight">
            <span className="block text-[13px] text-ink">{isPublic ? "Public — anyone with the link can see it" : "Members only"}</span>
            <span className="block text-[11px] text-ink-soft">{isPublic ? "Shareable to Facebook, Instagram, anywhere." : "Only signed-in members who can see the prayer."}</span>
          </span>
        </button>

        <button disabled={!valid || busy} onClick={() => void submit()} className="tap-scale flex w-full items-center justify-center gap-2 rounded-xl bg-ink py-3 text-[14px] font-medium text-paper disabled:opacity-50">
          {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Hammer className="h-4 w-4" />} Post this need
        </button>
        {!valid && title.trim().length >= 3 && (
          <p className="text-center text-[11px] text-ink-soft">Set an amount (with a partner) or ask for hands — or both.</p>
        )}
      </section>
    </div>
  );
}

const INPUT = "w-full rounded-xl border border-border bg-paper px-3 py-2.5 text-[14px] text-ink outline-none placeholder:text-ink-soft/60";

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="text-[11px] text-ink-soft">{label}</span>
      <div className="mt-1">{children}</div>
    </label>
  );
}
