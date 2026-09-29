import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { ArrowLeft, ShieldCheck, ExternalLink, Trash2, Check, X, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useSession } from "@/hooks/useSession";
import { deleteGratitude, deletePrayer, loadAuthors, myRoles, type Author } from "@/lib/prayers";
import { Avatar } from "@/components/Avatar";

export const Route = createFileRoute("/moderation")({
  staticData: { sitemap: false },
  component: Moderation,
  head: () => ({ meta: [
    { title: "Moderation · Witness" },
    { name: "description", content: "Reports waiting for review." },
    { property: "og:title", content: "Moderation · Witness" },
    { property: "og:description", content: "Reports waiting for review." },
    { property: "og:type", content: "website" },
    { name: "twitter:card", content: "summary" },
  ] }),
});

type Report = {
  id: string; reporter_id: string; target_type: string; target_id: string; reason: string; details: string;
  status: "open" | "reviewing" | "resolved" | "dismissed"; resolution_note: string; created_at: string; reviewed_at: string | null;
};

type ReportedMessage = { conversation_id: string; body: string; sender_id: string };

async function loadReports(): Promise<{ reports: Report[]; people: Map<string, Author>; messages: Map<string, ReportedMessage> }> {
  const { data, error } = await supabase.from("content_reports").select("*").order("created_at", { ascending: false }).limit(200);
  if (error) throw error;
  const reports = (data ?? []) as Report[];

  // Message reports point at the exact message; pull it so moderators can read
  // what was said and jump straight into the right conversation.
  const messageIds = reports.filter(r => r.target_type === "message").map(r => r.target_id);
  const messages = new Map<string, ReportedMessage>();
  if (messageIds.length > 0) {
    const { data: rows } = await supabase.from("messages").select("id, conversation_id, body, sender_id").in("id", messageIds);
    for (const m of rows ?? []) messages.set(m.id, { conversation_id: m.conversation_id, body: m.body, sender_id: m.sender_id });
  }

  const people = await loadAuthors([
    ...reports.map(r => r.reporter_id),
    ...reports.filter(r => r.target_type === "profile").map(r => r.target_id),
    ...[...messages.values()].map(m => m.sender_id),
  ]);
  return { reports, people, messages };
}

const REASON: Record<string, string> = { safety: "Safety concern", harassment: "Harassment", privacy: "Privacy breach", spam: "Spam", fraud: "Fraud", other: "Other" };

function Moderation() {
  const { userId, signedIn } = useSession();
  const qc = useQueryClient();
  const rolesQ = useQuery({ queryKey: ["roles", userId], queryFn: () => myRoles(userId!), enabled: !!userId });
  const isMod = (rolesQ.data ?? []).some(r => r === "admin" || r === "vetter");
  const q = useQuery({ queryKey: ["reports"], queryFn: loadReports, enabled: isMod });
  const [tab, setTab] = useState<"open" | "done">("open");

  if (signedIn === false) return <Gate text="Sign in to continue." />;
  if (rolesQ.isLoading || userId === undefined) return <div className="px-5 pt-8"><div className="h-24 rounded-2xl bg-card border border-border animate-pulse" /></div>;
  if (!isMod) return <Gate text="This page is for moderators." />;

  const all = q.data?.reports ?? [];
  const people = q.data?.people ?? new Map<string, Author>();
  const messages = q.data?.messages ?? new Map<string, ReportedMessage>();
  const list = all.filter(r => (tab === "open" ? r.status === "open" || r.status === "reviewing" : r.status === "resolved" || r.status === "dismissed"));
  const openCount = all.filter(r => r.status === "open" || r.status === "reviewing").length;

  return (
    <div className="px-4 pt-4 pb-10">
      <Link to="/profile" className="inline-flex items-center gap-1.5 text-[12px] text-ink-soft"><ArrowLeft className="h-3.5 w-3.5" /> Profile</Link>
      <header className="mt-3 px-1">
        <p className="inline-flex items-center gap-1.5 text-[11px] uppercase tracking-[0.22em] text-brass"><ShieldCheck className="h-3.5 w-3.5" /> Moderation</p>
        <h1 className="mt-2 font-serif text-[28px] text-ink">Reports</h1>
        <p className="mt-1 text-[13px] text-ink-soft">{openCount === 0 ? "Nothing waiting. Thank you for keeping watch." : `${openCount} waiting for review.`}</p>
      </header>

      <div className="mt-5 grid grid-cols-2 gap-1 rounded-xl border border-border bg-card p-1">
        {(["open", "done"] as const).map(t => (
          <button key={t} onClick={() => setTab(t)} className={`rounded-lg py-2 text-[12.5px] ${tab === t ? "bg-ink text-paper" : "text-ink-soft"}`}>
            {t === "open" ? "Waiting" : "Handled"}
          </button>
        ))}
      </div>

      {q.isLoading ? (
        <div className="mt-4 space-y-3">{[0, 1].map(i => <div key={i} className="h-32 rounded-2xl bg-card border border-border animate-pulse" />)}</div>
      ) : q.isError ? (
        <p className="mt-6 text-center text-[13px] text-destructive">Couldn't load reports.</p>
      ) : list.length === 0 ? (
        <p className="mt-8 text-center text-[13px] text-ink-soft italic">{tab === "open" ? "The queue is empty." : "Nothing handled yet."}</p>
      ) : (
        <ul className="mt-4 space-y-3">
          {list.map(r => <ReportRow key={r.id} r={r} people={people} messages={messages} onChange={() => qc.invalidateQueries({ queryKey: ["reports"] })} />)}
        </ul>
      )}
    </div>
  );
}

