import { useSignedUrl } from "@/hooks/useSignedUrl";

/** A photo or video that belongs to a need (before/after, time-lapse, story). */
export function NeedMedia({ path, type, className = "", controls = true }: { path: string | null; type: string | null; className?: string; controls?: boolean }) {
  const { url, loading } = useSignedUrl(path, "need-media");
  if (!path) return null;
  if (loading || !url) return <div className={`animate-pulse bg-secondary ${className}`} aria-label="Loading" />;
  if (type === "video") {
    return <video src={url} controls={controls} playsInline preload="metadata" className={`bg-ink object-cover ${className}`} />;
  }
  return <img src={url} alt="" loading="lazy" className={`object-cover ${className}`} />;
}
