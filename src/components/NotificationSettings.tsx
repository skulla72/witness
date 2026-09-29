import { useEffect, useState } from "react";
import { Moon, BellRing } from "lucide-react";
import { useSession } from "@/hooks/useSession";
import { enablePush, pushStatusCopy } from "@/lib/push";
import {
  ALERTS,
  DEFAULT_PREFS,
  hourLabel,
  loadNotificationPrefs,
  saveNotificationPrefs,
  type AlertKey,
} from "@/lib/notifications";

type Draft = Record<AlertKey, boolean> & {
  quiet_start: number | null;
  quiet_end: number | null;
  reminders: boolean;
  reminder_hour: number | null;
};


const HOURS = Array.from({ length: 24 }, (_, h) => h);

/** Which alerts someone wants, and when to stay silent. */
export function NotificationSettings() {
  const { userId } = useSession();
  const [draft, setDraft] = useState<Draft>({ ...(DEFAULT_PREFS as Draft) });
  const [ready, setReady] = useState(false);
  const [note, setNote] = useState<string | null>(null);

  useEffect(() => {
    if (!userId) return;
    let live = true;
    loadNotificationPrefs(userId)
      .then(row => {
        if (!live) return;
        if (row) {
          setDraft({
            prayed_for_me: row.prayed_for_me,
            answers: row.answers,
            messages: row.messages,
            needs: row.needs,
            weekly_story: row.weekly_story,
            quiet_start: row.quiet_start,
            quiet_end: row.quiet_end,
            reminders: row.reminders,
            reminder_hour: row.reminder_hour,

          });
        }
        setReady(true);
      })
      .catch(() => setReady(true));
    return () => {
      live = false;
    };
  }, [userId]);

  const persist = async (next: Draft) => {
    setDraft(next);
    if (!userId) return;
    try {
      await saveNotificationPrefs(userId, next);
      setNote("Saved.");
    } catch {
      setNote("That didn't save. Try again in a moment.");
    }
  };

  const quietOn = draft.quiet_start !== null && draft.quiet_end !== null;

  if (!userId) return null;

  return (
    <div className="rounded-2xl border border-border bg-card p-4">
      <p className="text-[14px] font-medium text-ink">What you're told about</p>
      <p className="mt-0.5 text-[11.5px] text-ink-soft">
        Turn off anything you'd rather not hear. Nothing here is a badge or a score.
      </p>

      <ul className={`mt-3 space-y-2.5 ${ready ? "" : "opacity-50"}`}>
        {ALERTS.map(alert => (
          <li key={alert.key} className="flex items-center gap-3">
            <span className="min-w-0 flex-1 leading-tight">
              <span className="block text-[13px] text-ink">{alert.label}</span>
              <span className="block text-[11px] text-ink-soft">{alert.sub}</span>
            </span>
            <button
              type="button"
              role="switch"
              aria-checked={draft[alert.key]}
              aria-label={alert.label}
              onClick={() => void persist({ ...draft, [alert.key]: !draft[alert.key] })}
              className={`relative h-6 w-11 shrink-0 rounded-full transition-colors ${
                draft[alert.key] ? "bg-ink" : "bg-secondary"
              }`}
            >
              <span
                className={`absolute top-0.5 h-5 w-5 rounded-full bg-paper transition-all ${
                  draft[alert.key] ? "left-[22px]" : "left-0.5"
                }`}
              />
            </button>
          </li>
        ))}
      </ul>

      <div className="mt-4 border-t border-border pt-3">
        <div className="flex items-center gap-3">
          <BellRing className="h-4 w-4 shrink-0 text-ink-soft" strokeWidth={1.8} />
          <span className="min-w-0 flex-1 leading-tight">
            <span className="block text-[13px] text-ink">A daily reminder</span>
            <span className="block text-[11px] text-ink-soft">
              One gentle nudge on this phone each day after the hour you pick. Off unless you turn it on.
            </span>
          </span>
          <button
            type="button"
            role="switch"
            aria-checked={draft.reminders}
            aria-label="A daily reminder"
            onClick={() => {
              const turningOn = !draft.reminders;
              void persist({
                ...draft,
                reminders: turningOn,
                reminder_hour: draft.reminders ? draft.reminder_hour : (draft.reminder_hour ?? 19),
              });
              if (turningOn) {
                // The nudge arrives in the phone's own notification tray, so the
                // device has to be registered — ask right from this tap.
                void enablePush()
                  .then(status => setNote(pushStatusCopy[status]))
                  .catch(() => setNote("Couldn't reach this phone's notifications. Try again in a moment."));
              }
            }}
            className={`relative h-6 w-11 shrink-0 rounded-full transition-colors ${
              draft.reminders ? "bg-ink" : "bg-secondary"
            }`}
          >
            <span
              className={`absolute top-0.5 h-5 w-5 rounded-full bg-paper transition-all ${
                draft.reminders ? "left-[22px]" : "left-0.5"
              }`}
            />
          </button>
        </div>

        {draft.reminders && (
          <label className="mt-3 flex items-center gap-1.5 text-[12.5px] text-ink">
            <span className="text-ink-soft">Not before</span>
            <select
              value={draft.reminder_hour ?? 19}
              onChange={e => void persist({ ...draft, reminder_hour: Number(e.target.value) })}
              className="rounded-lg border border-border bg-paper px-2 py-1"
            >
              {HOURS.map(h => (
                <option key={h} value={h}>
                  {hourLabel(h)}
                </option>
              ))}
            </select>
          </label>
        )}
      </div>

      <div className="mt-4 border-t border-border pt-3">

        <div className="flex items-center gap-3">
          <Moon className="h-4 w-4 shrink-0 text-ink-soft" strokeWidth={1.8} />
          <span className="min-w-0 flex-1 leading-tight">
            <span className="block text-[13px] text-ink">Quiet hours</span>
            <span className="block text-[11px] text-ink-soft">Hold everything until morning.</span>
          </span>
          <button
            type="button"
            role="switch"
            aria-checked={quietOn}
            aria-label="Quiet hours"
            onClick={() =>
              void persist(
                quietOn
                  ? { ...draft, quiet_start: null, quiet_end: null }
                  : { ...draft, quiet_start: 22, quiet_end: 7 },
              )
            }
            className={`relative h-6 w-11 shrink-0 rounded-full transition-colors ${quietOn ? "bg-ink" : "bg-secondary"}`}
          >
            <span
              className={`absolute top-0.5 h-5 w-5 rounded-full bg-paper transition-all ${
                quietOn ? "left-[22px]" : "left-0.5"
              }`}
            />
          </button>
        </div>

        {quietOn && (
          <div className="mt-3 flex items-center gap-2 text-[12.5px] text-ink">
            <label className="flex items-center gap-1.5">
              <span className="text-ink-soft">From</span>
              <select
                value={draft.quiet_start ?? 22}
                onChange={e => void persist({ ...draft, quiet_start: Number(e.target.value) })}
                className="rounded-lg border border-border bg-paper px-2 py-1"
              >
                {HOURS.map(h => (
                  <option key={h} value={h}>
                    {hourLabel(h)}
                  </option>
                ))}
              </select>
            </label>
            <label className="flex items-center gap-1.5">
              <span className="text-ink-soft">until</span>
              <select
                value={draft.quiet_end ?? 7}
                onChange={e => void persist({ ...draft, quiet_end: Number(e.target.value) })}
                className="rounded-lg border border-border bg-paper px-2 py-1"
              >
                {HOURS.map(h => (
                  <option key={h} value={h}>
                    {hourLabel(h)}
                  </option>
                ))}
              </select>
            </label>
          </div>
        )}
      </div>

      {note && <p className="mt-2.5 text-[11px] text-ink-soft">{note}</p>}
    </div>
  );
}
