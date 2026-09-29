import { createFileRoute, Link, useNavigate, useParams } from "@tanstack/react-router";
import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Heart, MessageCircle, Share2, ArrowLeft, Sparkles, ShieldCheck, Phone, HeartHandshake, Video, Mic, Lock, Play, BookOpen } from "lucide-react";
import { statusLabel, timeAgo, HEAVY_CATEGORIES } from "@/data/seed";
import { ScriptureSuggest } from "@/components/ScriptureSuggest";
import { useSession } from "@/hooks/useSession";
import { attachVerse, deletePrayer, encourage, loadStory, loadWords, prayFor, type Story, type Word } from "@/lib/prayers";
import { Avatar } from "@/components/Avatar";
import { TestimonyMedia } from "@/components/media/TestimonyMedia";
import { JourneyPlayer } from "@/components/journey/JourneyPlayer";
import type { VideoOverlay } from "@/lib/overlay";
import { VoicePrayer } from "@/components/media/VoicePrayer";
import { SafetyMenu } from "@/components/safety/ReportSheet";
import { FixThat } from "@/components/needs/FixThat";
import { ShareTestimony, shareReasonFor } from "@/components/share/ShareTestimony";
import { usePrefs } from "@/hooks/usePrefs";
import { categoryForTone, toneFor } from "@/lib/tone";

export const Route = createFileRoute("/prayer/$id")({
  staticData: { sitemap: false },
  component: PrayerDetail,
  head: () => ({ meta: [
    { title: "A prayer · Witness" },
    { name: "description", content: "One prayer, and the people carrying it." },
    { property: "og:title", content: "A prayer · Witness" },
    { property: "og:description", content: "One prayer, and the people carrying it." },
    { property: "og:type", content: "article" },
    { name: "twitter:card", content: "summary" },
  ] }),
});

function PrayerDetail() {
  const { id } = useParams({ from: "/prayer/$id" });
  const { userId, signedIn } = useSession();
  const navigate = useNavigate();
  const qc = useQueryClient();

  const storyQ = useQuery({
    queryKey: ["story", id, userId ?? "anon"],
    queryFn: () => loadStory(id, userId ?? null),
    enabled: userId !== undefined,
  });
  const wordsQ = useQuery({
    queryKey: ["words", id, userId ?? "anon"],
    queryFn: () => loadWords(id),
    enabled: userId !== undefined && !!storyQ.data,
  });

  const prayer = storyQ.data;
  const refresh = () => {
    qc.invalidateQueries({ queryKey: ["story", id] });
    qc.invalidateQueries({ queryKey: ["words", id] });
    qc.invalidateQueries({ queryKey: ["home"] });
  };

  if (storyQ.isLoading || userId === undefined) {
    return <div className="px-4 pt-6"><div className="aspect-[9/14] rounded-2xl bg-card border border-border animate-pulse" /></div>;
  }

  if (!prayer) {
    return (
      <div className="px-6 pt-10 text-center">
        <p className="font-serif text-[20px] text-ink-soft">{signedIn ? "This prayer isn't available." : "Sign in to see this prayer."}</p>
        <p className="mt-1 text-[12.5px] text-ink-soft">{signedIn ? "It may be private, removed, or shared only with a circle you're not in." : "Prayers are shared only with members."}</p>
        <Link to={signedIn ? "/" : "/login"} className="mt-4 inline-block text-brass">{signedIn ? "Back to feed" : "Sign in"}</Link>
      </div>
    );
  }

  return <StoryView prayer={prayer} words={wordsQ.data ?? []} userId={userId} onChange={refresh} onRemoved={() => navigate({ to: "/" })} />;
}

