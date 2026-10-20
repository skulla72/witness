import { TEEN_CARE_NOTICE } from "@/lib/launch-policy";
import { useState, useSyncExternalStore } from "react";
import { eligibilityController } from "@/lib/eligibility-client";
import { isAdultCareAge } from "@/lib/launch-policy";

/** Transient per-request attestation; deliberately not saved as a birth date. */
export function AdultCareAge({ value, onChange }: { value: string; onChange: (value: string) => void }) {
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");
  const account = useSyncExternalStore(eligibilityController.subscribe, eligibilityController.getSnapshot, eligibilityController.getServerSnapshot);
  return (
    <div className="my-3 block text-[12px] leading-relaxed text-ink-soft">
      <label>
      <span className="block">{TEEN_CARE_NOTICE} Requests must be for yourself, not on behalf of anyone under 18.</span>
      <span className="mt-2 block">Current age in whole years (exact age not saved). Confirming saves an editable 18+ self-attestation for your actual signed-in account, not verified age.</span>
      <input aria-label="Age for adult counseling" type="number" min={18} max={120} step={1}
        value={value} onChange={e => onChange(e.target.value)}
        className="mt-1 w-full rounded-xl border border-border bg-paper px-3 py-2 text-ink" />
      </label>
      <button type="button" disabled={saving || !isAdultCareAge(value) || !account.user} className="mt-2 underline disabled:opacity-50" onClick={async () => {
        setSaving(true); setMessage("");
        try { await eligibilityController.confirm(value, true, account.user!.id); setMessage("18+ self-attestation saved for this account. It is not verified age."); }
        catch (error) { setMessage(error instanceof Error ? error.message : "Could not confirm adult eligibility."); }
        finally { setSaving(false); }
      }}>{saving ? "Saving…" : "Confirm 18+ self-attestation for this account"}</button>
      {message && <p role="status">{message}</p>}
    </div>
  );
}
