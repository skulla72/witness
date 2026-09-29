import { AmbientToggle } from "@/components/AmbientToggle";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { PrayerCard } from "@/components/PrayerCard";
import { BRAND } from "@/config/brand";
import { ShareTourButton } from "@/components/ShareTourButton";
import { CandleCard } from "@/components/home/CandleCard";
import { AskRail } from "@/components/home/AskRail";
import { PrayedForYou } from "@/components/home/PrayedForYou";
import { AnniversaryCard } from "@/components/home/MomentCards";
import { DailyThanks } from "@/components/home/DailyThanks";
import { VerseOfDay } from "@/components/home/VerseOfDay";
import { YourRooms } from "@/components/home/YourRooms";
import { usePrefs } from "@/hooks/usePrefs";
import { useSession } from "@/hooks/useSession";
import { loadHome } from "@/lib/home";
import { Landing } from "@/components/Landing";
import { deletePrayer } from "@/lib/prayers";
import { Sparkles, Sun, ArrowRight, Globe, BookOpen, Book, Mic, LogIn, BadgeCheck } from "lucide-react";
import { toneFor } from "@/lib/tone";

export const Route = createFileRoute("/")({
  staticData: { sitemap: true },
  component: Index,
  head: () => ({
    meta: [
      { title: `${BRAND.name} — ${BRAND.tagline}` },
      { name: "description", content: BRAND.mission },
      { property: "og:title", content: `${BRAND.name} — ${BRAND.tagline}` },
      { property: "og:description", content: BRAND.mission },
      { property: "og:type", content: "website" },
      { property: "og:url", content: "https://witnessmovement.com/" },
      { property: "og:image", content: "https://witnessmovement.com/share-witness.jpg" },
      { name: "twitter:card", content: "summary_large_image" },
      { name: "twitter:image", content: "https://witnessmovement.com/share-witness.jpg" },
    ],
    links: [{ rel: "canonical", href: "https://witnessmovement.com/" }],
  }),
});

const filters = ["All", "Open", "Answered", "Mine"] as const;

function greeting() {
  const h = new Date().getUTCHours();
  if (h < 11) return "Good morning";
  if (h < 17) return "Good afternoon";
  return "Tonight";
}

export const homeKey = (userId: string | null | undefined) => ["home", userId ?? "anon"] as const;

function Index() {
  const { signedIn } = useSession();
  // Visitors never see the community — only the front door.
  if (signedIn === false) return <Landing />;
  if (signedIn === undefined) return <Opening />;
  return <Feed />;
}

/** A held breath while we find out whether someone is signed in. */
function Opening() {
  return (
    <div className="grid min-h-[60vh] place-items-center">
      <span className="breathe h-2 w-2 rounded-full bg-brass" />
    </div>
  );
}

