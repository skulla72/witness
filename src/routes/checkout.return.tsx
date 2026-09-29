import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { CheckCircle2, ArrowRight, Gift, HandCoins } from "lucide-react";
import { BRAND } from "@/config/brand";
import { useSession } from "@/hooks/useSession";

const UUID = /^[0-9a-fA-F-]{36}$/;

export const Route = createFileRoute("/checkout/return")({
  staticData: { sitemap: false },
  validateSearch: (search: Record<string, unknown>): { session_id?: string; kind?: string; need?: string } => ({
    session_id: typeof search['session_id'] === "string" ? search['session_id'] : undefined,
    kind: search['kind'] === "gift" ? "gift" : undefined,
    need: typeof search['need'] === "string" && UUID.test(search['need']) ? search['need'] : undefined,
  }),
  head: () => ({
    meta: [
      { title: `Thank you · ${BRAND.name}` },
      { name: "description", content: "Your order is in. Thanks for backing this community." },
      { property: "og:title", content: `Thank you · ${BRAND.name}` },
      { property: "og:description", content: "Your order is in." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: CheckoutReturn,
});

function CheckoutReturn() {
  const { session_id: sessionId, kind, need } = Route.useSearch();
  const gift = kind === "gift";
  const { signedIn } = useSession();
  const qc = useQueryClient();

  // The amount raised is recalculated the moment the payment clears, so drop the
  // old numbers here — the bar shows the new total as soon as they look.
  useEffect(() => {
    if (!sessionId) return;
    void qc.invalidateQueries({ queryKey: ["need"] });
    void qc.invalidateQueries({ queryKey: ["needs"] });
    void qc.invalidateQueries({ queryKey: ["job-fund"] });
  }, [qc, sessionId]);

  return (
    <div className="px-4 pb-16 pt-10">
      <div className="mx-auto max-w-sm rounded-2xl border border-border bg-card p-6 text-center shadow-soft rise-in">
        {sessionId ? (
          <>
            <CheckCircle2 className="mx-auto h-9 w-9 text-hope" />
            <h1 className="mt-3 font-serif text-[22px] text-ink">
              {gift ? "Gift received" : "Order placed"}
            </h1>
            <p className="mt-2 text-[13px] leading-relaxed text-ink-soft">
              {gift
                ? need
                  ? "Your receipt is on its way by email. Your gift counts toward this need — the amount raised includes it as soon as the payment clears."
                  : "Your receipt is on its way by email. The gift is designated to that nonprofit and shows up on their giving page straight away."
                : "Your receipt is on its way by email. The organization gets the order straight away and ships from their own stock."}
            </p>
            {need && (
              <Link
                to="/needs/$id"
                params={{ id: need }}
                className="tap-scale mt-5 flex items-center justify-center gap-2 rounded-xl bg-ink py-2.5 text-[13.5px] font-medium text-paper"
              >
                <HandCoins className="h-4 w-4" /> See how far it's come
              </Link>
            )}
            {gift && signedIn && (
              <Link
                to="/perks"
                className="tap-scale mt-3 flex items-center gap-3 rounded-2xl border border-brass/40 bg-gradient-to-br from-brass/15 to-card p-3.5 text-left"
              >
                <span className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-brass/20"><Gift className="h-4 w-4 text-brass-deep" /></span>
                <span className="min-w-0 flex-1">
                  <span className="block font-serif text-[14.5px] leading-tight text-ink">Choose your thank-you gift</span>
                  <span className="mt-0.5 block text-[11px] leading-snug text-ink-soft">If this gift carried you to a new rung, a gift is waiting — or send it back to the mission.</span>
                </span>
                <ArrowRight className="h-4 w-4 shrink-0 text-ink-soft" />
              </Link>
            )}
          </>
        ) : (
          <>
            <h1 className="font-serif text-[22px] text-ink">Nothing to show</h1>
            <p className="mt-2 text-[13px] text-ink-soft">
              We don't have {gift ? "a gift" : "an order"} to look up here.
            </p>
          </>
        )}
        <Link
          to="/community"
          className="tap-scale mt-6 inline-flex items-center gap-1.5 rounded-full bg-ink px-4 py-2 text-[13px] font-medium text-paper"
        >
          Back to community <ArrowRight className="h-4 w-4" />
        </Link>
      </div>
    </div>
  );
}
