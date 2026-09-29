import { useEffect, useState } from "react";
import { WifiOff, RotateCw } from "lucide-react";

/**
 * A calm line across the top when the phone loses signal, so nobody wonders
 * why a prayer won't post. Anything typed stays on screen.
 */
export function OfflineNotice() {
  const [offline, setOffline] = useState(false);

  useEffect(() => {
    const sync = () => setOffline(!navigator.onLine);
    sync();
    window.addEventListener("online", sync);
    window.addEventListener("offline", sync);
    return () => {
      window.removeEventListener("online", sync);
      window.removeEventListener("offline", sync);
    };
  }, []);

  if (!offline) return null;

  return (
    <div
      role="status"
      className="sticky top-0 z-40 flex items-center gap-2 border-b border-brass/30 bg-brass/15 px-4 py-2 text-[12px] text-ink"
    >
      <WifiOff className="h-3.5 w-3.5 shrink-0 text-brass" strokeWidth={1.8} />
      <span className="flex-1 leading-tight">
        You're offline. What you've typed is safe — it will send when you're back.
      </span>
      <button
        type="button"
        onClick={() => window.location.reload()}
        className="inline-flex items-center gap-1 rounded-full border border-ink/20 px-2.5 py-1 text-[11.5px] text-ink"
      >
        <RotateCw className="h-3 w-3" strokeWidth={1.8} /> Retry
      </button>
    </div>
  );
}
