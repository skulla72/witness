import { Link } from "@tanstack/react-router";
import { ArrowRight, Mic, Flame, HeartHandshake, Quote } from "lucide-react";
import { BRAND } from "@/config/brand";
import { BrandMark } from "@/components/BrandMark";

/**
 * The front door. Nothing of the community is visible here — only the promise,
 * a slow candlelit film, and the two doors: sign in or begin.
 */
export function Landing() {
  return (
    <div className="relative min-h-screen overflow-hidden bg-ink text-paper">
      {/* Candlelight drifting behind everything */}
      <div aria-hidden className="pointer-events-none absolute inset-0">
        <div className="drift absolute -left-24 top-10 h-72 w-72 rounded-full bg-brass/25 blur-[90px]" />
        <div
          className="drift absolute -right-20 top-1/3 h-80 w-80 rounded-full bg-flame/20 blur-[110px]"
          style={{ animationDelay: "-5s" }}
        />
        <div
          className="drift absolute bottom-0 left-1/4 h-72 w-72 rounded-full bg-hope/15 blur-[100px]"
          style={{ animationDelay: "-9s" }}
        />
        <div className="absolute inset-0 bg-gradient-to-b from-transparent via-ink/40 to-ink" />
      </div>

      <div className="relative mx-auto flex min-h-screen max-w-md flex-col px-6 pb-10 pt-8 md:max-w-3xl md:px-10 md:pt-10 lg:max-w-5xl">
        <header className="film-in flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <BrandMark />
            <span className="font-serif text-[19px] tracking-tight text-paper">
              {BRAND.name}
            </span>
          </div>
          <Link
            to="/login"
            className="rounded-full border border-paper/20 px-4 py-1.5 text-[12px] tracking-wide text-paper/85 transition-colors hover:border-paper/45"
          >
            Sign in
          </Link>
        </header>

        <main className="flex flex-1 flex-col justify-center py-14 md:max-w-2xl md:py-20">
          <div className="film-in" style={{ animationDelay: "0.15s" }}>
            <span className="inline-flex items-center gap-1.5 text-[10px] uppercase tracking-[0.28em] text-brass-light">
              <span className="flicker inline-block h-1.5 w-1.5 rounded-full bg-flame" />
              A quiet place
            </span>
          </div>

          <h1
             className="film-in mt-4 font-serif text-[38px] leading-[1.08] tracking-tight text-paper md:text-[54px] lg:text-[64px]"
            style={{ animationDelay: "0.35s" }}
          >
            Say the thing
            <span className="block text-paper/55">you can't say anywhere else.</span>
          </h1>

          <p
            className="film-in mt-5 text-[15px] leading-relaxed text-paper/70"
            style={{ animationDelay: "0.6s" }}
          >
            {BRAND.mission}
          </p>

          <div className="film-in mt-9 space-y-2.5 md:grid md:max-w-xl md:grid-cols-2 md:gap-3 md:space-y-0" style={{ animationDelay: "0.85s" }}>
            <Link
              to="/login"
              search={{ mode: "signup", next: "/get-started" } as never}
              className="tap-scale flex w-full items-center justify-center gap-2 rounded-full bg-brass px-6 py-4 text-[14px] tracking-wide text-ink"
            >
              Create your account
              <ArrowRight className="h-4 w-4" />
            </Link>
            <Link
              to="/login"
              className="tap-scale flex w-full items-center justify-center rounded-full border border-paper/20 px-6 py-4 text-[13.5px] tracking-wide text-paper/85"
            >
              I already have one
            </Link>
          </div>

          <ul
            className="film-in mt-10 space-y-3.5"
            style={{ animationDelay: "1.1s" }}
          >
            {[
              { Icon: Mic, t: "Bring what you're carrying", s: "Write it, or say it out loud in your own voice." },
              { Icon: Flame, t: "Someone carries it with you", s: "Real people, no audience, no counting." },
              { Icon: HeartHandshake, t: "Come back when it turns", s: "The ask and the answer stay linked forever." },
            ].map(({ Icon, t, s }) => (
              <li key={t} className="flex gap-3">
                <span className="mt-0.5 grid h-7 w-7 shrink-0 place-items-center rounded-full border border-paper/15 bg-paper/[0.06]">
                  <Icon className="h-3.5 w-3.5 text-brass-light" strokeWidth={1.8} />
                </span>
                <div>
                  <p className="text-[13.5px] text-paper">{t}</p>
                  <p className="text-[12.5px] leading-relaxed text-paper/55">{s}</p>
                </div>
              </li>
            ))}
          </ul>

          <Link
            to="/testimonials"
            className="film-in mt-9 flex items-center gap-3 border-y border-paper/15 py-4"
            style={{ animationDelay: "1.25s" }}
          >
            <Quote className="h-5 w-5 shrink-0 text-brass-light" strokeWidth={1.6} />
            <span className="min-w-0 flex-1">
              <span className="block text-[13.5px] text-paper">See what Witness is making possible</span>
              <span className="mt-0.5 block text-[11.5px] leading-relaxed text-paper/50">Stories from churches and professionals who found one another here.</span>
            </span>
            <ArrowRight className="h-4 w-4 shrink-0 text-paper/55" />
          </Link>
        </main>

        <footer
          className="film-in space-y-3 text-center"
          style={{ animationDelay: "1.35s" }}
        >
          <p className="font-serif text-[15px] italic text-paper/60">
            {BRAND.tagline}
          </p>
          <p className="text-[12px] text-paper/60">
            <Link to="/campaign" className="underline underline-offset-4">Watch the films</Link>
            {" · "}
            <Link to="/spotlight" className="underline underline-offset-4">Spotlight of the Week</Link>
          </p>
          <p className="text-[11px] text-paper/40">
            <Link to="/terms" className="underline underline-offset-4">Terms</Link>
            {" · "}
            <Link to="/privacy" className="underline underline-offset-4">Privacy</Link>
            {" · "}
            <Link to="/crisis" className="underline underline-offset-4">Need help now?</Link>
          </p>
        </footer>
      </div>
    </div>
  );
}
