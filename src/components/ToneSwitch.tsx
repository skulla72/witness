import { toast } from "sonner";
import { usePrefs } from "@/hooks/usePrefs";

/** Lets someone move between the faith-based and plain experience at any time. */
export function ToneSwitch() {
  const { prefs, update } = usePrefs();
  const faith = prefs.faithBased !== false;

  const pick = (next: boolean) => {
    if (next === faith) return;
    update({ faithBased: next });
    toast.success(next ? "Faith-based wording is on." : "Plain wording is on.");
  };

  return (
    <div className="rounded-2xl border border-border bg-card p-3">
      <p className="text-[13.5px] font-medium text-ink">The words the app uses</p>
      <p className="mt-0.5 text-[11.5px] text-ink-soft">Same app and people either way. Change it any time.</p>
      <div role="radiogroup" aria-label="Faith or plain" className="mt-3 grid grid-cols-2 gap-1 rounded-full bg-secondary p-1">
        {[
          { v: true, label: "Faith-based" },
          { v: false, label: "Plain" },
        ].map(o => (
          <button
            key={o.label}
            type="button"
            role="radio"
            aria-checked={faith === o.v}
            onClick={() => pick(o.v)}
            className={`rounded-full px-3 py-2 text-[12.5px] transition-colors ${
              faith === o.v ? "bg-card text-ink shadow-soft" : "text-ink-soft"
            }`}
          >
            {o.label}
          </button>
        ))}
      </div>
    </div>
  );
}
