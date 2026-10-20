import { useEffect, useState } from "react";
import { useNavigate } from "@tanstack/react-router";
import { Download, Loader2, Trash2, User } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useSession } from "@/hooks/useSession";
import { deleteMyAccount, exportMyData } from "@/lib/account.functions";
import { disablePush } from "@/lib/push";
import { clearAccountJournal, hasLegacyJournal, readJournal, recoverLegacyJournal, setJournalAccount } from "@/lib/journal";

/** Name, a copy of everything you've put in, and a way out. */
export function AccountPanel({ embedded = false }: { embedded?: boolean }) {
  const { userId, email } = useSession();
  const navigate = useNavigate();
  const [name, setName] = useState("");
  const [saved, setSaved] = useState(false);
  const [busy, setBusy] = useState<"save" | "export" | "delete" | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [confirming, setConfirming] = useState(false);
  const [legacy, setLegacy] = useState(false);
  useEffect(() => { setLegacy(hasLegacyJournal()); }, [userId]);

  useEffect(() => {
    if (!userId) return;
    supabase
      .from("profiles")
      .select("display_name")
      .eq("user_id", userId)
      .maybeSingle()
      .then(({ data }) => setName(data?.display_name ?? ""));
  }, [userId]);

  if (!userId) return null;

  const saveName = async () => {
    setBusy("save");
    setError(null);
    const { error } = await supabase
      .from("profiles")
      .update({ display_name: name.trim().slice(0, 60) })
      .eq("user_id", userId);
    setBusy(null);
    if (error) return setError("We couldn't save that name.");
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  const download = async () => {
    setBusy("export");
    setError(null);
    try {
      const bundle = await exportMyData();
      setJournalAccount(userId);
      const copy = { ...JSON.parse(bundle.json), device_journal: readJournal(), device_journal_note: "Account-scoped journal on this device only. Legacy unassigned entries are preserved separately and are not automatically exported." };
      const url = URL.createObjectURL(
        new Blob([JSON.stringify(copy, null, 2)], { type: "application/json" }),
      );
      const a = document.createElement("a");
      a.href = url;
      a.download = "my-witness-data.json";
      a.click();
      URL.revokeObjectURL(url);
      if (!bundle.complete) setError(`A partial copy was downloaded. These collections could not be read: ${bundle.unavailable_collections.join(", ")}. Saved file links, when available, expire in one hour.`);
    } catch {
      setError("We couldn't build your copy just now.");
    }
    setBusy(null);
  };

  const remove = async () => {
    setBusy("delete");
    setError(null);
    try {
      // Disconnect push before deleting the account (the session is needed).
      await disablePush();
      const result = await deleteMyAccount();
      if ("error" in result) {
        setError(result.error);
        return;
      }
      clearAccountJournal(userId);
      await supabase.auth.signOut();
      navigate({ to: "/login" });
    } catch {
      setError("Could not finish deletion. Your local journal was not removed. Try again.");
    } finally {
      setBusy(null);
    }
  };

  return (
    <section className={embedded ? "border-t border-border px-3 py-4" : "mx-4 mt-8 rounded-2xl border border-border bg-card p-4 shadow-soft"}>
      <p className="flex items-center gap-1.5 text-[10px] uppercase tracking-[0.2em] text-brass">
        <User className="h-3 w-3" /> Your account
      </p>
      {email && <p className="mt-1.5 text-[12px] text-ink-soft">{email}</p>}

      <label className="mt-3 block">
        <span className="text-[11px] text-ink-soft">The name people see</span>
        <div className="mt-1 flex gap-2">
          <input
            value={name}
            onChange={e => setName(e.target.value)}
            placeholder="Your name"
            className="min-w-0 flex-1 rounded-xl border border-border bg-paper px-3 py-2 text-[13.5px] text-ink"
          />
          <button
            type="button"
            onClick={saveName}
            disabled={busy === "save"}
            className="tap-scale rounded-xl bg-ink px-3.5 py-2 text-[12.5px] text-paper disabled:opacity-60"
          >
            {busy === "save" ? "Saving…" : saved ? "Saved" : "Save"}
          </button>
        </div>
      </label>

      <div className="mt-4 space-y-2">
        {legacy && (
          <div className="rounded-xl border border-border p-3 text-[12px]">
            <p>An older journal is preserved on this device, but we cannot determine which account wrote it. It has not been assigned to your account.</p>
            <button type="button" className="mt-2 underline" onClick={() => {
              if (!window.confirm("Only continue if you wrote the older journal on this device. Add those entries to this account? The original backup will be kept.")) return;
              try { setJournalAccount(userId); recoverLegacyJournal(); setError(null); }
              catch { setError("Could not recover the older entries. The original backup was not changed."); }
            }}>I wrote the older journal — recover my entries</button>
          </div>
        )}
        <button
          type="button"
          onClick={download}
          disabled={busy === "export"}
          className="flex w-full items-center gap-2 rounded-xl border border-border bg-paper px-3 py-2.5 text-[13px] text-ink disabled:opacity-60"
        >
          {busy === "export" ? (
            <Loader2 className="h-3.5 w-3.5 animate-spin" />
          ) : (
            <Download className="h-3.5 w-3.5 text-ink-soft" />
          )}
          Download a copy of my data
        </button>

        {!confirming ? (
          <button
            type="button"
            onClick={() => setConfirming(true)}
            className="flex w-full items-center gap-2 rounded-xl border border-border bg-paper px-3 py-2.5 text-[13px] text-ink-soft"
          >
            <Trash2 className="h-3.5 w-3.5" /> Request account removal
          </button>
        ) : (
          <div className="rounded-xl border border-border bg-paper p-3">
            <p className="text-[12.5px] leading-relaxed text-ink">
              This requests destructive account-data removal and attempts saved-file cleanup
              before the account removal step. Some steps can fail or need a retry.
              Complete erasure, financial-record handling and retention outcomes have
              not been independently verified; do not assume every copy is removed.
              Download your data and original files first. Successful steps may be irreversible.
              Active gifts/plans and
              organization ownership must be resolved before deletion. Journals
              on other devices and unassigned legacy backups are not erased by this device.
            </p>
            <div className="mt-2.5 flex gap-2">
              <button
                type="button"
                onClick={remove}
                disabled={busy === "delete"}
                className="rounded-full bg-flame px-3.5 py-2 text-[12.5px] font-medium text-paper disabled:opacity-60"
              >
                {busy === "delete" ? "Processing removal…" : "Continue destructive removal request"}
              </button>
              <button
                type="button"
                onClick={() => setConfirming(false)}
                className="rounded-full border border-border px-3.5 py-2 text-[12.5px] text-ink-soft"
              >
                Keep my account
              </button>
            </div>
          </div>
        )}
      </div>
      {error && <p className="mt-2 text-[11.5px] text-flame">{error}</p>}
    </section>
  );
}
