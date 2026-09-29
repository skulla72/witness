import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { ArrowRight, Play, Film, Church } from "lucide-react";
import { BRAND } from "@/config/brand";
import { BrandMark } from "@/components/BrandMark";
import { useSession } from "@/hooks/useSession";
import { SERVING_LANES } from "@/data/serving-lanes";
import { saveChurchDraft } from "@/lib/churchSignup";
import campaignFilm from "@/assets/campaign-film.mp4.asset.json";
import campaignPoster from "@/assets/campaign-film-poster.jpg";

export const Route = createFileRoute("/campaign")({
  staticData: { sitemap: true },
  component: CampaignPage,
  head: () => ({
    meta: [
      { title: `The ${BRAND.name} film — bring the ask, witness the answer` },
      {
        name: "description",
        content: `A short film about ${BRAND.name}: the ask you can't say anywhere else, the people who carry it with you, and the answer you come back to mark.`,
      },
      { property: "og:title", content: `The ${BRAND.name} film` },
      {
        property: "og:description",
        content: "Two quiet minutes — the story of what happens here.",
      },
      { property: "og:type", content: "video.other" },
      { property: "og:url", content: "https://witnessmovement.com/campaign" },
      { property: "og:image", content: "https://witnessmovement.com/share-witness.jpg" },
      { name: "twitter:card", content: "summary_large_image" },
      { name: "twitter:image", content: "https://witnessmovement.com/share-witness.jpg" },
    ],
    links: [{ rel: "canonical", href: "https://witnessmovement.com/campaign" }],
  }),
});

function CampaignPage() {
  return (
    <div className="relative min-h-screen overflow-hidden bg-ink text-paper">
      {/* The same candlelight that drifts behind the front door */}
      <div aria-hidden className="pointer-events-none absolute inset-0">
        <div className="drift absolute -left-24 top-10 h-72 w-72 rounded-full bg-brass/25 blur-[90px]" />
        <div
          className="drift absolute -right-20 top-1/3 h-80 w-80 rounded-full bg-flame/20 blur-[110px]"
          style={{ animationDelay: "-5s" }}
        />
        <div className="absolute inset-0 bg-gradient-to-b from-transparent via-ink/40 to-ink" />
      </div>

      <div className="relative mx-auto flex min-h-screen max-w-md flex-col px-5 pb-12 pt-8">
        <header className="film-in flex items-center justify-between">
          <Link to="/" className="flex items-center gap-2.5">
            <BrandMark />
            <span className="font-serif text-[19px] tracking-tight text-paper">{BRAND.name}</span>
          </Link>
          <Link
            to="/login"
            className="rounded-full border border-paper/20 px-4 py-1.5 text-[12px] tracking-wide text-paper/85 transition-colors hover:border-paper/45"
          >
            Sign in
          </Link>
        </header>

        <main className="flex-1 py-12">
          <div className="film-in" style={{ animationDelay: "0.15s" }}>
            <span className="inline-flex items-center gap-1.5 text-[10px] uppercase tracking-[0.28em] text-brass-light">
              <Film className="h-3 w-3" /> The film
            </span>
          </div>

          <h1
            className="film-in mt-4 font-serif text-[34px] leading-[1.1] tracking-tight text-paper"
            style={{ animationDelay: "0.3s" }}
          >
            Bring the ask.
            <span className="block text-paper/55">Witness the answer.</span>
          </h1>

          <p
            className="film-in mt-4 text-[14.5px] leading-relaxed text-paper/70"
            style={{ animationDelay: "0.5s" }}
          >
            Two quiet minutes about the ask, the waiting, and the answer.
          </p>

          {/* The player, with the mark sitting quietly in the corner */}
          <div
            className="film-in relative mt-6 overflow-hidden rounded-2xl border border-brass/25 bg-black shadow-lift"
            style={{ animationDelay: "0.65s" }}
          >
            <video
              src={campaignFilm.url}
              poster={campaignPoster}
              controls
              playsInline
              preload="metadata"
              className="w-full"
            />
            <span
              aria-hidden
              className="pointer-events-none absolute right-3 top-3 flex items-center gap-1.5 rounded-full bg-ink/55 px-2.5 py-1 backdrop-blur-[2px]"
            >
              <BrandMark className="h-4 w-4 brightness-0 invert" />
              <span className="font-serif text-[11px] tracking-tight text-paper/85">{BRAND.name}</span>
            </span>
          </div>

          <div className="mt-4 border-y border-paper/15 py-4">
            <p className="flex items-center gap-2 font-serif text-[17px] leading-tight text-paper">
              <Play className="h-3.5 w-3.5 shrink-0 text-brass-light" /> The long walk
            </p>
            <p className="mt-1 text-[13px] leading-relaxed text-paper/60">
              The ask, the waiting, and the answer — the way it really goes.
            </p>
          </div>

          <div className="film-in mt-8 space-y-2.5" style={{ animationDelay: "0.85s" }}>
            <Link
              to="/login"
              search={{ mode: "signup" }}
              className="tap-scale flex w-full items-center justify-center gap-2 rounded-full bg-brass px-6 py-4 text-[14px] tracking-wide text-ink"
            >
              Bring your ask
              <ArrowRight className="h-4 w-4" />
            </Link>
            <Link
              to="/"
              className="tap-scale flex w-full items-center justify-center rounded-full border border-paper/20 px-6 py-4 text-[13.5px] tracking-wide text-paper/85"
            >
              See what {BRAND.name} is
            </Link>
          </div>

          <p className="mt-4 text-center text-[11.5px] leading-relaxed text-paper/45">
            No likes, no leaderboards. Just the ask, and whoever carries it with you.
          </p>

          <ChurchSignup />
        </main>
      </div>
    </div>
  );
}

