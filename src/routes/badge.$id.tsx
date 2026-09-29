import { createFileRoute, Link } from "@tanstack/react-router";
import { BadgeCheck, Clock, ShieldCheck, Star } from "lucide-react";
import { BRAND } from "@/config/brand";
import { getPublicBadge } from "@/lib/needs.functions";
import { formatTotal } from "@/lib/perks";
import { ShareButton } from "@/components/ShareButton";

export const Route = createFileRoute("/badge/$id")({
  staticData: { sitemap: false },
  loader: ({ params }) => getPublicBadge({ data: { id: params.id } }),
  component: BadgePage,
  errorComponent: () => <Empty text="This badge couldn't be loaded right now." />,
  notFoundComponent: () => <Empty text="No badge here." />,
  head: ({ loaderData }) => {
    const b = loaderData;
    const who = b?.business_name || b?.display_name || "A member";
    const title = b ? `${who} — ${formatTotal("goer", b.hours_verified)} of verified service · ${BRAND.name}` : `Serving badge · ${BRAND.name}`;
    const desc = b
      ? `${who} has ${formatTotal("goer", b.hours_verified)} of verified volunteer hours${b.business_line ? ` (${b.business_line})` : ""} on ${BRAND.name}. Hours are confirmed by the churches, nonprofits, and neighbors they served.`
      : "Verified volunteer hours, confirmed by the people served.";
    return {
      meta: [
        { title },
        { name: "description", content: desc },
        { property: "og:title", content: title },
        { property: "og:description", content: desc },
        { property: "og:type", content: "profile" },
        { name: "twitter:card", content: "summary" },
      ],
    };
  },
});

function Empty({ text }: { text: string }) {
  return (
    <div className="px-6 pt-16 text-center">
      <p className="font-serif text-[20px] text-ink-soft">{text}</p>
      <Link to="/" className="mt-4 inline-block text-brass">Back to {BRAND.name}</Link>
    </div>
  );
}

function BadgePage() {
  const b = Route.useLoaderData();
  if (!b) return <Empty text="This person keeps their serving private." />;
  const servant = b.hours_verified >= 50;
  const who = b.business_name || b.display_name;

  return (
    <div className="px-5 pb-16 pt-8">
      <div className={`rounded-3xl border p-6 text-center shadow-soft ${servant ? "border-brass/50 bg-gradient-to-b from-brass/15 to-card" : "border-border bg-card"}`}>
        <div className={`mx-auto grid h-16 w-16 place-items-center rounded-full ${servant ? "bg-brass/25" : "bg-secondary"}`}>
          {servant ? <BadgeCheck className="h-8 w-8 text-brass-deep" /> : <Clock className="h-8 w-8 text-ink" />}
        </div>
        <p className="mt-4 text-[10px] uppercase tracking-[0.22em] text-brass">{servant ? "Verified Servant" : "Hours served"}</p>
        <h1 className="mt-1.5 font-serif text-[26px] leading-tight text-ink">{who}</h1>
        {b.business_name && b.display_name && b.business_name !== b.display_name && (
          <p className="mt-0.5 text-[12.5px] text-ink-soft">{b.display_name}{b.business_line ? ` · ${b.business_line}` : ""}</p>
        )}
        {!b.business_name && b.business_line && <p className="mt-0.5 text-[12.5px] text-ink-soft">{b.business_line}</p>}

        <p className="mt-6 font-serif text-[44px] leading-none text-ink">{formatTotal("goer", b.hours_verified)}</p>
        <p className="mt-1 text-[12px] uppercase tracking-[0.16em] text-ink-soft">verified hours given</p>
        {b.hours_self > 0 && (
          <p className="mt-3 text-[12px] text-ink-soft">+ {formatTotal("goer", b.hours_self)} self-reported, awaiting a leader's confirmation</p>
        )}

        <div className="mt-6 rounded-2xl border border-border bg-paper p-3.5 text-left">
          <p className="inline-flex items-center gap-1.5 text-[10px] uppercase tracking-[0.18em] text-ink-soft"><ShieldCheck className="h-3 w-3" /> What verified means</p>
          <p className="mt-1.5 text-[12.5px] leading-relaxed text-ink">
            Every verified hour was confirmed by a church or nonprofit leader, or by the neighbor whose need was fixed — often with a before-and-after photo. Nobody can verify their own hours.
          </p>
        </div>

        <div className="mt-5 flex justify-center gap-2">
          <ShareButton title={`${who} · ${formatTotal("goer", b.hours_verified)} verified service`} text={`${who} has given ${formatTotal("goer", b.hours_verified)} of verified volunteer service on ${BRAND.name}.`} />
        </div>
      </div>

      {b.review_count > 0 && (
        <div className="mt-5 rounded-3xl border border-border bg-card p-5 shadow-soft">
          <div className="flex items-end justify-between">
            <div>
              <p className="text-[10px] uppercase tracking-[0.2em] text-brass">What people say</p>
              <p className="mt-1.5 font-serif text-[26px] leading-none text-ink">
                {b.avg_stars != null ? b.avg_stars.toFixed(1) : "—"}
                <span className="ml-1 text-[13px] font-normal text-ink-soft">of 5</span>
              </p>
            </div>
            <div className="flex gap-0.5">
              {[1, 2, 3, 4, 5].map(n => (
                <Star
                  key={n}
                  className={`h-4 w-4 ${b.avg_stars != null && n <= Math.round(b.avg_stars) ? "fill-brass text-brass" : "text-ink-soft/30"}`}
                />
              ))}
            </div>
          </div>
          <p className="mt-1 text-[12px] text-ink-soft">
            {b.review_count} {b.review_count === 1 ? "review" : "reviews"}
            {b.donated_jobs > 0 && ` · ${b.donated_jobs} ${b.donated_jobs === 1 ? "job" : "jobs"} done for free`}
            {b.unfinished_marks > 0 && ` · ${b.unfinished_marks} unfinished on record`}
          </p>

          <div className="mt-4 space-y-3">
            {b.reviews.map((r, i) => (
              <div key={i} className="rounded-2xl border border-border bg-paper p-3.5 text-left">
                <div className="flex items-center gap-2">
                  <div className="flex gap-0.5">
                    {[1, 2, 3, 4, 5].map(n => (
                      <Star key={n} className={`h-3.5 w-3.5 ${n <= r.stars ? "fill-brass text-brass" : "text-ink-soft/30"}`} />
                    ))}
                  </div>
                  {r.donated && (
                    <span className="rounded-full bg-brass/15 px-2 py-0.5 text-[10.5px] text-brass-deep">
                      Gave the work{r.hours ? ` · ${formatTotal("goer", r.hours)}` : ""}
                    </span>
                  )}
                </div>
                {r.body && <p className="mt-2 text-[13px] leading-relaxed text-ink">{r.body}</p>}
              </div>
            ))}
          </div>
        </div>
      )}

      <p className="mt-6 text-center text-[11.5px] leading-relaxed text-ink-soft">
        {BRAND.name} is where people pray, serve, and give — and where the hours are real.
        <br />
        <Link to="/" className="text-brass">See {BRAND.name}</Link>
      </p>
    </div>
  );
}
