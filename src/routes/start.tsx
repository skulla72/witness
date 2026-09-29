import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import {
  ArrowLeft,
  ArrowRight,
  Check,
  Copy,
  Heart,
  Lock,
  Users,
  Globe,
  Church,
  Sparkles,
  MessageSquare,
} from "lucide-react";
import { BRAND } from "@/config/brand";

export const Route = createFileRoute("/start")({
  staticData: { sitemap: false },
  component: StartPage,
  head: () => ({
    meta: [
      { title: `Get started with ${BRAND.name} — bring your first prayer` },
      {
        name: "description",
        content: `A guided first walk through ${BRAND.name}: write the ask you're carrying, choose who sees it, and invite one friend to carry it with you.`,
      },
      { property: "og:title", content: `Get started with ${BRAND.name}` },
      {
        property: "og:description",
        content: `Write your first ask, choose who sees it, and invite a friend to walk with you.`,
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
});

const categories = [
  "Health",
  "Family",
  "Provision",
  "Faith",
  "Relationships",
  "Work",
  "Grief",
  "Other",
] as const;

const privacy = [
  { id: "private", label: "Private", Icon: Lock, sub: "Just me" },
  { id: "circle", label: "Circle", Icon: Users, sub: "Trusted few" },
  { id: "church", label: "Church", Icon: Church, sub: "My group" },
  { id: "public", label: "Public", Icon: Globe, sub: "Anyone" },
] as const;

const STEPS = ["Welcome", "The ask", "Who sees it", "Invite a friend"] as const;

function StartPage() {
  const navigate = useNavigate();
  const [step, setStep] = useState(0);
  const [caption, setCaption] = useState("");
  const [category, setCategory] = useState<string>("Faith");
  const [priv, setPriv] = useState<string>("circle");

  useEffect(() => {
    try {
      localStorage.setItem("witness.startedTour", "1");
    } catch {
      /* storage unavailable */
    }
  }, []);

  const canAdvance = step !== 1 || caption.trim().length > 3;

  return (
    <div className="min-h-screen bg-ink text-paper">
      <div className="mx-auto flex min-h-screen max-w-md flex-col px-5 pb-10 pt-4">
        <header className="flex items-center justify-between">
          <button
            onClick={() => (step === 0 ? navigate({ to: "/tour" }) : setStep(step - 1))}
            className="text-paper/70 hover:text-paper"
            aria-label="Go back"
          >
            <ArrowLeft className="h-5 w-5" />
          </button>
          <p className="text-[11px] uppercase tracking-[0.22em] text-paper/60">
            {STEPS[step]}
          </p>
          <Link
            to="/"
            className="text-[11px] uppercase tracking-[0.2em] text-paper/50 hover:text-paper/80"
          >
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

        <main className="mt-7 flex-1">
          {step === 0 && <Welcome />}
          {step === 1 && (
            <TheAsk
              caption={caption}
              setCaption={setCaption}
              category={category}
              setCategory={setCategory}
            />
          )}
          {step === 2 && (
            <WhoSees priv={priv} setPriv={setPriv} caption={caption} category={category} />
          )}
          {step === 3 && <InviteFriend />}
        </main>

        <footer className="mt-8">
          {step < 3 ? (
            <button
              disabled={!canAdvance}
              onClick={() => setStep(step + 1)}
              className="inline-flex w-full items-center justify-center gap-2 rounded-full bg-brass px-5 py-3.5 text-[13.5px] tracking-wide text-ink disabled:cursor-not-allowed disabled:opacity-35"
            >
              {step === 0 ? "Begin" : step === 1 ? "Choose who sees it" : "Invite a friend"}
              <ArrowRight className="h-4 w-4" />
            </button>
          ) : (
            <Link
              to="/"
              className="inline-flex w-full items-center justify-center gap-2 rounded-full bg-brass px-5 py-3.5 text-[13.5px] tracking-wide text-ink"
            >
              Enter {BRAND.name}
              <ArrowRight className="h-4 w-4" />
            </Link>
          )}
          {step === 1 && (
            <p className="mt-3 text-center text-[11.5px] text-paper/45">
              Prefer to say it out loud?{" "}
              <Link to="/record" className="text-brass-light underline underline-offset-2">
                Record it on video instead
              </Link>
            </p>
          )}
        </footer>
      </div>
    </div>
  );
}

function Welcome() {
  return (
    <div>
      <div className="flex items-center gap-1.5 text-[10px] uppercase tracking-[0.25em] text-brass-light">
        <Sparkles className="h-3 w-3" /> Your first walk
      </div>
      <h1 className="mt-2 font-serif text-[28px] leading-tight text-paper">
        Let's bring one thing you're carrying.
      </h1>
      <p className="mt-3 text-[14px] leading-relaxed text-paper/70">
        {BRAND.name} works best when it starts small. In the next two minutes
        you'll write one honest ask, decide who's allowed to see it, and invite a
        single friend to carry it with you.
      </p>
      <ul className="mt-6 space-y-3">
        {[
          { Icon: Heart, t: "Write the ask", s: "A sentence is enough. No performance." },
          { Icon: Lock, t: "Choose who sees it", s: "Private, your circle, your church, or open." },
          { Icon: Users, t: "Invite one friend", s: "A prayer carried by two is a different weight." },
        ].map(({ Icon, t, s }) => (
          <li key={t} className="flex gap-3 rounded-2xl border border-paper/10 bg-paper/[0.04] p-3.5">
            <Icon className="mt-0.5 h-4 w-4 shrink-0 text-brass-light" />
            <div>
              <p className="text-[13.5px] text-paper">{t}</p>
              <p className="text-[12.5px] text-paper/55">{s}</p>
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}

function TheAsk({
  caption,
  setCaption,
  category,
  setCategory,
}: {
  caption: string;
  setCaption: (v: string) => void;
  category: string;
  setCategory: (v: string) => void;
}) {
  return (
    <div>
      <h2 className="font-serif text-[24px] leading-tight text-paper">
        What are you asking for?
      </h2>
      <p className="mt-1.5 text-[13px] text-paper/60">
        Say it plainly. You can always come back and mark it answered.
      </p>

      <textarea
        value={caption}
        onChange={(e) => setCaption(e.target.value.slice(0, 280))}
        rows={5}
        autoFocus
        placeholder="Lord, my mom's scan is on Thursday and I'm scared…"
        className="mt-4 w-full resize-none rounded-2xl border border-paper/15 bg-paper/[0.05] p-4 font-serif text-[16px] leading-relaxed text-paper placeholder:text-paper/30 focus:border-brass-light focus:outline-none"
      />
      <p className="mt-1 text-right text-[11px] text-paper/40">{caption.length}/280</p>

      <p className="mt-5 text-[11px] uppercase tracking-[0.22em] text-paper/50">
        What is it about?
      </p>
      <div className="mt-2.5 flex flex-wrap gap-2">
        {categories.map((c) => (
          <button
            key={c}
            onClick={() => setCategory(c)}
            className={`rounded-full border px-3.5 py-1.5 text-[12.5px] transition-colors ${
              category === c
                ? "border-brass bg-brass text-ink"
                : "border-paper/15 bg-paper/5 text-paper/80 hover:border-paper/30"
            }`}
          >
            {c}
          </button>
        ))}
      </div>
    </div>
  );
}

function WhoSees({
  priv,
  setPriv,
  caption,
  category,
}: {
  priv: string;
  setPriv: (v: string) => void;
  caption: string;
  category: string;
}) {
  return (
    <div>
      <h2 className="font-serif text-[24px] leading-tight text-paper">
        Who gets to carry this?
      </h2>
      <p className="mt-1.5 text-[13px] text-paper/60">
        You can change this later. Nothing is ever public by accident.
      </p>

      <div className="mt-4 grid grid-cols-2 gap-2.5">
        {privacy.map(({ id, label, Icon, sub }) => (
          <button
            key={id}
            onClick={() => setPriv(id)}
            className={`rounded-2xl border p-3.5 text-left transition-colors ${
              priv === id
                ? "border-brass bg-brass/15"
                : "border-paper/12 bg-paper/[0.04] hover:border-paper/25"
            }`}
          >
            <Icon
              className={`h-4 w-4 ${priv === id ? "text-brass-light" : "text-paper/60"}`}
            />
            <p className="mt-2 text-[13.5px] text-paper">{label}</p>
            <p className="text-[12px] text-paper/55">{sub}</p>
          </button>
        ))}
      </div>

      <div className="mt-6 rounded-2xl border border-paper/10 bg-paper/[0.04] p-4">
        <p className="text-[10px] uppercase tracking-[0.25em] text-brass-light">
          How it will look
        </p>
        <p className="mt-2 font-serif text-[16px] leading-relaxed text-paper">
          {caption.trim() || "Your ask will appear here."}
        </p>
        <p className="mt-3 text-[11.5px] uppercase tracking-[0.18em] text-paper/45">
          {category} · {privacy.find((p) => p.id === priv)?.label}
        </p>
      </div>
    </div>
  );
}

function InviteFriend() {
  const [copied, setCopied] = useState(false);
  const [origin, setOrigin] = useState("");

  useEffect(() => {
    setOrigin(window.location.origin);
  }, []);

  const inviteUrl = `${origin || ""}/tour`;
  const message = `I just brought my first prayer on ${BRAND.name} — it's a quiet place to ask for something and come back to mark it answered. Will you carry one with me? ${inviteUrl}`;

  const copy = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
    } catch {
      const el = document.createElement("textarea");
      el.value = text;
      document.body.appendChild(el);
      el.select();
      document.execCommand("copy");
      document.body.removeChild(el);
    }
    setCopied(true);
    setTimeout(() => setCopied(false), 2200);
  };

  const share = async () => {
    if (typeof navigator !== "undefined" && navigator.share) {
      try {
        await navigator.share({ title: BRAND.name, text: message, url: inviteUrl });
        return;
      } catch {
        /* user dismissed — fall through to copy */
      }
    }
    copy(message);
  };

  return (
    <div>
      <div className="flex items-center gap-1.5 text-[10px] uppercase tracking-[0.25em] text-brass-light">
        <Check className="h-3 w-3" /> Your ask is ready
      </div>
      <h2 className="mt-2 font-serif text-[24px] leading-tight text-paper">
        Now ask one person to carry it with you.
      </h2>
      <p className="mt-1.5 text-[13px] leading-relaxed text-paper/65">
        Not a follower list. One friend. They'll see the walkthrough first, so
        they know what they're stepping into.
      </p>

      <div className="mt-5 rounded-2xl border border-paper/12 bg-paper/[0.04] p-4">
        <p className="text-[13px] leading-relaxed text-paper/80">{message}</p>
      </div>

      <div className="mt-4 space-y-2.5">
        <button
          onClick={share}
          className="inline-flex w-full items-center justify-center gap-2 rounded-full border border-brass/50 bg-brass/10 px-5 py-3 text-[13px] tracking-wide text-brass-light"
        >
          <MessageSquare className="h-4 w-4" />
          Send the invite
        </button>
        <button
          onClick={() => copy(inviteUrl)}
          className="inline-flex w-full items-center justify-center gap-2 rounded-full border border-paper/15 px-5 py-3 text-[12.5px] uppercase tracking-[0.18em] text-paper/70 hover:text-paper"
        >
          {copied ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
          {copied ? "Copied" : "Copy invite link"}
        </button>
      </div>
    </div>
  );
}