function Feed() {
  const [filter, setFilter] = useState<(typeof filters)[number]>("All");
  const { userId, signedIn } = useSession();
  const { prefs, ready: prefsReady } = usePrefs();
  const prayerVersion = prefsReady && prefs.faithBased !== false;
  const tone = toneFor(prefs);
  const qc = useQueryClient();
  const navigate = useNavigate();
  useEffect(() => {
    if (!userId) return;
    try {
      const pending = localStorage.getItem("witness.pendingJoin");
      if (pending) {
        localStorage.removeItem("witness.pendingJoin");
        navigate({ to: "/join/$slug", params: { slug: pending } });
      }
    } catch { /* ignore */ }
  }, [userId, navigate]);

  const home = useQuery({
    queryKey: homeKey(userId),
    queryFn: () => loadHome(userId ?? null),
    enabled: userId !== undefined,
    staleTime: 30_000,
  });
  const data = home.data;
  const refresh = () => qc.invalidateQueries({ queryKey: homeKey(userId) });

  const feed = useMemo(() => {
    const all = data?.feed ?? [];
    if (filter === "All") return all;
    if (filter === "Open") return all.filter(p => !p.answer);
    if (filter === "Answered") return all.filter(p => !!p.answer);
    return all.filter(p => p.user_id === userId);
  }, [data, filter, userId]);

  const answeredCount = (data?.feed ?? []).filter(p => !!p.answer).length;

  const remove = async (id: string) => {
    try {
      await deletePrayer(id);
      toast.success("Removed.");
      refresh();
    } catch {
      toast.error("Couldn't remove that.");
    }
  };

  return (
    <div className="px-4 pt-4 md:mx-auto md:max-w-2xl md:px-0 md:pt-8 lg:grid lg:max-w-5xl lg:grid-cols-[minmax(0,1fr)_300px] lg:items-start lg:gap-8">
      <div className="min-w-0">
      <header className="px-1">
        <div className="flex items-center justify-between gap-3">
          <h1 className="font-serif text-[26px] leading-tight text-ink">{greeting()}.</h1>
          <AmbientToggle />
        </div>
        <Link
          to={data?.queue.length ? "/prayer/$id" : "/record"}
          params={data?.queue.length ? { id: data.queue[0].id } : undefined}
          className="tap-scale mt-3 flex items-center gap-3 rounded-2xl bg-ink px-4 py-3.5 text-paper shadow-soft"
        >
          <Mic className="h-4 w-4 shrink-0 text-brass-light" />
          <span className="min-w-0 flex-1 text-[14px]">
            {data?.queue.length
              ? (prayerVersion ? "Someone is waiting — pray for them" : "Someone is waiting — stand with them")
              : `Share what you're carrying`}
          </span>
          <ArrowRight className="h-4 w-4 shrink-0" />
        </Link>
        {data && (data.prayingToday > 0 || data.answersThisWeek > 0) && (
          <p className="mt-2 inline-flex items-center gap-1.5 text-[12px] text-ink-soft">
            <span className="h-1.5 w-1.5 rounded-full bg-hope breathe" />
            {prayerVersion ? `${data.prayingToday} prayed today` : `${data.prayingToday} stood with someone today`} · {data.answersThisWeek} {data.answersThisWeek === 1 ? tone.answered : tone.answered === "answered" ? "answers" : "hopes came through"} this week
          </p>
        )}
      </header>

      {signedIn === false && (
        <Link to="/login" className="tap-scale mt-4 flex items-center gap-3 rounded-3xl border border-brass/40 bg-brass/10 p-4">
          <LogIn className="h-5 w-5 text-brass" />
          <div className="min-w-0">
            <p className="font-serif text-[16px] leading-tight text-ink">Sign in to see the community</p>
            <p className="mt-0.5 text-[12px] text-ink-soft">Prayers are shared only with members.</p>
          </div>
          <ArrowRight className="ml-auto h-4 w-4 text-brass" />
        </Link>
      )}

      {data && userId && (
        <div className="mt-4">
          <CandleCard streak={data.streak} target={data.queue[0]} userId={userId} onLit={refresh} />
        </div>
      )}

      <DailyThanks />
      {data && <PrayedForYou items={data.prayedForMe} total={data.prayedForMeCount} />}
      <div className="lg:hidden"><YourRooms /></div>
      {prayerVersion && <div className="lg:hidden"><VerseOfDay /></div>}
      {data && userId && <AskRail items={data.queue} />}
      {data && <AnniversaryCard stories={data.feed} userId={userId ?? null} />}

      <div className="mt-5 px-1">
        <p className="text-[10.5px] uppercase tracking-[0.2em] text-ink-soft">Explore</p>
        <div className="no-scrollbar -mx-1 mt-2 flex gap-2 overflow-x-auto px-1 pb-1">
          {prayerVersion && (
            <Link to="/answered" className="tap-scale inline-flex shrink-0 items-center gap-1.5 rounded-full border border-flame/30 bg-card px-3 py-2 text-[12px] text-ink">
              <Sparkles className="h-3.5 w-3.5 text-flame" /> He Answered{answeredCount ? ` · ${answeredCount}` : ""}
            </Link>
          )}
          <Link to="/gratitude" className="tap-scale inline-flex shrink-0 items-center gap-1.5 rounded-full border border-border bg-card px-3 py-2 text-[12px] text-ink">
            <Sun className="h-3.5 w-3.5 text-brass" /> Gratitude
          </Link>
          {prayerVersion && (
            <Link to="/bible" search={{ ref: undefined }} className="tap-scale inline-flex shrink-0 items-center gap-1.5 rounded-full border border-border bg-card px-3 py-2 text-[12px] text-ink">
              <Book className="h-3.5 w-3.5 text-brass" /> Bible
            </Link>
          )}
          {prayerVersion && (
            <Link to="/map" className="tap-scale inline-flex shrink-0 items-center gap-1.5 rounded-full border border-border bg-card px-3 py-2 text-[12px] text-ink">
              <Globe className="h-3.5 w-3.5 text-hope" /> Prayer map
            </Link>
          )}
          <Link to="/spotlight" className="tap-scale inline-flex shrink-0 items-center gap-1.5 rounded-full border border-border bg-card px-3 py-2 text-[12px] text-ink">
            <BadgeCheck className="h-3.5 w-3.5 text-brass" /> Spotlight
          </Link>
          <Link to="/ledger" className="tap-scale inline-flex shrink-0 items-center gap-1.5 rounded-full border border-border bg-card px-3 py-2 text-[12px] text-ink">
            <BookOpen className="h-3.5 w-3.5 text-brass" /> Ledger
          </Link>
          <button
            onClick={() => {
              const w = window as unknown as { __witnessReplayTour?: () => void };
              w.__witnessReplayTour?.();
            }}
            className="tap-scale inline-flex shrink-0 items-center gap-1.5 rounded-full border border-border bg-card px-3 py-2 text-[12px] text-ink-soft"
          >
            <Sparkles className="h-3.5 w-3.5 text-brass" /> Tour
          </button>
        </div>
        <div className="mt-1"><ShareTourButton /></div>
      </div>

      <div className="no-scrollbar mt-6 -mx-1 flex gap-1 overflow-x-auto">
        {filters.map(t => (
          <button
            key={t}
            onClick={() => setFilter(t)}
            className={`shrink-0 rounded-full border px-3.5 py-1.5 text-[12px] tracking-wide transition-colors ${
              filter === t ? "border-ink bg-ink text-paper" : "border-border bg-card text-ink-soft hover:text-ink"
            }`}
          >
            {t}
          </button>
        ))}
      </div>

      <div className="mt-4 space-y-5">
        {home.isLoading && userId !== undefined && (
          <>
            {[0, 1].map(i => <div key={i} className="h-[420px] rounded-2xl border border-border bg-card animate-pulse" />)}
          </>
        )}
        {home.isError && (
          <div className="rounded-2xl border border-border bg-card p-5 text-center">
            <p className="font-serif text-[17px] text-ink">The feed couldn't load.</p>
            <p className="mt-1 text-[12.5px] text-ink-soft">Check your connection, then try again.</p>
            <button onClick={() => home.refetch()} className="mt-3 rounded-full bg-ink px-4 py-2 text-[12px] text-paper">Try again</button>
          </div>
        )}
        {feed.map(p => <PrayerCard key={p.id} prayer={p} onRemoved={remove} />)}
        {data && !feed.length && !home.isLoading && (
          <div className="rounded-2xl border border-dashed border-brass/50 bg-card p-6 text-center">
            <Mic className="mx-auto h-5 w-5 text-brass" />
            <p className="mt-3 font-serif text-[18px] text-ink">{filter === "Mine" ? `You haven't shared a ${tone.ask} yet.` : "Nothing here yet."}</p>
            <p className="mt-1 text-[12.5px] text-ink-soft">{signedIn ? `The first ${tone.ask} makes room for everyone after.` : "Sign in to see what the community is carrying."}</p>
            <Link to={signedIn ? "/record" : "/login"} className="mt-4 inline-flex items-center gap-2 rounded-full bg-ink px-5 py-2.5 text-[12.5px] text-paper">
              {signedIn ? `Share a ${tone.ask}` : "Sign in"} <ArrowRight className="h-3.5 w-3.5" />
            </Link>
          </div>
        )}
      </div>

      <div className="mb-2 mt-10 text-center">
        <Sparkles className="mx-auto h-4 w-4 text-brass" />
        <p className="mt-3 font-serif text-[20px] text-ink">The feed ends here.</p>
        <p className="mx-auto mt-1 max-w-[260px] text-[13px] italic text-ink-soft">
           {tone.faith ? "On purpose. We don't scroll forever — we return when the answer comes." : "On purpose. We don't scroll forever — we return when something changes."}
        </p>
        <div className="mx-auto mt-5 h-px w-12 bg-brass/60" />
        <Link to="/record" className="tap-scale mt-5 inline-flex items-center gap-2 rounded-full bg-ink px-5 py-2.5 text-[12.5px] tracking-wide text-paper">
           <Mic className="h-3.5 w-3.5" /> Share a {tone.ask}
          <ArrowRight className="h-3.5 w-3.5" />
        </Link>
      </div>
      </div>
      <aside className="sticky top-8 hidden min-w-0 space-y-5 lg:block">
        <YourRooms />
        {prayerVersion && <VerseOfDay />}
        <div className="rounded-lg border border-border bg-card p-4 shadow-soft">
          <p className="text-[10px] uppercase tracking-[0.18em] text-ink-soft">A finite place</p>
          <p className="mt-2 font-serif text-[17px] text-ink">No endless scroll.</p>
           <p className="mt-1 text-[12px] leading-relaxed text-ink-soft">{tone.faith ? "Witness ends the feed on purpose, leaving room to pray and return later." : "Witness ends the feed on purpose, leaving room to breathe and return later."}</p>
        </div>
      </aside>
    </div>
  );
}
