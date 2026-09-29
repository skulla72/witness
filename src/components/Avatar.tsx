import { initials } from "@/lib/prayers";
import { useSignedUrl } from "@/hooks/useSignedUrl";

/** Profile picture with an initials fallback. Accepts an absolute URL or a private `avatars` storage path. */
export function Avatar({ name, photo, size = 40, className = "" }: { name: string; photo?: string | null; size?: number; className?: string }) {
  const { url } = useSignedUrl(photo, "avatars");
  const style = { width: size, height: size, fontSize: Math.max(10, Math.round(size * 0.36)) };
  return (
    <div
      className={`rounded-full overflow-hidden bg-secondary border border-border grid place-items-center shrink-0 ${className}`}
      style={style}
      aria-hidden
    >
      {url ? (
        <img src={url} alt="" className="h-full w-full object-cover" />
      ) : (
        <span className="font-medium text-ink-soft tracking-wide">{initials(name)}</span>
      )}
    </div>
  );
}
