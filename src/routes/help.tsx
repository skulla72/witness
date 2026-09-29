import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { helpRequests } from "@/data/seed";
import { HelpCard } from "@/components/HelpCard";
import { BRAND } from "@/config/brand";
import { useSession } from "@/hooks/useSession";
import { myRoles } from "@/lib/prayers";
import { supabase } from "@/integrations/supabase/client";
import { Search, Send } from "lucide-react";

export const Route = createFileRoute("/help")({
  staticData: { sitemap: false },
  component: HelpPage,
  head: () => ({
    meta: [
      { title: `Help · ${BRAND.name}` },
      { name: "description", content: "Real people asking for real help. Offer what you can — time, hands, a listening ear." },
    ],
  }),
});

const tabs = ["Open", "Nearby", "Being helped", "Mine"] as const;

function HelpPage() {
  const [tab, setTab] = useState<(typeof tabs)[number]>("Open");
  const [q, setQ] = useState("");

  let list = helpRequests;
  if (tab === "Open") list = list.filter(h => h.status === "open");
  if (tab === "Being helped") list = list.filter(h => h.status === "matched" || h.status === "fulfilled");
  if (tab === "Mine") list = list.filter(h => h.user_id === "u_me");
  if (q.trim()) {
    const s = q.toLowerCase();
    list = list.filter(h => h.title.toLowerCase().includes(s) || h.story.toLowerCase().includes(s));
  }

  return (
    <div className="px-4 pt-4">
      <header className="mb-4">
        <span className="text-[10px] uppercase tracking-[0.22em] text-brass">Concern in action</span>
        <h1 className="mt-1 font-serif text-[26px] text-ink leading-tight">Someone needs you today.</h1>
        <p className="mt-1 text-[13.5px] text-ink-soft">
          Browse honest asks. Offer a meal, a ride, twenty minutes. Empathy is concrete.
        </p>
      </header>

      <a
        href="/crisis"
        className="mb-4 block rounded-2xl border border-brass/40 bg-card p-3.5"
      >
        <p className="text-[13px] text-ink">In crisis right now?</p>
        <p className="mt-0.5 text-[12.5px] text-ink-soft">
          Free lines answer 24/7 — call or text 988 (US), or see all help.
        </p>
      </a>

      <MessageTeam />
      <TeamInboxLink />

      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-ink-soft" />
        <input
          value={q}
          onChange={e => setQ(e.target.value)}
          placeholder="Search needs (meals, rides, listen…)"
          className="w-full rounded-full bg-card border border-border pl-9 pr-4 py-2.5 text-[14px] text-ink placeholder:text-ink-soft focus:outline-none focus:border-brass"
        />
      </div>

      <div className="mt-4 -mx-1 flex gap-1 overflow-x-auto no-scrollbar">
        {tabs.map(t => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`shrink-0 px-3.5 py-1.5 rounded-full text-[12px] tracking-wide border transition-colors ${
              tab === t ? "bg-ink text-paper border-ink" : "bg-card text-ink-soft border-border hover:text-ink"
            }`}
          >
            {t}
          </button>
        ))}
      </div>

      <div className="mt-4 space-y-4">
        {list.length === 0 ? (
          <p className="py-12 text-center text-[14px] text-ink-soft italic">No matching needs right now.</p>
        ) : (
          list.map(h => <HelpCard key={h.id} h={h} />)
        )}
      </div>
    </div>
  );
}

function MessageTeam() {
  const { userId, signedIn } = useSession();
  const [open, setOpen] = useState(false);
  const [subject, setSubject] = useState("");
  const [body, setBody] = useState("");
  const [sending, setSending] = useState(false);

  const send = async () => {
    if (!userId) return;
    const trimmed = body.trim();
    if (!subject.trim() || !trimmed) {
      toast.error("Add a subject and a few words so the team can help.");
      return;
    }
    setSending(true);
    const { data: authData } = await supabase.auth.getUser();
    const email = authData.user?.email;
    if (!email) {
      setSending(false);
      toast.error("We couldn't find your email — try signing in again.");
      return;
    }
    const { error } = await supabase.from("support_requests").insert({
      user_id: userId,
      email,
      subject: subject.trim().slice(0, 140),
      body: trimmed.slice(0, 4000),
    });
    setSending(false);
    if (error) {
      toast.error("That didn't go through — please try again.");
      return;
    }
    toast.success("Sent. The team replies by email, usually within a day.");
    setSubject("");
    setBody("");
    setOpen(false);
  };

  if (signedIn === false) return null;

  return (
    <div className="mb-4 rounded-2xl border border-border bg-card p-3.5">
      {open ? (
        <div>
          <p className="text-[13px] text-ink">Message the team</p>
          <input
            value={subject}
            onChange={e => setSubject(e.target.value)}
            placeholder="What's it about?"
            className="mt-2 w-full rounded-xl border border-border bg-paper px-3 py-2 text-[13px] text-ink outline-none placeholder:text-ink-soft/60"
          />
          <textarea
            value={body}
            onChange={e => setBody(e.target.value)}
            rows={3}
            placeholder="Tell us what's happening…"
            className="mt-2 w-full rounded-xl border border-border bg-paper px-3 py-2 text-[13px] text-ink outline-none placeholder:text-ink-soft/60"
          />
          <div className="mt-2 flex gap-2">
            <button
              onClick={send}
              disabled={sending}
              className="tap-scale inline-flex flex-1 items-center justify-center gap-2 rounded-xl bg-ink py-2 text-[12.5px] font-medium text-paper disabled:opacity-60"
            >
              <Send className="h-3.5 w-3.5" />
              {sending ? "Sending…" : "Send to the team"}
            </button>
            <button
              onClick={() => setOpen(false)}
              className="rounded-xl border border-border px-3 py-2 text-[12.5px] text-ink-soft"
            >
              Cancel
            </button>
          </div>
        </div>
      ) : (
        <button onClick={() => setOpen(true)} className="block w-full text-left">
          <p className="text-[13px] text-ink">Something wrong with the app?</p>
          <p className="mt-0.5 text-[12.5px] text-ink-soft">
            Message the team — it lands in the same inbox as support@witnessmovement.com.
          </p>
        </button>
      )}
    </div>
  );
}

function TeamInboxLink() {
  const { userId } = useSession();
  const [isAdmin, setIsAdmin] = useState(false);
  useEffect(() => {
    if (!userId) return;
    let live = true;
    myRoles(userId).then(roles => {
      if (live && roles.includes("admin")) setIsAdmin(true);
    });
    return () => {
      live = false;
    };
  }, [userId]);
  if (!isAdmin) return null;
  return (
    <Link
      to="/admin/support"
      className="mb-4 block rounded-2xl border border-brass/40 bg-brass/10 p-3.5 text-[12.5px] text-ink"
    >
      Team: open the support inbox →
    </Link>
  );
}