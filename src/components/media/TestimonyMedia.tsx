import { useState } from "react";
import { useSignedUrl } from "@/hooks/useSignedUrl";
import type { MediaType } from "@/lib/prayers";
import { Mic } from "lucide-react";
import { hasOverlay, overlayText, type VideoOverlay } from "@/lib/overlay";
import { OverlayLayers } from "@/components/video/OverlayLayers";

/**
 * Renders a private prayer/gratitude file (video, voice, or photo) from
 * protected storage. Text-only posts should not use this.
 */
export function TestimonyMedia({
  path, type, className = "", controls = true, autoPlay = false, loop = false, poster, overlay,
}: { path: string | null; type: MediaType | null; className?: string; controls?: boolean; autoPlay?: boolean; loop?: boolean; poster?: string; overlay?: VideoOverlay | null }) {
  const { url, loading } = useSignedUrl(path);
  const [time, setTime] = useState(0);
  const [duration, setDuration] = useState(0);

  if (!path) return null;
  if (loading || !url) {
    return <div className={`bg-ink/80 animate-pulse ${className}`} aria-label="Loading media" />;
  }
  if (type === "image") {
    return <img src={url} alt="" className={`object-cover ${className}`} />;
  }
  if (type === "audio") {
    return (
      <div className={`bg-[radial-gradient(circle_at_50%_30%,oklch(0.3_0.04_60),oklch(0.18_0.02_60))] flex flex-col items-center justify-center gap-4 p-6 ${className}`}>
        <div className="h-14 w-14 rounded-full bg-paper/10 grid place-items-center"><Mic className="h-6 w-6 text-paper" /></div>
        <audio src={url} controls className="w-full max-w-[280px]" />
      </div>
    );
  }
  const video = (
    <video
      src={url}
      poster={poster}
      controls={controls}
      autoPlay={autoPlay}
      muted={autoPlay}
      loop={loop}
      playsInline
      preload="metadata"
      onTimeUpdate={hasOverlay(overlay) ? e => setTime(e.currentTarget.currentTime) : undefined}
      onLoadedMetadata={e => setDuration(e.currentTarget.duration || 0)}
      className={`bg-ink object-cover ${hasOverlay(overlay) ? "h-full w-full" : className}`}
    />
  );
  if (!hasOverlay(overlay)) return video;
  return (
    <div className={`relative ${className}`}>
      {video}
      <OverlayLayers overlay={overlay} time={time} duration={duration} />
      <span className="sr-only">On the video: {overlayText(overlay)}</span>
    </div>
  );
}
