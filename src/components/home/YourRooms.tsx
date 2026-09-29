import { Link } from "@tanstack/react-router";
import { Lock, HeartHandshake, HandCoins, Sliders, ArrowRight } from "lucide-react";
import { usePrefs } from "@/hooks/usePrefs";
import { hasFeature, SEASONS } from "@/data/personalize";
import { LANES, laneLine } from "@/data/giving";

/**
 * The personalized doorway. Nothing here is on by default — every card is the
 * result of an answer someone gave at the door, and can be turned back off.
 */
export function YourRooms() {
  const { prefs, ready } = usePrefs();

  if (!ready) return null;

  if (!prefs.done) {
    return (
      <Link
        to="/setup"
        className="tap-scale mt-4 flex items-start gap-3 rounded-2xl border border-brass/30 bg-brass/10 p-4"
      >
        <Sliders className="mt-0.5 h-4 w-4 shrink-0 text-brass" />
        <span className="min-w-0">
          <span className="block font-serif text-[15.5px] leading-tight text-ink">
            Shape this app to your season
          </span>
          <span className="mt-0.5 block text-[11.5px] leading-snug text-ink-soft">
            Five questions. They decide which rooms exist for you — including ones that stay
            closed until you ask.
          </span>
        </span>
        <ArrowRight className="ml-auto mt-1 h-3.5 w-3.5 shrink-0 text-brass" />
      </Link>
    );
  }

  const room = hasFeature(prefs, "room");
  const serve = hasFeature(prefs, "serve");
  const lane = LANES.find(l => l.key === prefs.lanes[0]);
  const season = SEASONS.find(s => s.key === prefs.seasons[0]);

  return (
    <section className="mt-5">
      <div className="flex items-baseline justify-between px-1">
        <h2 className="font-serif text-[13px] uppercase tracking-[0.18em] text-ink-soft">
          {prefs.firstName ? `${prefs.firstName}'s rooms` : "Your rooms"}
        </h2>
        <Link to="/setup" className="text-[11px] uppercase tracking-[0.14em] text-brass">
          Reshape
        </Link>
      </div>

      {season && (
        <p className="mt-1.5 px-1 text-[12px] italic text-ink-soft">
          You told us: "{season.door}" — so this is what's open.
        </p>
      )}

      <div className="mt-3 space-y-2">
        {room && (
          <Link
            to="/room"
            className="tap-scale flex items-start gap-3 rounded-2xl border border-flame/25 bg-card p-4 shadow-soft"
          >
            <Lock className="mt-0.5 h-4 w-4 shrink-0 text-flame" />
            <span className="min-w-0">
              <span className="block font-serif text-[15.5px] leading-tight text-ink">The Room</span>
              <span className="mt-0.5 block text-[11.5px] leading-snug text-ink-soft">
                Men, unedited. Confession with no advice allowed, a wingman, and one button for
                the worst hour of the night.
              </span>
            </span>
          </Link>
        )}

        {lane && (
          <Link
            to="/giving/$lane"
            params={{ lane: lane.key }}
            className="tap-scale flex items-start gap-3 rounded-2xl border border-border bg-card p-4 shadow-soft"
          >
            <HandCoins className="mt-0.5 h-4 w-4 shrink-0 text-brass" />
            <span className="min-w-0">
              <span className="block font-serif text-[15.5px] leading-tight text-ink">
                {lane.label}
              </span>
              <span className="mt-0.5 block text-[11.5px] leading-snug text-ink-soft">
                Your lane · {laneLine(lane, prefs.gender)}
              </span>
            </span>
          </Link>
        )}

        {serve && (
          <Link
            to="/serve"
            className="tap-scale flex items-start gap-3 rounded-2xl border border-border bg-card p-4 shadow-soft"
          >
            <HeartHandshake className="mt-0.5 h-4 w-4 shrink-0 text-hope" />
            <span className="min-w-0">
              <span className="block font-serif text-[15.5px] leading-tight text-ink">Serve</span>
              <span className="mt-0.5 block text-[11.5px] leading-snug text-ink-soft">
                Shifts with seats left, skills you already have, and nonprofits that need a back
                office more than a cheque.
              </span>
            </span>
          </Link>
        )}
      </div>
    </section>
  );
}
