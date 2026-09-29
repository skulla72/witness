import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { ArrowLeft, Flame, Lock, Users, Compass } from "lucide-react";
import { BRAND } from "@/config/brand";
import { usePrefs } from "@/hooks/usePrefs";
import { hasFeature } from "@/data/personalize";
import { NotOkayButton } from "@/components/mens/NotOkayButton";
import { ConfessionalRoom } from "@/components/mens/ConfessionalRoom";
import { WingmanCard } from "@/components/mens/WingmanCard";
import { FatherWoundTrack } from "@/components/mens/FatherWoundTrack";

export const Route = createFileRoute("/room")({
  staticData: { sitemap: false },
  component: Room,
  head: () => ({
    meta: [
      { title: `The Room — men, unedited · ${BRAND.name}` },
      {
        name: "description",
        content:
          "A separate inner circle for men: anonymous confession with no advice allowed, one wingman a week, a guided Father Wound track, and one button for the worst hour of the night.",
      },
      { property: "og:title", content: `The Room — men, unedited · ${BRAND.name}` },
      {
        property: "og:description",
        content: "Anonymity first. Witness before advice. One button for the worst hour of the night.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
});

type Tab = "tonight" | "confess" | "wingman" | "track";

function Room() {
  const { prefs, ready, update } = usePrefs();
  const [tab, setTab] = useState<Tab>("tonight");

  const opted = !ready || prefs.mensRoom || hasFeature(prefs, "room");

  const tabs: Array<{ key: Tab; label: string; show: boolean }> = [
    { key: "tonight", label: "Tonight", show: true },
    { key: "confess", label: "Confessional", show: !ready || hasFeature(prefs, "confessional") || prefs.mensRoom },
    { key: "wingman", label: "Wingman", show: !ready || hasFeature(prefs, "wingman") || prefs.mensRoom },
    { key: "track", label: "Father Wound", show: !ready || hasFeature(prefs, "fatherwound") || prefs.mensRoom },
  ];
  const visible = tabs.filter(t => t.show);

  return (
    <div className="px-4 pb-14 pt-3">
      <Link to="/" className="inline-flex items-center gap-1 text-[13px] text-ink-soft">
        <ArrowLeft className="h-4 w-4" /> Home
      </Link>

      <header className="px-1 pt-4">
        <p className="inline-flex items-center gap-1.5 text-[10px] uppercase tracking-[0.22em] text-brass">
          <Lock className="h-3 w-3" /> Separate from the rest of the app
        </p>
        <h1 className="mt-2 font-serif text-[30px] leading-tight text-ink">The Room</h1>
        <p className="mt-2 text-[13.5px] leading-relaxed text-ink-soft">
          Men, unedited. Nothing said in here appears in the feed, on your profile, or anywhere
          else. No advice is allowed. Nobody keeps score.
        </p>
      </header>

      {!opted && (
        <div className="mt-5 rounded-2xl border border-brass/30 bg-brass/10 p-5">
          <p className="font-serif text-[17px] leading-tight text-ink">You haven't opened this room yet.</p>
          <p className="mt-1.5 text-[12.5px] leading-snug text-ink-soft">
            It stays closed until you ask for it — that's on purpose.
          </p>
          <button
            onClick={() => update({ mensRoom: true })}
            className="tap-scale mt-3 w-full rounded-xl bg-ink py-3 text-[13.5px] text-paper"
          >
            Open the room
          </button>
        </div>
      )}

      <div className="no-scrollbar mt-5 -mx-1 flex gap-1 overflow-x-auto">
        {visible.map(t => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            className={`shrink-0 rounded-full border px-3.5 py-1.5 text-[12px] transition-colors ${
              tab === t.key ? "border-ink bg-ink text-paper" : "border-border bg-card text-ink-soft"
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {tab === "tonight" && (
        <section className="mt-5 space-y-3">
          <NotOkayButton />

          <div className="rounded-2xl border border-border bg-card p-5 shadow-soft">
            <p className="inline-flex items-center gap-1.5 text-[10px] uppercase tracking-[0.2em] text-brass">
              <Users className="h-3 w-3" /> In the room right now
            </p>
            <p className="mt-2 font-serif text-[20px] leading-tight text-ink">
              14 men are awake and reachable.
            </p>
            <p className="mt-1.5 text-[12.5px] leading-snug text-ink-soft">
              No names, no count of who prayed the most, no leaderboards. Just the fact that
              you're not the only one up.
            </p>
          </div>

          <div className="rounded-2xl border border-border bg-card p-5 shadow-soft">
            <p className="inline-flex items-center gap-1.5 text-[10px] uppercase tracking-[0.2em] text-brass">
              <Compass className="h-3 w-3" /> The rule of this room
            </p>
            <p className="mt-2 font-serif text-[19px] leading-tight text-ink">Witness before advice.</p>
            <p className="mt-1.5 text-[12.5px] leading-snug text-ink-soft">
              Most men bottle things up because the last time they opened up, somebody tried to
              fix them. Here nobody can. The tools don't exist.
            </p>
          </div>

          <Link
            to="/walk"
            className="tap-scale flex items-center gap-3 rounded-2xl border border-border bg-card p-4 shadow-soft"
          >
            <Flame className="h-4 w-4 shrink-0 text-flame" />
            <span className="min-w-0">
              <span className="block font-serif text-[15px] leading-tight text-ink">
                Take a seat at a men's table
              </span>
              <span className="mt-0.5 block text-[11.5px] text-ink-soft">
                Small, vetted, facilitated groups — faith-based and not
              </span>
            </span>
          </Link>
        </section>
      )}

      {tab === "confess" && <ConfessionalRoom />}
      {tab === "wingman" && <WingmanCard />}
      {tab === "track" && <FatherWoundTrack />}

      <p className="mx-auto mt-10 max-w-[280px] text-center text-[11.5px] italic text-ink-soft">
        This room has a ceiling, and it knows it. 988 is one tap away, always.
      </p>
    </div>
  );
}