function StoryView({ prayer, words, userId, onChange, onRemoved }: { prayer: Story; words: Word[]; userId: string | null; onChange: () => void; onRemoved: () => void }) {
  const { prefs, ready: prefsReady } = usePrefs();
  const tone = toneFor(prefs);
  const isOwn = prayer.user_id === userId;
  const showAnon = prayer.is_anonymous && !isOwn;
  const heavy = HEAVY_CATEGORIES.includes(prayer.category);
  const publicWords = words.filter(w => w.kind === "word");
  const privateReel = words.filter(w => w.kind === "video" || w.kind === "voice");
  const [prayed, setPrayed] = useState(prayer.i_prayed);
  const [count, setCount] = useState(prayer.intercession_count);
  const [composing, setComposing] = useState(false);
  const [text, setText] = useState("");
  const [busy, setBusy] = useState(false);
  const [verse, setVerse] = useState(
    prayer.verse_ref ? { reference: prayer.verse_ref, text: prayer.verse_text ?? "" } : null,
  );

  const saveVerse = async (v: { reference: string; text: string } | null) => {
    const prev = verse;
    setVerse(v);
    try {
      await attachVerse(prayer.id, v);
      toast.success(v ? "Verse saved to this prayer." : "Verse removed.");
      onChange();
    } catch {
      setVerse(prev);
      toast.error("Couldn't save that verse.");
    }
  };

  const tapPray = async () => {
    if (!userId) { toast.error(tone.faith ? "Sign in to pray with the community." : "Sign in to stand with them."); return; }
    if (prayed) return;
    setPrayed(true); setCount(c => c + 1);
    try { await prayFor(prayer.id, userId); toast.success(tone.faith ? "They'll know you're praying." : "They'll know you're standing with them."); onChange(); }
    catch { setPrayed(false); setCount(c => c - 1); toast.error("Couldn't record that."); }
  };

  const sendWord = async () => {
    if (!userId || !text.trim()) return;
    setBusy(true);
    try {
      await encourage(prayer.id, userId, text);
      setText(""); setComposing(false);
      toast.success("Encouragement sent.");
      onChange();
    } catch { toast.error("Couldn't send that."); }
    finally { setBusy(false); }
  };

  const remove = async () => {
    try { await deletePrayer(prayer.id); toast.success("Removed."); onRemoved(); }
    catch { toast.error("Couldn't remove that."); }
  };

  const share = async () => {
     const url = window.location.href;
    try {
       if (navigator.share) await navigator.share({ title: tone.faith ? "A prayer on Witness" : "A hope on Witness", url });
      else { await navigator.clipboard.writeText(url); toast.success("Link copied. Only members can open it."); }
    } catch { /* dismissed */ }
  };

  return (
    <div className="pb-10">
      <div className="px-4 pt-3 flex items-center justify-between">
        <Link to="/" className="inline-flex items-center gap-1 text-ink-soft text-[13px]"><ArrowLeft className="h-4 w-4" /> Back</Link>
        <div className="flex items-center gap-1">
          <button onClick={() => void share()} aria-label="Share" className="p-2 text-ink-soft"><Share2 className="h-4 w-4" /></button>
          <SafetyMenu targetType="prayer" targetId={prayer.id} authorId={prayer.user_id} onRemove={remove} />
        </div>
      </div>

      {showAnon ? (
        <div className="px-5 mt-3 flex items-center gap-3">
          <Avatar name="Anonymous" size={44} />
          <div>
            <p className="font-medium text-[15px] text-ink">Anonymous</p>
            <p className="text-[11px] text-ink-soft tracking-wide">{categoryForTone(prayer.category, tone)} · {timeAgo(prayer.ask_created_at)}</p>
          </div>
        </div>
      ) : (
        <Link to="/person/$id" params={{ id: prayer.user_id }} className="mx-5 mt-3 flex items-center gap-3 group/person">
          <Avatar name={prayer.author.name} photo={prayer.author.photo} size={44} />
          <div>
            <p className="font-medium text-[15px] text-ink group-hover/person:text-brass transition-colors">{isOwn ? "You" : prayer.author.name}</p>
            <p className="text-[11px] text-ink-soft tracking-wide">{categoryForTone(prayer.category, tone)} · {timeAgo(prayer.ask_created_at)}{prayer.is_anonymous ? " · posted anonymously" : ""}</p>
          </div>
        </Link>
      )}

      {prayer.ask_media_path && prayer.ask_kind === "voice" ? (
        <div className="mt-5">
          <div className="relative aspect-[9/14] overflow-hidden">
            <VoicePrayer path={prayer.ask_media_path} backdropPath={prayer.ask_backdrop_path} bg={prayer.ask_bg} seconds={prayer.ask_duration} className="absolute inset-0 h-full w-full" />
             <span className={`absolute top-3 left-3 text-[10px] uppercase tracking-[0.18em] px-2 py-1 rounded pointer-events-none ${prayer.ask_backdrop_path ? "bg-ink/55 text-paper" : "bg-paper/70 text-ink/70"}`}>{tone.faith ? "The Ask" : "The Hope"} · voice</span>
          </div>
          {prayer.ask_caption && <p className="px-5 pt-3 text-ink font-serif text-[18px] leading-snug">"{prayer.ask_caption}"</p>}
        </div>
      ) : prayer.ask_media_path ? (
         <MediaBlock label={tone.faith ? "The Ask" : "The Hope"} path={prayer.ask_media_path} type={prayer.ask_media_type} caption={prayer.ask_caption} overlay={prayer.ask_overlay} />
      ) : (
         <TextBlock label={`${tone.faith ? "The Ask" : "The Hope"} · written`} bg={prayer.ask_bg ?? undefined} caption={prayer.ask_caption} />
      )}

      {isOwn && privateReel.length > 0 && <IntercessionReel inters={privateReel} />}

      {prayer.answer ? (
        <>
          <div className="px-5 mt-8 flex items-center gap-3">
            <span className="text-[10px] uppercase tracking-[0.22em] text-brass inline-flex items-center gap-1.5">
              <Sparkles className="h-3 w-3" /> {statusLabel[prayer.status]}
            </span>
            <span className="h-px flex-1 bg-brass/30" />
            <span className="text-[11px] text-ink-soft">{timeAgo(prayer.answer.created_at)}</span>
          </div>
          {prayer.answer.media_path ? (
             <MediaBlock label={tone.faith ? "The Answer" : "What came through"} path={prayer.answer.media_path} type={prayer.answer.media_type} caption={prayer.answer.caption} overlay={prayer.answer.overlay} accent />
          ) : (
             <TextBlock label={`${tone.faith ? "The Answer" : "What came through"} · written`} bg="oklch(0.9 0.06 75)" caption={prayer.answer.caption} />
          )}
          <JourneyPlayer story={prayer} shareable={prayer.privacy !== "private" && prayer.answer.privacy !== "private"} />
          {isOwn && <ShareTestimony story={{ ...prayer, intercession_count: count }} reason="answered" />}
        </>
      ) : isOwn ? (
        <>
          <Link
            to="/record"
            search={{ mode: "reaction", prayer: prayer.id }}
            className="mx-5 mt-5 flex items-center gap-3 p-4 rounded-2xl border border-flame/40 bg-flame/10"
          >
            <div className="h-10 w-10 rounded-full bg-flame/20 grid place-items-center"><Sparkles className="h-5 w-5 text-flame" /></div>
            <div className="flex-1 leading-tight">
               <p className="text-[14px] font-medium text-ink">{tone.faith ? "Has He answered?" : "Did it come through?"}</p>
               <p className="text-[11.5px] text-ink-soft">Record what happened. It links right here, under the {tone.ask}.</p>
            </div>
          </Link>
          {shareReasonFor({ ...prayer, intercession_count: count }) === "milestone" && (
            <ShareTestimony story={{ ...prayer, intercession_count: count }} reason="milestone" />
          )}
        </>
      ) : null}

      <FixThat prayerId={prayer.id} isOwn={isOwn} enabled={!!prayer.id} />

      {verse && prefsReady && prefs.faithBased !== false && (
        <div className="mx-5 mt-6 rounded-2xl border border-brass/40 bg-brass/10 p-4">
          <p className="text-[10px] uppercase tracking-[0.2em] text-brass inline-flex items-center gap-1.5">
            <BookOpen className="h-3 w-3" /> The verse for this prayer
          </p>
          <p className="mt-2 font-serif text-[17px] leading-snug text-ink">"{verse.text}"</p>
          <div className="mt-2 flex items-center gap-4">
            <Link to="/bible" search={{ ref: verse.reference }} className="text-[11.5px] uppercase tracking-[0.16em] text-brass">
              {verse.reference}
            </Link>
            {isOwn && (
              <button
                onClick={() => void saveVerse(null)}
                className="text-[11.5px] text-ink-soft underline decoration-brass/40 underline-offset-4"
              >
                Remove
              </button>
            )}
          </div>
        </div>
      )}

      {prefsReady && prefs.faithBased !== false && (
        <ScriptureSuggest
          situation={prayer.answer ? `They asked: "${prayer.ask_caption}". The answer they just shared: "${prayer.answer.caption}" (${statusLabel[prayer.status]}).` : `"${prayer.ask_caption}"`}
          category={prayer.category}
          label={prayer.answer ? "Scripture for this answer" : "Scripture for this ask"}
          selected={verse?.reference ?? null}
          onSelect={isOwn ? v => void saveVerse({ reference: v.reference, text: v.text }) : undefined}
        />
      )}

      {!isOwn && (
        <>
          <div className="px-5 mt-6 flex items-center gap-3">
            <button onClick={() => void tapPray()} aria-pressed={prayed} className={`flex-1 inline-flex items-center justify-center gap-2 py-3 rounded-xl text-[14px] font-medium tracking-wide transition-colors ${prayed ? "bg-brass/20 text-ink border border-brass/60" : "bg-ink text-paper hover:bg-ink/90"}`}>
               <Heart className="h-4 w-4" fill={prayed ? "currentColor" : "none"} /> {tone.faith ? (prayed ? "Praying" : "I'm praying") : (prayed ? "Standing with them" : "Stand with them")}
            </button>
            <button onClick={() => { if (!userId) { toast.error("Sign in to encourage."); return; } setComposing(v => !v); }} className="inline-flex items-center justify-center gap-2 px-4 py-3 rounded-xl bg-card border border-border text-ink text-[14px]">
              <MessageCircle className="h-4 w-4" /> Encourage
            </button>
          </div>
          {composing && (
            <div className="mx-5 mt-3 rounded-2xl border border-border bg-card p-3">
              <textarea value={text} onChange={e => setText(e.target.value)} rows={3} maxLength={600} placeholder="Encouragement only. No advice, no debate." className="w-full bg-transparent text-[14px] text-ink placeholder:text-ink-soft/60 focus:outline-none resize-none" />
              <div className="flex items-center justify-between">
                <span className="text-[11px] text-ink-soft">{text.length}/600</span>
                <button onClick={() => void sendWord()} disabled={busy || !text.trim()} className="rounded-full bg-ink px-4 py-2 text-[12.5px] text-paper disabled:opacity-40">{busy ? "Sending…" : "Send"}</button>
              </div>
            </div>
          )}
          <Link to="/record" search={{ mode: "intercession", prayer: prayer.id }} className="mx-5 mt-3 flex items-center gap-3 p-3 rounded-xl border border-dashed border-brass/50 bg-gratitude-warm/40">
            <div className="h-9 w-9 rounded-full bg-brass/20 grid place-items-center"><Video className="h-4 w-4 text-brass-deep" /></div>
            <div className="flex-1 leading-tight">
               <p className="text-[13px] font-medium text-ink">{tone.faith ? "Record a prayer for them" : "Record encouragement for them"}</p>
              <p className="text-[11px] text-ink-soft">Video or voice. Sent privately — only they see it.</p>
            </div>
            <span className="text-[11px] text-brass-deep">Open</span>
          </Link>
           <p className="px-5 mt-2 text-[11px] text-ink-soft text-center">{count} {count === 1 ? "person is" : "people are"} {tone.faith ? "praying for this" : "standing with them"}</p>
        </>
      )}
      {isOwn && (
        <p className="px-5 mt-6 text-[12px] text-ink-soft text-center">
           {count} {count === 1 ? "person is" : "people are"} {tone.faith ? "praying" : "standing with you"}. {privateReel.length > 0 ? `${privateReel.length} sent you a video or voice ${tone.faith ? "prayer" : "message"}.` : ""}
        </p>
      )}

      {heavy && (
        <aside className="mx-5 mt-7 rounded-2xl border border-brass/40 bg-gratitude-warm p-4">
          <p className="text-[10px] uppercase tracking-[0.2em] text-brass-deep inline-flex items-center gap-1.5"><ShieldCheck className="h-3 w-3" /> Get support</p>
          <p className="mt-2 font-serif text-[16px] text-ink leading-snug">You don't have to carry this alone.</p>
          <div className="mt-3 grid gap-2">
            <Link to="/walk" className="bg-paper border border-border rounded-xl px-3 py-2.5 flex items-center gap-3">
              <HeartHandshake className="h-4 w-4 text-brass" />
              <div className="leading-tight"><p className="text-[13px] font-medium text-ink">Join a Walk-With circle</p><p className="text-[11px] text-ink-soft">Small, facilitated, confidential.</p></div>
            </Link>
            <a href="tel:988" className="bg-paper border border-border rounded-xl px-3 py-2.5 flex items-center gap-3">
              <Phone className="h-4 w-4 text-destructive" />
              <div className="leading-tight"><p className="text-[13px] font-medium text-ink">988 — Crisis line (US)</p><p className="text-[11px] text-ink-soft">Call or text, any hour.</p></div>
            </a>
          </div>
        </aside>
      )}

      <div className="mt-8 px-5">
        <h3 className="font-serif text-[14px] text-ink-soft mb-3 uppercase tracking-[0.18em]">Encouragement</h3>
        {publicWords.length === 0 ? (
           <p className="text-[13px] text-ink-soft italic">No words yet. {isOwn ? (tone.faith ? "People may be praying quietly." : "People may be standing with you quietly.") : "Be the first to say something kind."}</p>
        ) : (
          <ul className="space-y-4">
            {publicWords.map(c => (
              <li key={c.id} className="flex items-start gap-3">
                <Avatar name={c.author.name} photo={c.author.photo} size={32} />
                <div className="flex-1">
                  <p className="text-[13px] text-ink">
                    <span className="font-medium">{c.author.name}</span>
                    <span className="text-ink-soft"> · {timeAgo(c.created_at)}</span>
                  </p>
                  <p className="mt-0.5 text-[14px] text-ink leading-snug">{c.body}</p>
                </div>
              </li>
            ))}
          </ul>
        )}
        <p className="mt-6 text-center text-[11px] text-ink-soft italic">Encouragement only. No advice, no debate.</p>
      </div>
    </div>
  );
}

