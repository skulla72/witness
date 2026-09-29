import { useEffect, useRef, useState } from "react";
import { Columns2, Download, Film, Loader2, Play, RotateCcw, Share2 } from "lucide-react";
import { toast } from "sonner";
import { signedUrl } from "@/hooks/useSignedUrl";
import type { Story } from "@/lib/prayers";
import { daysBetween } from "@/lib/overlay";
import { OverlayLayers } from "@/components/video/OverlayLayers";
import { useTone } from "@/hooks/useTone";

type Stage = "idle" | "ask" | "bridge" | "answer" | "done";
const TEXT_HOLD = 4500;
const BRIDGE_HOLD = 3200;

function fmtDate(iso: string) {
  return new Date(iso).toLocaleDateString(undefined, { month: "short", day: "numeric" });
}

/** Plays the ask, a candle-light date card, then the answer — the whole journey in one sitting. */
export function JourneyPlayer({ story, shareable }: { story: Story; shareable?: boolean }) {
  const tone = useTone();
  const answer = story.answer!;
  const [mode, setMode] = useState<"film" | "split">("film");
  const [stage, setStage] = useState<Stage>("idle");
  const [askUrl, setAskUrl] = useState<string | null>(null);
  const [answerUrl, setAnswerUrl] = useState<string | null>(null);
  const [backdropUrl, setBackdropUrl] = useState<string | null>(null);
  const [time, setTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [exporting, setExporting] = useState(false);
  const days = daysBetween(story.ask_created_at, answer.created_at);
  const askIsVideo = story.ask_media_type === "video" || story.ask_media_type === "audio";
  const answerIsVideo = answer.media_type === "video" || answer.media_type === "audio";

  useEffect(() => {
    let live = true;
    void Promise.all([signedUrl(story.ask_media_path), signedUrl(answer.media_path), signedUrl(story.ask_backdrop_path)]).then(([a, b, c]) => {
      if (!live) return; setAskUrl(a); setAnswerUrl(b); setBackdropUrl(c);
    });
    return () => { live = false; };
  }, [story.ask_media_path, answer.media_path, story.ask_backdrop_path]);

  // Text-only moments and the bridge card hold for a few seconds, then move on.
  useEffect(() => {
    if (stage === "bridge") { const t = setTimeout(() => setStage("answer"), BRIDGE_HOLD); return () => clearTimeout(t); }
    if (stage === "ask" && !askIsVideo) { const t = setTimeout(() => setStage("bridge"), TEXT_HOLD); return () => clearTimeout(t); }
    if (stage === "answer" && !answerIsVideo) { const t = setTimeout(() => setStage("done"), TEXT_HOLD); return () => clearTimeout(t); }
  }, [stage, askIsVideo, answerIsVideo]);
  useEffect(() => { setTime(0); setDuration(0); }, [stage]);

  const shareLink = async () => {
    const url = `${window.location.origin}/journey/${story.id}`;
    try {
      if (navigator.share) await navigator.share({ title: tone.faith ? "Asked, then answered" : "Hoped for, then came through", url });
      else { await navigator.clipboard.writeText(url); toast.success("Link copied."); }
    } catch { /* closed */ }
  };

  const download = async () => {
    setExporting(true);
    try {
      const blob = await exportJourney({ story, askUrl, answerUrl, days, faith: tone.faith });
      const a = document.createElement("a");
      a.href = URL.createObjectURL(blob);
      a.download = `witness-journey.${blob.type.includes("mp4") ? "mp4" : "webm"}`;
      a.click();
      setTimeout(() => URL.revokeObjectURL(a.href), 5000);
      toast.success("Your journey video is saved.");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "This phone couldn't make the video.");
    } finally { setExporting(false); }
  };

  const bridge = (
    <div className="journey-bridge absolute inset-0 grid place-items-center p-6 text-center">
      <div>
        <p className="text-[10px] uppercase tracking-[0.28em] text-brass-light">{tone.faith ? "Asked" : "Hoped"} {fmtDate(story.ask_created_at)} · Answered {fmtDate(answer.created_at)}</p>
        <p className="mt-3 font-serif text-[40px] leading-none text-paper">{days}</p>
        <p className="mt-1 text-[13px] text-paper/70">{days === 1 ? "day" : "days"} {tone.faith ? "of prayer" : "of hoping"}</p>
      </div>
    </div>
  );

  const textCard = (label: string, text: string, answerSide = false) => (
    <div className={`absolute inset-0 grid place-items-center p-6 ${answerSide ? "bg-[radial-gradient(circle_at_50%_30%,oklch(0.9_0.06_75),oklch(0.78_0.08_70))]" : ""}`} style={!answerSide && !backdropUrl ? { background: story.ask_bg ?? "var(--paper-warm)" } : undefined}>
      {!answerSide && backdropUrl && <><img src={backdropUrl} alt="" className="absolute inset-0 h-full w-full object-cover" /><div className="absolute inset-0 bg-ink/45" /></>}
      <div className="relative text-center">
        <p className={`text-[10px] uppercase tracking-[0.22em] ${!answerSide && backdropUrl ? "text-paper/80" : "text-ink/60"}`}>{label}</p>
        <p className={`mt-3 font-serif text-[20px] leading-snug ${!answerSide && backdropUrl ? "text-paper" : "text-ink"}`}>"{text}"</p>
      </div>
    </div>
  );

  const askLabel = tone.faith ? "The Ask" : "The Hope";
  const answerLabel = tone.faith ? "The Answer" : "What came through";

  return (
    <section className="mx-5 mt-8" aria-label="Watch the journey">
      <div className="mb-3 flex items-center justify-between">
        <p className="inline-flex items-center gap-1.5 text-[11px] uppercase tracking-[0.2em] text-brass"><Film className="h-3.5 w-3.5" /> Watch the journey</p>
        <div className="flex rounded-full border border-ink/10 bg-paper-warm p-0.5 text-[11px]">
          <button onClick={() => setMode("film")} aria-pressed={mode === "film"} className={`rounded-full px-2.5 py-1 ${mode === "film" ? "bg-ink text-paper" : "text-ink-soft"}`}>Film</button>
          <button onClick={() => { setMode("split"); setStage("idle"); }} aria-pressed={mode === "split"} className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 ${mode === "split" ? "bg-ink text-paper" : "text-ink-soft"}`}><Columns2 className="h-3 w-3" /> Side by side</button>
        </div>
      </div>

      {mode === "split" ? (
        <div className="grid grid-cols-2 gap-1.5 overflow-hidden rounded-2xl bg-ink">
          {[{ url: askUrl, isVideo: askIsVideo, label: askLabel, text: story.ask_caption, overlay: story.ask_overlay, answerSide: false }, { url: answerUrl, isVideo: answerIsVideo, label: answerLabel, text: answer.caption, overlay: answer.overlay, answerSide: true }].map(side => (
            <div key={side.label} className="relative aspect-[9/14] overflow-hidden">
              {side.isVideo && side.url ? <video src={side.url} controls playsInline preload="metadata" className="absolute inset-0 h-full w-full object-cover" /> : textCard(side.label, side.text || "…", side.answerSide)}
              <span className={`pointer-events-none absolute left-2 top-2 rounded px-1.5 py-0.5 text-[9px] uppercase tracking-[0.16em] ${side.answerSide ? "bg-brass text-ink" : "bg-ink/60 text-paper"}`}>{side.label}</span>
            </div>
          ))}
          <p className="col-span-2 py-2 text-center text-[11px] text-paper/70">{days} {days === 1 ? "day" : "days"} between</p>
        </div>
      ) : (
        <div className="relative aspect-[9/14] overflow-hidden rounded-2xl bg-ink shadow-lift">
          {stage === "idle" || stage === "done" ? (
            <button onClick={() => setStage("ask")} className="journey-bridge absolute inset-0 grid place-items-center text-paper">
              <span className="text-center">
                <span className="mx-auto grid h-16 w-16 place-items-center rounded-full bg-paper/15 ring-1 ring-brass/40">{stage === "done" ? <RotateCcw className="h-6 w-6" /> : <Play className="ml-1 h-6 w-6" />}</span>
                <span className="mt-3 block font-serif text-[18px]">{stage === "done" ? "Watch again" : `${askLabel} → ${answerLabel}`}</span>
                <span className="mt-1 block text-[12px] text-paper/60">{days} {days === 1 ? "day" : "days"} in one sitting</span>
              </span>
            </button>
          ) : stage === "bridge" ? bridge : (
            <div key={stage} className="journey-fade absolute inset-0">
              {(stage === "ask" ? askIsVideo : answerIsVideo) && (stage === "ask" ? askUrl : answerUrl) ? (
                <>
                  <video
                    src={(stage === "ask" ? askUrl : answerUrl)!}
                    autoPlay playsInline controls
                    onTimeUpdate={e => setTime(e.currentTarget.currentTime)}
                    onLoadedMetadata={e => setDuration(e.currentTarget.duration || 0)}
                    onEnded={() => setStage(stage === "ask" ? "bridge" : "done")}
                    className="absolute inset-0 h-full w-full object-cover"
                  />
                  <OverlayLayers overlay={stage === "ask" ? story.ask_overlay : answer.overlay} time={time} duration={duration} />
                </>
              ) : textCard(stage === "ask" ? askLabel : answerLabel, (stage === "ask" ? story.ask_caption : answer.caption) || "…", stage === "answer")}
              <span className={`pointer-events-none absolute left-3 top-3 rounded px-2 py-1 text-[10px] uppercase tracking-[0.18em] ${stage === "answer" ? "bg-brass text-ink" : "bg-ink/55 text-paper"}`}>{stage === "ask" ? askLabel : answerLabel}</span>
              <button onClick={() => setStage(stage === "ask" ? "bridge" : "done")} className="absolute right-3 top-3 rounded-full bg-ink/55 px-2.5 py-1 text-[11px] text-paper">Skip</button>
            </div>
          )}
        </div>
      )}

      {shareable !== false && (
        <div className="mt-3 flex gap-2">
          {shareable && <button onClick={() => void shareLink()} className="inline-flex flex-1 items-center justify-center gap-1.5 rounded-xl border border-ink/10 bg-paper-warm py-2.5 text-[12.5px] text-ink"><Share2 className="h-3.5 w-3.5" /> Share the journey</button>}
          <button onClick={() => void download()} disabled={exporting} className="inline-flex flex-1 items-center justify-center gap-1.5 rounded-xl border border-ink/10 bg-paper-warm py-2.5 text-[12.5px] text-ink disabled:opacity-60">
            {exporting ? <><Loader2 className="h-3.5 w-3.5 animate-spin" /> Making video…</> : <><Download className="h-3.5 w-3.5" /> Save as video</>}
          </button>
        </div>
      )}
    </section>
  );
}

/* ---------------- On-device export: canvas + MediaRecorder ---------------- */

async function exportJourney({ story, askUrl, answerUrl, days, faith }: { story: Story; askUrl: string | null; answerUrl: string | null; days: number; faith: boolean }): Promise<Blob> {
  if (typeof MediaRecorder === "undefined") throw new Error("This phone can't make videos here. Try on a computer.");
  const W = 720, H = 1120;
  const canvas = document.createElement("canvas");
  canvas.width = W; canvas.height = H;
  const ctx = canvas.getContext("2d")!;
  const css = getComputedStyle(document.documentElement);
  const ink = css.getPropertyValue("--ink").trim() || "#1c2433";
  const paper = css.getPropertyValue("--paper").trim() || "#faf8f3";
  const brass = css.getPropertyValue("--brass-light").trim() || "#d8b56a";
  const stream = canvas.captureStream(30);
  const audioCtx = new AudioContext();
  const dest = audioCtx.createMediaStreamDestination();
  dest.stream.getAudioTracks().forEach(t => stream.addTrack(t));
  const mime = ["video/mp4", "video/webm;codecs=vp9,opus", "video/webm"].find(m => MediaRecorder.isTypeSupported(m)) ?? "video/webm";
  const rec = new MediaRecorder(stream, { mimeType: mime, videoBitsPerSecond: 3_000_000 });
  const chunks: Blob[] = [];
  rec.ondataavailable = e => e.data.size && chunks.push(e.data);
  const done = new Promise<Blob>(res => { rec.onstop = () => res(new Blob(chunks, { type: mime.split(";")[0] })); });

  const cover = (v: CanvasImageSource, vw: number, vh: number) => {
    const s = Math.max(W / vw, H / vh);
    ctx.drawImage(v, (W - vw * s) / 2, (H - vh * s) / 2, vw * s, vh * s);
  };
  const label = (text: string, answer: boolean) => {
    ctx.font = "600 22px Manrope, sans-serif";
    const w = ctx.measureText(text.toUpperCase()).width + 28;
    ctx.fillStyle = answer ? brass : "rgba(0,0,0,0.5)";
    ctx.fillRect(28, 28, w, 40);
    ctx.fillStyle = answer ? ink : paper;
    ctx.fillText(text.toUpperCase(), 42, 56);
  };
  const wrap = (text: string, y: number, size: number, color: string) => {
    ctx.font = `600 ${size}px Sora, sans-serif`; ctx.fillStyle = color; ctx.textAlign = "center";
    const words = text.split(/\s+/); const lines: string[] = []; let line = "";
    for (const w of words) { const t = line ? `${line} ${w}` : w; if (ctx.measureText(t).width > W - 120) { lines.push(line); line = w; } else line = t; }
    if (line) lines.push(line);
    lines.slice(0, 8).forEach((l, i) => ctx.fillText(l, W / 2, y + i * size * 1.3));
    ctx.textAlign = "left";
  };
  const bg = (warm: boolean) => {
    const g = ctx.createRadialGradient(W / 2, H * 0.3, 40, W / 2, H / 2, H);
    g.addColorStop(0, warm ? "#6b4f2a" : "#2d3a52"); g.addColorStop(1, ink);
    ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
  };
  const hold = (ms: number, draw: (p: number) => void) => new Promise<void>(res => {
    const t0 = performance.now();
    const tick = () => { const p = (performance.now() - t0) / ms; draw(Math.min(1, p)); p < 1 ? requestAnimationFrame(tick) : res(); };
    tick();
  });
  const playVideo = async (url: string, lbl: string, answer: boolean) => {
    const v = document.createElement("video");
    v.crossOrigin = "anonymous"; v.src = url; v.playsInline = true;
    await new Promise<void>((res, rej) => { v.onloadeddata = () => res(); v.onerror = () => rej(new Error("A video couldn't be loaded.")); });
    const src = audioCtx.createMediaElementSource(v); src.connect(dest);
    await v.play();
    await new Promise<void>(res => {
      const tick = () => {
        if (v.ended) return res();
        if (v.videoWidth) cover(v, v.videoWidth, v.videoHeight); else bg(answer);
        label(lbl, answer);
        requestAnimationFrame(tick);
      };
      tick();
    });
  };

  const askLbl = faith ? "The Ask" : "The Hope";
  const ansLbl = faith ? "The Answer" : "What came through";
  rec.start(250);
  try {
    if (askUrl && story.ask_media_type === "video") await playVideo(askUrl, askLbl, false);
    else await hold(TEXT_HOLD, () => { bg(false); label(askLbl, false); wrap(`"${story.ask_caption || "…"}"`, H * 0.42, 38, paper); });
    await hold(BRIDGE_HOLD, p => {
      bg(true);
      ctx.globalAlpha = Math.min(1, p * 3, (1 - p) * 3 + 0.2);
      ctx.textAlign = "center"; ctx.fillStyle = brass; ctx.font = "600 22px Manrope, sans-serif";
      ctx.fillText(`${faith ? "ASKED" : "HOPED"} ${fmtDate(story.ask_created_at).toUpperCase()} · ANSWERED ${fmtDate(story.answer!.created_at).toUpperCase()}`, W / 2, H * 0.4);
      ctx.fillStyle = paper; ctx.font = "600 120px Sora, sans-serif"; ctx.fillText(String(days), W / 2, H * 0.53);
      ctx.font = "500 30px Manrope, sans-serif"; ctx.fillText(`${days === 1 ? "day" : "days"} ${faith ? "of prayer" : "of hoping"}`, W / 2, H * 0.59);
      ctx.textAlign = "left"; ctx.globalAlpha = 1;
    });
    if (answerUrl && story.answer!.media_type === "video") await playVideo(answerUrl, ansLbl, true);
    else await hold(TEXT_HOLD, () => { bg(true); label(ansLbl, true); wrap(`"${story.answer!.caption || "…"}"`, H * 0.42, 38, paper); });
    await hold(1200, () => { bg(true); ctx.fillStyle = brass; ctx.textAlign = "center"; ctx.font = "600 34px Sora, sans-serif"; ctx.fillText("Witness", W / 2, H / 2); ctx.textAlign = "left"; });
  } finally {
    rec.stop();
    void audioCtx.close();
  }
  return done;
}
