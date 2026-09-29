import { createFileRoute, Link } from "@tanstack/react-router";
import { Phone, ArrowLeft, HeartHandshake, MessageCircle } from "lucide-react";
import { BRAND } from "@/config/brand";
import { CRISIS_RESOURCES, CRISIS_CHAT } from "@/lib/crisis";


export const Route = createFileRoute("/crisis")({
  staticData: { sitemap: true },
  component: CrisisPage,
  head: () => ({
    meta: [
      { title: `Get help right now · ${BRAND.name}` },
      {
        name: "description",
        content:
          "Free, confidential crisis lines that answer 24 hours a day, plus what to do if you or someone you love is in immediate danger.",
      },
      { property: "og:title", content: `Get help right now · ${BRAND.name}` },
      {
        property: "og:description",
        content: "Free, confidential crisis lines that answer 24 hours a day.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
});

function CrisisPage() {
  return (
    <div className="min-h-screen bg-paper paper-grain px-5 py-8">
      <div className="mx-auto max-w-md">
        <Link to="/" className="inline-flex items-center gap-2 text-[12px] text-ink-soft">
          <ArrowLeft className="h-4 w-4" /> Back
        </Link>

        <div className="mt-5 flex items-center gap-2 text-[10px] uppercase tracking-[0.25em] text-brass">
          <HeartHandshake className="h-3.5 w-3.5" /> You are not alone
        </div>
        <h1 className="mt-2 font-serif text-[28px] leading-tight text-ink">
          Please talk to someone right now.
        </h1>
        <p className="mt-3 text-[14px] leading-relaxed text-ink-soft">
          {BRAND.name} is a place to be carried, but it is not a crisis service and no one
          here is watching every hour. The people below answer immediately, for free, and
          you do not have to be in danger to call them.
        </p>

        <div className="mt-6 rounded-2xl border-2 border-brass bg-card p-4 shadow-soft">

          <div className="flex items-center gap-2 text-[10px] uppercase tracking-[0.25em] text-brass">
            <MessageCircle className="h-3.5 w-3.5" /> Talk to someone now
          </div>
          <p className="mt-2 text-[15px] text-ink">{CRISIS_CHAT.name}</p>
          <p className="mt-1 text-[13px] leading-relaxed text-ink-soft">
            {CRISIS_CHAT.detail}
          </p>
          <a
            href={CRISIS_CHAT.href}
            target="_blank"
            rel="noreferrer"
            className="mt-3 flex w-full items-center justify-center gap-2 rounded-full bg-brass px-4 py-3 text-[14px] tracking-wide text-ink"
          >
            <MessageCircle className="h-4 w-4" />
            {CRISIS_CHAT.action}
          </a>
          <a
            href="tel:988"
            className="mt-2.5 flex w-full items-center justify-center gap-2 rounded-full border border-brass px-4 py-3 text-[14px] tracking-wide text-ink"
          >
            <Phone className="h-4 w-4" />
            Call 988 instead
          </a>
          <a
            href={CRISIS_CHAT.textFallback.href}
            className="mt-3 inline-block text-[12.5px] text-ink-soft underline underline-offset-4"
          >
            {CRISIS_CHAT.textFallback.action}
          </a>
          <p className="mt-2 text-[12px] leading-relaxed text-ink-soft">
            Answered 24 hours a day, every day, by the 988 Suicide &amp; Crisis Lifeline's
            trained counselors — not {BRAND.name} staff, and never a bot.
          </p>
        </div>

        <ul className="mt-6 space-y-3">
          {CRISIS_RESOURCES.map(r => (

            <li key={r.name} className="rounded-2xl border border-border bg-card p-4 shadow-soft">
              <p className="text-[14px] text-ink">{r.name}</p>
              <p className="mt-1 text-[13px] leading-relaxed text-ink-soft">{r.detail}</p>
              <a
                href={r.href}
                target={r.href.startsWith("http") ? "_blank" : undefined}
                rel={r.href.startsWith("http") ? "noreferrer" : undefined}
                className="mt-3 inline-flex items-center gap-2 rounded-full bg-brass px-4 py-2 text-[12.5px] tracking-wide text-ink"
              >
                <Phone className="h-3.5 w-3.5" />
                {r.action}
              </a>
            </li>
          ))}
        </ul>

        <div className="mt-7 rounded-2xl border border-border bg-card p-4">
          <p className="text-[13px] leading-relaxed text-ink-soft">
            If it helps, tell one person you trust today — a friend, a pastor, a doctor.
            You can still post your ask here afterwards, and people will pray for it.
          </p>
          <div className="mt-3 flex gap-3 text-[12.5px]">
            <Link to="/record" className="text-brass underline underline-offset-4">
              Write my ask
            </Link>
            <Link to="/help" className="text-ink-soft underline underline-offset-4">
              Other kinds of help
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
