import { useEffect, useState, useSyncExternalStore } from "react";
import { useLocation } from "@tanstack/react-router";
import { eligibilityController } from "@/lib/eligibility-client";
import { canMountProtected, PUBLIC_ELIGIBILITY_PATHS } from "@/lib/eligibility";
import type { EligibilityState, EligibilityUser } from "@/lib/eligibility";
import { isControlPath } from "@/lib/action-eligibility";
import { EntryBrand } from "./EntryBrand";
import { CommunityAcknowledgement } from "./CommunityAcknowledgement";

export function EligibilityMount({ state, children, fallback }: {
  state: EligibilityState; children: React.ReactNode; fallback: React.ReactNode;
}) {
  return <>{canMountProtected(state) ? children : fallback}</>;
}

/** Children are NOT mounted during resolution or missing/invalid confirmation. */
export function LaunchEligibilityBoundary({ children, publicContent }: {
  children: React.ReactNode; publicContent: React.ReactNode;
}) {
  const state = useSyncExternalStore(eligibilityController.subscribe, eligibilityController.getSnapshot, eligibilityController.getServerSnapshot);
  const pathname = useLocation({ select: location => location.pathname.replace(/\/$/, "") || "/" });
  const [confirmedFor, setConfirmedFor] = useState<EligibilityUser | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  useEffect(() => eligibilityController.start(), []);
  useEffect(() => { setConfirmedFor(null); setError(""); }, [state.user]);
  const confirmed = !!state.user && confirmedFor === state.user;
  if (PUBLIC_ELIGIBILITY_PATHS.has(pathname) || isControlPath(pathname)) return <>{publicContent}</>;
  // Preserve the public landing page without mounting app chrome/background consumers.
  if (state.status === "signed-out" && pathname === "/") return <>{publicContent}</>;
  return <EligibilityMount state={state} fallback={<main className="mx-auto min-h-screen max-w-lg px-6 py-12 text-ink">
    <EntryBrand />
    <h1 className="mt-6 font-serif text-2xl">Before you continue</h1>
    {state.status === "loading" ? <p role="status" className="mt-4">Resolving your signed-in account. Protected content has not been opened.</p>
      : state.status === "signed-out" ? <p className="mt-4">Sign in to continue to protected content. Public help remains available below.</p>
      : state.status === "error" ? <><p role="alert" className="mt-4">{state.message}</p><button className="mt-4 underline" onClick={() => void eligibilityController.refresh()}>Retry eligibility check</button></>
      : <form className="mt-4 space-y-4" onSubmit={async event => {
        event.preventDefault(); setBusy(true); setError("");
        const displayedAccountId = state.user!.id;
        setConfirmedFor(null);
        try { await eligibilityController.confirmCommunity(confirmed, displayedAccountId); }
        catch (error) { setError(error instanceof Error ? error.message : "Confirmation failed."); }
        finally { setBusy(false); }
      }}>
        <p className="break-all text-sm text-ink-soft">Signed-in account: {state.user?.id}</p>
        <CommunityAcknowledgement id="account-community-ack" checked={confirmed}
          onChange={checked => setConfirmedFor(checked ? state.user : null)} disabled={busy} />
        <p className="text-xs text-ink-soft">Saves only a 13-or-older declaration, version and time for this account. It does not confirm adulthood or replace existing age information.</p>
        <button disabled={busy || !confirmed} className="rounded-full bg-ink px-5 py-3 text-paper disabled:opacity-50">{busy ? "Saving…" : "Continue"}</button>
      </form>}
    {error && <p role="alert" className="mt-4">{error}</p>}
    <nav className="mt-8 flex flex-wrap gap-4 text-sm underline">
      <a href="/account-controls">Cancel my sessions / recurring payments</a>
      <a href="/crisis">Crisis help</a><a href="/privacy">Privacy and deletion help</a>
      <a href="/terms">Terms (draft)</a><a href="mailto:support@witnessmovement.com">Contact support</a><a href="/login">Sign-in help</a>
    </nav>
    <p className="mt-4 text-sm">Your account and existing records have not been deleted. Common Light LLC is registered in Colorado, USA. Mailing address remains unconfirmed. Legal documents remain unfinished; no governing law or venue is selected.</p>
  </main>}>{children}</EligibilityMount>;
}
