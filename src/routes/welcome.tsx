import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useState } from "react";
import { ArrowRight, ArrowLeft, Heart, Sun, Users, HandHeart, Check } from "lucide-react";
import { BRAND } from "@/config/brand";
import { APP_ICON } from "@/config/appIcon";
import { BrandMark } from "@/components/BrandMark";
import { usePrefs } from "@/hooks/usePrefs";
import { useSession } from "@/hooks/useSession";

export const Route = createFileRoute("/welcome")({
  staticData: { sitemap: false },
  component: Welcome,
  head: () => ({
    meta: [
      { title: `Welcome to ${BRAND.name} — your first two minutes` },
      {
        name: "description",
        content:
          "Open the app, choose whether you want prayer in the language of it, see what's inside, then answer a short survey that shapes the whole thing around your season.",
      },
      { property: "og:title", content: `Welcome to ${BRAND.name}` },
      {
        property: "og:description",
        content: "Choose your language of care, see what's inside, and shape the app around your season.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
});

const STEPS = ["Open", "Your language", "What's inside", "Shape it"] as const;

const rooms = [
  {
    Icon: Heart,
    title: "Bring the ask",
    body: "Write it plainly, or record it if you'd rather say it out loud. You choose who ever sees it.",
  },
  {
    Icon: Sun,
    title: "Come back for the answer",
    body: "When something changes, mark it. The ask and the answer stay linked as one story.",
  },
  {
    Icon: Users,
    title: "Don't carry it alone",
    body: "Small groups, one steady friend, and rooms where being quiet is allowed.",
  },
  {
    Icon: HandHeart,
    title: "Give or show up",
    body: "Real projects near you, hours you can log, and gifts split evenly across good work.",
  },
];

function Welcome() {
  const navigate = useNavigate();
  const { update } = usePrefs();
  const { signedIn } = useSession();
  const [step, setStep] = useState(0);

  const choose = (faith: boolean) => {
    update({ faithBased: faith });
    setStep(2);
  };

  return (
    <div className="min-h-screen bg-ink text-paper">
      <div className="mx-auto flex min-h-screen max-w-md flex-col px-5 pb-10 pt-4">
        <header className="flex items-center justify-between">
          <button
            onClick={() => (step === 0 ? navigate({ to: "/" }) : setStep(step - 1))}
            className="text-paper/70 hover:text-paper"
            aria-label="Go back"
          >
            <ArrowLeft className="h-5 w-5" />
          </button>
          <p className="text-[11px] uppercase tracking-[0.22em] text-paper/60">{STEPS[step]}</p>
          <Link to="/" className="text-[11px] uppercase tracking-[0.2em] text-paper/50 hover:text-paper/80">
            Skip
          </Link>
        </header>

        <div className="mt-4 flex gap-1.5" aria-hidden>
          {STEPS.map((s, i) => (
            <span
              key={s}
              className={`h-[3px] flex-1 rounded-full transition-colors ${
                i <= step ? "bg-brass-light" : "bg-paper/15"
              }`}
            />
          ))}
        </div>

        <main className="mt-8 flex-1">
          {step === 0 && <OpenIt />}
          {step === 1 && <FaithQuestion onChoose={choose} />}
          {step === 2 && <Inside />}
          {step === 3 && <Ready />}
        </main>

        <footer className="mt-8">
          {step === 1 ? (
            <p className="text-center text-[11.5px] text-paper/45">
              Either answer is welcome. You can change it any time.
            </p>
          ) : step === 3 ? (
            <button
              onClick={() =>
                signedIn
                  ? navigate({ to: "/setup" })
                  : navigate({ to: "/login", search: { next: "/setup" } as never })
              }
              className="inline-flex w-full items-center justify-center gap-2 rounded-full bg-brass px-5 py-3.5 text-[13.5px] tracking-wide text-ink"
            >
              {signedIn ? "Start the survey" : "Create your account"}
              <ArrowRight className="h-4 w-4" />
            </button>
          ) : (
            <button
              onClick={() => setStep(step + 1)}
              className="inline-flex w-full items-center justify-center gap-2 rounded-full bg-brass px-5 py-3.5 text-[13.5px] tracking-wide text-ink"
            >
              {step === 0 ? "Open it" : "One last thing"}
              <ArrowRight className="h-4 w-4" />
            </button>
          )}
        </footer>
      </div>
    </div>
  );
}

/** The home-screen tile, then the splash — what the first tap actually looks like. */
function OpenIt() {
  return (
    <div className="text-center">
      <p className="text-[10px] uppercase tracking-[0.25em] text-brass-light">
        Just downloaded
      </p>
      <h1 className="mt-2 font-serif text-[26px] leading-tight text-paper">
        This is what {BRAND.name} looks like on your phone.
      </h1>

      <div className="mt-7 flex items-center justify-center gap-7">
        <div className="flex flex-col items-center">
          <img
            src={APP_ICON}
            alt={`${BRAND.name} app icon`}
            width={1024}
            height={1024}
            loading="lazy"
            className="h-[68px] w-[68px] rounded-[18px]"
          />
          <p className="mt-2 text-[11.5px] text-paper/75">{BRAND.shortName}</p>
        </div>
        <div className="w-[128px] overflow-hidden rounded-[24px] border border-paper/15 bg-ink">
          <div className="flex h-[186px] flex-col items-center justify-center gap-2.5 bg-gradient-to-b from-[oklch(0.20_0.03_255)] to-[oklch(0.11_0.02_260)]">
            <BrandMark className="h-[46px] w-[46px]" />
            <p className="font-serif text-[15px] text-paper">{BRAND.name}</p>
            <p className="px-4 text-[10px] leading-snug text-paper/55">{BRAND.tagline}</p>
          </div>
        </div>
      </div>


      <p className="mt-7 text-[14px] leading-relaxed text-paper/70">
        Tap it and you land here — one question, a short look around, then a
        survey that decides which rooms of the app open for you.
      </p>
    </div>
  );
}

function FaithQuestion({ onChoose }: { onChoose: (faith: boolean) => void }) {
  return (
    <div>
      <p className="text-[10px] uppercase tracking-[0.25em] text-brass-light">
        First question
      </p>
      <h2 className="mt-2 font-serif text-[25px] leading-tight text-paper">
        Do you want this to be faith-based?
      </h2>
      <p className="mt-2.5 text-[13.5px] leading-relaxed text-paper/70">
        Same app either way. This only decides the words it uses with you —
        whether you're bringing a prayer or bringing a hope.
      </p>

      <div className="mt-6 space-y-3">
        <button
          onClick={() => onChoose(true)}
          className="w-full rounded-2xl border border-brass/50 bg-brass/10 p-4 text-left transition-colors hover:bg-brass/15"
        >
          <p className="text-[15px] text-paper">Yes — keep it faith-based</p>
          <p className="mt-1 text-[12.5px] text-paper/60">
            Prayer, scripture, and answered-prayer language throughout.
          </p>
        </button>
        <button
          onClick={() => onChoose(false)}
          className="w-full rounded-2xl border border-paper/15 bg-paper/[0.04] p-4 text-left transition-colors hover:border-paper/30"
        >
          <p className="text-[15px] text-paper">No — keep it plain</p>
          <p className="mt-1 text-[12.5px] text-paper/60">
            The same care and the same people, without the religious wording.
          </p>
        </button>
      </div>
    </div>
  );
}

function Inside() {
  return (
    <div>
      <p className="text-[10px] uppercase tracking-[0.25em] text-brass-light">
        A quick look around
      </p>
      <h2 className="mt-2 font-serif text-[25px] leading-tight text-paper">
        Four things live here. That's all.
      </h2>
      <ul className="mt-5 space-y-3">
        {rooms.map(({ Icon, title, body }) => (
          <li
            key={title}
            className="flex gap-3 rounded-2xl border border-paper/10 bg-paper/[0.04] p-3.5"
          >
            <Icon className="mt-0.5 h-4 w-4 shrink-0 text-brass-light" />
            <div>
              <p className="text-[13.5px] text-paper">{title}</p>
              <p className="text-[12.5px] leading-relaxed text-paper/60">{body}</p>
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}

function Ready() {
  return (
    <div>
      <div className="flex items-center gap-1.5 text-[10px] uppercase tracking-[0.25em] text-brass-light">
        <Check className="h-3 w-3" /> Almost in
      </div>
      <h2 className="mt-2 font-serif text-[25px] leading-tight text-paper">
        Now the part that makes it yours.
      </h2>
      <p className="mt-2.5 text-[13.5px] leading-relaxed text-paper/70">
        First create your account so your answers are saved to you. Then a
        short survey about the season you're in, how you're wired, and where
        you'd want to help. Your answers decide which rooms open first — and you
        can retake it whenever the season changes.
      </p>
      <div className="mt-5 rounded-2xl border border-paper/10 bg-paper/[0.04] p-4">
        <p className="text-[12.5px] leading-relaxed text-paper/70">
          Nothing you answer is shared with anyone. It only shapes what you see.
        </p>
      </div>
      <p className="mt-4 text-[12px] text-paper/45">
        Rather look around first?{" "}
        <Link to="/" className="text-brass-light underline underline-offset-2">
          Skip into the app
        </Link>
      </p>
    </div>
  );
}
