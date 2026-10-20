import { useState, useSyncExternalStore } from "react";
import { eligibilityController } from "@/lib/eligibility-client";
import { readCommunityAcknowledgement } from "@/lib/community-acknowledgement";
import { CommunityAcknowledgement } from "./CommunityAcknowledgement";

/** Historical consent is never relabeled as acceptance of the new draft wording. */
export function CovenantGate() {
  const state = useSyncExternalStore(eligibilityController.subscribe, eligibilityController.getSnapshot, eligibilityController.getServerSnapshot);
  if (state.status !== "eligible" || !state.user || readCommunityAcknowledgement(state.user)) return null;
  return <CurrentAccountAcknowledgement key={state.user.id} accountId={state.user.id} />;
}

function CurrentAccountAcknowledgement({ accountId }: { accountId: string }) {
  const [checked, setChecked] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center overflow-y-auto bg-ink/60 px-5 py-6">
      <form role="dialog" aria-modal="true" aria-labelledby="community-entry-title"
        className="w-full max-w-md rounded-2xl bg-paper p-6 shadow-lift"
        onSubmit={async event => {
          event.preventDefault(); setSaving(true); setError("");
          const acknowledged = checked;
          setChecked(false);
          try { await eligibilityController.confirmCommunity(acknowledged, accountId); }
          catch (error) { setError(error instanceof Error ? error.message : "Could not save acknowledgement."); }
          finally { setSaving(false); }
        }}>
        <h2 id="community-entry-title" className="font-serif text-xl text-ink">Before you enter</h2>
        <p className="mt-2 break-all text-xs text-ink-soft">Signed-in account: {accountId}</p>
        <div className="mt-4">
          <CommunityAcknowledgement id="community-entry-ack" checked={checked} onChange={setChecked} disabled={saving} />
        </div>
        {error && <p role="alert" className="mt-3 text-sm text-destructive">{error}</p>}
        <button disabled={!checked || saving} className="mt-4 w-full rounded-full bg-ink px-5 py-3 text-paper disabled:opacity-50">
          {saving ? "Saving…" : "Continue"}
        </button>
        <nav className="mt-4 flex flex-wrap gap-3 text-xs underline text-ink-soft">
          <a href="/account-controls">Cancel my sessions / payments</a>
          <a href="/crisis">Crisis help</a>
          <a href="mailto:support@witnessmovement.com">Contact support</a>
        </nav>
      </form>
    </div>
  );
}
