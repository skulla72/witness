import { createFileRoute, Link } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { ArrowLeft, BadgeCheck, Loader2 } from "lucide-react";
import { BRAND } from "@/config/brand";
import { useSession } from "@/hooks/useSession";
import { laneLabel, laneRange, laneByKey, urgencyLabel } from "@/data/serving-lanes";
import { proPlace } from "@/lib/pros";
import { TechCard } from "@/components/serving/TechCard";
import {
  OFFER_STATUS,
  REQUEST_STATUS,
  answerOffer,
  hiredProOf,
  loadRequest,
  matchesForRequest,
  money,
  offersWithPros,
  rateText,
  setRequestStatus,
} from "@/lib/serving";

export const Route = createFileRoute("/requests/$id")({
  staticData: { sitemap: false },
  component: RequestPage,
  head: () => ({
    meta: [
      { title: `Your ask for help · ${BRAND.name}` },
      {
        name: "description",
        content: "The offers that came back on your ask, who they came from, and what each one costs.",
      },
      { property: "og:title", content: `Your ask for help · ${BRAND.name}` },
      { property: "og:description", content: "Offers from the people who do this work." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
});

function RequestPage() {
  const { id } = Route.useParams();
  const { userId } = useSession();
  const qc = useQueryClient();

  const req = useQuery({ queryKey: ["serving", "request", id], queryFn: () => loadRequest(id) });
  const request = req.data ?? null;
  const mine = !!request && !!userId && request.seeker_id === userId;

  const offers = useQuery({
    queryKey: ["serving", "offers", id],
    queryFn: () => offersWithPros(id),
    enabled: mine,
  });
  const matches = useQuery({
    queryKey: ["serving", "matches", id],
    queryFn: () => matchesForRequest(request!),
    enabled: mine && !!request,
  });
  const hiredPro = useQuery({
    queryKey: ["serving", "hiredPro", request?.hired_pro_id],
    queryFn: () => hiredProOf(request!),
    enabled: !!request?.hired_pro_id,
  });

  const answer = useMutation({
    mutationFn: (v: { offerId: string; status: "accepted" | "declined" }) =>
      answerOffer(v.offerId, v.status),
    onSuccess: (_d, v) => {
      toast.success(v.status === "accepted" ? "Hired. They'll hear from us." : "Declined.");
      void qc.invalidateQueries({ queryKey: ["serving"] });
    },
    onError: () => toast.error("That didn't go through."),
  });

  const close = useMutation({
    mutationFn: (status: "completed" | "closed") => setRequestStatus(id, status),
    onSuccess: () => {
      toast.success("Updated.");
      void qc.invalidateQueries({ queryKey: ["serving"] });
    },
    onError: () => toast.error("That didn't save."),
  });

  if (req.isLoading) {
    return (
      <Shell>
        <div className="flex justify-center py-10">
          <Loader2 className="h-4 w-4 animate-spin text-ink-soft" />
        </div>
      </Shell>
    );
  }
  if (!request) {
    return (
      <Shell>
        <p className={muted}>We couldn't find that ask, or it isn't yours to see.</p>
      </Shell>
    );
  }

  const guide = laneByKey(request.lane);

  return (
    <Shell>
      <section className="rounded-2xl border border-border bg-card p-4 shadow-soft">
        <div className="flex items-baseline justify-between gap-3">
          <p className="font-serif text-[18px] leading-tight text-ink">{request.title}</p>
          <span className="shrink-0 text-[11px] uppercase tracking-[0.12em] text-ink-soft">
            {REQUEST_STATUS[request.status] ?? request.status}
          </span>
        </div>
        <p className="mt-1 text-[11.5px] text-ink-soft">
          {[laneLabel(request.lane), [request.city, request.region].filter(Boolean).join(", "), urgencyLabel(request.urgency)]
            .filter(Boolean)
            .join(" · ")}
        </p>
        {request.details && (
          <p className="mt-2 text-[13px] leading-relaxed text-ink">{request.details}</p>
        )}
        <p className="mt-2 text-[12px] text-ink-soft">
          {request.wants_donated
            ? "Asked as donated work — their time is counted in hours served."
            : request.budget_cents
              ? `Set aside ${money(request.budget_cents)}${request.rate_kind === "hourly" ? " an hour" : ""}`
              : "Open to their price"}
          {guide ? ` · usually ${laneRange(guide)}` : ""}
        </p>
      </section>

      {mine && hiredPro.data && (
        <TechCard
          pro={hiredPro.data}
          headsUpAt={request.heads_up_at}
          headsUpNote={request.heads_up_note}
        />
      )}

      {mine && (
        <>
          <section className="rounded-2xl border border-border bg-card p-4 shadow-soft">
            <h2 className="mb-2 text-[11px] uppercase tracking-[0.18em] text-ink-soft">
              Offers that came back
            </h2>
            {offers.isLoading && <Loader2 className="h-4 w-4 animate-spin text-ink-soft" />}
            {offers.data?.length === 0 && (
              <p className={muted}>
                Nothing yet. The people who work this lane can see your ask — most answer within a day.
              </p>
            )}
            <div className="space-y-2">
              {(offers.data ?? []).map(o => (
                <div key={o.id} className="rounded-xl border border-border bg-paper p-3">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      {o.pro ? (
                        <Link
                          to="/pro/$slug"
                          params={{ slug: o.pro.slug }}
                          className="font-serif text-[15.5px] leading-tight text-ink"
                        >
                          {o.pro.display_name}
                        </Link>
                      ) : (
                        <p className="font-serif text-[15.5px] text-ink">A professional</p>
                      )}
                      <p className="mt-0.5 text-[11.5px] text-ink-soft">
                        {[o.pro ? proPlace(o.pro) : "", rateText(o.rate_cents, o.rate_kind)]
                          .filter(Boolean)
                          .join(" · ")}
                      </p>
                    </div>
                    <span className="shrink-0 text-[10.5px] uppercase tracking-[0.12em] text-ink-soft">
                      {OFFER_STATUS[o.status] ?? o.status}
                    </span>
                  </div>
                  {o.message && (
                    <p className="mt-2 text-[12.5px] leading-relaxed text-ink">{o.message}</p>
                  )}
                  {o.status === "sent" && request.status === "open" && (
                    <div className="mt-3 flex gap-2">
                      <button
                        type="button"
                        disabled={answer.isPending}
                        onClick={() => answer.mutate({ offerId: o.id, status: "accepted" })}
                        className="tap-scale inline-flex rounded-full bg-primary px-4 py-2 text-[12.5px] text-primary-foreground disabled:opacity-60"
                      >
                        Hire them
                      </button>
                      <button
                        type="button"
                        disabled={answer.isPending}
                        onClick={() => answer.mutate({ offerId: o.id, status: "declined" })}
                        className="tap-scale inline-flex rounded-full border border-border bg-card px-4 py-2 text-[12.5px] text-ink disabled:opacity-60"
                      >
                        Not this time
                      </button>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </section>

          <section className="rounded-2xl border border-border bg-card p-4 shadow-soft">
            <h2 className="mb-2 text-[11px] uppercase tracking-[0.18em] text-ink-soft">
              Who fits this ask
            </h2>
            <p className={muted}>
              People working this lane, closest fit first. This order is only about your ask — nobody
              can pay to sit higher.
            </p>
            <div className="mt-3 space-y-2">
              {(matches.data ?? []).map(m => (
                <Link
                  key={m.pro.id}
                  to="/pro/$slug"
                  params={{ slug: m.pro.slug }}
                  className="block rounded-xl border border-border bg-paper p-3"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="font-serif text-[15.5px] leading-tight text-ink">
                        {m.pro.display_name}
                      </p>
                      <p className="mt-0.5 text-[11.5px] text-ink-soft">
                        {[proPlace(m.pro), rateText(m.rate.rate_cents, m.rate.rate_kind)]
                          .filter(Boolean)
                          .join(" · ")}
                      </p>
                    </div>
                    {m.pro.id_verified_at && (
                      <BadgeCheck className="mt-0.5 h-4 w-4 shrink-0 text-brass" />
                    )}
                  </div>
                  {!!m.reasons.length && (
                    <p className="mt-1.5 text-[11.5px] text-ink-soft">{m.reasons.join(" · ")}</p>
                  )}
                </Link>
              ))}
              {matches.data?.length === 0 && (
                <p className={muted}>Nobody works this lane yet. We'll show your ask as soon as someone does.</p>
              )}
            </div>
          </section>

          {request.status !== "closed" && (
            <section className="rounded-2xl border border-border bg-card p-4 shadow-soft">
              <h2 className="mb-2 text-[11px] uppercase tracking-[0.18em] text-ink-soft">
                When it's over
              </h2>
              <div className="flex gap-2">
                <button
                  type="button"
                  disabled={close.isPending}
                  onClick={() => close.mutate("completed")}
                  className="tap-scale inline-flex rounded-full bg-primary px-4 py-2 text-[12.5px] text-primary-foreground disabled:opacity-60"
                >
                  The work's done
                </button>
                <button
                  type="button"
                  disabled={close.isPending}
                  onClick={() => close.mutate("closed")}
                  className="tap-scale inline-flex rounded-full border border-border bg-card px-4 py-2 text-[12.5px] text-ink disabled:opacity-60"
                >
                  Take it down
                </button>
              </div>
            </section>
          )}
        </>
      )}

      {!mine && (
        <p className={muted}>
          You're seeing this because you work this lane. Send your offer from your leads screen.
        </p>
      )}
    </Shell>
  );
}

const muted = "text-[13px] leading-relaxed text-ink-soft";

function Shell({ children }: { children: React.ReactNode }) {
  return (
    <div className="pb-16">
      <div className="px-4 pt-3">
        <Link to="/hire" search={{ lane: undefined }} className="inline-flex items-center gap-1 text-[13px] text-ink-soft">
          <ArrowLeft className="h-4 w-4" /> Ask for help
        </Link>
      </div>
      <header className="mb-5 px-5 pt-3">
        <p className="text-[11px] uppercase tracking-[0.22em] text-brass">Your ask</p>
        <h1 className="mt-2 font-serif text-[28px] leading-tight text-ink">Offers</h1>
      </header>
      <div className="space-y-4 px-4">{children}</div>
    </div>
  );
}
