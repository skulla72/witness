import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Bell, CheckCheck, Heart, MessageCircle, Sparkles, Wrench } from "lucide-react";
import { BRAND } from "@/config/brand";
import { useSession } from "@/hooks/useSession";
import { supabase } from "@/integrations/supabase/client";
import { markAllNotificationsRead, markNotificationRead, notificationInbox, type NotificationItem } from "@/lib/notificationInbox";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/notifications")({
  staticData: { sitemap: false },
  component: NotificationsPage,
  head: () => ({
    meta: [
      { title: `Notifications · ${BRAND.name}` },
      { name: "description", content: "Prayer support, private messages, answers, and serving updates meant for you." },
      { property: "og:title", content: `Notifications · ${BRAND.name}` },
      { property: "og:description", content: "Your latest Witness updates in one quiet place." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
});

const key = ["notifications", "inbox"] as const;

function NotificationsPage() {
  const { userId, signedIn } = useSession();
  const qc = useQueryClient();
  const inbox = useQuery({ queryKey: key, queryFn: () => notificationInbox(), enabled: Boolean(userId) });
  const readAll = useMutation({
    mutationFn: markAllNotificationsRead,
    onSuccess: () => void qc.invalidateQueries({ queryKey: ["notifications"] }),
  });

  useEffect(() => {
    if (!userId) return;
    const channel = supabase
      .channel(`notification-inbox-${userId}`)
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "notifications", filter: `user_id=eq.${userId}` }, () => {
        void qc.invalidateQueries({ queryKey: ["notifications"] });
      })
      .subscribe();
    return () => { void supabase.removeChannel(channel); };
  }, [qc, userId]);

  if (signedIn === false) return <div className="px-6 pt-16 text-center"><Bell className="mx-auto h-6 w-6 text-brass" /><h1 className="mt-4 font-serif text-[24px] text-ink">Your notifications</h1><p className="mt-2 text-[13px] text-ink-soft">Sign in to see what happened while you were away.</p><Link to="/login" search={{ next: "/notifications" }} className="mt-5 inline-flex rounded-full bg-primary px-5 py-2.5 text-[13px] text-primary-foreground">Sign in</Link></div>;

  const items = inbox.data ?? [];
  const unread = items.filter(item => !item.read_at).length;
  return (
    <div className="pb-16 pt-6">
      <header className="flex items-end justify-between gap-4 px-5">
        <div><p className="text-[10px] uppercase tracking-[0.22em] text-brass">For you</p><h1 className="mt-2 font-serif text-[28px] text-ink">Notifications</h1></div>
        {unread > 0 && <Button type="button" variant="ghost" size="sm" disabled={readAll.isPending} onClick={() => readAll.mutate()} className="text-ink-soft"><CheckCheck className="h-4 w-4" /> Read all</Button>}
      </header>
      <main className="mx-4 mt-5 overflow-hidden rounded-2xl border border-border bg-card shadow-soft">
        {inbox.isLoading ? <div className="space-y-3 p-4">{[0, 1, 2].map(item => <div key={item} className="h-16 animate-pulse rounded-xl bg-secondary" />)}</div> : inbox.isError ? <div className="p-7 text-center"><p className="text-[13px] text-ink-soft">Your notifications couldn't load.</p><Button type="button" variant="outline" size="sm" onClick={() => inbox.refetch()} className="mt-3">Try again</Button></div> : items.length === 0 ? <div className="px-6 py-12 text-center"><span className="mx-auto grid h-12 w-12 place-items-center rounded-full bg-secondary"><Bell className="h-5 w-5 text-ink-soft" /></span><h2 className="mt-3 font-serif text-[17px] text-ink">All quiet here</h2><p className="mt-1 text-[12.5px] leading-relaxed text-ink-soft">Prayer support, messages, answers, and serving updates will gather here.</p></div> : <ul className="divide-y divide-border">{items.map(item => <NotificationRow key={item.id} item={item} />)}</ul>}
      </main>
    </div>
  );
}

function NotificationRow({ item }: { item: NotificationItem }) {
  const qc = useQueryClient();
  const read = () => { if (!item.read_at) void markNotificationRead(item.id).then(() => qc.invalidateQueries({ queryKey: ["notifications"] })); };
  const icon = item.category === "messages" ? <MessageCircle className="h-4 w-4" /> : item.category === "prayed_for_me" ? <Heart className="h-4 w-4" /> : item.category === "needs" ? <Wrench className="h-4 w-4" /> : <Sparkles className="h-4 w-4" />;
  const content = <><span className={`mt-0.5 grid h-9 w-9 shrink-0 place-items-center rounded-full ${item.read_at ? "bg-secondary text-ink-soft" : "bg-brass/15 text-brass-deep"}`}>{icon}</span><span className="min-w-0 flex-1"><span className="block text-[13.5px] font-medium leading-snug text-ink">{item.title}</span>{item.body && <span className="mt-1 line-clamp-2 block text-[12px] leading-relaxed text-ink-soft">{item.body}</span>}<span className="mt-1.5 block text-[10.5px] text-ink-soft">{relativeTime(item.created_at)}</span></span>{!item.read_at && <span className="mt-2 h-2 w-2 shrink-0 rounded-full bg-brass" aria-label="Unread" />}</>;
  const className = "flex w-full items-start gap-3 px-4 py-4 text-left";
  const message = item.path?.match(/^\/messages\/([0-9a-f-]+)$/i);
  const prayer = item.path?.match(/^\/prayer\/([0-9a-f-]+)$/i);
  const need = item.path?.match(/^\/needs\/([0-9a-f-]+)$/i);
  if (message) return <li><Link to="/messages/$id" params={{ id: message[1] }} onClick={read} className={className}>{content}</Link></li>;
  if (prayer) return <li><Link to="/prayer/$id" params={{ id: prayer[1] }} onClick={read} className={className}>{content}</Link></li>;
  if (need) return <li><Link to="/needs/$id" params={{ id: need[1] }} onClick={read} className={className}>{content}</Link></li>;
  if (item.path === "/answered") return <li><Link to="/answered" onClick={read} className={className}>{content}</Link></li>;
  if (item.path === "/needs/stories") return <li><Link to="/needs/stories" onClick={read} className={className}>{content}</Link></li>;
  return <li><button type="button" onClick={read} className={className}>{content}</button></li>;
}

function relativeTime(iso: string) {
  const minutes = Math.max(0, Math.floor((Date.now() - new Date(iso).getTime()) / 60_000));
  if (minutes < 1) return "Just now";
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days}d ago`;
  return new Date(iso).toLocaleDateString(undefined, { month: "short", day: "numeric" });
}