function MediaBlock({ label, path, type, caption, accent, overlay }: { label: string; path: string; type: Story["ask_media_type"]; caption: string; accent?: boolean; overlay?: VideoOverlay | null }) {
  return (
    <div className="mt-5">
      <div className="relative aspect-[9/14] bg-ink overflow-hidden">
        <TestimonyMedia path={path} type={type} overlay={overlay} className="absolute inset-0 h-full w-full" />
        <span className={`absolute top-3 left-3 text-[10px] uppercase tracking-[0.18em] px-2 py-1 rounded pointer-events-none ${accent ? "bg-brass text-ink" : "bg-ink/55 text-paper"}`}>{label}</span>
      </div>
      {caption && <p className="px-5 pt-3 text-ink font-serif text-[18px] leading-snug">"{caption}"</p>}
    </div>
  );
}

function TextBlock({ label, bg, caption }: { label: string; bg?: string; caption: string }) {
  return (
    <div className="mt-5">
      <div className="relative aspect-[9/14] overflow-hidden flex items-center justify-center p-8" style={{ background: bg ?? "oklch(0.9 0.04 75)" }}>
        <span className="absolute top-3 left-3 text-[10px] uppercase tracking-[0.18em] px-2 py-1 rounded bg-paper/70 text-ink/70">{label}</span>
        <p className="text-ink font-serif text-[24px] leading-snug text-center">"{caption}"</p>
      </div>
    </div>
  );
}