function ReportRow({ r, people, messages, onChange }: { r: Report; people: Map<string, Author>; messages: Map<string, ReportedMessage>; onChange: () => void }) {
  const [note, setNote] = useState(r.resolution_note ?? "");
  const [busy, setBusy] = useState<string | null>(null);
  const reporter = people.get(r.reporter_id);
  const reportedMessage = r.target_type === "message" ? messages.get(r.target_id) : undefined;
  const target =
    r.target_type === "profile"
      ? people.get(r.target_id)
      : reportedMessage
        ? people.get(reportedMessage.sender_id)
        : undefined;
  const isOpen = r.status === "open" || r.status === "reviewing";

  const setStatus = async (status: Report["status"]) => {
    setBusy(status);
    const { error } = await supabase.from("content_reports").update({ status, resolution_note: note.trim(), reviewed_at: new Date().toISOString() }).eq("id", r.id);
    setBusy(null);
    if (error) { toast.error("Couldn't update the report."); return; }
    toast.success(status === "resolved" ? "Marked resolved." : status === "dismissed" ? "Dismissed." : "Updated.");
    onChange();
  };

  const removeContent = async () => {
    if (!confirm("Remove this content for everyone? The author keeps a record but no one else will see it.")) return;
    setBusy("remove");
    try {
      if (r.target_type === "prayer") await deletePrayer(r.target_id);
      else if (r.target_type === "gratitude") await deleteGratitude(r.target_id);
      toast.success("Content removed.");
      if (!note.trim()) setNote("Content removed by moderator.");
    } catch { toast.error("Couldn't remove it — it may already be gone."); }
    finally { setBusy(null); }
  };

  const closeGroup = async () => {
    if (!confirm("Close this circle? It stops accepting members and disappears from discovery.")) return;
    setBusy("close-group");
    const { error } = await supabase.from("organization_groups").update({ accepting: false }).eq("id", r.target_id);
    setBusy(null);
    if (error) { toast.error("Couldn't close the circle."); return; }
    toast.success("Circle closed.");
    if (!note.trim()) setNote("Circle closed by moderator.");
  };

  const clearProfile = async () => {
    if (!confirm("Clear this member's photo and bio? Their account stays; the reported content is removed.")) return;
    setBusy("clear-profile");
    const { error } = await supabase.from("profiles").update({ bio: "", avatar_url: null }).eq("user_id", r.target_id);
    setBusy(null);
    if (error) { toast.error("Couldn't clear the profile."); return; }
    toast.success("Profile cleared.");
    if (!note.trim()) setNote("Profile photo and bio cleared by moderator.");
  };

  const link =
    r.target_type === "prayer" ? { to: "/prayer/$id" as const, params: { id: r.target_id } }
    : r.target_type === "gratitude" ? { to: "/gratitude/$id" as const, params: { id: r.target_id } }
    : r.target_type === "profile" ? { to: "/person/$id" as const, params: { id: r.target_id } }
    : r.target_type === "group" ? { to: "/walk/$id" as const, params: { id: r.target_id } }
    : r.target_type === "message" && reportedMessage ? { to: "/messages/$id" as const, params: { id: reportedMessage.conversation_id } }
    : null;

  return (
    <li className="rounded-2xl border border-border bg-card p-4 shadow-soft">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-[10px] uppercase tracking-[0.18em] text-brass">{r.target_type} · {REASON[r.reason] ?? r.reason}</p>
          <p className="mt-1 text-[11px] text-ink-soft">{new Date(r.created_at).toLocaleString()} · {r.status}</p>
        </div>
        {link && (
          <Link {...link} className="inline-flex items-center gap-1 rounded-full border border-border px-2.5 py-1 text-[11px] text-ink">
            View <ExternalLink className="h-3 w-3" />
          </Link>
        )}
      </div>

      {target && (
        <div className="mt-3 flex items-center gap-2">
          <Avatar name={target.name} photo={target.photo} size={28} />
          <p className="text-[12.5px] text-ink">Reported member: {target.name}</p>
        </div>
      )}

      {reportedMessage && (
        <p className="mt-3 rounded-xl bg-secondary px-3 py-2.5 text-[13px] leading-relaxed text-ink">
          Reported message: "{reportedMessage.body}"
        </p>
      )}

      {r.details && <p className="mt-3 rounded-xl bg-secondary px-3 py-2.5 text-[13px] leading-relaxed text-ink">"{r.details}"</p>}
      <p className="mt-2 text-[11px] text-ink-soft">Reported by {reporter?.name ?? "a member"}</p>

      {isOpen ? (
        <>
          <textarea
            value={note}
            onChange={e => setNote(e.target.value)}
            rows={2}
            placeholder="Resolution note (kept with the report)"
            className="mt-3 w-full resize-none rounded-xl border border-border bg-paper px-3 py-2 text-[12.5px] text-ink placeholder:text-ink-soft/70 focus:outline-none focus:ring-1 focus:ring-brass"
          />
          <div className="mt-2 grid grid-cols-3 gap-2">
            {(r.target_type === "prayer" || r.target_type === "gratitude") && (
              <button onClick={() => void removeContent()} disabled={!!busy} className="inline-flex items-center justify-center gap-1 rounded-xl border border-destructive/40 bg-destructive/10 py-2 text-[12px] text-destructive disabled:opacity-50">
                {busy === "remove" ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Trash2 className="h-3.5 w-3.5" />} Remove
              </button>
            )}
            {r.target_type === "group" && (
              <button onClick={() => void closeGroup()} disabled={!!busy} className="inline-flex items-center justify-center gap-1 rounded-xl border border-destructive/40 bg-destructive/10 py-2 text-[12px] text-destructive disabled:opacity-50">
                {busy === "close-group" ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Trash2 className="h-3.5 w-3.5" />} Close
              </button>
            )}
            {r.target_type === "profile" && (
              <button onClick={() => void clearProfile()} disabled={!!busy} className="inline-flex items-center justify-center gap-1 rounded-xl border border-destructive/40 bg-destructive/10 py-2 text-[12px] text-destructive disabled:opacity-50">
                {busy === "clear-profile" ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Trash2 className="h-3.5 w-3.5" />} Clear
              </button>
            )}
            <button onClick={() => void setStatus("resolved")} disabled={!!busy} className="inline-flex items-center justify-center gap-1 rounded-xl bg-ink py-2 text-[12px] text-paper disabled:opacity-50">
              {busy === "resolved" ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Check className="h-3.5 w-3.5" />} Resolve
            </button>
            <button onClick={() => void setStatus("dismissed")} disabled={!!busy} className="inline-flex items-center justify-center gap-1 rounded-xl border border-border py-2 text-[12px] text-ink-soft disabled:opacity-50">
              {busy === "dismissed" ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <X className="h-3.5 w-3.5" />} Dismiss
            </button>
          </div>
        </>
      ) : (
        r.resolution_note && <p className="mt-3 text-[12px] text-ink-soft">Note: {r.resolution_note}</p>
      )}
    </li>
  );
}

function Gate({ text }: { text: string }) {
  return (
    <div className="px-6 pt-16 text-center">
      <p className="font-serif text-[20px] text-ink-soft">{text}</p>
      <Link to="/" className="mt-4 inline-block text-brass">Back home</Link>
    </div>
  );
}
