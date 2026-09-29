import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { Share2, Download, Sparkles, Heart, X, Instagram, Facebook } from "lucide-react";
import { statusLabel } from "@/data/seed";
import type { Story } from "@/lib/prayers";
import { renderTestimonyCard, reachedMilestone, type CardFormat, type CardReason } from "@/lib/testimonyCard";
import { BRAND } from "@/config/brand";

/** Which share moment, if any, this story has earned for its owner. */
export function shareReasonFor(story: Story): CardReason | null {
  if (story.answer) return "answered";
  if (reachedMilestone(story.intercession_count)) return "milestone";
  return null;
}

function shortDate(iso: string) {
  return new Date(iso).toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" });
}

/**
 * Turns an answered prayer (or a "50 people prayed" moment) into an image
 * the owner can hand to Instagram, Facebook, or Messages with the Witness mark on it.
 */
export function ShareTestimony({ story, reason, onClose }: { story: Story; reason: CardReason; onClose?: () => void }) {
  const [format, setFormat] = useState<CardFormat>("post");
  const [showName, setShowName] = useState(!story.is_anonymous);
  const [blob, setBlob] = useState<Blob | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const host = typeof window === "undefined" ? "" : window.location.host;
  const origin = typeof window === "undefined" ? "" : window.location.origin;

  const input = useMemo(() => ({
    reason,
    ask: story.ask_caption || (story.ask_kind === "voice" ? "A spoken prayer." : "A video prayer."),
    answer: story.answer?.caption,
    statusLabel: statusLabel[story.status],
    count: story.intercession_count,
    name: showName ? story.author.name : null,
    category: story.category,
    askDate: shortDate(story.ask_created_at),
    answerDate: story.answer ? shortDate(story.answer.created_at) : null,
    host,
    format,
  }), [story, reason, showName, format, host]);

  useEffect(() => {
    let alive = true;
    setBlob(null);
    renderTestimonyCard(input).then(b => {
      if (!alive) return;
      setBlob(b);
      setPreview(prev => { if (prev) URL.revokeObjectURL(prev); return URL.createObjectURL(b); });
    }).catch(() => { if (alive) toast.error("Couldn't draw the card."); });
    return () => { alive = false; };
  }, [input]);

  useEffect(() => () => { if (preview) URL.revokeObjectURL(preview); }, [preview]);

  const milestone = reachedMilestone(story.intercession_count);
  const caption = reason === "answered"
    ? `“${input.ask}” — ${statusLabel[story.status].toLowerCase()}. ${story.intercession_count} people prayed. Shared from ${BRAND.name} · ${origin}`
    : `${milestone} people have prayed for this on ${BRAND.name}. “${input.ask}” · ${origin}`;

  const fileName = `${BRAND.name.toLowerCase()}-${reason}-${story.id.slice(0, 8)}.png`;

  const download = () => {
    if (!blob) return;
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = fileName;
    a.click();
    setTimeout(() => URL.revokeObjectURL(a.href), 2000);
  };

  const share = async () => {
    if (!blob || busy) return;
    setBusy(true);
    try {
      const file = new File([blob], fileName, { type: "image/png" });
      const nav = typeof navigator === "undefined" ? undefined : navigator;
      if (nav?.share && nav.canShare?.({ files: [file] })) {
        await nav.share({ files: [file], title: `${BRAND.name} · ${reason === "answered" ? "Answered" : "Carried"}`, text: caption });
        toast.success("Handed to your share sheet.");
      } else {
        download();
        try { await nav?.clipboard?.writeText(caption); } catch { /* clipboard blocked */ }
        toast.success("Image saved and caption copied — post it from your phone or desktop.");
      }
    } catch (e) {
      if (!(e instanceof DOMException && e.name === "AbortError")) toast.error("Couldn't share that. Try Save image instead.");
    } finally { setBusy(false); }
  };

  return (
    <section className="mx-5 mt-6 rounded-2xl border border-brass/40 bg-gratitude-warm/60 p-4" aria-label="Share beyond Witness">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-[10px] uppercase tracking-[0.2em] text-brass-deep inline-flex items-center gap-1.5">
            {reason === "answered" ? <Sparkles className="h-3 w-3" /> : <Heart className="h-3 w-3" />}
            {reason === "answered" ? "Let it leave the app" : `${milestone} people prayed`}
          </p>
          <p className="mt-1.5 font-serif text-[17px] text-ink leading-snug">
            {reason === "answered" ? "Someone scrolling tonight needs this." : "Let people outside see what carrying looks like."}
          </p>
          <p className="mt-1 text-[12px] text-ink-soft">One tap opens your share sheet — Instagram, Facebook, Messages. The image carries the {BRAND.name} mark.</p>
        </div>
        {onClose && <button onClick={onClose} aria-label="Close" className="p-1 text-ink-soft"><X className="h-4 w-4" /></button>}
      </div>

      <div className="mt-4 flex gap-4">
        <div className={`shrink-0 rounded-xl overflow-hidden border border-border bg-card shadow-soft ${format === "story" ? "w-[104px] aspect-[9/16]" : "w-[128px] aspect-[4/5]"}`}>
          {preview ? <img src={preview} alt="Preview of your shareable card" className="h-full w-full object-cover" /> : <div className="h-full w-full animate-pulse bg-secondary" />}
        </div>
        <div className="flex-1 min-w-0 flex flex-col gap-2">
          <div className="grid grid-cols-2 gap-1.5">
            {(["post", "story"] as const).map(f => (
              <button key={f} onClick={() => setFormat(f)} className={`py-2 rounded-lg border text-[11.5px] ${format === f ? "bg-ink text-paper border-ink" : "bg-card border-border text-ink"}`}>
                {f === "post" ? "Post · 4:5" : "Story · 9:16"}
              </button>
            ))}
          </div>
          <button onClick={() => setShowName(v => !v)} className="flex items-center justify-between rounded-lg border border-border bg-card px-3 py-2 text-[12px] text-ink">
            <span>Show my name</span>
            <span className={`h-4 w-7 rounded-full relative transition-colors ${showName ? "bg-brass" : "bg-border"}`}>
              <span className={`absolute top-0.5 h-3 w-3 rounded-full bg-paper transition-all ${showName ? "left-3.5" : "left-0.5"}`} />
            </span>
          </button>
          <p className="text-[10.5px] text-ink-soft leading-snug">
            {story.privacy === "public" ? "Only what's on the card leaves. Your prayer page stays members-only." : "This prayer is shared with a smaller circle in the app — the card only shows what you see here."}
          </p>
        </div>
      </div>

      <div className="mt-4 grid grid-cols-[1fr_auto] gap-2">
        <button onClick={() => void share()} disabled={!blob || busy} className="inline-flex items-center justify-center gap-2 py-3 rounded-xl bg-ink text-paper text-[13.5px] font-medium tracking-wide shadow-lift disabled:opacity-50">
          <Share2 className="h-4 w-4" /> {busy ? "Opening…" : "Share"}
          <span className="inline-flex items-center gap-1 text-paper/60 ml-1"><Instagram className="h-3.5 w-3.5" /><Facebook className="h-3.5 w-3.5" /></span>
        </button>
        <button onClick={download} disabled={!blob} aria-label="Save image" className="inline-flex items-center justify-center gap-1.5 px-4 rounded-xl bg-card border border-border text-ink text-[12.5px] disabled:opacity-50">
          <Download className="h-4 w-4" /> Save
        </button>
      </div>
    </section>
  );
}

/** Full-screen sheet wrapper so the feed can open the share card in place. */
export function ShareTestimonySheet({ story, reason, open, onClose }: { story: Story; reason: CardReason; open: boolean; onClose: () => void }) {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 bg-ink/60 flex items-end justify-center" onClick={onClose} role="dialog" aria-modal="true" aria-label="Share this testimony">
      <div className="w-full max-w-md bg-paper rounded-t-3xl pb-8 pt-2 max-h-[92vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
        <span className="mx-auto block h-1 w-10 rounded-full bg-border" />
        <ShareTestimony story={story} reason={reason} onClose={onClose} />
      </div>
    </div>
  );
}