/**
 * A church watches the film and then has something to say: here's who we are,
 * here's what we need. We hold their words in their own browser, walk them
 * through making an account and a page, and land them on the need already
 * filled in — where the professionals who work that lane can answer it.
 */
function ChurchSignup() {
  const navigate = useNavigate();
  const { signedIn } = useSession();
  const [name, setName] = useState("");
  const [city, setCity] = useState("");
  const [region, setRegion] = useState("");
  const [lane, setLane] = useState(SERVING_LANES[0]!.key);
  const [need, setNeed] = useState("");

  const ready = name.trim().length > 1 && need.trim().length > 2;

  function start(e: React.FormEvent) {
    e.preventDefault();
    if (!ready) return;
    saveChurchDraft({
      name: name.trim(),
      city: city.trim(),
      region: region.trim(),
      lane,
      need: need.trim(),
    });
    if (signedIn === true) {
      navigate({ to: "/community/new" });
      return;
    }
    navigate({ to: "/login", search: { next: "/community/new" } });
  }

  const field =
    "mt-1.5 w-full rounded-xl border border-paper/20 bg-paper/5 px-3.5 py-3 text-[14px] text-paper placeholder:text-paper/35 outline-none focus:border-brass/60";

  return (
    <section className="film-in mt-14 rounded-3xl border border-brass/25 bg-paper/[0.04] p-5">
      <span className="inline-flex items-center gap-1.5 text-[10px] uppercase tracking-[0.28em] text-brass-light">
        <Church className="h-3 w-3" /> For churches
      </span>
      <h2 className="mt-3 font-serif text-[24px] leading-tight text-paper">
        Tell us what your church needs done
      </h2>
      <p className="mt-2 text-[13.5px] leading-relaxed text-paper/65">
        A roof, a furnace, a yard, a van, a meal for fifty. We put it in front of the professionals
        who work that trade near you, and they come back with what it would take. Nobody can be hired
        here before their identity check clears.
      </p>

      <form onSubmit={start} className="mt-5 space-y-3.5">
        <label className="block">
          <span className="text-[11.5px] uppercase tracking-[0.16em] text-paper/50">
            Church or ministry
          </span>
          <input
            value={name}
            onChange={e => setName(e.target.value)}
            placeholder="Grace Fellowship"
            className={field}
          />
        </label>

        <div className="grid grid-cols-2 gap-3">
          <label className="block">
            <span className="text-[11.5px] uppercase tracking-[0.16em] text-paper/50">City</span>
            <input
              value={city}
              onChange={e => setCity(e.target.value)}
              placeholder="Denver"
              className={field}
            />
          </label>
          <label className="block">
            <span className="text-[11.5px] uppercase tracking-[0.16em] text-paper/50">State</span>
            <input
              value={region}
              onChange={e => setRegion(e.target.value)}
              placeholder="CO"
              className={field}
            />
          </label>
        </div>

        <label className="block">
          <span className="text-[11.5px] uppercase tracking-[0.16em] text-paper/50">
            What kind of work
          </span>
          <select value={lane} onChange={e => setLane(e.target.value)} className={field}>
            {SERVING_LANES.map(l => (
              <option key={l.key} value={l.key} className="text-ink">
                {l.label}
              </option>
            ))}
          </select>
        </label>

        <label className="block">
          <span className="text-[11.5px] uppercase tracking-[0.16em] text-paper/50">
            The need, in a line
          </span>
          <input
            value={need}
            onChange={e => setNeed(e.target.value)}
            placeholder="The fellowship hall furnace quit"
            maxLength={120}
            className={field}
          />
        </label>

        <button
          type="submit"
          disabled={!ready}
          className="tap-scale flex w-full items-center justify-center gap-2 rounded-full bg-brass px-6 py-4 text-[14px] tracking-wide text-ink disabled:opacity-45"
        >
          {signedIn === true ? "Set up our church page" : "Start our church page"}
          <ArrowRight className="h-4 w-4" />
        </button>
        <p className="text-center text-[11.5px] leading-relaxed text-paper/45">
          {signedIn === true
            ? "Next: your church page, then the need — both already filled in."
            : "Next: a quick account, your church page, then the need — we keep what you typed."}
        </p>
      </form>
    </section>
  );
}
