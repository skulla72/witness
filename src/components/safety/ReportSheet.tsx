import { useState } from "react";
import { useNavigate } from "@tanstack/react-router";
import { toast } from "sonner";
import { Flag, ShieldOff, MoreHorizontal, Trash2, X } from "lucide-react";
import { useSession } from "@/hooks/useSession";
import { blockMember, reportContent, type ReportReason, type ReportTarget } from "@/lib/prayers";

const reasons: Array<{ id: ReportReason; label: string; sub: string }> = [
  { id: "safety", label: "Someone may be in danger", sub: "Self-harm, abuse, or a threat." },
  { id: "adult_content", label: "Nudity or adult content", sub: "Sexual content, exposed skin, or anything not family-safe." },
  { id: "harassment", label: "Harassment or cruelty", sub: "Bullying, mocking, or targeting." },
  { id: "privacy", label: "Shares private information", sub: "Names, addresses, or someone else's story." },
  { id: "spam", label: "Spam or scam", sub: "Selling, links, or asking for money." },
  { id: "fraud", label: "Misrepresents a need", sub: "A request that seems untrue." },
  { id: "other", label: "Something else", sub: "Tell us in your own words." },
];

/**
 * The "..." control shown on any piece of community content.
 * Report, block the author, or (if it's yours) remove it.
 */
export function SafetyMenu({
  targetType, targetId, authorId, onRemove, tone = "light", label,
}: {
  targetType: ReportTarget;
  targetId: string;
  authorId?: string | null;
  onRemove?: () => Promise<void> | void;
  tone?: "light" | "dark";
  label?: string;
}) {
  const { userId } = useSession();
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const [mode, setMode] = useState<"menu" | "report" | "block">("menu");
  const [reason, setReason] = useState<ReportReason | null>(null);
  const [details, setDetails] = useState("");
  const [busy, setBusy] = useState(false);

  const isMine = Boolean(userId && authorId && userId === authorId);
  const iconTone = tone === "dark" ? "text-paper/70 hover:text-paper" : "text-ink-soft hover:text-ink";

  const close = () => { setOpen(false); setMode("menu"); setReason(null); setDetails(""); };
  const requireUser = () => {
    if (!userId) { toast.error("Sign in first."); navigate({ to: "/login" }); return false; }
    return true;
  };

  const submitReport = async () => {
    if (!requireUser() || !userId || !reason) return;
    setBusy(true);
    try {
      await reportContent(userId, targetType, targetId, reason, details);
      toast.success("Thank you. A moderator will review this.");
      close();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Could not send the report.");
    } finally { setBusy(false); }
  };

  const submitBlock = async () => {
    if (!requireUser() || !userId || !authorId) return;
    setBusy(true);
    try {
      await blockMember(userId, authorId);
      toast.success("Blocked. You won't see each other's posts.");
      close();
      navigate({ to: "/" });
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Could not block.");
    } finally { setBusy(false); }
  };

  const remove = async () => {
    if (!onRemove) return;
    setBusy(true);
    try { await onRemove(); close(); } finally { setBusy(false); }
  };

  return (
    <>
      <button onClick={() => setOpen(true)} aria-label={label ?? "More options"} className={`inline-flex items-center gap-1.5 p-2 -mr-2 rounded-full text-[12px] transition-colors ${iconTone}`}>
        {label ? <Flag className="h-4 w-4" strokeWidth={1.75} /> : <MoreHorizontal className="h-5 w-5" strokeWidth={1.75} />}
        {label && <span>{label}</span>}
      </button>

      {open && (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-ink/60 backdrop-blur-[2px]" onClick={close} role="dialog" aria-modal="true">
          <div className="w-full max-w-md bg-card rounded-t-3xl border-t border-border p-5 pb-8 shadow-lift" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4">
              <p className="text-[11px] uppercase tracking-[0.2em] text-ink-soft">
                {mode === "menu" ? "Options" : mode === "report" ? "Report" : "Block"}
              </p>
              <button onClick={close} aria-label="Close" className="text-ink-soft"><X className="h-5 w-5" /></button>
            </div>

            {mode === "menu" && (
              <div className="space-y-2">
                <button onClick={() => setMode("report")} className="w-full flex items-center gap-3 p-4 rounded-2xl border border-border bg-paper text-left">
                  <Flag className="h-5 w-5 text-ink-soft" strokeWidth={1.5} />
                  <div><p className="text-[15px] text-ink">Report this</p><p className="text-[12px] text-ink-soft">Reviewed by a human moderator.</p></div>
                </button>
                {authorId && !isMine && (
                  <button onClick={() => setMode("block")} className="w-full flex items-center gap-3 p-4 rounded-2xl border border-border bg-paper text-left">
                    <ShieldOff className="h-5 w-5 text-ink-soft" strokeWidth={1.5} />
                    <div><p className="text-[15px] text-ink">Block this person</p><p className="text-[12px] text-ink-soft">They won't be told. You'll stop seeing each other.</p></div>
                  </button>
                )}
                {isMine && onRemove && (
                  <button onClick={() => void remove()} disabled={busy} className="w-full flex items-center gap-3 p-4 rounded-2xl border border-[oklch(0.78_0.06_30)] bg-[oklch(0.96_0.02_30)] text-left disabled:opacity-50">
                    <Trash2 className="h-5 w-5 text-[oklch(0.42_0.1_30)]" strokeWidth={1.5} />
                    <div><p className="text-[15px] text-ink">Remove this</p><p className="text-[12px] text-ink-soft">It disappears from everyone's view.</p></div>
                  </button>
                )}
              </div>
            )}

            {mode === "report" && (
              <div>
                <div className="space-y-1.5">
                  {reasons.map(r => (
                    <button key={r.id} onClick={() => setReason(r.id)} className={`w-full text-left px-4 py-3 rounded-xl border ${reason === r.id ? "border-brass bg-brass/10" : "border-border bg-paper"}`}>
                      <p className="text-[14px] text-ink">{r.label}</p>
                      <p className="text-[11px] text-ink-soft">{r.sub}</p>
                    </button>
                  ))}
                </div>
                <textarea value={details} onChange={e => setDetails(e.target.value)} rows={2} placeholder="Anything a moderator should know (optional)." className="mt-3 w-full rounded-xl border border-border bg-paper px-3 py-2.5 text-[14px] text-ink placeholder:text-ink-soft/60 focus:outline-none focus:border-brass" />
                <button onClick={() => void submitReport()} disabled={!reason || busy} className="mt-3 w-full py-3.5 rounded-xl bg-ink text-paper text-[14px] font-medium disabled:opacity-40">
                  {busy ? "Sending…" : "Send report"}
                </button>
              </div>
            )}

            {mode === "block" && (
              <div>
                <p className="text-[15px] text-ink leading-relaxed">You'll no longer see their prayers, gratitude, or messages, and they won't see yours. You can undo this from your profile later.</p>
                <button onClick={() => void submitBlock()} disabled={busy} className="mt-5 w-full py-3.5 rounded-xl bg-ink text-paper text-[14px] font-medium disabled:opacity-40">
                  {busy ? "Blocking…" : "Block"}
                </button>
                <button onClick={() => setMode("menu")} className="mt-2 w-full py-3 text-[13px] text-ink-soft">Back</button>
              </div>
            )}
          </div>
        </div>
      )}
    </>
  );
}
