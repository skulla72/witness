import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useSession } from "@/hooks/useSession";
import { listOwnStops, stopOwnItem } from "@/lib/own-controls.functions";
import type { StopItem } from "@/lib/own-controls";

export const Route = createFileRoute("/account-controls")({
  staticData: { sitemap: false },
  component: OwnControls,
  head: () => ({ meta: [{ title: "Cancel sessions and recurring payments · Witness" }] }),
});
function OwnControls() {
  const { userId, signedIn } = useSession();
  return <main className="mx-auto min-h-screen max-w-xl space-y-5 px-6 py-10 text-ink">
    <h1 className="font-serif text-2xl">Cancel sessions and recurring payments</h1>
    <p>These controls require authentication and ownership, not an age confirmation. They do not open protected community content or allow purchases. Stopping recurrence does not refund prior payments or erase records.</p>
    {!userId ? <p>{signedIn === undefined ? "Resolving authentication…" : <>Sign in to manage only your own items. <Link to="/login" search={{ next: "/account-controls" }} className="underline">Sign in</Link></>}</p>
      : <OwnControlsBody key={userId} userId={userId} />}
    <nav className="flex gap-4 underline"><a href="/login">Sign-in help</a><a href="/crisis">Crisis help</a><a href="mailto:support@witnessmovement.com">Contact support</a></nav>
    <p className="text-sm">Common Light LLC is registered in Colorado, USA. Mailing address unconfirmed; no governing law or venue is selected. Legal documents remain unfinished drafts. No account deletion is performed here.</p>
  </main>;
}
function OwnControlsBody({ userId }: { userId: string }) {
  const [busy, setBusy] = useState<string | null>(null);
  const [message, setMessage] = useState("");
  const controls = useQuery({ queryKey: ["own-stop-controls", userId], queryFn: () => listOwnStops({ data: { accountId: userId } }), enabled: !!userId, retry: false });
  async function stop(item: StopItem) {
    const consequence = item.kind === "session" ? "Cancel this session? Records will remain."
      : ["professional", "organization"].includes(item.kind) ? "Stop this plan renewing after its current period? Prior charges and records remain."
      : "Stop this recurring gift now? Prior gifts and records remain.";
    if (!window.confirm(consequence)) return;
    setBusy(item.id); setMessage("");
    try {
      const result = await stopOwnItem({ data: { id: item.id, kind: item.kind, accountId: userId } });
      setMessage("error" in result ? result.error : result.message);
      await controls.refetch();
    } catch { setMessage("The stop was not confirmed. Retry or contact support; do not assume it succeeded."); }
    finally { setBusy(null); }
  }
  return <section className="space-y-4">
    <button type="button" className="underline" onClick={() => void controls.refetch()}>Retry / refresh own controls</button>
    {controls.isPending && <p role="status">Loading only your cancellation items…</p>}
    {controls.isError && <p role="alert">Authenticated cancellation items could not be loaded. Retry or contact support.</p>}
    {controls.data?.errors.map(error => <p role="alert" key={error}>{error}</p>)}
    {controls.data && !controls.data.items.length && !controls.data.errors.length && <p>No open cancellation items were found for this account.</p>}
    {controls.data?.items.map(item => <article className="rounded border p-4" key={`${item.kind}:${item.id}`}>
      <h2>{item.kind === "session" ? "Care session" : `${item.kind} recurring item`}</h2>
      <p className="text-sm">Status: {item.status}{item.startsAt ? ` · ${new Date(item.startsAt).toLocaleString()}` : ""}</p>
      <p className="break-all text-xs">Reference: {item.id}</p>
      <button type="button" disabled={!!busy} onClick={() => void stop(item)} className="mt-3 rounded border px-4 py-2 disabled:opacity-50">
        {busy === item.id ? "Confirming stop…" : item.kind === "session" ? "Cancel my session" : "Stop recurring payment"}
      </button>
    </article>)}
    {message && <p role="status">{message}</p>}
  </section>;
}
