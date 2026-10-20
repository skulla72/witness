import { useSignedUrl } from "@/hooks/useSignedUrl";
import { MediaLoadError } from "@/components/media/MediaLoadError";

/** A photo or video that belongs to a need (before/after, time-lapse, story). */
export function NeedMedia({ path, type, className = "", controls = true }: { path: string | null; type: string | null; className?: string; controls?: boolean }) {
  const { url, loading, error, retry, onError } = useSignedUrl(path, "need-media");
  if (!path) return null;
  if (error) return <MediaLoadError retry={retry} className={className} />;
  if (loading || !url) return <div className={`animate-pulse bg-secondary ${className}`} aria-label="Loading" />;
  if (type === "video") {
    return <video src={url} onError={onError} controls={controls} playsInline preload="metadata" className={`bg-ink object-cover ${className}`} />;
  }
  return <img src={url} onError={onError} alt="" loading="lazy" className={`object-cover ${className}`} />;
}
