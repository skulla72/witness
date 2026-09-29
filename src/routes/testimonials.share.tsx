import { createFileRoute, Link } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ArrowLeft, CheckCircle2, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { BRAND } from "@/config/brand";
import { useSession } from "@/hooks/useSession";
import { leaderOrgs } from "@/lib/orgs";
import { myProPage } from "@/lib/pros";
import { myTestimonials, submitTestimonial, TESTIMONIAL_STATUS } from "@/lib/testimonials";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";

export const Route = createFileRoute("/testimonials/share")({
  staticData: { sitemap: false },
  component: ShareStoryPage,
  head: () => ({
    meta: [
      { title: `Share your success story · ${BRAND.name}` },
      { name: "description", content: "Churches and professionals can share an honest story about what Witness helped make possible." },
      { property: "og:title", content: `Share your story · ${BRAND.name}` },
      { property: "og:description", content: "Tell Witness what changed for your church or professional work." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
});

type Choice = { type: "church" | "professional"; id: string; name: string };

function ShareStoryPage() {
  const { userId, signedIn } = useSession();
  const qc = useQueryClient();
  const orgs = useQuery({ queryKey: ["leader-orgs", userId], queryFn: () => leaderOrgs(userId ?? ""), enabled: Boolean(userId) });
  const pro = useQuery({ queryKey: ["pros", "mine", userId], queryFn: () => myProPage(userId ?? ""), enabled: Boolean(userId) });
  const mine = useQuery({ queryKey: ["testimonials", "mine", userId], queryFn: () => myTestimonials(userId ?? ""), enabled: Boolean(userId) });
  const choices = useMemo<Choice[]>(() => [
    ...(pro.data?.status === "approved" ? [{ type: "professional" as const, id: pro.data.id, name: pro.data.display_name }] : []),
    ...(orgs.data ?? []).map(org => ({ type: "church" as const, id: org.id, name: org.name })),
  ], [orgs.data, pro.data]);
  const [choiceKey, setChoiceKey] = useState("");
  const [headline, setHeadline] = useState("");
  const [story, setStory] = useState("");
  const [outcome, setOutcome] = useState("");
  const [photoUrl, setPhotoUrl] = useState("");
  const [consent, setConsent] = useState(false);
  const selected = choices.find(choice => `${choice.type}:${choice.id}` === choiceKey) ?? choices[0];
  const valid = Boolean(selected && consent && headline.trim().length >= 4 && story.trim().length >= 40 && outcome.trim().length >= 4);

  const submit = useMutation({
    mutationFn: () => {
      if (!userId || !selected) throw new Error("Choose a page.");
      return submitTestimonial(userId, {
        subject_type: selected.type,
        org_id: selected.type === "church" ? selected.id : null,
        pro_id: selected.type === "professional" ? selected.id : null,
        headline,
        story,
        outcome,
        photo_url: photoUrl,
        consent_confirmed: consent,
      });
    },
    onSuccess: () => {
      toast.success("Your story is with our team.");
      setHeadline(""); setStory(""); setOutcome(""); setPhotoUrl(""); setConsent(false);
      void qc.invalidateQueries({ queryKey: ["testimonials"] });
    },
    onError: () => toast.error("That story didn't send. Check each field and try again."),
  });

  if (signedIn === false) return <Shell><p className={muted}>Sign in with the account that runs your church or professional page.</p><Link to="/login" search={{ next: "/testimonials/share" }} className="mt-4 inline-flex rounded-full bg-primary px-5 py-2.5 text-[13px] text-primary-foreground">Sign in</Link></Shell>;
  if (signedIn === undefined || orgs.isLoading || pro.isLoading) return <Shell><Loader2 className="mx-auto my-12 h-5 w-5 animate-spin text-ink-soft" /></Shell>;

  return (
    <Shell>
      {choices.length === 0 ? (
        <div className="rounded-2xl border border-border bg-card p-5">
          <p className="font-serif text-[18px] text-ink">A live page is needed first.</p>
          <p className={`mt-2 ${muted}`}>Stories can come from an approved professional page or a church page you own or lead.</p>
          <div className="mt-4 flex gap-3 text-[12.5px] text-brass"><Link to="/pros/new">Create a professional page</Link><Link to="/community">Find your church</Link></div>
        </div>
      ) : (
        <section className="rounded-2xl border border-border bg-card p-4 shadow-soft">
          <label className={label}>Whose story is this?</label>
          <select value={choiceKey || `${choices[0].type}:${choices[0].id}`} onChange={event => setChoiceKey(event.target.value)} className={field}>
            {choices.map(choice => <option key={`${choice.type}:${choice.id}`} value={`${choice.type}:${choice.id}`}>{choice.name} · {choice.type === "church" ? "church" : "professional"}</option>)}
          </select>
          <label className={label}>The headline</label>
          <input value={headline} maxLength={120} onChange={event => setHeadline(event.target.value)} placeholder="We found the right person at the right time" className={field} />
          <label className={label}>What happened?</label>
          <textarea value={story} maxLength={2000} rows={7} onChange={event => setStory(event.target.value)} placeholder="Tell it in your own words — what was needed, how Witness connected you, and what the experience felt like." className={field} />
          <p className="mt-1 text-right text-[10.5px] text-ink-soft">{story.length}/2000</p>
          <label className={label}>What changed?</label>
          <input value={outcome} maxLength={180} onChange={event => setOutcome(event.target.value)} placeholder="The roof was repaired before the next storm" className={field} />
          <label className={label}>Optional photo link</label>
          <input type="url" value={photoUrl} onChange={event => setPhotoUrl(event.target.value)} placeholder="https://…" className={field} />
          <label className="mt-5 flex items-start gap-3 text-[12px] leading-relaxed text-ink-soft">
            <Checkbox checked={consent} onCheckedChange={checked => setConsent(checked === true)} className="mt-0.5" />
            <span>I have permission to share this story and photo publicly. I understand the Witness team reviews it before publishing.</span>
          </label>
          <Button type="button" disabled={!valid || submit.isPending} onClick={() => submit.mutate()} className="mt-5 w-full rounded-full py-5">
            {submit.isPending ? "Sending…" : "Send for review"}
          </Button>
        </section>
      )}

      {(mine.data ?? []).length > 0 && (
        <section className="mt-7">
          <h2 className="px-1 text-[11px] uppercase tracking-[0.18em] text-ink-soft">Your stories</h2>
          <div className="mt-2 space-y-2">
            {(mine.data ?? []).map(item => (
              <div key={item.id} className="rounded-xl border border-border bg-card p-3">
                <div className="flex items-start justify-between gap-3"><p className="text-[13px] font-medium text-ink">{item.headline}</p><span className="shrink-0 text-[10.5px] text-brass-deep">{TESTIMONIAL_STATUS[item.status] ?? item.status}</span></div>
                {item.review_note && <p className="mt-2 text-[11.5px] leading-relaxed text-ink-soft">From our team: {item.review_note}</p>}
                {item.status === "approved" && <p className="mt-2 inline-flex items-center gap-1 text-[11.5px] text-hope"><CheckCircle2 className="h-3.5 w-3.5" /> Published</p>}
              </div>
            ))}
          </div>
        </section>
      )}
    </Shell>
  );
}

const muted = "text-[13px] leading-relaxed text-ink-soft";
const label = "mt-4 block text-[11px] uppercase tracking-[0.16em] text-ink-soft first:mt-0";
const field = "mt-2 w-full rounded-xl border border-border bg-paper px-3 py-2.5 text-[13px] leading-relaxed text-ink outline-none placeholder:text-ink-soft/55";

function Shell({ children }: { children: React.ReactNode }) {
  return <div className="min-h-screen pb-16"><div className="px-4 pt-3"><Link to="/testimonials" className="inline-flex items-center gap-1 text-[13px] text-ink-soft"><ArrowLeft className="h-4 w-4" /> Stories of impact</Link></div><header className="px-5 pb-5 pt-4"><p className="text-[10px] uppercase tracking-[0.22em] text-brass">In your own words</p><h1 className="mt-2 font-serif text-[28px] leading-tight text-ink">Share what changed</h1><p className="mt-2 text-[13px] leading-relaxed text-ink-soft">Be specific, be honest, and keep private details out.</p></header><main className="px-4">{children}</main></div>;
}