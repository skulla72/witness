import { useEffect, useState } from "react";
import { Bell, BellOff } from "lucide-react";
import { disablePush, enablePush, pushConfigured, pushGranted, pushStatusCopy } from "@/lib/push";

/** One tap to be told when someone prays, answers, or messages. */
export function PushToggle() {
  const [on, setOn] = useState(false);
  const [busy, setBusy] = useState(false);
  const [note, setNote] = useState<string | null>(null);

  useEffect(() => {
    setOn(pushGranted());
  }, []);

  const turnOn = async () => {
    setBusy(true);
    setNote(null);
    try {
      const status = await enablePush();
      setOn(status === "registered");
      setNote(pushStatusCopy[status]);
    } catch {
      setNote("That didn't work. Try again in a moment.");
    }
    setBusy(false);
  };

  const turnOff = async () => {
    setBusy(true);
    try {
      await disablePush();
      setOn(false);
      setNote("Notifications are off for this device.");
    } catch {
      setNote("That didn't work. Try again in a moment.");
    }
    setBusy(false);
  };

  return (
    <div className="rounded-2xl border border-border bg-card p-4">
      <div className="flex items-center gap-3">
        <span className="grid h-9 w-9 place-items-center rounded-full bg-brass/15">
          {on ? (
            <Bell className="h-4 w-4 text-brass" strokeWidth={1.8} />
          ) : (
            <BellOff className="h-4 w-4 text-ink-soft" strokeWidth={1.8} />
          )}
        </span>
        <div className="flex-1 leading-tight">
          <p className="text-[14px] font-medium text-ink">Notifications</p>
          <p className="text-[11.5px] text-ink-soft">
            When someone prays for you, answers, or sends a message.
          </p>
        </div>
        <button
          onClick={on ? turnOff : turnOn}
          disabled={busy || !pushConfigured()}
          className="rounded-full bg-ink px-4 py-2 text-[12.5px] text-paper tap-scale disabled:opacity-40"
        >
          {busy ? "…" : on ? "Turn off" : "Turn on"}
        </button>
      </div>
      {note && <p className="mt-2.5 text-[11.5px] text-ink-soft">{note}</p>}
    </div>
  );
}