function IntercessionReel({ inters }: { inters: Word[] }) {
  const tone = toneFor(usePrefs().prefs);
  const [open, setOpen] = useState<Word | null>(null);
  return (
    <section className="mt-8">
      <div className="px-5 flex items-center gap-3">
         <span className="text-[10px] uppercase tracking-[0.22em] text-brass inline-flex items-center gap-1.5"><Lock className="h-3 w-3" /> {tone.faith ? "Prayers recorded for you" : "Encouragement recorded for you"}</span>
        <span className="h-px flex-1 bg-brass/30" />
      </div>
      <p className="px-5 mt-1.5 text-[12px] text-ink-soft">Only you can see these.</p>
      <div className="mt-3 flex gap-3 overflow-x-auto px-5 pb-2 snap-x">
        {inters.map(i => (
          <button key={i.id} onClick={() => setOpen(i)} className="snap-start shrink-0 w-[140px] text-left">
            <div className="relative aspect-[9/14] rounded-xl overflow-hidden bg-gradient-to-br from-brass/20 to-card border border-border p-3 flex flex-col justify-between">
              {i.kind === "video" ? <Play className="h-5 w-5 text-brass" fill="currentColor" /> : <Mic className="h-5 w-5 text-brass" />}
              <div>
                <div className="flex items-center gap-1.5">
                  <Avatar name={i.author.name} photo={i.author.photo} size={20} />
                  <p className="text-[10px] text-ink truncate">{i.author.name.split(" ")[0]}</p>
                </div>
                {i.body && <p className="text-[10px] text-ink-soft mt-1 line-clamp-2">{i.body}</p>}
                <p className="text-[9px] text-ink-soft/70 mt-1">{timeAgo(i.created_at)}</p>
              </div>
            </div>
          </button>
        ))}
      </div>
      {open && (
        <div className="fixed inset-0 z-50 bg-ink/90 flex flex-col" onClick={() => setOpen(null)} role="dialog" aria-modal="true">
          <div className="flex items-center justify-between px-5 pt-4 text-paper">
             <p className="text-[12px]">{open.author.name} {tone.faith ? "prayed for you" : "sent encouragement"}</p>
            <button onClick={() => setOpen(null)} className="text-[12px] text-paper/70">
              Close
            </button>
          </div>
          <div className="flex-1 grid place-items-center p-4" onClick={e => e.stopPropagation()}>
            <TestimonyMedia path={open.media_path} type={open.media_type} className="max-h-[70vh] w-full max-w-md rounded-2xl" autoPlay />
          </div>
          {open.body && <p className="px-6 pb-8 text-center text-paper/80 font-serif text-[16px]">"{open.body}"</p>}
        </div>
      )}
    </section>
  );
}
