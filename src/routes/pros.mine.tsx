import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { ArrowLeft, BadgeCheck, Loader2, ShieldAlert } from "lucide-react";
import { BRAND } from "@/config/brand";
import { useSession } from "@/hooks/useSession";
import {
  PRO_STATUS,
  myProPage,
  proPlace,
  rateLine,
  reviewsOfPro,
  averageStars,
  saveProPage,
  startVerification,
  strikeCounts,
  strikesFor,
  verificationFor,
} from "@/lib/pros";
import { ProfileMediaManager } from "@/components/profile-media/ProfileMediaManager";
import { ProfilePictureEditor } from "@/components/profile-media/ProfilePictureEditor";

export const Route = createFileRoute("/pros/mine")({
  staticData: { sitemap: false },
  component: MyProPage,
  head: () => ({
    meta: [
      { title: `Your professional page · ${BRAND.name}` },
      {
        name: "description",
        content: "Your page, your identity check, your reviews, and anything our team has flagged.",
      },
      { property: "og:title", content: `Your professional page · ${BRAND.name}` },
      { property: "og:description", content: "Keep your page current and see how jobs went." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
});

function MyProPage() {
  const { userId, signedIn } = useSession();
  const qc = useQueryClient();

  const page = useQuery({
    queryKey: ["pros", "mine", userId],
    queryFn: () => myProPage(userId!),
    enabled: !!userId,
  });
  const pro = page.data ?? null;

  const reviews = useQuery({
    queryKey: ["pros", "reviews", pro?.id],
    queryFn: () => reviewsOfPro(pro!.id),
    enabled: !!pro,
  });
  const strikes = useQuery({
    queryKey: ["pros", "strikes", pro?.id],
    queryFn: () => strikesFor(pro!.id),
    enabled: !!pro,
  });
  const check = useQuery({
    queryKey: ["pros", "verification", pro?.id],
    queryFn: () => verificationFor(pro!.id),
    enabled: !!pro,
  });

  const [headline, setHeadline] = useState<string | null>(null);
  const [photo, setPhoto] = useState(pro?.photo_url ?? null);
  const save = useMutation({
    mutationFn: () => saveProPage(pro!.id, { headline: (headline ?? "").trim() }),
    onSuccess: () => {
      toast.success("Saved.");
      void qc.invalidateQueries({ queryKey: ["pros"] });
    },
    onError: () => toast.error("That didn't save."),
  });

  const begin = useMutation({
    mutationFn: () => startVerification(pro!.id),
    onSuccess: () => {
      toast.success("We'll be in touch about your identity check.");
      void qc.invalidateQueries({ queryKey: ["pros", "verification"] });
    },
    onError: () => toast.error("We couldn't start that."),
  });

  if (signedIn === false) return <Shell><p className={muted}>Sign in to see your page.</p></Shell>;
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
        <p className={muted}>You don't have a page yet.</p>
        <Link
          to="/pros/new"
          className="mt-3 inline-flex rounded-full bg-primary px-4 py-2 text-[12.5px] text-primary-foreground"
        >
          Set one up
        </Link>
      </Shell>
    );
  }

  const counts = strikeCounts(strikes.data ?? []);
  const stars = averageStars(reviews.data ?? []);

  const savePhoto = async (path: string | null) => {
    await saveProPage(pro.id, { photo_url: path });
    setPhoto(path);
    void qc.invalidateQueries({ queryKey: ["pros"] });
  };

  return (
    <Shell>
      <div className="rounded-2xl border border-border bg-card p-4 shadow-soft">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="font-serif text-[18px] leading-tight text-ink">{pro.display_name}</p>
            <p className="mt-0.5 text-[11.5px] text-ink-soft">
              {[pro.trade, proPlace(pro), rateLine(pro)].filter(Boolean).join(" · ")}
            </p>
          </div>
          <span className="shrink-0 rounded-full border border-border bg-paper px-2 py-0.5 text-[10px] uppercase tracking-[0.12em] text-ink-soft">
            {PRO_STATUS[pro.status] ?? pro.status}
          </span>
        </div>
        {pro.review_note && (
          <p className="mt-2 text-[12.5px] leading-relaxed text-ink-soft">
            From our team: {pro.review_note}
          </p>
        )}
        {pro.status === "approved" && (
          <Link
            to="/pro/$slug"
            params={{ slug: pro.slug }}
            className="mt-3 inline-flex text-[12.5px] text-brass"
          >
            See your page the way others do
          </Link>
        )}
      </div>

      <Section title="Lanes & leads">
        <p className={muted}>
          Switch on the kinds of work you do, set your own rate in each, and answer the people asking
          for that work near you.
        </p>
        <Link to="/pros/leads" className="mt-2 inline-flex text-[12.5px] text-brass">
          Open lanes and leads
        </Link>
      </Section>

      <Section title="Payments">
        <p className={muted}>
          What's held for your jobs, what's been paid to you, and hours you've served.
        </p>
        <Link to="/pros/payments" className="mt-2 inline-flex text-[12.5px] text-brass">
          Open payments
        </Link>
      </Section>

      <Section title="Your Witness story">
        <p className={muted}>
          Share a real moment when Witness helped you find meaningful work or serve someone well.
        </p>
        <Link to="/testimonials/share" className="mt-2 inline-flex text-[12.5px] text-brass">
          Share a success story
        </Link>
      </Section>

      <Section title="Identity check">
        {pro.id_verified_at ? (
          <p className="inline-flex items-center gap-1.5 text-[13px] text-ink">
            <BadgeCheck className="h-4 w-4 text-brass" /> Verified — you can be hired.
          </p>
        ) : (
          <>
            <p className={muted}>
              Nobody can hire you until your identity is checked. It's a one-time thing.
            </p>
            <p className="mt-2 text-[12px] text-ink-soft">
              {check.data?.status === "pending"
                ? "Started — our team will reach out with the next step."
                : "Our identity provider isn't connected yet, so a person on our team will walk you through it."}
            </p>
            {check.data?.status !== "pending" && (
              <button
                type="button"
                disabled={begin.isPending}
                onClick={() => begin.mutate()}
                className="mt-3 inline-flex rounded-full bg-primary px-4 py-2 text-[12.5px] text-primary-foreground disabled:opacity-60"
              >
                Start my identity check
              </button>
            )}
          </>
        )}
      </Section>

      <Section title="One line about your work">
        <textarea
          value={headline ?? pro.headline}
          onChange={e => setHeadline(e.target.value)}
          rows={2}
          className="w-full rounded-xl border border-border bg-paper px-3 py-2 text-[13px] text-ink outline-none"
        />
        <button
          type="button"
          disabled={save.isPending || headline === null}
          onClick={() => save.mutate()}
          className="mt-2 inline-flex rounded-full bg-primary px-4 py-2 text-[12.5px] text-primary-foreground disabled:opacity-50"
        >
          Save
        </button>
      </Section>

      <Section title="Profile picture">
        <ProfilePictureEditor pageType="professional" pageId={pro.id} value={photo} shape="square" label="Square profile picture" onSaved={savePhoto} />
      </Section>

      <ProfileMediaManager pageType="professional" pageId={pro.id} />

      <Section title="How jobs have gone">
        <p className="text-[13px] text-ink">
          {stars ? `${stars} out of 5` : "No reviews shown yet"}
          <span className="text-ink-soft">
            {" "}
            · {reviews.data?.length ?? 0} {reviews.data?.length === 1 ? "review" : "reviews"}
          </span>
        </p>
        <p className="mt-1 text-[11.5px] text-ink-soft">
          Neither side's review appears until both have written one, or a week has passed.
        </p>
        <div className="mt-3 space-y-2">
          {(reviews.data ?? []).slice(0, 5).map(r => (
            <div key={r.id} className="rounded-xl border border-border bg-paper p-3">
              <p className="text-[12px] text-brass">{"★".repeat(r.stars)}</p>
              {r.body && <p className="mt-1 text-[12.5px] leading-relaxed text-ink">{r.body}</p>}
            </div>
          ))}
        </div>
      </Section>

      {(counts.no_show > 0 || counts.quality > 0) && (
        <Section title="Flagged">
          <p className="inline-flex items-start gap-2 text-[13px] text-ink">
            <ShieldAlert className="mt-0.5 h-4 w-4 shrink-0 text-destructive" />
            <span>
              {counts.no_show} no-show {counts.no_show === 1 ? "report" : "reports"} ·{" "}
              {counts.quality} quality {counts.quality === 1 ? "report" : "reports"}. A second of
              either takes your page out of search. If you think that's wrong, write to us and a
              person will look at it again.
            </span>
          </p>
        </Section>
      )}
    </Shell>
  );
}

const muted = "text-[13px] leading-relaxed text-ink-soft";

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
        <h1 className="mt-2 font-serif text-[28px] leading-tight text-ink">Your page</h1>
      </header>
      <div className="space-y-4 px-4">{children}</div>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="rounded-2xl border border-border bg-card p-4 shadow-soft">
      <h2 className="mb-2 text-[11px] uppercase tracking-[0.18em] text-ink-soft">{title}</h2>
      {children}
    </section>
  );
}
