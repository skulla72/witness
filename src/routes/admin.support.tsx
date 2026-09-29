import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { ArrowLeft, Inbox, Loader2, Mail, MessageSquareHeart, Send } from "lucide-react";
import { BRAND } from "@/config/brand";
import { useSession } from "@/hooks/useSession";
import { myRoles } from "@/lib/prayers";
import {
  answerSupportRequest,
  readSupportThread,
  replySupportThread,
  supportInbox,
  type InboxItem,
} from "@/lib/support.functions";

export const Route = createFileRoute("/admin/support")({
  staticData: { sitemap: false },
  component: AdminSupport,
  head: () => ({
    meta: [
      { title: `Support inbox (team) · ${BRAND.name}` },
      { name: "description", content: "Support emails and in-app messages in one place." },
      { property: "og:title", content: `Support inbox (team) · ${BRAND.name}` },
      { property: "og:description", content: "Support emails and in-app messages in one place." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
});

const WHEN = new Intl.DateTimeFormat("en-US", {
  month: "short",
  day: "numeric",
  hour: "numeric",
  minute: "2-digit",
});

function cleanFrom(from: string) {
  const match = /^(.*?)\s*<[^>]+>$/.exec(from);
  return (match?.[1]?.replace(/^"|"$/g, "") || from).trim();
}

function AdminSupport() {
  const { userId, signedIn } = useSession();
  const rolesQ = useQuery({ queryKey: ["roles", userId], queryFn: () => myRoles(userId!), enabled: !!userId });
  const isAdmin = (rolesQ.data ?? []).includes("admin");
  const inboxQ = useQuery({ queryKey: ["support-inbox"], queryFn: () => supportInbox(), enabled: isAdmin });
  const [open, setOpen] = useState<InboxItem | null>(null);

  if (signedIn === false || (rolesQ.isSuccess && !isAdmin)) {
    return (
      <div className="px-6 pt-16 text-center">
        <p className="font-serif text-[22px] text-ink">Team only.</p>
        <Link to="/help" className="mt-5 inline-block text-[13px] text-brass">
          Back to help
        </Link>
      </div>
    );
  }

  const items = inboxQ.data?.items ?? [];

  return (
    <div className="pb-16">
      <div className="px-4 pt-3">
        <Link to="/help" className="inline-flex items-center gap-1 text-[13px] text-ink-soft">
          <ArrowLeft className="h-4 w-4" /> Help
        </Link>
      </div>

      <header className="px-5 pt-3">
        <p className="text-[11px] uppercase tracking-[0.22em] text-brass">Team</p>
        <h1 className="mt-2 font-serif text-[28px] leading-tight text-ink">Support inbox</h1>
        <p className="mt-2 text-[13px] leading-relaxed text-ink-soft">
          Emails to support@witnessmovement.com and messages sent from inside the app, side by side. Replies go out
          as support@.
        </p>
      </header>

      {inboxQ.isLoading ? (
        <div className="flex justify-center py-12">
          <Loader2 className="h-5 w-5 animate-spin text-ink-soft" />
        </div>
      ) : items.length === 0 ? (
        <div className="mt-8 px-5 text-center">
          <span className="mx-auto grid h-12 w-12 place-items-center rounded-full bg-secondary">
            <Inbox className="h-5 w-5 text-ink-soft" strokeWidth={1.7} />
          </span>
          <p className="mt-3 font-serif text-[17px] text-ink">All quiet</p>
          <p className="mt-1 text-[12.5px] text-ink-soft">No emails or in-app messages waiting.</p>
        </div>
      ) : (
        <ul className="mt-5 space-y-2 px-4">
          {items.map(item => (
            <li key={`${item.kind}-${item.id}`}>
              <button
                onClick={() => setOpen(item)}
                className="w-full rounded-2xl border border-border bg-card p-4 text-left shadow-soft"
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="flex min-w-0 items-center gap-2">
                    {item.kind === "email" ? (
                      <Mail className="h-4 w-4 shrink-0 text-brass" strokeWidth={1.8} />
                    ) : (
                      <MessageSquareHeart className="h-4 w-4 shrink-0 text-brass" strokeWidth={1.8} />
                    )}
                    <p className="truncate text-[14px] font-medium text-ink">{cleanFrom(item.from)}</p>
                  </div>
                  <div className="flex shrink-0 items-center gap-2">
                    {item.kind === "email" && item.unread && (
                      <span className="rounded-full bg-flame/15 px-2 py-0.5 text-[10px] uppercase tracking-[0.12em] text-flame">
                        New
                      </span>
                    )}
                    {item.kind === "request" && (
                      <span
                        className={`rounded-full px-2 py-0.5 text-[10px] uppercase tracking-[0.12em] ${
                          item.status === "open" ? "bg-flame/15 text-flame" : "bg-hope/15 text-hope"
                        }`}
                      >
                        {item.status}
                      </span>
                    )}
                    <span className="text-[11px] text-ink-soft">{WHEN.format(new Date(item.date))}</span>
                  </div>
                </div>
                <p className="mt-1 truncate text-[13px] text-ink">{item.subject}</p>
                <p className="mt-0.5 line-clamp-2 text-[12.5px] text-ink-soft">{item.snippet}</p>
              </button>
            </li>
          ))}
        </ul>
      )}

      {open && <OpenItem item={open} onClose={() => setOpen(null)} />}
    </div>
  );
}

function OpenItem({ item, onClose }: { item: InboxItem; onClose: () => void }) {
  const qc = useQueryClient();
  const [reply, setReply] = useState("");

  const threadQ = useQuery({
    queryKey: ["support-thread", item.id],
    queryFn: () => readSupportThread({ data: { threadId: item.id } }),
    enabled: item.kind === "email",
  });

  const send = useMutation({
    mutationFn: async () => {
      if (item.kind === "email") return replySupportThread({ data: { threadId: item.id, body: reply } });
      return answerSupportRequest({ data: { id: item.id, reply } });
    },
    onSuccess: () => {
      toast.success("Reply sent as support@");
      setReply("");
      qc.invalidateQueries({ queryKey: ["support-inbox"] });
      qc.invalidateQueries({ queryKey: ["support-thread", item.id] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <div className="fixed inset-0 z-50 flex items-end bg-ink/40 backdrop-blur-sm">
      <div className="max-h-[92vh] w-full overflow-y-auto rounded-t-3xl border-t border-border bg-card p-5">
        <div className="flex items-center justify-between gap-3">
          <div className="min-w-0">
            <p className="truncate font-serif text-[19px] text-ink">{item.subject}</p>
            <p className="mt-0.5 truncate text-[12px] text-ink-soft">
              {item.kind === "email" ? "Email" : "In-app message"} · {cleanFrom(item.from)}
            </p>
          </div>
          <button
            onClick={onClose}
            aria-label="Close"
            className="shrink-0 rounded-full border border-border px-3 py-1.5 text-[12px] text-ink-soft"
          >
            Close
          </button>
        </div>

        <div className="mt-4 space-y-3">
          {item.kind === "request" ? (
            <div className="rounded-2xl bg-paper p-4">
              <p className="whitespace-pre-wrap text-[13.5px] leading-relaxed text-ink">{item.body}</p>
              <p className="mt-2 text-[11px] text-ink-soft">{WHEN.format(new Date(item.date))}</p>
            </div>
          ) : threadQ.isLoading ? (
            <div className="flex justify-center py-8">
              <Loader2 className="h-5 w-5 animate-spin text-ink-soft" />
            </div>
          ) : (
            (threadQ.data?.messages ?? []).map(m => (
              <div
                key={m.id}
                className={`rounded-2xl p-4 ${m.mine ? "ml-6 bg-secondary" : "mr-6 bg-paper border border-border"}`}
              >
                <p className="text-[11px] uppercase tracking-[0.12em] text-ink-soft">
                  {m.mine ? "You (support@)" : cleanFrom(m.from)} · {WHEN.format(new Date(m.date))}
                </p>
                <p className="mt-1.5 whitespace-pre-wrap text-[13.5px] leading-relaxed text-ink">{m.body}</p>
              </div>
            ))
          )}
        </div>

        <div className="mt-4">
          <textarea
            value={reply}
            onChange={e => setReply(e.target.value)}
            rows={4}
            placeholder="Write a reply — it goes out as support@witnessmovement.com"
            className="w-full rounded-xl border border-border bg-paper px-3 py-2 text-[13px] text-ink outline-none placeholder:text-ink-soft/60"
          />
          <button
            onClick={() => send.mutate()}
            disabled={send.isPending || !reply.trim()}
            className="tap-scale mt-2 inline-flex w-full items-center justify-center gap-2 rounded-xl bg-ink py-2.5 text-[13px] font-medium text-paper disabled:opacity-60"
          >
            <Send className="h-4 w-4" />
            {send.isPending ? "Sending…" : "Send reply"}
          </button>
          {item.kind === "request" && (
            <p className="mt-2 text-center text-[11.5px] text-ink-soft">
              Replying emails the person and marks this answered.
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
