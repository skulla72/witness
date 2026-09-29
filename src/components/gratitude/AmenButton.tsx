import { useState } from "react";
import { toast } from "sonner";
import { Check } from "lucide-react";
import { toggleAmen } from "@/lib/prayers";
import { useSession } from "@/hooks/useSession";
import { useTone } from "@/hooks/useTone";

/**
 * "Amen" tap on a gratitude entry. One per person, removable, never counted
 * publicly — the author simply hears that someone said amen.
 */
export function AmenButton({ gratitudeId, authorId, privacy, amened, full }: {
  gratitudeId: string;
  authorId: string;
  privacy: "private" | "community";
  amened: boolean;
  full?: boolean;
}) {
  const { userId } = useSession();
  const tone = useTone();
  const [on, setOn] = useState(amened);
  const [busy, setBusy] = useState(false);

  if (authorId === userId || privacy === "private") return null;

  const tap = async (e?: React.MouseEvent) => {
    e?.preventDefault();
    e?.stopPropagation();
    if (!userId) {
      toast.error(tone.say("Sign in to say amen.", "Sign in to let them know."));
      return;
    }
    if (busy) return;
    const next = !on;
    setOn(next);
    setBusy(true);
    try {
      await toggleAmen(gratitudeId, userId);
      if (next) toast.success(tone.say("Amen. They'll know.", "Let them know. Done."));
    } catch {
      setOn(!next);
      toast.error("Couldn't record that. Try again.");
    } finally {
      setBusy(false);
    }
  };

  if (full) {
    return (
      <button
        onClick={() => void tap()}
        aria-pressed={on}
        className={`inline-flex h-11 w-full items-center justify-center gap-2 rounded-full text-[13px] tracking-wide transition-colors ${
          on ? "bg-brass text-ink" : "border border-border bg-card text-ink hover:border-brass/50"
        }`}
      >
        {on && <Check className="h-4 w-4" strokeWidth={2} />}
        {tone.faith ? "Amen" : on ? "So glad" : "I'm glad for them"}
      </button>
    );
  }

  return (
    <button
      onClick={tap}
      aria-pressed={on}
      className={`relative z-10 -my-1.5 shrink-0 rounded-full border px-3.5 py-2 min-h-[32px] text-[12px] tracking-wide transition-colors ${
        on ? "border-brass bg-brass/15 text-brass" : "border-border bg-paper text-ink-soft hover:text-brass"
      }`}
    >
      {tone.faith ? "Amen" : on ? "Glad" : "So glad"}
    </button>
  );
}
