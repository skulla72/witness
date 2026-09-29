import { useEffect, useRef, useState, type MouseEvent } from "react";
import { Play, Pause, Mic } from "lucide-react";
import { useSignedUrl } from "@/hooks/useSignedUrl";
import { fmtSeconds } from "@/components/media/VoiceRecorder";

/**
 * A spoken prayer laid over the photo or tone it was recorded on.
 * Big single play control, soft breathing bars while it plays, no chrome.
 */
export function VoicePrayer({
  path, backdropPath, bg, caption, seconds, className = "", compact = false,
}: { path: string; backdropPath: string | null; bg: string | null; caption?: string; seconds?: number | null; className?: string; compact?: boolean }) {
  const { url } = useSignedUrl(path);
  const { url: photo } = useSignedUrl(backdropPath);
  const audioRef = useRef<HTMLAudioElement>(null);
  const [playing, setPlaying] = useState(false);
  const [progress, setProgress] = useState(0);
  const [time, setTime] = useState(0);

  useEffect(() => () => { audioRef.current?.pause(); }, []);

  const total = (() => {
    const d = audioRef.current?.duration;
    return d && Number.isFinite(d) ? d : (seconds ?? 0);
  })();

  const toggle = (e: MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    const a = audioRef.current;
    if (!a) return;
    if (a.paused) void a.play().catch(() => {}); else a.pause();
  };

  const onTime = () => {
    const a = audioRef.current;
    if (!a) return;
    setTime(a.currentTime);
    const d = Number.isFinite(a.duration) && a.duration > 0 ? a.duration : (seconds || 0);
    setProgress(d ? Math.min(1, a.currentTime / d) : 0);
  };

  const onPhoto = Boolean(photo);
  const tone = bg ?? "oklch(0.86 0.06 250)";
  const textClass = onPhoto ? "text-paper" : "text-ink";
  const subClass = onPhoto ? "text-paper/75" : "text-ink/60";

  return (
    <div
      className={`relative overflow-hidden ${className}`}
      style={onPhoto ? undefined : { background: `radial-gradient(circle at 50% 25%, ${tone}, color-mix(in oklch, ${tone} 78%, black))` }}
    >
      {onPhoto && <img src={photo!} alt="" className="absolute inset-0 h-full w-full object-cover" />}
      {onPhoto && <div className="absolute inset-0 bg-gradient-to-b from-ink/20 via-ink/30 to-ink/80" />}
      {url && <audio ref={audioRef} src={url} preload="metadata" onPlay={() => setPlaying(true)} onPause={() => setPlaying(false)} onEnded={() => { setPlaying(false); setProgress(0); setTime(0); }} onTimeUpdate={onTime} onLoadedMetadata={onTime} />}

      <div className="absolute inset-0 flex flex-col items-center justify-center gap-4 p-6">
        <button
          type="button"
          onClick={toggle}
          aria-label={playing ? "Pause voice prayer" : "Play voice prayer"}
          disabled={!url}
          className={`${compact ? "h-14 w-14" : "h-20 w-20"} rounded-full grid place-items-center shadow-lift transition-transform active:scale-95 ${onPhoto ? "bg-paper text-ink" : "bg-ink text-paper"} disabled:opacity-50`}
        >
          {playing ? <Pause className={compact ? "h-5 w-5" : "h-7 w-7"} fill="currentColor" /> : <Play className={`${compact ? "h-5 w-5" : "h-7 w-7"} translate-x-[2px]`} fill="currentColor" />}
        </button>

        <div className="flex items-end gap-[3px] h-6" aria-hidden>
          {Array.from({ length: 21 }).map((_, i) => (
            <span
              key={i}
              className={`w-[3px] rounded-full ${onPhoto ? "bg-paper" : "bg-ink"} ${playing ? "voice-bar" : ""}`}
              style={{
                height: playing ? undefined : `${30 + Math.abs(Math.sin(i * 1.3)) * 50}%`,
                animationDelay: `${(i % 7) * 90}ms`,
                opacity: playing ? 0.9 : 0.35,
              }}
            />
          ))}
        </div>

        <p className={`text-[11px] tabular-nums ${subClass} inline-flex items-center gap-1.5`}>
          <Mic className="h-3 w-3" /> {fmtSeconds(time)}{total ? ` / ${fmtSeconds(total)}` : ""}
        </p>
      </div>

      {caption && !compact && (
        <p className={`absolute inset-x-0 bottom-0 p-5 pb-6 font-serif ${compact ? "text-[14px]" : "text-[17px]"} leading-snug text-center ${textClass} pointer-events-none`}>
          "{caption}"
        </p>
      )}

      <div className={`absolute inset-x-0 bottom-0 h-1 ${onPhoto ? "bg-paper/20" : "bg-ink/15"}`}>
        <div className="h-full bg-brass transition-[width] duration-150" style={{ width: `${progress * 100}%` }} />
      </div>
    </div>
  );
}
