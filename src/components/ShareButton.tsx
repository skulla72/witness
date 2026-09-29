import { Share2 } from "lucide-react";
import { toast } from "sonner";

/**
 * Hands a page to the phone's share sheet — Instagram, Facebook, Messages,
 * wherever the person lives. Falls back to copying the link.
 */
export function ShareButton({ title, text, path, label = "Share", className = "" }: { title: string; text?: string; path?: string; label?: string; className?: string }) {
  const share = async () => {
    const url = typeof window === "undefined" ? "" : `${window.location.origin}${path ?? window.location.pathname}`;
    try {
      if (typeof navigator !== "undefined" && navigator.share) {
        await navigator.share({ title, text, url });
      } else {
        await navigator.clipboard.writeText(url);
        toast.success("Link copied.");
      }
    } catch {
      /* dismissed */
    }
  };
  return (
    <button onClick={() => void share()} className={`inline-flex items-center gap-1.5 rounded-full border border-border bg-card px-3 py-1.5 text-[12px] text-ink ${className}`}>
      <Share2 className="h-3.5 w-3.5" /> {label}
    </button>
  );
}
